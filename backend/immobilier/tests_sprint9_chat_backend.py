from django.test import TestCase
from rest_framework.test import APIClient

from immobilier.chat_utils import build_conversation_id
from immobilier.models import Message, Utilisateur


class Sprint9ChatBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin_user = Utilisateur.objects.create_user(
            username="admin-chat@example.com",
            email="admin-chat@example.com",
            password="AdminPass123!",
            is_staff=True,
            is_superuser=True,
            first_name="Admin",
            last_name="Chat",
        )

        self.user_a = Utilisateur.objects.create_user(
            username="alice-chat@example.com",
            email="alice-chat@example.com",
            password="AlicePass123!",
            first_name="Alice",
            last_name="User",
        )

        self.user_b = Utilisateur.objects.create_user(
            username="bob-chat@example.com",
            email="bob-chat@example.com",
            password="BobPass123!",
            first_name="Bob",
            last_name="User",
        )

        self.user_c = Utilisateur.objects.create_user(
            username="charlie-chat@example.com",
            email="charlie-chat@example.com",
            password="CharliePass123!",
            first_name="Charlie",
            last_name="User",
        )

        self.conv_ab = build_conversation_id(self.user_a.id, self.user_b.id)
        self.conv_ac = build_conversation_id(self.user_a.id, self.user_c.id)

        self.msg_ab_1 = Message.objects.create(
            expediteur=self.user_a,
            destinataire=self.user_b,
            conversation_id=self.conv_ab,
            contenu="Bonjour Bob",
            lu=False,
        )
        self.msg_ab_2 = Message.objects.create(
            expediteur=self.user_b,
            destinataire=self.user_a,
            conversation_id=self.conv_ab,
            contenu="Salut Alice",
            lu=False,
        )
        Message.objects.create(
            expediteur=self.user_c,
            destinataire=self.user_a,
            conversation_id=self.conv_ac,
            contenu="Hello Alice",
            lu=False,
        )

    def test_user_can_list_own_conversations(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get("/api/chat/conversations")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        conv_ids = {item["conversation_id"] for item in response.data}
        self.assertIn(self.conv_ab, conv_ids)
        self.assertIn(self.conv_ac, conv_ids)

    def test_user_can_get_messages_only_for_his_conversation(self):
        self.client.force_authenticate(user=self.user_a)

        ok_response = self.client.get(f"/api/chat/conversations/{self.conv_ab}/messages")
        self.assertEqual(ok_response.status_code, 200)
        self.assertEqual(len(ok_response.data), 2)

        forbidden_conv = build_conversation_id(self.user_b.id, self.user_c.id)
        ko_response = self.client.get(f"/api/chat/conversations/{forbidden_conv}/messages")
        self.assertEqual(ko_response.status_code, 403)

    def test_mark_read_marks_only_current_user_inbox(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.post(f"/api/chat/conversations/{self.conv_ab}/read")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated"], 1)

        self.msg_ab_1.refresh_from_db()
        self.msg_ab_2.refresh_from_db()

        # Alice -> Bob remains unread for Bob's inbox
        self.assertFalse(self.msg_ab_1.lu)
        # Bob -> Alice becomes read for Alice's inbox
        self.assertTrue(self.msg_ab_2.lu)

    def test_chat_contacts_for_regular_user_contains_admin_and_related_users(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get("/api/chat/contacts")

        self.assertEqual(response.status_code, 200)
        contact_ids = {item["id"] for item in response.data}

        self.assertIn(self.admin_user.id, contact_ids)
        self.assertIn(self.user_b.id, contact_ids)
        self.assertIn(self.user_c.id, contact_ids)
        self.assertNotIn(self.user_a.id, contact_ids)

    def test_chat_contacts_for_admin_lists_active_users_except_self(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/chat/contacts")

        self.assertEqual(response.status_code, 200)
        contact_ids = {item["id"] for item in response.data}

        self.assertIn(self.user_a.id, contact_ids)
        self.assertIn(self.user_b.id, contact_ids)
        self.assertIn(self.user_c.id, contact_ids)
        self.assertNotIn(self.admin_user.id, contact_ids)
