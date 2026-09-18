# Tableau blanc collaboratif en temps réel

[![Vérification](https://github.com/OmarRag/tableau-blanc-collaboratif-1337/actions/workflows/verification.yml/badge.svg)](https://github.com/OmarRag/tableau-blanc-collaboratif-1337/actions/workflows/verification.yml)

Application web permettant de créer des tableaux blancs, de dessiner et de collaborer en temps réel depuis plusieurs navigateurs.

**Application publique :** <https://tableau-collaboratif-1337.onrender.com>

## Fonctionnalités

- dessin : crayon, ligne, rectangle, cercle, ellipse, flèche et texte ;
- sélection, déplacement, redimensionnement et rotation des formes ;
- gomme, suppression, remplissage, annulation et rétablissement ;
- déplacement et zoom de la vue ;
- import JSON et export JSON/PNG ;
- authentification avec Google ;
- création et gestion de plusieurs tableaux ;
- partage par lien avec permission de lecture ou de modification ;
- curseurs et aperçus distants en direct ;
- synchronisation WebSocket et résolution des conflits par forme ;
- persistance PostgreSQL avec copie locale de secours.

## Architecture

```mermaid
flowchart LR
    U[Utilisateur] --> N[Navigateur]
    N -->|Connexion Google| G[Google Identity Services]
    N <-->|API HTTPS| R[Node.js + Express sur Render]
    N <-->|WebSocket sécurisé| R
    R <-->|Requêtes SQL| P[PostgreSQL sur Neon]
```

Le frontend utilise HTML, CSS, JavaScript natif et Canvas API. Le même serveur Node.js fournit les fichiers du frontend, l'API Express et les connexions WebSocket. PostgreSQL conserve les utilisateurs, sessions, tableaux et liens de partage.

## Séquence d'une modification collaborative

```mermaid
sequenceDiagram
    actor U1 as Utilisateur A
    participant N1 as Navigateur A
    participant S as Serveur WebSocket
    participant DB as PostgreSQL
    participant N2 as Navigateur B
    actor U2 as Utilisateur B

    U1->>N1: Modifie une forme
    N1-->>S: Aperçu temporaire
    S-->>N2: Diffuse l'aperçu
    N2-->>U2: Affiche l'aperçu
    N1->>S: Envoie l'opération terminée et sa version
    S->>DB: Vérifie la permission
    S->>S: Compare les horloges de la forme
    S->>DB: Sauvegarde l'état accepté
    S-->>N1: Confirme ou corrige l'opération
    S-->>N2: Diffuse l'opération acceptée
    N2-->>U2: Redessine le tableau
```

Le choix de synchronisation est détaillé dans [docs/choix-techniques.md](docs/choix-techniques.md).

## Organisation du projet

```text
.
├── index.html                 page du tableau blanc
├── tableaux.html             gestion des tableaux
├── connexion.html            connexion Google
├── js/
│   ├── api/                   appels HTTP vers le backend
│   ├── canvas/                caméra, événements et rendu
│   ├── etat/                  dessin, outils et historique
│   ├── formes/                comportement de chaque forme
│   ├── interaction/           coordination des actions utilisateur
│   ├── interface/             barre d'outils et pages
│   ├── outils/                sélection, gomme et remplissage
│   └── tempsReel/             WebSocket, aperçus et curseurs
├── serveur/
│   ├── initialisation.sql     structure PostgreSQL
│   ├── baseDeDonnees.js       requêtes SQL
│   ├── authentification.js    sessions et cookies
│   └── routes*.js             routes de l'API
├── tests/                     tests automatisés
├── serveur.js                 démarrage HTTP et WebSocket
└── render.yaml                configuration du déploiement
```

## Installation locale

### Prérequis

- Node.js 20 ou supérieur ;
- PostgreSQL ;
- un identifiant client Google OAuth de type « Application Web ».

### Étapes

1. Installer les dépendances :

```bash
npm install
```

2. Créer une base PostgreSQL, puis exécuter le script :

```bash
psql -d tableau_collaboratif -f serveur/initialisation.sql
```

3. Copier `.env.example` vers `.env`, puis remplacer les valeurs :

```env
DATABASE_URL=postgresql://utilisateur:mot_de_passe@localhost:5432/tableau_collaboratif
GOOGLE_CLIENT_ID=votre_identifiant.apps.googleusercontent.com
PORT=8000
NODE_ENV=development
```

L'origine `http://localhost:8000` doit être autorisée dans la configuration Google OAuth.

4. Démarrer l'application :

```bash
npm start
```

5. Ouvrir <http://localhost:8000>.

## Tests

Les tests utilisent la base indiquée par `DATABASE_URL`. Les tests de l'API et du temps réel nécessitent que le serveur soit déjà lancé dans un autre terminal.

```bash
npm test
```

Les commandes peuvent aussi être lancées séparément :

```bash
npm run test:base-de-donnees
npm run test:authentification
npm run test:api
npm run test:temps-reel
```

Par défaut, les tests contactent `http://localhost:8000`. La variable `TEST_BASE_URL` permet de choisir une autre instance de test.

## Sécurité

- Google vérifie l'identité ; l'application ne reçoit jamais le mot de passe Google.
- Les sessions utilisent un cookie `HttpOnly`, `SameSite=Lax` et `Secure` en production.
- Les jetons de session et de partage sont enregistrés sous forme d'empreintes SHA-256.
- Toutes les routes de tableaux exigent une session valide.
- L'API limite chaque adresse à 300 requêtes par période de 15 minutes.
- Les fichiers du backend, des tests et de configuration ne sont pas servis publiquement.

## Déploiement

Le fichier `render.yaml` configure le service Node.js sur Render. Un déploiement est déclenché après la réussite des contrôles GitHub Actions. Les variables `DATABASE_URL` et `GOOGLE_CLIENT_ID` doivent être configurées dans l'environnement du service. La base Neon doit être initialisée avec `serveur/initialisation.sql` avant le premier démarrage.
