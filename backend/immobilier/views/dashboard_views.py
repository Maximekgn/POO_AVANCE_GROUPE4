from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
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

        # 1. General Stats
        total_biens = Bien.objects.count()
        total_users = Utilisateur.objects.count()
        total_baux = Bail.objects.count()
        pending_demands = DemandeAction.objects.filter(statut='EN_ATTENTE').count()

        # 2. Status Distribution (Biens)
        status_distribution = Bien.objects.values('statut').annotate(count=Count('id'))
        
        # 3. Category Distribution (Biens)
        category_distribution = Bien.objects.values('categorie__nom').annotate(count=Count('id'))

        # 4. Monthly Revenue (Last 12 months)
        one_year_ago = timezone.now() - timedelta(days=365)
        revenue_over_time = (
            Paiement.objects.filter(
                statut=StatutPaiementEnum.PAYE,
                date_paiement__gte=one_year_ago
            )
            .annotate(month=TruncMonth('date_paiement'))
            .values('month')
            .annotate(total=Sum('montant'))
            .order_by('month')
        )

        # 5. Recent Activity (Latest 5 Bails)
        recent_bails = Bail.objects.select_related('bien', 'client_info__utilisateur').order_by('-id')[:5]
        recent_bails_data = [
            {
                'id': b.id,
                'numero': b.numero_bail,
                'bien': b.bien.reference,
                'client': f"{b.client_info.utilisateur.first_name} {b.client_info.utilisateur.last_name}" if b.client_info else "N/A",
                'date': b.date_entree,
                'statut': b.statut
            } for b in recent_bails
        ]

        return Response({
            'kpis': {
                'total_biens': total_biens,
                'total_users': total_users,
                'total_baux': total_baux,
                'pending_demands': pending_demands,
                'total_revenue': Paiement.objects.filter(statut=StatutPaiementEnum.PAYE).aggregate(total=Sum('montant'))['total'] or 0,
            },
            'status_stats': {s['statut']: s['count'] for s in status_distribution},
            'category_stats': [{'name': c['categorie__nom'] or 'Inconnu', 'value': c['count']} for c in category_distribution],
            'revenue_history': [
                {
                    'month': r['month'].strftime('%b %Y'),
                    'amount': float(r['total'])
                } for r in revenue_over_time
            ],
            'recent_activity': recent_bails_data
        }, status=status.HTTP_200_OK)
