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
    photos = PhotoSerializer(many=True, read_only=True)
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    sous_type_nom = serializers.CharField(source='sous_type.nom', read_only=True)

    class Meta:
        model = Bien
        fields = [
            'id',
            'proprietaire_info',
            'reference',
            'categorie',
            'categorie_nom',
            'sous_type',
            'sous_type_nom',
            'adresse',
            'quartier',
            'ville',
            'code_postal',
            'latitude',
            'longitude',
            'description',
            'superficie',
            'nb_pieces',
            'etage',
            'meuble',
            'prix_jour',
            'prix_mois',
            'loyer_hc',
            'charges',
            'depot_garantie',
            'statut',
            'is_active',
            'date_creation',
            'photos',
        ]
        read_only_fields = ['id', 'date_creation', 'photos', 'categorie_nom', 'sous_type_nom', 'is_active']

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
