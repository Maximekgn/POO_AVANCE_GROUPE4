from datetime import timedelta

from django.db.models import Q
from rest_framework import serializers

from immobilier.models import Bien, DemandeAction
from immobilier.models.enums import StatutBienEnum, StatutDemandeEnum, TypeDemandeEnum


class DemandeActionSerializer(serializers.ModelSerializer):
    bien_reference = serializers.CharField(source='bien.reference', read_only=True)
    bien_adresse = serializers.CharField(source='bien.adresse', read_only=True)
    bien_image = serializers.SerializerMethodField()
    demandeur_nom = serializers.SerializerMethodField()
    proprietaire_nom = serializers.SerializerMethodField()
    demandeur_email = serializers.EmailField(source='demandeur.email', read_only=True)
    demandeur_telephone = serializers.CharField(source='demandeur.telephone', read_only=True)

    has_lease = serializers.SerializerMethodField()
 
    class Meta:
        model = DemandeAction
        fields = [
            'id',
            'bien',
            'bien_reference',
            'bien_adresse',
            'bien_image',
            'demandeur',
            'demandeur_nom',
            'demandeur_email',
            'demandeur_telephone',
            'proprietaire',
            'proprietaire_nom',
            'type_demande',
            'statut',
            'date_debut',
            'date_fin',
            'date_visite',
            'duree_jours',
            'montant_total',
            'message',
            'note_proprietaire',
            'motif_refus',
            'has_lease',
            'date_creation',
            'date_traitement',
        ]
        read_only_fields = [
            'id',
            'demandeur',
            'proprietaire',
            'statut',
            'duree_jours',
            'date_visite',
            'date_creation',
            'date_traitement',
            'motif_refus',
            'note_proprietaire',
        ]

    def get_bien_image(self, obj):
        request = self.context.get('request')
        # On cherche la photo principale, sinon la première
        photo = obj.bien.photos.filter(principale=True).first()
        if not photo:
            photo = obj.bien.photos.first()
        
        if photo:
            url = photo.image.url if photo.image else photo.url
            if url and request:
                return request.build_absolute_uri(url)
            return url
        return None

    def get_demandeur_nom(self, obj):
        full_name = f"{obj.demandeur.first_name or ''} {obj.demandeur.last_name or ''}".strip()
        return full_name or obj.demandeur.email

    def get_has_lease(self, obj):
        return hasattr(obj, 'bail_genere') and obj.bail_genere is not None

    def get_proprietaire_nom(self, obj):
        full_name = f"{obj.proprietaire.first_name or ''} {obj.proprietaire.last_name or ''}".strip()
        return full_name or obj.proprietaire.email

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        bien = attrs.get('bien')
        type_demande = attrs.get('type_demande')
        date_debut = attrs.get('date_debut')
        date_fin = attrs.get('date_fin')

        if not bien or not isinstance(bien, Bien):
            raise serializers.ValidationError({'bien': 'Bien invalide.'})

        owner = getattr(getattr(bien, 'proprietaire_info', None), 'utilisateur', None)
        if owner is None:
            raise serializers.ValidationError({'bien': 'Ce bien n\'a pas de proprietaire associe.'})

        if not bien.is_active:
            raise serializers.ValidationError({'bien': 'Ce bien est desactive.'})

        if type_demande in {TypeDemandeEnum.VISITE, TypeDemandeEnum.LOCATION_DIRECTE, TypeDemandeEnum.PRIVATISATION} and bien.statut != StatutBienEnum.VACANT:
            raise serializers.ValidationError({'bien': 'Le bien doit etre vacant pour cette demande.'})

        if date_fin < date_debut:
            raise serializers.ValidationError({'date_fin': 'La date de fin doit etre apres la date de debut.'})

        if type_demande == TypeDemandeEnum.VISITE:
            attrs['date_fin'] = date_debut

        if owner.id == getattr(user, 'id', None):
            raise serializers.ValidationError({'type_demande': 'Le proprietaire ne peut pas creer une demande sur son propre bien.'})

        if type_demande == TypeDemandeEnum.LOCATION_DIRECTE:
            min_end = date_debut + timedelta(days=30)
            if date_fin < min_end:
                raise serializers.ValidationError({'date_fin': 'La location directe exige une duree minimale de 30 jours.'})

        overlap_qs = DemandeAction.objects.filter(
            bien_id=bien.id,
            statut__in=[StatutDemandeEnum.EN_ATTENTE, StatutDemandeEnum.ACCEPTEE],
            date_debut__lte=attrs['date_fin'],
            date_fin__gte=attrs['date_debut'],
        )

        if type_demande in {TypeDemandeEnum.LOCATION_DIRECTE, TypeDemandeEnum.PRIVATISATION} and overlap_qs.exists():
            raise serializers.ValidationError({'date_debut': 'Une demande active existe deja sur cette periode pour ce bien.'})

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user
        bien = validated_data['bien']
        owner = bien.proprietaire_info.utilisateur

        duree_jours = (validated_data['date_fin'] - validated_data['date_debut']).days
        if duree_jours <= 0:
            duree_jours = 1

        validated_data['duree_jours'] = duree_jours
        validated_data['demandeur'] = user
        validated_data['proprietaire'] = owner
        return super().create(validated_data)


class DemandeActionDecisionSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(choices=[StatutDemandeEnum.ACCEPTEE, StatutDemandeEnum.REFUSEE])
    decision = serializers.ChoiceField(
        choices=[StatutDemandeEnum.ACCEPTEE, StatutDemandeEnum.REFUSEE],
        required=False,
    )
    note_proprietaire = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    motif_refus = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date_visite = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        statut = attrs.get('statut') or attrs.get('decision')
        if not statut:
            raise serializers.ValidationError({'statut': 'Le statut est obligatoire.'})

        attrs['statut'] = statut
        motif_refus = (attrs.get('motif_refus') or '').strip()

        if statut == StatutDemandeEnum.REFUSEE and not motif_refus:
            raise serializers.ValidationError({'motif_refus': 'Le motif de refus est obligatoire.'})

        return attrs


class DemandeActionListFilterSerializer(serializers.Serializer):
    type_demande = serializers.ChoiceField(choices=TypeDemandeEnum.choices, required=False)
    statut = serializers.ChoiceField(choices=StatutDemandeEnum.choices, required=False)
