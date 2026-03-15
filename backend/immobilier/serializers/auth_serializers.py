"""
Serializers pour l'inscription et la vérification d'email.
"""

from rest_framework import serializers
from immobilier.models import Utilisateur
from immobilier.models.enums import RoleEnum


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer pour POST /api/auth/register.

    Champs attendus dans le body :
        - nom         (-> last_name)
        - prenom      (-> first_name)
        - email
        - motDePasse  (en clair, hashé avant sauvegarde)
        - telephone   (optionnel)
        - role        : CLIENT | PROPRIETAIRE  (ADMIN interdit à l'inscription)
    """

    nom = serializers.CharField(write_only=True)
    prenom = serializers.CharField(write_only=True)
    motDePasse = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    telephone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=[RoleEnum.CLIENT, RoleEnum.PROPRIETAIRE],
        default=RoleEnum.CLIENT,
    )

    class Meta:
        model = Utilisateur
        fields = ['nom', 'prenom', 'email', 'motDePasse', 'telephone', 'role']

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if Utilisateur.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        return value

    def validate_role(self, value: str) -> str:
        if value == RoleEnum.ADMIN:
            raise serializers.ValidationError("Impossible de créer un compte Admin via l'inscription publique.")
        return value

    def create(self, validated_data: dict) -> Utilisateur:
        user = Utilisateur(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data['prenom'],
            last_name=validated_data['nom'],
            telephone=validated_data.get('telephone', ''),
            role=validated_data.get('role', RoleEnum.CLIENT),
            is_active=False,  # Compte inactif jusqu'à la vérification email
        )
        user.set_password(validated_data['motDePasse'])  # Hashage PBKDF2 via Django
        user.save()
        return user


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
