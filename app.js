/* =========================================================================
   CoproVente — cœur de l'application
   Routage, état, liaisons de formulaires, tableau de bord, onglets du dossier
   ========================================================================= */

PIECES.push({ id: 'divers', cat: 'autres', label: 'Pièces diverses (non classées)', hint: 'Reclassez chaque fichier avec le menu ⋯.', multi: true, kw: [] });

/* ---------- Utilitaires ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
const eur = (v, dec) => num(v) == null ? '—' : Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec ?? (Number(v) % 1 ? 2 : 0), maximumFractionDigits: 2 });
const fdate = s => { if (!s) return '—'; const d = new Date(s.length === 10 ? s + 'T12:00:00' : s); return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR'); };
const fdatetime = t => new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
function today() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function addMonths(iso, m) { const d = new Date(iso + 'T12:00:00'); d.setMonth(d.getMonth() + Number(m)); return d.toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
const daysUntil = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5);
function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) {
  const ks = p.split('.'); let cur = o;
  ks.slice(0, -1).forEach((k, i) => { if (cur[k] == null) cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; });
  cur[ks[ks.length - 1]] = v;
}
const slug = s => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
const fsize = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' Mo' : Math.max(1, Math.round(n / 1e3)) + ' ko';

/* Jours fériés français (métropole) pour le calcul des délais */
function feries(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
  return [`${y}-01-01`, addDays(paques, 1), `${y}-05-01`, `${y}-05-08`, addDays(paques, 39), addDays(paques, 50),
    `${y}-07-14`, `${y}-08-15`, `${y}-11-01`, `${y}-11-11`, `${y}-12-25`];
}
function isOuvrable(iso) { const wd = new Date(iso + 'T12:00:00').getDay(); return wd !== 0 && wd !== 6 && !feries(+iso.slice(0, 4)).includes(iso); }
/* Délai de rétractation CCH L.271-1 : 10 jours à compter du lendemain de la 1re présentation */
function finRetractation(presentation) {
  if (!presentation) return '';
  let end = addDays(presentation, 10);
  while (!isOuvrable(end)) end = addDays(end, 1);
  return end;
}

/* ---------- État ---------- */
const DEFAULT_SETTINGS = {
  agent: { civ: '', prenom: '', nom: '', statut: 'Agent commercial indépendant (mandataire)', reseau: '', agence: '', carte: '', rsac: '', email: '', tel: '', adresse: '', signature: '' },
  gmailClientId: '', tplOverrides: {}, customTemplates: [], onboarded: false,
};
const App = { dossiers: [], settings: structuredClone(DEFAULT_SETTINGS), current: null, files: [], tab: 'parcours', canal: 'notaire', open: {} };

function newPerson() { return { civ: '', prenom: '', nom: '', email: '', tel: '', adresse: '', situation: '' }; }
function newDossier(seed = {}) {
  const n = App.dossiers.length + 1;
  return Object.assign({
    id: uid(), ref: 'V-' + new Date().getFullYear() + '-' + String(n).padStart(3, '0'), phase: 'mandat',
    createdAt: Date.now(), updatedAt: Date.now(), notes: '',
    mandat: { numero: '', type: 'exclusif', date: today(), duree: 3, prix: '', honoraires: '', charge: 'vendeur' },
    bien: { adresse: '', cp: '', ville: '', type: 'Appartement', etage: '', pieces: '', surface: '', annee: '', occupation: 'libre', chauffage: 'collectif', dpe: '', ges: '', description: '' },
    lots: [{ num: '', nature: 'Appartement', tantiemes: '', obs: '' }],
    copro: { nom: '', immat: '', nbLots: '', syndicNom: '', syndicContact: '', syndicEmail: '', syndicTel: '', syndicType: 'professionnel', extranet: '', charges: '', fondsTravaux: '', procedure: 'non', procedureDetail: '', ex1Debut: '', ex1Fin: '', ex2Debut: '', ex2Fin: '' },
    vendeurs: [newPerson()], acquereurs: [],
    notaireV: { nom: '', etude: '', email: '', tel: '', adresse: '' }, notaireA: { nom: '', etude: '', email: '', tel: '', adresse: '' },
    contacts: { autreNom: '', autreEmail: '', autreTel: '', courtier: '', courtierEmail: '' },
    dates: { compromis: '', notification: '', finRetractation: '', pret: '', acte: '' },
    offre: { prix: '', date: today(), validite: addDays(today(), 7), financement: 'pret', apport: '', pret: '', duree: 20, taux: '', conditionPret: true, delaiPret: 45, autresConditions: '', dateCompromis: '', dateActe: '', lieu: '', obs: '' },
    ped: { prestataire: 'copro-assistance', urgence: false, facturation: 'client', commandeLe: '', recuLe: '', notes: '' },
    tasks: {}, pieces: {}, entretien: {}, signaux: {}, alertesLibres: [], appels: [], annexes: {}, notaireChecks: {},
    mails: Object.fromEntries(CANAUX.map(c => [c.id, { to: '', query: '', messages: [], lastSync: 0 }])),
    journal: [{ t: Date.now(), txt: 'Dossier créé', type: 'auto' }],
  }, seed);
}

let saveTimer = {};
function saveDossier(d = App.current, now) {
  if (!d) return;
  d.updatedAt = Date.now();
  clearTimeout(saveTimer[d.id]);
  const go = () => Store.putDossier(d).catch(err => toast('Erreur de sauvegarde : ' + err.message, 'err'));
  now ? go() : (saveTimer[d.id] = setTimeout(go, 350));
}
function saveSettings() { Store.set('settings', App.settings); }
function log(d, txt, type = 'auto') { d.journal.unshift({ t: Date.now(), txt, type }); saveDossier(d); }

/* ---------- UI de base ---------- */
function toast(msg, kind = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 3800);
  setTimeout(() => t.remove(), 4300);
}
function openModal(title, html, opts = {}) {
  $('#modal').innerHTML = `<div class="modal-back" data-a="closeModal"></div>
    <div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header><h3>${esc(title)}</h3><button class="icon-btn" data-a="closeModal" aria-label="Fermer">✕</button></header>
      <div class="modal-body">${html}</div></div>`;
  $('#modal').hidden = false;
  const f = $('#modal [autofocus]'); if (f) f.focus();
}
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
function confirmBox(msg) { return window.confirm(msg); }
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copié dans le presse-papiers'); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copié'); }
}
function download(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* Champs de formulaire liés (data-b = chemin dans le dossier, data-s = paramètres) */
function field(label, path, opts = {}) {
  const src = opts.settings ? App.settings : App.current;
  const v = getPath(src, path) ?? '';
  const attrs = `data-b="${path}" ${opts.settings ? 'data-s' : ''} ${opts.r ? 'data-r' : ''} id="f_${path.replace(/\./g, '_')}"`;
  let input;
  if (opts.options) {
    input = `<select ${attrs}>${opts.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  } else if (opts.area) {
    input = `<textarea ${attrs} rows="${opts.rows || 3}" placeholder="${esc(opts.ph || '')}">${esc(v)}</textarea>`;
  } else if (opts.check) {
    return `<label class="check"><input type="checkbox" ${attrs} ${v ? 'checked' : ''}> <span>${label}</span></label>`;
  } else {
    input = `<input type="${opts.type || 'text'}" ${attrs} value="${esc(v)}" placeholder="${esc(opts.ph || '')}" ${opts.step ? `step="${opts.step}"` : ''} ${opts.list ? `list="${opts.list}"` : ''}>`;
  }
  return `<label class="field ${opts.cls || ''}" for="f_${path.replace(/\./g, '_')}"><span>${label}</span>${input}${opts.help ? `<small>${opts.help}</small>` : ''}</label>`;
}

function onBind(e) {
  const el = e.target;
  if (!el.dataset || el.dataset.b === undefined) return;
  const isSettings = el.hasAttribute('data-s');
  const target = isSettings ? App.settings : App.current;
  if (!target) return;
  let val = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'number') val = el.value === '' ? '' : Number(el.value);
  setPath(target, el.dataset.b, val);
  if (isSettings) saveSettings(); else {
    if (el.dataset.b === 'dates.notification' && val) { App.current.dates.finRetractation = finRetractation(val); }
    saveDossier();
  }
  if (e.type === 'change' && el.hasAttribute('data-r')) rerender();
}

/* ---------- Calculs métier ---------- */
const pieceDef = id => PIECES.find(p => p.id === id);
const pstate = (d, id) => d.pieces[id] || (d.pieces[id] = { s: '', dd: '', dr: '', doc: '', ex: '' });
const isApplicable = (d, p) => !p.cond || p.cond(d);
const filesFor = (pieceId) => App.files.filter(f => f.pieceId === pieceId);
function piecesManquantes(d, cats, filter) {
  return PIECES.filter(p => (!cats || cats.includes(p.cat)) && p.id !== 'divers' && isApplicable(d, p) && (!filter || filter(p)))
    .filter(p => { const s = (d.pieces[p.id] || {}).s || ''; return (s === '' && !p.opt) || s === 'D' || s === 'A'; });
}
function diagExpiry(d, p) {
  const st = d.pieces[p.id];
  if (!p.validite || !st || !st.doc) return null;
  return addMonths(st.doc, p.validite);
}
function taskState(d, step, t) {
  const st = d.tasks[step.id + '.' + t[0]];
  if (st && st.done) return { done: true, date: st.date };
  const o = t[2] || {};
  if (o.piece) {
    const p = pieceDef(o.piece), s = (d.pieces[o.piece] || {}).s;
    if (s === 'R') return { done: true, auto: 'pièce reçue' };
    if (s === 'SO') return { done: true, auto: 'sans objet' };
    if (p && !isApplicable(d, p)) return { done: true, auto: 'sans objet pour ce bien' };
  }
  return { done: false };
}
function progress(d) {
  let tot = 0, done = 0;
  ETAPES.forEach(s => s.taches.forEach(t => { tot++; if (taskState(d, s, t).done) done++; }));
  return { tot, done, pct: Math.round(100 * done / tot) };
}
function stepDone(d, s) { return s.taches.every(t => taskState(d, s, t).done); }
function currentStep(d) { return ETAPES.find(s => !stepDone(d, s)) || ETAPES[ETAPES.length - 1]; }
function nextTask(d) { const s = currentStep(d); const t = s.taches.find(t => !taskState(d, s, t).done); return t ? { step: s, task: t } : null; }

function echeances(d) {
  const out = [];
  const push = (date, label, kind) => date && out.push({ date, label, kind, d });
  if (d.phase === 'abandon' || d.phase === 'acte') return out;
  if (d.mandat.date && d.mandat.duree) push(addMonths(d.mandat.date, d.mandat.duree), 'Fin de la période du mandat', 'mandat');
  push(d.dates.compromis, 'Signature du compromis', 'rdv');
  push(d.dates.finRetractation, 'Fin du délai de rétractation', 'legal');
  push(d.dates.pret, 'Date limite d’obtention du prêt', 'legal');
  push(d.dates.acte, 'Signature de l’acte authentique', 'rdv');
  if (d.phase === 'offre' && d.offre.validite && !d.tasks['offre.acceptee']) push(d.offre.validite, 'Fin de validité de l’offre', 'offre');
  PIECES.filter(p => p.cat === 'diag').forEach(p => {
    const exp = diagExpiry(d, p); if (exp) push(exp, 'Expiration diagnostic : ' + p.label.split(' (')[0], 'diag');
  });
  PIECES.forEach(p => {
    const st = d.pieces[p.id];
    if (st && st.s === 'D' && st.dd && daysUntil(st.dd) <= -7) out.push({ date: addDays(st.dd, 7), label: 'Relancer : ' + p.label, kind: 'relance', d });
  });
  if (['offre', 'compromis'].includes(d.phase) && !d.ped.commandeLe && (d.pieces.ped || {}).s !== 'R')
    out.push({ date: today(), label: 'Pré-état daté non commandé', kind: 'ped', d });
  return out;
}
function allEcheances() {
  return App.dossiers.flatMap(echeances).sort((a, b) => a.date.localeCompare(b.date));
}
const phaseDef = id => PHASES.find(p => p.id === id) || PHASES[0];
const personName = p => [p.civ, p.prenom, p.nom].filter(Boolean).join(' ').trim();
const names = arr => (arr || []).map(personName).filter(Boolean).join(', ');
const dossierTitle = d => d.bien.adresse ? `${d.bien.adresse}${d.bien.ville ? ', ' + d.bien.ville : ''}` : 'Nouveau dossier';

/* ---------- Variables des modèles de mails ---------- */
function signature() {
  const a = App.settings.agent;
  if (a.signature) return a.signature;
  return [[a.prenom, a.nom].filter(Boolean).join(' ') || '[Votre nom]', a.statut, a.reseau || a.agence, [a.tel, a.email].filter(Boolean).join(' — '),
    a.rsac ? 'RSAC ' + a.rsac : '', a.carte ? 'Carte professionnelle ' + a.carte : ''].filter(Boolean).join('\n');
}
function civilite(arr) {
  const ps = (arr || []).filter(p => p.nom);
  if (ps.length !== 1) return ps.length ? ps.map(p => (p.civ === 'M.' ? 'Monsieur ' : p.civ === 'Mme' ? 'Madame ' : '') + p.nom).join(', ') : 'Madame, Monsieur';
  const p = ps[0]; return p.civ === 'M.' ? 'Monsieur ' + p.nom : p.civ === 'Mme' ? 'Madame ' + p.nom : [p.prenom, p.nom].join(' ').trim();
}
const bullets = list => list.length ? list.map(x => '- ' + x).join('\n') : '- (aucune)';
function lotsText(d) { return d.lots.filter(l => l.num).map(l => l.num + (l.nature ? ' (' + l.nature.toLowerCase() + ')' : '')).join(', ') || '[n° de lots]'; }
function financementText(d) {
  const o = d.offre;
  if (o.financement === 'comptant') return 'comptant, sans recours à un prêt';
  const parts = [];
  if (num(o.apport)) parts.push('apport de ' + eur(o.apport));
  if (num(o.pret)) parts.push('prêt de ' + eur(o.pret) + (o.duree ? ' sur ' + o.duree + ' ans' : '') + (o.taux ? ' au taux maximum de ' + o.taux + ' %' : ''));
  return (parts.join(' et ') || 'prêt immobilier') + (o.conditionPret ? ', sous condition suspensive d’obtention du prêt' : '');
}
function signauxText(d) {
  const pres = SIGNAUX.filter(s => (d.signaux[s.id] || {}).etat === 'oui').map(s => {
    const x = d.signaux[s.id]; return s.label + (x.montant ? ' — ' + eur(x.montant) : '') + (x.source ? ' (source : ' + x.source + ')' : '');
  });
  d.alertesLibres.filter(a => a.label).forEach(a => pres.push(a.label + (a.source ? ' (source : ' + a.source + ')' : '')));
  return pres.length ? bullets(pres) : '- Aucun point particulier relevé à ce stade.';
}
function diagSelonBien(d) {
  return ['amiante', 'plomb', 'elec', 'gaz', 'termites'].map(pieceDef).filter(p => isApplicable(d, p)).map(p => ', ' + p.label.split(' (')[0].toLowerCase()).join('');
}
function tplVars(d) {
  const b = d.bien, prix = d.offre.prix || d.mandat.prix;
  const recues = PIECES.filter(p => (d.pieces[p.id] || {}).s === 'R').map(p => p.label + ((d.pieces[p.id].ex) ? ' — ' + d.pieces[p.id].ex : ''));
  return {
    ref: d.ref, adresse: b.adresse || '[adresse]', adresse_complete: [b.adresse, [b.cp, b.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '[adresse]',
    lots: lotsText(d), type_bien: b.type, surface: b.surface || '[surface]', annee: b.annee || '[année]',
    occupation: { libre: 'libre de toute occupation', loue: 'loué', occupe: 'occupé par le vendeur' }[b.occupation] || b.occupation,
    vendeur_noms: names(d.vendeurs) || '[vendeur]', vendeur_nom: names(d.vendeurs) || '[vendeur]', vendeur_civilite: civilite(d.vendeurs),
    vendeur_tel: (d.vendeurs[0] || {}).tel || '', acquereur_noms: names(d.acquereurs) || '[acquéreur]', acquereur_civilite: civilite(d.acquereurs),
    copro_nom: d.copro.nom || '[copropriété]', syndic_nom: d.copro.syndicNom || '[syndic]', syndic_email: d.copro.syndicEmail ? '(' + d.copro.syndicEmail + ')' : '',
    notaire_nom: d.notaireV.nom || '[notaire]', mandat_numero: d.mandat.numero || '[n°]',
    prix_mandat: eur(d.mandat.prix), offre_prix: eur(prix), offre_validite: fdate(d.offre.validite), offre_financement: financementText(d),
    honoraires_montant: eur(d.mandat.honoraires), honoraires_charge: d.mandat.charge === 'acquereur' ? 'à la charge de l’acquéreur' : 'à la charge du vendeur',
    date_compromis: fdate(d.dates.compromis || d.offre.dateCompromis), date_fin_retractation: fdate(d.dates.finRetractation),
    date_pret: fdate(d.dates.pret), date_acte: fdate(d.dates.acte || d.offre.dateActe),
    pieces_manquantes_vendeur: bullets(piecesManquantes(d, ['vendeur', 'diag']).map(p => p.label)),
    pieces_manquantes_copro: bullets(piecesManquantes(d, ['copro_org', 'copro_compta', 'copro_tech'], p => !['ped', 'etat_date'].includes(p.id)).map(p => p.label)),
    pieces_manquantes_extranet: bullets(piecesManquantes(d, null, p => p.extranet).map(p => p.label)),
    pieces_manquantes_toutes: bullets(piecesManquantes(d, ['vendeur', 'diag', 'copro_org', 'copro_compta', 'copro_tech']).map(p => p.label)),
    pieces_recues: bullets(recues), signaux: signauxText(d), diag_selon_bien: diagSelonBien(d),
    ped_contact: d.ped.prestataire === 'copro-assistance' ? `Copro-Assistance (${COPRO_ASSISTANCE.email} — ${COPRO_ASSISTANCE.tel})` : d.ped.prestataire === 'syndic' ? (d.copro.syndicNom || 'le syndic') : 'le vendeur',
    agent_nom: [App.settings.agent.prenom, App.settings.agent.nom].join(' ').trim(), signature: signature(),
  };
}
function fill(str, d) { const v = tplVars(d); return String(str || '').replace(/\{\{(\w+)\}\}/g, (m, k) => v[k] ?? m); }
function allTemplates() {
  const ov = App.settings.tplOverrides || {};
  return TEMPLATES.map(t => ov[t.id] ? { ...t, ...ov[t.id], modified: true } : t).concat((App.settings.customTemplates || []).map(t => ({ ...t, custom: true })));
}

/* ---------- Routage ---------- */
function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  return { page: h[0] || 'accueil', id: h[1], tab: h[2] };
}
async function render() {
  const r = route();
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === r.page || (r.page === 'd' && a.dataset.page === 'accueil')));
  const v = $('#view');
  if (r.page === 'd') {
    const d = App.dossiers.find(x => x.id === r.id);
    if (!d) { location.hash = '#/'; return; }
    if (!App.current || App.current.id !== d.id) { App.current = d; App.files = await Store.filesOf(d.id); }
    App.tab = r.tab || 'parcours';
    v.innerHTML = viewDossier(d);
  } else {
    App.current = null;
    v.innerHTML = ({ accueil: viewDashboard, modeles: viewModeles, outils: viewOutils, guides: viewGuides, parametres: viewParametres }[r.page] || viewDashboard)();
  }
  document.title = (App.current ? dossierTitle(App.current) + ' — ' : '') + ((typeof APP_CONFIG === 'object' && APP_CONFIG.nom) || 'CoproVente');
}
function rerender() {
  setTimeout(() => {
    const ae = document.activeElement, key = ae && ae.dataset ? (ae.dataset.b || ae.dataset.t) : null;
    let caret = null; try { caret = ae.selectionStart; } catch (e) {}
    const y = scrollY;
    render().then(() => {
      scrollTo(0, y);
      if (key) {
        const n = document.querySelector(`[data-b="${key}"],[data-t="${key}"]`);
        if (n) { n.focus({ preventScroll: true }); try { if (caret != null) n.setSelectionRange(caret, caret); } catch (e) {} }
      }
    });
  }, 0);
}

/* ---------- Tableau de bord ---------- */
function viewDashboard() {
  const ds = App.dossiers.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const actifs = ds.filter(d => !['acte', 'abandon'].includes(d.phase));
  const ech = allEcheances().filter(e => daysUntil(e.date) <= 30);
  const kpi = (n, l, c = '') => `<div class="kpi ${c}"><b>${n}</b><span>${l}</span></div>`;
  const welcome = !App.settings.agent.nom ? `<div class="banner">👋 Bienvenue ! Commencez par renseigner <a href="#/parametres">votre profil</a> (il alimente vos signatures, offres et mails), puis créez votre premier dossier — ou <button class="link" data-a="demo">chargez un dossier d’exemple</button>.</div>` : '';
  return `${welcome}
  <div class="page-head"><div><h1>Mes ventes en copropriété</h1><p class="muted">${actifs.length} dossier(s) actif(s) · données stockées uniquement sur cet appareil</p></div>
    <div class="row gap wrap">${!Gmail.isConnected() && location.protocol !== 'file:' && gmailClientId() ? gmailBox(true) : ''}<button class="btn ghost" data-a="importPdf" data-kind="mandat">📄 Importer un mandat PDF</button><button class="btn primary" data-a="newDossier">＋ Nouveau dossier</button></div></div>
  <div class="kpis">${kpi(actifs.length, 'Dossiers actifs')}${kpi(ds.filter(d => d.phase === 'offre').length, 'Offres / pré-compromis')}${kpi(ds.filter(d => d.phase === 'compromis').length, 'Compromis signés')}${kpi(ech.filter(e => daysUntil(e.date) < 0).length, 'Échéances dépassées', ech.some(e => daysUntil(e.date) < 0) ? 'alert' : '')}</div>
  <div class="grid2">
    <section class="card"><h2>⏰ Échéances & relances (30 jours)</h2>${ech.length ? `<ul class="ech">${ech.slice(0, 14).map(e => {
      const n = daysUntil(e.date); return `<li class="${n < 0 ? 'late' : n <= 7 ? 'soon' : ''}"><a href="#/d/${e.d.id}/${e.kind === 'relance' ? 'pieces' : e.kind === 'ped' ? 'ped' : 'parcours'}"><span class="when">${n < 0 ? 'Dépassé de ' + -n + ' j' : n === 0 ? 'Aujourd’hui' : 'J-' + n}</span><span>${esc(e.label)}<small>${esc(dossierTitle(e.d))}</small></span></a></li>`;
    }).join('')}</ul>` : '<p class="muted">Rien d’urgent. 👌</p>'}</section>
    <section class="card"><h2>✅ Prochaines actions</h2>${actifs.length ? `<ul class="actions-list">${actifs.map(d => {
      const n = nextTask(d); return n ? `<li><a href="#/d/${d.id}/parcours"><b>${esc(n.step.titre)}</b> — ${esc(n.task[1])}<small>${esc(dossierTitle(d))}</small></a></li>` : '';
    }).join('')}</ul>` : '<p class="muted">Aucun dossier actif.</p>'}</section>
  </div>
  <h2 class="section-title">Dossiers</h2>
  ${ds.length ? `<div class="cards">${ds.map(cardDossier).join('')}</div>` : `<div class="empty"><p>Aucun dossier pour l’instant.</p><button class="btn primary" data-a="newDossier">Créer mon premier dossier</button> <button class="btn ghost" data-a="demo">Voir un exemple</button></div>`}`;
}
function cardDossier(d) {
  const p = progress(d), ph = phaseDef(d.phase), cs = currentStep(d);
  return `<a class="dcard" href="#/d/${d.id}/parcours">
    <div class="row between"><span class="pill" style="--c:${ph.color}">${ph.label}</span><span class="muted small">${esc(d.ref)}</span></div>
    <h3>${esc(dossierTitle(d))}</h3>
    <p class="muted small">${esc(names(d.vendeurs) || 'Vendeur à renseigner')}${d.acquereurs.length ? ' → ' + esc(names(d.acquereurs)) : ''}</p>
    <p class="price">${eur(d.offre.prix || d.mandat.prix)}</p>
    <div class="bar"><i style="width:${p.pct}%"></i></div>
    <p class="small"><b>${p.pct} %</b> · étape : ${esc(cs.titre)}</p></a>`;
}

/* ---------- Vue dossier ---------- */
const TABS = [
  ['parcours', '🧭 Parcours'], ['fiche', '🗂️ Fiche'], ['pieces', '📁 Pièces'], ['entretien', '🗒️ Entretien'], ['analyse', '📊 Analyse copro'],
  ['mails', '✉️ Mails'], ['offre', '✍️ Offre d’achat'], ['ped', '📦 Pré-état daté'], ['notaire', '📤 Notaire'], ['journal', '🕓 Journal'],
];
function viewDossier(d) {
  const p = progress(d);
  const recus = PIECES.filter(x => (d.pieces[x.id] || {}).s === 'R').length;
  return `<div class="dhead">
    <div><a href="#/" class="muted small">← Tableau de bord</a><h1>${esc(dossierTitle(d))}</h1>
    <p class="muted">${esc(d.ref)} · ${esc(names(d.vendeurs) || 'vendeur ?')} · lots ${esc(lotsText(d))} · ${eur(d.offre.prix || d.mandat.prix)}</p></div>
    <div class="dhead-side">${field('Étape commerciale', 'phase', { options: PHASES.map(x => [x.id, x.label]), r: true })}
      <div class="mini"><div class="bar"><i style="width:${p.pct}%"></i></div><small>${p.done}/${p.tot} tâches · ${recus} pièces reçues</small></div></div></div>
  <nav class="tabs" role="tablist">${TABS.map(([id, l]) => `<a role="tab" href="#/d/${d.id}/${id}" class="${App.tab === id ? 'active' : ''}">${l}</a>`).join('')}</nav>
  <div class="tab-body">${({ parcours: tabParcours, fiche: tabFiche, pieces: tabPieces, entretien: tabEntretien, analyse: tabAnalyse, mails: tabMails, offre: tabOffre, ped: tabPed, notaire: tabNotaire, journal: tabJournal }[App.tab] || tabParcours)(d)}</div>`;
}

/* ----- Parcours / timeline ----- */
function tabParcours(d) {
  const cur = currentStep(d);
  return `<p class="muted">Suivez les étapes dans l’ordre. Les tâches liées à une pièce se cochent automatiquement quand la pièce est reçue ou confirmée sans objet.</p>
  <ol class="timeline">${ETAPES.map((s, i) => {
    const done = stepDone(d, s), isCur = s.id === cur.id, n = s.taches.filter(t => taskState(d, s, t).done).length;
    const open = App.open[s.id] ?? isCur;
    return `<li class="step ${done ? 'done' : ''} ${isCur ? 'current' : ''}">
      <button class="step-head" data-a="toggleStep" data-id="${s.id}" aria-expanded="${open}">
        <span class="dot">${done ? '✓' : i + 1}</span>
        <span class="st-title"><b>${esc(s.titre)}</b><small>${esc(s.sous)}</small></span>
        <span class="count">${n}/${s.taches.length}</span></button>
      ${open ? `<div class="step-body">
        <ul class="tasks">${s.taches.map(t => taskRow(d, s, t)).join('')}</ul>
        ${s.conseils.map(c => `<div class="tip">💡 ${esc(c)}</div>`).join('')}
        <div class="row wrap gap">${s.actions.map(([a, l]) => actionBtn(a, l)).join('')}</div>
      </div>` : ''}</li>`;
  }).join('')}</ol>`;
}
function actionBtn(a, l) {
  if (a.startsWith('tpl:')) return `<button class="btn small" data-a="compose" data-tpl="${a.slice(4)}">${l}</button>`;
  if (a.startsWith('go:')) return `<a class="btn small" href="#/d/${App.current.id}/${a.slice(3)}">${l}</a>`;
  if (a === 'importMandat') return `<button class="btn small" data-a="importPdf" data-kind="mandat" data-into="1">${l}</button>`;
  return `<button class="btn small" data-a="${a}">${l}</button>`;
}
function taskRow(d, s, t) {
  const st = taskState(d, s, t), o = t[2] || {}, key = s.id + '.' + t[0];
  const ps = o.piece ? pieceDef(o.piece) : null;
  const pst = ps ? (d.pieces[o.piece] || {}).s || '' : null;
  const link = o.action ? `<a class="small" href="#/d/${d.id}/${o.action === 'fiche' ? 'fiche' : o.action}">ouvrir →</a>` : '';
  return `<li class="${st.done ? 'ok' : ''}">
    <label class="check"><input type="checkbox" data-a="toggleTask" data-key="${key}" ${st.done ? 'checked' : ''} ${st.auto ? 'disabled' : ''}>
    <span>${esc(t[1])}</span></label>
    <span class="task-meta">${st.auto ? `<em class="auto">✓ ${st.auto}</em>` : st.date ? `<em>${fdate(st.date)}</em>` : ''}
    ${ps ? `<a class="badge ${PIECE_STATUTS.find(x => x.id === pst).cls}" href="#/d/${d.id}/pieces#p_${ps.id}" title="${esc(ps.label)}">📎 ${PIECE_STATUTS.find(x => x.id === pst).short}</a>` : ''}
    ${o.date ? `<input type="date" class="inline-date" data-b="dates.${o.date}" data-r value="${esc(d.dates[o.date] || '')}" title="Date">` : ''}${link}</span></li>`;
}

/* ----- Fiche ----- */
function personBlock(listPath, i, p, title) {
  return `<div class="person"><div class="row between"><b>${title} ${i + 1}</b><button class="icon-btn" data-a="delPerson" data-list="${listPath}" data-i="${i}" title="Retirer">🗑</button></div>
  <div class="grid4">${field('Civilité', `${listPath}.${i}.civ`, { options: [['', '—'], ['M.', 'M.'], ['Mme', 'Mme'], ['Société', 'Société']] })}
  ${field('Prénom', `${listPath}.${i}.prenom`)}${field('Nom', `${listPath}.${i}.nom`)}${field('Situation / régime', `${listPath}.${i}.situation`, { ph: 'marié(e), communauté…' })}
  ${field('E-mail', `${listPath}.${i}.email`, { type: 'email' })}${field('Téléphone', `${listPath}.${i}.tel`, { type: 'tel' })}${field('Adresse', `${listPath}.${i}.adresse`, { cls: 'span2' })}</div></div>`;
}
function tabFiche(d) {
  const prix = num(d.mandat.prix), hon = num(d.mandat.honoraires);
  const pct = prix && hon ? (d.mandat.charge === 'acquereur' ? (hon / (prix - hon) * 100) : (hon / prix * 100)).toFixed(2) : null;
  return `<div class="row between"><p class="muted">Ces informations pré-remplissent les mails, l’offre d’achat, la demande de pré-état daté et la note au notaire.</p>
    <button class="btn small" data-a="importPdf" data-kind="mandat" data-into="1">📄 Compléter depuis un PDF</button></div>
  <section class="card"><h2>Mandat</h2><div class="grid4">
    ${field('N° de mandat', 'mandat.numero')}${field('Type', 'mandat.type', { options: [['exclusif', 'Exclusif'], ['semi', 'Semi-exclusif'], ['simple', 'Simple']] })}
    ${field('Date de signature', 'mandat.date', { type: 'date', r: true })}${field('Durée (mois)', 'mandat.duree', { type: 'number', r: true })}
    ${field('Prix de présentation (€ FAI)', 'mandat.prix', { type: 'number', r: true })}${field('Honoraires TTC (€)', 'mandat.honoraires', { type: 'number', r: true })}
    ${field('Honoraires à la charge de', 'mandat.charge', { options: [['vendeur', 'Vendeur'], ['acquereur', 'Acquéreur']], r: true })}
    <div class="field"><span>Repères</span><div class="readout">${pct ? `Honoraires : ${pct} % ${d.mandat.charge === 'acquereur' ? 'du prix hors honoraires' : 'du prix'}<br>Net vendeur : ${eur(prix - hon)}` : '—'}${d.mandat.date && d.mandat.duree ? `<br>Échéance : ${fdate(addMonths(d.mandat.date, d.mandat.duree))}` : ''}</div></div></div></section>
  <section class="card"><h2>Le bien</h2><div class="grid4">
    ${field('Adresse', 'bien.adresse', { cls: 'span2', r: true })}${field('Code postal', 'bien.cp')}${field('Ville', 'bien.ville', { r: true })}
    ${field('Type', 'bien.type', { options: ['Appartement', 'Studio', 'Duplex', 'Maison en copropriété', 'Local commercial', 'Parking / box', 'Cave', 'Autre'] })}
    ${field('Étage', 'bien.etage')}${field('Pièces', 'bien.pieces', { type: 'number' })}${field('Surface Carrez (m²)', 'bien.surface', { type: 'number', step: '0.01' })}
    ${field('Année de construction', 'bien.annee', { type: 'number', r: true, help: 'Détermine amiante / plomb' })}
    ${field('Occupation', 'bien.occupation', { options: [['libre', 'Libre'], ['loue', 'Loué'], ['occupe', 'Occupé par le vendeur']], r: true })}
    ${field('Chauffage', 'bien.chauffage', { options: [['collectif', 'Collectif'], ['individuel', 'Individuel']] })}
    ${field('Classe DPE', 'bien.dpe', { options: ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] })}${field('Classe GES', 'bien.ges', { options: ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] })}
    ${field('Description / points forts', 'bien.description', { area: true, cls: 'span4' })}</div>
    <h3>Lots vendus</h3><table class="tbl"><thead><tr><th>N° de lot</th><th>Nature</th><th>Tantièmes généraux</th><th>Observations</th><th></th></tr></thead><tbody>
    ${d.lots.map((l, i) => `<tr><td><input data-b="lots.${i}.num" value="${esc(l.num)}"></td><td><input data-b="lots.${i}.nature" value="${esc(l.nature)}" list="natures"></td>
      <td><input data-b="lots.${i}.tantiemes" value="${esc(l.tantiemes)}" placeholder="ex. 125/10000"></td><td><input data-b="lots.${i}.obs" value="${esc(l.obs)}"></td>
      <td><button class="icon-btn" data-a="delLot" data-i="${i}">🗑</button></td></tr>`).join('')}</tbody></table>
    <datalist id="natures"><option>Appartement</option><option>Cave</option><option>Parking</option><option>Box</option><option>Grenier</option><option>Jardin (jouissance)</option><option>Local</option></datalist>
    <button class="btn small" data-a="addLot">＋ Ajouter un lot</button></section>
  <section class="card"><h2>Copropriété & syndic</h2><div class="grid4">
    ${field('Nom de la copropriété', 'copro.nom')}${field('N° d’immatriculation', 'copro.immat')}${field('Nombre de lots', 'copro.nbLots', { type: 'number' })}
    ${field('Type de syndic', 'copro.syndicType', { options: [['professionnel', 'Professionnel'], ['benevole', 'Bénévole'], ['cooperatif', 'Coopératif']] })}
    ${field('Syndic (cabinet)', 'copro.syndicNom')}${field('Gestionnaire', 'copro.syndicContact')}${field('E-mail syndic', 'copro.syndicEmail', { type: 'email' })}${field('Téléphone syndic', 'copro.syndicTel')}
    ${field('Adresse de l’extranet', 'copro.extranet', { cls: 'span2', ph: 'https://… (jamais le mot de passe)' })}
    ${field('Charges courantes annuelles du lot (€)', 'copro.charges', { type: 'number', help: 'Quote-part budget prévisionnel — mention d’annonce' })}
    ${field('Part du fonds de travaux du lot (€)', 'copro.fondsTravaux', { type: 'number' })}
    ${field('Procédure en cours ?', 'copro.procedure', { options: [['non', 'Non (vérifié)'], ['oui', 'Oui'], ['?', 'À vérifier']], r: true })}
    ${d.copro.procedure === 'oui' ? field('Détail de la procédure', 'copro.procedureDetail', { cls: 'span3' }) : ''}</div>
    <h3>Exercices concernés (pré-état daté)</h3><div class="grid4">
    ${field('Exercice 1 — début', 'copro.ex1Debut', { type: 'date' })}${field('Exercice 1 — clôture', 'copro.ex1Fin', { type: 'date' })}
    ${field('Exercice 2 — début', 'copro.ex2Debut', { type: 'date' })}${field('Exercice 2 — clôture', 'copro.ex2Fin', { type: 'date' })}</div></section>
  <section class="card"><h2>Vendeur(s)</h2>${d.vendeurs.map((p, i) => personBlock('vendeurs', i, p, 'Vendeur')).join('')}<button class="btn small" data-a="addPerson" data-list="vendeurs">＋ Ajouter un vendeur</button></section>
  <section class="card"><h2>Acquéreur(s)</h2>${d.acquereurs.map((p, i) => personBlock('acquereurs', i, p, 'Acquéreur')).join('') || '<p class="muted">Aucun acquéreur pour le moment.</p>'}<button class="btn small" data-a="addPerson" data-list="acquereurs">＋ Ajouter un acquéreur</button></section>
  <section class="card"><h2>Notaires & autres contacts</h2><div class="grid4">
    ${field('Notaire vendeur', 'notaireV.nom')}${field('Étude', 'notaireV.etude')}${field('E-mail', 'notaireV.email', { type: 'email' })}${field('Téléphone', 'notaireV.tel')}
    ${field('Notaire acquéreur', 'notaireA.nom')}${field('Étude', 'notaireA.etude')}${field('E-mail', 'notaireA.email', { type: 'email' })}${field('Téléphone', 'notaireA.tel')}
    ${field('Autre contact (diagnostiqueur…)', 'contacts.autreNom')}${field('E-mail', 'contacts.autreEmail', { type: 'email' })}${field('Téléphone', 'contacts.autreTel')}${field('Courtier (e-mail)', 'contacts.courtierEmail', { type: 'email' })}</div></section>
  <section class="card"><h2>Dates clés</h2><div class="grid4">
    ${field('Compromis', 'dates.compromis', { type: 'date', r: true })}${field('1re présentation de la notification', 'dates.notification', { type: 'date', r: true })}
    ${field('Fin du délai de rétractation', 'dates.finRetractation', { type: 'date', r: true, help: 'Calculée automatiquement (modifiable)' })}
    ${field('Date limite d’obtention du prêt', 'dates.pret', { type: 'date', r: true })}${field('Acte authentique', 'dates.acte', { type: 'date', r: true })}</div></section>
  <section class="card"><h2>Notes internes</h2>${field('', 'notes', { area: true, rows: 4 })}</section>
  <p class="right"><button class="btn danger small" data-a="deleteDossier">Supprimer ce dossier</button></p>`;
}

/* ----- Pièces ----- */
function tabPieces(d) {
  const f = App.pieceFilter || 'all';
  const counts = { R: 0, miss: 0 };
  PIECES.forEach(p => { const s = (d.pieces[p.id] || {}).s || ''; if (s === 'R') counts.R++; else if (isApplicable(d, p) && s !== 'SO' && p.id !== 'divers') counts.miss++; });
  return `<div class="dropzone" data-drop="1"><b>Déposez ici vos fichiers</b> (PDF, images, Word…) — ils sont classés automatiquement d’après leur nom et stockés sur cet appareil.
    <label class="btn small primary">Choisir des fichiers<input type="file" multiple hidden data-upload="auto"></label></div>
  <div class="row between wrap gap"><div class="seg">${[['all', 'Toutes'], ['miss', `Manquantes (${counts.miss})`], ['R', `Reçues (${counts.R})`], ['V', 'À analyser'], ['D', 'Demandées']].map(([id, l]) => `<button class="${f === id ? 'on' : ''}" data-a="pieceFilter" data-f="${id}">${l}</button>`).join('')}</div>
    <div class="row gap wrap"><button class="btn small" data-a="compose" data-tpl="vendeur_pieces">✉️ Pièces manquantes → vendeur</button><button class="btn small" data-a="compose" data-tpl="syndic_documents">✉️ → syndic</button><button class="btn small" data-a="compose" data-tpl="syndic_extranet">✉️ Extranet incomplet</button></div></div>
  <p class="small muted">Statuts : <b>Reçue</b> · <b>Demandée</b> (avec date, relance proposée après 7 jours) · <b>À analyser</b> · <b>À actualiser</b> · <b>Sans objet</b> — à ne cocher qu’après vérification.</p>
  ${PIECE_CATEGORIES.map(c => {
    const ps = PIECES.filter(p => p.cat === c.id).filter(p => {
      const s = (d.pieces[p.id] || {}).s || '';
      if (f === 'all') return true; if (f === 'miss') return isApplicable(d, p) && !['R', 'SO'].includes(s) && p.id !== 'divers';
      return s === f;
    });
    if (!ps.length) return '';
    return `<section class="card pieces"><h2>${c.icon} ${c.label}</h2>${ps.map(p => pieceRow(d, p)).join('')}</section>`;
  }).join('')}`;
}
function pieceRow(d, p) {
  const st = d.pieces[p.id] || {}, s = st.s || '', fl = filesFor(p.id), appl = isApplicable(d, p);
  const exp = diagExpiry(d, p);
  return `<div class="piece ${appl ? '' : 'na'}" id="p_${p.id}">
    <div class="pinfo"><b>${esc(p.label)}</b>${p.ped ? '<span class="tag">pré-état daté</span>' : ''}${!appl ? '<span class="tag grey">probablement sans objet</span>' : p.opt ? '<span class="tag grey">selon le bien</span>' : ''}
      <small>${esc(p.hint || '')}</small>
      ${fl.length ? `<div class="files">${fl.map(fileChip).join('')}</div>` : ''}</div>
    <div class="pctl">
      <select data-a-change="setPieceStatus" data-id="${p.id}" class="status ${PIECE_STATUTS.find(x => x.id === s).cls}" aria-label="Statut">${PIECE_STATUTS.map(x => `<option value="${x.id}" ${x.id === s ? 'selected' : ''}>${x.label}</option>`).join('')}</select>
      <div class="pdates">${s === 'D' ? `<label>Demandée le <input type="date" data-b="pieces.${p.id}.dd" value="${esc(st.dd || '')}"></label>` : ''}
        ${p.cat === 'diag' ? `<label>Réalisé le <input type="date" data-b="pieces.${p.id}.doc" data-r value="${esc(st.doc || '')}"></label>${exp ? `<span class="${daysUntil(exp) < 0 ? 'late' : daysUntil(exp) < 45 ? 'soon' : 'okc'}">valide jusqu’au ${fdate(exp)}</span>` : p.validite === null ? '<span class="small muted">illimité si négatif</span>' : ''}` : ''}
        <input class="ex" data-b="pieces.${p.id}.ex" value="${esc(st.ex || '')}" placeholder="exercice / version / note"></div>
      <label class="btn small" title="Ajouter un fichier">＋ Fichier<input type="file" multiple hidden data-upload="${p.id}"></label></div></div>`;
}
function fileChip(f) {
  return `<span class="fchip"><button class="link" data-a="openFile" data-id="${f.id}" title="Ouvrir">📄 ${esc(f.name)}</button><small>${fsize(f.size)}</small>
    <button class="icon-btn" data-a="fileMenu" data-id="${f.id}" title="Reclasser / télécharger / supprimer">⋯</button></span>`;
}

/* ----- Entretien vendeur ----- */
function tabEntretien(d) {
  const tot = ENTRETIEN.reduce((a, g) => a + g.questions.length, 0);
  const rep = Object.values(d.entretien).filter(x => x && x.r).length;
  return `<p class="muted">Ne vous limitez pas aux caractéristiques du logement : faites raconter la copropriété. ${rep}/${tot} réponses.</p>
  ${ENTRETIEN.map(g => `<section class="card"><h2>${esc(g.titre)}</h2>${g.questions.map(([id, q]) => {
    const x = d.entretien[id] || {};
    return `<div class="qrow"><p>${esc(q)}</p><div class="row gap wrap">
      <div class="seg small">${[['oui', 'Oui'], ['non', 'Non'], ['?', 'À vérifier']].map(([v, l]) => `<button class="${x.r === v ? 'on' : ''} ${v === '?' ? 'warnb' : ''}" data-a="entretienRep" data-id="${id}" data-v="${v}">${l}</button>`).join('')}</div>
      <input class="grow" data-b="entretien.${id}.note" value="${esc(x.note || '')}" placeholder="Réponse / précisions"></div></div>`;
  }).join('')}</section>`).join('')}
  <div class="tip">À consigner : notez les réponses incertaines comme des points à vérifier, jamais comme des faits acquis. Les réponses « À vérifier » apparaissent dans la note au notaire si vous les transformez en signal (onglet Analyse).</div>`;
}

/* ----- Analyse copro : signaux, appels de fonds, annexes ----- */
function tabAnalyse(d) {
  const groups = [...new Set(SIGNAUX.map(s => s.groupe))];
  return `<section class="card"><h2>🚩 Signaux à traiter avant commercialisation</h2>
    <p class="small muted">Pour chaque alerte : vérifier le document source, demander l’explication du vendeur, mesurer l’incidence, transmettre l’information utile au notaire.</p>
    ${groups.map(g => `<h3>${g}</h3>${SIGNAUX.filter(s => s.groupe === g).map(s => signalRow(d, s)).join('')}`).join('')}
    <h3>Autres points relevés</h3>
    ${d.alertesLibres.map((a, i) => `<div class="sig on"><div class="grid4">${field('Constat', `alertesLibres.${i}.label`, { cls: 'span2' })}${field('Source', `alertesLibres.${i}.source`)}${field('Question à poser', `alertesLibres.${i}.question`)}</div><button class="icon-btn" data-a="delAlerte" data-i="${i}">🗑</button></div>`).join('')}
    <button class="btn small" data-a="addAlerte">＋ Ajouter un point</button></section>
  <section class="card"><div class="row between"><h2>💶 Fiches de lecture des appels de fonds</h2><button class="btn small" data-a="addAppel">＋ Nouvel appel</button></div>
    <p class="small muted">Un appel indique une somme <b>appelée</b> ; il ne prouve pas un paiement. Ne multipliez jamais le total à payer par quatre pour estimer des charges annuelles.</p>
    ${d.appels.length ? d.appels.map((a, i) => appelCard(d, a, i)).join('') : '<p class="muted">Aucune fiche. Ajoutez le dernier appel de fonds du vendeur.</p>'}</section>
  ${annexesCard(d)}
  <section class="card"><h2>📣 Mentions copropriété pour l’annonce</h2><p class="small muted">Générées à partir de la fiche (nombre de lots, charges courantes annuelles, procédure, DPE).</p><button class="btn small" data-a="annonceCopro">Générer les mentions</button></section>`;
}
function signalRow(d, s) {
  const x = d.signaux[s.id] || {};
  return `<div class="sig ${x.etat === 'oui' ? 'on' : ''}"><div class="row between wrap gap"><span>${esc(s.label)}</span>
    <div class="seg small">${[['', 'Non vérifié'], ['non', 'Absent'], ['oui', 'Présent'], ['?', 'À vérifier']].map(([v, l]) => `<button class="${(x.etat || '') === v ? 'on' : ''}" data-a="setSignal" data-id="${s.id}" data-v="${v}">${l}</button>`).join('')}</div></div>
    ${x.etat === 'oui' || x.etat === '?' ? `<div class="grid4">${field('Source (document, page)', `signaux.${s.id}.source`)}${field('Date', `signaux.${s.id}.date`, { type: 'date' })}${field('Montant (€)', `signaux.${s.id}.montant`, { type: 'number' })}${field('Question restant à poser', `signaux.${s.id}.question`)}
    ${field('Explication du vendeur demandée', `signaux.${s.id}.vendeur`, { check: true })}${field('Transmis au notaire', `signaux.${s.id}.notaire`, { check: true })}</div>` : ''}</div>`;
}
const APPEL_CATS = [['courant', 'Provisions courantes'], ['travaux', 'Travaux votés'], ['fonds', 'Fonds de travaux'], ['regul', 'Régularisation'], ['autre', 'Autre']];
function appelCalc(a) {
  const lines = (a.lignes || []).map(l => {
    const part = num(l.part) != null ? num(l.part) : (num(l.global) != null && num(l.tant) && num(l.cle) ? Math.round(l.global * l.tant / l.cle * 100) / 100 : null);
    return { ...l, calc: part };
  });
  const by = c => lines.filter(l => l.cat === c).reduce((s, l) => s + (l.calc || 0), 0);
  const nouvel = lines.reduce((s, l) => s + (l.calc || 0), 0);
  const solde = num(a.solde) || 0, signed = a.sens === 'credit' ? -solde : solde;
  return { lines, nouvel, courant: by('courant'), travaux: by('travaux'), fonds: by('fonds'), total: nouvel + signed, signed };
}
function appelCard(d, a, i) {
  const c = appelCalc(a), p = `appels.${i}`;
  return `<div class="appel"><div class="row between"><b>Appel ${i + 1}${a.periode ? ' — ' + esc(a.periode) : ''}</b><button class="icon-btn" data-a="delAppel" data-i="${i}">🗑</button></div>
  <div class="grid4">${field('Période / exercice', p + '.periode', { ph: '4e trimestre 2026' })}${field('Date d’exigibilité', p + '.exig', { type: 'date' })}${field('Référence de l’avis', p + '.ref')}${field('Pièce de référence', p + '.piece', { ph: 'budget, PV, règlement…' })}</div>
  <table class="tbl"><thead><tr><th>Nature</th><th>Catégorie</th><th>Global appelé (€)</th><th>Vos tantièmes</th><th>Total clé</th><th>Votre part</th><th></th></tr></thead><tbody>
  ${c.lines.map((l, j) => `<tr><td><input data-b="${p}.lignes.${j}.nature" value="${esc(l.nature || '')}"></td>
    <td><select data-b="${p}.lignes.${j}.cat" data-r>${APPEL_CATS.map(([v, lb]) => `<option value="${v}" ${l.cat === v ? 'selected' : ''}>${lb}</option>`).join('')}</select></td>
    <td><input type="number" step="0.01" data-b="${p}.lignes.${j}.global" data-r value="${esc(l.global ?? '')}"></td><td><input type="number" data-b="${p}.lignes.${j}.tant" data-r value="${esc(l.tant ?? '')}"></td>
    <td><input type="number" data-b="${p}.lignes.${j}.cle" data-r value="${esc(l.cle ?? '')}"></td><td><b>${l.calc != null ? eur(l.calc, 2) : '—'}</b></td>
    <td><button class="icon-btn" data-a="delLigne" data-i="${i}" data-j="${j}">🗑</button></td></tr>`).join('')}</tbody></table>
  <button class="btn small" data-a="addLigne" data-i="${i}">＋ Ligne</button>
  <div class="grid4">${field('Solde antérieur (€)', p + '.solde', { type: 'number', r: true })}${field('Sens', p + '.sens', { options: [['debit', 'Débiteur (à payer)'], ['credit', 'Créditeur (en votre faveur)']], r: true })}
    <div class="field"><span>Reconstitution</span><div class="readout">Nouvel appel : <b>${eur(c.nouvel, 2)}</b><br>Solde antérieur : ${eur(c.signed, 2)}<br>Total à régler : <b>${eur(c.total, 2)}</b></div></div>
    <div class="field"><span>Ventilation</span><div class="readout">Provisions courantes : ${eur(c.courant, 2)}<br>Travaux : ${eur(c.travaux, 2)} · Fonds travaux : ${eur(c.fonds, 2)}</div></div></div>
  <div class="grid4">${field('Conclusion', p + '.conclusion', { options: [['', '—'], ['compris', 'Compris'], ['explication', 'Explication demandée'], ['analyse', 'Analyse complémentaire nécessaire']] })}${field('Question restante / personne sollicitée / date', p + '.question', { cls: 'span3' })}</div>
  ${a.conclusion === 'explication' ? `<button class="btn small" data-a="compose" data-tpl="syndic_appel">✉️ Demander l’explication au syndic</button>` : ''}</div>`;
}
const sumList = s => String(s || '').split(/[;+\n]/).map(x => num(x.replace(/\s/g, '').replace(',', '.'))).filter(x => x != null).reduce((a, b) => a + b, 0);
function annexesCard(d) {
  const A = d.annexes || {}, p = 'annexes.';
  const chk = (label, a, b, detail) => {
    if (num(a) == null || !b) return `<li class="muted">◻️ ${label} — à renseigner</li>`;
    const ok = Math.abs(num(a) - b) < 1;
    return `<li class="${ok ? 'okc' : 'late'}">${ok ? '✅' : '⚠️'} ${label} : ${eur(a)} ${ok ? '=' : '≠'} ${eur(b)} ${detail || ''}</li>`;
  };
  const ratio = num(A.creances) && num(A.budget) ? (A.creances / A.budget * 100).toFixed(2) : null;
  return `<section class="card"><h2>🧮 Contrôle express des annexes comptables</h2>
  <p class="small muted">Saisissez les totaux de vos annexes (listes séparées par « ; »). Les égalités vérifient la cohérence des totaux, pas la réalité des prestations ni la clé appliquée au lot.</p>
  <div class="grid4">${field('Copropriété / exercice / version', p + 'exercice', { cls: 'span2' })}${field('Comptes approuvés ?', p + 'approuve', { options: [['', '—'], ['oui', 'Oui (PV vérifié)'], ['non', 'Soumis à l’AG seulement']] })}
  ${field('Budget courant N (€)', p + 'budget', { type: 'number', r: true })}
  ${field('Annexe 2 — total charges courantes', p + 'a2c', { type: 'number', r: true })}${field('Annexe 3 — charges nettes par clé', p + 'a3', { ph: '56350; 12080; 34250', r: true })}
  ${field('Annexe 2 — total travaux clôturés', p + 'a2t', { type: 'number', r: true })}${field('Annexe 4 — coût final par opération', p + 'a4', { ph: '46000; 14500; 8000', r: true })}
  ${field('Annexe 1 — compte 12 (solde en attente travaux)', p + 'a1c12', { type: 'number', r: true })}${field('Annexe 5 — soldes E par opération', p + 'a5', { ph: '6000; 3000', r: true })}
  ${field('Annexe 1 — total actif', p + 'actif', { type: 'number', r: true })}${field('Annexe 1 — total passif', p + 'passif', { type: 'number', r: true })}
  ${field('Créances copropriétaires (€)', p + 'creances', { type: 'number', r: true })}${field('Dette fournisseurs (€)', p + 'fournisseurs', { type: 'number' })}</div>
  <ul class="checks">${chk('Charges courantes annexe 2 / annexe 3', A.a2c, sumList(A.a3))}${chk('Travaux clôturés annexe 2 / annexe 4', A.a2t, sumList(A.a4))}
  ${chk('Solde en attente annexe 1 / annexe 5', A.a1c12, sumList(A.a5))}${chk('Équilibre de l’état financier', A.actif, num(A.passif))}
  ${ratio ? `<li>ℹ️ Ratio de contexte créances / budget : <b>${ratio} %</b> — ce n’est pas un « taux d’impayés ».</li>` : ''}</ul>
  <p class="small">Écart constaté ? Vérifiez exercice, version et périmètre ; distinguez charges brutes, nettes, produits et soldes ; puis <button class="link" data-a="compose" data-tpl="syndic_annexe">demandez une explication écrite au syndic</button>.</p></section>`;
}

/* ----- Journal ----- */
function tabJournal(d) {
  return `<section class="card"><div class="row gap"><input class="grow" id="jnote" placeholder="Ajouter une note (appel, visite, info…)"><button class="btn primary" data-a="addNote">Ajouter</button></div>
  <ul class="journal">${d.journal.map(j => `<li class="${j.type}"><time>${fdatetime(j.t)}</time><span>${esc(j.txt)}</span></li>`).join('')}</ul></section>`;
}
