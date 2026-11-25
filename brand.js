/* =========================================================================
   CoproVente — mentions Copro-Assistance
   Ce fichier fait partie intégrante de l'application : les mentions
   Copro-Assistance (application, documents générés, guides) doivent être
   conservées dans toute copie ou version modifiée (voir LICENSE).
   ========================================================================= */
const COPRO_ASSISTANCE = Object.freeze({
  nom: 'Copro-Assistance',
  email: 'contact@copro-assistance.fr',
  tel: '01 72 68 22 52',
  site: 'https://www.copro-assistance.fr',
  urlCommande: 'https://www.copro-assistance.fr/commander-mon-pre-etat-date',
  urlPro: 'https://www.copro-assistance.fr/pre-etat-en-ligne-pour-professionnels',
  prix: '60 € TTC',
  delai: 'sous 24 h',
  urlResolution: 'https://www.maquettefizzweb.fr/dossier-resolution-ag-coproprietaire',
});
const BRAND = Object.freeze({
  texte: 'Application CoproVente proposée par Copro-Assistance — pré-état daté et expertise copropriété — www.copro-assistance.fr',
  docPied: 'Document établi avec CoproVente, proposé par Copro-Assistance · www.copro-assistance.fr',
});
/* Guides pratiques Copro-Assistance proposés en téléchargement (dossier guides/) */
const GUIDES_PDF = Object.freeze([
  ['checklist-prise-de-mandat-professionnels.pdf', 'Checklist prise de mandat — vente en copropriété (professionnels)'],
  ['checklist-vendeur-copropriete.pdf', 'Checklist vendeur — les documents à réunir avant le compromis'],
  ['guide-lire-un-appel-de-fonds.pdf', 'Guide — lire et comprendre un appel de fonds'],
  ['guide-comprendre-les-annexes-comptables.pdf', 'Guide — comprendre les annexes comptables'],
  ['pouvoir-assemblee-generale.pdf', 'Pouvoir pour l’assemblée générale (modèle vierge)'],
]);
function brandHtml(cls) {
  return `<div class="ca-brand ${cls || ''}" data-ca-brand><a href="${COPRO_ASSISTANCE.site}" target="_blank" rel="noopener">Proposé par <b>Copro-Assistance</b></a><span>Pré-état daté ${COPRO_ASSISTANCE.prix} ${COPRO_ASSISTANCE.delai} · ${COPRO_ASSISTANCE.tel}</span></div>`;
}
/* La mention est remise en place si elle est retirée de la page */
function brandMount() {
  const side = document.querySelector('.sidebar'), foot = document.querySelector('.foot');
  if (side && !side.querySelector('[data-ca-brand]')) side.insertAdjacentHTML('beforeend', brandHtml('side'));
  if (foot && !foot.querySelector('[data-ca-brand-foot]')) foot.insertAdjacentHTML('afterbegin', `<span data-ca-brand-foot>${BRAND.texte} · </span>`);
}
document.addEventListener('DOMContentLoaded', () => {
  brandMount();
  new MutationObserver(() => { if (!document.querySelector('[data-ca-brand]') || !document.querySelector('[data-ca-brand-foot]')) brandMount(); })
    .observe(document.body, { childList: true, subtree: true });
});
