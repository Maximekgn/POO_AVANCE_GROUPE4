from django.db import models
from .utilisateurs import Utilisateur

class Message(models.Model):
    expediteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='messages_envoyes')
    destinataire = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='messages_recus')
    conversation_id = models.CharField(max_length=100, blank=True, null=True) 
    objet = models.CharField(max_length=255, blank=True, null=True)
    contenu = models.TextField()
    lu = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"De {self.expediteur} à {self.destinataire} le {self.date_envoi}"

    def marquerLu(self) -> None: pass
    def repondre(self, contenu: str): pass

    @staticmethod
    def getConversation(conversationId: int) -> list:
        return []

    @staticmethod
    def getConversationEntreUtilisateurs(userId1: int, userId2: int) -> list:
        return []
