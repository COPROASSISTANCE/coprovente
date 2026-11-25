# Installer et personnaliser CoproVente

Ce guide s'adresse aux agents et mandataires, **sans connaissance technique**. Comptez 15 minutes pour avoir votre propre application en ligne, connectée à votre Gmail.

---

## 1. Obtenir votre propre copie (5 min)

1. Créez un compte gratuit sur https://github.com (si vous n'en avez pas).
2. Ouvrez la page du modèle CoproVente sur GitHub, puis cliquez sur le bouton vert **« Use this template » › « Create a new repository »**.
3. Donnez un nom (ex. `coprovente`), laissez **Public**, puis **Create repository**.

Cette copie **vous appartient** : vous pouvez la modifier librement, cela ne touche pas l'original.

## 2. La mettre en ligne (2 min)

1. Dans votre copie : **Settings › Pages**.
2. *Source* : **Deploy from a branch** ; *Branch* : **main**, dossier **/ (root)** › **Save**.
3. Patientez 1 à 2 minutes : votre adresse s'affiche en haut de la page, du type
   `https://votre-nom.github.io/coprovente/`

Ouvrez-la, ajoutez-la à vos favoris, ou installez-la comme une application (icône d'installation dans la barre d'adresse du navigateur, ou « Ajouter à l'écran d'accueil » sur téléphone).

> Vos dossiers et fichiers restent **dans votre navigateur**, jamais sur GitHub. Pensez à exporter une sauvegarde régulièrement (Paramètres).

## 3. Brancher votre Gmail (10 min, facultatif)

Suivez [GMAIL.md](GMAIL.md). Dans « Origines JavaScript autorisées », indiquez `https://votre-nom.github.io`.

## 4. Personnaliser

Pour modifier un fichier sur GitHub : ouvrez-le dans votre copie, cliquez sur le **crayon ✏️**, modifiez, puis **Commit changes**. Le site se met à jour en 1 à 2 minutes (rechargez la page avec Ctrl+F5).

### Nom, couleurs, logo → `config.js`
```js
nom: 'Mon Agence Copro',
couleurPrincipale: '#c0392b',
couleurBandeau: '#2c3e50',
logo: 'mon-logo.png',
```
Pour le logo : **Add file › Upload files**, déposez votre image, puis indiquez son nom dans `config.js`.

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
- si la page devient blanche après une modification, revenez à la version précédente : *History* › ouvrez la version d'avant › *Revert*.

### Se faire aider par une IA
Vous pouvez demander à Claude (ou à un autre assistant) : *« Voici le fichier data.js de mon application CoproVente, ajoute une pièce “Attestation d'assurance habitation” dans la catégorie vendeur »* et coller le résultat dans GitHub.

## 5. Récupérer les améliorations du modèle
Quand le modèle original évolue, vous pouvez recopier les fichiers modifiés dans votre copie (*Add file › Upload files*). Si vous avez personnalisé `data.js` ou `config.js`, ne remplacez que les autres fichiers.

## Sans GitHub
Téléchargez le ZIP (*Code › Download ZIP*), décompressez-le et double-cliquez sur `index.html`. Tout fonctionne sauf la connexion Gmail. Pour l'activer en local sous Windows : clic droit sur `serve.ps1` › *Exécuter avec PowerShell*, puis ouvrez http://localhost:8080.
