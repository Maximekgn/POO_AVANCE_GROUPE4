"""
Serializers pour l'inscription et la vérification d'email.
"""

import jwt
from datetime import timedelta
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.conf import settings
from immobilier.models import Utilisateur, Document, ClientInfo, EmailVerificationOTP
from immobilier.models.enums import TypeDocumentEnum
from immobilier.services.email_service import EmailService


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer pour POST /api/auth/register.

    Champs attendus dans le body :
        - nom         (-> last_name)
        - prenom      (-> first_name)
        - email
        - motDePasse  (en clair, hashé avant sauvegarde)
        - telephone   (optionnel)
        - role        : champ ignoré (compatibilité frontend)
    """

    nom = serializers.CharField(write_only=True)
    prenom = serializers.CharField(write_only=True)
    motDePasse = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    telephone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Utilisateur
        fields = ['nom', 'prenom', 'email', 'motDePasse', 'telephone', 'role']

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if Utilisateur.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        return value

    def create(self, validated_data: dict) -> Utilisateur:
        validated_data.pop('role', None)

        user = Utilisateur(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data['prenom'],
            last_name=validated_data['nom'],
            telephone=validated_data.get('telephone', ''),
            is_active=True,
            email_verifie=False,
            documents_complets=False,
        )
        user.set_password(validated_data['motDePasse'])  # Hashage PBKDF2 via Django
        user.save()
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Permet l'authentification JWT avec email + password.
    Envoie un code OTP par email et retourne un temp_token.
    L'utilisateur doit ensuite vérifier l'OTP pour obtenir les tokens finaux.
    """

    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['is_admin'] = bool(user.is_staff or user.is_superuser)
        return token

    def validate(self, attrs):
        email = (attrs.get('email') or '').strip().lower()
        password = attrs.get('password')

        if not email or not password:
            raise AuthenticationFailed("Email ou mot de passe manquant.")

        try:
            user_record = Utilisateur.objects.get(email=email)
        except Utilisateur.DoesNotExist:
            raise AuthenticationFailed("No active account found with the given credentials")

        user = authenticate(
            request=self.context.get('request'),
            username=user_record.username,
            password=password,
        )

        if user is None or not user.is_active:
            raise AuthenticationFailed("No active account found with the given credentials")

        if not user.email_verifie:
            raise AuthenticationFailed("Email non verifie. Veuillez verifier votre compte avant de vous connecter.")

        # Générer et envoyer le code OTP
        from django.utils import timezone
        from django.contrib.auth.hashers import make_password
        import secrets
        import string
        
        OTP_LENGTH = 6
        OTP_EXPIRY_MINUTES = 10
        
        alphabet = string.digits
        otp_code = ''.join(secrets.choice(alphabet) for _ in range(OTP_LENGTH))
        expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        
        # Invalider les OTP précédents
        EmailVerificationOTP.objects.filter(utilisateur=user, is_used=False).update(is_used=True)
        
        EmailVerificationOTP.objects.create(
            utilisateur=user,
            code_hash=make_password(otp_code),
            expires_at=expires_at,
        )
        
        # Envoyer l'OTP par email
        EmailService.envoyer_code_verification_email(
            user,
            otp_code=otp_code,
            validite_minutes=OTP_EXPIRY_MINUTES,
            url_verification="/verify-email",
        )
        
        # Générer un temp_token valide 10 minutes pour la vérification OTP
        temp_token = jwt.encode(
            {
                'user_id': user.id,
                'email': user.email,
                'exp': timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
                'type': 'temp_login',
            },
            settings.SECRET_KEY,
            algorithm='HS256'
        )

        return {
            'temp_token': temp_token,
            'requires_2fa': True,
            'otp_required': True,
            'message': 'Code OTP envoyé à votre adresse email.',
            'otp_expires_in_seconds': OTP_EXPIRY_MINUTES * 60,
        }


class UploadUserDocumentsSerializer(serializers.Serializer):
    """Serializer pour dépôt des documents de profil utilisateur."""

    numero_piece = serializers.CharField(max_length=100)
    profession = serializers.CharField(required=False, allow_blank=True)
    revenus_mensuels = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        required=False, 
        allow_null=True
    )
    piece_identite = serializers.FileField()

    def validate_revenus_mensuels(self, value):
        """Allow empty/None values for optional numeric field."""
        return value

    def create(self, validated_data):
        request = self.context['request']
        user = request.user

        uploaded_file = validated_data['piece_identite']
        document = Document.objects.create(
            nom=uploaded_file.name,
            file=uploaded_file,
            type=TypeDocumentEnum.PIECE_IDENTITE,
            taille_octets=getattr(uploaded_file, 'size', None),
            mime_type=getattr(uploaded_file, 'content_type', None),
        )

        client_info, _ = ClientInfo.objects.get_or_create(utilisateur=user)
        client_info.numero_piece = validated_data['numero_piece']
        client_info.carte_identite = document
        if 'profession' in validated_data and validated_data['profession']:
            client_info.profession = validated_data['profession']
        if 'revenus_mensuels' in validated_data and validated_data['revenus_mensuels']:
            client_info.revenus_mensuels = validated_data['revenus_mensuels']
        client_info.save()

        user.documents_complets = True
        user.save(update_fields=['documents_complets'])

        return {
            'document_id': document.id,
            'document_name': document.nom,
            'documents_completed': True,
        }


class VerifyEmailSerializer(serializers.Serializer):
    """
    Serializer pour POST /api/auth/verify-email.

    Champs attendus :
        - token : Le token JWT reçu dans l'email de confirmation
    """
    token = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    otp_code = serializers.CharField(required=False, min_length=4, max_length=8)

    def validate(self, attrs):
        token = (attrs.get('token') or '').strip()
        email = attrs.get('email')
        otp_code = (attrs.get('otp_code') or '').strip()

        if token:
            return attrs

        if not email or not otp_code:
            raise serializers.ValidationError(
                "Fournissez soit 'token', soit le couple 'email' + 'otp_code'."
            )

        attrs['otp_code'] = otp_code
        return attrs


class ResendVerificationSerializer(serializers.Serializer):
    """
    Serializer pour POST /api/auth/resend-verification.

    Champs attendus :
        - email : L'email du compte non encore activé
    """
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return value.lower().strip()
