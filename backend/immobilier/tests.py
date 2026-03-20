from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from immobilier.models import CategorieBien, SousTypeBien, ProprietaireInfo, Bien, Utilisateur, Role
from immobilier.models.enums import TypeRoleEnum


class CategoriesApiTests(APITestCase):
	@classmethod
	def setUpTestData(cls):
		cls.admin_user = Utilisateur.objects.create_user(
			username='admin@test.com',
			email='admin@test.com',
			password='AdminPass123!',
			is_staff=True,
			is_superuser=True,
		)
		admin_role, _ = Role.objects.get_or_create(nom=TypeRoleEnum.ADMIN)
		cls.admin_user.roles.add(admin_role)
		
		cls.client_user = Utilisateur.objects.create_user(
			username='client@test.com',
			email='client@test.com',
			password='ClientPass123!',
		)
		client_role, _ = Role.objects.get_or_create(nom=TypeRoleEnum.CLIENT)
		cls.client_user.roles.add(client_role)

		cls.proprietaire_user = Utilisateur.objects.create_user(
			username='prop@test.com',
			email='prop@test.com',
			password='PropPass123!',
		)
		proprietaire_role, _ = Role.objects.get_or_create(nom=TypeRoleEnum.PROPRIETAIRE)
		cls.proprietaire_user.roles.add(proprietaire_role)
		cls.proprietaire = ProprietaireInfo.objects.create(utilisateur=cls.proprietaire_user)

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
		categorie = CategorieBien.objects.create(nom='Appartement', slug='appartement-cat', ordre=1)
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


class BiensApiTests(APITestCase):
	@classmethod
	def setUpTestData(cls):
		cls.admin_user = Utilisateur.objects.create_user(
			username='admin2@test.com',
			email='admin2@test.com',
			password='AdminPass123!',
			role=RoleEnum.ADMIN,
			is_staff=True,
			is_superuser=True,
		)
		cls.client_user = Utilisateur.objects.create_user(
			username='client2@test.com',
			email='client2@test.com',
			password='ClientPass123!',
			role=RoleEnum.CLIENT,
		)

		cls.proprietaire_a = Proprietaire.objects.create(
			username='prop_a@test.com',
			email='prop_a@test.com',
		)
		cls.proprietaire_a.set_password('PropPass123!')
		cls.proprietaire_a.save()

		cls.proprietaire_b = Proprietaire.objects.create(
			username='prop_b@test.com',
			email='prop_b@test.com',
		)
		cls.proprietaire_b.set_password('PropPass123!')
		cls.proprietaire_b.save()

		cls.categorie = CategorieBien.objects.create(nom='Appartement', slug='appartement', ordre=1)
		cls.sous_type = SousTypeBien.objects.create(categorie=cls.categorie, nom='Studio', slug='studio', ordre=1)

	def _bien_payload(self, reference='BIEN-100'):
		return {
			'reference': reference,
			'categorie': self.categorie.id,
			'sous_type': self.sous_type.id,
			'adresse': '10 rue du test',
			'ville': 'Lome',
			'code_postal': '00000',
			'description': 'Bien de test',
			'superficie': '55.50',
			'nb_pieces': 2,
			'etage': 1,
			'meuble': True,
			'loyer_hc': '200000.00',
			'charges': '15000.00',
			'depot_garantie': '200000.00',
			'statut': 'VACANT',
		}

	def test_proprietaire_can_create_bien(self):
		self.client.force_authenticate(user=self.proprietaire_a)
		response = self.client.post(
			reverse('immobilier:biens-list-create'),
			self._bien_payload('BIEN-101'),
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['proprietaire'], self.proprietaire_a.id)

	def test_client_cannot_create_bien(self):
		self.client.force_authenticate(user=self.client_user)
		response = self.client.post(
			reverse('immobilier:biens-list-create'),
			self._bien_payload('BIEN-102'),
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_biens_list_supports_filters(self):
		Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-103',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 1',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('60.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('210000.00'),
			charges=Decimal('10000.00'),
			depot_garantie=Decimal('210000.00'),
			statut='VACANT',
		)
		Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-104',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 2',
			ville='Kara',
			code_postal='11111',
			superficie=Decimal('65.00'),
			nb_pieces=3,
			meuble=False,
			loyer_hc=Decimal('230000.00'),
			charges=Decimal('12000.00'),
			depot_garantie=Decimal('230000.00'),
			statut='LOUE',
		)

		self.client.force_authenticate(user=self.client_user)
		response = self.client.get(f"{reverse('immobilier:biens-list-create')}?statut=VACANT&ville=lome")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]['reference'], 'BIEN-103')

	def test_proprietaire_cannot_update_other_owner_bien(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-105',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 3',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('70.00'),
			nb_pieces=3,
			meuble=False,
			loyer_hc=Decimal('240000.00'),
			charges=Decimal('12000.00'),
			depot_garantie=Decimal('240000.00'),
		)

		self.client.force_authenticate(user=self.proprietaire_b)
		response = self.client.patch(
			reverse('immobilier:biens-detail', kwargs={'pk': bien.id}),
			{'ville': 'Atakpame'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_owner_can_add_and_list_photos_for_bien(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-106',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 4',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('48.00'),
			nb_pieces=1,
			meuble=False,
			loyer_hc=Decimal('180000.00'),
			charges=Decimal('10000.00'),
			depot_garantie=Decimal('180000.00'),
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		create_response = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{
				'description': 'Facade principale',
				'url': 'https://example.com/photo1.jpg',
				'principale': True,
				'ordre': 1,
			},
			format='json',
		)

		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		list_response = self.client.get(reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}))
		self.assertEqual(list_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(list_response.data), 1)
		self.assertEqual(list_response.data[0]['description'], 'Facade principale')

	def test_non_owner_cannot_delete_photo(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-107',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 5',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('52.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('190000.00'),
			charges=Decimal('10000.00'),
			depot_garantie=Decimal('190000.00'),
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		create_response = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{
				'description': 'Salon',
				'url': 'https://example.com/photo2.jpg',
				'principale': False,
				'ordre': 2,
			},
			format='json',
		)
		photo_id = create_response.data['id']

		self.client.force_authenticate(user=self.proprietaire_b)
		delete_response = self.client.delete(reverse('immobilier:photos-detail', kwargs={'pk': photo_id}))

		self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

	def test_creating_new_main_photo_unsets_previous_main(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-112',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 10',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('63.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('250000.00'),
			charges=Decimal('12000.00'),
			depot_garantie=Decimal('250000.00'),
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{
				'description': 'Photo 1',
				'url': 'https://example.com/photo-main-1.jpg',
				'principale': True,
				'ordre': 1,
			},
			format='json',
		)

		response = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{
				'description': 'Photo 2',
				'url': 'https://example.com/photo-main-2.jpg',
				'principale': True,
				'ordre': 2,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(bien.photos.filter(principale=True).count(), 1)
		self.assertEqual(bien.photos.get(principale=True).description, 'Photo 2')

	def test_updating_photo_as_main_unsets_other_main(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-113',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 11',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('64.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('260000.00'),
			charges=Decimal('12000.00'),
			depot_garantie=Decimal('260000.00'),
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		first = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{
				'description': 'Photo A',
				'url': 'https://example.com/photo-a.jpg',
				'principale': True,
				'ordre': 1,
			},
			format='json',
		)
		second = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{
				'description': 'Photo B',
				'url': 'https://example.com/photo-b.jpg',
				'principale': False,
				'ordre': 2,
			},
			format='json',
		)

		response = self.client.patch(
			reverse('immobilier:photos-detail', kwargs={'pk': second.data['id']}),
			{'principale': True},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(bien.photos.filter(principale=True).count(), 1)
		self.assertEqual(bien.photos.get(principale=True).id, second.data['id'])

	def test_owner_can_reorder_photos(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-114',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 12',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('66.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('270000.00'),
			charges=Decimal('12000.00'),
			depot_garantie=Decimal('270000.00'),
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		photo_1 = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{'description': 'P1', 'url': 'https://example.com/p1.jpg', 'ordre': 1},
			format='json',
		)
		photo_2 = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{'description': 'P2', 'url': 'https://example.com/p2.jpg', 'ordre': 2},
			format='json',
		)
		photo_3 = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{'description': 'P3', 'url': 'https://example.com/p3.jpg', 'ordre': 3},
			format='json',
		)

		response = self.client.patch(
			reverse('immobilier:bien-photos-reorder', kwargs={'bien_id': bien.id}),
			{
				'photos': [
					{'id': photo_1.data['id'], 'ordre': 3},
					{'id': photo_2.data['id'], 'ordre': 1},
					{'id': photo_3.data['id'], 'ordre': 2},
				]
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		ordered_ids = list(bien.photos.order_by('ordre', 'id').values_list('id', flat=True))
		self.assertEqual(ordered_ids, [photo_2.data['id'], photo_3.data['id'], photo_1.data['id']])

	def test_non_owner_cannot_reorder_photos(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-115',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 13',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('67.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('280000.00'),
			charges=Decimal('12000.00'),
			depot_garantie=Decimal('280000.00'),
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		photo = self.client.post(
			reverse('immobilier:bien-photos-list-create', kwargs={'bien_id': bien.id}),
			{'description': 'P1', 'url': 'https://example.com/p11.jpg', 'ordre': 1},
			format='json',
		)

		self.client.force_authenticate(user=self.proprietaire_b)
		response = self.client.patch(
			reverse('immobilier:bien-photos-reorder', kwargs={'bien_id': bien.id}),
			{'photos': [{'id': photo.data['id'], 'ordre': 2}]},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_admin_can_validate_pending_bien(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-108',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 6',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('58.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('220000.00'),
			charges=Decimal('10000.00'),
			depot_garantie=Decimal('220000.00'),
			statut='EN_ATTENTE_VALIDATION',
		)

		self.client.force_authenticate(user=self.admin_user)
		response = self.client.patch(
			reverse('immobilier:biens-statut-update', kwargs={'pk': bien.id}),
			{'statut': 'VACANT'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		bien.refresh_from_db()
		self.assertEqual(bien.statut, 'VACANT')

	def test_owner_cannot_validate_pending_bien(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-109',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 7',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('59.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('220000.00'),
			charges=Decimal('10000.00'),
			depot_garantie=Decimal('220000.00'),
			statut='EN_ATTENTE_VALIDATION',
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		response = self.client.patch(
			reverse('immobilier:biens-statut-update', kwargs={'pk': bien.id}),
			{'statut': 'VACANT'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_owner_can_change_status_after_validation(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-110',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 8',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('61.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('230000.00'),
			charges=Decimal('11000.00'),
			depot_garantie=Decimal('230000.00'),
			statut='VACANT',
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		response = self.client.patch(
			reverse('immobilier:biens-statut-update', kwargs={'pk': bien.id}),
			{'statut': 'LOUE'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		bien.refresh_from_db()
		self.assertEqual(bien.statut, 'LOUE')

	def test_client_cannot_change_bien_status(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-111',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 9',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('62.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('240000.00'),
			charges=Decimal('11000.00'),
			depot_garantie=Decimal('240000.00'),
			statut='VACANT',
		)

		self.client.force_authenticate(user=self.client_user)
		response = self.client.patch(
			reverse('immobilier:biens-statut-update', kwargs={'pk': bien.id}),
			{'statut': 'LOUE'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_admin_cannot_set_vacant_back_to_pending_validation(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-116',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 14',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('68.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('290000.00'),
			charges=Decimal('12000.00'),
			depot_garantie=Decimal('290000.00'),
			statut='VACANT',
		)

		self.client.force_authenticate(user=self.admin_user)
		response = self.client.patch(
			reverse('immobilier:biens-statut-update', kwargs={'pk': bien.id}),
			{'statut': 'EN_ATTENTE_VALIDATION'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_owner_cannot_switch_from_loue_to_pending_validation(self):
		bien = Bien.objects.create(
			proprietaire=self.proprietaire_a,
			reference='BIEN-117',
			categorie=self.categorie,
			sous_type=self.sous_type,
			adresse='Rue 15',
			ville='Lome',
			code_postal='00000',
			superficie=Decimal('69.00'),
			nb_pieces=2,
			meuble=False,
			loyer_hc=Decimal('300000.00'),
			charges=Decimal('13000.00'),
			depot_garantie=Decimal('300000.00'),
			statut='LOUE',
		)

		self.client.force_authenticate(user=self.proprietaire_a)
		response = self.client.patch(
			reverse('immobilier:biens-statut-update', kwargs={'pk': bien.id}),
			{'statut': 'EN_ATTENTE_VALIDATION'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

