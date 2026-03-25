from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from immobilier.models import (
    Bien,
    CategorieBien,
    DemandeAction,
    ProprietaireInfo,
    SousTypeBien,
    Utilisateur,
)
from immobilier.models.enums import StatutBienEnum, StatutDemandeEnum, TypeDemandeEnum


class Sprint5BackendApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner_user = Utilisateur.objects.create_user(
            username='owner-s5@example.com',
            email='owner-s5@example.com',
            password='OwnerPass123!',
            first_name='Owner',
            last_name='S5',
        )
        self.owner_info = ProprietaireInfo.objects.create(utilisateur=self.owner_user)

        self.client_user = Utilisateur.objects.create_user(
            username='client-s5@example.com',
            email='client-s5@example.com',
            password='ClientPass123!',
            first_name='Client',
            last_name='S5',
        )

        self.other_client_user = Utilisateur.objects.create_user(
            username='other-client-s5@example.com',
            email='other-client-s5@example.com',
            password='ClientPass123!',
            first_name='Other',
            last_name='Client',
        )

        self.categorie = CategorieBien.objects.create(nom='Maison S5', slug='maison-s5')
        self.sous_type = SousTypeBien.objects.create(
            categorie=self.categorie,
            nom='Villa S5',
            slug='villa-s5',
        )

        self.bien = Bien.objects.create(
            proprietaire_info=self.owner_info,
            categorie=self.categorie,
            sous_type=self.sous_type,
            reference='S5-BIEN-001',
            adresse='1 rue Sprint 5',
            quartier='Centre',
            ville='Lome',
            code_postal='00001',
            superficie=90,
            nb_pieces=4,
            loyer_hc=500000,
            charges=30000,
            depot_garantie=500000,
            prix_jour=25000,
            prix_mois=530000,
            statut=StatutBienEnum.VACANT,
            is_active=True,
        )

    def test_client_can_create_demande_action(self):
        self.client.force_authenticate(user=self.client_user)

        response = self.client.post(
            '/api/demandes-actions',
            {
                'bien': self.bien.id,
                'type_demande': TypeDemandeEnum.VISITE,
                'date_debut': '2026-05-10',
                'date_fin': '2026-05-10',
                'message': 'Je souhaite visiter ce bien.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['demandeur'], self.client_user.id)
        self.assertEqual(response.data['proprietaire'], self.owner_user.id)
        self.assertEqual(response.data['statut'], StatutDemandeEnum.EN_ATTENTE)

    def test_owner_cannot_create_demande_on_own_bien(self):
        self.client.force_authenticate(user=self.owner_user)

        response = self.client.post(
            '/api/demandes-actions',
            {
                'bien': self.bien.id,
                'type_demande': TypeDemandeEnum.VISITE,
                'date_debut': '2026-05-10',
                'date_fin': '2026-05-10',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('type_demande', response.data)

    def test_owner_can_accept_pending_demande(self):
        demande = DemandeAction.objects.create(
            bien=self.bien,
            demandeur=self.client_user,
            proprietaire=self.owner_user,
            type_demande=TypeDemandeEnum.LOCATION_DIRECTE,
            statut=StatutDemandeEnum.EN_ATTENTE,
            date_debut=date(2026, 6, 1),
            date_fin=date(2026, 7, 15),
            duree_jours=44,
            montant_total=300000,
        )

        self.client.force_authenticate(user=self.owner_user)
        response = self.client.patch(
            f'/api/demandes-actions/{demande.id}/decision',
            {
                'statut': StatutDemandeEnum.ACCEPTEE,
                'note_proprietaire': 'Profil valide.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, StatutDemandeEnum.ACCEPTEE)
        self.assertEqual(demande.traite_par_id, self.owner_user.id)

    def test_non_owner_cannot_decide_demande(self):
        demande = DemandeAction.objects.create(
            bien=self.bien,
            demandeur=self.client_user,
            proprietaire=self.owner_user,
            type_demande=TypeDemandeEnum.VISITE,
            statut=StatutDemandeEnum.EN_ATTENTE,
            date_debut=date(2026, 6, 1),
            date_fin=date(2026, 6, 1),
            duree_jours=1,
            montant_total=0,
        )

        self.client.force_authenticate(user=self.other_client_user)
        response = self.client.patch(
            f'/api/demandes-actions/{demande.id}/decision',
            {
                'statut': StatutDemandeEnum.REFUSEE,
                'motif_refus': 'Refus test',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 403)

    def test_demandeur_can_cancel_pending_demande(self):
        demande = DemandeAction.objects.create(
            bien=self.bien,
            demandeur=self.client_user,
            proprietaire=self.owner_user,
            type_demande=TypeDemandeEnum.PRIVATISATION,
            statut=StatutDemandeEnum.EN_ATTENTE,
            date_debut=date(2026, 6, 3),
            date_fin=date(2026, 6, 4),
            duree_jours=1,
            montant_total=0,
        )

        self.client.force_authenticate(user=self.client_user)
        response = self.client.delete(f'/api/demandes-actions/{demande.id}')

        self.assertEqual(response.status_code, 200)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, StatutDemandeEnum.ANNULEE)
