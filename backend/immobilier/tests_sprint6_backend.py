from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from immobilier.models import (
    Bail,
    Bien,
    CategorieBien,
    ClientInfo,
    DemandeAction,
    Depense,
    Paiement,
    ProprietaireInfo,
    SousTypeBien,
    Utilisateur,
)
from immobilier.models.enums import (
    StatutBailEnum,
    StatutBienEnum,
    StatutDemandeEnum,
    StatutPaiementEnum,
    TypeDemandeEnum,
)


class Sprint6BackendApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = Utilisateur.objects.create_user(
            username='admin-s6@example.com',
            email='admin-s6@example.com',
            password='AdminPass123!',
            is_staff=True,
            is_superuser=True,
        )

        self.owner_user = Utilisateur.objects.create_user(
            username='owner-s6@example.com',
            email='owner-s6@example.com',
            password='OwnerPass123!',
            first_name='Owner',
            last_name='Sprint6',
        )
        self.owner_info = ProprietaireInfo.objects.create(utilisateur=self.owner_user)

        self.other_owner_user = Utilisateur.objects.create_user(
            username='owner2-s6@example.com',
            email='owner2-s6@example.com',
            password='OwnerPass123!',
        )
        self.other_owner_info = ProprietaireInfo.objects.create(utilisateur=self.other_owner_user)

        self.locataire_user = Utilisateur.objects.create_user(
            username='tenant-s6@example.com',
            email='tenant-s6@example.com',
            password='TenantPass123!',
            first_name='Tenant',
            last_name='Sprint6',
        )
        self.locataire_info = ClientInfo.objects.create(utilisateur=self.locataire_user)

        self.category = CategorieBien.objects.create(nom='Cat S6', slug='cat-s6')
        self.sous_type = SousTypeBien.objects.create(categorie=self.category, nom='Sous S6', slug='sous-s6')

        self.bien_owner = Bien.objects.create(
            proprietaire_info=self.owner_info,
            categorie=self.category,
            sous_type=self.sous_type,
            reference='S6-BIEN-001',
            adresse='1 rue S6',
            quartier='Centre',
            ville='Lome',
            code_postal='00001',
            superficie=60,
            nb_pieces=2,
            loyer_hc=400000,
            charges=20000,
            depot_garantie=400000,
            prix_jour=15000,
            prix_mois=420000,
            statut=StatutBienEnum.VACANT,
            is_active=True,
        )

        self.bien_other = Bien.objects.create(
            proprietaire_info=self.other_owner_info,
            categorie=self.category,
            sous_type=self.sous_type,
            reference='S6-BIEN-002',
            adresse='2 rue S6',
            quartier='Nord',
            ville='Lome',
            code_postal='00002',
            superficie=45,
            nb_pieces=2,
            loyer_hc=300000,
            charges=15000,
            depot_garantie=300000,
            prix_jour=12000,
            prix_mois=315000,
            statut=StatutBienEnum.VACANT,
            is_active=True,
        )

        self.bail = Bail.objects.create(
            bien=self.bien_owner,
            client_info=self.locataire_info,
            numero_bail='S6-BAIL-001',
            date_entree=date(2026, 1, 1),
            loyer_actuel=420000,
            depot_garantie=400000,
            statut=StatutBailEnum.EN_COURS,
        )

        self.paye = Paiement.objects.create(
            bail=self.bail,
            reference='S6-PAY-001',
            montant=100000,
            date_echeance=date(2026, 2, 5),
            statut=StatutPaiementEnum.PAYE,
        )
        self.impaye = Paiement.objects.create(
            bail=self.bail,
            reference='S6-PAY-002',
            montant=50000,
            date_echeance=date(2026, 3, 5),
            statut=StatutPaiementEnum.IMPAYE,
        )
        self.en_attente = Paiement.objects.create(
            bail=self.bail,
            reference='S6-PAY-003',
            montant=25000,
            date_echeance=date(2026, 4, 5),
            statut=StatutPaiementEnum.EN_ATTENTE,
        )

        self.depense_owner = Depense.objects.create(
            proprietaire_info=self.owner_info,
            bien=self.bien_owner,
            categorie='Maintenance',
            libelle='Reparation plomberie',
            montant=30000,
            date_depense=date(2026, 2, 10),
            numero_facture='FAC-S6-001',
        )
        self.depense_other = Depense.objects.create(
            proprietaire_info=self.other_owner_info,
            bien=self.bien_other,
            categorie='Charges',
            libelle='Nettoyage',
            montant=15000,
            date_depense=date(2026, 2, 11),
            numero_facture='FAC-S6-002',
        )

        DemandeAction.objects.create(
            bien=self.bien_other,
            demandeur=self.owner_user,
            proprietaire=self.other_owner_user,
            type_demande=TypeDemandeEnum.PRIVATISATION,
            statut=StatutDemandeEnum.EN_ATTENTE,
            date_debut=date(2026, 5, 1),
            date_fin=date(2026, 5, 2),
            duree_jours=1,
            montant_total=60000,
        )
        DemandeAction.objects.create(
            bien=self.bien_owner,
            demandeur=self.locataire_user,
            proprietaire=self.owner_user,
            type_demande=TypeDemandeEnum.LOCATION_DIRECTE,
            statut=StatutDemandeEnum.ACCEPTEE,
            date_debut=date(2026, 6, 1),
            date_fin=date(2026, 7, 1),
            duree_jours=30,
            montant_total=200000,
        )

    def test_admin_finance_stats_returns_expected_totals(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/finances/stats')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data['loyers_attendus']), 175000.0)
        self.assertEqual(float(response.data['loyers_payes']), 100000.0)
        self.assertEqual(float(response.data['impayes']), 50000.0)
        self.assertEqual(float(response.data['en_attente']), 25000.0)
        self.assertEqual(float(response.data['total_depenses']), 45000.0)
        self.assertEqual(response.data['nombre_paiements'], 3)
        self.assertEqual(response.data['nombre_depenses'], 2)

    def test_non_admin_cannot_access_admin_finance_stats(self):
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get('/api/admin/finances/stats')
        self.assertEqual(response.status_code, 403)

    def test_admin_can_filter_paiements(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/admin/finances/paiements?statut=IMPAYE')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reference'], 'S6-PAY-002')

        response = self.client.get(f'/api/admin/finances/paiements?bien_id={self.bien_owner.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)

        response = self.client.get('/api/admin/finances/paiements?q=tenant-s6@example.com')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)

    def test_admin_can_filter_depenses(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/admin/finances/depenses?categorie=maintenance')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numero_facture'], 'FAC-S6-001')

        response = self.client.get(f'/api/admin/finances/depenses?bien_id={self.bien_other.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numero_facture'], 'FAC-S6-002')

    def test_admin_can_get_paiement_and_depense_detail(self):
        self.client.force_authenticate(user=self.admin)

        paiement_response = self.client.get(f'/api/admin/finances/paiements/{self.paye.id}')
        self.assertEqual(paiement_response.status_code, 200)
        self.assertEqual(paiement_response.data['reference'], 'S6-PAY-001')

        depense_response = self.client.get(f'/api/admin/finances/depenses/{self.depense_owner.id}')
        self.assertEqual(depense_response.status_code, 200)
        self.assertEqual(depense_response.data['numero_facture'], 'FAC-S6-001')

    def test_admin_finance_profile_user_totals(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(f'/api/admin/finances/profils/{self.owner_user.id}')
        self.assertEqual(response.status_code, 200)

        totals = response.data['totals']
        self.assertEqual(float(totals['proprietaire_loyers_percus']), 100000.0)
        self.assertEqual(float(totals['proprietaire_loyers_impayes']), 75000.0)
        self.assertEqual(float(totals['proprietaire_total_depenses']), 30000.0)

    def test_current_user_finance_returns_summary_and_history(self):
        self.client.force_authenticate(user=self.owner_user)

        response = self.client.get('/api/profile/finances')
        self.assertEqual(response.status_code, 200)

        summary = response.data['summary']
        self.assertEqual(float(summary['depenses_total']), 60000.0)
        self.assertEqual(float(summary['revenus_total']), 200000.0)
        self.assertEqual(summary['nombre_depenses'], 1)
        self.assertEqual(summary['nombre_revenus'], 1)
        self.assertEqual(len(response.data['history']), 2)