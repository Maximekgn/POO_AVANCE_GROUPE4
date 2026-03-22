"""
Serializers pour l'inscription et la vérification d'email.
"""

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from immobilier.models import Utilisateur, Document, ClientInfo
from immobilier.models.enums import TypeDocumentEnum


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
    """Permet l'authentification JWT avec email + password."""

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

        self.user = user

        refresh = self.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user_id': user.id,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'is_admin': bool(user.is_staff or user.is_superuser),
            'role': 'ADMIN' if (user.is_staff or user.is_superuser) else 'USER',
            'email_verified': bool(user.email_verifie),
            'documents_completed': bool(user.documents_complets),
        }
        return data


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
    token = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    """
    Serializer pour POST /api/auth/resend-verification.

    Champs attendus :
        - email : L'email du compte non encore activé
    """
    email = serializers.EmailField()
