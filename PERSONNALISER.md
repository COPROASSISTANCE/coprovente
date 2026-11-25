# Installer et personnaliser CoproVente

Ce guide s'adresse aux agents et mandataires, **sans connaissance technique**.

---

## 1. Installer (2 min)

1. Téléchargez le ZIP : https://github.com/COPROASSISTANCE/coprovente/archive/refs/heads/main.zip
2. Décompressez-le où vous voulez (ex. *Documents › CoproVente*). Ce dossier est **votre copie** : modifiez-la librement.
3. Double-cliquez sur **`index.html`** : l'application s'ouvre dans votre navigateur.

> Vos dossiers et fichiers restent **dans votre navigateur, sur votre ordinateur**. Utilisez toujours le même navigateur et le même dossier, et exportez régulièrement une sauvegarde (Paramètres).

Sur téléphone, l'adresse en ligne (https://coproassistance.github.io/coprovente/) s'ajoute à l'écran d'accueil comme une application.

## 2. Premiers pas

1. **Mon profil** (en haut) : nom, coordonnées, SIREN / RSAC, régime de TVA, IBAN. Ils alimentent annonces, offres, rendus et factures. Cliquez sur « Enregistrer ».
2. **À traiter** : l'écran d'accueil liste chaque matin les relances, estimations, biens sans activité, échéances de mandat, visites et ventes bloquées.
3. **＋ Ajouter** : un prospect vendeur, un acquéreur, une estimation, une visite ou un bien. Tout le reste découle de cette première saisie.
4. Pour découvrir l'application : « charger des données d'exemple » sur l'écran d'accueil (données fictives).

## 3. Vos mails

L'application prépare les mails (modèles pré-remplis) : copiez en un clic l'adresse, l'objet et le message, puis collez-les dans votre messagerie. Collez aussi les mails reçus dans l'onglet **Mails** d'un bien pour garder l'historique.

## 4. Assistant IA (facultatif)

Dans **Paramètres › Assistant IA**, une clé Claude (console.anthropic.com) permet de rédiger comptes rendus de visite, annonces, bilans vendeur et e-mails, et d'analyser appels de fonds, annexes comptables et PV d'AG. Les données utiles sont alors envoyées à Anthropic et l'usage est facturé sur votre compte. Sans clé, une rédaction automatique à partir de modèles reste disponible.

## 5. Personnaliser

Ouvrez le fichier avec le **Bloc-notes** (clic droit › Ouvrir avec › Bloc-notes) ou TextEdit sur Mac, modifiez, enregistrez, puis rechargez la page de l'application (F5).

### Nom, couleurs, logo → `config.js`
```js
nom: 'Mon Agence Copro',
couleurPrincipale: '#c0392b',
couleurBandeau: '#2c3e50',
logo: 'mon-logo.png',
```
Pour le logo : copiez votre image dans le dossier de l'application, puis indiquez son nom dans `config.js`.

### Contenu métier → `data.js`
Le fichier est organisé en blocs, chacun commenté :

| Bloc | Ce que vous pouvez changer |
|---|---|
| `PIECES` | la liste des pièces du dossier, leurs conseils (`hint`) et les mots-clés du classement automatique (`kw`) |
| `ENTRETIEN` | les questions de l'entretien vendeur |
| `SIGNAUX` | les points d'alerte à vérifier |
| `ETAPES` | les étapes du parcours, leurs tâches, conseils et boutons |
| `TEMPLATES` | les modèles de mails (aussi modifiables directement dans l'application, menu *Modèles de mails*) |
| `GUIDES` | les fiches de la page *Guides* |
| `EQUIPEMENTS` | l'inventaire des équipements de la copropriété |
| `MENTIONS_ANNONCE` | le pense-bête des mentions obligatoires de l'annonce |

Les prix du simulateur de budget travaux se modifient en haut du fichier `sim.js` (`TRAVAUX_POSTES`, `TRAVAUX_FORMULES`).

Règles simples pour ne rien casser :
- modifiez le texte **entre les apostrophes** `'…'` ou les accents graves `` `…` `` ;
- dans un texte entre apostrophes, écrivez l'apostrophe française `’` (et non `'`) ;
- gardez les virgules en fin de ligne ;
- **avant de modifier, faites une copie du fichier** : si la page devient blanche, remettez la copie.

Les modèles de mails se modifient aussi directement dans l'application (menu *Modèles de mails*), sans toucher aux fichiers.

### Se faire aider par une IA
Demandez par exemple à Claude : *« Voici le fichier data.js de mon application CoproVente, ajoute une pièce “Attestation d'assurance habitation” dans la catégorie vendeur »*, puis remplacez le fichier par la version proposée.

### Ce qui ne se modifie pas
Les mentions Copro-Assistance (fichier `brand.js` : encart « Proposé par Copro-Assistance », pied de page de l'application et des documents générés, guides, coordonnées du pré-état daté) font partie de l'application et doivent être conservées : c'est une condition de la licence (GNU GPL v3 avec conditions supplémentaires, voir le fichier `LICENSE`). Si vous redistribuez une version modifiée, indiquez qu'elle a été modifiée et laissez-la sous la même licence.

## 6. Mettre à jour
Quand une nouvelle version sort, téléchargez le nouveau ZIP et remplacez les fichiers de votre dossier, **sauf** `config.js` et `data.js` si vous les avez personnalisés. Vos dossiers ne sont pas touchés (ils sont dans le navigateur). Gardez le même dossier et le même navigateur.
