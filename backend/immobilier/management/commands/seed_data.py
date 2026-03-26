from decimal import Decimal

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
from immobilier.models.enums import StatutBienEnum, TypeDocumentEnum


class Command(BaseCommand):
    help = "Seed la base avec des utilisateurs, admins, catégories et biens de démonstration."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Démarrage du seeding..."))

        admin, admin_created = Utilisateur.objects.get_or_create(
            email="kogonmaxime+100@gmail.com",
            defaults={
                "username": "admin",
                "first_name": "Super",
                "last_name": "Admin",
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
                "email_verifie": True,
                "documents_complets": True,
            },
        )
        if admin_created:
            admin.set_password("maxime@2006")
            admin.save()

        users_seed = [
            {
                "email": "alice@demo.com",
                "username": "alice@demo.com",
                "first_name": "Alice",
                "last_name": "Kossi",
                "telephone": "+22890000001",
                "is_active": True,
                "email_verifie": True,
                "documents_complets": True,
                "password": "User12345!",
            },
            {
                "email": "brice@demo.com",
                "username": "brice@demo.com",
                "first_name": "Brice",
                "last_name": "Mensah",
                "telephone": "+22890000002",
                "is_active": True,
                "email_verifie": False,
                "documents_complets": False,
                "password": "User12345!",
            },
            {
                "email": "carine@demo.com",
                "username": "carine@demo.com",
                "first_name": "Carine",
                "last_name": "Abalo",
                "telephone": "+22890000003",
                "is_active": True,
                "email_verifie": True,
                "documents_complets": True,
                "password": "User12345!",
            },
        ]

        created_users = []
        for payload in users_seed:
            password = payload.pop("password")
            user, created = Utilisateur.objects.get_or_create(email=payload["email"], defaults=payload)
            if created:
                user.set_password(password)
                user.save()
            created_users.append(user)

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

        for idx, owner in enumerate(created_users, start=1):
            proprietaire_info, _ = ProprietaireInfo.objects.get_or_create(
                utilisateur=owner,
                defaults={
                    "iban": f"TG00BANK00000000000000{idx}",
                    "adresse_fiscale": f"Adresse fiscale {idx}",
                    "numero_piece": f"PIECE-PROP-{idx:03d}",
                },
            )

            client_info, _ = ClientInfo.objects.get_or_create(
                utilisateur=owner,
                defaults={
                    "profession": "Salarié",
                    "numero_piece": f"PIECE-CL-{idx:03d}",
                    "revenus_mensuels": Decimal("450000.00"),
                },
            )

            if owner.documents_complets:
                doc, _ = Document.objects.get_or_create(
                    nom=f"piece_identite_{owner.id}.pdf",
                    type=TypeDocumentEnum.PIECE_IDENTITE,
                    defaults={
                        "url": f"https://example.com/documents/piece_identite_{owner.id}.pdf",
                        "taille_octets": 102400,
                        "mime_type": "application/pdf",
                    },
                )
                proprietaire_info.carte_identite = doc
                proprietaire_info.save(update_fields=["carte_identite"])
                client_info.carte_identite = doc
                client_info.save(update_fields=["carte_identite"])

        biens_seed = [
            {
                "reference": "BIEN-DEMO-001",
                "categorie": appartement,
                "sous_type": studio,
                "adresse": "123 Rue de la Paix",
                "quartier": "Hedzranawoe",
                "ville": "Lome",
                "code_postal": "00001",
                "latitude": Decimal("6.131900"),
                "longitude": Decimal("1.222800"),
                "description": "Studio meublé proche centre-ville",
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
            },
            {
                "reference": "BIEN-DEMO-002",
                "categorie": appartement,
                "sous_type": t3,
                "adresse": "45 Avenue des Cocotiers",
                "quartier": "Baguida",
                "ville": "Lome",
                "code_postal": "00002",
                "latitude": Decimal("6.137500"),
                "longitude": Decimal("1.212300"),
                "description": "Appartement T3 lumineux",
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
            },
            {
                "reference": "BIEN-DEMO-003",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "9 Route de Kpalime",
                "quartier": "Centre-ville",
                "ville": "Kpalime",
                "code_postal": "00003",
                "latitude": Decimal("6.904900"),
                "longitude": Decimal("0.633300"),
                "description": "Villa familiale avec jardin",
                "superficie": Decimal("150.00"),
                "nb_pieces": 5,
                "etage": 0,
                "meuble": False,
                "prix_jour": Decimal("15000.00"),
                "prix_mois": Decimal("450000.00"),
                "loyer_hc": Decimal("450000.00"),
                "charges": Decimal("35000.00"),
                "depot_garantie": Decimal("450000.00"),
                "statut": StatutBienEnum.EN_ATTENTE_VALIDATION,
            },
            {
                "reference": "BIEN-DEMO-004",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "12 Rue des Bougainvilliers",
                "quartier": "Tomde",
                "ville": "Kara",
                "code_postal": "00004",
                "latitude": Decimal("9.551100"),
                "longitude": Decimal("1.186700"),
                "description": "Villa moderne avec piscine",
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
            },
            {
                "reference": "BIEN-DEMO-005",
                "categorie": appartement,
                "sous_type": t3,
                "adresse": "78 Boulevard du 13 Janvier",
                "quartier": "Centre-ville",
                "ville": "Atakpame",
                "code_postal": "00005",
                "latitude": Decimal("7.533300"),
                "longitude": Decimal("1.133300"),
                "description": "Appartement T3 rénové",
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
            },
            {
                "reference": "BIEN-DEMO-006",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "5 Rue des Manguiers",
                "quartier": "Komah",
                "ville": "Sokode",
                "code_postal": "00006",
                "latitude": Decimal("8.983300"),
                "longitude": Decimal("1.133300"),
                "description": "Villa de luxe avec terrasse",
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
            },
            {
                "reference": "BIEN-DEMO-007",
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
            },
            {
                "reference": "BIEN-DEMO-008",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "22 Rue des Orangers",
                "quartier": "Degbekondji",
                "ville": "Aneho",
                "code_postal": "00008",
                "latitude": Decimal("6.227900"),
                "longitude": Decimal("1.591900"),
                "description": "Villa spacieuse avec garage",
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
            },
            {
                "reference": "BIEN-DEMO-009",
                "categorie": appartement,
                "sous_type": studio,
                "adresse": "56 Rue des Hibiscus",
                "quartier": "Akodessewa",
                "ville": "Lome",
                "code_postal": "00009",
                "latitude": Decimal("6.133000"),
                "longitude": Decimal("1.224000"),
                "description": "Studio moderne avec balcon",
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
            },
            {
                "reference": "BIEN-DEMO-010",
                "categorie": maison,
                "sous_type": villa,
                "adresse": "17 Rue des Baobabs",
                "quartier": "Wuiti",
                "ville": "Kara",
                "code_postal": "00010",
                "latitude": Decimal("9.550000"),
                "longitude": Decimal("1.170000"),
                "description": "Villa contemporaine avec jardin tropical",
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
            },
        ]

        for idx, bien_data in enumerate(biens_seed):
            owner = created_users[idx % len(created_users)]
            proprietaire_info = ProprietaireInfo.objects.get(utilisateur=owner)
            bien, _ = Bien.objects.get_or_create(
                reference=bien_data["reference"],
                defaults={
                    **bien_data,
                    "proprietaire_info": proprietaire_info,
                },
            )
            for field, value in bien_data.items():
                setattr(bien, field, value)
            bien.proprietaire_info = proprietaire_info
            bien.save()

            # Ajout d'un nombre aléatoire de photos (entre 3 et 8) pour chaque bien
            import random
            from immobilier.models.patrimoine import Photo
            nb_photos = random.randint(3, 8)
            for i in range(nb_photos):
                Photo.objects.create(
                    bien=bien,
                    url=f"https://example.com/photos/{bien.reference.lower()}_{i+1}.jpg",
                    description=f"Photo {i+1} du bien {bien.reference}",
                    principale=(i == 0),
                    ordre=i
                )

        self.stdout.write(self.style.SUCCESS("Seeding terminé avec succès."))
        self.stdout.write("Admin: admin@immobilierpro.local / Admin12345!")
        self.stdout.write("Users: alice@demo.com, brice@demo.com, carine@demo.com / User12345!")
