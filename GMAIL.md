# Connecter Gmail à CoproVente

La connexion Gmail est **facultative**. Sans elle, vous pouvez déjà ouvrir un message pré-rempli dans Gmail (« Ouvrir dans Gmail ») et coller les mails reçus dans les 5 fils de chaque bien.

Avec elle, vous pouvez :
- **synchroniser** jusqu'à 5 fils par bien (notaire, syndic, vendeur, acquéreur, autre), à partir des adresses de la fiche ou d'une recherche Gmail ;
- **créer des brouillons** directement dans Gmail, en réponse dans le bon fil, avec les pièces du dossier en pièces jointes ;
- **ranger les pièces jointes** reçues dans le dossier en un clic.

L'application ne fait qu'**appeler Google depuis votre navigateur** : aucun serveur intermédiaire, aucun envoi automatique.

## 1. Créer un identifiant OAuth (10 minutes, gratuit)

1. Ouvrez https://console.cloud.google.com/ et créez un projet (ex. « CoproVente »).
2. *API et services › Bibliothèque* : activez **Gmail API**.
3. *API et services › Écran de consentement OAuth* :
   - type **Externe**, nom de l'application, votre e-mail ;
   - portées : `gmail.readonly` et `gmail.compose` ;
   - **Utilisateurs test** : ajoutez les adresses Gmail qui utiliseront l'application (jusqu'à 100).
4. *API et services › Identifiants › Créer des identifiants › ID client OAuth* :
   - type **Application Web** ;
   - **Origines JavaScript autorisées** : l'adresse où est publiée l'application, par exemple `https://votre-compte.github.io` et/ou `http://localhost:8080`.
5. Copiez le **Client ID** (`xxxx.apps.googleusercontent.com`).

## 2. Le renseigner dans l'application
*Paramètres › Connexion Gmail* : collez le Client ID, puis **Connecter Gmail**. La session dure environ une heure ; reconnectez-vous ensuite d'un clic.

## Diffusion à grande échelle
Les portées Gmail de lecture sont dites « restreintes » par Google : en mode « Test », seuls les utilisateurs test déclarés (100 max.) peuvent se connecter. Pour ouvrir la connexion à tous les agents sans liste, l'éditeur qui publie l'application doit faire **vérifier** son projet par Google (procédure de vérification et évaluation de sécurité).

Alternative simple pour une diffusion libre : chaque agence ou chaque agent crée son propre Client ID (étapes ci-dessus) et le colle dans ses paramètres.
