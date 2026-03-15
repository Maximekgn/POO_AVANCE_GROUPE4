from django.db import models
from django.contrib.auth.models import AbstractUser
from .enums import RoleEnum

class Utilisateur(AbstractUser):
    telephone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, choices=RoleEnum.choices, default=RoleEnum.CLIENT)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def login(self, email: str, mdp: str) -> bool:
        return False

    def logout(self) -> None:
        pass

    def changerMotDePasse(self, ancien: str, nouveau: str) -> bool:
        return False

    def reinitialiserMotDePasse(self, email: str) -> None:
        pass

    def mettreAJourProfil(self) -> None:
        pass

    def getMessages(self) -> list:
        return []

    def getMessagesNonLus(self) -> int:
        return 0

class Admin(Utilisateur):
    class Meta:
        proxy = True
        verbose_name = 'Administrateur'
        verbose_name_plural = 'Administrateurs'

    def save(self, *args, **kwargs):
        self.role = RoleEnum.ADMIN
        self.is_staff = True
        self.is_superuser = True
        super().save(*args, **kwargs)

    def validerCompte(self, userId: int) -> None: pass
    def suspendreCompte(self, userId: int) -> None: pass
    def reactiverCompte(self, userId: int) -> None: pass
    def listerUtilisateurs(self, filtre: str) -> list: return []
    def validerBien(self, bienId: int) -> None: pass
    def rejeterBien(self, bienId: int, motif: str) -> None: pass
    def consulterTousLesBiens(self, filtre: str) -> list: return []
    def modifierBienPour(self, bienId: int, bien) -> 'Bien': pass
    def archiverBienPour(self, bienId: int) -> None: pass
    def consulterToutesLesLocations(self) -> list: return []
    def validerDossierPour(self, dossierId: int) -> None: pass
    def rejeterDossierPour(self, dossierId: int, motif: str) -> None: pass
    def resilierBailPour(self, bailId: int, motif: str) -> None: pass
    def consulterFinancesGlobales(self) -> dict: return {}
    def listerTousImpayes(self) -> list: return []
    def enregistrerPaiementPour(self, bailId: int, paiement) -> None: pass
    def consulterTableauDeBord(self) -> dict: return {}
    def envoyerMessageGlobal(self, message: str) -> None: pass
    def envoyerMessageA(self, userId: int, message: str) -> None: pass

class Proprietaire(Utilisateur):
    iban = models.CharField(max_length=34, blank=True, null=True)
    adresse_fiscale = models.TextField(blank=True, null=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey('immobilier.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='proprietaire_identite')

    class Meta:
        verbose_name = 'Propriétaire'
        verbose_name_plural = 'Propriétaires'

    def save(self, *args, **kwargs):
        if not self.pk:
            self.role = RoleEnum.PROPRIETAIRE
        super().save(*args, **kwargs)

    def uploaderCarteIdentite(self, doc) -> None: pass
    def getCarteIdentite(self): pass
    def ajouterBien(self, bien, photos: list): pass
    def modifierBien(self, id: int, bien): pass
    def archiverBien(self, id: int) -> None: pass
    def listerMesBiens(self) -> list: return []
    def listerBiensVacants(self) -> list: return []
    def consulterDossiersCandidats(self, bienId: int) -> list: return []
    def validerDossier(self, dossierId: int) -> None: pass
    def refuserDossier(self, dossierId: int, motif: str) -> None: pass
    def creerBail(self, dossierId: int): pass
    def signerBail(self, bailId: int, imageSignature: str) -> None: pass
    def resilierBail(self, bailId: int, motif: str) -> None: pass
    def validerPaiement(self, paiementId: int) -> None: pass
    def enregistrerDepense(self, depense): pass
    def consulterRevenus(self, debut, fin) -> float: return 0.0
    def consulterDepenses(self, debut, fin) -> float: return 0.0
    def calculerBeneficeNet(self, debut, fin) -> float: return 0.0
    def listerImpayes(self) -> list: return []
    def exporterSynthese(self, format: str): pass
    def listerMesLocataires(self) -> list: return []

class Client(Utilisateur):
    profession = models.CharField(max_length=150, blank=True, null=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey('immobilier.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='client_identite')
    revenus_mensuels = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'

    def save(self, *args, **kwargs):
        if not self.pk:
            self.role = RoleEnum.CLIENT
        super().save(*args, **kwargs)

    def uploaderCarteIdentite(self, doc) -> None: pass
    def getCarteIdentite(self): pass
    def rechercherBiens(self, ville: str, budget: float, nbPieces: int) -> list: return []
    def consulterDetailBien(self, bienId: int): pass
    def deposerDossier(self, bienId: int, documents: list): pass
    def completerDossier(self, dossierId: int, doc) -> None: pass
    def annulerDossier(self, dossierId: int) -> None: pass
    def consulterMesDossiers(self) -> list: return []
    def consulterStatutDossier(self, dossierId: int): pass
    def ajouterGarant(self, garant) -> None: pass
    def modifierGarant(self, garantId: int, garant) -> None: pass
    def supprimerGarant(self, garantId: int) -> None: pass
    def consulterMonBail(self): pass
    def signerBail(self, bailId: int, imageSignature: str) -> None: pass
    def consulterHistoriquePaiements(self) -> list: return []
    def consulterSolde(self) -> float: return 0.0
    def consulterProchaineEcheance(self): pass
    def telechargerQuittance(self, mois: int, annee: int): pass
    def signalerProbleme(self, bailId: int, description: str): pass

class Garant(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='garants')
    nom = models.CharField(max_length=150)
    prenom = models.CharField(max_length=150)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    profession = models.CharField(max_length=150, blank=True, null=True)
    revenus_mensuels = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey('immobilier.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='garant_identite')

    def __str__(self):
        return f"Garant: {self.prenom} {self.nom}"

    def uploaderCarteIdentite(self, doc) -> None: pass
    def getCarteIdentite(self): pass
    def mettreAJour(self) -> None: pass
