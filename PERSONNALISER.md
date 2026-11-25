# Installer et personnaliser CoproVente

Ce guide s'adresse aux agents et mandataires, **sans connaissance technique**.

---

## 1. Installer (2 min)

1. Téléchargez le ZIP : https://github.com/COPROASSISTANCE/coprovente/archive/refs/heads/main.zip
2. Décompressez-le où vous voulez (ex. *Documents › CoproVente*). Ce dossier est **votre copie** : modifiez-la librement.
3. Double-cliquez sur **`index.html`** : l'application s'ouvre dans votre navigateur.

> Vos dossiers et fichiers restent **dans votre navigateur, sur votre ordinateur**. Utilisez toujours le même navigateur et le même dossier, et exportez régulièrement une sauvegarde (Paramètres).

## 2. Vos mails

Onglet **Mails** de chaque dossier : choisissez un modèle, puis copiez en un clic l'adresse, l'objet et le message, et collez-les dans votre messagerie. Collez aussi les mails reçus pour garder l'historique (5 fils par bien : notaire, syndic, vendeur, acquéreur, autre).

## 3. Personnaliser

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

Règles simples pour ne rien casser :
- modifiez le texte **entre les apostrophes** `'…'` ou les accents graves `` `…` `` ;
- dans un texte entre apostrophes, écrivez l'apostrophe française `’` (et non `'`) ;
- gardez les virgules en fin de ligne ;
- **avant de modifier, faites une copie du fichier** : si la page devient blanche, remettez la copie.

Les modèles de mails se modifient aussi directement dans l'application (menu *Modèles de mails*), sans toucher aux fichiers.

### Se faire aider par une IA
Demandez par exemple à Claude : *« Voici le fichier data.js de mon application CoproVente, ajoute une pièce “Attestation d'assurance habitation” dans la catégorie vendeur »*, puis remplacez le fichier par la version proposée.

## 4. Mettre à jour
Quand une nouvelle version sort, téléchargez le nouveau ZIP et remplacez les fichiers de votre dossier, **sauf** `config.js` et `data.js` si vous les avez personnalisés. Vos dossiers ne sont pas touchés (ils sont dans le navigateur). Gardez le même dossier et le même navigateur.
