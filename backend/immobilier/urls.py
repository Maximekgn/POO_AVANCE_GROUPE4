"""
URLs de l'application immobilier.

Préfixe global : /api/  (défini dans core/urls.py)
"""

from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from immobilier.views import (
    RegisterView,
    VerifyEmailView,
    ResendVerificationView,
    CategorieBienListCreateView,
    CategorieBienDetailView,
    SousTypeBienListCreateView,
    SousTypeBienDetailView,
    BienListCreateView,
    BienDetailView,
    BienStatutUpdateView,
    BienPhotoListCreateView,
    BienPhotoReorderView,
    PhotoDetailView,
)

app_name = 'immobilier'


def api_root(_request):
    return JsonResponse(
        {
            'message': 'Bienvenue sur l\'API ImmobilierPro',
            'endpoints': {
                'register': '/api/auth/register',
                'verify_email': '/api/auth/verify-email',
                'resend_verification': '/api/auth/resend-verification',
                'login': '/api/auth/login',
                'refresh_token': '/api/auth/token/refresh',
                'categories': '/api/categories',
                'category_detail': '/api/categories/{id}',
                'sous_types': '/api/sous-types',
                'sous_type_detail': '/api/sous-types/{id}',
                'biens': '/api/biens',
                'bien_detail': '/api/biens/{id}',
                'bien_statut_update': '/api/biens/{id}/statut',
                'bien_photos': '/api/biens/{id}/photos',
                'bien_photos_reorder': '/api/biens/{id}/photos/reorder',
                'photo_detail': '/api/photos/{id}',
            },
        }
    )

urlpatterns = [
    # GET /api/
    #   → Point d'entrée informatif de l'API
    path('', api_root, name='api-root'),

    # ── Authentification ──────────────────────────────────────────────────────
    #
    
    # POST /api/auth/register
    #   Body: { nom, prenom, email, motDePasse, telephone?, role }
    #   → Crée le compte (inactif) + envoie email de vérification
    #   → HTTP 201
    path('auth/register', RegisterView.as_view(), name='auth-register'),

    # POST /api/auth/verify-email
    #   Body: { token }
    #   → Active le compte si le token JWT est valide et non expiré
    #   → HTTP 200 | 400 | 404
    path('auth/verify-email', VerifyEmailView.as_view(), name='auth-verify-email'),

    # POST /api/auth/resend-verification
    #   Body: { email }
    #   → Renvoie un email d'activation (si compte inactif trouvé)
    #   → HTTP 200 | 400
    path('auth/resend-verification', ResendVerificationView.as_view(), name='auth-resend-verification'),

    # POST /api/auth/login
    #   Body: { username (=email), password }
    #   → Retourne access + refresh JWT
    #   → HTTP 200 | 401
    path('auth/login', TokenObtainPairView.as_view(), name='auth-login'),

    # POST /api/auth/token/refresh
    #   Body: { refresh }
    #   → Retourne un nouvel access token
    #   → HTTP 200 | 401
    path('auth/token/refresh', TokenRefreshView.as_view(), name='auth-token-refresh'),

    # ── Catégories de biens (Sprint 2) ───────────────────────────────────────
    # GET/POST /api/categories
    path('categories', CategorieBienListCreateView.as_view(), name='categories-list-create'),
    # GET/PATCH/DELETE /api/categories/{id}
    path('categories/<int:pk>', CategorieBienDetailView.as_view(), name='categories-detail'),

    # GET/POST /api/sous-types?categorie={id}
    path('sous-types', SousTypeBienListCreateView.as_view(), name='sous-types-list-create'),
    # GET/PATCH/DELETE /api/sous-types/{id}
    path('sous-types/<int:pk>', SousTypeBienDetailView.as_view(), name='sous-types-detail'),

    # ── Biens immobiliers (Sprint 3) ────────────────────────────────────────
    # GET/POST /api/biens
    path('biens', BienListCreateView.as_view(), name='biens-list-create'),
    # GET/PATCH/DELETE /api/biens/{id}
    path('biens/<int:pk>', BienDetailView.as_view(), name='biens-detail'),
    # PATCH /api/biens/{id}/statut
    path('biens/<int:pk>/statut', BienStatutUpdateView.as_view(), name='biens-statut-update'),

    # ── Photos de biens (Sprint 3) ───────────────────────────────────────────
    # GET/POST /api/biens/{id}/photos
    path('biens/<int:bien_id>/photos', BienPhotoListCreateView.as_view(), name='bien-photos-list-create'),
    # PATCH /api/biens/{id}/photos/reorder
    path('biens/<int:bien_id>/photos/reorder', BienPhotoReorderView.as_view(), name='bien-photos-reorder'),
    # GET/PATCH/DELETE /api/photos/{id}
    path('photos/<int:pk>', PhotoDetailView.as_view(), name='photos-detail'),
]
