from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from immobilier.models import (
    Bail,
    Bien,
    CategorieBien,
    ClientInfo,
    Paiement,
    ProprietaireInfo,
    SousTypeBien,
    Utilisateur,
)
from immobilier.models.enums import StatutBailEnum, StatutPaiementEnum


class Sprint8BackendPaiementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner_user = Utilisateur.objects.create_user(
            username="owner-s8@example.com",
            email="owner-s8@example.com",
            password="OwnerPass123!",
        )
        self.owner_info = ProprietaireInfo.objects.create(utilisateur=self.owner_user)

        self.locataire_user = Utilisateur.objects.create_user(
            username="tenant-s8@example.com",
            email="tenant-s8@example.com",
            password="TenantPass123!",
        )
        self.locataire_info = ClientInfo.objects.create(utilisateur=self.locataire_user)

        self.other_user = Utilisateur.objects.create_user(
            username="other-s8@example.com",
            email="other-s8@example.com",
            password="OtherPass123!",
        )

        category = CategorieBien.objects.create(nom="Cat S8", slug="cat-s8")
        sous_type = SousTypeBien.objects.create(
            categorie=category,
            nom="Sous S8",
            slug="sous-s8",
        )

        self.bien = Bien.objects.create(
            proprietaire_info=self.owner_info,
            categorie=category,
            sous_type=sous_type,
            reference="S8-BIEN-001",
            adresse="8 rue test",
            quartier="Centre",
            ville="Lome",
            code_postal="00008",
            superficie=75,
            nb_pieces=3,
            loyer_hc=250000,
            charges=10000,
            depot_garantie=250000,
            prix_jour=14000,
            prix_mois=260000,
        )

        self.bail = Bail.objects.create(
            bien=self.bien,
            client_info=self.locataire_info,
            numero_bail="S8-BAIL-001",
            date_entree=date(2026, 2, 1),
            loyer_actuel=260000,
            depot_garantie=250000,
            statut=StatutBailEnum.EN_ATTENTE_PAIEMENT,
        )

        self.paiement = Paiement.objects.create(
            bail=self.bail,
            reference="S8-PAY-001",
            montant=260000,
            date_echeance=date(2026, 3, 5),
            statut=StatutPaiementEnum.EN_ATTENTE,
        )

    def test_locataire_can_list_his_loyers(self):
        self.client.force_authenticate(user=self.locataire_user)

        response = self.client.get("/api/paiements/mes-loyers")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["reference"], "S8-PAY-001")

    def test_locataire_can_simulate_mobile_money_payment(self):
        self.client.force_authenticate(user=self.locataire_user)

        response = self.client.post(
            f"/api/paiements/{self.paiement.id}/simulate-mobile-money",
            {"numero_telephone": "22997000000", "reseau": "MTN"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.paiement.refresh_from_db()
        self.bail.refresh_from_db()

        self.assertEqual(self.paiement.statut, StatutPaiementEnum.PAYE_A_L_ADMIN)
        self.assertIsNotNone(self.paiement.date_paiement)
        self.assertIn("Mobile Money", self.paiement.mode_paiement or "")
        self.assertEqual(self.bail.statut, StatutBailEnum.EN_COURS)

    def test_other_user_cannot_simulate_payment(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            f"/api/paiements/{self.paiement.id}/simulate-mobile-money",
            {"numero_telephone": "22997000000", "reseau": "Orange"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_locataire_can_download_facture_pdf(self):
        self.client.force_authenticate(user=self.locataire_user)

        response = self.client.get(f"/api/paiements/{self.paiement.id}/facture/download")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment; filename=", response["Content-Disposition"])
