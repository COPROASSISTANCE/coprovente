# CoproVente

**L'assistant de suivi commercial des agents et mandataires immobiliers, pensé pour le téléphone : savoir qui relancer, quelle action réaliser et où en est chaque vente.**

Libre et gratuit (licence GNU GPL v3 avec conditions d'attribution). Proposé par [Copro-Assistance](https://www.copro-assistance.fr), spécialisé dans la vente en copropriété.

▶ **Essayer en ligne :** https://coproassistance.github.io/coprovente/

## ⬇️ Installer sur votre ordinateur (2 minutes)

1. **[Télécharger CoproVente (ZIP)](https://github.com/COPROASSISTANCE/coprovente/archive/refs/heads/main.zip)** et décompresser le dossier où vous voulez (ex. *Documents*).
2. Double-cliquer sur **`index.html`** : l'application s'ouvre dans votre navigateur. Rien à installer.

C'est votre copie : modifiez-la librement (nom, couleurs, logo dans `config.js` ; étapes, pièces, modèles de mails dans `data.js`). Voir **[PERSONNALISER.md](PERSONNALISER.md)**.

## Le principe : une seule saisie, un dossier qui évolue

Un **contact** vendeur est associé à un **bien**. Ce bien fait ensuite l'objet d'une **estimation**, d'un **mandat**, de **visites** et d'une **vente**, sans recopier les informations. Un propriétaire peut vendre plusieurs biens, un bien peut avoir plusieurs propriétaires, plusieurs mandats peuvent se succéder.

## Fonctionnalités

| Module | Ce qu'il fait |
|---|---|
| **À traiter** (accueil) | Relances du jour, estimations en attente, biens sans activité, échéances de mandat, visites du jour et comptes rendus manquants, ventes bloquées : chaque ligne mène à l'action |
| **Relances** | Appel et SMS pré-rempli en un geste, puis résultat de l'échange et prochaine action datée |
| **Contacts** | Prospection vendeur (projet, maturité, statut, opposition à la prospection), fichier acquéreurs (budget, secteurs, critères, financement), historique des échanges |
| **Estimations** | Rendez-vous, rapport et restitution suivis séparément ; fourchette et prix ; retour du vendeur et issue ; import de rapports ; **rendu d'estimation PDF** et mail d'envoi |
| **Biens** | Prix et historique, supports de diffusion, demandes / visites / offres, actions, alertes d'inactivité, **bilan vendeur**, **aide à l'annonce** avec pense-bête des mentions obligatoires |
| **Mandats** | Statuts, échéances, répartition des honoraires, avenants, historique des conditions, mandats successifs |
| **Visites** | **Compte rendu en une minute** (choix rapides) ; comptes rendus vendeur et visiteur, PDF et mails |
| **Ventes** | Suivi dès l'offre acceptée : étapes prévues / réalisées, pièces attendues et responsable, point bloquant, honoraires prévus / facturés / encaissés, après-vente |
| **Dossier copropriété** | Parcours pas à pas, pièces avec statuts (dont « partiellement reçue » et « non réalisé sur la copropriété »), identifiants extranet, inventaire des équipements, analyse copro (signaux, appels de fonds, annexes, PV d'AG), pré-état daté, note au notaire et export ZIP |
| **Outils** | Offre d'achat à compléter et signer, facture d'honoraires, rédaction d'e-mail, fiche de commercialisation, annonce, simulateur de budget travaux, calculateurs, modèles de mails, guides copropriété |
| **Indicateurs** | Prospects actifs, relances en retard, rendez-vous par origine, délai de restitution, taux de transformation, motifs de perte, honoraires encaissés, délai de vente |

## Assistant IA (facultatif)

Avec une clé Claude (Paramètres › Assistant IA), l'application rédige comptes rendus de visite, annonces, bilans vendeur, analyses d'estimation et e-mails, et analyse appels de fonds, annexes comptables et PV d'AG déposés. Les données utiles sont alors envoyées à Anthropic à chaque génération et l'usage est facturé sur votre compte Anthropic. Sans clé, une rédaction automatique à partir de modèles reste disponible.

## Confidentialité

- **Aucun serveur, aucun compte** : dossiers et fichiers restent dans le navigateur de l'utilisateur (IndexedDB).
- Aucune connexion à la messagerie : les mails sont préparés puis copiés.
- Sauvegarde et restauration complètes en un fichier (Paramètres).

## Structure

```
config.js       ← nom, couleurs, logo (à personnaliser)
data.js         ← référentiel métier : étapes, pièces, questions, modèles de mails, guides, équipements
sim.js          ← simulateur de budget travaux (repères de prix)
index.html      page unique
app.css         styles (clair / sombre, mobile)
store.js        stockage local
app.js          dossier de vente : parcours, fiche, pièces, analyse copro
docs.js         mails, offre, pré-état daté, notaire, export ZIP
pages.js        modèles, calculateurs, guides, paramètres, import PDF
crm.js          accueil, relances, contacts, estimations, biens, mandats, visites, ventes, indicateurs, profil
gen.js          documents (rendu, comptes rendus, bilan, annonce, fiche, offre, facture) et assistant IA
aidocs.js       analyse IA des appels de fonds, annexes comptables et PV d'AG
flows.js        actions, reprise des données, exemple, démarrage
sw.js, manifest installation et mode hors ligne
```
Aucune compilation : modifiez un fichier, rechargez la page. Bibliothèques chargées à la demande : pdf.js (import de mandat), JSZip (export ZIP), SDK Anthropic (assistant IA).

## Avertissement

Information générale, à adapter au bien, à la copropriété et aux demandes de l'étude notariale ; ne remplace pas un conseil personnalisé. Les estimations (frais, délais, budget travaux) sont indicatives.

## Licence

**GNU GPL v3**, complétée de conditions supplémentaires (article 7) : voir [LICENSE](LICENSE).

- Vous pouvez utiliser, copier, modifier et redistribuer l'application, gratuitement.
- Toute copie ou version modifiée doit rester sous la même licence, avec son code source, et indiquer qu'elle a été modifiée.
- Les mentions Copro-Assistance (encart « Proposé par Copro-Assistance », pied de page de l'application et des documents générés, guides, fichier `brand.js`) doivent être conservées.
- Le nom et la marque Copro-Assistance ne peuvent pas être utilisés à d'autres fins.

Les versions publiées avant ce changement restent sous licence MIT.

## Guides Copro-Assistance

Le dossier `guides/` contient les guides pratiques et modèles de Copro-Assistance au format PDF (prise de mandat, checklist vendeur, appel de fonds, annexes comptables, pouvoir d'AG). Ils se téléchargent depuis la page *Guides copropriété* et peuvent être diffusés gratuitement, sans modification.
