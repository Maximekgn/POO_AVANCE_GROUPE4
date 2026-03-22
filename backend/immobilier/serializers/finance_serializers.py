from rest_framework import serializers

from immobilier.models import Depense, Paiement


class AdminPaiementSerializer(serializers.ModelSerializer):
    bien_id = serializers.IntegerField(source='bail.bien.id', read_only=True)
    bien_reference = serializers.CharField(source='bail.bien.reference', read_only=True)
    locataire_id = serializers.IntegerField(source='bail.client_info.utilisateur.id', read_only=True)
    locataire_nom = serializers.SerializerMethodField()
    locataire_email = serializers.CharField(source='bail.client_info.utilisateur.email', read_only=True)

    class Meta:
        model = Paiement
        fields = [
            'id',
            'reference',
            'montant',
            'date_echeance',
            'date_paiement',
            'statut',
            'mode_paiement',
            'commentaire',
            'bien_id',
            'bien_reference',
            'locataire_id',
            'locataire_nom',
            'locataire_email',
        ]

    def get_locataire_nom(self, obj: Paiement):
        owner = getattr(getattr(getattr(obj, 'bail', None), 'client_info', None), 'utilisateur', None)
        if not owner:
            return None
        full_name = f"{owner.first_name or ''} {owner.last_name or ''}".strip()
        return full_name or owner.email


class AdminDepenseSerializer(serializers.ModelSerializer):
    bien_id = serializers.IntegerField(source='bien.id', read_only=True)
    bien_reference = serializers.CharField(source='bien.reference', read_only=True)
    proprietaire_id = serializers.IntegerField(source='proprietaire_info.utilisateur.id', read_only=True)
    proprietaire_nom = serializers.SerializerMethodField()
    proprietaire_email = serializers.CharField(source='proprietaire_info.utilisateur.email', read_only=True)

    class Meta:
        model = Depense
        fields = [
            'id',
            'categorie',
            'libelle',
            'montant',
            'date_depense',
            'fournisseur',
            'numero_facture',
            'bien_id',
            'bien_reference',
            'proprietaire_id',
            'proprietaire_nom',
            'proprietaire_email',
        ]

    def get_proprietaire_nom(self, obj: Depense):
        owner = getattr(getattr(obj, 'proprietaire_info', None), 'utilisateur', None)
        if not owner:
            return None
        full_name = f"{owner.first_name or ''} {owner.last_name or ''}".strip()
        return full_name or owner.email
