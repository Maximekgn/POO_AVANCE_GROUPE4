"""
Utilitaires pour les tokens de vérification d'email.

On utilise PyJWT directement (déjà installé via djangorestframework-simplejwt)
pour générer et valider un token HMAC signé avec la SECRET_KEY Django.
"""

import jwt
from datetime import datetime, timezone
from django.conf import settings


def generer_token_verification(user_id: int) -> str:
    """
    Génère un token JWT signé contenant l'ID de l'utilisateur.

    Payload :
    - sub  : ID utilisateur
    - iat  : date d'émission
    - exp  : date d'expiration (24h par défaut, configurable via EMAIL_VERIFICATION_TOKEN_EXPIRY)
    - type : 'email_verification' pour distinguer les tokens

    Retourne la chaîne JWT encodée.
    """
    expiry = getattr(settings, 'EMAIL_VERIFICATION_TOKEN_EXPIRY', 86400)
    now = datetime.now(tz=timezone.utc)

    payload = {
        'sub': str(user_id),
        'iat': now,
        'exp': now.timestamp() + expiry,
        'type': 'email_verification',
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def valider_token_verification(token: str) -> int:
    """
    Décode et valide le token de vérification d'email.

    Retourne l'ID utilisateur (int) si le token est valide.
    Lève une exception jwt.ExpiredSignatureError ou jwt.InvalidTokenError sinon.
    """
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=['HS256'],
        options={"verify_exp": True},
    )

    if payload.get('type') != 'email_verification':
        raise jwt.InvalidTokenError("Type de token invalide.")

    return int(payload['sub'])
