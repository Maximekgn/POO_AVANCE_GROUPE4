from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied

from immobilier.models import Bien
from immobilier.models.enums import RoleEnum, StatutBienEnum
from immobilier.permissions import IsBienOwnerOrAdminForWrite
from immobilier.serializers import BienSerializer, BienStatutUpdateSerializer


class BienListCreateView(generics.ListCreateAPIView):
    serializer_class = BienSerializer
    permission_classes = [IsAuthenticated, IsBienOwnerOrAdminForWrite]

    def get_queryset(self):
        queryset = Bien.objects.select_related('categorie', 'sous_type', 'proprietaire').prefetch_related('photos').all()

        categorie_id = self.request.query_params.get('categorie')
        statut = self.request.query_params.get('statut')
        ville = self.request.query_params.get('ville')

        if categorie_id:
            queryset = queryset.filter(categorie_id=categorie_id)
        if statut:
            queryset = queryset.filter(statut=statut)
        if ville:
            queryset = queryset.filter(ville__icontains=ville)

        return queryset.order_by('-date_creation')

    def perform_create(self, serializer):
        user = self.request.user
        user_role = getattr(user, 'role', None)

        if user.is_superuser or user.is_staff or user_role == RoleEnum.ADMIN:
            proprietaire = serializer.validated_data.get('proprietaire')
            if proprietaire is None:
                raise ValidationError({'proprietaire': 'Ce champ est obligatoire pour un admin.'})
            serializer.save()
            return

        if user_role != RoleEnum.PROPRIETAIRE:
            raise ValidationError({'detail': 'Seuls les proprietaires et admins peuvent creer un bien.'})

        serializer.save(proprietaire=user)


class BienDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Bien.objects.select_related('categorie', 'sous_type', 'proprietaire').prefetch_related('photos').all()
    serializer_class = BienSerializer
    permission_classes = [IsAuthenticated, IsBienOwnerOrAdminForWrite]


class BienStatutUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    OWNER_TRANSITIONS = {
        StatutBienEnum.VACANT: {StatutBienEnum.LOUE, StatutBienEnum.EN_TRAVAUX},
        StatutBienEnum.LOUE: {StatutBienEnum.VACANT, StatutBienEnum.EN_TRAVAUX},
        StatutBienEnum.EN_TRAVAUX: {StatutBienEnum.VACANT},
    }

    ADMIN_TRANSITIONS = {
        StatutBienEnum.EN_ATTENTE_VALIDATION: {StatutBienEnum.VACANT, StatutBienEnum.EN_TRAVAUX},
        StatutBienEnum.VACANT: {StatutBienEnum.LOUE, StatutBienEnum.EN_TRAVAUX},
        StatutBienEnum.LOUE: {StatutBienEnum.VACANT, StatutBienEnum.EN_TRAVAUX},
        StatutBienEnum.EN_TRAVAUX: {StatutBienEnum.VACANT},
    }

    def patch(self, request, pk):
        bien = Bien.objects.select_related('proprietaire').get(pk=pk)
        serializer = BienStatutUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user_role = getattr(user, 'role', None)
        is_admin = user.is_superuser or user.is_staff or user_role == RoleEnum.ADMIN
        is_owner = bien.proprietaire_id == user.id

        if not (is_admin or is_owner):
            raise PermissionDenied('Vous ne pouvez pas modifier le statut de ce bien.')

        nouveau_statut = serializer.validated_data['statut']
        ancien_statut = bien.statut

        if nouveau_statut == ancien_statut:
            return Response(
                {
                    'id': bien.id,
                    'ancien_statut': ancien_statut,
                    'nouveau_statut': bien.statut,
                },
                status=status.HTTP_200_OK,
            )

        if not is_admin and ancien_statut == StatutBienEnum.EN_ATTENTE_VALIDATION:
            raise ValidationError({'statut': 'Un bien en attente de validation ne peut etre modifie que par un admin.'})

        if not is_admin and nouveau_statut == StatutBienEnum.EN_ATTENTE_VALIDATION:
            raise ValidationError({'statut': 'Le statut EN_ATTENTE_VALIDATION est reserve a la validation admin.'})

        allowed_transitions = self.ADMIN_TRANSITIONS if is_admin else self.OWNER_TRANSITIONS
        allowed_next = allowed_transitions.get(ancien_statut, set())
        if nouveau_statut not in allowed_next:
            raise ValidationError(
                {
                    'statut': f'Transition non autorisee: {ancien_statut} -> {nouveau_statut}.',
                }
            )

        bien.statut = nouveau_statut
        bien.save(update_fields=['statut'])

        return Response(
            {
                'id': bien.id,
                'ancien_statut': ancien_statut,
                'nouveau_statut': bien.statut,
            },
            status=status.HTTP_200_OK,
        )
