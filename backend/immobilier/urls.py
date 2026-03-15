"""
URLs de l'application immobilier.

Préfixe global : /api/  (défini dans core/urls.py)
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from immobilier.views import RegisterView, VerifyEmailView, ResendVerificationView

app_name = 'immobilier'

urlpatterns = [
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
]
