from django.db import models
from .enums import StatutPaiementEnum
from .location import Bail
from .utilisateurs import Proprietaire
from .patrimoine import Bien

class Paiement(models.Model):
    bail = models.ForeignKey(Bail, on_delete=models.CASCADE, related_name='paiements')
    reference = models.CharField(max_length=100, unique=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    date_paiement = models.DateTimeField(null=True, blank=True)
    date_echeance = models.DateField()
    statut = models.CharField(max_length=50, choices=StatutPaiementEnum.choices, default=StatutPaiementEnum.EN_ATTENTE)
    mode_paiement = models.CharField(max_length=100, blank=True, null=True)
    commentaire = models.TextField(blank=True, null=True)
    
    quittance = models.ForeignKey('immobilier.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='paiement_associe')

    def __str__(self):
        return f"Paiement {self.reference} de {self.montant}"

    def valider(self) -> None: pass
    def marquerImpaye(self) -> None: pass
    def estEnRetard(self) -> bool: return False
    def getNbJoursRetard(self) -> int: return 0
    def genererQuittance(self): pass
    def envoyerRappel(self): pass
    def genererReference(self) -> str: return ""
    def calculerPenaliteRetard(self, tauxJour: float) -> float: return 0.0

class Depense(models.Model):
    proprietaire = models.ForeignKey(Proprietaire, on_delete=models.CASCADE, related_name='depenses')
    bien = models.ForeignKey(Bien, on_delete=models.CASCADE, related_name='depenses', null=True, blank=True)
    categorie = models.CharField(max_length=100)
    libelle = models.CharField(max_length=255)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    date_depense = models.DateField()
    fournisseur = models.CharField(max_length=150, blank=True, null=True)
    numero_facture = models.CharField(max_length=100, blank=True, null=True)
    
    justificatif = models.ForeignKey('immobilier.Document', on_delete=models.SET_NULL, null=True, blank=True, related_name='depense_associee')

    def __str__(self):
        return f"Dépense {self.libelle} ({self.montant})"

    def enregistrer(self) -> None: pass
    def modifier(self) -> None: pass
    def supprimer(self) -> None: pass
    def ajouterJustificatif(self, doc) -> None: pass
    def getJustificatif(self): pass
