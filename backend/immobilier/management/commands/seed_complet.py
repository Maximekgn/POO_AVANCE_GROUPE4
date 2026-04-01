from decimal import Decimal
import random
from datetime import timedelta, date, datetime

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from immobilier.models import (
    Utilisateur,
    Document,
    CategorieBien,
    SousTypeBien,
    Bien,
    ProprietaireInfo,
    ClientInfo,
    Photo,
)
from immobilier.models.location import DemandeAction, Dossier, Bail, SignatureBail
from immobilier.models.comptabilite import Paiement, Depense
from immobilier.models.incidents_reviews import Incident, IncidentMessage, Review
from immobilier.models.enums import (
    StatutBienEnum,
    StatutBailEnum,
    StatutDossierEnum,
    TypeDemandeEnum,
    StatutDemandeEnum,
    StatutPaiementEnum,
    TypeDocumentEnum,
    TypeSignataireEnum,
)


class Command(BaseCommand):
    help = "Seed complet de la base avec toutes les tables pour les tests"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("🌱 Démarrage du seeding complet..."))

        now = timezone.now()
        today = now.date()

        # ==================== UTILISATEURS ====================
        self.stdout.write(self.style.SUCCESS("\n📋 Création des utilisateurs..."))
        
        # Admin
        admin, _ = Utilisateur.objects.get_or_create(
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
                "telephone": "+22890000000",
            },
        )
        admin.set_password("password")
        admin.save()

        # Client locataire
        client, _ = Utilisateur.objects.get_or_create(
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
        client.set_password("password")
        client.save()
        client_info, _ = ClientInfo.objects.get_or_create(
            utilisateur=client,
            defaults={
                "profession": "Développeur",
                "numero_piece": "PIECE-CLIENT-001",
                "revenus_mensuels": Decimal("500000.00"),
            },
        )

        # Propriétaire
        proprio, _ = Utilisateur.objects.get_or_create(
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

        # Autres clients pour les tests
        autres_clients = [
            {"email": "client1@test.com", "first_name": "Alice", "last_name": "Kossi", "telephone": "+22890000001"},
            {"email": "client2@test.com", "first_name": "Brice", "last_name": "Mensah", "telephone": "+22890000002"},
            {"email": "client3@test.com", "first_name": "Carine", "last_name": "Abalo", "telephone": "+22890000003"},
        ]
        
        created_clients = []
        for c_data in autres_clients:
            c, _ = Utilisateur.objects.get_or_create(
                email=c_data["email"],
                defaults={
                    "username": c_data["email"],
                    "first_name": c_data["first_name"],
                    "last_name": c_data["last_name"],
                    "telephone": c_data["telephone"],
                    "is_active": True,
                    "email_verifie": True,
                    "documents_complets": True,
                }
            )
            c.set_password("password")
            c.save()
            ci, _ = ClientInfo.objects.get_or_create(
                utilisateur=c,
                defaults={
                    "profession": "Employé",
                    "numero_piece": f"PIECE-{c_data['first_name']}-001",
                    "revenus_mensuels": Decimal("400000.00"),
                }
            )
            created_clients.append((c, ci))

        self.stdout.write(self.style.SUCCESS(f"  ✓ {3 + len(autres_clients)} utilisateurs créés"))

        # ==================== CATÉGORIES ====================
        self.stdout.write(self.style.SUCCESS("\n📂 Création des catégories..."))
        
        categories_seed = [
            {"nom": "Appartement", "slug": "appartement", "ordre": 1, "actif": True},
            {"nom": "Maison", "slug": "maison", "ordre": 2, "actif": True},
            {"nom": "Studio", "slug": "studio", "ordre": 3, "actif": True},
            {"nom": "Villa", "slug": "villa", "ordre": 4, "actif": True},
            {"nom": "Duplex", "slug": "duplex", "ordre": 5, "actif": True},
        ]
        created_categories = {}
        for cat in categories_seed:
            obj, _ = CategorieBien.objects.get_or_create(slug=cat["slug"], defaults=cat)
            created_categories[cat["slug"]] = obj

        appartement = created_categories["appartement"]
        maison = created_categories["maison"]

        studio, _ = SousTypeBien.objects.get_or_create(
            categorie=appartement, slug="studio", defaults={"nom": "Studio", "ordre": 1, "actif": True}
        )
        t3, _ = SousTypeBien.objects.get_or_create(
            categorie=appartement, slug="t3", defaults={"nom": "T3", "ordre": 2, "actif": True}
        )
        villa, _ = SousTypeBien.objects.get_or_create(
            categorie=maison, slug="villa", defaults={"nom": "Villa", "ordre": 1, "actif": True}
        )

        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(categories_seed)} catégories créées"))

        # ==================== BIENS ====================
        self.stdout.write(self.style.SUCCESS("\n🏠 Création des biens..."))
        
        biens_seed = [
            {"reference": "BIEN-001", "categorie": appartement, "sous_type": studio, "ville": "Lome", "quartier": "Hedzranawoe", "adresse": "123 Rue de la Paix", "superficie": Decimal("35.00"), "nb_pieces": 1, "loyer_hc": Decimal("120000.00"), "prix_mois": Decimal("120000.00")},
            {"reference": "BIEN-002", "categorie": appartement, "sous_type": t3, "ville": "Lome", "quartier": "Baguida", "adresse": "45 Avenue des Cocotiers", "superficie": Decimal("82.00"), "nb_pieces": 3, "loyer_hc": Decimal("280000.00"), "prix_mois": Decimal("280000.00")},
            {"reference": "BIEN-003", "categorie": maison, "sous_type": villa, "ville": "Kpalime", "quartier": "Centre-ville", "adresse": "9 Route de Kpalime", "superficie": Decimal("150.00"), "nb_pieces": 5, "loyer_hc": Decimal("450000.00"), "prix_mois": Decimal("450000.00")},
            {"reference": "BIEN-004", "categorie": maison, "sous_type": villa, "ville": "Kara", "quartier": "Tomde", "adresse": "12 Rue des Bougainvilliers", "superficie": Decimal("180.00"), "nb_pieces": 6, "loyer_hc": Decimal("600000.00"), "prix_mois": Decimal("600000.00")},
            {"reference": "BIEN-005", "categorie": appartement, "sous_type": t3, "ville": "Atakpame", "quartier": "Centre-ville", "adresse": "78 Boulevard du 13 Janvier", "superficie": Decimal("90.00"), "nb_pieces": 3, "loyer_hc": Decimal("320000.00"), "prix_mois": Decimal("320000.00")},
            {"reference": "BIEN-006", "categorie": maison, "sous_type": villa, "ville": "Sokode", "quartier": "Komah", "adresse": "5 Rue des Manguiers", "superficie": Decimal("200.00"), "nb_pieces": 7, "loyer_hc": Decimal("800000.00"), "prix_mois": Decimal("800000.00")},
            {"reference": "BIEN-007", "categorie": appartement, "sous_type": studio, "ville": "Tsevie", "quartier": "Centre-ville", "adresse": "34 Rue des Palmiers", "superficie": Decimal("28.00"), "nb_pieces": 1, "loyer_hc": Decimal("100000.00"), "prix_mois": Decimal("100000.00")},
            {"reference": "BIEN-008", "categorie": maison, "sous_type": villa, "ville": "Aneho", "quartier": "Degbekondji", "adresse": "22 Rue des Orangers", "superficie": Decimal("220.00"), "nb_pieces": 8, "loyer_hc": Decimal("900000.00"), "prix_mois": Decimal("900000.00")},
            {"reference": "BIEN-009", "categorie": appartement, "sous_type": studio, "ville": "Lome", "quartier": "Akodessewa", "adresse": "56 Rue des Hibiscus", "superficie": Decimal("32.00"), "nb_pieces": 1, "loyer_hc": Decimal("110000.00"), "prix_mois": Decimal("110000.00")},
            {"reference": "BIEN-010", "categorie": maison, "sous_type": villa, "ville": "Kara", "quartier": "Wuiti", "adresse": "17 Rue des Baobabs", "superficie": Decimal("250.00"), "nb_pieces": 9, "loyer_hc": Decimal("1000000.00"), "prix_mois": Decimal("1000000.00")},
        ]

        created_biennes = []
        for bien_data in biens_seed:
            bien, _ = Bien.objects.get_or_create(
                reference=bien_data["reference"],
                defaults={
                    **bien_data,
                    "proprietaire_info": proprietaire_info,
                    "code_postal": "00001",
                    "latitude": Decimal("6.131900"),
                    "longitude": Decimal("1.222800"),
                    "description": f"Bien de type {bien_data['sous_type'].nom} à {bien_data['ville']}",
                    "etage": random.randint(0, 5),
                    "meuble": random.choice([True, False]),
                    "statut": StatutBienEnum.VACANT,
                    "is_active": True,
                    "charges": Decimal("10000.00"),
                    "depot_garantie": bien_data["loyer_hc"],
                },
            )
            created_biennes.append(bien)

        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(biens_seed)} biens créés"))

        # ==================== BAUX ====================
        self.stdout.write(self.style.SUCCESS("\n📜 Création des baux..."))
        
        # Suppression des anciens baux pour éviter les conflits
        Bail.objects.all().delete()
        self.stdout.write(self.style.WARNING("  ⚠️  Anciens baux supprimés"))
        
        # Bail 1: En cours - expiration dans 15 jours (bientôt)
        bail1 = Bail.objects.create(
            bien=created_biennes[0],
            client_info=created_clients[0][1],
            numero_bail="BAIL-2024-001",
            date_entree=today - timedelta(days=345),
            date_sortie=today + timedelta(days=20),  # Expire dans 20 jours
            loyer_actuel=Decimal("120000.00"),
            depot_garantie=Decimal("120000.00"),
            statut=StatutBailEnum.EN_COURS,
        )
        created_biennes[0].statut = StatutBienEnum.LOUE
        created_biennes[0].save()

        # Bail 2: En cours - expiration dans 5 jours (très bientôt - URGENT)
        bail2 = Bail.objects.create(
            bien=created_biennes[1],
            client_info=created_clients[1][1],
            numero_bail="BAIL-2024-002",
            date_entree=today - timedelta(days=340),
            date_sortie=today + timedelta(days=5),  # Expire dans 5 jours
            loyer_actuel=Decimal("280000.00"),
            depot_garantie=Decimal("280000.00"),
            statut=StatutBailEnum.EN_COURS,
        )
        created_biennes[1].statut = StatutBienEnum.LOUE
        created_biennes[1].save()

        # Bail 3: En cours - expiration dans 45 jours
        bail3 = Bail.objects.create(
            bien=created_biennes[2],
            client_info=client_info,
            numero_bail="BAIL-2024-003",
            date_entree=today - timedelta(days=250),
            date_sortie=today + timedelta(days=115),
            loyer_actuel=Decimal("450000.00"),
            depot_garantie=Decimal("450000.00"),
            statut=StatutBailEnum.EN_COURS,
        )
        created_biennes[2].statut = StatutBienEnum.LOUE
        created_biennes[2].save()

        # Bail 4: En attente de signature
        bail4 = Bail.objects.create(
            bien=created_biennes[3],
            client_info=created_clients[2][1],
            numero_bail="BAIL-2024-004",
            date_entree=today + timedelta(days=10),
            date_sortie=today + timedelta(days=375),
            loyer_actuel=Decimal("600000.00"),
            depot_garantie=Decimal("1200000.00"),
            statut=StatutBailEnum.EN_ATTENTE_SIGNATURE,
        )
        created_biennes[3].statut = StatutBienEnum.LOUE
        created_biennes[3].save()

        # Bail 5: Expiré (pour historique)
        bail5 = Bail.objects.create(
            bien=created_biennes[4],
            client_info=created_clients[0][1],
            numero_bail="BAIL-2023-005",
            date_entree=today - timedelta(days=400),
            date_sortie=today - timedelta(days=35),  # Déjà expiré
            loyer_actuel=Decimal("320000.00"),
            depot_garantie=Decimal("320000.00"),
            statut=StatutBailEnum.EXPIRE,
        )
        created_biennes[4].statut = StatutBienEnum.VACANT
        created_biennes[4].save()

        self.stdout.write(self.style.SUCCESS(f"  ✓ 5 baux créés (dont 2 expirent bientôt)"))

        # ==================== PAIEMENTS ====================
        self.stdout.write(self.style.SUCCESS("\n💰 Création des paiements..."))
        
        # Suppression des anciens paiements
        Paiement.objects.all().delete()
        self.stdout.write(self.style.WARNING("  ⚠️  Anciens paiements supprimés"))
        
        # Paiements pour bail 1
        Paiement.objects.create(
            bail=bail1,
            reference="PAY-2024-001",
            montant=Decimal("120000.00"),
            commission_plateforme=Decimal("6000.00"),
            montant_reverse=Decimal("114000.00"),
            date_echeance=today - timedelta(days=30),
            date_paiement=now - timedelta(days=28),
            statut=StatutPaiementEnum.PAYE_A_L_ADMIN,
            mode_paiement="Mobile Money",
        )
        
        Paiement.objects.create(
            bail=bail1,
            reference="PAY-2024-002",
            montant=Decimal("120000.00"),
            commission_plateforme=Decimal("6000.00"),
            montant_reverse=Decimal("114000.00"),
            date_echeance=today,  # Échéance aujourd'hui !
            statut=StatutPaiementEnum.EN_ATTENTE,
        )

        # Paiements pour bail 2
        Paiement.objects.create(
            bail=bail2,
            reference="PAY-2024-003",
            montant=Decimal("280000.00"),
            commission_plateforme=Decimal("14000.00"),
            montant_reverse=Decimal("266000.00"),
            date_echeance=today - timedelta(days=30),
            date_paiement=now - timedelta(days=25),
            statut=StatutPaiementEnum.PAYE_A_L_ADMIN,
            mode_paiement="Virement",
        )

        Paiement.objects.create(
            bail=bail2,
            reference="PAY-2024-004",
            montant=Decimal("280000.00"),
            commission_plateforme=Decimal("14000.00"),
            montant_reverse=Decimal("266000.00"),
            date_echeance=today + timedelta(days=3),  # Dans 3 jours
            statut=StatutPaiementEnum.EN_ATTENTE,
        )

        # Paiement en retard (impayé)
        Paiement.objects.create(
            bail=bail3,
            reference="PAY-2024-005",
            montant=Decimal("450000.00"),
            commission_plateforme=Decimal("22500.00"),
            montant_reverse=Decimal("427500.00"),
            date_echeance=today - timedelta(days=10),  # En retard de 10 jours
            statut=StatutPaiementEnum.IMPAYE,
        )

        Paiement.objects.create(
            bail=bail3,
            reference="PAY-2024-006",
            montant=Decimal("450000.00"),
            commission_plateforme=Decimal("22500.00"),
            montant_reverse=Decimal("427500.00"),
            date_echeance=today + timedelta(days=20),  # Dans 20 jours
            statut=StatutPaiementEnum.EN_ATTENTE,
        )

        self.stdout.write(self.style.SUCCESS("  ✓ 6 paiements créés (dont 1 impayé, 2 à venir)"))

        # ==================== DÉPENSES ====================
        self.stdout.write(self.style.SUCCESS("\n💸 Création des dépenses..."))
        
        # Suppression des anciennes dépenses
        Depense.objects.all().delete()
        self.stdout.write(self.style.WARNING("  ⚠️  Anciennes dépenses supprimées"))
        
        depenses_data = [
            {"categorie": "Réparation", "libelle": "Réparation fuite d'eau", "montant": Decimal("50000.00"), "bien": created_biennes[0], "date_depense": today - timedelta(days=20)},
            {"categorie": "Entretien", "libelle": "Nettoyage professionnel", "montant": Decimal("30000.00"), "bien": created_biennes[1], "date_depense": today - timedelta(days=15)},
            {"categorie": "Travaux", "libelle": "Peinture façade", "montant": Decimal("150000.00"), "bien": created_biennes[2], "date_depense": today - timedelta(days=30)},
            {"categorie": "Électricité", "libelle": "Facture CEC", "montant": Decimal("25000.00"), "bien": created_biennes[3], "date_depense": today - timedelta(days=10)},
            {"categorie": "Plomberie", "libelle": "Remplacement robinets", "montant": Decimal("40000.00"), "bien": created_biennes[0], "date_depense": today - timedelta(days=5)},
        ]

        for dep_data in depenses_data:
            Depense.objects.create(
                proprietaire_info=proprietaire_info,
                **dep_data,
                fournisseur="Prestataire Local",
            )

        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(depenses_data)} dépenses créées"))

        # ==================== DEMANDES ACTIONS ====================
        self.stdout.write(self.style.SUCCESS("\n📩 Création des demandes d'actions..."))
        
        # Suppression des anciennes demandes
        DemandeAction.objects.all().delete()
        self.stdout.write(self.style.WARNING("  ⚠️  Anciennes demandes supprimées"))
        
        # Demande de visite
        DemandeAction.objects.create(
            bien=created_biennes[5],
            demandeur=created_clients[0][0],
            proprietaire=proprio,
            type_demande=TypeDemandeEnum.VISITE,
            statut=StatutDemandeEnum.EN_ATTENTE,
            date_debut=today + timedelta(days=3),
            duree_jours=1,
            message="Je souhaite visiter ce bien",
        )

        # Demande de privatisation
        DemandeAction.objects.create(
            bien=created_biennes[6],
            demandeur=created_clients[1][0],
            proprietaire=proprio,
            type_demande=TypeDemandeEnum.PRIVATISATION,
            statut=StatutDemandeEnum.ACCEPTEE,
            date_debut=today + timedelta(days=7),
            date_fin=today + timedelta(days=14),
            duree_jours=7,
            montant_total=Decimal("350000.00"),
        )

        # Demande de bail en attente
        DemandeAction.objects.create(
            bien=created_biennes[7],
            demandeur=created_clients[2][0],
            proprietaire=proprio,
            type_demande=TypeDemandeEnum.BAIL,
            statut=StatutDemandeEnum.EN_ATTENTE,
            duree_mois=12,
            message="Intéressé par une location longue durée",
        )

        self.stdout.write(self.style.SUCCESS("  ✓ 3 demandes d'actions créées"))

        # ==================== DOSSIERS ====================
        self.stdout.write(self.style.SUCCESS("\n📁 Création des dossiers..."))
        
        # Suppression des anciens dossiers
        Dossier.objects.all().delete()
        self.stdout.write(self.style.WARNING("  ⚠️  Anciens dossiers supprimés"))
        
        Dossier.objects.create(
            client_info=created_clients[0][1],
            bien=created_biennes[5],
            statut=StatutDossierEnum.EN_ETUDE,
        )

        Dossier.objects.create(
            client_info=created_clients[1][1],
            bien=created_biennes[6],
            statut=StatutDossierEnum.VALIDE,
        )

        self.stdout.write(self.style.SUCCESS("  ✓ 2 dossiers créés"))

        # ==================== SIGNATURES BAIL ====================
        self.stdout.write(self.style.SUCCESS("\n✍️  Création des signatures..."))
        
        # Suppression des anciennes signatures
        SignatureBail.objects.all().delete()
        self.stdout.write(self.style.WARNING("  ⚠️  Anciennes signatures supprimées"))
        
        SignatureBail.objects.create(
            bail=bail3,
            utilisateur=proprio,
            type_signataire=TypeSignataireEnum.PROPRIETAIRE,
            date_signature=now - timedelta(days=5),
        )

        SignatureBail.objects.create(
            bail=bail3,
            utilisateur=client,
            type_signataire=TypeSignataireEnum.LOCATAIRE,
            date_signature=now - timedelta(days=3),
        )

        self.stdout.write(self.style.SUCCESS("  ✓ 2 signatures créées"))

        # ==================== INCIDENTS ====================
        self.stdout.write(self.style.SUCCESS("\n🔧 Création des incidents..."))
        
        Incident.objects.create(
            bien=created_biennes[0],
            locataire=created_clients[0][0],
            proprietaire=proprio,
            titre="Fuite d'eau dans la cuisine",
            description="L'eau coule sous l'évier depuis ce matin. Urgent !",
            categorie="EAU",
            urgence="ELEVEE",
            statut="EN_COURS",
            cout_estime=Decimal("50000.00"),
        )
        
        Incident.objects.create(
            bien=created_biennes[1],
            locataire=created_clients[1][0],
            proprietaire=proprio,
            titre="Prise électrique défectueuse",
            description="Une prise ne fonctionne plus dans le salon, risque de court-circuit.",
            categorie="ELECTRICITE",
            urgence="MOYENNE",
            statut="OUVERT",
            cout_estime=Decimal("25000.00"),
        )
        
        incident_resolu = Incident.objects.create(
            bien=created_biennes[2],
            locataire=client_info.utilisateur,
            proprietaire=proprio,
            titre="Porte fenêtre mal fermée",
            description="La porte fenêtre de la chambre ferme mal.",
            categorie="PORTES_FENETRES",
            urgence="FAIBLE",
            statut="RESOLU",
            resolution_notes="Joint remplacé, porte réglée.",
            date_resolution=now - timedelta(days=5),
            cout_reel=Decimal("15000.00"),
            pris_en_charge="PROPRIETAIRE",
        )
        
        IncidentMessage.objects.create(
            incident=incident_resolu,
            auteur=proprio,
            message="J'envoie un prestataire demain."
        )
        IncidentMessage.objects.create(
            incident=incident_resolu,
            auteur=client_info.utilisateur,
            message="Merci, c'est résolu !"
        )

        self.stdout.write(self.style.SUCCESS("  ✓ 3 incidents créés"))

        # ==================== AVIS ====================
        self.stdout.write(self.style.SUCCESS("\n⭐ Création des avis..."))
        
        # Supprimer les anciens avis
        Review.objects.all().delete()
        
        # Avis pour BIEN-001 (Studio Lomé) - bail1
        Review.objects.create(
            bail=bail1,
            auteur=created_clients[0][0],
            cible_type="LOCATAIRE_BIEN",
            cible_id=created_biennes[0].id,
            note_globale=5,
            note_proprete=5,
            note_exactitude=5,
            note_communication=5,
            note_emplacement=5,
            note_enregistrement=5,
            commentaire="Studio parfait pour un séjour court ! Très propre et bien meublé. Le propriétaire est très réactif. Je recommande vivement !",
            points_positifs="Propreté irréprochable, excellente communication, bien situé",
            points_negatifs="",
            est_visible=True,
        )
        
        # Avis pour BIEN-002 (T3 Lomé) - bail2
        Review.objects.create(
            bail=bail2,
            auteur=created_clients[1][0],
            cible_type="LOCATAIRE_BIEN",
            cible_id=created_biennes[1].id,
            note_globale=4,
            note_proprete=4,
            note_exactitude=4,
            note_communication=5,
            note_emplacement=4,
            note_enregistrement=4,
            commentaire="Appartement spacieux et lumineux. Quelques petits travaux à prévoir mais dans l'ensemble très satisfait.",
            points_positifs="Grand espace, bon rapport qualité-prix, propriétaire à l'écoute",
            points_negatifs="Quelques réparations nécessaires",
            est_visible=True,
        )
        
        # Avis pour BIEN-003 (Villa Kpalimé) - bail3
        Review.objects.create(
            bail=bail3,
            auteur=client_info.utilisateur,
            cible_type="LOCATAIRE_BIEN",
            cible_id=created_biennes[2].id,
            note_globale=5,
            note_proprete=5,
            note_exactitude=5,
            note_communication=5,
            note_emplacement=5,
            note_enregistrement=5,
            commentaire="Villa magnifique dans un cadre paisible ! Parfait pour une famille. Le jardin est un vrai plus. Séjour inoubliable !",
            points_positifs="Cadre exceptionnel, villa impeccable, jardin magnifique",
            points_negatifs="Un peu loin du centre-ville",
            est_visible=True,
        )
        
        # Avis pour BIEN-005 (T3 Atakpamé) - bail5
        Review.objects.create(
            bail=bail5,
            auteur=created_clients[0][0],
            cible_type="LOCATAIRE_BIEN",
            cible_id=created_biennes[4].id,
            note_globale=3,
            note_proprete=3,
            note_exactitude=3,
            note_communication=4,
            note_emplacement=3,
            note_enregistrement=3,
            commentaire="Séjour correct. L'appartement a besoin d'un bon nettoyage et quelques équipements sont vétustes.",
            points_positifs="Propriétaire réactif, quartier calme",
            points_negatifs="Propreté à améliorer, équipements vieillissants",
            est_visible=True,
        )

        self.stdout.write(self.style.SUCCESS("  ✓ 4 avis créés"))

        # ==================== PHOTOS ====================
        self.stdout.write(self.style.SUCCESS("\n📷 Ajout des photos..."))
        
        for bien in created_biennes:
            nb_photos = random.randint(3, 6)
            for i in range(nb_photos):
                Photo.objects.create(
                    bien=bien,
                    url=f"https://example.com/photos/{bien.reference.lower()}_{i+1}.jpg",
                    description=f"Photo {i+1} - {bien.reference}",
                    principale=(i == 0),
                    ordre=i,
                )

        self.stdout.write(self.style.SUCCESS(f"  ✓ Photos ajoutées pour {len(created_biennes)} biens"))

        # ==================== RÉCAPITULATIF ====================
        self.stdout.write(self.style.SUCCESS("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("📊 RÉCAPITULATIF DU SEEDING"))
        self.stdout.write(self.style.SUCCESS("="*60))
        self.stdout.write(self.style.SUCCESS("\n👤 UTILISATEURS (mot de passe: password):"))
        self.stdout.write(self.style.SUCCESS("   • Admin: kogonmaxime@gmail.com"))
        self.stdout.write(self.style.SUCCESS("   • Client: kogonmaxime+0@gmail.com"))
        self.stdout.write(self.style.SUCCESS("   • Proprio: kogonmaxime+1@gmail.com"))
        self.stdout.write(self.style.SUCCESS("   • Autres: client1@test.com, client2@test.com, client3@test.com"))
        
        self.stdout.write(self.style.SUCCESS(f"\n🏠 BIENS: {len(created_biennes)} créés"))
        self.stdout.write(self.style.SUCCESS(f"📜 BAUX: 5 créés"))
        self.stdout.write(self.style.SUCCESS("   • 2 expirent bientôt (5 et 20 jours)"))
        self.stdout.write(self.style.SUCCESS("   • 1 en attente de signature"))
        self.stdout.write(self.style.SUCCESS("   • 1 expiré (historique)"))
        
        self.stdout.write(self.style.SUCCESS(f"\n💰 PAIEMENTS: 6 créés"))
        self.stdout.write(self.style.SUCCESS("   • 1 impayé (en retard de 10 jours)"))
        self.stdout.write(self.style.SUCCESS("   • 1 échéance aujourd'hui"))
        self.stdout.write(self.style.SUCCESS("   • 2 à payer dans 3-20 jours"))

        self.stdout.write(self.style.SUCCESS(f"\n💸 DÉPENSES: {len(depenses_data)} créées"))
        self.stdout.write(self.style.SUCCESS(f"📩 DEMANDES: 3 créées"))
        self.stdout.write(self.style.SUCCESS(f"📁 DOSSIERS: 2 créés"))
        self.stdout.write(self.style.SUCCESS(f"🔧 INCIDENTS: 3 créés"))
        self.stdout.write(self.style.SUCCESS(f"⭐ AVIS: 5 créés"))
        self.stdout.write(self.style.SUCCESS("="*60 + "\n"))
