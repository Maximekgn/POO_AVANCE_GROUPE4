"""
Views REST pour le flux d'inscription (diagramme_sequence_inscription).

Endpoints exposés :
  POST  /api/auth/register              → Phase 1 : créer le compte + envoyer l'email
  POST  /api/auth/verify-email          → Phase 3 : activer le compte via le token
  POST  /api/auth/resend-verification   → Optionnel : renvoyer le lien si expiré
"""

import jwt
import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.models import Utilisateur
from immobilier.serializers import (
    RegisterSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
)
from immobilier.services.email_service import EmailService
from immobilier.utils.tokens import generer_token_verification, valider_token_verification

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/register
# ──────────────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """
    Crée un nouveau compte utilisateur (CLIENT ou PROPRIETAIRE).

    Flux (Phase 1 du diagramme d'inscription) :
    1. Validation des données (email unique, mdp ≥ 8 chars, rôle autorisé)
    2. Hashage PBKDF2 du mot de passe via Django
    3. Création du compte avec is_active=False
    4. Génération d'un token JWT de vérification (exp 24h)
    5. Envoi de l'email de confirmation avec le lien d'activation
    6. Réponse HTTP 201

    Body JSON attendu :
    {
        "nom":        "Dupont",
        "prenom":     "Jean",
        "email":      "jean.dupont@mail.com",
        "motDePasse": "MonMotDePasse123!",
        "telephone":  "+336XXXXXXXX",   // optionnel
        "role":       "CLIENT"          // CLIENT | PROPRIETAIRE
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

        # 1. Création du compte (is_active=False)
        user: Utilisateur = serializer.save()
        logger.info(f"[Register] Nouveau compte créé : {user.email} (id={user.id})")

        # 2. Génération du token de vérification (JWT 24h)
        token = generer_token_verification(user.id)

        # 3. Construction du lien de vérification pour le frontend
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url_verification = f"{frontend_url}/verify-email?token={token}"

        # 4. Envoi de l'email de confirmation (en synchrone ici — Celery si besoin)
        email_envoye = EmailService.envoyer_bienvenue(user, url_connexion=url_verification)
        if not email_envoye:
            logger.warning(f"[Register] Email non envoyé pour {user.email}")

        return Response(
            {
                "message": "Compte créé avec succès. Vérifiez vos emails pour activer votre compte.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/verify-email
# ──────────────────────────────────────────────────────────────────────────────

class VerifyEmailView(APIView):
    """
    Active le compte utilisateur après clic sur le lien email.

    Flux (Phase 3 du diagramme d'inscription) :
    1. Décode et vérifie le token JWT (signature + expiration)
    2. Récupère l'utilisateur correspondant
    3. Vérifie que le compte n'est pas déjà actif
    4. Met is_active=True en base
    5. Réponse HTTP 200

    Body JSON attendu :
    {
        "token": "eyJhbGciOiJIUzI1NiIs..."
    }

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

        token = serializer.validated_data['token']

        # 1. Valider le token JWT
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

        # 2. Récupérer l'utilisateur
        try:
            user = Utilisateur.objects.get(pk=user_id)
        except Utilisateur.DoesNotExist:
            return Response(
                {"error": "Aucun utilisateur trouvé pour ce token."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 3. Vérifier s'il n'est pas déjà actif
        if user.is_active:
            return Response(
                {"message": "Ce compte est déjà activé. Vous pouvez vous connecter."},
                status=status.HTTP_200_OK,
            )

        # 4. Activer le compte
        user.is_active = True
        user.save(update_fields=['is_active'])
        logger.info(f"[VerifyEmail] Compte activé : {user.email} (id={user.id})")

        return Response(
            {"message": "Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter."},
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────────────────────────────────────
#  POST /api/auth/resend-verification
# ──────────────────────────────────────────────────────────────────────────────

class ResendVerificationView(APIView):
    """
    Renvoie un nouvel email de vérification si le lien précédent a expiré.

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
                {"message": "Si un compte inactif existe pour cet email, un lien vous a été envoyé."},
                status=status.HTTP_200_OK,
            )

        if user.is_active:
            return Response(
                {"error": "Ce compte est déjà activé."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Générer un nouveau token et renvoyer l'email
        token = generer_token_verification(user.id)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url_verification = f"{frontend_url}/verify-email?token={token}"

        EmailService.envoyer_bienvenue(user, url_connexion=url_verification)
        logger.info(f"[ResendVerification] Email renvoyé pour {user.email}")

        return Response(
            {"message": "Si un compte inactif existe pour cet email, un lien vous a été envoyé."},
            status=status.HTTP_200_OK,
        )
