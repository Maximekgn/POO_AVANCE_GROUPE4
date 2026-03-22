from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.chat_utils import build_conversation_id
from immobilier.models import DemandeAction
from immobilier.models.enums import StatutDemandeEnum
from immobilier.permissions import IsDemandeParticipantOrAdmin
from immobilier.serializers import (
    DemandeActionSerializer,
    DemandeActionDecisionSerializer,
    DemandeActionListFilterSerializer,
)
from immobilier.services.email_service import EmailService


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

        return Response(DemandeActionSerializer(demande).data, status=status.HTTP_200_OK)
