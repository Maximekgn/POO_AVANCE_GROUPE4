from django.db import models
from .enums import TypeDocumentEnum

class Document(models.Model):
    nom = models.CharField(max_length=255)
    url = models.URLField(max_length=500, blank=True, null=True)
    file = models.FileField(upload_to='documents/', blank=True, null=True)
    type = models.CharField(max_length=50, choices=TypeDocumentEnum.choices)
    taille_octets = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    date_generation = models.DateTimeField(auto_now_add=True)
    
    bail = models.ForeignKey('immobilier.Bail', on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    dossier = models.ForeignKey('immobilier.Dossier', on_delete=models.CASCADE, related_name='documents_inclus', null=True, blank=True)

    def __str__(self):
        return f"{self.nom} ({self.get_type_display()})"

    def telecharger(self):
        pass

    def envoyer(self, email: str) -> None:
        pass

    def supprimer(self) -> None:
        pass

    def getExtension(self) -> str:
        return ""

    def estImage(self) -> bool:
        return False
