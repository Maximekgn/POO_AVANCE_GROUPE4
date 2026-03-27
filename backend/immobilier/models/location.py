from django.db import models
from .enums import (
    StatutDossierEnum,
    StatutBailEnum,
    TypeSignataireEnum,
    TypeDemandeEnum,
    StatutDemandeEnum,
)
from .utilisateurs import ClientInfo, Utilisateur
from .patrimoine import Bien


class DemandeAction(models.Model):
    bien = models.ForeignKey(Bien, on_delete=models.CASCADE, related_name='demandes_actions')
    demandeur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='demandes_effectuees')
    proprietaire = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='demandes_recues')
    type_demande = models.CharField(max_length=30, choices=TypeDemandeEnum.choices)
    statut = models.CharField(max_length=30, choices=StatutDemandeEnum.choices, default=StatutDemandeEnum.EN_ATTENTE)
    date_debut = models.DateField()
    date_fin = models.DateField()
    date_visite = models.DateTimeField(null=True, blank=True)
    duree_jours = models.PositiveIntegerField(default=1)
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    message = models.TextField(blank=True, null=True)
    note_proprietaire = models.TextField(blank=True, null=True)
    motif_refus = models.TextField(blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(null=True, blank=True)
    traite_par = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes_traitees',
    )
    paiement_demande_envoyee = models.BooleanField(default=False, help_text="True si une demande de paiement a été envoyée au locataire")
    paiement_effectue = models.BooleanField(default=False, help_text="True si le locataire a effectué le paiement")

    class Meta:
        ordering = ['-date_creation']
        verbose_name = 'Demande d action'
        verbose_name_plural = 'Demandes d action'

    def __str__(self):
        return f"Demande {self.type_demande} #{self.id} - Bien {self.bien_id}"

class Dossier(models.Model):
    client_info = models.ForeignKey(ClientInfo, on_delete=models.CASCADE, related_name='dossiers', null=True, blank=True)
    bien = models.ForeignKey(Bien, on_delete=models.CASCADE, related_name='dossiers_candidats')
    date_demande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=50, choices=StatutDossierEnum.choices, default=StatutDossierEnum.SOUMIS)
    note_proprietaire = models.TextField(blank=True, null=True)
    motif_refus = models.TextField(blank=True, null=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Dossier {self.id} - {self.client} pour Bien {self.bien}"

    def mettreEnEtude(self) -> None: pass
    def valider(self) -> None: pass
    def refuser(self, motif: str) -> None: pass
    def ajouterDocument(self, doc) -> None: pass
    def supprimerDocument(self, docId: int) -> None: pass
    def listerDocuments(self) -> list: return []
    def estComplet(self) -> bool: return False
    def getDocumentsManquants(self) -> list: return []
    def genererBail(self): pass

class Bail(models.Model):
    bien = models.ForeignKey(Bien, on_delete=models.RESTRICT, related_name='baux')
    client_info = models.ForeignKey(ClientInfo, on_delete=models.RESTRICT, related_name='baux', null=True, blank=True)
    dossier = models.OneToOneField(Dossier, on_delete=models.SET_NULL, null=True, blank=True, related_name='bail_resultant')
    demande = models.OneToOneField('DemandeAction', on_delete=models.SET_NULL, null=True, blank=True, related_name='bail_genere')
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

    def signerParProprietaire(self, imageSignature: str) -> None: pass
    def signerParClient(self, imageSignature: str) -> None: pass
    def estSigneParProprietaire(self) -> bool: return False
    def estSigneParClient(self) -> bool: return False
    def estSigneParTous(self) -> bool: return False
    def getSignatureProprietaire(self): pass
    def getSignatureClient(self): pass
    def activer(self) -> None: pass
    def resilier(self, motif: str) -> None: pass
    def renouveler(self, nouvelleDateSortie) -> None: pass
    def expirer(self) -> None: pass
    def estActif(self) -> bool: return False
    def estExpirantBientot(self, joursAvant: int) -> bool: return False
    def getDureeRestante(self) -> int: return 0
    def genererEcheancier(self) -> list: return []
    def calculerTotalPercu(self) -> float: return 0.0
    def calculerTotalDu(self) -> float: return 0.0
    def getSoldeLocataire(self) -> float: return 0.0
    def getImpayes(self) -> list: return []
    def getProchaineEcheance(self): pass
    def genererDocumentBail(self): pass

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

    def verifierIntegrite(self) -> bool: return True
    def getImageSignature(self): pass
    def estValide(self) -> bool: return True
