# Lichess & Chess.com

Suivez dans Gladys des joueurs d'échecs de [Lichess](https://lichess.org) et de
[Chess.com](https://www.chess.com) : vous, vos enfants, votre club, ou un
champion.

Cette intégration n'est affiliée ni à Lichess ni à Chess.com.

## Ce que fait l'intégration

- Lit les **profils publics** des joueurs saisis, sans compte ni mot de passe :
  rien n'est jamais écrit sur les sites.
- Crée **un appareil par joueur**, avec :
  - un **classement** par cadence : bullet, blitz, rapide, classique,
    correspondance et problèmes sur Lichess ; bullet, blitz, rapide et Daily sur
    Chess.com ;
  - **En ligne** et **En partie** (Lichess seulement : Chess.com ne le publie
    plus) ;
  - la **Dernière partie**, en une phrase : « Victoire contre Adversaire (blitz,
    1756 +6) » ;
  - les **Parties du jour** et les **Victoires du jour**, remises à zéro à
    minuit.
- Ajoute un widget de tableau de bord **Joueurs d'échecs**, deux déclencheurs
  de scène **Partie terminée** et **Nouveau record de classement**, et deux
  actions de scène **Lire un joueur d'échecs** et **Lire le problème du jour**.

## Prérequis

- Gladys Assistant **5.2.0** ou plus récent.
- Un accès à Internet (API publiques de Lichess et de Chess.com).
- Les pseudos des joueurs. Pour essayer : `thibault` (le fondateur de Lichess)
  ou `DrNykterstein` sur Lichess, `hikaru` ou `erik` sur Chess.com.

## Configuration

### Joueurs

- **Joueurs Lichess** et **Joueurs Chess.com** : des pseudos séparés par des
  virgules, 10 au plus par site. Un lien de profil fonctionne aussi
  (`https://lichess.org/@/thibault`, `https://www.chess.com/member/hikaru`).
- Ouvrez ensuite l'onglet **Découverte** de l'intégration et ajoutez les
  joueurs à Gladys. Seuls les joueurs ajoutés sont suivis.
- Le bouton **Vérifier les joueurs** lit tous les joueurs tout de suite et dit
  ce que chaque site a répondu : le bon moyen de vérifier un pseudo.

### Autres réglages

- **Relevé** : la fréquence de lecture de chaque joueur, de 2 à 30 minutes (5
  par défaut). Une partie terminée, un nouveau classement ou un joueur en ligne
  se voient au relevé suivant.
- **Langue** : la langue des noms de fonctionnalités (fixés à l'ajout d'un
  appareil : supprimez puis ajoutez de nouveau l'appareil pour les changer), de
  la dernière partie et des textes de scène. Français par défaut.

## Appareils

Un appareil par joueur, nommé « pseudo (site) ».

| Fonctionnalité                     | Valeur                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| Classement bullet, blitz…          | le classement actuel de la cadence                       |
| En ligne (Lichess)                 | 1 quand le joueur est connecté à Lichess                 |
| En partie (Lichess)                | 1 pendant une partie                                     |
| Dernière partie                    | résultat, adversaire, cadence et classement après partie |
| Parties du jour, Victoires du jour | les parties terminées depuis minuit (fuseau de Gladys)   |

Une cadence jamais jouée n'a pas de valeur avant la première partie. Les
parties UltraBullet comptent comme bullet dans le filtre « Partie terminée ».
Classements, parties et présence en ligne viennent des sites : Gladys en garde
l'historique.

## Widget

**Joueurs d'échecs**, depuis l'éditeur de tableau de bord :

- avec un **joueur** choisi : jusqu'à quatre tuiles de classement en direct
  (les cadences les plus jouées), la dernière partie, le score du jour
  (+victoires =nulles −défaites), en ligne ou en partie (Lichess), et des
  boutons vers le profil, la dernière partie et le problème du jour ;
- sans joueur : une ligne par joueur ajouté avec son classement le plus joué
  (vert en ligne sur Lichess, orange en partie), et un bouton vers le problème
  du jour de chaque site suivi.

## Scènes

### Déclencheur : Partie terminée

Un joueur suivi a terminé une partie. Filtres : le **joueur**, le **résultat**
(victoire, défaite, nulle) et la **cadence** (bullet, blitz, rapide, classique,
correspondance), tous facultatifs. Variables : joueur, résultat, adversaire,
classement de l'adversaire, classement après la partie, variation du classement
(Lichess seulement), lien de la partie, et un **résumé** tout prêt.

Les parties jouées avant l'ajout du joueur ne sont pas des nouvelles : rien ne
se déclenche pour elles. Après une longue coupure, seules les cinq dernières
nouvelles parties déclenchent.

### Déclencheur : Nouveau record de classement

Un joueur suivi a battu son meilleur classement de tous les temps dans une
cadence (classement des problèmes compris sur Lichess). Le meilleur est celui
que connaît le site (historique de Lichess, « best » de Chess.com). Un
classement provisoire de Lichess ne compte jamais. Variables : joueur, nouveau
record, record précédent, résumé.

### Action : Lire un joueur d'échecs

Les classements, les parties du jour et la dernière partie d'un joueur : des
valeurs pour les blocs suivants, et un **résumé** pour une notification, par
exemple « Hikaru (Chess.com) : blitz 3465, bullet 3420, rapide 2838.
Aujourd'hui : 12 parties : +7 =0 −5. Dernière partie : Défaite contre … ». Lu
dans ce que Gladys sait déjà : aucune requête.

### Action : Lire le problème du jour

Le problème du jour de Lichess (par défaut) ou de Chess.com : son lien, son
titre ou sa difficulté, et un **message** prêt à envoyer.

## Exemples de scènes

- **Encourager les enfants** : déclencheur Partie terminée, joueur « Léa »,
  résultat victoire → envoyer « Bravo ! {{summary}} » à la famille.
- **Le problème du petit-déjeuner** : chaque jour à 7 h 30, Lire le problème du
  jour, puis envoyer son message sur Telegram.
- **Fêter un record** : déclencheur Nouveau record de classement → allumer le
  salon en doré et envoyer le résumé.

## Dépannage

- **Un joueur n'apparaît pas dans Découverte** : appuyez sur **Vérifier les
  joueurs**. « Joueur introuvable » signale un pseudo erroné, ou un compte
  fermé.
- **Pas de présence en ligne sur Chess.com** : son API publique ne la publie
  plus (l'ancienne adresse `is-online` répond « introuvable »).
- **Une partie arrive en retard** : les parties se voient au relevé suivant (5
  minutes par défaut). Chess.com peut aussi mettre quelques minutes à publier
  une partie.
- **« Lichess et Chess.com sont injoignables »** : les deux sites ont échoué au
  dernier relevé (réseau, maintenance, ou trop de requêtes). Après une réponse
  « trop de requêtes », l'intégration attend une minute, puis réessaie seule.
- **Journaux** : `LOG_LEVEL=debug` montre chaque requête ; le niveau normal ne
  montre que les démarrages, les erreurs et les scènes déclenchées.

## Limites

- Données publiques seulement : ni partie privée, ni messagerie, ni coups.
- Lichess et Chess.com sont des services gratuits : 10 joueurs par site, 2
  minutes entre deux lectures au plus vite. Chaque requête porte un
  `User-Agent` qui nomme l'intégration, comme le demande Chess.com, et les
  requêtes vers un site partent une à la fois, comme le demande Lichess.
- « Aujourd'hui » compte au plus les 100 dernières parties Lichess du jour.
- Lichess classe les parties par date de début : une partie par correspondance
  commencée avant la dernière partie vue peut ne jamais déclencher « Partie
  terminée », ni compter dans la journée.
- Chess.com ne donne pas la variation de classement d'une partie.
