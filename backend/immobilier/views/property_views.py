from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal

from immobilier.models import Bien, ProprietaireInfo, Depense, Bail, Paiement, DemandeAction
from immobilier.models.enums import StatutBienEnum, StatutBailEnum, StatutPaiementEnum
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
    queryset = Bien.objects.select_related(
        'categorie',
        'sous_type',
        'proprietaire_info'
    ).prefetch_related('photos').all()
    serializer_class = BienSerializer
    permission_classes = [IsAuthenticated, IsBienOwnerOrAdminForWrite]

    def get(self, request, *args, **kwargs):
        """Retourne les détails du bien avec informations d'occupation"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Ajouter les informations d'occupation
        from immobilier.models import Bail, DemandeAction
        from immobilier.models.enums import StatutBailEnum, StatutDemandeEnum, TypeDemandeEnum
        from django.utils import timezone
        
        print(f"[BienDetailView] Checking occupation for Bien {instance.id}...")
        
        # Locataire actuel (bail en cours OU en attente de signature)
        bail_en_cours = Bail.objects.filter(
            bien=instance,
            statut__in=[StatutBailEnum.EN_COURS, StatutBailEnum.EN_ATTENTE_SIGNATURE]
        ).select_related('client_info__utilisateur', 'demande__demandeur').first()
        
        print(f"[BienDetailView] Bail trouvé: {bail_en_cours is not None}")
        if bail_en_cours:
            print(f"[BienDetailView] Bail statut: {bail_en_cours.statut}, client_info: {bail_en_cours.client_info}")
            if bail_en_cours.client_info:
                print(f"[BienDetailView] Client user: {bail_en_cours.client_info.utilisateur}")
        
        if bail_en_cours and bail_en_cours.client_info:
            data['locataire_actuel'] = {
                'nom': f"{bail_en_cours.client_info.utilisateur.first_name or ''} {bail_en_cours.client_info.utilisateur.last_name or ''}".strip() or 'Nom non renseigné',
                'email': bail_en_cours.client_info.utilisateur.email or 'Email non renseigné',
                'telephone': bail_en_cours.client_info.utilisateur.telephone or '',
                'date_entree': bail_en_cours.date_entree.isoformat() if bail_en_cours.date_entree else None,
                'date_sortie': bail_en_cours.date_sortie.isoformat() if bail_en_cours.date_sortie else None,
                'loyer': str(bail_en_cours.loyer_actuel or 0),
                'statut_bail': bail_en_cours.statut,
            }
            print(f"[BienDetailView] Locataire actuel: {data['locataire_actuel']['nom']}")
        elif bail_en_cours and bail_en_cours.demande:
            # Fallback: utiliser les infos de la demande si client_info est None
            demandeur = bail_en_cours.demande.demandeur
            data['locataire_actuel'] = {
                'nom': f"{demandeur.first_name or ''} {demandeur.last_name or ''}".strip() or 'Nom non renseigné',
                'email': demandeur.email or 'Email non renseigné',
                'telephone': demandeur.telephone or '',
                'date_entree': bail_en_cours.date_entree.isoformat() if bail_en_cours.date_entree else None,
                'date_sortie': bail_en_cours.date_sortie.isoformat() if bail_en_cours.date_sortie else None,
                'loyer': str(bail_en_cours.loyer_actuel or 0),
                'statut_bail': bail_en_cours.statut,
            }
            print(f"[BienDetailView] Locataire actuel (depuis demande): {data['locataire_actuel']['nom']}")
        else:
            data['locataire_actuel'] = None
            print(f"[BienDetailView] Aucun locataire trouvé")
        
        # Nombre de demandes en attente
        demandes_en_attente = DemandeAction.objects.filter(
            bien=instance,
            statut=StatutDemandeEnum.EN_ATTENTE
        ).count()
        
        data['demandes_en_attente'] = demandes_en_attente
        
        # Visites à venir
        visites_a_venir = DemandeAction.objects.filter(
            bien=instance,
            type_demande=TypeDemandeEnum.VISITE,
            statut=StatutDemandeEnum.ACCEPTEE,
            date_visite__gte=timezone.now()
        ).count()
        
        data['visites_a_venir'] = visites_a_venir
        
        # Privatisations actives
        privatisations_actives = DemandeAction.objects.filter(
            bien=instance,
            type_demande=TypeDemandeEnum.PRIVATISATION,
            statut=StatutDemandeEnum.ACCEPTEE,
            date_fin__gte=timezone.now().date()
        ).count()
        
        data['privatisations_actives'] = privatisations_actives
        
        locataire_statut = None
        if data.get('locataire_actuel'):
            locataire_statut = data['locataire_actuel'].get('statut_bail') if isinstance(data['locataire_actuel'], dict) else None
        
        print(f"[BienDetailView] Bien {instance.id}: locataire={data['locataire_actuel'] is not None}, statut_bail={locataire_statut}, demandes={data['demandes_en_attente']}")
        print(f"[BienDetailView] Response data keys: {data.keys()}")
        
        return Response(data)


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
            try:
                EmailService.envoyer_validation_bien(
                    proprietaire=owner,
                    bien=bien,
                    valide=False,
                    motif_refus=motif_refus,
                    url_mon_espace='/',
                )
            except Exception as e:
                pass

        bien_id = bien.id
        bien.delete()

        return Response(
            {
                'id': bien_id,
                'refuse': True,
                'motif_refus': motif_refus,
            },
            status=status.HTTP_200_OK,
        )


class BienDepenseCreateView(APIView):
    """
    Permet d'ajouter une dépense liée à un bien (admin ou propriétaire).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        bien = get_object_or_404(Bien.objects.select_related('proprietaire_info__utilisateur'), pk=pk)
        
        # Vérifier les permissions
        if not (request.user.is_staff or request.user.is_superuser):
            owner_id = getattr(getattr(bien, 'proprietaire_info', None), 'utilisateur_id', None)
            if request.user.id != owner_id:
                raise PermissionDenied("Seul le propriétaire ou un admin peut ajouter des dépenses à ce bien.")
        
        # Valider les données
        montant = request.data.get('montant')
        categorie = request.data.get('categorie', 'Autre')
        description = request.data.get('description', '')
        date_depense = request.data.get('date_depense', timezone.now().date().isoformat())
        
        if not montant:
            raise ValidationError({'montant': 'Le montant est obligatoire.'})
        
        try:
            montant_decimal = Decimal(str(montant))
            if montant_decimal <= 0:
                raise ValidationError({'montant': 'Le montant doit être positif.'})
        except:
            raise ValidationError({'montant': 'Montant invalide.'})
        
        # Créer la dépense
        depense = Depense.objects.create(
            montant=montant_decimal,
            categorie=categorie,
            description=description,
            date_depense=date_depense,
            bien=bien,
            ajoute_par=request.user
        )
        
        return Response({
            'message': 'Dépense ajoutée avec succès.',
            'depense': {
                'id': depense.id,
                'montant': str(depense.montant),
                'categorie': depense.categorie,
                'description': depense.description,
                'date_depense': depense.date_depense.isoformat() if depense.date_depense else None,
            }
        }, status=status.HTTP_201_CREATED)


class BienDetailFinancierView(APIView):
    """
    Retourne les informations financières complètes d'un bien (pour propriétaire et admin).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        bien = get_object_or_404(
            Bien.objects.select_related('proprietaire_info__utilisateur').prefetch_related('photos'),
            pk=pk
        )
        
        # Vérifier les permissions
        if not (request.user.is_staff or request.user.is_superuser):
            owner_id = getattr(getattr(bien, 'proprietaire_info', None), 'utilisateur_id', None)
            if request.user.id != owner_id:
                raise PermissionDenied("Vous n'avez pas accès aux informations financières de ce bien.")
        
        # Bail actif
        bail_actif = Bail.objects.filter(
            bien=bien,
            statut__in=[StatutBailEnum.EN_COURS, StatutBailEnum.EN_ATTENTE_SIGNATURE]
        ).select_related('client_info__utilisateur').first()
        
        bail_data = None
        if bail_actif:
            bail_data = {
                'id': bail_actif.id,
                'numero_bail': bail_actif.numero_bail,
                'statut': bail_actif.statut,
                'date_entree': bail_actif.date_entree.isoformat() if bail_actif.date_entree else None,
                'date_sortie': bail_actif.date_sortie.isoformat() if bail_actif.date_sortie else None,
                'loyer_actuel': str(bail_actif.loyer_actuel or 0),
                'depot_garantie': str(bail_actif.depot_garantie or 0),
                'locataire': {
                    'nom': f"{bail_actif.client_info.utilisateur.first_name or ''} {bail_actif.client_info.utilisateur.last_name or ''}".strip() if bail_actif.client_info else 'N/A',
                    'email': bail_actif.client_info.utilisateur.email if bail_actif.client_info else 'N/A',
                    'telephone': bail_actif.client_info.utilisateur.telephone if bail_actif.client_info else '',
                }
            }
        
        # Historique des paiements liés à ce bien
        paiements = Paiement.objects.filter(
            bail__bien=bien
        ).order_by('-date_paiement')[:10]
        
        paiements_data = [
            {
                'id': p.id,
                'reference': p.reference,
                'montant': str(p.montant or 0),
                'statut': p.statut,
                'date_paiement': p.date_paiement.isoformat() if p.date_paiement else None,
                'mode_paiement': p.mode_paiement or '',
            }
            for p in paiements
        ]
        
        # Total des paiements encaissés
        total_encaisse = Paiement.objects.filter(
            bail__bien=bien,
            statut__in=[StatutPaiementEnum.PAYE, StatutPaiementEnum.PAYE_A_L_ADMIN, StatutPaiementEnum.REVERSE_AU_PROPRIETAIRE]
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        # Dépenses liées au bien
        depenses = Depense.objects.filter(bien=bien).order_by('-date_depense')[:10]
        
        depenses_data = [
            {
                'id': d.id,
                'montant': str(d.montant or 0),
                'categorie': d.categorie,
                'description': d.description or '',
                'date_depense': d.date_depense.isoformat() if d.date_depense else None,
            }
            for d in depenses
        ]
        
        # Total des dépenses
        total_depenses = Depense.objects.filter(bien=bien).aggregate(total=Sum('montant'))['total'] or 0
        
        # Revenu net
        revenu_net = Decimal(str(total_encaisse)) - Decimal(str(total_depenses))
        
        return Response({
            'bien': {
                'id': bien.id,
                'reference': bien.reference,
                'ville': bien.ville,
                'adresse': bien.adresse,
            },
            'bail_actif': bail_data,
            'paiements_recents': paiements_data,
            'total_encaisse': str(total_encaisse),
            'depenses_recentes': depenses_data,
            'total_depenses': str(total_depenses),
            'revenu_net': str(revenu_net),
        }, status=status.HTTP_200_OK)
