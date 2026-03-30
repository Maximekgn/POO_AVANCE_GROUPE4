from rest_framework import serializers

from immobilier.models import Bien, Photo, CategorieBien, SousTypeBien, ProprietaireInfo
from immobilier.models.enums import StatutBienEnum


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = [
            'id',
            'bien',
            'url',
            'image',
            'description',
            'principale',
            'ordre',
            'date_upload',
        ]
        read_only_fields = ['id', 'bien', 'date_upload']


class BienSerializer(serializers.ModelSerializer):
    proprietaire_info = serializers.PrimaryKeyRelatedField(queryset=ProprietaireInfo.objects.all(), required=False)
    owner_user_id = serializers.IntegerField(source='proprietaire_info.utilisateur.id', read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    sous_type_nom = serializers.CharField(source='sous_type.nom', read_only=True)
    proprietaire_nom = serializers.SerializerMethodField()
    proprietaire_email = serializers.CharField(source='proprietaire_info.utilisateur.email', read_only=True)
    
    # Champs financiers
    loyer_hc = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    charges = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    depot_garantie = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Bien
        fields = [
            'id',
            'proprietaire_info',
            'owner_user_id',
            'reference',
            'categorie',
            'categorie_nom',
            'sous_type',
            'sous_type_nom',
            'proprietaire_nom',
            'proprietaire_email',
            'adresse',
            'quartier',
            'ville',
            'code_postal',
            'latitude',
            'longitude',
            'description',
            'superficie',
            'nb_pieces',
            'nb_salons',
            'nb_chambres',
            'nb_douches',
            'etage',
            'meuble',
            'prix_jour',
            'prix_mois',
            'statut',
            'is_active',
            'date_creation',
            'photos',
            # Champs financiers
            'loyer_hc',
            'charges',
            'depot_garantie',
        ]
        read_only_fields = [
            'id',
            'date_creation',
            'photos',
            'categorie_nom',
            'sous_type_nom',
            'is_active',
            'owner_user_id',
            'loyer_hc',
            'charges',
            'depot_garantie',
        ]

    def get_proprietaire_nom(self, obj):
        owner = getattr(getattr(obj, 'proprietaire_info', None), 'utilisateur', None)
        if not owner:
            return None
        full_name = f"{owner.first_name or ''} {owner.last_name or ''}".strip()
        return full_name or owner.email

    def validate(self, attrs):
        categorie = attrs.get('categorie') or getattr(self.instance, 'categorie', None)
        sous_type = attrs.get('sous_type') or getattr(self.instance, 'sous_type', None)
        quartier = attrs.get('quartier', getattr(self.instance, 'quartier', '') or '').strip()
        prix_jour = attrs.get('prix_jour', getattr(self.instance, 'prix_jour', None))
        prix_mois = attrs.get('prix_mois', getattr(self.instance, 'prix_mois', None))

        if sous_type and categorie and sous_type.categorie_id != categorie.id:
            raise serializers.ValidationError({'sous_type': 'Le sous-type ne correspond pas a la categorie selectionnee.'})

        if not quartier:
            raise serializers.ValidationError({'quartier': 'Le quartier est obligatoire.'})

        if prix_jour is None or prix_jour <= 0:
            raise serializers.ValidationError({'prix_jour': 'Le prix par jour doit etre superieur a 0.'})

        if prix_mois is None or prix_mois <= 0:
            raise serializers.ValidationError({'prix_mois': 'Le prix par mois doit etre superieur a 0.'})

        return attrs

    def validate_proprietaire_info(self, value):
        if value.utilisateur_id is None:
            raise serializers.ValidationError('Le proprietaire doit etre lie a un utilisateur valide.')
        return value

    def create(self, validated_data):
        # Calcul automatique des champs derives a partir des prix
        prix_jour = validated_data.get('prix_jour', 0)
        prix_mois = validated_data.get('prix_mois', 0)
        
        # loyer_hc = prix mensuel
        validated_data['loyer_hc'] = prix_mois
        
        # charges = 0 par defaut
        validated_data['charges'] = 0
        
        # depot_garantie = 1 mois de loyer par defaut
        validated_data['depot_garantie'] = prix_mois
        
        # avance = 0 par defaut (sera defini lors de la demande de bail)
        validated_data['avance'] = 0
        
        return super().create(validated_data)


class BienStatutUpdateSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(choices=StatutBienEnum.choices)


class BienActivationUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()


class BienRefusSerializer(serializers.Serializer):
    motif_refus = serializers.CharField(max_length=500)


class PhotoReorderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    ordre = serializers.IntegerField(min_value=0)


class BienPhotoReorderSerializer(serializers.Serializer):
    photos = PhotoReorderItemSerializer(many=True)
