import uuid
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import Paiement, Bail
from immobilier.models.enums import StatutPaiementEnum, StatutBailEnum
from immobilier.services.billing_service import BillingService

class SimulationPaiementMobileMoneyView(APIView):
    """
    Simule le paiement d'une échéance (Paiement) via Mobile Money.
    L'argent est versé à la plateforme (PAYE_A_L_ADMIN).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        paiement = get_object_or_404(Paiement.objects.select_related('bail__client_info__utilisateur'), pk=pk)

        # Vérifier que le paiement appartient bien au locataire (ou admin)
        if request.user.id != paiement.bail.client_info.utilisateur.id and not request.user.is_staff:
            raise PermissionDenied("Ce paiement ne vous appartient pas.")

        if paiement.statut in [StatutPaiementEnum.PAYE_A_L_ADMIN, StatutPaiementEnum.REVERSE_AU_PROPRIETAIRE, StatutPaiementEnum.PAYE]:
            raise ValidationError("Ce paiement a déjà été effectué.")

        num_telephone = request.data.get('numero_telephone')
        reseau = request.data.get('reseau')  # 'MTN', 'Orange', 'Moov'

        if not num_telephone or not reseau:
            raise ValidationError("Le numéro de téléphone et le réseau sont requis pour la transaction.")

        # SIMULATION DU PAIEMENT REUSSI
        paiement.statut = StatutPaiementEnum.PAYE_A_L_ADMIN
        paiement.date_paiement = timezone.now()
        paiement.mode_paiement = f"Mobile Money ({reseau})"
        paiement.save(update_fields=['statut', 'date_paiement', 'mode_paiement'])

        # Si le bail était en attente de paiement initial, on l'active
        bail = paiement.bail
        if bail.statut == StatutBailEnum.EN_ATTENTE_PAIEMENT:
            bail.statut = StatutBailEnum.EN_COURS
            bail.save(update_fields=['statut'])

        return Response({
            "message": "Paiement effectué avec succès.",
            "statut": paiement.statut,
            "date_paiement": paiement.date_paiement
        }, status=status.HTTP_200_OK)


class DownloadFactureView(APIView):
    """
    Génère et télécharge la facture PDF pour un Paiement.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        paiement = get_object_or_404(Paiement.objects.select_related('bail__client_info__utilisateur', 'bail__bien'), pk=pk)

        # Vérifier permissions (Locataire, Propriétaire ou Admin)
        is_client = request.user.id == paiement.bail.client_info.utilisateur.id
        is_owner = hasattr(paiement.bail.bien, 'proprietaire_info') and request.user.id == paiement.bail.bien.proprietaire_info.utilisateur.id
        
        if not (is_client or is_owner or request.user.is_staff):
            raise PermissionDenied("Vous n'êtes pas autorisé à télécharger cette facture.")

        pdf_buffer = BillingService.generate_invoice_pdf(paiement)

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        est_paye = paiement.statut in [StatutPaiementEnum.PAYE_A_L_ADMIN, StatutPaiementEnum.REVERSE_AU_PROPRIETAIRE, StatutPaiementEnum.PAYE]
        nom_fichier = f"{"Quittance" if est_paye else "Facture"}_{paiement.reference}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
        return response

class LocatairePaiementsListView(generics.ListAPIView):
    """
    Retourne la liste des échéances (Paiements) pour le locataire connecté.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # We can reuse the AdminPaiementSerializer or create a new LocatairePaiementSerializer.
        # AdminPaiementSerializer returns a lot of info (including locataire), which is fine.
        return (
            Paiement.objects
            .select_related('bail__bien', 'bail__client_info__utilisateur')
            .filter(bail__client_info__utilisateur=self.request.user)
            .order_by('-date_echeance', '-id')
        )
    
    # Importing inline to avoid circular imports if any, or just importing from finance_serializers at the top
    def get_serializer_class(self):
        from immobilier.serializers.finance_serializers import AdminPaiementSerializer
        return AdminPaiementSerializer

class AdminPaiementReversementView(APIView):
    """
    Permet à l'admin de marquer un paiement comme reversé au propriétaire.
    Passe le statut de PAYE_A_L_ADMIN à REVERSE_AU_PROPRIETAIRE et envoie un e-mail avec un accusé.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied("Seul un administrateur peut effectuer cette action.")
            
        paiement = get_object_or_404(
            Paiement.objects.select_related('bail__bien__proprietaire_info__utilisateur'), 
            pk=pk
        )

        if paiement.statut != StatutPaiementEnum.PAYE_A_L_ADMIN:
            raise ValidationError("Le paiement n'a pas été payé à l'admin ou est déjà reversé.")

        mode_reversement = request.data.get('mode_reversement', 'Virement Bancaire')
        preuve_reversement = request.data.get('preuve_reversement', 'Ref automatique')

        # Mise à jour
        paiement.statut = StatutPaiementEnum.REVERSE_AU_PROPRIETAIRE
        paiement.commentaire = f"Reversé le {timezone.now().strftime('%d/%m/%Y')} via {mode_reversement} (Ref: {preuve_reversement})"
        paiement.save(update_fields=['statut', 'commentaire'])

        # Envoi e-mail transactionnel via send_mail ou le EmailService
        from immobilier.services.email_service import EmailService
        proprietaire = paiement.bail.bien.proprietaire_info.utilisateur
        if proprietaire and proprietaire.email:
            try:
                EmailService._envoyer(
                    sujet=f"💰 Vos fonds pour {paiement.bail.bien.reference} ont été reversés",
                    template="emails/notification_privatisation_acceptee.html", # Mieux vaudrait un template spécifique mais on réutilise pour la démo
                    contexte={
                        "prenom": proprietaire.first_name or proprietaire.username,
                        "reference_bien": paiement.bail.bien.reference,
                        "adresse_bien": paiement.bail.bien.ville,
                        "date_fin": "N/A", 
                        "url_dashboard": "/admin/dashboard", 
                    },
                    destinataire=proprietaire.email
                )
            except Exception as e:
                print("Failed to send revertion email:", e)

        return Response({"message": "Fonds reversés au propriétaire avec succès.", "statut": paiement.statut}, status=status.HTTP_200_OK)
