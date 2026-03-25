from rest_framework import serializers

from immobilier.models import Bail, SignatureBail


class BailSerializer(serializers.ModelSerializer):
    bien_reference = serializers.CharField(source='bien.reference', read_only=True)
    bien_ville = serializers.CharField(source='bien.ville', read_only=True)
    proprietaire_id = serializers.IntegerField(source='bien.proprietaire_info.utilisateur.id', read_only=True)
    client_user_id = serializers.IntegerField(source='client_info.utilisateur.id', read_only=True)
    signatures_count = serializers.SerializerMethodField()

    class Meta:
        model = Bail
        fields = [
            'id',
            'numero_bail',
            'statut',
            'date_entree',
            'date_sortie',
            'date_signature_proprietaire',
            'date_signature_client',
            'loyer_actuel',
            'depot_garantie',
            'bien_id',
            'bien_reference',
            'bien_ville',
            'proprietaire_id',
            'client_info_id',
            'client_user_id',
            'signatures_count',
        ]

    def get_signatures_count(self, obj: Bail) -> int:
        return obj.signatures.count()


class BailSignSerializer(serializers.Serializer):
    image_signature_url = serializers.URLField(required=False, allow_blank=True)


class SignatureBailSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignatureBail
        fields = [
            'id',
            'bail_id',
            'utilisateur_id',
            'type_signataire',
            'image_signature_url',
            'ip_adresse',
            'date_signature',
            'hash_integrite',
        ]