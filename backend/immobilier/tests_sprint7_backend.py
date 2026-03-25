from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from immobilier.models import Bail, Bien, CategorieBien, ClientInfo, ProprietaireInfo, SousTypeBien, Utilisateur
from immobilier.models.enums import StatutBailEnum


class Sprint7BackendApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner_user = Utilisateur.objects.create_user(
            username='owner-s7@example.com',
            email='owner-s7@example.com',
            password='OwnerPass123!',
        )
        self.owner_info = ProprietaireInfo.objects.create(utilisateur=self.owner_user)

        self.client_user = Utilisateur.objects.create_user(
            username='client-s7@example.com',
            email='client-s7@example.com',
            password='ClientPass123!',
        )
        self.client_info = ClientInfo.objects.create(utilisateur=self.client_user)

        self.other_user = Utilisateur.objects.create_user(
            username='other-s7@example.com',
            email='other-s7@example.com',
            password='OtherPass123!',
        )

        category = CategorieBien.objects.create(nom='Cat S7', slug='cat-s7')
        sous_type = SousTypeBien.objects.create(categorie=category, nom='Sous S7', slug='sous-s7')
        bien = Bien.objects.create(
            proprietaire_info=self.owner_info,
            categorie=category,
            sous_type=sous_type,
            reference='S7-BIEN-001',
            adresse='7 rue test',
            quartier='Centre',
            ville='Lome',
            code_postal='00007',
            superficie=70,
            nb_pieces=3,
            loyer_hc=250000,
            charges=15000,
            depot_garantie=250000,
            prix_jour=12000,
            prix_mois=265000,
        )

        self.bail = Bail.objects.create(
            bien=bien,
            client_info=self.client_info,
            numero_bail='S7-BAIL-001',
            date_entree=date(2026, 1, 1),
            loyer_actuel=265000,
            depot_garantie=250000,
            statut=StatutBailEnum.BROUILLON,
        )

    def test_owner_can_list_his_bails(self):
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get('/api/baux')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.bail.id)

    def test_non_participant_cannot_access_bail_detail(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(f'/api/baux/{self.bail.id}')
        self.assertEqual(response.status_code, 403)

    def test_owner_sign_sets_waiting_signature_status(self):
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(f'/api/baux/{self.bail.id}/signer', {'image_signature_url': 'https://example.com/sign1.png'}, format='json')
        self.assertEqual(response.status_code, 200)

        self.bail.refresh_from_db()
        self.assertIsNotNone(self.bail.date_signature_proprietaire)
        self.assertEqual(self.bail.statut, StatutBailEnum.EN_ATTENTE_SIGNATURE)

    def test_second_signature_activates_bail(self):
        self.client.force_authenticate(user=self.owner_user)
        self.client.post(f'/api/baux/{self.bail.id}/signer', {'image_signature_url': 'https://example.com/sign-owner.png'}, format='json')

        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(f'/api/baux/{self.bail.id}/signer', {'image_signature_url': 'https://example.com/sign-client.png'}, format='json')
        self.assertEqual(response.status_code, 200)

        self.bail.refresh_from_db()
        self.assertIsNotNone(self.bail.date_signature_client)
        self.assertEqual(self.bail.statut, StatutBailEnum.EN_COURS)

    def test_non_participant_cannot_sign_bail(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(f'/api/baux/{self.bail.id}/signer', {}, format='json')
        self.assertEqual(response.status_code, 403)