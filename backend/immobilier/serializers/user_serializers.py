from rest_framework import serializers

from immobilier.models import ClientInfo, Document, ProprietaireInfo, Utilisateur


class AdminDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id',
            'nom',
            'type',
            'url',
            'file_url',
            'mime_type',
            'taille_octets',
            'date_generation',
        ]

    def get_file_url(self, obj: Document):
        if obj.url:
            return obj.url
        if obj.file:
            try:
                return obj.file.url
            except ValueError:
                return None
        return None


class AdminClientInfoSerializer(serializers.ModelSerializer):
    carte_identite = AdminDocumentSerializer(read_only=True)

    class Meta:
        model = ClientInfo
        fields = [
            'profession',
            'numero_piece',
            'revenus_mensuels',
            'date_creation',
            'carte_identite',
        ]


class AdminProprietaireInfoSerializer(serializers.ModelSerializer):
    carte_identite = AdminDocumentSerializer(read_only=True)

    class Meta:
        model = ProprietaireInfo
        fields = [
            'iban',
            'adresse_fiscale',
            'numero_piece',
            'date_creation',
            'carte_identite',
        ]


class AdminUserDetailsSerializer(serializers.ModelSerializer):
    client_info = AdminClientInfoSerializer(read_only=True)
    proprietaire_info = AdminProprietaireInfoSerializer(read_only=True)
    is_admin = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    nombre_biens = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'telephone',
            'photo_profil',
            'is_active',
            'is_staff',
            'is_superuser',
            'is_admin',
            'role',
            'compte_verifie',
            'email_verifie',
            'documents_complets',
            'last_login',
            'date_joined',
            'date_creation',
            'dernier_login_custom',
            'client_info',
            'proprietaire_info',
            'nombre_biens',
        ]

    def get_is_admin(self, obj: Utilisateur) -> bool:
        return bool(obj.is_staff or obj.is_superuser)

    def get_role(self, obj: Utilisateur) -> str:
        return 'ADMIN' if (obj.is_staff or obj.is_superuser) else 'USER'

    def get_nombre_biens(self, obj: Utilisateur) -> int:
        """Compte le nombre de biens actifs publiés par l'utilisateur."""
        if not hasattr(obj, 'proprietaire_info') or obj.proprietaire_info is None:
            return 0
        return obj.proprietaire_info.biens.filter(is_active=True).count()


class CurrentUserProfileSerializer(serializers.ModelSerializer):
    client_info = AdminClientInfoSerializer(read_only=True)
    proprietaire_info = AdminProprietaireInfoSerializer(read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'telephone',
            'photo_profil',
            'email_verifie',
            'documents_complets',
            'role',
            'date_joined',
            'date_creation',
            'client_info',
            'proprietaire_info',
        ]

    def get_role(self, obj: Utilisateur) -> str:
        return 'ADMIN' if (obj.is_staff or obj.is_superuser) else 'USER'


class CurrentUserProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    telephone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    photo_profil = serializers.URLField(allow_blank=True, required=False)

    profession = serializers.CharField(max_length=150, allow_blank=True, required=False)
    revenus_mensuels = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    numero_piece_client = serializers.CharField(max_length=100, allow_blank=True, required=False)

    iban = serializers.CharField(max_length=34, allow_blank=True, required=False)
    adresse_fiscale = serializers.CharField(allow_blank=True, required=False)
    numero_piece_proprietaire = serializers.CharField(max_length=100, allow_blank=True, required=False)

    def update(self, instance: Utilisateur, validated_data):
        for field in ['first_name', 'last_name', 'telephone', 'photo_profil']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()

        client_fields = ['profession', 'revenus_mensuels', 'numero_piece_client']
        if any(field in validated_data for field in client_fields):
            client_info, _ = ClientInfo.objects.get_or_create(utilisateur=instance)
            if 'profession' in validated_data:
                client_info.profession = validated_data['profession']
            if 'revenus_mensuels' in validated_data:
                client_info.revenus_mensuels = validated_data['revenus_mensuels']
            if 'numero_piece_client' in validated_data:
                client_info.numero_piece = validated_data['numero_piece_client']
            client_info.save()

        proprietaire_fields = ['iban', 'adresse_fiscale', 'numero_piece_proprietaire']
        if any(field in validated_data for field in proprietaire_fields):
            proprietaire_info, _ = ProprietaireInfo.objects.get_or_create(utilisateur=instance)
            if 'iban' in validated_data:
                proprietaire_info.iban = validated_data['iban']
            if 'adresse_fiscale' in validated_data:
                proprietaire_info.adresse_fiscale = validated_data['adresse_fiscale']
            if 'numero_piece_proprietaire' in validated_data:
                proprietaire_info.numero_piece = validated_data['numero_piece_proprietaire']
            proprietaire_info.save()

        return instance
