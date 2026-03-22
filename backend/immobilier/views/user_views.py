from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import Bail, Bien, Utilisateur
from immobilier.serializers import AdminUserDetailsSerializer, BienSerializer
from immobilier.services.email_service import EmailService
from immobilier.serializers.user_serializers import (
    CurrentUserProfileSerializer,
    CurrentUserProfileUpdateSerializer,
)


class CurrentUserProfileView(APIView):
    """Lecture et modification du profil de l'utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = (
            Utilisateur.objects
            .select_related('client_info__carte_identite', 'proprietaire_info__carte_identite')
            .get(pk=request.user.pk)
        )
        serializer = CurrentUserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request: Request) -> Response:
        serializer = CurrentUserProfileUpdateSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refreshed = (
            Utilisateur.objects
            .select_related('client_info__carte_identite', 'proprietaire_info__carte_identite')
            .get(pk=user.pk)
        )
        payload = CurrentUserProfileSerializer(refreshed).data
        return Response(payload, status=status.HTTP_200_OK)


class AdminUserListView(APIView):
    """Retourne la liste complète des utilisateurs pour les administrateurs."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut consulter la liste des utilisateurs.')

        users = (
            Utilisateur.objects
            .select_related('client_info__carte_identite', 'proprietaire_info__carte_identite')
            .order_by('-date_joined', '-id')
        )
        serializer = AdminUserDetailsSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserDetailView(APIView):
    """Retourne le détail d'un utilisateur pour les administrateurs."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut consulter le détail utilisateur.')

        user = get_object_or_404(
            Utilisateur.objects.select_related('client_info__carte_identite', 'proprietaire_info__carte_identite'),
            pk=pk,
        )
        serializer = AdminUserDetailsSerializer(user)
        payload = dict(serializer.data)

        biens_possedes_count = 0
        if getattr(user, 'proprietaire_info', None):
            biens_possedes_count = Bien.objects.filter(
                proprietaire_info__utilisateur_id=user.id
            ).count()

        biens_loues_ou_privatises_count = Bail.objects.filter(
            client_info__utilisateur_id=user.id,
        ).count()

        payload['resume_immobilier'] = {
            'is_client': bool(getattr(user, 'client_info', None)),
            'is_proprietaire': bool(getattr(user, 'proprietaire_info', None)),
            'biens_possedes_count': biens_possedes_count,
            'biens_loues_ou_privatises_count': biens_loues_ou_privatises_count,
        }
        return Response(payload, status=status.HTTP_200_OK)


class AdminUserBiensView(APIView):
    """Retourne les biens rattachés à un utilisateur pour la fiche admin."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut consulter les biens d\'un utilisateur.')

        biens = (
            Bien.objects
            .select_related('categorie', 'sous_type', 'proprietaire_info__utilisateur')
            .prefetch_related('photos')
            .filter(proprietaire_info__utilisateur_id=pk)
            .order_by('-date_creation', '-id')
        )
        serializer = BienSerializer(biens, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserRentedBiensView(APIView):
    """Retourne les biens loués/privatisés par un utilisateur (en tant que client)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut consulter les biens loués d\'un utilisateur.')

        baux = (
            Bail.objects
            .select_related('bien', 'client_info__utilisateur')
            .filter(client_info__utilisateur_id=pk)
            .order_by('-date_entree', '-id')
        )

        payload = [
            {
                'bail_id': bail.id,
                'numero_bail': bail.numero_bail,
                'bail_statut': bail.statut,
                'date_entree': bail.date_entree,
                'date_sortie': bail.date_sortie,
                'loyer_actuel': bail.loyer_actuel,
                'depot_garantie': bail.depot_garantie,
                'bien': {
                    'id': bail.bien.id,
                    'reference': bail.bien.reference,
                    'ville': bail.bien.ville,
                    'quartier': bail.bien.quartier,
                    'adresse': bail.bien.adresse,
                    'statut': bail.bien.statut,
                    'is_active': bail.bien.is_active,
                    'prix_jour': bail.bien.prix_jour,
                    'prix_mois': bail.bien.prix_mois,
                },
            }
            for bail in baux
        ]

        return Response(payload, status=status.HTTP_200_OK)


class AdminVerifyUserView(APIView):
    """Permet aux administrateurs de vérifier un utilisateur ou rejeter ses documents."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut vérifier les utilisateurs.')

        user = get_object_or_404(Utilisateur, pk=pk)
        action = request.data.get('action')

        if action == 'verify':
            user.compte_verifie = True
            user.documents_complets = True
            user.is_active = True
            user.save(update_fields=['compte_verifie', 'documents_complets', 'is_active'])
            email_sent = EmailService.envoyer_statut_compte_admin(user, statut='APPROUVE')
            return Response(
                {
                    'message': 'Utilisateur vérifié avec succès.' if email_sent else 'Utilisateur vérifié, mais email non envoyé.',
                    'compte_verifie': user.compte_verifie,
                    'is_active': user.is_active,
                    'email_sent': email_sent,
                },
                status=status.HTTP_200_OK
            )
        elif action == 'reject':
            user.documents_complets = False
            user.compte_verifie = False
            user.is_active = False
            user.save(update_fields=['documents_complets', 'compte_verifie', 'is_active'])
            email_sent = EmailService.envoyer_statut_compte_admin(user, statut='REJETE')
            return Response(
                {
                    'message': 'Documents rejetés, utilisateur notifié.' if email_sent else 'Documents rejetés, mais email non envoyé.',
                    'documents_complets': user.documents_complets,
                    'is_active': user.is_active,
                    'email_sent': email_sent,
                },
                status=status.HTTP_200_OK
            )
        elif action == 'suspend':
            user.is_active = False
            user.save(update_fields=['is_active'])
            email_sent = EmailService.envoyer_statut_compte_admin(user, statut='SUSPENDU')
            return Response(
                {
                    'message': 'Compte suspendu, utilisateur notifié.' if email_sent else 'Compte suspendu, mais email non envoyé.',
                    'is_active': user.is_active,
                    'email_sent': email_sent,
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': 'Action invalide. Utilisez "verify", "reject" ou "suspend".'},
                status=status.HTTP_400_BAD_REQUEST
            )

