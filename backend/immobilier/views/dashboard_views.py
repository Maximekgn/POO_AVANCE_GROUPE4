from django.db.models import Count, Sum, Q, DecimalField
from django.db.models.functions import TruncMonth, TruncDay, TruncYear, Coalesce
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import (
    Bien,
    Utilisateur,
    Bail,
    Paiement,
    CategorieBien,
    DemandeAction
)
from immobilier.models.enums import StatutPaiementEnum, StatutBienEnum
from immobilier.views.finance_views import AdminFinancePermissionMixin

class AdminDashboardStatsView(AdminFinancePermissionMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        self.check_admin(request)
        # Statuts de paiement considérés comme "payés"
        paid_statuses = [
            StatutPaiementEnum.PAYE,
            StatutPaiementEnum.PAYE_A_L_ADMIN,
            StatutPaiementEnum.REVERSE_AU_PROPRIETAIRE,
        ]

        # 1. General Stats
        total_biens = Bien.objects.count()
        total_users = Utilisateur.objects.count()
        total_baux = Bail.objects.count()
        pending_demands = DemandeAction.objects.filter(statut='EN_ATTENTE').count()

        # 2. Status Distribution (Biens)
        status_distribution = Bien.objects.values('statut').annotate(count=Count('id'))

        # 3. Category Distribution (Biens)
        category_distribution = Bien.objects.values('categorie__nom').annotate(count=Count('id'))

        # 4. Revenue Aggregation (Daily, Monthly, Yearly)
        now = timezone.now()
        one_year_ago = now - timedelta(days=365)
        thirty_days_ago = now - timedelta(days=30)
        ten_years_ago = now - timedelta(days=365*10)

        # Revenus journaliers (30 derniers jours)
        daily_revenue = (
            Paiement.objects.filter(
                statut__in=paid_statuses,
                date_paiement__gte=thirty_days_ago,
                date_paiement__isnull=False
            )
            .annotate(day=TruncDay('date_paiement'))
            .values('day')
            .annotate(total=Coalesce(Sum('montant'), 0, output_field=DecimalField()))
            .order_by('day')
        )

        # Revenus mensuels (12 derniers mois)
        monthly_revenue = (
            Paiement.objects.filter(
                statut__in=paid_statuses,
                date_paiement__gte=one_year_ago,
                date_paiement__isnull=False
            )
            .annotate(month=TruncMonth('date_paiement'))
            .values('month')
            .annotate(total=Coalesce(Sum('montant'), 0, output_field=DecimalField()))
            .order_by('month')
        )

        # Revenus annuels (10 dernières années)
        yearly_revenue = (
            Paiement.objects.filter(
                statut__in=paid_statuses,
                date_paiement__gte=ten_years_ago,
                date_paiement__isnull=False
            )
            .annotate(year=TruncYear('date_paiement'))
            .values('year')
            .annotate(total=Coalesce(Sum('montant'), 0, output_field=DecimalField()))
            .order_by('year')
        )

        # 5. Recent Activity (Latest 5 Bails)
        recent_bails = Bail.objects.select_related('bien', 'client_info__utilisateur').order_by('-id')[:5]
        recent_bails_data = [
            {
                'id': b.id,
                'numero': b.numero_bail,
                'bien': b.bien.reference,
                'client': f"{b.client_info.utilisateur.first_name} {b.client_info.utilisateur.last_name}" if b.client_info else "N/A",
                'date': b.date_entree.isoformat() if b.date_entree else None,
                'statut': b.statut
            } for b in recent_bails
        ]

        # Calcul du revenu total
        total_revenue_result = Paiement.objects.filter(
            statut__in=paid_statuses
        ).aggregate(total=Coalesce(Sum('montant'), 0, output_field=DecimalField()))
        total_revenue = float(total_revenue_result['total'] or 0)

        print(f"[Dashboard] Daily revenue count: {daily_revenue.count()}")
        print(f"[Dashboard] Monthly revenue count: {monthly_revenue.count()}")
        print(f"[Dashboard] Total revenue: {total_revenue}")

        return Response({
            'kpis': {
                'total_biens': total_biens,
                'total_users': total_users,
                'total_baux': total_baux,
                'pending_demands': pending_demands,
                'total_revenue': total_revenue,
            },
            'status_stats': {s['statut']: s['count'] for s in status_distribution},
            'category_stats': [{'name': c['categorie__nom'] or 'Inconnu', 'value': c['count']} for c in category_distribution],
            'revenue_history': {
                'daily': [
                    {
                        'label': r['day'].strftime('%d %b'),
                        'amount': float(r['total'])
                    } for r in daily_revenue
                ],
                'monthly': [
                    {
                        'label': r['month'].strftime('%b %Y'),
                        'amount': float(r['total'])
                    } for r in monthly_revenue
                ],
                'yearly': [
                    {
                        'label': r['year'].strftime('%Y'),
                        'amount': float(r['total'])
                    } for r in yearly_revenue
                ],
            },
            'recent_activity': recent_bails_data
        }, status=status.HTTP_200_OK)
