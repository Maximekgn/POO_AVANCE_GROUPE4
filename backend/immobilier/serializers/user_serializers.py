from django.db import transaction
from rest_framework import serializers

from immobilier.models import Bail, ClientInfo, Document, Garant, ProprietaireInfo, Utilisateur
from immobilier.models.enums import StatutBailEnum, StatutPaiementEnum


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
    
    # Champs de vérification d'identité
    verification_identite = serializers.SerializerMethodField()
    verification_propriete = serializers.SerializerMethodField()

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
            'verification_statut',
            'verification_motif_refus',
            'piece_identite_recto',
            'piece_identite_verso',
            'photo_avec_piece',
            'last_login',
            'date_joined',
            'date_creation',
            'dernier_login_custom',
            'client_info',
            'proprietaire_info',
            'nombre_biens',
            'verification_identite',
            'verification_propriete',
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
    
    def get_verification_identite(self, obj: Utilisateur) -> dict:
        """Retourne les URLs des documents d'identité."""
        request = self.context.get('request')
        return {
            'statut': obj.verification_statut,
            'motif_refus': obj.verification_motif_refus,
            'piece_identite_recto': request.build_absolute_uri(obj.piece_identite_recto.url) if obj.piece_identite_recto else None,
            'piece_identite_verso': request.build_absolute_uri(obj.piece_identite_verso.url) if obj.piece_identite_verso else None,
            'photo_avec_piece': request.build_absolute_uri(obj.photo_avec_piece.url) if obj.photo_avec_piece else None,
        }
    
    def get_verification_propriete(self, obj: Utilisateur) -> dict:
        """Retourne les URLs des documents de propriété."""
        request = self.context.get('request')
        proprietaire_info = getattr(obj, 'proprietaire_info', None)
        if not proprietaire_info:
            return {
                'statut': None,
                'motif_refus': None,
                'titre_propriete': None,
                'video_avec_titre': None,
            }
        return {
            'statut': 'VERIFIE' if proprietaire_info.propriete_verifiee else ('EN_ATTENTE' if proprietaire_info.titre_propriete else 'NON_SOUMIS'),
            'motif_refus': proprietaire_info.propriete_motif_refus,
            'titre_propriete': request.build_absolute_uri(proprietaire_info.titre_propriete.url) if proprietaire_info.titre_propriete else None,
            'video_avec_titre': request.build_absolute_uri(proprietaire_info.video_avec_titre.url) if proprietaire_info.video_avec_titre else None,
        }


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


class GarantSerializer(serializers.ModelSerializer):
    carte_identite_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Garant
        fields = [
            'id',
            'client_info',
            'nom',
            'prenom',
            'telephone',
            'email',
            'profession',
            'revenus_mensuels',
            'numero_piece',
            'carte_identite',
            'carte_identite_file_url',
        ]
        read_only_fields = ['id', 'client_info', 'carte_identite_file_url']

    def get_carte_identite_file_url(self, obj: Garant):
        doc = getattr(obj, 'carte_identite', None)
        if not doc:
            return None
        if getattr(doc, 'url', None):
            return doc.url
        if getattr(doc, 'file', None):
            try:
                return doc.file.url
            except ValueError:
                return None
        return None

    def validate_revenus_mensuels(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError('Les revenus mensuels doivent etre superieurs ou egaux a 0.')
        return value

    def validate(self, attrs):
        client_info = self.context.get('client_info') or getattr(self.instance, 'client_info', None)
        email = attrs.get('email')

        if client_info and email:
            queryset = Garant.objects.filter(client_info=client_info, email__iexact=email)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({'email': 'Un garant avec cet email existe deja pour ce locataire.'})

        return attrs


class LocataireBailSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    numero_bail = serializers.CharField()
    statut = serializers.CharField()
    date_entree = serializers.DateField(allow_null=True)
    date_sortie = serializers.DateField(allow_null=True)
    loyer_actuel = serializers.DecimalField(max_digits=10, decimal_places=2)
    bien = serializers.DictField()


class LocataireListSerializer(serializers.ModelSerializer):
    utilisateur_id = serializers.IntegerField(source='utilisateur.id', read_only=True)
    nom_complet = serializers.SerializerMethodField()
    email = serializers.EmailField(source='utilisateur.email', read_only=True)
    telephone = serializers.CharField(source='utilisateur.telephone', read_only=True)
    nombre_garants = serializers.SerializerMethodField()
    nombre_baux = serializers.SerializerMethodField()
    baux_actifs = serializers.SerializerMethodField()
    impayes_count = serializers.SerializerMethodField()

    class Meta:
        model = ClientInfo
        fields = [
            'id',
            'utilisateur_id',
            'nom_complet',
            'email',
            'telephone',
            'profession',
            'revenus_mensuels',
            'numero_piece',
            'date_creation',
            'nombre_garants',
            'nombre_baux',
            'baux_actifs',
            'impayes_count',
        ]

    def get_nom_complet(self, obj: ClientInfo) -> str:
        first = getattr(obj.utilisateur, 'first_name', '') or ''
        last = getattr(obj.utilisateur, 'last_name', '') or ''
        full = f"{first} {last}".strip()
        return full or obj.utilisateur.email

    def get_nombre_garants(self, obj: ClientInfo) -> int:
        return len(getattr(obj, 'garants').all())

    def get_nombre_baux(self, obj: ClientInfo) -> int:
        return len(getattr(obj, 'baux').all())

    def get_baux_actifs(self, obj: ClientInfo) -> int:
        return sum(1 for bail in getattr(obj, 'baux').all() if bail.statut == StatutBailEnum.EN_COURS)

    def get_impayes_count(self, obj: ClientInfo) -> int:
        count = 0
        for bail in getattr(obj, 'baux').all():
            count += sum(1 for paiement in bail.paiements.all() if paiement.statut == StatutPaiementEnum.IMPAYE)
        return count


class LocataireDetailSerializer(serializers.ModelSerializer):
    utilisateur = serializers.SerializerMethodField()
    garants = GarantSerializer(many=True, read_only=True)
    baux = serializers.SerializerMethodField()
    total_loyers_payes = serializers.SerializerMethodField()
    total_loyers_impayes = serializers.SerializerMethodField()

    class Meta:
        model = ClientInfo
        fields = [
            'id',
            'utilisateur',
            'profession',
            'revenus_mensuels',
            'numero_piece',
            'date_creation',
            'garants',
            'baux',
            'total_loyers_payes',
            'total_loyers_impayes',
        ]

    def get_utilisateur(self, obj: ClientInfo):
        user = obj.utilisateur
        return {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'telephone': user.telephone,
            'photo_profil': user.photo_profil,
            'is_active': user.is_active,
        }

    def get_baux(self, obj: ClientInfo):
        payload = []
        for bail in obj.baux.all():
            payload.append(
                {
                    'id': bail.id,
                    'numero_bail': bail.numero_bail,
                    'statut': bail.statut,
                    'date_entree': bail.date_entree,
                    'date_sortie': bail.date_sortie,
                    'loyer_actuel': bail.loyer_actuel,
                    'bien': {
                        'id': bail.bien_id,
                        'reference': getattr(bail.bien, 'reference', None),
                        'ville': getattr(bail.bien, 'ville', None),
                        'quartier': getattr(bail.bien, 'quartier', None),
                        'adresse': getattr(bail.bien, 'adresse', None),
                        'statut': getattr(bail.bien, 'statut', None),
                    },
                }
            )
        return payload

    def get_total_loyers_payes(self, obj: ClientInfo):
        total = 0
        for bail in obj.baux.all():
            total += sum(p.montant for p in bail.paiements.all() if p.statut == StatutPaiementEnum.PAYE)
        return total

    def get_total_loyers_impayes(self, obj: ClientInfo):
        total = 0
        for bail in obj.baux.all():
            total += sum(p.montant for p in bail.paiements.all() if p.statut == StatutPaiementEnum.IMPAYE)
        return total


class LocataireOnboardingSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    telephone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    profession = serializers.CharField(max_length=150, required=False, allow_blank=True)
    numero_piece = serializers.CharField(max_length=100, required=False, allow_blank=True)
    revenus_mensuels = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    bail_id = serializers.IntegerField(required=False)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_revenus_mensuels(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError('Les revenus mensuels doivent etre superieurs ou egaux a 0.')
        return value

    def validate(self, attrs):
        bail_id = attrs.get('bail_id')
        if not bail_id:
            return attrs

        try:
            bail = Bail.objects.select_related('bien__proprietaire_info').get(pk=bail_id)
        except Bail.DoesNotExist:
            raise serializers.ValidationError({'bail_id': 'Bail introuvable.'})

        request = self.context.get('request')
        if request and not (request.user.is_staff or request.user.is_superuser):
            proprietaire_info = getattr(request.user, 'proprietaire_info', None)
            if proprietaire_info is None:
                raise serializers.ValidationError({'bail_id': 'Seuls les proprietaires peuvent rattacher un bail.'})
            if bail.bien.proprietaire_info_id != proprietaire_info.id:
                raise serializers.ValidationError({'bail_id': 'Vous ne pouvez rattacher que vos propres baux.'})

        attrs['bail_obj'] = bail
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        bail = validated_data.pop('bail_obj', None)
        email = validated_data['email']

        defaults = {
            'username': email,
            'first_name': validated_data['first_name'],
            'last_name': validated_data['last_name'],
            'telephone': validated_data.get('telephone') or '',
            'is_active': True,
        }

        user, user_created = Utilisateur.objects.get_or_create(email=email, defaults=defaults)
        user_changed = False

        if not user_created:
            for field in ['first_name', 'last_name']:
                new_value = validated_data.get(field)
                if new_value and getattr(user, field) != new_value:
                    setattr(user, field, new_value)
                    user_changed = True
            if 'telephone' in validated_data:
                tel = validated_data.get('telephone') or ''
                if user.telephone != tel:
                    user.telephone = tel
                    user_changed = True
            if user.username != user.email:
                user.username = user.email
                user_changed = True
            if user_changed:
                user.save()

        client_info, client_created = ClientInfo.objects.get_or_create(utilisateur=user)
        client_changed = False
        for model_field in ['profession', 'numero_piece', 'revenus_mensuels']:
            if model_field in validated_data:
                new_value = validated_data.get(model_field)
                if getattr(client_info, model_field) != new_value:
                    setattr(client_info, model_field, new_value)
                    client_changed = True
        if client_changed:
            client_info.save()

        bail_rattache = None
        if bail is not None:
            if bail.client_info_id and bail.client_info_id != client_info.id:
                raise serializers.ValidationError({'bail_id': 'Ce bail est deja rattache a un autre locataire.'})
            bail.client_info = client_info
            if bail.statut == StatutBailEnum.BROUILLON:
                bail.statut = StatutBailEnum.EN_ATTENTE_SIGNATURE
            bail.save(update_fields=['client_info', 'statut'])
            bail_rattache = bail

        return {
            'utilisateur': user,
            'client_info': client_info,
            'user_created': user_created,
            'client_created': client_created,
            'bail': bail_rattache,
        }


class AdminUserAnonymizeSerializer(serializers.Serializer):
    motif = serializers.CharField(required=False, allow_blank=True)

    def validate_motif(self, value: str) -> str:
        return (value or '').strip()
