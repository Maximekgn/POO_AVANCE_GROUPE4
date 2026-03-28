"""
Views REST pour le flux d'inscription (diagramme_sequence_inscription).

Endpoints exposés :
  POST  /api/auth/register              → Phase 1 : créer le compte + envoyer l'email
  POST  /api/auth/verify-email          → Phase 3 : activer le compte via le token
  POST  /api/auth/resend-verification   → Optionnel : renvoyer le lien si expiré
"""

import jwt
import logging
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from immobilier.models import Utilisateur, EmailVerificationOTP
from immobilier.serializers import (
    RegisterSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    UploadUserDocumentsSerializer,
)
from immobilier.serializers.auth_serializers import EmailTokenObtainPairSerializer
from immobilier.services.email_service import EmailService
from immobilier.utils.tokens import valider_token_verification

logger = logging.getLogger(__name__)


OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60


def _generate_otp_code(length: int = OTP_LENGTH) -> str:
    alphabet = string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _create_email_otp(user: Utilisateur) -> str:
    code = _generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Invalide les OTP precedents pour eviter plusieurs codes actifs.
    EmailVerificationOTP.objects.filter(utilisateur=user, is_used=False).update(is_used=True)

    EmailVerificationOTP.objects.create(
        utilisateur=user,
        code_hash=make_password(code),
        expires_at=expires_at,
    )
    return code


def _send_verification_otp(user: Utilisateur) -> bool:
    code = _create_email_otp(user)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    url_verification = f"{frontend_url}/verify-email"
    return EmailService.envoyer_code_verification_email(
        user,
        otp_code=code,
        validite_minutes=OTP_EXPIRY_MINUTES,
        url_verification=url_verification,
    )


class LoginView(TokenObtainPairView):
    """Connexion JWT avec email/password et métadonnées utilisateur."""

    permission_classes = [AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class UploadDocumentsView(APIView):
    """Permet à un utilisateur connecté de déposer ses documents de profil."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = UploadUserDocumentsSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            logger.error(f"[UploadDocumentsView] Serializer errors: {serializer.errors}, Data: {request.data}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        payload = serializer.save()
        return Response(
            {
                "message": "Documents enregistrés avec succès.",
                **payload,
            },
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/register
# ──────────────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """
    Crée un nouveau compte utilisateur.

    Flux (Phase 1 du diagramme d'inscription) :
    1. Validation des données (email unique, mdp ≥ 8 chars, rôle autorisé)
    2. Hashage PBKDF2 du mot de passe via Django
    3. Création du compte avec is_active=True mais email non vérifié
    4. Génération d'un code OTP de vérification (exp 10 min)
    5. Envoi de l'email de confirmation avec le code OTP
    6. Demande de dépôt des documents utilisateur
    7. Réponse HTTP 201

    Body JSON attendu :
    {
        "nom":        "Dupont",
        "prenom":     "Jean",
        "email":      "jean.dupont@mail.com",
        "motDePasse": "MonMotDePasse123!",
        "telephone":  "+336XXXXXXXX"    // optionnel
    }

    Réponses :
        201 : Compte créé, email envoyé
        400 : Données invalides (email déjà utilisé, mdp trop court, etc.)
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Création du compte (actif mais non vérifié)
        user: Utilisateur = serializer.save()
        logger.info(f"[Register] Nouveau compte créé : {user.email} (id={user.id})")

        # 2. Génération + envoi OTP email (en synchrone ici — Celery si besoin)
        email_envoye = _send_verification_otp(user)
        if not email_envoye:
            logger.warning(f"[Register] Email non envoyé pour {user.email}")

        return Response(
            {
                "message": "Compte créé avec succès. Connectez-vous puis complétez vos documents. Vérifiez aussi votre email pour finaliser la vérification.",
                "email": user.email,
                "is_active": user.is_active,
                "email_verified": user.email_verifie,
                "documents_completed": user.documents_complets,
                "next_step": {
                    "action": "upload_documents",
                    "endpoint": "/api/auth/upload-documents",
                },
                "verification_method": "otp",
                "otp_expires_in_seconds": OTP_EXPIRY_MINUTES * 60,
            },
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/verify-email
# ──────────────────────────────────────────────────────────────────────────────

class VerifyEmailView(APIView):
    """
    Marque l'email utilisateur comme vérifié via token de lien ou OTP.

    Flux (Phase 3 du diagramme d'inscription) :
    1. Valide un token JWT (retrocompatibilite) ou un OTP
    2. Récupère l'utilisateur correspondant
    3. Vérifie que l'email n'est pas déjà vérifié
    4. Met email_verifie=True en base
    5. Réponse HTTP 200

    Body JSON attendu :
    Option 1 (retrocompat): { "token": "eyJhbGciOiJIUzI1NiIs..." }
    Option 2 (OTP):         { "email": "user@mail.com", "otp_code": "123456" }

    Réponses :
        200 : Compte activé avec succès
        400 : Token invalide, expiré, ou compte déjà actif
        404 : Utilisateur introuvable
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = VerifyEmailSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token = (serializer.validated_data.get('token') or '').strip()
        user = None

        if token:
            # 1a. Validation historique via lien JWT.
            try:
                user_id = valider_token_verification(token)
            except jwt.ExpiredSignatureError:
                return Response(
                    {"error": "Le lien d'activation a expiré. Veuillez en demander un nouveau."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except jwt.InvalidTokenError as exc:
                return Response(
                    {"error": f"Lien invalide ou altéré : {str(exc)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                user = Utilisateur.objects.get(pk=user_id)
            except Utilisateur.DoesNotExist:
                return Response(
                    {"error": "Aucun utilisateur trouvé pour ce token."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            # 1b. Validation OTP par email + code.
            email = serializer.validated_data['email'].lower().strip()
            otp_code = serializer.validated_data['otp_code']
            try:
                user = Utilisateur.objects.get(email=email)
            except Utilisateur.DoesNotExist:
                return Response(
                    {"error": "Code invalide ou expiré."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            otp = (
                EmailVerificationOTP.objects
                .filter(utilisateur=user, is_used=False)
                .order_by('-created_at')
                .first()
            )

            if otp is None:
                return Response(
                    {"error": "Aucun code actif. Veuillez demander un nouveau code OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if otp.is_expired:
                otp.is_used = True
                otp.save(update_fields=['is_used'])
                return Response(
                    {"error": "Code OTP expiré. Veuillez demander un nouveau code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if otp.attempts >= otp.max_attempts:
                otp.is_used = True
                otp.save(update_fields=['is_used'])
                return Response(
                    {"error": "Nombre maximal de tentatives atteint. Demandez un nouveau code OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not check_password(otp_code, otp.code_hash):
                otp.attempts += 1
                otp.save(update_fields=['attempts'])
                return Response(
                    {"error": "Code invalide ou expiré."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            otp.is_used = True
            otp.used_at = timezone.now()
            otp.save(update_fields=['is_used', 'used_at'])

        # 3. Vérifier si l'email est déjà vérifié
        if user.email_verifie:
            # Cas de rétrocompatibilité: certains comptes anciens peuvent rester inactifs.
            if not user.is_active:
                user.is_active = True
                user.save(update_fields=['is_active'])
                logger.info(f"[VerifyEmail] Compte réactivé pour email déjà vérifié : {user.email} (id={user.id})")
            return Response(
                {"message": "Cet email est déjà vérifié. Vous pouvez vous connecter."},
                status=status.HTTP_200_OK,
            )

        # 4. Marquer l'email comme vérifié et garantir l'activation du compte
        user.email_verifie = True
        user.is_active = True
        user.save(update_fields=['email_verifie', 'is_active'])
        logger.info(f"[VerifyEmail] Email vérifié : {user.email} (id={user.id})")

        return Response(
            {"message": "Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter."},
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/resend-verification
# ──────────────────────────────────────────────────────────────────────────────

class ResendVerificationView(APIView):
    """
    Renvoie un nouvel OTP de vérification email.

    Body JSON attendu :
    {
        "email": "jean.dupont@mail.com"
    }

    Réponses :
        200 : Email renvoyé (ou message générique si email introuvable pour éviter l'énumération)
        400 : Compte déjà actif
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = ResendVerificationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = serializer.validated_data['email'].lower().strip()

        # On ne révèle pas si l'email existe ou non (sécurité anti-énumération)
        try:
            user = Utilisateur.objects.get(email=email)
        except Utilisateur.DoesNotExist:
            return Response(
                {"message": "Si un compte inactif existe pour cet email, un code OTP vous a été envoyé."},
                status=status.HTTP_200_OK,
            )

        if user.email_verifie:
            return Response(
                {"error": "Cet email est déjà vérifié."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        last_otp = (
            EmailVerificationOTP.objects
            .filter(utilisateur=user)
            .order_by('-created_at')
            .first()
        )

        if last_otp:
            delta = (timezone.now() - last_otp.created_at).total_seconds()
            if delta < OTP_RESEND_COOLDOWN_SECONDS:
                wait_seconds = int(OTP_RESEND_COOLDOWN_SECONDS - delta)
                return Response(
                    {
                        "error": f"Veuillez patienter {wait_seconds}s avant de renvoyer un nouveau code.",
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        _send_verification_otp(user)
        logger.info(f"[ResendVerification] Email renvoyé pour {user.email}")

        return Response(
            {"message": "Si un compte inactif existe pour cet email, un code OTP vous a été envoyé."},
            status=status.HTTP_200_OK,
        )
