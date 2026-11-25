# Connexion Gmail

## Pour les utilisateurs
Lancez l'application avec **« Lancer CoproVente »**, puis cliquez sur **« Connecter mon Gmail »**. Choisissez votre compte Google et acceptez : c'est tout.

Ce que permet la connexion :
- **synchroniser** jusqu'à 5 fils par bien (notaire, syndic, vendeur, acquéreur, autre) ;
- **créer des brouillons** dans Gmail, en réponse dans le bon fil, avec les pièces du dossier jointes ;
- **ranger les pièces jointes** reçues dans le dossier en un clic.

L'application n'envoie jamais de mail à votre place, et l'accès à votre Gmail reste dans votre navigateur (aucun serveur intermédiaire). Pour retirer l'accès à tout moment : https://myaccount.google.com/permissions

---

## Pour l'éditeur de l'application (à faire une seule fois)

Le bouton « Connecter mon Gmail » utilise un **identifiant Google** (Client ID) inscrit dans `config.js`. Il est créé une fois pour toutes, puis tous les utilisateurs en profitent.

1. https://console.cloud.google.com/ › créer un projet « CoproVente ».
2. *API et services › Bibliothèque* : activer **Gmail API**.
3. *Écran de consentement OAuth* (« Google Auth Platform ») :
   - type **Externe** ; nom « CoproVente », e-mail d'assistance, logo facultatif ;
   - accès aux données : portées `https://www.googleapis.com/auth/gmail.readonly` et `https://www.googleapis.com/auth/gmail.compose`.
4. *Clients › Créer un client* : type **Application Web**, **Origines JavaScript autorisées** :
   - `http://localhost:8080` (application lancée sur l'ordinateur)
   - `https://coproassistance.github.io` (version en ligne)
5. Copier l'**ID client** dans `config.js` :
   ```js
   gmailClientId: '1234-abcd.apps.googleusercontent.com',
   ```

L'ID client n'est pas un secret : il peut être publié avec l'application.

### Nombre d'utilisateurs
Les portées Gmail de lecture sont classées « restreintes » par Google :
- **Mode « Test »** : seuls les comptes ajoutés à la liste des *utilisateurs test* (100 max.) peuvent se connecter.
- **Mode « Production » non vérifié** : tout le monde peut se connecter après un écran d'avertissement « application non validée » (cliquer *Paramètres avancés › Accéder à CoproVente*), dans la limite de 100 utilisateurs.
- **Au-delà / sans avertissement** : demander la **vérification** de l'application à Google (pages d'accueil et de confidentialité publiques, vidéo de démonstration, évaluation de sécurité pour les portées restreintes).

Les comptes d'une même entreprise Google Workspace peuvent aussi passer en type **Interne** : aucune limite ni avertissement pour les collaborateurs de ce domaine.
