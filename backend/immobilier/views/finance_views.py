from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import Depense, Paiement, Utilisateur, Bien
from immobilier.models.enums import StatutPaiementEnum, StatutDemandeEnum
from immobilier.models.location import DemandeAction
from immobilier.serializers.finance_serializers import (
    AdminDepenseSerializer,
    AdminPaiementSerializer,
    DepenseCreateSerializer,
)


class AdminFinancePermissionMixin:
    def check_admin(self, request: Request):
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied('Seul un admin peut consulter les données financières.')


class AdminFinanceStatsView(AdminFinancePermissionMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        self.check_admin(request)

        # Tous les paiements
        paiements = Paiement.objects.all()
        depenses = Depense.objects.all()

        # Statuts de paiement considérés comme "payés"
        paid_statuses = [
            StatutPaiementEnum.PAYE,
            StatutPaiementEnum.PAYE_A_L_ADMIN,
            StatutPaiementEnum.REVERSE_AU_PROPRIETAIRE,
        ]

        loyers_attendus = paiements.aggregate(total=Sum('montant')).get('total') or 0
        loyers_payes = paiements.filter(statut__in=paid_statuses).aggregate(total=Sum('montant')).get('total') or 0
        en_attente = paiements.filter(statut=StatutPaiementEnum.EN_ATTENTE).aggregate(total=Sum('montant')).get('total') or 0
        impayes = paiements.filter(statut=StatutPaiementEnum.IMPAYE).aggregate(total=Sum('montant')).get('total') or 0
        total_depenses = depenses.aggregate(total=Sum('montant')).get('total') or 0

        # Calcul des commissions (5%)
        commissions = paiements.filter(
            Q(statut__in=paid_statuses)
        ).aggregate(total=Sum('commission_plateforme')).get('total') or 0

        taux_recouvrement = round((float(loyers_payes) / float(loyers_attendus)) * 100, 2) if loyers_attendus else 0

        print(f"[Finances Stats] Paiements total: {paiements.count()}")
        print(f"[Finances Stats] Loyers attendus: {loyers_attendus}")
        print(f"[Finances Stats] Loyers payés: {loyers_payes}")
        print(f"[Finances Stats] Commissions: {commissions}")

        return Response(
            {
                'loyers_attendus': loyers_attendus,
                'loyers_payes': loyers_payes,
                'en_attente': en_attente,
                'impayes': impayes,
                'total_depenses': total_depenses,
                'taux_recouvrement': taux_recouvrement,
                'nombre_paiements': paiements.count(),
                'nombre_depenses': depenses.count(),
                'commissions_plateforme': commissions,
            },
            status=status.HTTP_200_OK,
        )


class AdminPaiementListView(AdminFinancePermissionMixin, generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AdminPaiementSerializer

    def get_queryset(self):
        self.check_admin(self.request)

        queryset = (
            Paiement.objects
            .select_related('bail__bien', 'bail__client_info__utilisateur')
            .all()
            .order_by('-date_echeance', '-id')
        )

        statut = self.request.query_params.get('statut')
        bien_id = self.request.query_params.get('bien_id')
        q = self.request.query_params.get('q')

        if statut:
            queryset = queryset.filter(statut=statut)
        if bien_id:
            queryset = queryset.filter(bail__bien_id=bien_id)
        if q:
            queryset = queryset.filter(
                Q(reference__icontains=q)
                | Q(bail__bien__reference__icontains=q)
                | Q(bail__client_info__utilisateur__first_name__icontains=q)
                | Q(bail__client_info__utilisateur__last_name__icontains=q)
                | Q(bail__client_info__utilisateur__email__icontains=q)
            )

        return queryset


class AdminPaiementDetailView(AdminFinancePermissionMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        self.check_admin(request)
        paiement = get_object_or_404(
            Paiement.objects.select_related('bail__bien', 'bail__client_info__utilisateur'),
            pk=pk,
        )
        serializer = AdminPaiementSerializer(paiement)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminDepenseListView(AdminFinancePermissionMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DepenseCreateSerializer

    def get_queryset(self):
        self.check_admin(self.request)

        queryset = (
            Depense.objects
            .select_related('bien', 'proprietaire_info__utilisateur')
            .all()
            .order_by('-date_depense', '-id')
        )

        categorie = self.request.query_params.get('categorie')
        bien_id = self.request.query_params.get('bien_id')
        q = self.request.query_params.get('q')

        if categorie:
            queryset = queryset.filter(categorie__icontains=categorie)
        if bien_id:
            queryset = queryset.filter(bien_id=bien_id)
        if q:
            queryset = queryset.filter(
                Q(libelle__icontains=q)
                | Q(bien__reference__icontains=q)
                | Q(numero_facture__icontains=q)
                | Q(proprietaire_info__utilisateur__first_name__icontains=q)
                | Q(proprietaire_info__utilisateur__last_name__icontains=q)
                | Q(proprietaire_info__utilisateur__email__icontains=q)
            )

        return queryset

    def perform_create(self, serializer):
        self.check_admin(self.request)
        serializer.save()


class AdminDepenseDetailView(AdminFinancePermissionMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        self.check_admin(request)
        depense = get_object_or_404(
            Depense.objects.select_related('bien', 'proprietaire_info__utilisateur'),
            pk=pk,
        )
        serializer = AdminDepenseSerializer(depense)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminFinanceProfileView(AdminFinancePermissionMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, user_id: int) -> Response:
        self.check_admin(request)

        user = get_object_or_404(Utilisateur, pk=user_id)

        paiements_locataire = (
            Paiement.objects
            .select_related('bail__bien', 'bail__client_info__utilisateur')
            .filter(bail__client_info__utilisateur_id=user.id)
            .order_by('-date_echeance', '-id')
        )

        paiements_proprietaire = (
            Paiement.objects
            .select_related('bail__bien', 'bail__client_info__utilisateur')
            .filter(bail__bien__proprietaire_info__utilisateur_id=user.id)
            .order_by('-date_echeance', '-id')
        )

        depenses_proprietaire = (
            Depense.objects
            .select_related('bien', 'proprietaire_info__utilisateur')
            .filter(
                Q(proprietaire_info__utilisateur_id=user.id)
                | Q(bien__proprietaire_info__utilisateur_id=user.id)
            )
            .order_by('-date_depense', '-id')
        )

        paiements_payload = AdminPaiementSerializer(paiements_locataire[:30], many=True).data
        depenses_payload = AdminDepenseSerializer(depenses_proprietaire[:30], many=True).data

        total_paye = paiements_locataire.filter(statut=StatutPaiementEnum.PAYE).aggregate(total=Sum('montant')).get('total') or 0
        total_du = paiements_locataire.exclude(statut=StatutPaiementEnum.PAYE).aggregate(total=Sum('montant')).get('total') or 0
        locataire_total_impaye = paiements_locataire.filter(statut=StatutPaiementEnum.IMPAYE).aggregate(total=Sum('montant')).get('total') or 0

        proprietaire_total_percu = paiements_proprietaire.filter(statut=StatutPaiementEnum.PAYE).aggregate(total=Sum('montant')).get('total') or 0
        proprietaire_total_impaye = paiements_proprietaire.exclude(statut=StatutPaiementEnum.PAYE).aggregate(total=Sum('montant')).get('total') or 0
        total_depenses = depenses_proprietaire.aggregate(total=Sum('montant')).get('total') or 0

        return Response(
            {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': (f"{user.first_name or ''} {user.last_name or ''}").strip() or user.email,
                },
                'totals': {
                    'locataire_total_paye': total_paye,
                    'locataire_total_du': total_du,
                    'locataire_loyers_a_payer': total_du,
                    'locataire_loyers_impayes': locataire_total_impaye,
                    'proprietaire_loyers_percus': proprietaire_total_percu,
                    'proprietaire_loyers_impayes': proprietaire_total_impaye,
                    'proprietaire_total_depenses': total_depenses,
                },
                'paiements_locataire': paiements_payload,
                'depenses_proprietaire': depenses_payload,
            },
            status=status.HTTP_200_OK,
        )


class CurrentUserFinanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = request.user

        outgoing_qs = (
            DemandeAction.objects
            .select_related('bien')
            .filter(demandeur_id=user.id)
            .exclude(statut__in=[StatutDemandeEnum.REFUSEE, StatutDemandeEnum.ANNULEE])
            .order_by('-date_creation', '-id')
        )

        incoming_qs = (
            DemandeAction.objects
            .select_related('bien')
            .filter(proprietaire_id=user.id)
            .exclude(statut__in=[StatutDemandeEnum.REFUSEE, StatutDemandeEnum.ANNULEE])
            .order_by('-date_creation', '-id')
        )

        total_depenses = outgoing_qs.aggregate(total=Sum('montant_total')).get('total') or 0
        total_revenus = incoming_qs.filter(statut=StatutDemandeEnum.ACCEPTEE).aggregate(total=Sum('montant_total')).get('total') or 0

        history = []
        for item in outgoing_qs[:50]:
            history.append(
                {
                    'kind': 'DEPENSE',
                    'demande_id': item.id,
                    'bien_id': item.bien_id,
                    'bien_reference': getattr(item.bien, 'reference', None),
                    'type_demande': item.type_demande,
                    'statut': item.statut,
                    'montant': item.montant_total,
                    'date_debut': item.date_debut,
                    'date_fin': item.date_fin,
                    'date_creation': item.date_creation,
                }
            )

        for item in incoming_qs[:50]:
            history.append(
                {
                    'kind': 'REVENU',
                    'demande_id': item.id,
                    'bien_id': item.bien_id,
                    'bien_reference': getattr(item.bien, 'reference', None),
                    'type_demande': item.type_demande,
                    'statut': item.statut,
                    'montant': item.montant_total,
                    'date_debut': item.date_debut,
                    'date_fin': item.date_fin,
                    'date_creation': item.date_creation,
                }
            )

        history.sort(key=lambda entry: entry.get('date_creation') or '', reverse=True)

        return Response(
            {
                'summary': {
                    'depenses_total': total_depenses,
                    'revenus_total': total_revenus,
                    'nombre_depenses': outgoing_qs.count(),
                    'nombre_revenus': incoming_qs.filter(statut=StatutDemandeEnum.ACCEPTEE).count(),
                },
                'history': history[:100],
            },
            status=status.HTTP_200_OK,
        )
