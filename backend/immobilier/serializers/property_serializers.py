from rest_framework import serializers

from immobilier.models import Bien, Photo, CategorieBien, SousTypeBien, Proprietaire
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
    proprietaire = serializers.PrimaryKeyRelatedField(queryset=Proprietaire.objects.all(), required=False)
    photos = PhotoSerializer(many=True, read_only=True)
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    sous_type_nom = serializers.CharField(source='sous_type.nom', read_only=True)

    class Meta:
        model = Bien
        fields = [
            'id',
            'proprietaire',
            'reference',
            'categorie',
            'categorie_nom',
            'sous_type',
            'sous_type_nom',
            'adresse',
            'ville',
            'code_postal',
            'description',
            'superficie',
            'nb_pieces',
            'etage',
            'meuble',
            'loyer_hc',
            'charges',
            'depot_garantie',
            'statut',
            'date_creation',
            'photos',
        ]
        read_only_fields = ['id', 'date_creation', 'photos', 'categorie_nom', 'sous_type_nom']

    def validate(self, attrs):
        categorie = attrs.get('categorie') or getattr(self.instance, 'categorie', None)
        sous_type = attrs.get('sous_type') or getattr(self.instance, 'sous_type', None)

        if sous_type and categorie and sous_type.categorie_id != categorie.id:
            raise serializers.ValidationError({'sous_type': 'Le sous-type ne correspond pas a la categorie selectionnee.'})

        return attrs

    def validate_proprietaire(self, value):
        if value.role != 'PROPRIETAIRE':
            raise serializers.ValidationError('Le proprietaire doit avoir le role PROPRIETAIRE.')
        return value


class BienStatutUpdateSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(choices=StatutBienEnum.choices)


class PhotoReorderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    ordre = serializers.IntegerField(min_value=0)


class BienPhotoReorderSerializer(serializers.Serializer):
    photos = PhotoReorderItemSerializer(many=True)
