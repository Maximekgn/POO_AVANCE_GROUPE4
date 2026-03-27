from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.chat_utils import build_conversation_id
from immobilier.models import DemandeAction, Bail, ClientInfo, Message, Bien, Paiement
from immobilier.models.enums import StatutDemandeEnum, StatutBailEnum, StatutBienEnum, StatutPaiementEnum, TypeDemandeEnum
from immobilier.permissions import IsDemandeParticipantOrAdmin
from immobilier.serializers import (
    DemandeActionSerializer,
    DemandeActionDecisionSerializer,
    DemandeActionListFilterSerializer,
)
from immobilier.services.email_service import EmailService
from immobilier.services.contract_service import ContractService

def check_expired_privatisations_for_user(user):
    # Find all accepted privatisations for this user (as demandeur or proprietaire) that are expired
    now_date = timezone.now().date()
    expired_demandes = DemandeAction.objects.filter(
        Q(demandeur=user) | Q(proprietaire=user),
        type_demande=TypeDemandeEnum.PRIVATISATION,
        statut=StatutDemandeEnum.ACCEPTEE,
        date_fin__lt=now_date
    ).select_related('demandeur', 'bien', 'proprietaire')

    for demande in expired_demandes:
        demande.statut = StatutDemandeEnum.EXPIREE
        demande.save(update_fields=['statut'])
        EmailService.envoyer_notification_privatisation_expiree(demande)

class DemandeActionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        check_expired_privatisations_for_user(self.request.user)
        queryset = (
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire')
            .filter(demandeur=self.request.user)
            .order_by('-date_creation')
        )

        filters = DemandeActionListFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=False)
        if filters.validated_data.get('type_demande'):
            queryset = queryset.filter(type_demande=filters.validated_data['type_demande'])
        if filters.validated_data.get('statut'):
            queryset = queryset.filter(statut=filters.validated_data['statut'])

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        EmailService.envoyer_nouvelle_demande_bien(instance)

        response_data = DemandeActionSerializer(instance).data
        response_data['conversation_id'] = build_conversation_id(
            instance.demandeur_id,
            instance.proprietaire_id,
        )

        return Response(response_data, status=status.HTTP_201_CREATED)


class DemandeActionIncomingListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        check_expired_privatisations_for_user(self.request.user)
        queryset = (
            DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire')
            .filter(proprietaire=self.request.user)
            .order_by('-date_creation')
        )

        filters = DemandeActionListFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=False)
        if filters.validated_data.get('type_demande'):
            queryset = queryset.filter(type_demande=filters.validated_data['type_demande'])
        if filters.validated_data.get('statut'):
            queryset = queryset.filter(statut=filters.validated_data['statut'])

        return queryset


class DemandeActionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsDemandeParticipantOrAdmin]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        return DemandeAction.objects.select_related('bien', 'demandeur', 'proprietaire').all()

    def delete(self, request, *args, **kwargs):
        demande = self.get_object()

        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != demande.demandeur_id:
                raise PermissionDenied('Seul le demandeur peut annuler cette demande.')

        if demande.statut in {StatutDemandeEnum.REFUSEE, StatutDemandeEnum.ANNULEE}:
            raise ValidationError({'statut': 'Cette demande ne peut plus etre annulee.'})

        demande.statut = StatutDemandeEnum.ANNULEE
        demande.date_traitement = timezone.now()
        demande.traite_par = request.user
        demande.save(update_fields=['statut', 'date_traitement', 'traite_par'])

        return Response(DemandeActionSerializer(demande).data, status=status.HTTP_200_OK)


class DemandeActionDecisionView(APIView):
    permission_classes = [IsAuthenticated, IsDemandeParticipantOrAdmin]

    def patch(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        if not (request.user.is_staff or request.user.is_superuser):
            if request.user.id != demande.proprietaire_id:
                raise PermissionDenied('Seul le proprietaire peut traiter cette demande.')

        if demande.statut != StatutDemandeEnum.EN_ATTENTE:
            raise ValidationError({'statut': 'Cette demande est deja traitee.'})

        serializer = DemandeActionDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        demande.statut = serializer.validated_data['statut']
        demande.note_proprietaire = serializer.validated_data.get('note_proprietaire')
        
        if demande.statut == StatutDemandeEnum.REFUSEE:
            demande.motif_refus = serializer.validated_data.get('motif_refus')
            
        if demande.statut == StatutDemandeEnum.ACCEPTEE and demande.type_demande == 'VISITE':
            date_visite = serializer.validated_data.get('date_visite')
            if not date_visite:
                raise ValidationError({'date_visite': 'La date de la visite est obligatoire.'})
            demande.date_visite = date_visite

        demande.date_traitement = timezone.now()
        demande.traite_par = request.user
        
        update_fields = [
            'statut',
            'note_proprietaire',
            'motif_refus',
            'date_traitement',
            'traite_par',
        ]
        if demande.type_demande == 'VISITE':
            update_fields.append('date_visite')
            
        demande.save(update_fields=update_fields)

        if demande.statut == StatutDemandeEnum.ACCEPTEE:
            if demande.type_demande == 'VISITE':
                EmailService.envoyer_notification_visite_programmee(demande)
            elif demande.type_demande == 'PRIVATISATION':
                EmailService.envoyer_notification_privatisation_acceptee(demande)
            else:
                EmailService.envoyer_decision_demande_bien(demande)
        else:
            EmailService.envoyer_decision_demande_bien(demande)

        # Injecter un message automatique dans le chat si accepté
        if demande.statut == StatutDemandeEnum.ACCEPTEE:
            conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
            msg_content = f"Félicitations ! Votre demande de {demande.type_demande.lower()} pour le bien {demande.bien.reference} a été acceptée. Nous pouvons maintenant échanger ici."
            Message.objects.create(
                expediteur=request.user,
                destinataire=demande.demandeur,
                contenu=msg_content,
                conversation_id=conversation_id
            )

        return Response(DemandeActionSerializer(demande).data, status=status.HTTP_200_OK)


class DemandeActionFinaliserLocationView(APIView):
    """
    Action déclenchée par le bouton "Faire louer".
    Vérifie que le paiement a été effectué, puis crée le bail, change le statut du bien, génère le PDF et l'envoie par mail.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        # Vérifications de sécurité
        if request.user.id != demande.proprietaire_id and not request.user.is_staff:
            raise PermissionDenied("Seul le propriétaire peut finaliser la location.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée avant de finaliser la location."})

        # Vérifier que le paiement a été effectué
        if not demande.paiement_effectue:
            raise ValidationError({"detail": "Le paiement doit être effectué avant de finaliser la location. Veuillez d'abord demander le paiement au locataire."})

        # 1. Récupérer ou Créer les infos client (locataire)
        client_info, _ = ClientInfo.objects.get_or_create(utilisateur=demande.demandeur)

        # 2. Créer l'objet Bail
        import uuid
        num_bail = f"BAIL-{uuid.uuid4().hex[:8].upper()}"

        bail = Bail.objects.create(
            bien=demande.bien,
            client_info=client_info,
            demande=demande,
            numero_bail=num_bail,
            date_entree=demande.date_debut,
            date_sortie=demande.date_fin,
            loyer_actuel=demande.bien.loyer_total or demande.montant_total,
            depot_garantie=demande.bien.loyer_total or 0, # Par défaut un mois ou valeur du bien
            statut=StatutBailEnum.EN_COURS,
            date_signature_proprietaire=timezone.now()
        )

        # 3. Mettre à jour le Bien
        bien = demande.bien
        bien.statut = StatutBienEnum.LOUE
        bien.save(update_fields=['statut'])

        # 4. Générer le PDF
        pdf_buffer = ContractService.generate_lease_pdf(bail)

        # 5. Envoyer par e-mail
        email_sent = ContractService.send_lease_by_email(bail, pdf_buffer)

        # 6. Message de confirmation dans le chat
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=request.user,
            destinataire=demande.demandeur,
            contenu=f"Le contrat de bail #{num_bail} a été généré et vous a été envoyé par e-mail. Bienvenue dans votre nouveau logement !",
            conversation_id=conversation_id
        )

        return Response({
            "message": "Location finalisée avec succès. Le contrat a été envoyé par e-mail.",
            "numero_bail": num_bail,
            "email_sent": email_sent
        }, status=status.HTTP_200_OK)


class DemandeActionRequestPaymentView(APIView):
    """
    Action déclenchée par le bouton "Demander le paiement".
    Envoie une notification email au locataire pour qu'il effectue le paiement.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        # Vérifications de sécurité
        if request.user.id != demande.proprietaire_id and not request.user.is_staff:
            raise PermissionDenied("Seul le propriétaire peut demander le paiement.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée avant de demander le paiement."})

        if demande.paiement_demande_envoyee:
            raise ValidationError({"detail": "La demande de paiement a déjà été envoyée."})

        if demande.paiement_effectue:
            raise ValidationError({"detail": "Le paiement a déjà été effectué."})

        # Marquer que la demande de paiement a été envoyée
        demande.paiement_demande_envoyee = True
        demande.save(update_fields=['paiement_demande_envoyee'])

        # Envoyer l'email de demande de paiement
        url_paiement = f"/locations"  # URL vers la page de paiement du locataire
        email_sent = EmailService.envoyer_demande_paiement(
            demandeur=demande.demandeur,
            demande=demande,
            url_paiement=url_paiement
        )

        # Message automatique dans le chat
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=request.user,
            destinataire=demande.demandeur,
            contenu=f"Bonjour, veuillez effectuer le paiement de {demande.montant_total} FCFA pour votre location du bien {demande.bien.reference}. Une fois le paiement effectué, le contrat de bail sera généré automatiquement.",
            conversation_id=conversation_id
        )

        return Response({
            "message": "Demande de paiement envoyée avec succès.",
            "email_sent": email_sent
        }, status=status.HTTP_200_OK)


class DemandeActionConfirmPaymentView(APIView):
    """
    Action pour le locataire pour confirmer qu'il a effectué le paiement.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        demande = get_object_or_404(
            DemandeAction.objects.select_related('demandeur', 'proprietaire', 'bien'),
            pk=pk,
        )

        # Seul le demandeur peut confirmer le paiement
        if request.user.id != demande.demandeur_id:
            raise PermissionDenied("Seul le locataire peut confirmer le paiement.")

        if demande.statut != StatutDemandeEnum.ACCEPTEE:
            raise ValidationError({"detail": "La demande doit être acceptée."})

        if not demande.paiement_demande_envoyee:
            raise ValidationError({"detail": "Aucune demande de paiement n'a été envoyée."})

        if demande.paiement_effectue:
            raise ValidationError({"detail": "Le paiement a déjà été confirmé."})

        # Marquer le paiement comme effectué
        demande.paiement_effectue = True
        demande.save(update_fields=['paiement_effectue'])

        # Notification au propriétaire
        conversation_id = build_conversation_id(demande.demandeur_id, demande.proprietaire_id)
        Message.objects.create(
            expediteur=request.user,
            destinataire=demande.proprietaire,
            contenu=f"Le locataire a confirmé le paiement pour le bien {demande.bien.reference}. Vous pouvez maintenant finaliser la location et générer le contrat de bail.",
            conversation_id=conversation_id
        )

        return Response({
            "message": "Paiement confirmé avec succès. Le propriétaire peut maintenant finaliser la location."
        }, status=status.HTTP_200_OK)


class DemandeActionActionableListView(generics.ListAPIView):
    """
    Renvoie les demandes de location ACCEPTÉES entre l'utilisateur courant et un autre.
    Utilisé par le chat pour proposer le bouton "Faire louer".
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
        other_user_id = self.request.query_params.get('other_user_id')
        if not other_user_id:
            return DemandeAction.objects.none()
            
        from immobilier.models.enums import TypeDemandeEnum
        return DemandeAction.objects.filter(
            Q(proprietaire=self.request.user),
            Q(demandeur_id=other_user_id),
            statut=StatutDemandeEnum.ACCEPTEE,
            type_demande=TypeDemandeEnum.LOCATION_DIRECTE
        ).select_related('bien', 'demandeur', 'proprietaire')


