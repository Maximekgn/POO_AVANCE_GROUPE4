from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from immobilier.models import (
    Bail,
    Bien,
    CategorieBien,
    ClientInfo,
    Message,
    Paiement,
    ProprietaireInfo,
    RGPDAnonymizationLog,
    SousTypeBien,
    Utilisateur,
)
from immobilier.models.enums import StatutBailEnum, StatutPaiementEnum


class Sprint4BackendApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = Utilisateur.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='AdminPass123!',
            is_staff=True,
            is_superuser=True,
        )

        self.owner_user = Utilisateur.objects.create_user(
            username='owner@example.com',
            email='owner@example.com',
            password='OwnerPass123!',
            first_name='Owner',
            last_name='User',
        )
        self.owner_info = ProprietaireInfo.objects.create(utilisateur=self.owner_user)

        self.other_owner_user = Utilisateur.objects.create_user(
            username='other-owner@example.com',
            email='other-owner@example.com',
            password='OwnerPass123!',
        )
        self.other_owner_info = ProprietaireInfo.objects.create(utilisateur=self.other_owner_user)

        self.categorie = CategorieBien.objects.create(nom='Appartement', slug='appartement')
        self.sous_type = SousTypeBien.objects.create(
            categorie=self.categorie,
            nom='T2',
            slug='t2',
        )

        self.bien_owner = Bien.objects.create(
            proprietaire_info=self.owner_info,
            categorie=self.categorie,
            sous_type=self.sous_type,
            reference='BIEN-OWNER-001',
            adresse='12 rue Test',
            quartier='Centre',
            ville='Lyon',
            code_postal='69001',
            superficie=55,
            nb_pieces=2,
            loyer_hc=700,
            charges=80,
            depot_garantie=700,
            prix_jour=70,
            prix_mois=780,
        )

        self.bien_other = Bien.objects.create(
            proprietaire_info=self.other_owner_info,
            categorie=self.categorie,
            sous_type=self.sous_type,
            reference='BIEN-OTHER-001',
            adresse='33 avenue Demo',
            quartier='Nord',
            ville='Lyon',
            code_postal='69002',
            superficie=42,
            nb_pieces=2,
            loyer_hc=650,
            charges=60,
            depot_garantie=650,
            prix_jour=60,
            prix_mois=710,
        )

        self.bail_owner = Bail.objects.create(
            bien=self.bien_owner,
            numero_bail='BAIL-OWNER-001',
            date_entree=date(2026, 1, 1),
            loyer_actuel=780,
            depot_garantie=700,
            statut=StatutBailEnum.BROUILLON,
        )

        self.locataire_user = Utilisateur.objects.create_user(
            username='locataire@example.com',
            email='locataire@example.com',
            password='LocPass123!',
            first_name='Lola',
            last_name='Tenant',
            telephone='0102030405',
        )
        self.locataire_info = ClientInfo.objects.create(
            utilisateur=self.locataire_user,
            profession='Dev',
            numero_piece='ABC123',
            revenus_mensuels=2500,
        )

    def test_onboarding_owner_can_attach_own_bail(self):
        self.client.force_authenticate(user=self.owner_user)

        response = self.client.post(
            '/api/locataires/onboarding',
            {
                'email': 'new-tenant@example.com',
                'first_name': 'Nina',
                'last_name': 'Tenant',
                'telephone': '0600000000',
                'profession': 'Designer',
                'numero_piece': 'PIECE-NEW-1',
                'revenus_mensuels': '3200.00',
                'bail_id': self.bail_owner.id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.bail_owner.refresh_from_db()
        self.assertIsNotNone(self.bail_owner.client_info_id)
        self.assertEqual(self.bail_owner.statut, StatutBailEnum.EN_ATTENTE_SIGNATURE)

    def test_onboarding_owner_cannot_attach_other_owner_bail(self):
        foreign_bail = Bail.objects.create(
            bien=self.bien_other,
            numero_bail='BAIL-OTHER-001',
            date_entree=date(2026, 2, 1),
            loyer_actuel=710,
            depot_garantie=650,
            statut=StatutBailEnum.BROUILLON,
        )

        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            '/api/locataires/onboarding',
            {
                'email': 'new-tenant2@example.com',
                'first_name': 'Nina',
                'last_name': 'Tenant',
                'bail_id': foreign_bail.id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('bail_id', response.data)

    def test_locataire_history_owner_visibility(self):
        self.bail_owner.client_info = self.locataire_info
        self.bail_owner.statut = StatutBailEnum.EN_COURS
        self.bail_owner.save(update_fields=['client_info', 'statut'])

        Paiement.objects.create(
            bail=self.bail_owner,
            reference='PAY-001',
            montant=780,
            date_echeance=date(2026, 3, 5),
            statut=StatutPaiementEnum.PAYE,
        )
        Paiement.objects.create(
            bail=self.bail_owner,
            reference='PAY-002',
            montant=780,
            date_echeance=date(2026, 4, 5),
            statut=StatutPaiementEnum.IMPAYE,
        )

        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get(f'/api/locataires/{self.locataire_info.id}/historique')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['resume']['baux_actifs'], 1)
        self.assertEqual(response.data['resume']['paiements_impayes'], 1)
        self.assertEqual(len(response.data['historique_baux']), 1)

    def test_admin_can_anonymize_user_and_create_log(self):
        Message.objects.create(
            expediteur=self.locataire_user,
            destinataire=self.owner_user,
            conversation_id='conv-1',
            objet='Question',
            contenu='Mon message sensible',
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/admin/users/{self.locataire_user.id}/anonymize',
            {'motif': 'Demande utilisateur RGPD'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.locataire_user.refresh_from_db()

        self.assertTrue(self.locataire_user.email.startswith('anonymized+'))
        self.assertFalse(self.locataire_user.is_active)
        self.assertEqual(
            RGPDAnonymizationLog.objects.filter(cible_utilisateur=self.locataire_user).count(),
            1,
        )

        msg = Message.objects.get(conversation_id='conv-1')
        self.assertEqual(msg.contenu, '[ANONYMIZED]')
        self.assertEqual(msg.objet, '[ANONYMIZED]')
