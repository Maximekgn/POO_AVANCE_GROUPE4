from django.db import models
from django.utils import timezone
from .utilisateurs import Utilisateur
from .patrimoine import Bien
from .location import Bail


class Incident(models.Model):
    """
    Incident/Maintenance signalé par un locataire.
    """
    STATUT_CHOICES = [
        ('OUVERT', 'Ouvert'),
        ('EN_COURS', 'En cours'),
        ('EN_ATTENTE_PIECES', 'En attente de pièces'),
        ('RESOLU', 'Résolu'),
        ('FERME', 'Fermé'),
    ]
    
    URGENCE_CHOICES = [
        ('FAIBLE', 'Faible'),
        ('MOYENNE', 'Moyenne'),
        ('ELEVEE', 'Élevée'),
        ('URGENTE', 'Urgente'),
    ]
    
    CATEGORIE_CHOICES = [
        ('EAU', 'Plomberie / Eau'),
        ('ELECTRICITE', 'Électricité'),
        ('CHAUFFAGE', 'Chauffage / Climatisation'),
        ('PORTES_FENETRES', 'Portes / Fenêtres'),
        ('APPAREILS', 'Appareils électroménagers'),
        ('INFILTRATIONS', 'Infiltrations / Humidité'),
        ('NUISIBLES', 'Nuisibles'),
        ('AUTRE', 'Autre'),
    ]
    
    # Références
    bien = models.ForeignKey(Bien, on_delete=models.CASCADE, related_name='incidents')
    locataire = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='incidents_signales')
    proprietaire = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='incidents_recus')
    assigne_a = models.ForeignKey(
        Utilisateur, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='incidents_assignes'
    )
    
    # Informations
    titre = models.CharField(max_length=200)
    description = models.TextField()
    categorie = models.CharField(max_length=50, choices=CATEGORIE_CHOICES)
    urgence = models.CharField(max_length=20, choices=URGENCE_CHOICES, default='MOYENNE')
    
    # Statut
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='OUVERT')
    date_ouverture = models.DateTimeField(auto_now_add=True)
    date_fermeture = models.DateTimeField(null=True, blank=True)
    
    # Résolution
    resolution_notes = models.TextField(blank=True, null=True)
    date_resolution = models.DateTimeField(null=True, blank=True)
    
    # Coûts
    cout_estime = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cout_reel = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pris_en_charge = models.CharField(
        max_length=50, 
        choices=[
            ('PROPRIETAIRE', 'Propriétaire'),
            ('LOCATAIRE', 'Locataire'),
            ('ASSURANCE', 'Assurance'),
            ('PARTAGE', 'Partagé'),
        ], 
        null=True, 
        blank=True
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_ouverture']
        verbose_name = 'Incident'
        verbose_name_plural = 'Incidents'
    
    def __str__(self):
        return f"Incident #{self.id} - {self.titre} ({self.statut})"
    
    def est_urgent(self):
        return self.urgence in ['ELEVEE', 'URGENTE']
    
    def jours_ouverts(self):
        if self.date_fermeture:
            delta = self.date_fermeture - self.date_ouverture
            return delta.days
        delta = timezone.now() - self.date_ouverture
        return delta.days


class IncidentMessage(models.Model):
    """
    Messages échangés dans un incident.
    """
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='messages')
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    message = models.TextField()
    files_jointes = models.JSONField(default=list, blank=True)
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Message incident'
        verbose_name_plural = 'Messages incidents'
    
    def __str__(self):
        return f"Message #{self.id} pour Incident #{self.incident.id}"


class IncidentPhoto(models.Model):
    """
    Photos associées à un incident.
    """
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='incidents/photos/')
    legende = models.CharField(max_length=200, blank=True)
    est_preuve = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['uploaded_at']
        verbose_name = 'Photo incident'
        verbose_name_plural = 'Photos incidents'
    
    def __str__(self):
        return f"Photo #{self.id} pour Incident #{self.incident.id}"


class Review(models.Model):
    """
    Avis et notations laissés par les utilisateurs.
    """
    TYPE_CHOICES = [
        ('LOCATAIRE_BIEN', 'Locataire → Bien'),
        ('LOCATAIRE_PROPRIO', 'Locataire → Propriétaire'),
        ('PROPRIO_LOCATAIRE', 'Propriétaire → Locataire'),
    ]
    
    # Références
    bail = models.OneToOneField(Bail, on_delete=models.CASCADE, related_name='reviews')
    auteur = models.ForeignKey(
        Utilisateur, 
        on_delete=models.CASCADE, 
        related_name='reviews_donnes'
    )
    cible_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    cible_id = models.IntegerField()
    
    # Note
    note_globale = models.IntegerField(choices=[(i, f'{i} étoiles') for i in range(1, 6)])
    note_proprete = models.IntegerField(null=True, blank=True)
    note_exactitude = models.IntegerField(null=True, blank=True)
    note_communication = models.IntegerField(null=True, blank=True)
    note_emplacement = models.IntegerField(null=True, blank=True)
    note_enregistrement = models.IntegerField(null=True, blank=True)
    
    # Commentaire
    commentaire = models.TextField()
    points_positifs = models.TextField(blank=True)
    points_negatifs = models.TextField(blank=True)
    
    # Statut
    est_visible = models.BooleanField(default=False)
    est_signale = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    # Réponse
    reponse = models.TextField(blank=True, null=True)
    date_reponse = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['cible_type', 'cible_id']),
        ]
        verbose_name = 'Avis'
        verbose_name_plural = 'Avis'
    
    def __str__(self):
        return f"Avis {self.note_globale}/5 - {self.auteur.email}"
    
    def calculer_moyenne(self):
        notes = [
            self.note_proprete,
            self.note_exactitude,
            self.note_communication,
            self.note_emplacement,
            self.note_enregistrement,
        ]
        notes_valides = [n for n in notes if n is not None]
        if notes_valides:
            return sum(notes_valides) / len(notes_valides)
        return self.note_globale


class ReviewSignalement(models.Model):
    """
    Signalement d'un avis inapproprié.
    """
    MOTIF_CHOICES = [
        ('FAUX', 'Avis faux ou frauduleux'),
        ('INAPPROPRIE', 'Contenu inapproprié'),
        ('CONFLIT', 'Conflit d\'intérêts'),
        ('AUTRE', 'Autre'),
    ]
    
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='signalements')
    signaleur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    motif = models.CharField(max_length=50, choices=MOTIF_CHOICES)
    description = models.TextField()
    date_signalement = models.DateTimeField(auto_now_add=True)
    traite_par = models.ForeignKey(
        Utilisateur, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='signalements_traites'
    )
    resolution = models.TextField(blank=True, null=True)
    date_resolution = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date_signalement']
        verbose_name = 'Signalement d\'avis'
        verbose_name_plural = 'Signalements d\'avis'
    
    def __str__(self):
        return f"Signalement #{self.id} - Avis #{self.review.id}"
