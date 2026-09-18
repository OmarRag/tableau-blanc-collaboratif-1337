# Choix techniques

## Frontend en JavaScript natif

Le frontend utilise HTML, CSS, JavaScript natif et Canvas API. Ce choix garde visibles les événements du navigateur, les transformations de coordonnées et le cycle de redessin. Le code est séparé par responsabilité afin d'éviter qu'une seule modification touche toute l'application.

## Représentation du dessin

Le canvas ne mémorise pas les objets qu'il affiche. Les formes sont donc conservées dans une liste JavaScript. Chaque forme possède un identifiant, un type et ses propriétés géométriques. Après une modification, le canvas est effacé puis toutes les formes sont redessinées.

Cette représentation facilite la sélection, l'historique, l'export JSON, la persistance et la synchronisation réseau.

## Communication HTTP et WebSocket

Express fournit l'API HTTP utilisée pour l'authentification et la gestion durable des tableaux. WebSocket conserve une connexion ouverte pour transmettre rapidement les aperçus, les curseurs et les opérations terminées.

Les aperçus et les curseurs sont temporaires et ne sont pas enregistrés. Une action terminée est vérifiée, appliquée à la salle, sauvegardée dans PostgreSQL puis diffusée.

## Algorithme de synchronisation

Le projet utilise une stratégie **Last-write-wins par forme, complétée par des horloges vectorielles**.

Chaque navigateur maintient un compteur par utilisateur. Une opération transporte :

- les formes modifiées ;
- les identifiants supprimés ;
- l'horloge connue ;
- la date de création ;
- un identifiant unique d'opération.

Le serveur conserve une version pour chaque forme. Il compare d'abord les horloges. Si deux modifications sont concurrentes, la date puis l'identifiant d'opération produisent une décision déterministe. Tous les navigateurs finissent ainsi par retenir la même version.

Cette solution a été choisie car les formes sont des objets indépendants et parce qu'elle reste plus simple à expliquer et à maintenir qu'un CRDT complet. Elle ne fusionne toutefois pas deux modifications simultanées portant sur les propriétés internes d'une même forme : une seule version est retenue.

## Reconnexion

Une opération locale reste dans une liste d'attente jusqu'à la confirmation du serveur. Après une coupure WebSocket, le navigateur se reconnecte, reçoit l'état actuel de la salle, réapplique ses opérations non confirmées puis les renvoie.

Cette protection couvre une coupure temporaire. Une fermeture complète ou un rechargement de la page peut encore supprimer la liste d'attente conservée en mémoire.

## PostgreSQL et JSONB

PostgreSQL conserve les comptes, sessions, tableaux et liens de partage. Les formes sont enregistrées dans une colonne JSONB : leur structure reste proche des objets JavaScript, tandis que les métadonnées relationnelles restent contrôlées par PostgreSQL.

`localStorage` n'est pas la source principale. Il sert de copie locale de secours pour le dessin récemment chargé.

## Authentification et autorisation

Google Identity Services vérifie l'identité. Le backend vérifie le jeton Google, crée ou met à jour l'utilisateur, puis génère sa propre session. Seule l'empreinte SHA-256 du jeton de session est enregistrée.

Un tableau appartient à un utilisateur. Un lien de partage contient un jeton aléatoire donnant une permission de lecture ou de modification. Seule l'empreinte du jeton est conservée dans PostgreSQL.

## Déploiement

Render exécute Node.js, Express et le serveur WebSocket sur un même domaine HTTPS. Neon héberge PostgreSQL. Les adresses et identifiants de configuration sont fournis par des variables d'environnement. Un contrôle de santé et une limitation simple des requêtes complètent la configuration de production.
