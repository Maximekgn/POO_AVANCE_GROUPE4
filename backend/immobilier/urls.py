"""
URLs de l'application immobilier.

Préfixe global : /api/  (défini dans core/urls.py)
"""

from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView

from immobilier.views import (
    RegisterView,
    LoginView,
    UploadDocumentsView,
    VerifyEmailView,
    ResendVerificationView,
    CategorieBienListCreateView,
    CategorieBienDetailView,
    SousTypeBienListCreateView,
    SousTypeBienDetailView,
    BienListCreateView,
    PublicBienListView,
    PublicBienDetailView,
    BienDetailView,
    BienStatutUpdateView,
    BienActivationUpdateView,
    BienRefusView,
    BienPhotoListCreateView,
    BienPhotoReorderView,
    PhotoDetailView,
    ConversationListView,
    ConversationMessagesView,
    MarkConversationReadView,
    ChatContactsView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserBiensView,
    AdminUserRentedBiensView,
    AdminVerifyUserView,
    AdminUserAnonymizeView,
    CurrentUserProfileView,
    GarantListCreateView,
    GarantDetailView,
    LocataireListView,
    LocataireDetailView,
    LocataireHistoryView,
    LocataireOnboardingView,
    AdminFinanceStatsView,
    AdminPaiementListView,
    AdminPaiementDetailView,
    AdminDepenseListView,
    AdminDepenseDetailView,
    AdminFinanceProfileView,
    CurrentUserFinanceView,
    DemandeActionListCreateView,
    DemandeActionIncomingListView,
    DemandeActionDetailView,
    DemandeActionDecisionView,
    BailListView,
    BailDetailView,
    BailSignView,
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
                'upload_documents': '/api/auth/upload-documents',
                'login': '/api/auth/login',
                'refresh_token': '/api/auth/token/refresh',
                'categories': '/api/categories',
                'category_detail': '/api/categories/{id}',
                'sous_types': '/api/sous-types',
                'sous_type_detail': '/api/sous-types/{id}',
                'biens': '/api/biens',
                'public_biens': '/api/public/biens',
                'public_bien_detail': '/api/public/biens/{id}',
                'bien_detail': '/api/biens/{id}',
                'bien_statut_update': '/api/biens/{id}/statut',
                'bien_activation_update': '/api/biens/{id}/activation',
                'bien_refus_update': '/api/biens/{id}/refus',
                'bien_photos': '/api/biens/{id}/photos',
                'bien_photos_reorder': '/api/biens/{id}/photos/reorder',
                'photo_detail': '/api/photos/{id}',
                'chat_conversations': '/api/chat/conversations',
                'chat_messages': '/api/chat/conversations/{conversation_id}/messages',
                'chat_mark_read': '/api/chat/conversations/{conversation_id}/read',
                'chat_contacts': '/api/chat/contacts',
                'admin_users': '/api/admin/users',
                'admin_user_detail': '/api/admin/users/{id}',
                'admin_user_biens': '/api/admin/users/{id}/biens',
                'admin_user_biens_loues': '/api/admin/users/{id}/biens-loues',
                'admin_user_anonymize': '/api/admin/users/{id}/anonymize',
                'garants': '/api/garants',
                'garant_detail': '/api/garants/{id}',
                'locataires': '/api/locataires',
                'locataire_onboarding': '/api/locataires/onboarding',
                'locataire_detail': '/api/locataires/{id}',
                'locataire_historique': '/api/locataires/{id}/historique',
                'admin_finance_stats': '/api/admin/finances/stats',
                'admin_finance_payments': '/api/admin/finances/paiements',
                'admin_finance_payment_detail': '/api/admin/finances/paiements/{id}',
                'admin_finance_expenses': '/api/admin/finances/depenses',
                'admin_finance_expense_detail': '/api/admin/finances/depenses/{id}',
                'admin_finance_profile': '/api/admin/finances/profils/{user_id}',
                'demandes_actions': '/api/demandes-actions',
                'demandes_actions_recues': '/api/demandes-actions/recues',
                'demandes_actions_detail': '/api/demandes-actions/{id}',
                'demandes_actions_decision': '/api/demandes-actions/{id}/decision',
                'baux': '/api/baux',
                'baux_detail': '/api/baux/{id}',
                'baux_signer': '/api/baux/{id}/signer',
                'profile_me': '/api/profile/me',
                'chat_socket': '/ws/chat/?token={access_token}',
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
    #   Body: { nom, prenom, email, motDePasse, telephone? }
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

    # POST /api/auth/upload-documents
    #   Auth: Bearer JWT
    #   Body (multipart/form-data): { numero_piece, profession?, revenus_mensuels?, piece_identite }
    #   → Enregistre les documents de profil utilisateur
    #   → HTTP 200 | 400 | 401
    path('auth/upload-documents', UploadDocumentsView.as_view(), name='auth-upload-documents'),

    # POST /api/auth/login
    #   Body: { username (=email), password }
    #   → Retourne access + refresh JWT
    #   → HTTP 200 | 401
    path('auth/login', LoginView.as_view(), name='auth-login'),

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
    # GET /api/public/biens
    path('public/biens', PublicBienListView.as_view(), name='public-biens-list'),
    # GET /api/public/biens/{id}
    path('public/biens/<int:pk>', PublicBienDetailView.as_view(), name='public-biens-detail'),

    # GET/POST /api/biens
    path('biens', BienListCreateView.as_view(), name='biens-list-create'),
    # GET/PATCH/DELETE /api/biens/{id}
    path('biens/<int:pk>', BienDetailView.as_view(), name='biens-detail'),
    # PATCH /api/biens/{id}/statut
    path('biens/<int:pk>/statut', BienStatutUpdateView.as_view(), name='biens-statut-update'),
    # PATCH /api/biens/{id}/activation
    path('biens/<int:pk>/activation', BienActivationUpdateView.as_view(), name='biens-activation-update'),
    # PATCH /api/biens/{id}/refus
    path('biens/<int:pk>/refus', BienRefusView.as_view(), name='biens-refus-update'),

    # ── Photos de biens (Sprint 3) ───────────────────────────────────────────
    # GET/POST /api/biens/{id}/photos
    path('biens/<int:bien_id>/photos', BienPhotoListCreateView.as_view(), name='bien-photos-list-create'),
    # PATCH /api/biens/{id}/photos/reorder
    path('biens/<int:bien_id>/photos/reorder', BienPhotoReorderView.as_view(), name='bien-photos-reorder'),
    # GET/PATCH/DELETE /api/photos/{id}
    path('photos/<int:pk>', PhotoDetailView.as_view(), name='photos-detail'),

    # ── Messagerie temps réel (WebSocket + REST) ────────────────────────────
    path('chat/conversations', ConversationListView.as_view(), name='chat-conversations'),
    path('chat/conversations/<str:conversation_id>/messages', ConversationMessagesView.as_view(), name='chat-conversation-messages'),
    path('chat/conversations/<str:conversation_id>/read', MarkConversationReadView.as_view(), name='chat-conversation-read'),
    path('chat/contacts', ChatContactsView.as_view(), name='chat-contacts'),

    # ── Garants (Sprint 4 backend) ─────────────────────────────────────────
    path('garants', GarantListCreateView.as_view(), name='garants-list-create'),
    path('garants/<int:pk>', GarantDetailView.as_view(), name='garants-detail'),

    # ── Locataires (Sprint 4 backend) ──────────────────────────────────────
    path('locataires', LocataireListView.as_view(), name='locataires-list'),
    path('locataires/onboarding', LocataireOnboardingView.as_view(), name='locataires-onboarding'),
    path('locataires/<int:pk>', LocataireDetailView.as_view(), name='locataires-detail'),
    path('locataires/<int:pk>/historique', LocataireHistoryView.as_view(), name='locataires-historique'),

    path('profile/me', CurrentUserProfileView.as_view(), name='profile-me'),
    path('admin/users', AdminUserListView.as_view(), name='admin-users-list'),
    path('admin/users/<int:pk>', AdminUserDetailView.as_view(), name='admin-users-detail'),
    path('admin/users/<int:pk>/biens', AdminUserBiensView.as_view(), name='admin-users-biens'),
    path('admin/users/<int:pk>/biens-loues', AdminUserRentedBiensView.as_view(), name='admin-users-biens-loues'),
    path('admin/users/<int:pk>/verify', AdminVerifyUserView.as_view(), name='admin-users-verify'),
    path('admin/users/<int:pk>/anonymize', AdminUserAnonymizeView.as_view(), name='admin-users-anonymize'),
    path('admin/finances/stats', AdminFinanceStatsView.as_view(), name='admin-finances-stats'),
    path('admin/finances/paiements', AdminPaiementListView.as_view(), name='admin-finances-paiements-list'),
    path('admin/finances/paiements/<int:pk>', AdminPaiementDetailView.as_view(), name='admin-finances-paiements-detail'),
    path('admin/finances/depenses', AdminDepenseListView.as_view(), name='admin-finances-depenses-list'),
    path('admin/finances/depenses/<int:pk>', AdminDepenseDetailView.as_view(), name='admin-finances-depenses-detail'),
    path('admin/finances/profils/<int:user_id>', AdminFinanceProfileView.as_view(), name='admin-finances-profile'),
    path('profile/finances', CurrentUserFinanceView.as_view(), name='profile-finances'),
    path('demandes-actions', DemandeActionListCreateView.as_view(), name='demandes-actions-list-create'),
    path('demandes-actions/recues', DemandeActionIncomingListView.as_view(), name='demandes-actions-incoming-list'),
    path('demandes-actions/<int:pk>', DemandeActionDetailView.as_view(), name='demandes-actions-detail'),
    path('demandes-actions/<int:pk>/decision', DemandeActionDecisionView.as_view(), name='demandes-actions-decision'),

    # ── Baux & signatures (Sprint 7 backend) ───────────────────────────────
    path('baux', BailListView.as_view(), name='baux-list'),
    path('baux/<int:pk>', BailDetailView.as_view(), name='baux-detail'),
    path('baux/<int:pk>/signer', BailSignView.as_view(), name='baux-signer'),
]
