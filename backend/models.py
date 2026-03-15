from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

# ==============================================================================
# ENUMERATIONS (using Django TextChoices)
# ==============================================================================

class RoleEnum(models.TextChoices):
    ADMIN = 'ADMIN', _('Admin')
    PROPRIETAIRE = 'PROPRIETAIRE', _('Propriétaire')
    CLIENT = 'CLIENT', _('Client')

class StatutBienEnum(models.TextChoices):
    EN_ATTENTE_VALIDATION = 'EN_ATTENTE_VALIDATION', _('En attente de validation')
    VACANT = 'VACANT', _('Vacant')
    LOUE = 'LOUE', _('Loué')
    EN_TRAVAUX = 'EN_TRAVAUX', _('En travaux')

class StatutBailEnum(models.TextChoices):
    BROUILLON = 'BROUILLON', _('Brouillon')
    EN_ATTENTE_SIGNATURE = 'EN_ATTENTE_SIGNATURE', _('En attente de signature')
    EN_COURS = 'EN_COURS', _('En cours')
    EXPIRE = 'EXPIRE', _('Expiré')
    RESILIE = 'RESILIE', _('Résilié')

class StatutDossierEnum(models.TextChoices):
    SOUMIS = 'SOUMIS', _('Soumis')
    EN_ETUDE = 'EN_ETUDE', _('En étude')
    VALIDE = 'VALIDE', _('Validé')
    REFUSE = 'REFUSE', _('Refusé')

class StatutPaiementEnum(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', _('En attente')
    PAYE = 'PAYE', _('Payé')
    IMPAYE = 'IMPAYE', _('Impayé')

class TypeDocumentEnum(models.TextChoices):
    QUITTANCE = 'QUITTANCE', _('Quittance')
    BAIL = 'BAIL', _('Bail')
    JUSTIFICATIF = 'JUSTIFICATIF', _('Justificatif')
    PIECE_IDENTITE = 'PIECE_IDENTITE', _('Pièce d\'identité')

class TypeSignataireEnum(models.TextChoices):
    PROPRIETAIRE = 'PROPRIETAIRE', _('Propriétaire')
    LOCATAIRE = 'LOCATAIRE', _('Locataire')

# ==============================================================================
# UTILISATEURS
# ==============================================================================

class Utilisateur(AbstractUser):
    # Les champs nom, prenom, email, motDePasse, actif, dateCreation, dernierLogin
    # sont déjà gérés (en grande partie) par AbstractUser (first_name, last_name, email, password, is_active, date_joined, last_login)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, choices=RoleEnum.choices, default=RoleEnum.CLIENT)

    # Résolution des conflits pour groups et user_permissions si nécessaire, 
    # mais puisque c'est le modèle d'utilisateur principal, on peut les laisser par défaut
    # à condition de le définir comme AUTH_USER_MODEL dans settings.py.

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

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

# On doit d'abord définir Document pour pouvoir l'utiliser comme ForeignKey
class Document(models.Model):
    nom = models.CharField(max_length=255)
    url = models.URLField(max_length=500, blank=True, null=True)
    file = models.FileField(upload_to='documents/', blank=True, null=True)
    type = models.CharField(max_length=50, choices=TypeDocumentEnum.choices)
    taille_octets = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    date_generation = models.DateTimeField(auto_now_add=True)
    
    # Relations inverses pour Bail et Dossier (0..* depuis Bail et Dossier)
    bail = models.ForeignKey('Bail', on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    dossier = models.ForeignKey('Dossier', on_delete=models.CASCADE, related_name='documents_inclus', null=True, blank=True)

    def __str__(self):
        return f"{self.nom} ({self.get_type_display()})"

class Proprietaire(Utilisateur):
    iban = models.CharField(max_length=34, blank=True, null=True)
    adresse_fiscale = models.TextField(blank=True, null=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='proprietaire_identite')

    class Meta:
        verbose_name = 'Propriétaire'
        verbose_name_plural = 'Propriétaires'

    def save(self, *args, **kwargs):
        self.role = RoleEnum.PROPRIETAIRE
        super().save(*args, **kwargs)

class Client(Utilisateur):
    profession = models.CharField(max_length=150, blank=True, null=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_identite')
    revenus_mensuels = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'

    def save(self, *args, **kwargs):
        self.role = RoleEnum.CLIENT
        super().save(*args, **kwargs)

class Garant(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='garants')
    nom = models.CharField(max_length=150)
    prenom = models.CharField(max_length=150)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    profession = models.CharField(max_length=150, blank=True, null=True)
    revenus_mensuels = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    numero_piece = models.CharField(max_length=100, blank=True, null=True)
    carte_identite = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='garant_identite')

    def __str__(self):
        return f"Garant: {self.prenom} {self.nom}"

# ==============================================================================
# PATRIMOINE IMMOBILIER
# ==============================================================================

class Bien(models.Model):
    proprietaire = models.ForeignKey(Proprietaire, on_delete=models.CASCADE, related_name='biens')
    reference = models.CharField(max_length=100, unique=True)
    adresse = models.CharField(max_length=255)
    ville = models.CharField(max_length=100)
    code_postal = models.CharField(max_length=20)
    description = models.TextField(blank=True, null=True)
    superficie = models.DecimalField(max_digits=8, decimal_places=2)
    nb_pieces = models.IntegerField()
    etage = models.IntegerField(null=True, blank=True)
    meuble = models.BooleanField(default=False)
    loyer_hc = models.DecimalField(max_digits=10, decimal_places=2)
    charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    depot_garantie = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    statut = models.CharField(max_length=50, choices=StatutBienEnum.choices, default=StatutBienEnum.EN_ATTENTE_VALIDATION)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference} - {self.adresse}, {self.ville}"

class Photo(models.Model):
    bien = models.ForeignKey(Bien, on_delete=models.CASCADE, related_name='photos')
    url = models.URLField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to='biens/photos/', blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    principale = models.BooleanField(default=False)
    ordre = models.IntegerField(default=0)
    date_upload = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return f"Photo {self.id} de Bien {self.bien_id}"

# ==============================================================================
# LOCATION & BAIL
# ==============================================================================

class Dossier(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='dossiers')
    bien = models.ForeignKey(Bien, on_delete=models.CASCADE, related_name='dossiers_candidats')
    date_demande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=50, choices=StatutDossierEnum.choices, default=StatutDossierEnum.SOUMIS)
    note_proprietaire = models.TextField(blank=True, null=True)
    motif_refus = models.TextField(blank=True, null=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Dossier {self.id} - {self.client} pour Bien {self.bien}"

class Bail(models.Model):
    bien = models.ForeignKey(Bien, on_delete=models.RESTRICT, related_name='baux')
    client = models.ForeignKey(Client, on_delete=models.RESTRICT, related_name='baux')
    dossier = models.OneToOneField(Dossier, on_delete=models.SET_NULL, null=True, blank=True, related_name='bail_resultant')
    numero_bail = models.CharField(max_length=100, unique=True)
    date_entree = models.DateField()
    date_sortie = models.DateField(null=True, blank=True)
    date_signature_proprietaire = models.DateTimeField(null=True, blank=True)
    date_signature_client = models.DateTimeField(null=True, blank=True)
    loyer_actuel = models.DecimalField(max_digits=10, decimal_places=2)
    depot_garantie = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=50, choices=StatutBailEnum.choices, default=StatutBailEnum.BROUILLON)

    class Meta:
        verbose_name_plural = 'Baux'

    def __str__(self):
        return f"Bail {self.numero_bail} - {self.bien}"

class SignatureBail(models.Model):
    bail = models.ForeignKey(Bail, on_delete=models.CASCADE, related_name='signatures')
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='signatures_baux')
    type_signataire = models.CharField(max_length=50, choices=TypeSignataireEnum.choices)
    image_signature_url = models.URLField(max_length=500, blank=True, null=True)
    image_signature = models.ImageField(upload_to='signatures/', blank=True, null=True)
    ip_adresse = models.GenericIPAddressField(null=True, blank=True)
    date_signature = models.DateTimeField(auto_now_add=True)
    hash_integrite = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Signature {self.type_signataire} pour Bail {self.bail_id}"

# ==============================================================================
# COMPTABILITÉ
# ==============================================================================

class Paiement(models.Model):
    bail = models.ForeignKey(Bail, on_delete=models.CASCADE, related_name='paiements')
    reference = models.CharField(max_length=100, unique=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    date_paiement = models.DateTimeField(null=True, blank=True)
    date_echeance = models.DateField()
    statut = models.CharField(max_length=50, choices=StatutPaiementEnum.choices, default=StatutPaiementEnum.EN_ATTENTE)
    mode_paiement = models.CharField(max_length=100, blank=True, null=True)
    commentaire = models.TextField(blank=True, null=True)
    
    # 0..1 Document
    quittance = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='paiement_associe')

    def __str__(self):
        return f"Paiement {self.reference} de {self.montant}"

class Depense(models.Model):
    proprietaire = models.ForeignKey(Proprietaire, on_delete=models.CASCADE, related_name='depenses')
    bien = models.ForeignKey(Bien, on_delete=models.CASCADE, related_name='depenses', null=True, blank=True)
    categorie = models.CharField(max_length=100)
    libelle = models.CharField(max_length=255)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    date_depense = models.DateField()
    fournisseur = models.CharField(max_length=150, blank=True, null=True)
    numero_facture = models.CharField(max_length=100, blank=True, null=True)
    
    # 0..1 Document
    justificatif = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='depense_associee')

    def __str__(self):
        return f"Dépense {self.libelle} ({self.montant})"

# ==============================================================================
# MESSAGERIE
# ==============================================================================

class Message(models.Model):
    expediteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='messages_envoyes')
    destinataire = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='messages_recus')
    conversation_id = models.CharField(max_length=100, blank=True, null=True) # Pouvant être un UUID ou hash
    objet = models.CharField(max_length=255, blank=True, null=True)
    contenu = models.TextField()
    lu = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"De {self.expediteur} à {self.destinataire} le {self.date_envoi}"
