from django.db import models
from .enums import StatutBienEnum
from .utilisateurs import ProprietaireInfo


class CategorieBien(models.Model):
    nom = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    ordre = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ordre', 'nom']
        verbose_name = 'Categorie de bien'
        verbose_name_plural = 'Categories de biens'

    def __str__(self):
        return self.nom


class SousTypeBien(models.Model):
    categorie = models.ForeignKey(CategorieBien, on_delete=models.CASCADE, related_name='sous_types')
    nom = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140)
    ordre = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ordre', 'nom']
        constraints = [
            models.UniqueConstraint(fields=['categorie', 'nom'], name='uniq_sous_type_nom_par_categorie'),
            models.UniqueConstraint(fields=['categorie', 'slug'], name='uniq_sous_type_slug_par_categorie'),
        ]
        verbose_name = 'Sous-type de bien'
        verbose_name_plural = 'Sous-types de biens'

    def __str__(self):
        return f"{self.categorie.nom} - {self.nom}"

class Bien(models.Model):
    proprietaire_info = models.ForeignKey(ProprietaireInfo, on_delete=models.CASCADE, related_name='biens', null=True, blank=True)
    categorie = models.ForeignKey(
        CategorieBien,
        on_delete=models.RESTRICT,
        related_name='biens',
        null=True,
        blank=True,
    )
    sous_type = models.ForeignKey(
        SousTypeBien,
        on_delete=models.RESTRICT,
        related_name='biens',
        null=True,
        blank=True,
    )
    reference = models.CharField(max_length=100, unique=True)
    adresse = models.CharField(max_length=255)
    quartier = models.CharField(max_length=120, blank=True, default='')
    ville = models.CharField(max_length=100)
    code_postal = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    superficie = models.DecimalField(max_digits=8, decimal_places=2)
    nb_pieces = models.IntegerField()
    etage = models.IntegerField(null=True, blank=True)
    meuble = models.BooleanField(default=False)
    prix_jour = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    prix_mois = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    loyer_hc = models.DecimalField(max_digits=10, decimal_places=2)
    charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    depot_garantie = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    statut = models.CharField(max_length=50, choices=StatutBienEnum.choices, default=StatutBienEnum.EN_ATTENTE_VALIDATION)
    is_active = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference} - {self.adresse}, {self.ville}"

    def changerStatut(self, statut) -> None: pass
    def estDisponible(self) -> bool: return False
    def estEnAttenteValidation(self) -> bool: return False
    def calculerLoyerTotal(self) -> float: return float(self.loyer_hc + self.charges)
    def calculerRentabilite(self, debut, fin) -> float: return 0.0
    def getTotalRevenus(self, debut, fin) -> float: return 0.0
    def getTotalDepenses(self, debut, fin) -> float: return 0.0
    def getBailActif(self): pass
    def getLocataireActuel(self): pass
    def getHistoriqueBaux(self) -> list: return []
    def listerDossiersCandidats(self) -> list: return []
    def ajouterPhoto(self, photo) -> None: pass
    def supprimerPhoto(self, photoId: int) -> None: pass
    def getPhotoPrincipale(self): pass
    def reordonnerPhotos(self, ordreMap: dict) -> None: pass

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

    def setPrincipale(self) -> None: pass
    def supprimer(self) -> None: pass
    def changerOrdre(self, nouvelOrdre: int) -> None: pass
