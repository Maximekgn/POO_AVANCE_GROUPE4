# 🔄 WORKFLOW DÉTAILLÉ - MOIS 2
## CONFIANCE & PAIEMENTS

---

## 📋 SOMMAIRE

1. [🔧 Gestion des Incidents](#1--gestion-des-incidents)
2. [⭐ Système d'Avis & Notations](#2--système-davis--notations)
3. [💰 Paiements Récurrents Automatiques](#3--paiements-récurrents-automatiques)

---

# 1. 🔧 GESTION DES INCIDENTS

## 📊 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW GESTION INCIDENTS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Locataire          Propriétaire        Prestataire    Admin   │
│     │                    │                    │           │     │
│     │ 1. Signale        │                    │           │     │
│     ├───────────────────>│                    │           │     │
│     │                    │                    │           │     │
│     │ 2. Accusé réception│                    │           │     │
│     │<───────────────────┤                    │           │     │
│     │                    │                    │           │     │
│     │                    │ 3. Assigne         │           │     │
│     │                    ├───────────────────>│           │     │
│     │                    │                    │           │     │
│     │ 4. Updates         │ 5. Suit            │           │     │
│     │<═══════════════════╪════════════════════│           │     │
│     │                    │                    │           │     │
│     │                    │ 6. Intervient      │           │     │
│     │                    │<───────────────────┤           │     │
│     │                    │                    │           │     │
│     │ 7. Confirme résolu │ 8. Marque résolu   │           │     │
│     │<═══════════════════╪════════════════════│           │     │
│     │                    │                    │           │     │
│     │ 9. Évalue          │                    │           │     │
│     ├───────────────────>│                    │           │     │
│     │                    │                    │           │     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Modèles de Données

### Modèle: Incident
```python
class Incident(models.Model):
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
    assigne_a = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, 
                                   related_name='incidents_assignes', limit_choices_to={'role': 'PRESTATAIRE'})
    
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
    pris_en_charge = models.CharField(max_length=50, choices=[
        ('PROPRIETAIRE', 'Propriétaire'),
        ('LOCATAIRE', 'Locataire'),
        ('ASSURANCE', 'Assurance'),
        ('PARTAGE', 'Partagé'),
    ], null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Modèle: IncidentMessage
```python
class IncidentMessage(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='messages')
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    message = models.TextField()
    files_jointes = models.JSONField(default=list, blank=True)  # URLs des fichiers
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Modèle: IncidentPhoto
```python
class IncidentPhoto(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='incidents/photos/')
    legende = models.CharField(max_length=200, blank=True)
    est_preuve = models.BooleanField(default=False)  # Photo avant/après
    uploaded_at = models.DateTimeField(auto_now_add=True)
```

---

## 🔄 Workflow Détaillé

### ÉTAPE 1: Signalement par Locataire

```
┌─────────────────────────────────────────────────────────────┐
│                   SIGNALEMENT INCIDENT                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LOCATAIRE:                                                  │
│  1. Va sur /mes-baux/{bail_id}/incidents                    │
│  2. Clique "Signaler un problème"                           │
│  3. Remplit formulaire:                                      │
│     □ Catégorie (dropdown)                                   │
│     □ Titre (court)                                          │
│     □ Description (détaillée)                                │
│     □ Urgence (Faible/Moyenne/Élevée/Urgente)               │
│     □ Photos (avant/après)                                   │
│     □ Disponibilité pour visite                              │
│  4. Soumet                                                   │
│                                                              │
│  BACKEND:                                                    │
│  ✓ Crée Incident (statut='OUVERT')                          │
│  ✓ Notifie propriétaire (email + push)                      │
│  ✓ Génère numéro de ticket                                  │
│  ✓ Envoie accusé de réception au locataire                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Template Email - Accusé de Réception**
```
Objet: Incident #INC-2026-00123 - Bien reçu !

Bonjour [Prénom],

Nous avons bien reçu votre signalement d'incident.

📋 Détails:
- Numéro de ticket: #INC-2026-00123
- Bien: [Adresse du bien]
- Catégorie: [Catégorie]
- Urgence: [Niveau]

⏱️ Prochaines étapes:
1. Le propriétaire va examiner votre demande (sous 24-48h)
2. Un prestataire sera assigné si nécessaire
3. Vous serez tenu informé de l'avancement

📞 En cas d'urgence vitale, contactez le [numéro d'urgence]

Cordialement,
L'équipe ImmobilierPro
```

---

### ÉTAPE 2: Traitement par Propriétaire

```
┌─────────────────────────────────────────────────────────────┐
│                  TRAITEMENT PROPRIÉTAIRE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PROPRIÉTAIRE:                                               │
│  1. Reçoit notification (email + dashboard)                 │
│  2. Va sur /admin/dashboard/incidents/{id}                  │
│  3. Consulte les détails:                                    │
│     ✓ Photos avant/après                                    │
│     ✓ Description complète                                   │
│     ✓ Historique (si incident récurrent)                     │
│  4. Prend décision:                                          │
│     □ Accepter → Assigner prestataire                        │
│     □ Demander plus d'infos → Message au locataire          │
│     □ Refuser (si hors responsabilité) → Motif              │
│                                                              │
│  BACKEND:                                                    │
│  ✓ Change statut: 'OUVERT' → 'EN_COURS'                     │
│  ✓ Notifie locataire du statut                              │
│  ✓ Si assignation: notifie prestataire                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### ÉTAPE 3: Intervention Prestataire

```
┌─────────────────────────────────────────────────────────────┐
│                   INTERVENTION PRESTATAIRE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRESTATAIRE:                                                │
│  1. Reçoit mission assignée                                 │
│  2. Consulte détails incident                               │
│  3. Contacte locataire pour RDV                             │
│  4. Intervient sur place                                     │
│  5. Prend photos "après"                                     │
│  6. Remplit rapport d'intervention:                          │
│     □ Travaux effectués                                      │
│     □ Pièces changées                                        │
│     □ Temps passé                                            │
│     □ Photos avant/après                                     │
│  7. Soumet rapport + facture                                 │
│                                                              │
│  BACKEND:                                                    │
│  ✓ Met à jour incident                                      │
│  ✓ Enregistre photos                                        │
│  ✓ Notifie propriétaire + locataire                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### ÉTAPE 4: Clôture & Évaluation

```
┌─────────────────────────────────────────────────────────────┐
│                    CLÔTURE & ÉVALUATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LOCATAIRE:                                                  │
│  1. Reçoit notification "Intervention terminée"             │
│  2. Vérifie que problème est résolu                         │
│  3. Confirme (ou signale problème persistant)               │
│  4. Évalue l'intervention:                                   │
│     □ Note (1-5 étoiles)                                     │
│     □ Commentaire                                            │
│     □ Rapidité                                               │
│     □ Professionnalisme                                      │
│     □ Qualité des travaux                                    │
│                                                              │
│  PROPRIÉTAIRE:                                               │
│  1. Reçoit confirmation + évaluation                        │
│  2. Valide facture prestataire                              │
│  3. Change statut: 'EN_COURS' → 'RÉSOLU'                    │
│  4. Archive incident                                         │
│                                                              │
│  BACKEND:                                                    │
│  ✓ Calcule statistiques                                     │
│  ✓ Met à jour profil prestataire                            │
│  ✓ Envoie rapport mensuel                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Écrans Frontend

### 1. Formulaire de Signalement
```
┌──────────────────────────────────────────────────────┐
│  Signaler un problème                    [Annuler]   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  📍 Bien: [Appartement - 123 Rue de la Paix]         │
│                                                       │
│  📋 Catégorie *                                       │
│  [▼ Plomberie / Eau                        ▼]        │
│                                                       │
│  ⚡ Urgence *                                         │
│  ○ Faible  ● Moyenne  ○ Élevée  ○ Urgente           │
│                                                       │
│  📝 Titre *                                           │
│  [________________________________]                   │
│                                                       │
│  📄 Description *                                     │
│  [________________________________]                   │
│  [________________________________]                   │
│  [________________________________]                   │
│                                                       │
│  📸 Photos (avant/après)                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                     │
│  │  +  │ │ IMG │ │ IMG │ │  +  │                     │
│  └─────┘ └─────┘ └─────┘ └─────┘                     │
│                                                       │
│  📅 Disponibilité pour visite                         │
│  [____/____/____] de [__:__] à [__:__]               │
│                                                       │
│  [                SIGNALER LE PROBLÈME              ] │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 2. Timeline Incident
```
┌──────────────────────────────────────────────────────┐
│  Incident #INC-2026-00123                            │
│  Fuite d'eau - Cuisine                               │
├──────────────────────────────────────────────────────┤
│  Statut: ● En cours                                  │
│  Urgence: ⚠️ Élevée                                   │
│  Créé: 01/04/2026 à 14:30                            │
├──────────────────────────────────────────────────────┤
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  ○────────○────────○────────○────────○               │
│  Ouvert   Assigné  En cours  Résolu  Fermé          │
│           │                                          │
│        Plombier:                                     │
│        Jean Dupont                                   │
│        📞 228 90 00 00 00                            │
├──────────────────────────────────────────────────────┤
│  📋 MESSAGES (5)                                     │
│  ─────────────────────────────────────────────────   │
│  👤 Vous - 01/04 14:30                               │
│  "J'ai signalé une fuite sous l'évier."              │
│                                                       │
│  👤 Proprio - 01/04 16:45                            │
│  "Merci, j'assigne un plombier."                     │
│                                                       │
│  👤 Plombier - 02/04 09:00                           │
│  "Je passe cet après-midi vers 15h."                 │
│                                                       │
│  [________________________________] [Envoyer]        │
└──────────────────────────────────────────────────────┘
```

---

## 🔔 Notifications & Emails

### Déclencheurs

| Événement | Locataire | Propriétaire | Prestataire |
|-----------|-----------|--------------|-------------|
| Incident créé | ✅ Email | ✅ Email+Push | - |
| Incident assigné | ✅ Push | ✅ Push | ✅ Email+Push |
| Message nouveau | ✅ Push | ✅ Push | ✅ Push |
| Statut changé | ✅ Email+Push | ✅ Push | ✅ Push |
| Intervention terminée | ✅ Email+Push | ✅ Email | ✅ Push |
| Évaluation reçue | - | ✅ Email | ✅ Email |

---

## 📊 Métriques & KPIs

```python
# Dashboard Propriétaire
- Nombre d'incidents ouverts
- Temps moyen de résolution
- Coût total des interventions
- Incidents par catégorie
- Incidents par bien
- Taux de satisfaction (étoiles)

# Dashboard Admin
- Tous incidents plateforme
- Temps moyen global
- Prestataires les plus actifs
- Incidents récurrents par bien
- Alertes (incidents > 7 jours)
```

---

# 2. ⭐ SYSTÈME D'AVIS & NOTATIONS

## 📊 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW SYSTÈME D'AVIS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Locataire          Propriétaire        Système        Admin   │
│     │                    │                    │           │     │
│     │ 1. Séjour terminé  │                    │           │     │
│     │                    │                    │           │     │
│     │ 2. Reçoit demande  │                    │           │     │
│     │   d'avis (J+1)     │                    │           │     │
│     │                    │                    │           │     │
│     │ 3. Note + commente │                    │           │     │
│     ├─────────────────────────────────────────>│           │     │
│     │                    │                    │           │     │
│     │                    │ 4. Reçoit demande  │           │     │
│     │                    │   d'avis (J+2)     │           │     │
│     │                    │                    │           │     │
│     │                    │ 5. Note + commente │           │     │
│     ├─────────────────────────────────────────>│           │     │
│     │                    │                    │           │     │
│     │ 6. Voit avis proprio │◄─────────────────┤           │     │
│     │                    │                    │           │     │
│     │ 7. Répond (option) │                    │           │     │
│     ├─────────────────────────────────────────>│           │     │
│     │                    │                    │           │     │
│     │                    │ 8. Voit note moyenne│          │     │
│     │                    │◄───────────────────┤           │     │
│     │                    │                    │           │     │
│     │                    │                    │ 9. Modère │     │
│     │                    │                    │ (si besoin)    │
│     │                    │                    │           │     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Modèles de Données

### Modèle: Review
```python
class Review(models.Model):
    TYPE_CHOICES = [
        ('LOCATAIRE_BIEN', 'Locataire → Bien'),
        ('LOCATAIRE_PROPRIO', 'Locataire → Propriétaire'),
        ('PROPRIO_LOCATAIRE', 'Propriétaire → Locataire'),
    ]
    
    # Références
    bail = models.OneToOneField(Bail, on_delete=models.CASCADE, related_name='reviews')
    auteur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='reviews_donnes')
    cible_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    cible_id = models.IntegerField()  # ID du bien ou utilisateur cible
    
    # Note
    note_globale = models.IntegerField(choices=[(i, f'{i} étoiles') for i in range(1, 6)])
    note_proprete = models.IntegerField(null=True, blank=True)  # 1-5
    note_exactitude = models.IntegerField(null=True, blank=True)  # 1-5
    note_communication = models.IntegerField(null=True, blank=True)  # 1-5
    note_emplacement = models.IntegerField(null=True, blank=True)  # 1-5
    note_enregistrement = models.IntegerField(null=True, blank=True)  # 1-5
    
    # Commentaire
    commentaire = models.TextField()
    points_positifs = models.TextField(blank=True)
    points_negatifs = models.TextField(blank=True)
    
    # Statut
    est_visible = models.BooleanField(default=False)  # Visible après double avis
    est_signale = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    # Réponse
    reponse = models.TextField(blank=True, null=True)
    date_reponse = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['cible_type', 'cible_id']),
        ]
```

### Modèle: ReviewSignalement
```python
class ReviewSignalement(models.Model):
    MOTIF_CHOICES = [
        ('FAUX', 'Avis faux ou frauduleux'),
        ('INAPPROPRIE', 'Contenu inapproprié'),
        ('CONFLIT', 'Conflit d\'intérêts'),
        ('AUTRE', 'Autre'),
    ]
    
    review = models.ForeignKey(Review, on_delete=models.CASCADE)
    signaleur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    motif = models.CharField(max_length=50, choices=MOTIF_CHOICES)
    description = models.TextField()
    date_signalement = models.DateTimeField(auto_now_add=True)
    traite_par = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, related_name='signalements_traites')
    resolution = models.TextField(blank=True, null=True)
```

---

## 🔄 Workflow Détaillé

### ÉTAPE 1: Demande d'Avis (Locataire)

```
┌─────────────────────────────────────────────────────────────┐
│                    DEMANDE D'AVIS - LOCATAIRE               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DÉCLENCHEUR:                                                │
│  ✓ Bail statut = 'TERMINE'                                  │
│  ✓ date_sortie <= hier (J+1)                                │
│  ✓ Aucun avis existant                                      │
│                                                              │
│  BACKEND (Celery - Quotidien 10:00):                        │
│  1. Trouve baux terminés depuis 1 jour                      │
│  2. Vérifie si avis locataire existe                        │
│  3. Si non: Envoie email de demande                         │
│                                                              │
│  EMAIL TEMPLATE:                                             │
│  ─────────────────                                           │
│  Objet: Comment s'est passé votre séjour ? 🏠               │
│                                                              │
│  Bonjour [Prénom],                                           │
│                                                              │
│  Votre séjour à [Adresse] est terminé.                       │
│  Aidez la communauté en laissant un avis !                  │
│                                                              │
│  [★★★★★] Laisser un avis                                    │
│                                                              │
│  ⏰ Vous avez 14 jours pour laisser un avis.                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### ÉTAPE 2: Formulaire d'Avis

```
┌──────────────────────────────────────────────────────┐
│  Laissez un avis                         [Fermer X]  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  🏠 Bien: [Appartement - 123 Rue de la Paix]         │
│  📅 Séjour: 01/03/2026 - 31/03/2026                  │
│                                                       │
│  NOTE GLOBALE *                                       │
│  ☆ ☆ ☆ ☆ ☆  (cliquez pour noter)                     │
│                                                       │
│  NOTES DÉTAILLÉES:                                    │
│  ─────────────────                                    │
│  🧹 Propreté          [☆ ★ ★ ★ ★] 4/5                │
│  📋 Exactitude        [☆ ★ ★ ★ ★] 4/5                │
│  💬 Communication     [★ ★ ★ ★ ★] 5/5                │
│  📍 Emplacement       [☆ ★ ★ ★ ☆] 3/5                │
│  🔑 Enregistrement    [★ ★ ★ ★ ★] 5/5                │
│                                                       │
│  COMMENTAIRE *                                        │
│  ─────────────                                        │
│  [________________________________]                   │
│  [________________________________]                   │
│  [________________________________]                   │
│  (min. 50 caractères)                                 │
│                                                       │
│  👍 POINTS POSITIFS                                   │
│  [________________________________]                   │
│                                                       │
│  👎 POINTS NÉGATIFS (optionnel)                       │
│  [________________________________]                   │
│                                                       │
│  ☑️ J'autorise la publication de cet avis             │
│                                                       │
│  [                SOUMETTRE MON AVIS                ] │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

### ÉTAPE 3: Double Aveugle

```
┌─────────────────────────────────────────────────────────────┐
│                    RÈGLE DU DOUBLE AVEUGLE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRINCIPE:                                                   │
│  ✓ Locataire note en premier (J+1)                          │
│  ✓ Propriétaire note ensuite (J+2)                          │
│  ✓ Avis visibles SEULEMENT après les 2 notes                │
│  ✓ Ou après 14 jours (période d'avis expirée)               │
│                                                              │
│  AVANTAGES:                                                  │
│  ✓ Évite les représailles                                   │
│  ✓ Notes plus honnêtes                                      │
│  ✓ Réduit les conflits                                      │
│                                                              │
│  EXCEPTIONS:                                                 │
│  ✗ Si locataire ne note pas → Proprio ne voit jamais        │
│  ✗ Si proprio ne note pas → Locataire voit après 14j        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### ÉTAPE 4: Modération

```
┌─────────────────────────────────────────────────────────────┐
│                    MODÉRATION DES AVIS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SIGNALEMENTS (Utilisateurs):                               │
│  1. Bouton "Signaler cet avis" sur chaque review           │
│  2. Formulaire: Motif + Description                         │
│  3. Backend crée ReviewSignalement                          │
│  4. Notifie admin                                           │
│                                                              │
│  TRAITEMENT (Admin):                                         │
│  ─────────────────                                          │
│  Dashboard: /admin/dashboard/reviews/signalements           │
│                                                              │
│  [Signalement #123]                              [Traiter]   │
│  ─────────────────                                           │
│  Avis: "..." (3 étoiles)                                     │
│  Par: Jean D.                                                │
│  Motif: "Avis faux"                                          │
│  Description: "Cette personne n'a jamais..."                 │
│                                                              │
│  Actions:                                                    │
│  □ Masquer l'avis                                            │
│  □ Supprimer l'avis                                          │
│  □ Avertir l'auteur                                          │
│  □ Aucune action                                             │
│                                                              │
│  [Enregistrer]                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Calcul des Notes

```python
# Moyenne globale
def calculer_moyenne(cible_type, cible_id):
    reviews = Review.objects.filter(
        cible_type=cible_type,
        cible_id=cible_id,
        est_visible=True
    )
    
    if not reviews.exists():
        return None
    
    return {
        'globale': reviews.aggregate(Avg('note_globale'))['note_globale__avg'],
        'proprete': reviews.aggregate(Avg('note_proprete'))['note_proprete__avg'],
        'exactitude': reviews.aggregate(Avg('note_exactitude'))['note_exactitude__avg'],
        'communication': reviews.aggregate(Avg('note_communication'))['note_communication__avg'],
        'emplacement': reviews.aggregate(Avg('note_emplacement'))['note_emplacement__avg'],
        'enregistrement': reviews.aggregate(Avg('note_enregistrement'))['note_enregistrement__avg'],
        'total_reviews': reviews.count(),
    }

# Badge "Hôte Vérifié"
def verifier_badge_hote(user_id):
    stats = calculer_moyenne('LOCATAIRE_PROPRIO', user_id)
    
    if stats and stats['globale'] >= 4.5 and stats['total_reviews'] >= 10:
        return True
    return False
```

---

## 📱 Affichage des Avis

### Page Profil Propriétaire
```
┌──────────────────────────────────────────────────────┐
│  Pierre Proprio                            [Badge ✓] │
│  Hôte vérifié depuis 2024                            │
├──────────────────────────────────────────────────────┤
│  ⭐ 4.8/5  (127 avis)                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  ★★★★★  █ 85%  (108)                                 │
│  ★★★★☆  █ 10%  (13)                                  │
│  ★★★☆☆  █ 3%   (4)                                   │
│  ★★☆☆☆  █ 1%   (1)                                   │
│  ★☆☆☆☆  █ 1%   (1)                                   │
├──────────────────────────────────────────────────────┤
│  FILTRES: [Tous ▼] [Plus récents ▼]                  │
│  ─────────────────────────────────────────────────   │
│                                                       │
│  👤 Jean D. - ★★★★★ - 15/03/2026                     │
│  "Excellent propriétaire, très réactif !"            │
│  ✅ Séjour vérifié                                    │
│  ─────────────────────────────────────────────────   │
│                                                       │
│  👤 Marie L. - ★★★★☆ - 01/03/2026                    │
│  "Très bon accueil, petit problème de..."            │
│  ✅ Séjour vérifié                                    │
│  💬 Réponse de Pierre: "Merci Marie, ..."           │
│  ─────────────────────────────────────────────────   │
│                                                       │
│  [Voir les 127 avis]                                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔔 Notifications

| Événement | Locataire | Propriétaire |
|-----------|-----------|--------------|
| Séjour terminé (J+1) | ✅ Email demande avis | - |
| Séjour terminé (J+2) | - | ✅ Email demande avis |
| Nouvel avis reçu | ✅ Push | ✅ Push |
| Proprio répond | ✅ Email+Push | - |
| Avis signalé | - | - |
| Modération (avis masqué) | ✅ Email | ✅ Email |

---

# 3. 💰 PAIEMENTS RÉCURRENTS AUTOMATIQUES

## 📊 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│              WORKFLOW PAIEMENTS RÉCURRENTS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Locataire          Système           Backend         Proprio  │
│     │                    │                    │           │     │
│     │ 1. Configure     │                    │           │     │
│     │    prélèvement   │                    │           │     │
│     ├─────────────────>│                    │           │     │
│     │                    │                    │           │     │
│     │                    │ 2. Enregistre     │           │     │
│     │                    │    subscription   │           │     │
│     │                    ├───────────────────>│           │     │
│     │                    │                    │           │     │
│     │                    │ 3. J-3: Rappel    │           │     │
│     │<───────────────────┤                    │           │     │
│     │                    │                    │           │     │
│     │                    │ 4. Jour J: Prélève│           │     │
│     │                    ├───────────────────>│           │     │
│     │                    │                    │           │     │
│     │ 5. Confirmation  │                    │           │     │
│     │<───────────────────┤                    │           │     │
│     │                    │                    │           │     │
│     │                    │ 6. Reversement    │           │     │
│     │                    │    (J+2)          │           │     │
│     │                    ├─────────────────────────────>│     │
│     │                    │                    │           │     │
│     │                    │ 7. Échec: Relance │           │     │
│     │<───────────────────┤                    │           │     │
│     │                    │                    │           │     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Modèles de Données

### Modèle: PaiementRecurrent
```python
class PaiementRecurrent(models.Model):
    FREQUENCE_CHOICES = [
        ('MENSUEL', 'Mensuel'),
        ('TRIMESTRIEL', 'Trimestriel'),
        ('SEMESTRIEL', 'Semestriel'),
        ('ANNUEL', 'Annuel'),
    ]
    
    STATUT_CHOICES = [
        ('ACTIF', 'Actif'),
        ('SUSPENDU', 'Suspendu'),
        ('ANNULE', 'Annulé'),
        ('ECHEC', 'En échec'),
    ]
    
    # Références
    bail = models.ForeignKey(Bail, on_delete=models.CASCADE, related_name='paiements_recurrents')
    locataire = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    
    # Configuration
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    frequence = models.CharField(max_length=20, choices=FREQUENCE_CHOICES, default='MENSUEL')
    jour_paiement = models.IntegerField(help_text="Jour du mois (1-28)")  # 1-28 pour éviter problèmes
    
    # Prochain paiement
    prochain_paiement = models.DateField()
    dernier_paiement = models.DateField(null=True, blank=True)
    
    # Moyen de paiement
    mode_paiement = models.CharField(max_length=50, choices=[
        ('STRIPE', 'Carte Bancaire (Stripe)'),
        ('ORANGE_MONEY', 'Orange Money'),
        ('MTN_MONEY', 'MTN Mobile Money'),
    ])
    payment_method_id = models.CharField(max_length=255)  # Stripe customer ID ou numéro
    
    # Statut
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIF')
    echecs_consecutifs = models.IntegerField(default=0)
    date_dernier_echec = models.DateField(null=True, blank=True)
    
    # Metadata
    date_creation = models.DateTimeField(auto_now_add=True)
    date_annulation = models.DateTimeField(null=True, blank=True)
    motif_annulation = models.TextField(blank=True, null=True)
```

### Modèle: PaiementAutoLog
```python
class PaiementAutoLog(models.Model):
    STATUT_CHOICES = [
        ('SUCCES', 'Succès'),
        ('ECHEC', 'Échec'),
        ('EN_ATTENTE', 'En attente'),
    ]
    
    paiement_recurrent = models.ForeignKey(PaiementRecurrent, on_delete=models.CASCADE)
    date_prevue = models.DateField()
    date_execution = models.DateTimeField(null=True, blank=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES)
    erreur_message = models.TextField(blank=True, null=True)
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    recu_url = models.URLField(blank=True, null=True)
```

---

## 🔄 Workflow Détaillé

### ÉTAPE 1: Configuration

```
┌─────────────────────────────────────────────────────────────┐
│              CONFIGURATION PRÉLÈVEMENT AUTO                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LOCATAIRE:                                                  │
│  1. Va sur /finances                                        │
│  2. Clique "Activer le prélèvement automatique"             │
│  3. Configure:                                               │
│     □ Montant (pré-rempli depuis bail)                      │
│     □ Fréquence (Mensuel par défaut)                        │
│     □ Jour de paiement (1-28)                               │
│     □ Moyen de paiement (Carte, OM, MTN)                    │
│  4. Saisit infos carte / numéro mobile                      │
│  5. Confirme                                                 │
│                                                              │
│  BACKEND:                                                    │
│  ✓ Crée PaiementRecurrent                                   │
│  ✓ Stripe: Crée Customer + Subscription                     │
│  ✓ Mobile Money: Enregistre numéro                          │
│  ✓ Calcule prochain_paiement                                │
│  ✓ Envoie email confirmation                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Template Email - Confirmation**
```
Objet: ✅ Prélèvement automatique activé

Bonjour [Prénom],

Votre prélèvement automatique est activé !

📋 Détails:
- Montant: 120 000 FCFA/mois
- Jour de prélèvement: 5 de chaque mois
- Moyen de paiement: Carte **** 1234
- Prochain prélèvement: 05/05/2026

📧 Vous recevrez un email 3 jours avant chaque prélèvement.

Vous pouvez modifier ou annuler à tout moment depuis /finances.

Cordialement,
ImmobilierPro
```

---

### ÉTAPE 2: Exécution Automatique (Celery Beat)

```python
# tasks.py - Tâche quotidienne (exécutée à 6:00)

@app.task
def executer_paiements_auto():
    today = date.today()
    
    # Trouver paiements à exécuter aujourd'hui
    paiements_a_executer = PaiementRecurrent.objects.filter(
        statut='ACTIF',
        prochain_paiement=today
    )
    
    for paiement in paiements_a_executer:
        try:
            # Exécuter paiement
            resultat = processeur_paiement(paiement)
            
            if resultat.succes:
                # Créer PaiementAutoLog (SUCCES)
                # Mettre à jour PaiementRecurrent:
                #   - dernier_paiement = today
                #   - prochain_paiement = today + 1 mois
                #   - echecs_consecutifs = 0
                # Créer Paiement (modèle existant)
                # Envoyer email confirmation
                notifier_succes(paiement)
            else:
                gerer_echec(paiement, resultat.erreur)
                
        except Exception as e:
            gerer_echec(paiement, str(e))
```

---

### ÉTAPE 3: Gestion des Échecs

```
┌─────────────────────────────────────────────────────────────┐
│                    GESTION DES ÉCHECS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SCÉNARIO: Carte expirée / Fonds insuffisants               │
│                                                              │
│  J (Échec):                                                  │
│  ──────────                                                  │
│  ✓ Paiement échoue                                          │
│  ✓ Log créé (statut='ECHEC')                                │
│  ✓ paiement.echecs_consecutifs += 1                         │
│  ✓ Email locataire: "Échec de prélèvement"                  │
│                                                              │
│  J+1:                                                        │
│  ─────                                                       │
│  ✓ SMS notification: "Paiement échoué. Veuillez..."         │
│                                                              │
│  J+3:                                                        │
│  ─────                                                       │
│  ✓ 2ème tentative automatique                               │
│  ✓ Si échec: Email + SMS + Notification app                 │
│                                                              │
│  J+7:                                                        │
│  ─────                                                       │
│  ✓ 3ème tentative automatique                               │
│  ✓ Si échec:                                                │
│    - paiement.statut = 'ECHEC'                              │
│    - bail.statut passe en 'IMPAYE'                          │
│    - Proprio notifié                                        │
│    - Procédure recouvrement lancée                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### ÉTAPE 4: Reversement au Propriétaire

```
┌─────────────────────────────────────────────────────────────┐
│                    REVERSEMENT AUTO                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RÈGLE: J+2 après paiement locataire                        │
│                                                              │
│  BACKEND (Celery Beat - Quotidien 10:00):                   │
│  1. Trouve paiements avec:                                  │
│     - statut='PAYE'                                         │
│     - date_paiement <= today - 2 jours                      │
│     - commission non calculée                               │
│                                                              │
│  2. Pour chaque paiement:                                   │
│     ✓ Calcule commission (5%)                               │
│     ✓ Calcule montant_reverse                               │
│     ✓ Crée transaction reversement                          │
│     ✓ Met à jour paiement:                                  │
│       - commission_plateforme = X                           │
│       - montant_reverse = Y                                 │
│       - statut='REVERSE_AU_PROPRIETAIRE'                    │
│                                                              │
│  3. Notifie propriétaire:                                   │
│     "Vous avez reçu 114 000 FCFA (loyer - 5%)"              │
│                                                              │
│  4. Ajoute au solde proprio (wallet)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Interface Utilisateur

### Page Configuration
```
┌──────────────────────────────────────────────────────┐
│  Prélèvement automatique                 [Désactiver]│
├──────────────────────────────────────────────────────┤
│                                                       │
│  STATUT: ● ACTIF                                      │
│  ─────────────────────────────────────────────────   │
│                                                       │
│  📋 Détails du prélèvement                            │
│  ─────────────────────────────────────────────────   │
│  Bien: [Appartement - 123 Rue de la Paix]            │
│  Montant: [120 000 FCFA]                             │
│  Fréquence: [Mensuel ▼]                              │
│  Jour de paiement: [5 ▼] (5 de chaque mois)          │
│                                                       │
│  💳 Moyen de paiement                                 │
│  ─────────────────────────────────────────────────   │
│  ● Carte Bancaire                                    │
│    Visa **** 1234 - Exp: 12/28                       │
│    [Changer]                                          │
│                                                       │
│  ○ Orange Money                                      │
│    +228 90 00 00 00                                   │
│    [Changer]                                          │
│                                                       │
│  ○ MTN Mobile Money                                  │
│    +228 91 00 00 00                                   │
│    [Changer]                                          │
│                                                       │
│  📅 Historique                                        │
│  ─────────────────────────────────────────────────   │
│  05/04/2026  ✅ 120 000 FCFA  [Reçu]                 │
│  05/03/2026  ✅ 120 000 FCFA  [Reçu]                 │
│  05/02/2026  ✅ 120 000 FCFA  [Reçu]                 │
│                                                       │
│  ⚙️ Options                                           │
│  ─────────────────────────────────────────────────   │
│  ☑️ Recevoir un email 3 jours avant                  │
│  ☑️ Recevoir un SMS le jour J                        │
│  ☐ Paiement solidaire (avec garant)                  │
│                                                       │
│  [Modifier] [Suspendre temporairement] [Annuler]     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔔 Notifications

| Événement | Locataire | Propriétaire | Admin |
|-----------|-----------|--------------|-------|
| Activation prélèvement | ✅ Email | - | - |
| Rappel J-3 | ✅ Email+Push | - | - |
| Prélèvement réussi | ✅ Email | ✅ Email | - |
| Prélèvement échoué | ✅ Email+SMS | - | ⚠️ Si >3 échecs |
| Reversement effectué | - | ✅ Email+Push | - |
| Suspension auto | ✅ Email | ✅ Email | ✅ Email |

---

## 📊 Métriques & KPIs

```python
# Dashboard Locataire
- Prochain prélèvement (date + montant)
- Historique (12 derniers mois)
- Total payé (année)
- Moyen de paiement actif

# Dashboard Propriétaire
- Revenus mensuels récurrents
- Taux de recouvrement auto
- Prochains reversements
- Alertes (impayés)

# Dashboard Admin
- % locataires en prélèvement auto
- Taux d'échec global
- Montant total traité
- Incidents de paiement
```

---

## ✅ CHECKLIST IMPLÉMENTATION

### Semaine 7-8: Incidents
- [ ] Modèles de données
- [ ] API endpoints
- [ ] Formulaire signalement
- [ ] Dashboard traitement
- [ ] Notifications email
- [ ] Timeline messages

### Semaine 9-10: Avis
- [ ] Modèles Review + Signalement
- [ ] Système double aveugle
- [ ] Formulaire de notation
- [ ] Calcul moyennes
- [ ] Modération admin
- [ ] Affichage profils

### Semaine 11-12: Paiements Auto
- [ ] Modèle PaiementRecurrent
- [ ] Intégration Stripe
- [ ] Intégration Mobile Money
- [ ] Tâche Celery Beat
- [ ] Gestion échecs
- [ ] Reversements auto

---

**🚀 PRÊT À CODER !**
