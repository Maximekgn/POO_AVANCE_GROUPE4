from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db.models import Q

from immobilier.models import Bien, ProprietaireInfo
from immobilier.models.enums import StatutBienEnum
from immobilier.permissions import IsBienOwnerOrAdminForWrite
from immobilier.serializers import (
    BienSerializer,
    BienStatutUpdateSerializer,
    BienActivationUpdateSerializer,
    BienRefusSerializer,
)
from immobilier.services.email_service import EmailService


class BienListCreateView(generics.ListCreateAPIView):
    serializer_class = BienSerializer
    permission_classes = [IsAuthenticated, IsBienOwnerOrAdminForWrite]

    def get_queryset(self):
        queryset = Bien.objects.select_related('categorie', 'sous_type', 'proprietaire_info').prefetch_related('photos').all()
        user = self.request.user

        if not (user.is_staff or user.is_superuser):
            proprietaire_info = getattr(user, 'proprietaire_info', None)
            if proprietaire_info is None:
                return Bien.objects.none()
            queryset = queryset.filter(proprietaire_info=proprietaire_info)

        categorie_value = self.request.query_params.get('categorie') or self.request.query_params.get('category')
        statut = self.request.query_params.get('statut')
        ville = self.request.query_params.get('ville')
        quartier = self.request.query_params.get('quartier')
        search = (
            self.request.query_params.get('search')
            or self.request.query_params.get('keyword')
            or self.request.query_params.get('q')
        )

        if categorie_value:
            if str(categorie_value).isdigit():
                queryset = queryset.filter(categorie_id=categorie_value)
            else:
                queryset = queryset.filter(categorie__nom__iexact=categorie_value)
        if statut:
            queryset = queryset.filter(statut=statut)
        if ville:
            queryset = queryset.filter(ville__icontains=ville)
        if quartier:
            queryset = queryset.filter(quartier__icontains=quartier)
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(ville__icontains=search)
                | Q(description__icontains=search)
            )

        return queryset.order_by('-date_creation')

    def perform_create(self, serializer):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            proprietaire_info = serializer.validated_data.get('proprietaire_info')
            if proprietaire_info is None:
                raise ValidationError({'proprietaire_info': 'Ce champ est obligatoire pour un admin.'})
            serializer.save()
            return

        proprietaire_info, _ = ProprietaireInfo.objects.get_or_create(utilisateur=user)
        bien = serializer.save(
            proprietaire_info=proprietaire_info,
            statut=StatutBienEnum.EN_ATTENTE_VALIDATION,
        )

        EmailService.envoyer_nouveau_bien_admin(bien)


class PublicBienListView(generics.ListAPIView):
    """Liste publique des biens pour la page d'accueil frontend."""

    serializer_class = BienSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = (
            Bien.objects.select_related('categorie', 'sous_type')
            .prefetch_related('photos')
            .filter(statut=StatutBienEnum.VACANT, is_active=True)
            .all()
        )

        categorie_value = self.request.query_params.get('categorie') or self.request.query_params.get('category')
        ville = self.request.query_params.get('ville')
        quartier = self.request.query_params.get('quartier')
        search = (
            self.request.query_params.get('search')
            or self.request.query_params.get('keyword')
            or self.request.query_params.get('q')
        )

        if categorie_value:
            if str(categorie_value).isdigit():
                queryset = queryset.filter(categorie_id=categorie_value)
            else:
                queryset = queryset.filter(categorie__nom__iexact=categorie_value)
        if ville:
            queryset = queryset.filter(ville__icontains=ville)
        if quartier:
            queryset = queryset.filter(quartier__icontains=quartier)
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(ville__icontains=search)
                | Q(description__icontains=search)
            )

        return queryset.order_by('-date_creation')


class PublicBienDetailView(generics.RetrieveAPIView):
    """Détail public d'un bien pour la page listing/[id] du frontend."""

    serializer_class = BienSerializer
    permission_classes = [AllowAny]
    queryset = (
        Bien.objects.select_related('categorie', 'sous_type')
        .prefetch_related('photos')
        .filter(statut=StatutBienEnum.VACANT, is_active=True)
        .all()
    )


class BienDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Bien.objects.select_related('categorie', 'sous_type', 'proprietaire_info').prefetch_related('photos').all()
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
        bien = Bien.objects.select_related('proprietaire_info').get(pk=pk)
        serializer = BienStatutUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        is_admin = user.is_superuser or user.is_staff
        is_owner = (hasattr(user, 'proprietaire_info') and bien.proprietaire_info_id == user.proprietaire_info.id)

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

        if (
            is_admin
            and ancien_statut == StatutBienEnum.EN_ATTENTE_VALIDATION
            and nouveau_statut == StatutBienEnum.VACANT
            and bien.proprietaire_info
            and bien.proprietaire_info.utilisateur
        ):
            EmailService.envoyer_validation_bien(
                proprietaire=bien.proprietaire_info.utilisateur,
                bien=bien,
                valide=True,
                url_mon_espace='/',
            )

        return Response(
            {
                'id': bien.id,
                'ancien_statut': ancien_statut,
                'nouveau_statut': bien.statut,
            },
            status=status.HTTP_200_OK,
        )


class BienActivationUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut activer ou desactiver un bien.')

        bien = Bien.objects.get(pk=pk)
        serializer = BienActivationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bien.is_active = serializer.validated_data['is_active']
        bien.save(update_fields=['is_active'])

        return Response(
            {
                'id': bien.id,
                'is_active': bien.is_active,
            },
            status=status.HTTP_200_OK,
        )


class BienRefusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut refuser un bien.')

        bien = Bien.objects.select_related('proprietaire_info__utilisateur').get(pk=pk)
        serializer = BienRefusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if bien.statut != StatutBienEnum.EN_ATTENTE_VALIDATION:
            raise ValidationError({'detail': 'Seuls les biens en attente peuvent etre refuses.'})

        motif_refus = serializer.validated_data['motif_refus'].strip()
        if not motif_refus:
            raise ValidationError({'motif_refus': 'Le motif de refus est obligatoire.'})

        owner = getattr(getattr(bien, 'proprietaire_info', None), 'utilisateur', None)
        if owner and owner.email:
            EmailService.envoyer_validation_bien(
                proprietaire=owner,
                bien=bien,
                valide=False,
                motif_refus=motif_refus,
                url_mon_espace='/',
            )

        return Response(
            {
                'id': bien.id,
                'refuse': True,
                'motif_refus': motif_refus,
            },
            status=status.HTTP_200_OK,
        )
