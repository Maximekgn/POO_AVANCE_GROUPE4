from django.utils.text import slugify
from rest_framework import serializers

from immobilier.models import CategorieBien, SousTypeBien


class CategorieBienSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = CategorieBien
        fields = ['id', 'nom', 'slug', 'ordre', 'actif', 'date_creation']
        read_only_fields = ['id', 'date_creation']

    def validate(self, attrs):
        nom = attrs.get('nom')
        slug = attrs.get('slug')

        # Si le slug n'est pas fourni, on le dérive automatiquement du nom.
        if nom and not slug:
            attrs['slug'] = slugify(nom)
        return attrs


class SousTypeBienSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = SousTypeBien
        fields = [
            'id',
            'categorie',
            'categorie_nom',
            'nom',
            'slug',
            'ordre',
            'actif',
            'date_creation',
        ]
        read_only_fields = ['id', 'date_creation', 'categorie_nom']

    def validate(self, attrs):
        nom = attrs.get('nom')
        slug = attrs.get('slug')
        if nom and not slug:
            attrs['slug'] = slugify(nom)
        return attrs
