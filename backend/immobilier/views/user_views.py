from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import Bail, Bien, ClientInfo, Garant, Message, RGPDAnonymizationLog, Utilisateur
from immobilier.models.enums import StatutBailEnum, StatutPaiementEnum
from immobilier.serializers import (
    AdminUserDetailsSerializer,
    BienSerializer,
    GarantSerializer,
    LocataireListSerializer,
    LocataireDetailSerializer,
    LocataireOnboardingSerializer,
    AdminUserAnonymizeSerializer,
)
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


class GarantListCreateView(APIView):
    """Liste et creation des garants (propre utilisateur ou admin)."""

    permission_classes = [IsAuthenticated]

    def _resolve_client_info(self, request: Request):
        client_info_id = request.query_params.get('client_info_id') or request.data.get('client_info_id')

        if request.user.is_staff or request.user.is_superuser:
            if client_info_id:
                return get_object_or_404(ClientInfo, pk=client_info_id)
            return None

        client_info = getattr(request.user, 'client_info', None)
        if client_info is None:
            raise PermissionDenied('Aucun profil client associe a cet utilisateur.')
        return client_info

    def get(self, request: Request) -> Response:
        client_info = self._resolve_client_info(request)
        queryset = (
            Garant.objects
            .select_related('client_info__utilisateur', 'carte_identite')
            .all()
            .order_by('-id')
        )

        if client_info is not None:
            queryset = queryset.filter(client_info=client_info)

        q = (request.query_params.get('q') or '').strip()
        if q:
            queryset = queryset.filter(
                Q(nom__icontains=q)
                | Q(prenom__icontains=q)
                | Q(email__icontains=q)
                | Q(telephone__icontains=q)
            )

        serializer = GarantSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        client_info = self._resolve_client_info(request)

        if client_info is None:
            client_info_id = request.data.get('client_info_id')
            if not client_info_id:
                return Response(
                    {'client_info_id': 'Ce champ est obligatoire pour un admin.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            client_info = get_object_or_404(ClientInfo, pk=client_info_id)

        serializer = GarantSerializer(data=request.data, context={'client_info': client_info})
        serializer.is_valid(raise_exception=True)
        serializer.save(client_info=client_info)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GarantDetailView(APIView):
    """Lecture, modification et suppression d'un garant."""

    permission_classes = [IsAuthenticated]

    def _get_object(self, pk: int) -> Garant:
        return get_object_or_404(
            Garant.objects.select_related('client_info__utilisateur', 'carte_identite'),
            pk=pk,
        )

    def _assert_can_manage(self, request: Request, garant: Garant):
        if request.user.is_staff or request.user.is_superuser:
            return

        client_info = getattr(request.user, 'client_info', None)
        if client_info is None or client_info.id != garant.client_info_id:
            raise PermissionDenied('Vous ne pouvez gerer que vos propres garants.')

    def get(self, request: Request, pk: int) -> Response:
        garant = self._get_object(pk)
        self._assert_can_manage(request, garant)
        serializer = GarantSerializer(garant)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request: Request, pk: int) -> Response:
        garant = self._get_object(pk)
        self._assert_can_manage(request, garant)
        serializer = GarantSerializer(
            garant,
            data=request.data,
            partial=True,
            context={'client_info': garant.client_info},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request: Request, pk: int) -> Response:
        garant = self._get_object(pk)
        self._assert_can_manage(request, garant)
        garant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LocataireListView(APIView):
    """Liste dediee des locataires avec recherche et filtres backend."""

    permission_classes = [IsAuthenticated]

    def _base_queryset(self, request: Request):
        queryset = (
            ClientInfo.objects
            .select_related('utilisateur', 'carte_identite')
            .prefetch_related('garants', 'baux__bien', 'baux__paiements')
            .all()
            .order_by('-date_creation', '-id')
        )

        if request.user.is_staff or request.user.is_superuser:
            return queryset

        proprietaire_info = getattr(request.user, 'proprietaire_info', None)
        if proprietaire_info is None:
            raise PermissionDenied('Seuls les admins ou proprietaires peuvent consulter les locataires.')

        return queryset.filter(baux__bien__proprietaire_info=proprietaire_info).distinct()

    def get(self, request: Request) -> Response:
        queryset = self._base_queryset(request)

        q = (request.query_params.get('q') or '').strip()
        has_active_bail = (request.query_params.get('has_active_bail') or '').strip().lower()
        has_impayes = (request.query_params.get('has_impayes') or '').strip().lower()

        if q:
            queryset = queryset.filter(
                Q(utilisateur__first_name__icontains=q)
                | Q(utilisateur__last_name__icontains=q)
                | Q(utilisateur__email__icontains=q)
                | Q(utilisateur__telephone__icontains=q)
            )

        if has_active_bail in {'true', '1', 'yes'}:
            queryset = queryset.filter(baux__statut=StatutBailEnum.EN_COURS)
        elif has_active_bail in {'false', '0', 'no'}:
            queryset = queryset.exclude(baux__statut=StatutBailEnum.EN_COURS)

        if has_impayes in {'true', '1', 'yes'}:
            queryset = queryset.filter(baux__paiements__statut=StatutPaiementEnum.IMPAYE)
        elif has_impayes in {'false', '0', 'no'}:
            queryset = queryset.exclude(baux__paiements__statut=StatutPaiementEnum.IMPAYE)

        queryset = queryset.distinct()
        serializer = LocataireListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LocataireDetailView(APIView):
    """Detail d'un locataire avec ses garants et ses baux."""

    permission_classes = [IsAuthenticated]

    def _get_object(self, request: Request, pk: int) -> ClientInfo:
        queryset = (
            ClientInfo.objects
            .select_related('utilisateur', 'carte_identite')
            .prefetch_related('garants', 'baux__bien', 'baux__paiements')
            .all()
        )
        locataire = get_object_or_404(queryset, pk=pk)

        if request.user.is_staff or request.user.is_superuser:
            return locataire

        proprietaire_info = getattr(request.user, 'proprietaire_info', None)
        if proprietaire_info is None:
            raise PermissionDenied('Seuls les admins ou proprietaires peuvent consulter ce detail.')

        owns_bail = Bail.objects.filter(
            client_info=locataire,
            bien__proprietaire_info=proprietaire_info,
        ).exists()
        if not owns_bail:
            raise PermissionDenied('Vous ne pouvez consulter que les locataires lies a vos biens.')

        return locataire

    def get(self, request: Request, pk: int) -> Response:
        locataire = self._get_object(request, pk)
        serializer = LocataireDetailSerializer(locataire)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LocataireHistoryView(APIView):
    """Historique consolide d'un locataire (baux + paiements + synthese)."""

    permission_classes = [IsAuthenticated]

    def _get_object(self, request: Request, pk: int) -> ClientInfo:
        queryset = (
            ClientInfo.objects
            .select_related('utilisateur')
            .prefetch_related('baux__bien', 'baux__paiements')
            .all()
        )
        locataire = get_object_or_404(queryset, pk=pk)

        if request.user.is_staff or request.user.is_superuser:
            return locataire

        proprietaire_info = getattr(request.user, 'proprietaire_info', None)
        if proprietaire_info is None:
            raise PermissionDenied('Seuls les admins ou proprietaires peuvent consulter cet historique.')

        owns_bail = Bail.objects.filter(
            client_info=locataire,
            bien__proprietaire_info=proprietaire_info,
        ).exists()
        if not owns_bail:
            raise PermissionDenied('Vous ne pouvez consulter que l historique des locataires lies a vos biens.')

        return locataire

    def get(self, request: Request, pk: int) -> Response:
        locataire = self._get_object(request, pk)
        user = locataire.utilisateur

        baux_payload = []
        montant_paye = 0
        montant_impaye = 0
        montant_en_attente = 0
        paiements_payes = 0
        paiements_impayes = 0
        paiements_en_attente = 0
        paiements_total = 0
        prochaine_echeance = None

        baux = list(locataire.baux.all())

        for bail in baux:
            paiements_payload = []
            bail_montant_paye = 0
            bail_montant_impaye = 0
            bail_montant_en_attente = 0

            for paiement in bail.paiements.all():
                paiements_total += 1
                statut = paiement.statut

                if statut == StatutPaiementEnum.PAYE:
                    paiements_payes += 1
                    montant_paye += paiement.montant
                    bail_montant_paye += paiement.montant
                elif statut == StatutPaiementEnum.IMPAYE:
                    paiements_impayes += 1
                    montant_impaye += paiement.montant
                    bail_montant_impaye += paiement.montant
                else:
                    paiements_en_attente += 1
                    montant_en_attente += paiement.montant
                    bail_montant_en_attente += paiement.montant

                if statut in {StatutPaiementEnum.EN_ATTENTE, StatutPaiementEnum.IMPAYE}:
                    if prochaine_echeance is None or paiement.date_echeance < prochaine_echeance:
                        prochaine_echeance = paiement.date_echeance

                paiements_payload.append(
                    {
                        'id': paiement.id,
                        'reference': paiement.reference,
                        'montant': paiement.montant,
                        'statut': paiement.statut,
                        'mode_paiement': paiement.mode_paiement,
                        'date_echeance': paiement.date_echeance,
                        'date_paiement': paiement.date_paiement,
                        'commentaire': paiement.commentaire,
                    }
                )

            baux_payload.append(
                {
                    'id': bail.id,
                    'numero_bail': bail.numero_bail,
                    'statut': bail.statut,
                    'date_entree': bail.date_entree,
                    'date_sortie': bail.date_sortie,
                    'loyer_actuel': bail.loyer_actuel,
                    'depot_garantie': bail.depot_garantie,
                    'bien': {
                        'id': bail.bien_id,
                        'reference': getattr(bail.bien, 'reference', None),
                        'ville': getattr(bail.bien, 'ville', None),
                        'quartier': getattr(bail.bien, 'quartier', None),
                        'adresse': getattr(bail.bien, 'adresse', None),
                        'statut': getattr(bail.bien, 'statut', None),
                    },
                    'paiements': paiements_payload,
                    'resume_paiements': {
                        'nombre_total': len(paiements_payload),
                        'montant_paye': bail_montant_paye,
                        'montant_impaye': bail_montant_impaye,
                        'montant_en_attente': bail_montant_en_attente,
                    },
                }
            )

        payload = {
            'locataire': {
                'id': locataire.id,
                'utilisateur_id': user.id,
                'nom_complet': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
                'email': user.email,
                'telephone': user.telephone,
                'profession': locataire.profession,
                'revenus_mensuels': locataire.revenus_mensuels,
                'numero_piece': locataire.numero_piece,
                'date_creation': locataire.date_creation,
            },
            'resume': {
                'nombre_baux': len(baux),
                'baux_actifs': sum(1 for bail in baux if bail.statut == StatutBailEnum.EN_COURS),
                'baux_termines': sum(1 for bail in baux if bail.statut in {StatutBailEnum.EXPIRE, StatutBailEnum.RESILIE}),
                'paiements_total': paiements_total,
                'paiements_payes': paiements_payes,
                'paiements_impayes': paiements_impayes,
                'paiements_en_attente': paiements_en_attente,
                'montant_paye': montant_paye,
                'montant_impaye': montant_impaye,
                'montant_en_attente': montant_en_attente,
                'prochaine_echeance': prochaine_echeance,
            },
            'historique_baux': baux_payload,
        }

        return Response(payload, status=status.HTTP_200_OK)


class LocataireOnboardingView(APIView):
    """Workflow explicite d'ajout locataire par admin/proprietaire."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if not (
            request.user.is_staff
            or request.user.is_superuser
            or getattr(request.user, 'proprietaire_info', None) is not None
        ):
            raise PermissionDenied('Seuls les admins ou proprietaires peuvent ajouter un locataire.')

        serializer = LocataireOnboardingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        user = result['utilisateur']
        client_info = result['client_info']
        bail = result['bail']

        payload = {
            'message': 'Locataire ajoute avec succes.',
            'user_created': result['user_created'],
            'client_created': result['client_created'],
            'locataire': {
                'client_info_id': client_info.id,
                'utilisateur_id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'telephone': user.telephone,
                'profession': client_info.profession,
                'numero_piece': client_info.numero_piece,
                'revenus_mensuels': client_info.revenus_mensuels,
            },
            'bail': None,
        }

        if bail is not None:
            payload['bail'] = {
                'id': bail.id,
                'numero_bail': bail.numero_bail,
                'statut': bail.statut,
                'bien_id': bail.bien_id,
            }

        return Response(payload, status=status.HTTP_201_CREATED)


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


class AdminUserAnonymizeView(APIView):
    """Anonymise un utilisateur en conservant les traces métier et un journal d'audit."""

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request: Request, pk: int) -> Response:
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut anonymiser un utilisateur.')

        if request.user.id == pk:
            return Response(
                {'error': 'Un admin ne peut pas anonymiser son propre compte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdminUserAnonymizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = get_object_or_404(
            Utilisateur.objects.select_related('client_info__carte_identite', 'proprietaire_info__carte_identite'),
            pk=pk,
        )

        if user.email and user.email.startswith('anonymized+'):
            return Response(
                {'error': 'Cet utilisateur est deja anonymise.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        original_user_id = user.id
        original_email = user.email
        anonymized_email = f"anonymized+{original_user_id}@privacy.local"
        anonymized_username = f"anonymized_{original_user_id}"

        summary = {
            'documents_anonymises': 0,
            'garants_anonymises': 0,
            'messages_anonymises': 0,
        }

        client_info = getattr(user, 'client_info', None)
        if client_info is not None:
            doc = client_info.carte_identite
            if doc is not None:
                doc.nom = 'ANONYMIZED_DOCUMENT'
                doc.url = None
                doc.file = None
                doc.mime_type = None
                doc.taille_octets = None
                doc.save(update_fields=['nom', 'url', 'file', 'mime_type', 'taille_octets'])
                summary['documents_anonymises'] += 1

            garants_qs = Garant.objects.filter(client_info=client_info)
            summary['garants_anonymises'] = garants_qs.count()
            for garant in garants_qs:
                garant.nom = 'ANONYMIZED'
                garant.prenom = 'ANONYMIZED'
                garant.telephone = None
                garant.email = None
                garant.profession = None
                garant.revenus_mensuels = None
                garant.numero_piece = None
                if garant.carte_identite is not None:
                    doc_garant = garant.carte_identite
                    doc_garant.nom = 'ANONYMIZED_DOCUMENT'
                    doc_garant.url = None
                    doc_garant.file = None
                    doc_garant.mime_type = None
                    doc_garant.taille_octets = None
                    doc_garant.save(update_fields=['nom', 'url', 'file', 'mime_type', 'taille_octets'])
                    summary['documents_anonymises'] += 1
                garant.save(
                    update_fields=['nom', 'prenom', 'telephone', 'email', 'profession', 'revenus_mensuels', 'numero_piece']
                )

            client_info.profession = None
            client_info.numero_piece = None
            client_info.revenus_mensuels = None
            client_info.save(update_fields=['profession', 'numero_piece', 'revenus_mensuels'])

        proprietaire_info = getattr(user, 'proprietaire_info', None)
        if proprietaire_info is not None:
            doc = proprietaire_info.carte_identite
            if doc is not None:
                doc.nom = 'ANONYMIZED_DOCUMENT'
                doc.url = None
                doc.file = None
                doc.mime_type = None
                doc.taille_octets = None
                doc.save(update_fields=['nom', 'url', 'file', 'mime_type', 'taille_octets'])
                summary['documents_anonymises'] += 1

            proprietaire_info.iban = None
            proprietaire_info.adresse_fiscale = None
            proprietaire_info.numero_piece = None
            proprietaire_info.save(update_fields=['iban', 'adresse_fiscale', 'numero_piece'])

        messages_qs = Message.objects.filter(Q(expediteur=user) | Q(destinataire=user))
        summary['messages_anonymises'] = messages_qs.count()
        messages_qs.update(contenu='[ANONYMIZED]', objet='[ANONYMIZED]')

        user.first_name = 'ANONYMIZED'
        user.last_name = 'USER'
        user.email = anonymized_email
        user.username = anonymized_username
        user.telephone = None
        user.photo_profil = None
        user.compte_verifie = False
        user.email_verifie = False
        user.documents_complets = False
        user.is_active = False
        user.save(
            update_fields=[
                'first_name',
                'last_name',
                'email',
                'username',
                'telephone',
                'photo_profil',
                'compte_verifie',
                'email_verifie',
                'documents_complets',
                'is_active',
            ]
        )

        log = RGPDAnonymizationLog.objects.create(
            cible_utilisateur=user,
            anonymise_par=request.user,
            cible_utilisateur_id_original=original_user_id,
            email_original=original_email,
            motif=serializer.validated_data.get('motif') or '',
            resume=summary,
        )

        return Response(
            {
                'message': 'Utilisateur anonymise avec succes.',
                'log_id': log.id,
                'utilisateur': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'is_active': user.is_active,
                },
                'resume': summary,
            },
            status=status.HTTP_200_OK,
        )

