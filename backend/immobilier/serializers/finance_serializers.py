from django.shortcuts import get_object_or_404
from rest_framework import serializers

from immobilier.models import Depense, Paiement, Bien


class AdminPaiementSerializer(serializers.ModelSerializer):
    bien_id = serializers.IntegerField(source='bail.bien.id', read_only=True)
    bien_reference = serializers.CharField(source='bail.bien.reference', read_only=True)
    locataire_id = serializers.IntegerField(source='bail.client_info.utilisateur.id', read_only=True)
    locataire_nom = serializers.SerializerMethodField()
    locataire_email = serializers.CharField(source='bail.client_info.utilisateur.email', read_only=True)
    commission_plateforme = serializers.DecimalField(read_only=True, max_digits=10, decimal_places=2)
    montant_reverse = serializers.DecimalField(read_only=True, max_digits=10, decimal_places=2)

    class Meta:
        model = Paiement
        fields = [
            'id',
            'reference',
            'montant',
            'commission_plateforme',
            'montant_reverse',
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
        # Essayer d'abord via bail
        bail = getattr(obj, 'bail', None)
        if bail:
            owner = getattr(getattr(bail, 'client_info', None), 'utilisateur', None)
            if owner:
                full_name = f"{owner.first_name or ''} {owner.last_name or ''}".strip()
                return full_name or owner.email
        # Fallback: utiliser la demande via bail
        if bail and hasattr(bail, 'demande') and bail.demande:
            demande = bail.demande
            user = getattr(demande, 'demandeur', None)
            if user:
                full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
                return full_name or user.email
        return None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Gérer les champs qui peuvent être None si bail n'est pas défini
        if not instance.bail:
            representation['bien_id'] = None
            representation['bien_reference'] = None
            representation['locataire_id'] = None
            representation['locataire_email'] = None
        return representation


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


class DepenseCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une dépense (admin uniquement)."""
    bien_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Depense
        fields = [
            'categorie',
            'libelle',
            'montant',
            'date_depense',
            'fournisseur',
            'numero_facture',
            'bien_id',
        ]

    def create(self, validated_data):
        bien_id = validated_data.pop('bien_id')
        bien = get_object_or_404(Bien, pk=bien_id)
        
        # Récupérer le propriétaire du bien
        proprietaire_info = getattr(bien, 'proprietaire_info', None)
        
        depense = Depense.objects.create(
            bien=bien,
            proprietaire_info=proprietaire_info,
            **validated_data
        )
        return depense
