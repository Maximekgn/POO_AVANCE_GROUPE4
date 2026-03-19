from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from immobilier.models import CategorieBien, SousTypeBien, Proprietaire, Bien, Utilisateur
from immobilier.models.enums import RoleEnum


class CategoriesApiTests(APITestCase):
	@classmethod
	def setUpTestData(cls):
		cls.admin_user = Utilisateur.objects.create_user(
			username='admin@test.com',
			email='admin@test.com',
			password='AdminPass123!',
			role=RoleEnum.ADMIN,
			is_staff=True,
			is_superuser=True,
		)
		cls.client_user = Utilisateur.objects.create_user(
			username='client@test.com',
			email='client@test.com',
			password='ClientPass123!',
			role=RoleEnum.CLIENT,
		)

		cls.proprietaire = Proprietaire.objects.create(
			username='prop@test.com',
			email='prop@test.com',
			role=RoleEnum.PROPRIETAIRE,
		)
		cls.proprietaire.set_password('PropPass123!')
		cls.proprietaire.save()

	def test_admin_can_create_categorie(self):
		self.client.force_authenticate(user=self.admin_user)
		response = self.client.post(
			reverse('immobilier:categories-list-create'),
			{'nom': 'Appartement', 'ordre': 2, 'actif': True},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['nom'], 'Appartement')
		self.assertEqual(response.data['slug'], 'appartement')

	def test_non_admin_cannot_create_categorie(self):
		self.client.force_authenticate(user=self.client_user)
		response = self.client.post(
			reverse('immobilier:categories-list-create'),
			{'nom': 'Maison', 'ordre': 1, 'actif': True},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_categories_are_listed_by_order_then_name(self):
		CategorieBien.objects.create(nom='Villa', slug='villa', ordre=2)
		CategorieBien.objects.create(nom='Appartement', slug='appartement', ordre=1)
		CategorieBien.objects.create(nom='Atelier', slug='atelier', ordre=1)

		self.client.force_authenticate(user=self.client_user)
		response = self.client.get(reverse('immobilier:categories-list-create'))

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		noms = [item['nom'] for item in response.data]
		self.assertEqual(noms, ['Appartement', 'Atelier', 'Villa'])

	def test_sous_types_can_be_filtered_by_categorie(self):
		cat_a = CategorieBien.objects.create(nom='Appartement', slug='appartement', ordre=1)
		cat_b = CategorieBien.objects.create(nom='Maison', slug='maison', ordre=2)

		SousTypeBien.objects.create(categorie=cat_a, nom='Studio', slug='studio', ordre=1)
		SousTypeBien.objects.create(categorie=cat_b, nom='Duplex', slug='duplex', ordre=1)

		self.client.force_authenticate(user=self.client_user)
		response = self.client.get(f"{reverse('immobilier:sous-types-list-create')}?categorie={cat_a.id}")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]['nom'], 'Studio')

	def test_delete_categorie_blocked_when_linked_bien_exists(self):
		categorie = CategorieBien.objects.create(nom='Maison', slug='maison', ordre=1)
		sous_type = SousTypeBien.objects.create(categorie=categorie, nom='Villa', slug='villa', ordre=1)

		Bien.objects.create(
			proprietaire=self.proprietaire,
			categorie=categorie,
			sous_type=sous_type,
			reference='BIEN-001',
			adresse='12 rue test',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('85.00'),
			nb_pieces=3,
			meuble=False,
			loyer_hc=Decimal('350000.00'),
			charges=Decimal('25000.00'),
			depot_garantie=Decimal('350000.00'),
			date_creation=date.today(),
		)

		self.client.force_authenticate(user=self.admin_user)
		response = self.client.delete(reverse('immobilier:categories-detail', kwargs={'pk': categorie.id}))

		self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
		self.assertIn('Suppression impossible', response.data['error'])

	def test_delete_sous_type_blocked_when_linked_bien_exists(self):
		categorie = CategorieBien.objects.create(nom='Appartement', slug='appartement', ordre=1)
		sous_type = SousTypeBien.objects.create(categorie=categorie, nom='T2', slug='t2', ordre=1)

		Bien.objects.create(
			proprietaire=self.proprietaire,
			categorie=categorie,
			sous_type=sous_type,
			reference='BIEN-002',
			adresse='45 avenue test',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('65.00'),
			nb_pieces=2,
			meuble=True,
			loyer_hc=Decimal('250000.00'),
			charges=Decimal('15000.00'),
			depot_garantie=Decimal('250000.00'),
			date_creation=date.today(),
		)

		self.client.force_authenticate(user=self.admin_user)
		response = self.client.delete(reverse('immobilier:sous-types-detail', kwargs={'pk': sous_type.id}))

		self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
		self.assertIn('Suppression impossible', response.data['error'])
