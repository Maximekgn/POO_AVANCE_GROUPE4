from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.db import transaction

from immobilier.models import (
    Utilisateur,
    Document,
    CategorieBien,
    SousTypeBien,
    Bien,
    ProprietaireInfo,
    ClientInfo,
)
from immobilier.models.patrimoine import Photo
from immobilier.models.enums import StatutBienEnum, TypeDocumentEnum


class Command(BaseCommand):
    help = "Seed la base avec des utilisateurs, admins, catégories et biens de démonstration."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Démarrage du seeding..."))

        # ==================== ADMIN ====================
        admin, admin_created = Utilisateur.objects.get_or_create(
            email="kogonmaxime@gmail.com",
            defaults={
                "username": "admin",
                "first_name": "Maxime",
                "last_name": "Kogon",
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
                "email_verifie": True,
                "documents_complets": True,
            },
        )
        if admin_created:
            admin.set_password("password")
            admin.save()
            self.stdout.write(self.style.SUCCESS("✓ Admin créé: kogonmaxime@gmail.com / password"))

        # ==================== USER (CLIENT) ====================
        user_client, user_created = Utilisateur.objects.get_or_create(
            email="kogonmaxime+0@gmail.com",
            defaults={
                "username": "client_demo",
                "first_name": "Jean",
                "last_name": "Client",
                "telephone": "+22890000000",
                "is_active": True,
                "email_verifie": True,
                "documents_complets": True,
            },
        )
        if user_created:
            user_client.set_password("password")
            user_client.save()
            ClientInfo.objects.get_or_create(
                utilisateur=user_client,
                defaults={
                    "profession": "Développeur",
                    "numero_piece": "PIECE-CLIENT-001",
                    "revenus_mensuels": Decimal("500000.00"),
                },
            )
            self.stdout.write(self.style.SUCCESS("✓ Client créé: kogonmaxime+0@gmail.com / password"))

        # ==================== PROPRIETAIRE ====================
        proprio, proprio_created = Utilisateur.objects.get_or_create(
            email="kogonmaxime+1@gmail.com",
            defaults={
                "username": "proprietaire_demo",
                "first_name": "Pierre",
                "last_name": "Proprio",
                "telephone": "+22891000001",
                "is_active": True,
                "email_verifie": True,
                "documents_complets": True,
            },
        )
        if proprio_created:
            proprio.set_password("password")
            proprio.save()
            proprietaire_info, _ = ProprietaireInfo.objects.get_or_create(
                utilisateur=proprio,
                defaults={
                    "iban": "TG00BANK000000000000001",
                    "adresse_fiscale": "123 Rue de la Paix, Lomé",
                    "numero_piece": "PIECE-PROPRIO-001",
                },
            )
            self.stdout.write(self.style.SUCCESS("✓ Propriétaire créé: kogonmaxime+1@gmail.com / password"))

        # ==================== CATÉGORIES ====================
        categories_seed = [
            {"nom": "Appartement", "slug": "appartement", "ordre": 1, "actif": True},
            {"nom": "Maison", "slug": "maison", "ordre": 2, "actif": True},
            {"nom": "Studio", "slug": "studio", "ordre": 3, "actif": True},
            {"nom": "Villa", "slug": "villa", "ordre": 4, "actif": True},
            {"nom": "Duplex", "slug": "duplex", "ordre": 5, "actif": True},
            {"nom": "Loft", "slug": "loft", "ordre": 6, "actif": True},
            {"nom": "Penthouse", "slug": "penthouse", "ordre": 7, "actif": True},
            {"nom": "Chambre", "slug": "chambre", "ordre": 8, "actif": True},
            {"nom": "Bungalow", "slug": "bungalow", "ordre": 9, "actif": True},
            {"nom": "Résidence", "slug": "residence", "ordre": 10, "actif": True},
        ]
        created_categories = {}
        for cat in categories_seed:
            obj, _ = CategorieBien.objects.get_or_create(slug=cat["slug"], defaults=cat)
            created_categories[cat["slug"]] = obj

        appartement = created_categories["appartement"]
        maison = created_categories["maison"]

        studio, _ = SousTypeBien.objects.get_or_create(
            categorie=appartement,
            slug="studio",
            defaults={"nom": "Studio", "ordre": 1, "actif": True},
        )
        t3, _ = SousTypeBien.objects.get_or_create(
            categorie=appartement,
            slug="t3",
            defaults={"nom": "T3", "ordre": 2, "actif": True},
        )
        villa, _ = SousTypeBien.objects.get_or_create(
            categorie=maison,
            slug="villa",
            defaults={"nom": "Villa", "ordre": 1, "actif": True},
        )

        # ==================== BIENS (liés au propriétaire) ====================
        proprietaire_info = ProprietaireInfo.objects.get(utilisateur=proprio)

        biens_seed = [
            {
                "reference": "BIEN-PROP-001",
                "categorie": appartement,
                "sous_type": studio,
                "adresse": "123 Rue de la Paix",
                "quartier": "Hedzranawoe",
                "ville": "Lome",
                "code_postal": "00001",
                "latitude": Decimal("6.131900"),
                "longitude": Decimal("1.222800"),
                "description": "Studio meublé proche centre-ville avec vue dégagée",
                "superficie": Decimal("35.00"),
                "nb_pieces": 1,
                "etage": 2,
                "meuble": True,
                "prix_jour": Decimal("4000.00"),
                "prix_mois": Decimal("120000.00"),
                "loyer_hc": Decimal("120000.00"),
                "charges": Decimal("10000.00"),
                "depot_garantie": Decimal("120000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-002",
                "categorie": appartement,
                "sous_type": t3,
                "adresse": "45 Avenue des Cocotiers",
                "quartier": "Baguida",
                "ville": "Lome",
                "code_postal": "00002",
                "latitude": Decimal("6.137500"),
                "longitude": Decimal("1.212300"),
                "description": "Appartement T3 lumineux avec balcon",
                "superficie": Decimal("82.00"),
                "nb_pieces": 3,
                "etage": 4,
                "meuble": False,
                "prix_jour": Decimal("9333.00"),
                "prix_mois": Decimal("280000.00"),
                "loyer_hc": Decimal("280000.00"),
                "charges": Decimal("20000.00"),
                "depot_garantie": Decimal("280000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-003",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "9 Route de Kpalime",
                "quartier": "Centre-ville",
                "ville": "Kpalime",
                "code_postal": "00003",
                "latitude": Decimal("6.904900"),
                "longitude": Decimal("0.633300"),
                "description": "Villa familiale avec jardin et terrasse",
                "superficie": Decimal("150.00"),
                "nb_pieces": 5,
                "etage": 0,
                "meuble": False,
                "prix_jour": Decimal("15000.00"),
                "prix_mois": Decimal("450000.00"),
                "loyer_hc": Decimal("450000.00"),
                "charges": Decimal("35000.00"),
                "depot_garantie": Decimal("450000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-004",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "12 Rue des Bougainvilliers",
                "quartier": "Tomde",
                "ville": "Kara",
                "code_postal": "00004",
                "latitude": Decimal("9.551100"),
                "longitude": Decimal("1.186700"),
                "description": "Villa moderne avec piscine et garage",
                "superficie": Decimal("180.00"),
                "nb_pieces": 6,
                "etage": 1,
                "meuble": True,
                "prix_jour": Decimal("20000.00"),
                "prix_mois": Decimal("600000.00"),
                "loyer_hc": Decimal("600000.00"),
                "charges": Decimal("40000.00"),
                "depot_garantie": Decimal("600000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-005",
                "categorie": appartement,
                "sous_type": t3,
                "adresse": "78 Boulevard du 13 Janvier",
                "quartier": "Centre-ville",
                "ville": "Atakpame",
                "code_postal": "00005",
                "latitude": Decimal("7.533300"),
                "longitude": Decimal("1.133300"),
                "description": "Appartement T3 rénové avec climatisation",
                "superficie": Decimal("90.00"),
                "nb_pieces": 3,
                "etage": 5,
                "meuble": True,
                "prix_jour": Decimal("10667.00"),
                "prix_mois": Decimal("320000.00"),
                "loyer_hc": Decimal("320000.00"),
                "charges": Decimal("25000.00"),
                "depot_garantie": Decimal("320000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-006",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "5 Rue des Manguiers",
                "quartier": "Komah",
                "ville": "Sokode",
                "code_postal": "00006",
                "latitude": Decimal("8.983300"),
                "longitude": Decimal("1.133300"),
                "description": "Villa de luxe avec terrasse panoramique",
                "superficie": Decimal("200.00"),
                "nb_pieces": 7,
                "etage": 2,
                "meuble": True,
                "prix_jour": Decimal("26667.00"),
                "prix_mois": Decimal("800000.00"),
                "loyer_hc": Decimal("800000.00"),
                "charges": Decimal("50000.00"),
                "depot_garantie": Decimal("800000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-007",
                "categorie": appartement,
                "sous_type": studio,
                "adresse": "34 Rue des Palmiers",
                "quartier": "Centre-ville",
                "ville": "Tsevie",
                "code_postal": "00007",
                "latitude": Decimal("6.426100"),
                "longitude": Decimal("1.213900"),
                "description": "Studio cosy proche université",
                "superficie": Decimal("28.00"),
                "nb_pieces": 1,
                "etage": 1,
                "meuble": True,
                "prix_jour": Decimal("3333.00"),
                "prix_mois": Decimal("100000.00"),
                "loyer_hc": Decimal("100000.00"),
                "charges": Decimal("8000.00"),
                "depot_garantie": Decimal("100000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-008",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "22 Rue des Orangers",
                "quartier": "Degbekondji",
                "ville": "Aneho",
                "code_postal": "00008",
                "latitude": Decimal("6.227900"),
                "longitude": Decimal("1.591900"),
                "description": "Villa spacieuse avec garage double",
                "superficie": Decimal("220.00"),
                "nb_pieces": 8,
                "etage": 1,
                "meuble": False,
                "prix_jour": Decimal("30000.00"),
                "prix_mois": Decimal("900000.00"),
                "loyer_hc": Decimal("900000.00"),
                "charges": Decimal("60000.00"),
                "depot_garantie": Decimal("900000.00"),
                "statut": StatutBienEnum.EN_ATTENTE_VALIDATION,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-009",
                "categorie": appartement,
                "sous_type": studio,
                "adresse": "56 Rue des Hibiscus",
                "quartier": "Akodessewa",
                "ville": "Lome",
                "code_postal": "00009",
                "latitude": Decimal("6.133000"),
                "longitude": Decimal("1.224000"),
                "description": "Studio moderne avec balcon et vue mer",
                "superficie": Decimal("32.00"),
                "nb_pieces": 1,
                "etage": 3,
                "meuble": True,
                "prix_jour": Decimal("3667.00"),
                "prix_mois": Decimal("110000.00"),
                "loyer_hc": Decimal("110000.00"),
                "charges": Decimal("9000.00"),
                "depot_garantie": Decimal("110000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
            {
                "reference": "BIEN-PROP-010",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "17 Rue des Baobabs",
                "quartier": "Wuiti",
                "ville": "Kara",
                "code_postal": "00010",
                "latitude": Decimal("9.550000"),
                "longitude": Decimal("1.170000"),
                "description": "Villa contemporaine avec jardin tropical et piscine",
                "superficie": Decimal("250.00"),
                "nb_pieces": 9,
                "etage": 2,
                "meuble": True,
                "prix_jour": Decimal("33333.00"),
                "prix_mois": Decimal("1000000.00"),
                "loyer_hc": Decimal("1000000.00"),
                "charges": Decimal("70000.00"),
                "depot_garantie": Decimal("1000000.00"),
                "statut": StatutBienEnum.VACANT,
                "is_active": True,
            },
        ]

        created_biens = []
        for bien_data in biens_seed:
            bien, created = Bien.objects.get_or_create(
                reference=bien_data["reference"],
                defaults={
                    **bien_data,
                    "proprietaire_info": proprietaire_info,
                },
            )
            if created:
                # Ajout de photos pour chaque bien
                nb_photos = random.randint(3, 8)
                for i in range(nb_photos):
                    Photo.objects.create(
                        bien=bien,
                        url=f"https://example.com/photos/{bien.reference.lower()}_{i+1}.jpg",
                        description=f"Photo {i+1} du bien {bien.reference}",
                        principale=(i == 0),
                        ordre=i,
                    )
                created_biens.append(bien)

        self.stdout.write(self.style.SUCCESS(f"\n✓ {len(biens_seed)} biens créés pour le propriétaire"))
        self.stdout.write(self.style.SUCCESS("\n=================== RÉCAPITULATIF ==================="))
        self.stdout.write(self.style.SUCCESS("Admin: kogonmaxime@gmail.com / password"))
        self.stdout.write(self.style.SUCCESS("Client: kogonmaxime+0@gmail.com / password"))
        self.stdout.write(self.style.SUCCESS("Proprio: kogonmaxime+1@gmail.com / password"))
        self.stdout.write(self.style.SUCCESS(f"Total biens: {len(biens_seed)} (tous liés à proprio)"))
        self.stdout.write(self.style.SUCCESS("=====================================================\n"))
