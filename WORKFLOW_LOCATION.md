# Workflow Complet de Location - Documentation

## 📋 Vue d'ensemble

Ce document décrit le flux complet de location, de la demande initiale jusqu'au reversement des fonds au propriétaire.

---

## 1️⃣ Demande de location

### 🔹 Types de demandes
- **VISITE** - Visite du bien
- **PRIVATISATION** - Privatisation pour une période
- **LOCATION_DIRECTE** - Location longue durée (minimum 6 mois)

### 🔹 Endpoint
```
POST /api/demandes-actions
```

### 🔹 Body JSON
```json
{
  "bien_id": 123,
  "type_demande": "LOCATION_DIRECTE",
  "date_debut": "2024-04-01",
  "date_fin": "2024-10-01",
  "message": "Je suis intéressé par ce bien..."
}
```

### 🔹 Validation
- ✅ Durée minimum : **180 jours (6 mois)** pour LOCATION_DIRECTE
- ✅ Bien doit être vacant et actif
- ✅ Pas de chevauchement avec d'autres demandes actives
- ✅ Le propriétaire ne peut pas demander son propre bien

### 🔹 Notification
📧 Email automatique au propriétaire via `EmailService.envoyer_nouvelle_demande_bien()`

---

## 2️⃣ Décision du propriétaire

### 🔹 Endpoint
```
PATCH /api/demandes-actions/{id}/decision
```

### 🔹 Body JSON
```json
{
  "statut": "ACCEPTEE",
  "note_proprietaire": "Dossier validé",
  "date_visite": "2024-03-25T10:00:00"  // pour les visites uniquement
}
```

### 🔹 Statuts possibles
- `ACCEPTEE` - Acceptée
- `REFUSEE` - Refusée (avec motif)

### 🔹 Actions automatiques si acceptée
1. 📧 Email de notification au demandeur
2. 💬 Création automatique d'une conversation de chat entre propriétaire et demandeur
3. 📝 Message initial dans le chat

---

## 3️⃣ Création du bail

### 🔹 Endpoint
```
POST /api/demandes-actions/{id}/finaliser
```

### 🔹 Qui peut créer ?
- ✅ Propriétaire du bien
- ✅ Administrateur

### 🔹 Actions automatiques
1. 📄 Création du bail en base de données
2. 📄 Génération du PDF du contrat
3. 📧 Envoi du contrat par email aux deux parties
4. 📝 Mise à jour de la demande : `paiement_demande_envoyee = True`

### 🔹 Contrat PDF généré
- Référence du bail
- Informations bailleur/locataire
- Détails du bien
- Conditions financières (loyer, dépôt de garantie)
- Dates d'entrée/sortie
- Section signatures

---

## 4️⃣ Signature du bail

### 🔹 Endpoint
```
POST /api/baux/{id}/signer
```

### 🔹 Body JSON
```json
{
  "image_signature_url": "https://..."  // URL de l'image de signature (canvas)
}
```

### 🔹 Signataires
- 🏠 **Propriétaire** - `type_signataire = "PROPRIETAIRE"`
- 👤 **Locataire** - `type_signataire = "LOCATAIRE"`

### 🔹 Statuts du bail
1. `BROUILLON` - Bail créé, en attente de signatures
2. `EN_ATTENTE_SIGNATURE` - Une partie a signé
3. `EN_COURS` - Les deux parties ont signé ✅

### 🔹 Notifications
📧 Email automatique aux deux parties quand les deux signatures sont complètes

---

## 5️⃣ Paiements des loyers

### 🔹 Consulter ses échéances
```
GET /api/paiements/mes-loyers
```

**Réponse :**
```json
[
  {
    "id": 1,
    "reference": "PAI-2024-001",
    "montant": 150000,
    "date_echeance": "2024-04-01",
    "statut": "EN_ATTENTE",
    "bail": {...}
  }
]
```

### 🔹 Statuts de paiement
1. `EN_ATTENTE` - Échéance à payer
2. `PAYE` - Payé par le locataire
3. `PAYE_A_L_ADMIN` - Reçu par l'administration
4. `REVERSE_AU_PROPRIETAIRE` - Reversé au propriétaire
5. `IMPAYE` - Impayé (après retard)

### 🔹 Payer par Mobile Money
```
POST /api/paiements/{id}/simulate-mobile-money
```

**Body JSON :**
```json
{
  "numero_telephone": "+22507070707",
  "reseau": "Orange Money",
  "moyen_paiement": "Mobile Money"
}
```

**Effet :**
- ✅ Statut passe à `PAYE_A_L_ADMIN`
- ✅ Date de paiement enregistrée
- ✅ Mode de paiement enregistré

### 🔹 Télécharger facture/quittance
```
GET /api/paiements/{id}/facture/download
```

**Réponse :** PDF de la facture ou quittance

---

## 6️⃣ Reversement au propriétaire

### 🔹 Endpoint (Admin uniquement)
```
POST /api/admin/finances/paiements/{id}/reverser
```

### 🔹 Body JSON
```json
{
  "mode_reversement": "Virement Bancaire",
  "preuve_reversement": "VIR-2024-001"
}
```

### 🔹 Calcul automatique
```python
commission_taux = 0.05  # 5%
commission_montant = montant * 0.05
montant_reverse = montant - commission_montant
```

**Exemple :**
- Loyer payé : **100 000 FCFA**
- Commission plateforme (5%) : **5 000 FCFA**
- Montant reversé : **95 000 FCFA**

### 🔹 Actions automatiques
1. ✅ Statut passe à `REVERSE_AU_PROPRIETAIRE`
2. ✅ Champs `commission_plateforme` et `montant_reverse` mis à jour
3. 📧 Email de notification au propriétaire

---

## 📊 Récapitulatif des statuts

### Demande (DemandeAction)
```
EN_ATTENTE → ACCEPTEE → Bail créé
         → REFUSEE → Terminé
         → EXPIREE → Terminé
```

### Bail (Bail)
```
BROUILLON → EN_ATTENTE_SIGNATURE → EN_COURS → TERMINE
                                    → RESILIE
```

### Paiement (Paiement)
```
EN_ATTENTE → PAYE → PAYE_A_L_ADMIN → REVERSE_AU_PROPRIETAIRE
           → IMPAYE (si retard)
```

---

## 🔧 Fichiers backend clés

| Fonctionnalité | Fichier | Lignes |
|---------------|---------|--------|
| **Modèle DemandeAction** | `immobilier/models/location.py` | 13-47 |
| **Modèle Bail** | `immobilier/models/location.py` | 69-109 |
| **Modèle Paiement** | `immobilier/models/comptabilite.py` | 8-42 |
| **Création demande** | `immobilier/views/request_views.py` | 37-68 |
| **Décision propriétaire** | `immobilier/views/request_views.py` | 121-188 |
| **Finalisation (création bail)** | `immobilier/views/request_views.py` | 191-258 |
| **Signature bail** | `immobilier/views/lease_views.py` | 81-165 |
| **Liste paiements** | `immobilier/views/billing_views.py` | 73-85 |
| **Paiement Mobile Money** | `immobilier/views/billing_views.py` | 15-49 |
| **Reversement** | `immobilier/views/billing_views.py` | 88-136 |

---

## ⚠️ Points d'attention

1. **Durée minimum location** : 180 jours (6 mois) - ✅ Corrigé
2. **Génération automatique des échéances** : ❌ Non implémentée (à faire)
3. **Notification signature bail** : ✅ Ajoutée
4. **Template email reversement** : ⚠️ Utilise un template générique

---

## 🧪 Tests recommandés

1. **Créer une demande de location** (durée > 6 mois)
2. **Accepter la demande** (en tant que propriétaire)
3. **Vérifier la création du bail**
4. **Signer le bail** (en tant que locataire puis propriétaire)
5. **Consulter les échéances de paiement**
6. **Payer par Mobile Money**
7. **Reverser les fonds** (en tant qu'admin)
8. **Vérifier les emails reçus** à chaque étape

---

**Document mis à jour :** Mars 2024
**Version :** 1.0
