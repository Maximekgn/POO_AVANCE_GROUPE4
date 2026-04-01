from rest_framework import serializers


class DocumentUploadSerializer(serializers.Serializer):
    piece_identite_recto = serializers.ImageField(required=False)
    piece_identite_verso = serializers.ImageField(required=False)
    photo_avec_piece = serializers.ImageField(required=False)
    titre_propriete = serializers.ImageField(required=False)
    video_avec_titre = serializers.FileField(required=False)
