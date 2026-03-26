from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.chat_utils import build_conversation_id
from immobilier.models import DemandeAction, Bail, ClientInfo, Message, Bien
from immobilier.models.enums import StatutDemandeEnum, StatutBailEnum, StatutBienEnum
from immobilier.permissions import IsDemandeParticipantOrAdmin
from immobilier.serializers import (
    DemandeActionSerializer,
    DemandeActionDecisionSerializer,
    DemandeActionListFilterSerializer,
)
from immobilier.services.email_service import EmailService
from immobilier.services.contract_service import ContractService


class DemandeActionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeActionSerializer

    def get_queryset(self):
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
        demande.date_traitement = timezone.now()
        demande.traite_par = request.user
        demande.save(
            update_fields=[
                'statut',
                'note_proprietaire',
                'motif_refus',
                'date_traitement',
                'traite_par',
            ]
        )

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
    Crée le bail, change le statut du bien, génère le PDF et l'envoie par mail.
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


