from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class Utilisateur(AbstractUser):
    """
    Utilisateur de base du système.
    La distinction Admin se fait via is_staff/is_superuser.
    Les attributs métiers spécifiques sont gérés dans ProprietaireInfo et ClientInfo.
    """
    telephone = models.CharField(max_length=20, blank=True, null=True)
    photo_profil = models.URLField(blank=True, null=True)
    compte_verifie = models.BooleanField(default=False)
    email_verifie = models.BooleanField(default=False)
    documents_complets = models.BooleanField(default=False)
    
    # Vérification d'identité (obligatoire pour tous)
    piece_identite_recto = models.ImageField(upload_to='identite/recto/', blank=True, null=True)
    piece_identite_verso = models.ImageField(upload_to='identite/verso/', blank=True, null=True)
    photo_avec_piece = models.ImageField(upload_to='identite/photo/', blank=True, null=True)
    verification_statut = models.CharField(
        max_length=20,
        choices=[
            ('NON_SOUMIS', 'Non soumis'),
            ('EN_ATTENTE', 'En attente de vérification'),
            ('VERIFIE', 'Vérifié'),
            ('REFUSE', 'Refusé'),
        ],
        default='NON_SOUMIS'
    )
    verification_motif_refus = models.TextField(blank=True, null=True)
    
    date_creation = models.DateTimeField(auto_now_add=True, null=True)
    dernier_login_custom = models.DateTimeField(null=True, blank=True)

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

    def getMessages(self):
        from .messagerie import Message
        return Message.objects.filter(destinataire=self)

    def getMessagesNonLus(self) -> int:
        return self.getMessages().filter(lu=False).count()

    def isAdmin(self) -> bool:
        return bool(self.is_staff or self.is_superuser)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'


class ProprietaireInfo(models.Model):
    """
    Informations spécifiques à un propriétaire.
    Une personne peut avoir une ProprietaireInfo et une ClientInfo simultanément.
    """
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, related_name='proprietaire_info')
    iban = models.CharField(max_length=34, blank=True, null=True)
    adresse_fiscale = models.TextField(blank=True, null=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey('immobilier.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='proprietaire_identite')
    
    # Vérification de propriété (obligatoire pour créer des biens)
    titre_propriete = models.ImageField(upload_to='propriete/titres/', blank=True, null=True)
    video_avec_titre = models.FileField(upload_to='propriete/videos/', blank=True, null=True)
    propriete_verifiee = models.BooleanField(default=False)
    propriete_motif_refus = models.TextField(blank=True, null=True)
    
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ProprietaireInfo: {self.utilisateur.email}"

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

    class Meta:
        verbose_name = 'Information Propriétaire'
        verbose_name_plural = 'Informations Propriétaires'


class ClientInfo(models.Model):
    """
    Informations spécifiques à un client (locataire potentiel).
    Une personne peut avoir une ClientInfo et une ProprietaireInfo simultanément.
    """
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, related_name='client_info')
    profession = models.CharField(max_length=150, blank=True, null=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey('immobilier.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='client_identite')
    revenus_mensuels = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ClientInfo: {self.utilisateur.email}"

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

    class Meta:
        verbose_name = 'Information Client'
        verbose_name_plural = 'Informations Clients'


class Garant(models.Model):
    """
    Garant d'un client (locataire).
    Lié à ClientInfo au lieu de Client.
    """
    client_info = models.ForeignKey(ClientInfo, on_delete=models.CASCADE, related_name='garants', null=True, blank=True)
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

    class Meta:
        verbose_name = 'Garant'
        verbose_name_plural = 'Garants'

    def uploaderCarteIdentite(self, doc) -> None: pass
    def getCarteIdentite(self): pass
    def mettreAJour(self) -> None: pass


class RGPDAnonymizationLog(models.Model):
    """Journal de traçabilité des anonymisations RGPD."""

    cible_utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_anonymisation_rgpd',
    )
    anonymise_par = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anonymisations_rgpd_effectuees',
    )
    cible_utilisateur_id_original = models.IntegerField()
    email_original = models.EmailField(blank=True, null=True)
    motif = models.TextField(blank=True, null=True)
    resume = models.JSONField(default=dict, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = 'Journal anonymisation RGPD'
        verbose_name_plural = 'Journaux anonymisation RGPD'

    def __str__(self):
        return f"RGPD log user#{self.cible_utilisateur_id_original} le {self.date_creation}"


class EmailVerificationOTP(models.Model):
    """OTP email de verification associe a un utilisateur."""

    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='email_verification_otps',
    )
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['utilisateur', 'is_used', 'expires_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'OTP verification email'
        verbose_name_plural = 'OTP verifications email'

    def __str__(self):
        return f"OTP<{self.utilisateur.email}> exp={self.expires_at} used={self.is_used}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at
