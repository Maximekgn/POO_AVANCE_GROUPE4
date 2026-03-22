from __future__ import annotations

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from immobilier.chat_utils import build_conversation_id, conversation_includes_user
from immobilier.models import DemandeAction, Message, Utilisateur
from immobilier.presence import is_online
from immobilier.serializers.message_serializers import MessageSerializer


class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = request.user
        messages = (
            Message.objects.filter(Q(expediteur=user) | Q(destinataire=user))
            .select_related("expediteur", "destinataire")
            .order_by("-date_envoi")
        )

        conversations: dict[str, dict] = {}

        for msg in messages:
            conv_id = msg.conversation_id or build_conversation_id(msg.expediteur_id, msg.destinataire_id)
            if not msg.conversation_id:
                msg.conversation_id = conv_id
                msg.save(update_fields=["conversation_id"])

            is_sender = msg.expediteur_id == user.id
            other_user = msg.destinataire if is_sender else msg.expediteur

            item = conversations.get(conv_id)
            if item is None:
                item = {
                    "conversation_id": conv_id,
                    "other_user": {
                        "id": other_user.id,
                        "full_name": f"{other_user.first_name} {other_user.last_name}".strip() or other_user.email,
                        "email": other_user.email,
                        "is_admin": bool(other_user.is_staff or other_user.is_superuser),
                        "is_online": is_online(other_user.id),
                    },
                    "last_message": MessageSerializer(msg).data,
                    "unread_count": 0,
                }
                conversations[conv_id] = item

            if msg.destinataire_id == user.id and not msg.lu:
                item["unread_count"] += 1

        return Response(list(conversations.values()), status=status.HTTP_200_OK)


class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, conversation_id: str) -> Response:
        user = request.user
        if not conversation_includes_user(conversation_id, user.id):
            return Response({"detail": "Conversation invalide."}, status=status.HTTP_403_FORBIDDEN)

        messages = (
            Message.objects.filter(conversation_id=conversation_id)
            .filter(Q(expediteur=user) | Q(destinataire=user))
            .select_related("expediteur", "destinataire")
            .order_by("date_envoi")
        )
        return Response(MessageSerializer(messages, many=True).data, status=status.HTTP_200_OK)


class MarkConversationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, conversation_id: str) -> Response:
        user = request.user
        if not conversation_includes_user(conversation_id, user.id):
            return Response({"detail": "Conversation invalide."}, status=status.HTTP_403_FORBIDDEN)

        updated = Message.objects.filter(
            conversation_id=conversation_id,
            destinataire=user,
            lu=False,
        ).update(lu=True)

        return Response({"updated": updated}, status=status.HTTP_200_OK)


class ChatContactsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        current_user = request.user

        if current_user.is_staff or current_user.is_superuser:
            users = Utilisateur.objects.filter(is_active=True).exclude(id=current_user.id).order_by("first_name", "last_name")
        else:
            admin_ids = set(
                Utilisateur.objects.filter(is_active=True)
                .filter(Q(is_staff=True) | Q(is_superuser=True))
                .values_list('id', flat=True)
            )

            message_pairs = Message.objects.filter(
                Q(expediteur=current_user) | Q(destinataire=current_user)
            ).values_list('expediteur_id', 'destinataire_id')

            message_contact_ids = set()
            for expediteur_id, destinataire_id in message_pairs:
                other_id = destinataire_id if expediteur_id == current_user.id else expediteur_id
                if other_id and other_id != current_user.id:
                    message_contact_ids.add(other_id)

            demande_pairs = DemandeAction.objects.filter(
                Q(demandeur=current_user) | Q(proprietaire=current_user)
            ).values_list('demandeur_id', 'proprietaire_id')

            demande_contact_ids = set()
            for demandeur_id, proprietaire_id in demande_pairs:
                other_id = proprietaire_id if demandeur_id == current_user.id else demandeur_id
                if other_id and other_id != current_user.id:
                    demande_contact_ids.add(other_id)

            allowed_ids = admin_ids | message_contact_ids | demande_contact_ids
            users = Utilisateur.objects.filter(is_active=True, id__in=allowed_ids).exclude(id=current_user.id).order_by("first_name", "last_name")

        payload = [
            {
                "id": user.id,
                "full_name": f"{user.first_name} {user.last_name}".strip() or user.email,
                "email": user.email,
                "is_admin": bool(user.is_staff or user.is_superuser),
                "is_online": is_online(user.id),
                "conversation_id": build_conversation_id(current_user.id, user.id),
            }
            for user in users
        ]

        return Response(payload, status=status.HTTP_200_OK)
