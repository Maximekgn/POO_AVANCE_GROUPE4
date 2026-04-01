from rest_framework import serializers
from immobilier.models import Incident, IncidentMessage, IncidentPhoto, Review, ReviewSignalement
from immobilier.serializers.user_serializers import AdminUserDetailsSerializer
from immobilier.serializers.property_serializers import BienSerializer


class IncidentPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentPhoto
        fields = ['id', 'photo', 'legende', 'est_preuve', 'uploaded_at']


class IncidentMessageSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)
    auteur_email = serializers.EmailField(source='auteur.email', read_only=True)
    
    class Meta:
        model = IncidentMessage
        fields = ['id', 'incident', 'auteur', 'auteur_nom', 'auteur_email', 'message', 'files_jointes', 'lu', 'created_at']
        read_only_fields = ['auteur', 'created_at']


class IncidentSerializer(serializers.ModelSerializer):
    bien_details = BienSerializer(source='bien', read_only=True)
    locataire_nom = serializers.CharField(source='locataire.get_full_name', read_only=True)
    proprietaire_nom = serializers.CharField(source='proprietaire.get_full_name', read_only=True)
    assigne_a_nom = serializers.CharField(source='assigne_a.get_full_name', read_only=True)
    photos = IncidentPhotoSerializer(many=True, read_only=True)
    messages_count = serializers.SerializerMethodField()
    jours_ouverts = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Incident
        fields = [
            'id', 'bien', 'bien_details', 'locataire', 'locataire_nom', 
            'proprietaire', 'proprietaire_nom', 'assigne_a', 'assigne_a_nom',
            'titre', 'description', 'categorie', 'urgence', 'statut',
            'date_ouverture', 'date_fermeture', 'resolution_notes', 'date_resolution',
            'cout_estime', 'cout_reel', 'pris_en_charge',
            'photos', 'messages_count', 'jours_ouverts',
            'created_at', 'updated_at', 'est_urgent'
        ]
        read_only_fields = ['date_ouverture', 'created_at', 'updated_at', 'est_urgent']
    
    def get_messages_count(self, obj):
        return obj.messages.count()
    
    def create(self, validated_data):
        # Automatically set locataire and proprietaire from request
        request = self.context.get('request')
        if request:
            validated_data['locataire'] = request.user
            # Get proprietaire from bien
            if 'bien' in validated_data:
                bien = validated_data['bien']
                if bien.proprietaire_info and bien.proprietaire_info.utilisateur:
                    validated_data['proprietaire'] = bien.proprietaire_info.utilisateur
        return super().create(validated_data)


class IncidentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = ['bien', 'titre', 'description', 'categorie', 'urgence']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['locataire'] = request.user
            bien = validated_data['bien']
            if bien.proprietaire_info and bien.proprietaire_info.utilisateur:
                validated_data['proprietaire'] = bien.proprietaire_info.utilisateur
        return super().create(validated_data)


class IncidentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = ['statut', 'assigne_a', 'resolution_notes', 'cout_estime', 'cout_reel', 'pris_en_charge']


class ReviewSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)
    auteur_avatar = serializers.SerializerMethodField()
    moyenne_details = serializers.SerializerMethodField()
    bail_reference = serializers.CharField(source='bail.numero_bail', read_only=True)
    reponse_visible = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'bail', 'bail_reference', 'auteur', 'auteur_nom', 'auteur_avatar',
            'cible_type', 'cible_id', 'note_globale', 'note_proprete', 
            'note_exactitude', 'note_communication', 'note_emplacement', 'note_enregistrement',
            'moyenne_details', 'commentaire', 'points_positifs', 'points_negatifs',
            'est_visible', 'est_signale', 'date_creation', 'reponse', 'reponse_visible', 'date_reponse'
        ]
        read_only_fields = ['date_creation', 'est_signale']
    
    def get_auteur_avatar(self, obj):
        if obj.auteur.photo_profil:
            return obj.auteur.photo_profil
        seed = obj.auteur.get_full_name() or obj.auteur.email
        return f"https://ui-avatars.com/api/?name={seed}&background=0f766e&color=fff"
    
    def get_moyenne_details(self, obj):
        return obj.calculer_moyenne()
    
    def get_reponse_visible(self, obj):
        return bool(obj.reponse and obj.date_reponse)


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            'bail', 'cible_type', 'cible_id', 'note_globale', 'note_proprete', 
            'note_exactitude', 'note_communication', 'note_emplacement', 'note_enregistrement',
            'commentaire', 'points_positifs', 'points_negatifs'
        ]
    
    def validate_note_globale(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("La note doit être entre 1 et 5")
        return value
    
    def validate(self, data):
        # Check if review already exists for this bail
        bail = data.get('bail')
        auteur = self.context.get('request').user if self.context.get('request') else None
        
        if bail and auteur:
            existing = Review.objects.filter(bail=bail, auteur=auteur).first()
            if existing:
                raise serializers.ValidationError("Vous avez déjà laissé un avis pour ce bail")
        
        # Check minimum comment length
        commentaire = data.get('commentaire', '')
        if len(commentaire) < 50:
            raise serializers.ValidationError({"commentaire": "Le commentaire doit contenir au moins 50 caractères"})
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['auteur'] = request.user
        return super().create(validated_data)


class ReviewSignalementSerializer(serializers.ModelSerializer):
    signaleur_nom = serializers.CharField(source='signaleur.get_full_name', read_only=True)
    traite_par_nom = serializers.CharField(source='traite_par.get_full_name', read_only=True)
    
    class Meta:
        model = ReviewSignalement
        fields = [
            'id', 'review', 'signaleur', 'signaleur_nom', 'motif', 'description',
            'date_signalement', 'traite_par', 'traite_par_nom', 'resolution', 'date_resolution'
        ]
        read_only_fields = ['signaleur', 'date_signalement', 'traite_par', 'date_resolution']


class ReviewSignalementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewSignalement
        fields = ['review', 'motif', 'description']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['signaleur'] = request.user
        return super().create(validated_data)
