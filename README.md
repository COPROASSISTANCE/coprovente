# CoproVente

**Le copilote libre et gratuit des agents et mandataires immobiliers pour vendre en copropriété.**

CoproVente guide pas à pas chaque vente, de la prise de mandat à l'acte authentique : pièces à réunir, questions à poser au vendeur, signaux d'alerte, pré-état daté, offre d'achat, transmission au notaire et suivi des mails.

Les contenus métier sont issus des guides pratiques de [Copro-Assistance](https://www.copro-assistance.fr) (édition 2026) : *Prise de mandat vente en copropriété*, *Checklist vendeur*, *Lire un appel de fonds*, *Comprendre les annexes comptables*.

## Fonctionnalités

| Module | Ce qu'il fait |
|---|---|
| **Tableau de bord** | Vue d'ensemble graphique : prospection, estimations, mandats, biens en commercialisation, visites, ventes réalisées ; entonnoir d'activité, honoraires sur 12 mois, visites par semaine, mandats par type, tâches et échéances des 14 prochains jours |
| **Prospection, estimations, visites** | Fiches prospects avec relances, estimations (fourchette, prix au m²) transformables en mandat en un clic, visites liées aux biens avec retours et intérêt |
| **Mandats & ventes** | Liste des mandats filtrable par étape, échéances de mandat, historique des ventes et honoraires, objectif annuel |
| **Parcours (timeline)** | 13 étapes de la prise de mandat à l'après-vente, avec tâches, conseils et actions en un clic. Les tâches liées à une pièce se cochent seules quand la pièce est reçue |
| **Fiche** | Mandat, bien, lots et tantièmes, copropriété/syndic, vendeurs, acquéreurs, notaires, dates clés (calcul automatique de la fin du délai de rétractation, jours fériés compris) |
| **Pièces** | Plus de 50 pièces types (vendeur, diagnostics, copropriété, acquéreur, transaction) avec statut, dates, exercice, validité des diagnostics. Glisser-déposer avec **classement automatique** d'après le nom du fichier |
| **Entretien vendeur** | Le questionnaire de prise de mandat (bien, copropriété, usage, calendrier) avec réponses « à vérifier » |
| **Analyse copro** | 12 signaux à traiter avant commercialisation, **fiches de lecture d'appels de fonds** (calcul des quotes-parts), **contrôle express des annexes comptables**, mentions copropriété de l'annonce |
| **Mails — 5 fils par bien** | Notaire, syndic, vendeur, acquéreur, autre. Copie en un clic de l'adresse, de l'objet et du message ; mails reçus collés pour garder l'historique |
| **Modèles de mails** | 20 modèles pré-remplis (pièces manquantes, accès extranet, documents manquants sur l'extranet, transmission au notaire…), modifiables, avec variables |
| **Offre d'achat** | Générée depuis la fiche (prix en lettres, financement, conditions suspensives, mentions légales) → impression/PDF, Word, ou rangée dans les pièces |
| **Pré-état daté** | Comparatif syndic / Copro-Assistance, état des pièces utiles, **demande pré-remplie** à Copro-Assistance avec les pièces jointes |
| **Notaire** | Checklist d'envoi, note de transmission, **export ZIP** du dossier (fichiers renommés date_nature_nom + inventaire CSV) |
| **Import PDF** | Lecture d'un mandat ou d'une offre PDF dans le navigateur, extraction proposée pour validation |
| **Outils** | Honoraires/net vendeur, frais d'acquisition, prorata de taxe foncière, quote-part, délai de rétractation, validité des diagnostics, mensualité de prêt |

## Confidentialité

- **Aucun serveur, aucun compte** : toutes les données (dossiers et fichiers) restent dans le navigateur de l'utilisateur (IndexedDB).
- Aucune connexion à votre messagerie : l'application prépare les mails, vous les copiez et les envoyez vous-même.
- Sauvegarde/restauration complète en un fichier JSON (Paramètres).

## ⬇️ Installer sur votre ordinateur (2 minutes)

1. **[Télécharger CoproVente (ZIP)](https://github.com/COPROASSISTANCE/coprovente/archive/refs/heads/main.zip)** et décompresser le dossier où vous voulez (ex. *Documents*).
2. Double-cliquer sur **`index.html`** : l'application s'ouvre dans votre navigateur. Rien à installer.

C'est votre copie : vous pouvez la modifier librement (nom, couleurs, logo dans `config.js` ; étapes, pièces et modèles de mails dans `data.js`) — voir **[PERSONNALISER.md](PERSONNALISER.md)**.

Vous pouvez aussi l'essayer en ligne sans rien installer : https://coproassistance.github.io/coprovente/


## Structure
```
config.js       ← nom, couleurs, logo (à personnaliser)
data.js         ← référentiel métier : étapes, pièces, questions, mails, guides
index.html      page unique
app.css         styles (clair/sombre, mobile)
store.js        stockage local (IndexedDB)
app.js          cœur, tableau de bord, parcours, fiche, pièces, analyse
docs.js         mails, offre, pré-état daté, notaire, ZIP
pages.js        modèles, outils, guides, paramètres, import PDF
crm.js          tableau de bord, prospection, estimations, visites, mandats, ventes, profil
sw.js, manifest installation et mode hors ligne
```
Aucune compilation : modifiez un fichier, rechargez la page.
Bibliothèques chargées à la demande depuis cdnjs : pdf.js (import PDF) et JSZip (export ZIP).

## Avertissement
Information générale, à adapter au bien, à la copropriété, au vendeur et aux demandes de l'étude notariale. Ne remplace pas un conseil personnalisé. Les estimations (frais d'acquisition, délais) sont indicatives.

## Licence
MIT — libre d'utilisation, de modification et de redistribution.
