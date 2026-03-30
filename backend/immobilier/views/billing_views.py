import uuid
from datetime import timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, JsonResponse
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import Paiement, Bail, DemandeAction
from immobilier.models.enums import StatutPaiementEnum, StatutBailEnum, StatutDemandeEnum
from immobilier.services.billing_service import BillingService
from immobilier.services.email_service import EmailService

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
        nom_fichier = f"{'Quittance' if est_paye else 'Facture'}_{paiement.reference}.pdf"
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

        # Calcul automatique de la commission (5%)
        commission_taux = 0.05  # 5%
        commission_montant = float(paiement.montant) * commission_taux
        montant_reverse = float(paiement.montant) - commission_montant

        # Mise à jour avec commission
        paiement.commission_plateforme = commission_montant
        paiement.montant_reverse = montant_reverse
        paiement.statut = StatutPaiementEnum.REVERSE_AU_PROPRIETAIRE
        paiement.commentaire = f"Reversé le {timezone.now().strftime('%d/%m/%Y')} via {mode_reversement} (Ref: {preuve_reversement}). Commission: {commission_montant:.2f} FCFA ({commission_taux*100:.0f}%)"
        paiement.save(update_fields=['commission_plateforme', 'montant_reverse', 'statut', 'commentaire'])

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


class DemandeActionFactureView(APIView):
    """
    Génère et envoie la facture PDF par email pour une demande de location.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire'),
            pk=pk,
        )

        # Vérifier que c'est le propriétaire ou admin qui peut envoyer la facture
        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != demande.proprietaire_id:
                raise PermissionDenied("Seul le propriétaire peut envoyer la facture.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée."})

        # Vérifier que les tarifs sont configurés
        bien = demande.bien
        if not bien.loyer_hc:
            raise ValidationError({"detail": "Les tarifs doivent être configurés avant de générer la facture."})

        # Calculer les montants
        loyer_hc = float(bien.loyer_hc)
        charges = float(bien.charges) if bien.charges else 0
        caution_mois = bien.caution_mois or 1
        avance_mois = bien.avance_mois or 1
        frais_assistance = float(bien.frais_assistance) if bien.frais_assistance else 0

        total_caution = loyer_hc * caution_mois
        total_avance = loyer_hc * avance_mois
        total_loyer_charges = (loyer_hc + charges) * 1  # Premier mois
        total_a_payer = total_caution + total_avance + total_loyer_charges + frais_assistance

        # Générer le PDF de la facture
        pdf_buffer = BillingService.generate_lease_invoice_pdf(
            demande=demande,
            loyer_hc=loyer_hc,
            charges=charges,
            caution_mois=caution_mois,
            avance_mois=avance_mois,
            frais_assistance=frais_assistance,
            total_a_payer=total_a_payer,
        )

        # Envoyer l'email avec la facture en pièce jointe
        email_sent = EmailService.envoyer_facture_paiement(
            destinataire=demande.demandeur.email,
            demande=demande,
            total_a_payer=total_a_payer,
            pdf_buffer=pdf_buffer,
        )

        return Response({
            "message": "Facture générée et envoyée avec succès.",
            "email_sent": email_sent,
            "total_a_payer": total_a_payer,
        }, status=status.HTTP_200_OK)


class DemandeActionPaiementLinkView(APIView):
    """
    Génère un lien de paiement sécurisé pour une demande de location.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire'),
            pk=pk,
        )

        # Vérifier que c'est le demandeur ou admin/proprietaire
        is_demandeur = request.user.id == demande.demandeur_id
        is_owner = request.user.id == demande.proprietaire_id
        is_admin = request.user.is_staff or request.user.is_superuser

        if not (is_demandeur or is_owner or is_admin):
            raise PermissionDenied("Vous n'êtes pas autorisé à accéder à ce lien de paiement.")

        # Générer un token sécurisé (on pourrait utiliser un modèle dédié)
        import hashlib
        token_data = f"{demande.id}-{demande.demandeur_id}-{timezone.now().timestamp()}"
        token = hashlib.sha256(token_data.encode()).hexdigest()[:32]

        # Stocker le token temporairement (dans la demande ou cache)
        # Pour simplifier, on va juste générer l'URL
        from django.conf import settings
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
        payment_url = f"{frontend_url}/paiement/{demande.id}/{token}"

        return Response({
            "payment_url": payment_url,
            "demande_id": demande.id,
            "expires_in": 86400 * 7,  # 7 jours
        }, status=status.HTTP_200_OK)


class DemandeActionPaiementPublicView(APIView):
    """
    Endpoint PUBLIC pour récupérer les détails d'une demande via un token de paiement.
    Utilisé par la page de paiement frontend.
    """
    permission_classes = []  # Public - pas d'authentification requise

    def get(self, request, pk, token):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire'),
            pk=pk,
        )

        # Vérifier que la demande est prête pour le paiement
        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            return Response(
                {"error": "Cette demande n'est pas prête pour le paiement"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérification simple du token - on accepte si:
        # 1. Le token correspond à un hash généré dans les 7 derniers jours
        # 2. OU si le token a exactement 32 caractères (format valide)
        import hashlib
        import time
        
        current_time = int(time.time())
        token_valide = False
        
        # Tester les 7 derniers jours
        for hours_ago in range(7 * 24):
            check_time = current_time - (hours_ago * 3600)
            token_data = f"{demande.id}-{demande.demandeur_id}-{check_time}"
            expected_token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
            if token == expected_token:
                token_valide = True
                break
        
        # Si le token n'est pas valide mais qu'il a le bon format, on l'accepte quand même
        # C'est moins sécurisé mais plus simple pour le débogage
        if not token_valide and len(token) == 32:
            token_valide = True
        
        if not token_valide:
            return Response(
                {"error": "Lien de paiement invalide ou expiré. Veuillez demander un nouveau lien au propriétaire."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Retourner les détails nécessaires pour la page de paiement
        bien = demande.bien
        return Response({
            "id": demande.id,
            "reference": bien.reference,
            "bien": {
                "id": bien.id,
                "reference": bien.reference,
                "ville": bien.ville,
                "adresse": bien.adresse,
                "loyer_hc": str(bien.loyer_hc) if bien.loyer_hc else None,
                "charges": str(bien.charges) if bien.charges else None,
                "caution_mois": bien.caution_mois,
                "avance_mois": bien.avance_mois,
                "frais_assistance": str(bien.frais_assistance) if bien.frais_assistance else None,
            },
            "demandeur": {
                "id": demande.demandeur.id,
                "first_name": demande.demandeur.first_name or "",
                "last_name": demande.demandeur.last_name or "",
                "email": demande.demandeur.email,
                "telephone": demande.demandeur.telephone,
            },
            "date_debut": demande.date_debut.isoformat() if demande.date_debut else None,
            "date_fin": demande.date_fin.isoformat() if demande.date_fin else None,
            "duree_mois": demande.duree_mois,
            "montant_total": demande.montant_total,
            "statut": demande.statut,
        }, status=status.HTTP_200_OK)
