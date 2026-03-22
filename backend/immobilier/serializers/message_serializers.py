from __future__ import annotations

from rest_framework import serializers

from immobilier.models import Message


class ChatUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    is_admin = serializers.BooleanField()
    is_online = serializers.BooleanField()


class MessageSerializer(serializers.ModelSerializer):
    expediteur_id = serializers.IntegerField(source="expediteur.id", read_only=True)
    expediteur_nom = serializers.SerializerMethodField()
    destinataire_id = serializers.IntegerField(source="destinataire.id", read_only=True)
    destinataire_nom = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation_id",
            "contenu",
            "objet",
            "lu",
            "date_envoi",
            "expediteur_id",
            "expediteur_nom",
            "destinataire_id",
            "destinataire_nom",
        ]

    def get_expediteur_nom(self, obj):
        return f"{obj.expediteur.first_name} {obj.expediteur.last_name}".strip() or obj.expediteur.email

    def get_destinataire_nom(self, obj):
        return f"{obj.destinataire.first_name} {obj.destinataire.last_name}".strip() or obj.destinataire.email
