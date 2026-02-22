# POO Avancée - Groupe 4

Ce projet est une application web moderne construite avec Next.js, mettant l'accent sur une architecture modulaire, réutilisable et sécurisée.

## Architecture du Projet

L'architecture du projet repose sur une séparation claire des responsabilités pour assurer la maintenabilité et l'évolutivité du code.

### 1. Services et Logique Métier (`/src/services`)

Ce projet impose une **séparation stricte entre la logique et l'interface utilisateur (UI)**. 
- **Logique déportée** : Aucun traitement complexe ou appel direct à l'API ne doit être fait au sein des composants UI. Toute la logique métier et les requêtes vers le backend externe sont regroupées dans le dossier `services`.
- **Organisation** : Le code est segmenté par entités ou domaines fonctionnels dans des sous-dossiers spécifiques (ex: `/services/auth`, `/services/products`, etc.).
- **Server Actions** : Les requêtes sont implémentées sous forme de fonctions asynchrones (souvent utilisées comme Server Actions dans Next.js).

### 2. Configuration API et Axios (`/src/services/api/api.ts`)

Toutes les requêtes HTTP passent par une **instance centralisée d'Axios** configurée et exportée depuis `api.ts`.
- **Instance Axios** : Le fichier exporte une instance pré-configurée (`api`) pour garantir la cohérence des appels.
- **Bearer Tokens** : Cette instance est configurée pour intercepter les requêtes et injecter automatiquement les jetons d'authentification (`Bearer Token`) dans les headers si ceux-ci existent.

### 3. Composants Réutilisables (`/src/components`)

L'interface utilisateur est décomposée en composants atomiques et réutilisables.
- **Pureté de l'UI** : Les composants se concentrent uniquement sur l'affichage et l'interaction utilisateur. Ils consomment les données et fonctionnalités fournies par les services.
- **Modularité** : Chaque composant est conçu pour être indépendant et réutilisable.

### 4. Utilitaires (`/src/utils`)

Le dossier `utils` regroupe toutes les fonctions utilitaires transversales (formatage de dates, manipulation de chaînes, calculs génériques, etc.) qui ne sont pas liées à une logique métier spécifique.

## Structure des Dossiers

```text
src/
├── components/          # Composants UI (affichage uniquement)
├── services/            # Logique métier et appels API (Server Actions)
│   ├── api/             # Configuration de base
│   │   └── api.ts       # Export de l'instance Axios configurée
│   └── [domaine]/       # Logic par thématiques
├── utils/               # Fonctions utilitaires transversales
├── app/                 # Routes et pages Next.js
└── ...
```

---

## Installation et Lancement

1. Installez les dépendances :
   ```bash
   npm install
   # ou
   bun install
   ```

2. Lancez le serveur de développement :
   ```bash
   npm run dev
   # ou
   bun dev
   ```
