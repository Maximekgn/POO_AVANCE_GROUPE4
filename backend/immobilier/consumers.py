from __future__ import annotations

import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from immobilier.chat_utils import build_conversation_id, conversation_includes_user
from immobilier.models import Message
from immobilier.presence import mark_offline, mark_online
from immobilier.serializers.message_serializers import MessageSerializer

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close(code=4401)
            return

        self.user = user
        self.user_group = f"user_{user.id}"
        self.presence_group = "presence"
        self.joined_conversations: set[str] = set()

        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.channel_layer.group_add(self.presence_group, self.channel_name)
        await self.accept()

        became_online = mark_online(user.id)
        if became_online:
            await self.channel_layer.group_send(
                self.presence_group,
                {
                    "type": "presence.status",
                    "user_id": user.id,
                    "is_online": True,
                },
            )

        await self.send_json(
            {
                "type": "chat.connected",
                "user_id": user.id,
            }
        )

    async def disconnect(self, code):
        try:
            if hasattr(self, "user_group"):
                try:
                    await self.channel_layer.group_discard(
                        self.user_group, self.channel_name
                    )
                except Exception as e:
                    logger.error(f"Error discarding from user group: {e}")

            if hasattr(self, "presence_group"):
                try:
                    await self.channel_layer.group_discard(
                        self.presence_group, self.channel_name
                    )
                except Exception as e:
                    logger.error(f"Error discarding from presence group: {e}")

            for conversation_id in getattr(self, "joined_conversations", set()).copy():
                try:
                    await self.channel_layer.group_discard(
                        f"conversation_{conversation_id}", self.channel_name
                    )
                except Exception as e:
                    logger.error(
                        f"Error discarding from conversation {conversation_id}: {e}"
                    )

            user = getattr(self, "user", None)
            if user:
                became_offline = mark_offline(user.id)
                if became_offline:
                    try:
                        await self.channel_layer.group_send(
                            "presence",
                            {
                                "type": "presence.status",
                                "user_id": user.id,
                                "is_online": False,
                            },
                        )
                    except Exception as e:
                        logger.error(f"Error sending offline status: {e}")
        except Exception as e:
            logger.error(f"Error in disconnect: {e}", exc_info=True)

    async def receive_json(self, content, **kwargs):
        try:
            action = content.get("action")
            msg_type = content.get("type")

            # Handle heartbeat to keep connection alive
            if msg_type == "heartbeat" or action == "heartbeat":
                await self.send_json({"type": "heartbeat"})
                return

            if action == "join_conversation":
                await self._join_conversation(content)
                return

            if action == "leave_conversation":
                await self._leave_conversation(content)
                return

            if action == "send_message":
                await self._send_message(content)
                return

            if action == "typing":
                await self._typing(content)
                return

            if action == "mark_read":
                await self._mark_read(content)
                return

            if action or msg_type:
                logger.warning(f"Unknown action: {action}, type: {msg_type}")
                await self.send_json(
                    {"type": "chat.error", "detail": "Action inconnue."}
                )
        except Exception as e:
            logger.error(f"Error in receive_json: {e}", exc_info=True)
            try:
                await self.send_json(
                    {"type": "chat.error", "detail": "Erreur serveur."}
                )
            except Exception:
                pass

    async def _join_conversation(self, content):
        try:
            conversation_id = content.get("conversation_id")
            if not conversation_id or not conversation_includes_user(
                conversation_id, self.user.id
            ):
                return

            group_name = f"conversation_{conversation_id}"
            await self.channel_layer.group_add(group_name, self.channel_name)
            self.joined_conversations.add(conversation_id)

            await self.send_json(
                {
                    "type": "chat.joined",
                    "conversation_id": conversation_id,
                }
            )
        except Exception as e:
            logger.error(f"Error joining conversation: {e}", exc_info=True)

    async def _leave_conversation(self, content):
        try:
            conversation_id = content.get("conversation_id")
            if not conversation_id or not conversation_includes_user(
                conversation_id, self.user.id
            ):
                return

            group_name = f"conversation_{conversation_id}"
            await self.channel_layer.group_discard(group_name, self.channel_name)
            self.joined_conversations.discard(conversation_id)
        except Exception as e:
            logger.error(f"Error leaving conversation: {e}", exc_info=True)

    async def _send_message(self, content):
        try:
            recipient_id = content.get("destinataire_id")
            text = (content.get("contenu") or "").strip()

            if not recipient_id or not text:
                await self.send_json(
                    {"type": "chat.error", "detail": "Message invalide."}
                )
                return

            conversation_id = build_conversation_id(self.user.id, int(recipient_id))

            if conversation_id not in self.joined_conversations:
                await self.channel_layer.group_add(
                    f"conversation_{conversation_id}", self.channel_name
                )
                self.joined_conversations.add(conversation_id)

            message_payload = await self._create_message(
                expediteur_id=self.user.id,
                destinataire_id=int(recipient_id),
                contenu=text,
                conversation_id=conversation_id,
            )

            await self.channel_layer.group_send(
                f"conversation_{conversation_id}",
                {
                    "type": "chat.message",
                    "message": message_payload,
                },
            )

            update_event = {
                "type": "chat.conversation_update",
                "conversation_id": conversation_id,
                "message": message_payload,
            }

            await self.channel_layer.group_send(f"user_{self.user.id}", update_event)
            await self.channel_layer.group_send(
                f"user_{int(recipient_id)}", update_event
            )
        except Exception as e:
            logger.error(f"Error sending message: {e}", exc_info=True)
            try:
                await self.send_json(
                    {"type": "chat.error", "detail": "Erreur lors de l'envoi."}
                )
            except Exception:
                pass

    async def _typing(self, content):
        try:
            conversation_id = content.get("conversation_id")
            if not conversation_id or not conversation_includes_user(
                conversation_id, self.user.id
            ):
                return

            if conversation_id not in self.joined_conversations:
                await self.channel_layer.group_add(
                    f"conversation_{conversation_id}", self.channel_name
                )
                self.joined_conversations.add(conversation_id)

            await self.channel_layer.group_send(
                f"conversation_{conversation_id}",
                {
                    "type": "chat.typing",
                    "conversation_id": conversation_id,
                    "user_id": self.user.id,
                    "is_typing": bool(content.get("is_typing", False)),
                },
            )
        except Exception as e:
            logger.error(f"Error sending typing indicator: {e}", exc_info=True)

    async def _mark_read(self, content):
        try:
            conversation_id = content.get("conversation_id")
            if not conversation_id or not conversation_includes_user(
                conversation_id, self.user.id
            ):
                return

            updated = await self._mark_messages_read(
                conversation_id=conversation_id, user_id=self.user.id
            )
            await self.send_json(
                {
                    "type": "chat.read_updated",
                    "conversation_id": conversation_id,
                    "updated": updated,
                }
            )
        except Exception as e:
            logger.error(f"Error marking messages as read: {e}", exc_info=True)

    async def chat_message(self, event):
        await self.send_json({"type": "chat.message", "message": event["message"]})

    async def chat_typing(self, event):
        if int(event["user_id"]) == int(self.user.id):
            return
        await self.send_json(
            {
                "type": "chat.typing",
                "conversation_id": event["conversation_id"],
                "user_id": event["user_id"],
                "is_typing": event["is_typing"],
            }
        )

    async def chat_conversation_update(self, event):
        await self.send_json(
            {
                "type": "chat.conversation_update",
                "conversation_id": event["conversation_id"],
                "message": event["message"],
            }
        )

    async def presence_status(self, event):
        await self.send_json(
            {
                "type": "presence.status",
                "user_id": event["user_id"],
                "is_online": event["is_online"],
            }
        )

    @database_sync_to_async
    def _create_message(self, expediteur_id: int, destinataire_id: int, contenu: str, conversation_id: str):
        message = Message.objects.create(
            expediteur_id=expediteur_id,
            destinataire_id=destinataire_id,
            contenu=contenu,
            conversation_id=conversation_id,
        )
        message = (
            Message.objects.filter(id=message.id)
            .select_related("expediteur", "destinataire")
            .first()
        )
        return MessageSerializer(message).data

    @database_sync_to_async
    def _mark_messages_read(self, conversation_id: str, user_id: int):
        return Message.objects.filter(
            conversation_id=conversation_id,
            destinataire_id=user_id,
            lu=False,
        ).update(lu=True)
