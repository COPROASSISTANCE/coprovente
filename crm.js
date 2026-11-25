/* =========================================================================
   CoproVente — suivi commercial : une seule saisie, un dossier qui évolue
   Contacts (vendeurs / acquéreurs) → Biens (dossiers) → Estimations,
   Mandats, Visites, Ventes. Écran d'accueil « À traiter ».
   ========================================================================= */

App.crm = { contacts: [], estimations: [], visites: [] };
App.flt = {};
let crmTimer;
function saveCrm(now) { clearTimeout(crmTimer); const go = () => Store.set('crm', App.crm); now ? go() : (crmTimer = setTimeout(go, 300)); }

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const ORIGINES = ['Pige / boîtage', 'Recommandation', 'Ancien client', 'Portail / site', 'Réseaux sociaux', 'Appel entrant', 'Panneau', 'Réseau pro', 'Autre'];
const CANAL_ECH = [['appel', '📞 Appel'], ['sms', '💬 SMS'], ['email', '✉️ E-mail'], ['rdv', '🤝 Rencontre'], ['autre', '• Autre']];
const ACTIONS_NEXT = [['appeler', 'Rappeler'], ['sms', 'Envoyer un SMS'], ['email', 'Envoyer un e-mail'], ['document', 'Envoyer un document'], ['estimation', 'Proposer une estimation'], ['rdv', 'Fixer un rendez-vous'], ['bilan', 'Faire le point'], ['autre', 'Autre']];
const ST_VEND = [['a_contacter', 'À contacter', 's-grey'], ['contact', 'Contact établi', 's-blue'], ['projet', 'Projet à suivre', 's-amber'], ['rdv', 'Rendez-vous fixé', 's-violet'], ['client', 'Client (estimation / mandat)', 's-green'], ['sans_suite', 'Sans suite', 's-grey']];
const ST_ACQ = [['actif', 'Recherche active', 's-green'], ['pause', 'En pause', 's-grey'], ['offre', 'Offre en cours', 's-amber'], ['achete', 'A acheté', 's-blue']];
const FINANCEMENT = [['', '—'], ['non_etudie', 'Non étudié'], ['simulation', 'Simulation faite'], ['accord', 'Accord de principe'], ['offre_pret', 'Offre de prêt'], ['comptant', 'Comptant']];
const RETOUR_ESTIM = [['', '—'], ['accord', 'D’accord sur le prix'], ['hesite', 'Hésite'], ['desaccord', 'En désaccord sur le prix'], ['reporte', 'Projet reporté']];
const ISSUE_ESTIM = [['', 'Pas encore de décision'], ['mandat', 'Mandat obtenu'], ['concurrent', 'Concurrent choisi'], ['abandon', 'Vente abandonnée'], ['suivi', 'Suivi à poursuivre']];
const ST_VISITE = [['prevue', 'Prévue', 's-blue'], ['confirmee', 'Confirmée', 's-violet'], ['realisee', 'Réalisée', 's-green'], ['annulee', 'Annulée', 's-grey'], ['absence', 'Absence', 's-amber']];
const AIME = ['Luminosité', 'Emplacement', 'Agencement', 'Calme', 'Vue', 'Extérieur', 'État général', 'Prestations', 'Copropriété bien tenue', 'Rangements', 'Cave / parking'];
const OBJECTIONS = ['Prix', 'Travaux à prévoir', 'Bruit', 'Agencement', 'Étage / ascenseur', 'Charges de copropriété', 'Surface', 'Stationnement', 'Exposition', 'DPE', 'Travaux de copropriété'];
const SUITES = [['', '—'], ['reflexion', 'Réflexion'], ['rappel', 'À rappeler'], ['2e', 'Seconde visite'], ['documents', 'Documents à transmettre'], ['offre', 'Offre annoncée'], ['non', 'Pas intéressé']];
const ST_MANDAT = [['preparation', 'En préparation', 's-grey'], ['a_signer', 'À signer', 's-amber'], ['actif', 'Actif', 's-green'], ['termine', 'Terminé', 's-blue'], ['resilie', 'Résilié', 's-grey']];
const badge = (list, id) => { const s = list.find(x => x[0] === id) || list[0]; return `<span class="sbadge ${s[2] || 's-grey'}">${s[1]}</span>`; };
const optList = (list, v) => list.map(([val, lab]) => `<option value="${esc(val)}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${esc(lab)}</option>`).join('');

/* ---------- Champs liés à une fiche (enregistrement automatique) ---------- */
function ef(label, key, id, path, o = {}) {
  const ent = App.crm[key].find(x => x.id === id) || {}, v = getPath(ent, path) ?? '';
  const a = `data-eb="${key}|${id}|${path}" ${o.r ? 'data-r' : ''}`;
  let input;
  if (o.options) input = `<select ${a}>${optList(o.options.map(x => Array.isArray(x) ? x : [x, x]), v)}</select>`;
  else if (o.area) input = `<textarea ${a} rows="${o.rows || 3}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`;
  else if (o.check) return `<label class="check ${o.cls || ''}"><input type="checkbox" ${a} ${v ? 'checked' : ''}> <span>${label}</span></label>`;
  else input = `<input type="${o.type || 'text'}" ${a} value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${o.type === 'tel' ? 'inputmode="tel"' : ''}>`;
  return `<label class="field ${o.cls || ''}"><span>${label}</span>${input}${o.help ? `<small>${o.help}</small>` : ''}</label>`;
}
function onEntityBind(e) {
  const el = e.target; if (!el.dataset || el.dataset.eb === undefined) return;
  const [key, id, path] = el.dataset.eb.split('|'), ent = App.crm[key].find(x => x.id === id); if (!ent) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'number') v = el.value === '' ? '' : Number(el.value);
  setPath(ent, path, v); ent.updatedAt = Date.now();
  if (key === 'estimations' && path === 'restitRealisee' && v && !ent.relance) ent.relance = addDays(v, +ent.relanceJours || 7);
  if (key === 'estimations' && path === 'issue' && v === 'mandat') { const c = contactById(ent.contactId); if (c) c.vend.statut = 'client'; }
  saveCrm();
  if (key === 'contacts') syncContact(ent);
  if (e.type === 'change' && el.hasAttribute('data-r')) rerender();
}
document.addEventListener('input', onEntityBind);
document.addEventListener('change', onEntityBind);

/* ---------- Contacts ---------- */
function newContact(seed = {}) {
  return Object.assign({ id: uid(), createdAt: Date.now(), civ: '', prenom: '', nom: '', tel: '', email: '', adresse: '', secteur: '', origine: '', canal: 'tel', opposition: false, notes: '',
    roles: { vendeur: true, acquereur: false },
    vend: { statut: 'a_contacter', motif: '', echeance: '', prixSouhaite: '', maturite: '', bienAdresse: '', bienVille: '', bienType: 'Appartement' },
    acq: { statut: 'actif', budget: '', apport: '', secteurs: '', criteres: '', calendrier: '', financement: '' },
    next: { date: today(), action: 'appeler', note: '' }, echanges: [] }, seed);
}
const cName = c => c ? ([c.civ, c.prenom, c.nom].filter(Boolean).join(' ') || c.tel || c.email || 'Contact sans nom') : '';
const contactById = id => App.crm.contacts.find(c => c.id === id);
const personFromContact = c => ({ ...newPerson(), civ: c.civ, prenom: c.prenom, nom: c.nom, email: c.email, tel: c.tel, adresse: c.adresse, contactId: c.id });
function syncContact(c) {
  App.dossiers.forEach(d => { let ch = false;
    ['vendeurs', 'acquereurs'].forEach(k => d[k].forEach(p => { if (p.contactId === c.id) { Object.assign(p, { civ: c.civ, prenom: c.prenom, nom: c.nom, email: c.email, tel: c.tel, adresse: c.adresse }); ch = true; } }));
    if (ch) saveDossier(d); });
}
const biensOf = c => App.dossiers.filter(d => d.vendeurs.some(p => p.contactId === c.id) || d.acquereurs.some(p => p.contactId === c.id));
const ownersOf = d => d.vendeurs.map(p => p.contactId && contactById(p.contactId)).filter(Boolean);
const telHref = t => 'tel:' + String(t || '').replace(/[^\d+]/g, '');
const smsHref = (t, body) => 'sms:' + String(t || '').replace(/[^\d+]/g, '') + '?&body=' + encodeURIComponent(body || '');
function lastEchange(c) { return (c.echanges || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0]; }
function messageRelance(c) {
  const a = App.settings.agent, me = a.prenom ? a.prenom + (a.nom ? ' ' + a.nom : '') : '[votre nom]', civ = c.nom ? (c.civ === 'Mme' ? 'Madame ' : c.civ === 'M.' ? 'Monsieur ' : '') + c.nom : '';
  const bonjour = `Bonjour ${civ || c.prenom || ''}`.trim() + ', ';
  const act = (c.next || {}).action;
  if (c.roles.acquereur && !c.roles.vendeur) return `${bonjour}c’est ${me}. Je reviens vers vous au sujet de votre recherche${c.acq.secteurs ? ' sur ' + c.acq.secteurs : ''}. Avez-vous un moment pour en parler ? Bonne journée.`;
  if (act === 'estimation') return `${bonjour}c’est ${me}. Comme évoqué, je vous propose un rendez-vous pour estimer votre bien${c.vend.bienAdresse ? ' ' + c.vend.bienAdresse : ''}. Quelles sont vos disponibilités cette semaine ?`;
  if (act === 'document') return `${bonjour}c’est ${me}. Je vous envoie comme promis le document évoqué ensemble. N’hésitez pas si vous avez des questions.`;
  if (act === 'rdv') return `${bonjour}c’est ${me}. Je vous propose de nous voir pour faire le point sur votre projet. Quel créneau vous conviendrait ?`;
  return `${bonjour}c’est ${me}. Je me permets de revenir vers vous au sujet de votre projet${c.vend.bienAdresse ? ' concernant ' + c.vend.bienAdresse : ''}. Avez-vous un moment pour en parler ? Bonne journée.`;
}
function contactActions(c, compact) {
  if (c.opposition) return `<span class="sbadge s-amber" title="Opposition à la prospection">⛔ Ne pas solliciter</span>`;
  const msg = messageRelance(c);
  return `<div class="cact ${compact ? 'compact' : ''}">${c.tel ? `<a class="btn small call" href="${telHref(c.tel)}" data-log="appel" data-cid="${c.id}">📞${compact ? '' : ' Appeler'}</a><a class="btn small" href="${smsHref(c.tel, msg)}" data-log="sms" data-cid="${c.id}">💬${compact ? '' : ' SMS'}</a>` : ''}
    ${c.email ? `<button class="btn small" data-a="copyMail" data-cid="${c.id}">✉️${compact ? '' : ' E-mail'}</button>` : ''}
    <button class="btn small primary" data-a="echangeQuick" data-cid="${c.id}">✔${compact ? '' : ' Fait'}</button></div>`;
}

/* ---------- Estimations ---------- */
function newEstimation(seed = {}) {
  return Object.assign({ id: uid(), createdAt: Date.now(), contactId: '', dossierId: '', dateDemande: today(), dateVisite: '', visiteFaite: false, restitPrevue: '', restitRealisee: '',
    prixBas: '', prixHaut: '', prixReco: '', prixAttendu: '', retour: '', relanceJours: App.settings.delais.relanceEstim || 7, relance: '', issue: '', motifPerte: '', notes: '',
    rendu: { contexte: '', pointsForts: '', pointsAttention: '', environnement: '', etat: '', comparables: [], analyse: '', strategie: '', delai: '', honoraires: '' } }, seed);
}
function estStage(e) {
  if (e.issue && e.issue !== 'suivi') return 'close';
  if (e.restitRealisee) return 'restituee';
  if (e.visiteFaite || (e.dateVisite && daysUntil(e.dateVisite) < 0)) return 'rapport';
  return 'rdv';
}
const EST_STAGES = [['rdv', 'Rendez-vous à faire'], ['rapport', 'Rapport à préparer / restituer'], ['restituee', 'Restituées sans décision'], ['close', 'Clôturées'], ['toutes', 'Toutes']];
const estBien = e => App.dossiers.find(d => d.id === e.dossierId);
const estTitle = e => { const d = estBien(e); return d ? dossierTitle(d) : 'Bien à préciser'; };

/* ---------- Visites ---------- */
function newVisite(seed = {}) {
  const t = new Date(); t.setMinutes(0, 0, 0); t.setHours(t.getHours() + 1); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  return Object.assign({ id: uid(), createdAt: Date.now(), dossierId: '', acquereurId: '', quand: t.toISOString().slice(0, 16), statut: 'prevue', consignes: '',
    interet: '', aime: [], objections: [], prix: '', suite: '', rappel: '', commentaire: '', notesInternes: '', crVendeur: '', crVisiteur: '', crFait: false }, seed);
}
const visitePassee = v => v.quand && new Date(v.quand) < new Date();
const crManquant = v => !['annulee', 'absence'].includes(v.statut) && visitePassee(v) && !v.crFait;
const isToday = iso => iso && iso.slice(0, 10) === today();

/* ---------- Biens : activité et alertes ---------- */
const prixActuel = d => num(d.com.prixActuel) || num(d.offre.prix) || num(d.mandat.prix) || 0;
const visitesOf = d => App.crm.visites.filter(v => v.dossierId === d.id && v.statut !== 'annulee');
function lastVisitDate(d) { return visitesOf(d).filter(visitePassee).map(v => v.quand.slice(0, 10)).sort().pop() || ''; }
function bienAlertes(d) {
  if (!['commercialisation', 'offre'].includes(d.phase)) return [];
  const out = [], D = App.settings.delais, ref = lastVisitDate(d) || d.com.dateEntree || d.mandat.date;
  if (ref && -daysUntil(ref) >= D.inactivite) out.push(`Aucune visite depuis ${-daysUntil(ref)} jours`);
  const bil = d.com.dernierBilan || d.com.dateEntree;
  if (!bil || -daysUntil(bil) >= D.bilan) out.push(bil ? `Pas de compte rendu au vendeur depuis ${-daysUntil(bil)} jours` : 'Aucun compte rendu au vendeur');
  return out;
}
function mandatEcheances(d) {
  const out = [];
  if (!['actif', 'a_signer'].includes(d.mandat.statut) || ['acte', 'abandon'].includes(d.phase)) return out;
  if (d.mandat.date && d.mandat.duree) out.push({ date: addMonths(d.mandat.date, d.mandat.duree), label: 'Fin de période irrévocable / échéance du mandat' });
  (d.mandat.echeances || []).forEach(x => x.date && out.push({ date: x.date, label: x.label || 'Échéance' }));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
/* ---------- Ventes en cours ---------- */
function venteEnCours(d) { return d.phase === 'compromis' || (d.phase === 'offre' && (d.vente.offreAcceptee || (d.tasks['offre.acceptee'] || {}).done)); }
function venteEtapes(d) {
  return [['Avant-contrat', d.dates.compromis, d.vente.compromisRealise, 'compromisRealise', 'compromis'], ['Financement obtenu', d.dates.pret, d.vente.pretRealise, 'pretRealise', 'pret'], ['Acte authentique', d.dates.acte, d.vente.acteRealise, 'acteRealise', 'acte']];
}
function venteSituation(d) {
  const et = venteEtapes(d), next = et.find(x => !x[2]);
  const missing = PIECES.filter(p => ['D', 'P'].includes((d.pieces[p.id] || {}).s)).map(p => ({ p, qui: (d.pieces[p.id] || {}).qui }));
  let bloc = d.vente.blocage || '';
  if (!bloc && next && next[1] && daysUntil(next[1]) < 0) bloc = `${next[0]} prévu le ${fdate(next[1])} non réalisé`;
  if (!bloc && missing.length) bloc = `Pièce attendue : ${missing[0].p.label}${missing[0].qui ? ' (' + missing[0].qui + ')' : ''}${missing.length > 1 ? ` + ${missing.length - 1} autre(s)` : ''}`;
  return { next, bloc, missing };
}

/* =========================================================================
   ACCUEIL — « À traiter »
   ========================================================================= */
function relancesDues() {
  const c = App.crm.contacts.filter(x => x.next && x.next.date && daysUntil(x.next.date) <= 0 && !(x.roles.vendeur && !x.roles.acquereur && ['sans_suite'].includes(x.vend.statut)));
  const e = App.crm.estimations.filter(x => x.relance && daysUntil(x.relance) <= 0 && estStage(x) !== 'close');
  return { c, e, n: c.length + e.length };
}
function viewHome() {
  const a = App.settings.agent, C = App.crm, R = relancesDues();
  const estA = C.estimations.filter(e => estStage(e) === 'rapport'), estR = C.estimations.filter(e => estStage(e) === 'restituee');
  const inact = App.dossiers.filter(d => bienAlertes(d).length);
  const mEch = App.dossiers.flatMap(d => mandatEcheances(d).map(x => ({ ...x, d }))).filter(x => daysUntil(x.date) <= (App.settings.delais.rappelMandat || 30));
  const visAuj = C.visites.filter(v => isToday(v.quand) && !['annulee'].includes(v.statut)), visCr = C.visites.filter(crManquant);
  const ventesBloc = App.dossiers.filter(venteEnCours).filter(d => venteSituation(d).bloc);
  const row = (icon, titre, n, detail, href, okTxt) => `<a class="todo ${n ? '' : 'ok'}" href="${href}"><span class="ticon">${icon}</span><span class="ttxt"><b>${titre}</b><small>${n ? detail : okTxt}</small></span><span class="tnum">${n || '✓'}</span></a>`;
  const empty = !App.dossiers.length && !C.contacts.length;
  const agenda = visAuj.sort((x, y) => x.quand.localeCompare(y.quand)).map(v => { const d = App.dossiers.find(x => x.id === v.dossierId), q = contactById(v.acquereurId);
    return `<li><a href="#/v/${v.id}"><span class="when">${v.quand.slice(11, 16)}</span><span><b>Visite ${esc(d ? dossierTitle(d) : '')}</b><small>${esc(cName(q) || 'Visiteur à préciser')} · ${badge(ST_VISITE, v.statut)}</small></span></a></li>`; }).join('');
  return `<div class="home-head"><div><h1>${new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'}${a.prenom ? ' ' + esc(a.prenom) : ''}</h1><p class="muted">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
    <button class="btn primary add-btn" data-a="quickAdd">＋ Ajouter</button></div>
  ${empty ? `<div class="banner">Bienvenue ! Ajoutez un premier contact vendeur (＋ Ajouter), complétez <a href="#/profil">votre profil</a>, ou <button class="link" data-a="demoAll">chargez des données d’exemple</button>.</div>` : ''}
  <section class="card flush"><h2 class="pad">À traiter</h2><div class="todos">
    ${row('📞', 'Relances du jour', R.n, `${R.c.length} contact(s) à rappeler${R.e.length ? ` · ${R.e.length} estimation(s) à relancer` : ''}`, '#/relances', 'Aucune relance en attente')}
    ${row('📐', 'Estimations en attente', estA.length + estR.length, `${estA.length} rapport(s) à restituer${estR.length ? ` · ${estR.length} restituée(s) sans décision` : ''}`, estA.length ? '#/estimations/rapport' : '#/estimations/restituee', 'Aucune estimation en attente')}
    ${row('🏷️', 'Commercialisation', inact.length, inact.slice(0, 2).map(d => `${esc(dossierTitle(d))} : ${bienAlertes(d)[0].toLowerCase()}`).join(' · '), '#/biens/alertes', 'Tous les biens sont actifs')}
    ${row('📝', 'Mandats', mEch.length, `${mEch.length} échéance(s) à examiner${mEch[0] ? ` · prochaine le ${fdate(mEch.sort((x, y) => x.date.localeCompare(y.date))[0].date)}` : ''}`, '#/mandats', 'Aucune échéance proche')}
    ${row('🚪', 'Visites', visAuj.length + visCr.length, `${visAuj.length} visite(s) aujourd’hui${visCr.length ? ` · ${visCr.length} compte(s) rendu(s) manquant(s)` : ''}`, visCr.length ? '#/visites/cr' : '#/visites/aujourdhui', 'Pas de visite aujourd’hui')}
    ${row('🤝', 'Ventes', ventesBloc.length, ventesBloc.slice(0, 2).map(d => `${esc(dossierTitle(d))} : ${esc(venteSituation(d).bloc)}`).join(' · '), '#/ventes', 'Aucun dossier bloqué')}
  </div></section>
  ${agenda ? `<section class="card"><h2>Aujourd’hui</h2><ul class="ech">${agenda}</ul></section>` : ''}
  ${R.c.length ? `<section class="card"><div class="row between"><h2>À rappeler</h2><a href="#/relances" class="small">Tout voir →</a></div>${R.c.slice(0, 4).map(relanceCard).join('')}</section>` : ''}`;
}
function viewRelances() {
  const R = relancesDues(), next7 = App.crm.contacts.filter(c => c.next && c.next.date && daysUntil(c.next.date) > 0 && daysUntil(c.next.date) <= 7);
  return `<div class="page-head"><div><h1>📞 À relancer aujourd’hui</h1><p class="muted">${R.n} relance(s) · appel ou SMS en un geste, puis « ✔ Fait » pour noter le résultat et la prochaine action.</p></div></div>
  ${R.c.length ? R.c.sort((a, b) => a.next.date.localeCompare(b.next.date)).map(relanceCard).join('') : '<div class="empty"><p>Aucun contact à relancer aujourd’hui. 👌</p></div>'}
  ${R.e.length ? `<h2 class="section-title">Estimations à relancer</h2>${R.e.map(e => { const c = contactById(e.contactId); return `<div class="rcard"><a href="#/e/${e.id}" class="rmain"><b>${esc(estTitle(e))}</b><small>${esc(cName(c))} · restituée le ${fdate(e.restitRealisee)} · ${esc((RETOUR_ESTIM.find(x => x[0] === e.retour) || ['', 'retour non noté'])[1])}</small></a>${c ? contactActions(c, true) : ''}</div>`; }).join('')}` : ''}
  ${next7.length ? `<h2 class="section-title">Dans les 7 prochains jours</h2>${next7.sort((a, b) => a.next.date.localeCompare(b.next.date)).map(c => `<a class="rcard light" href="#/c/${c.id}"><span class="rmain"><b>${esc(cName(c))}</b><small>${fdate(c.next.date)} · ${esc((ACTIONS_NEXT.find(x => x[0] === c.next.action) || ['', ''])[1])}</small></span></a>`).join('')}` : ''}`;
}
function relanceCard(c) {
  const le = lastEchange(c), n = daysUntil(c.next.date);
  return `<div class="rcard"><a class="rmain" href="#/c/${c.id}"><b>${esc(cName(c))}</b>
    <small>${esc((ACTIONS_NEXT.find(x => x[0] === c.next.action) || ['', 'Relancer'])[1])}${c.next.note ? ' — ' + esc(c.next.note) : ''} · <span class="${n < 0 ? 'late' : 'soon'}">${n < 0 ? 'en retard de ' + -n + ' j' : 'aujourd’hui'}</span></small>
    <small class="muted">${le ? `Dernier échange ${fdate(le.date)} : ${esc(le.resume || le.resultat || '')}` : 'Aucun échange noté'}</small></a>${contactActions(c, true)}</div>`;
}

/* =========================================================================
   CONTACTS
   ========================================================================= */
function viewContacts(tab) {
  tab = tab || App.flt.contactsTab || 'vendeurs';
  const f = App.flt.contacts || { s: 'tous', q: '' }, q = normalize(f.q);
  let list = App.crm.contacts.filter(c => tab === 'tous' || (tab === 'vendeurs' ? c.roles.vendeur : c.roles.acquereur));
  const stList = tab === 'acquereurs' ? ST_ACQ : ST_VEND, stOf = c => tab === 'acquereurs' ? c.acq.statut : c.vend.statut;
  const counts = Object.fromEntries(stList.map(s => [s[0], list.filter(c => stOf(c) === s[0]).length]));
  if (f.s !== 'tous' && tab !== 'tous') list = list.filter(c => stOf(c) === f.s);
  if (q) list = list.filter(c => normalize([cName(c), c.tel, c.email, c.secteur, c.vend.bienAdresse, c.acq.secteurs, c.notes].join(' ')).includes(q));
  list.sort((a, b) => (a.next.date || '9').localeCompare(b.next.date || '9'));
  return `<div class="page-head"><div><h1>👥 Contacts</h1><p class="muted">Un contact peut être vendeur et acquéreur ; ses biens, estimations et visites restent rattachés.</p></div>
    <button class="btn primary" data-a="contactNew" data-role="${tab === 'acquereurs' ? 'acquereur' : 'vendeur'}">＋ ${tab === 'acquereurs' ? 'Acquéreur' : 'Prospect vendeur'}</button></div>
  <div class="seg big">${[['vendeurs', '🏠 Vendeurs / prospection'], ['acquereurs', '🔑 Acquéreurs'], ['tous', 'Tous']].map(([id, l]) => `<a class="${tab === id ? 'on' : ''}" href="#/contacts/${id}">${l}</a>`).join('')}</div>
  <div class="row between wrap gap filters">${tab !== 'tous' ? `<div class="seg scroll">${[['tous', 'Tous']].concat(stList).map(([id, l]) => `<button class="${f.s === id ? 'on' : ''}" data-a="contactFilter" data-s="${id}">${l}${id !== 'tous' ? ` <small>${counts[id] || 0}</small>` : ''}</button>`).join('')}</div>` : '<span></span>'}
    <input class="search" data-t="q_contacts" value="${esc(f.q)}" placeholder="Nom, téléphone, secteur…"></div>
  ${list.length ? `<div class="clist">${list.map(c => contactRow(c, tab)).join('')}</div>` : `<div class="empty"><p>Aucun contact ici.</p></div>`}`;
}
function contactRow(c, tab) {
  const n = c.next.date ? daysUntil(c.next.date) : null;
  return `<div class="crow"><a class="rmain" href="#/c/${c.id}"><b>${esc(cName(c))}</b>${c.opposition ? ' <span class="sbadge s-amber">⛔</span>' : ''}
    <small>${tab === 'acquereurs' ? esc([c.acq.budget ? 'budget ' + eur(c.acq.budget) : '', c.acq.secteurs, (FINANCEMENT.find(x => x[0] === c.acq.financement) || ['', ''])[1]].filter(Boolean).join(' · ') || 'Critères à préciser')
      : esc([c.vend.bienAdresse || c.secteur, c.origine].filter(Boolean).join(' · ') || 'Bien à préciser')}</small>
    <small>${n == null ? '<span class="muted">Pas de prochaine action</span>' : `<span class="${n < 0 ? 'late' : n === 0 ? 'soon' : 'muted'}">${esc((ACTIONS_NEXT.find(x => x[0] === c.next.action) || ['', 'Action'])[1])} · ${n === 0 ? 'aujourd’hui' : n < 0 ? 'retard ' + -n + ' j' : fdate(c.next.date)}</span>`}</small></a>
    <div class="cside">${tab === 'acquereurs' ? badge(ST_ACQ, c.acq.statut) : badge(ST_VEND, c.vend.statut)}${contactActions(c, true)}</div></div>`;
}
function viewContact(id) {
  const c = contactById(id); if (!c) return '<p>Contact introuvable.</p>';
  const K = 'contacts', biens = biensOf(c), ests = App.crm.estimations.filter(e => e.contactId === c.id), vis = App.crm.visites.filter(v => v.acquereurId === c.id);
  const ech = (c.echanges || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  return `<a href="#/contacts" class="muted small">← Contacts</a>
  <div class="page-head"><div><h1>${esc(cName(c))}</h1><p class="muted">${[c.roles.vendeur ? 'Vendeur' : '', c.roles.acquereur ? 'Acquéreur' : ''].filter(Boolean).join(' · ')}${c.origine ? ' · ' + esc(c.origine) : ''}</p></div>${contactActions(c)}</div>
  <section class="card next"><h2>Prochaine action</h2><div class="grid4">${ef('Action', K, id, 'next.action', { options: ACTIONS_NEXT })}${ef('Date', K, id, 'next.date', { type: 'date', r: true })}${ef('Précision', K, id, 'next.note', { cls: 'span2', ph: 'ex. rappeler après ses vacances' })}</div>
    <div class="chips">${[['+1 j', 1], ['+3 j', 3], ['+1 sem.', 7], ['+2 sem.', 14], ['+1 mois', 30]].map(([l, n]) => `<button class="chip" data-a="nextIn" data-cid="${id}" data-n="${n}">${l}</button>`).join('')}</div></section>
  <section class="card"><div class="row between"><h2>Historique des échanges</h2><button class="btn small primary" data-a="echangeQuick" data-cid="${id}">＋ Noter un échange</button></div>
    ${ech.length ? `<ul class="timeline-mini">${ech.map(x => `<li><time>${fdate(x.date)}</time><span><b>${(CANAL_ECH.find(k => k[0] === x.canal) || ['', ''])[1]}</b> ${esc(x.resume || '')}${x.resultat ? `<small>Résultat : ${esc(x.resultat)}</small>` : ''}</span></li>`).join('')}</ul>` : '<p class="muted small">Aucun échange noté.</p>'}</section>
  <section class="card"><h2>Coordonnées</h2><div class="grid4">
    ${ef('Civilité', K, id, 'civ', { options: ['', 'M.', 'Mme', 'M. et Mme', 'Société'] })}${ef('Prénom', K, id, 'prenom')}${ef('Nom', K, id, 'nom', { r: true })}${ef('Téléphone', K, id, 'tel', { type: 'tel', r: true })}
    ${ef('E-mail', K, id, 'email', { type: 'email', r: true })}${ef('Adresse', K, id, 'adresse', { cls: 'span2' })}${ef('Secteur', K, id, 'secteur')}
    ${ef('Origine du contact', K, id, 'origine', { options: [''].concat(ORIGINES) })}${ef('Canal préféré', K, id, 'canal', { options: [['tel', 'Téléphone'], ['sms', 'SMS'], ['email', 'E-mail']] })}
    ${ef('Vendeur', K, id, 'roles.vendeur', { check: true, r: true })}${ef('Acquéreur', K, id, 'roles.acquereur', { check: true, r: true })}
    ${ef('⛔ Opposition à la prospection (ne pas solliciter)', K, id, 'opposition', { check: true, r: true, cls: 'span2' })}
    ${ef('Notes', K, id, 'notes', { area: true, cls: 'span4' })}</div></section>
  ${c.roles.vendeur ? `<section class="card"><h2>🏠 Projet vendeur</h2><div class="grid4">
    ${ef('Statut', K, id, 'vend.statut', { options: ST_VEND, r: true })}${ef('Maturité', K, id, 'vend.maturite', { options: [['', '—'], ['froid', '❄️ Froid'], ['tiede', '🌤️ Tiède'], ['chaud', '🔥 Chaud']] })}
    ${ef('Échéance envisagée', K, id, 'vend.echeance', { ph: 'ex. printemps 2027' })}${ef('Prix souhaité (€)', K, id, 'vend.prixSouhaite', { type: 'number' })}
    ${ef('Motif de vente', K, id, 'vend.motif', { cls: 'span2', ph: 'mutation, agrandissement, succession…' })}${ef('Adresse du bien', K, id, 'vend.bienAdresse')}${ef('Ville', K, id, 'vend.bienVille')}</div>
    <div class="row gap wrap"><button class="btn primary" data-a="estimFromContact" data-cid="${id}">📐 Créer une estimation</button><button class="btn" data-a="bienFromContact" data-cid="${id}">🏠 Créer le bien / mandat</button></div></section>` : ''}
  ${c.roles.acquereur ? `<section class="card"><h2>🔑 Recherche acquéreur</h2><div class="grid4">
    ${ef('Statut', K, id, 'acq.statut', { options: ST_ACQ })}${ef('Budget max (€)', K, id, 'acq.budget', { type: 'number' })}${ef('Apport (€)', K, id, 'acq.apport', { type: 'number' })}
    ${ef('Financement', K, id, 'acq.financement', { options: FINANCEMENT })}${ef('Secteurs', K, id, 'acq.secteurs', { cls: 'span2' })}${ef('Calendrier', K, id, 'acq.calendrier', { ph: 'ex. avant l’été' })}
    ${ef('Critères', K, id, 'acq.criteres', { area: true, cls: 'span4', ph: 'pièces, étage, extérieur, parking…' })}</div>
    <button class="btn" data-a="visiteNew" data-acq="${id}">🚪 Planifier une visite</button></section>` : ''}
  <section class="card"><h2>Dossiers liés</h2>
    ${biens.length ? `<ul class="mini-list">${biens.map(d => `<li><a href="#/d/${d.id}/parcours"><b>${esc(dossierTitle(d))}</b><small>${phaseDef(d.phase).label} · ${eur(prixActuel(d))}</small></a></li>`).join('')}</ul>` : ''}
    ${ests.length ? `<ul class="mini-list">${ests.map(e => `<li><a href="#/e/${e.id}"><b>📐 Estimation — ${esc(estTitle(e))}</b><small>${esc((EST_STAGES.find(s => s[0] === estStage(e)) || ['', ''])[1])}</small></a></li>`).join('')}</ul>` : ''}
    ${vis.length ? `<ul class="mini-list">${vis.map(v => `<li><a href="#/v/${v.id}"><b>🚪 Visite ${fdatetime(v.quand)}</b><small>${esc((App.dossiers.find(d => d.id === v.dossierId) && dossierTitle(App.dossiers.find(d => d.id === v.dossierId))) || '')}</small></a>${badge(ST_VISITE, v.statut)}</li>`).join('')}</ul>` : ''}
    ${!biens.length && !ests.length && !vis.length ? '<p class="muted small">Aucun dossier lié pour l’instant.</p>' : ''}</section>
  <p class="right"><button class="btn danger small" data-a="contactDel" data-cid="${id}">Supprimer ce contact</button></p>`;
}
function openEchange(cid) {
  const c = contactById(cid);
  openModal('Noter un échange — ' + cName(c), `<div class="grid4">
    <label class="field span2"><span>Canal</span><div class="chips" id="x_canal">${CANAL_ECH.map(([v, l], i) => `<button class="chip ${i === (c.canal === 'sms' ? 1 : c.canal === 'email' ? 2 : 0) ? 'on' : ''}" data-a="chipOne" data-v="${v}">${l}</button>`).join('')}</div></label>
    <label class="field span2"><span>Date</span><input type="date" id="x_date" value="${today()}"></label>
    <label class="field span4"><span>Résumé</span><textarea id="x_resume" rows="3" placeholder="Ce qui s’est dit…"></textarea></label>
    <label class="field span4"><span>Résultat</span><div class="chips" id="x_res">${['Joint', 'Messagerie', 'Pas de réponse', 'Rendez-vous fixé', 'Pas vendeur pour l’instant', 'Intéressé', 'Pas intéressé'].map(r => `<button class="chip" data-a="chipOne" data-v="${r}">${r}</button>`).join('')}</div></label>
    <label class="field span2"><span>Prochaine action</span><select id="x_next">${optList(ACTIONS_NEXT, c.next.action)}</select></label>
    <label class="field span2"><span>Le</span><input type="date" id="x_nextd" value="${addDays(today(), 7)}"></label>
    <div class="chips span4">${[1, 3, 7, 14, 30].map(n => `<button class="chip" data-a="setDateIn" data-target="x_nextd" data-n="${n}">+${n} j</button>`).join('')}<button class="chip" data-a="setDateIn" data-target="x_nextd" data-n="">Aucune</button></div></div>
    <div class="row modal-actions"><button class="btn primary" data-a="echangeSave" data-cid="${cid}">Enregistrer</button></div>`, { wide: true });
}

/* =========================================================================
   ESTIMATIONS
   ========================================================================= */
function viewEstimations(stage) {
  stage = stage || 'rapport';
  const all = App.crm.estimations, list = all.filter(e => stage === 'toutes' || estStage(e) === stage).sort((a, b) => (b.dateDemande || '').localeCompare(a.dateDemande || ''));
  return `<div class="page-head"><div><h1>📐 Estimations</h1><p class="muted">Rendez-vous, rapport, restitution : trois étapes suivies séparément.</p></div><button class="btn primary" data-a="estimNew">＋ Nouvelle estimation</button></div>
  <div class="seg scroll filters">${EST_STAGES.map(([id, l]) => `<a class="${stage === id ? 'on' : ''}" href="#/estimations/${id}">${l} <small>${id === 'toutes' ? all.length : all.filter(e => estStage(e) === id).length}</small></a>`).join('')}</div>
  ${list.length ? `<div class="clist">${list.map(e => { const c = contactById(e.contactId), le = c && lastEchange(c);
    return `<div class="crow"><a class="rmain" href="#/e/${e.id}"><b>${esc(estTitle(e))}</b><small>${esc(cName(c) || 'Propriétaire à préciser')}${num(e.prixReco) ? ' · ' + eur(e.prixReco) : ''}</small>
      <small class="muted">${stage === 'restituee' ? `Restituée le ${fdate(e.restitRealisee)} · dernier échange ${le ? fdate(le.date) : '—'} · relance ${e.relance ? fdate(e.relance) : '—'}` : `Demande ${fdate(e.dateDemande)} · visite ${fdate(e.dateVisite)} · restitution prévue ${fdate(e.restitPrevue)}`}</small></a>
      <div class="cside">${e.retour ? `<span class="sbadge s-amber">${esc(RETOUR_ESTIM.find(x => x[0] === e.retour)[1])}</span>` : ''}${c ? contactActions(c, true) : ''}</div></div>`; }).join('')}</div>`
    : `<div class="empty"><p>Aucune estimation dans cette étape.</p></div>`}`;
}
function viewEstimation(id) {
  const e = App.crm.estimations.find(x => x.id === id); if (!e) return '<p>Estimation introuvable.</p>';
  const K = 'estimations', c = contactById(e.contactId), d = estBien(e), st = estStage(e);
  const photos = App.allFiles ? App.allFiles.filter(f => f.dossierId === e.dossierId && f.pieceId === 'photos') : [];
  return `<a href="#/estimations" class="muted small">← Estimations</a>
  <div class="page-head"><div><h1>📐 ${esc(estTitle(e))}</h1><p class="muted">${esc(cName(c) || 'Propriétaire à préciser')} · ${esc((EST_STAGES.find(s => s[0] === st) || ['', ''])[1])}</p></div>${c ? contactActions(c) : ''}</div>
  <div class="steps4">${[['Demande', e.dateDemande, true], ['Visite', e.dateVisite, e.visiteFaite], ['Restitution', e.restitPrevue, !!e.restitRealisee], ['Décision', '', !!e.issue]].map(([l, dt, ok], i) => `<div class="s4 ${ok ? 'ok' : ''}"><i>${ok ? '✓' : i + 1}</i><b>${l}</b><small>${dt ? fdate(dt) : ''}</small></div>`).join('')}</div>
  <section class="card"><h2>Calendrier</h2><div class="grid4">
    ${ef('Date de la demande', K, id, 'dateDemande', { type: 'date', r: true })}${ef('Rendez-vous sur place', K, id, 'dateVisite', { type: 'date', r: true })}${ef('Visite réalisée', K, id, 'visiteFaite', { check: true, r: true })}
    ${ef('Restitution prévue', K, id, 'restitPrevue', { type: 'date', r: true })}${ef('Restitution réalisée le', K, id, 'restitRealisee', { type: 'date', r: true, help: 'Programme une relance automatique' })}
    ${ef('Relancer après (jours)', K, id, 'relanceJours', { type: 'number', r: true })}${ef('Prochaine relance', K, id, 'relance', { type: 'date', r: true })}</div></section>
  <section class="card"><h2>Bien & propriétaire</h2>
    ${d ? `<p><a href="#/d/${d.id}/fiche"><b>${esc(dossierTitle(d))}</b></a> — ${esc([d.bien.type, d.bien.surface ? d.bien.surface + ' m²' : '', d.bien.pieces ? d.bien.pieces + ' p.' : '', d.bien.etage ? 'étage ' + d.bien.etage : ''].filter(Boolean).join(' · '))}<br><small class="muted">Caractéristiques, lots, copropriété et DPE se complètent dans la fiche du bien : elles alimentent le rendu.</small></p>
      <div class="row gap wrap"><a class="btn small" href="#/d/${d.id}/fiche">Compléter la fiche du bien</a><a class="btn small" href="#/d/${d.id}/pieces#p_photos">📷 Photos (${photos.length})</a><a class="btn small" href="#/d/${d.id}/pieces#p_rapport_estim">📄 Rapports déposés</a></div>` : `<p class="muted">Aucun bien rattaché.</p><button class="btn small" data-a="estimMakeBien" data-id="${id}">Créer le bien</button>`}
    ${!c ? `<p class="small muted">Aucun propriétaire rattaché.</p>` : ''}</section>
  <section class="card"><h2>Valeur</h2><div class="grid4">
    ${ef('Fourchette basse (€)', K, id, 'prixBas', { type: 'number', r: true })}${ef('Fourchette haute (€)', K, id, 'prixHaut', { type: 'number', r: true })}${ef('Prix recommandé (€)', K, id, 'prixReco', { type: 'number', r: true })}${ef('Prix attendu par le propriétaire (€)', K, id, 'prixAttendu', { type: 'number', r: true })}</div>
    ${num(e.prixReco) && d && num(d.bien.surface) ? `<p class="small">Soit ${eur(Math.round(e.prixReco / d.bien.surface))}/m² Carrez.${num(e.prixAttendu) ? ` Écart avec l’attente du vendeur : ${eur(e.prixAttendu - e.prixReco)} (${((e.prixAttendu / e.prixReco - 1) * 100).toFixed(1).replace('.', ',')} %).` : ''}</p>` : ''}</section>
  <section class="card"><h2>📄 Rendu d’estimation</h2><p class="small muted">Remplissez ces champs : le PDF reprend aussi automatiquement les informations du bien (caractéristiques, lots, copropriété, DPE, photos) et votre profil.</p><div class="grid4">
    ${ef('Contexte et projet du vendeur', K, id, 'rendu.contexte', { area: true, cls: 'span2' })}${ef('Environnement / quartier', K, id, 'rendu.environnement', { area: true, cls: 'span2' })}
    ${ef('Points forts', K, id, 'rendu.pointsForts', { area: true, cls: 'span2', ph: 'un point par ligne' })}${ef('Points d’attention', K, id, 'rendu.pointsAttention', { area: true, cls: 'span2', ph: 'un point par ligne' })}
    ${ef('État général', K, id, 'rendu.etat', { options: ['', 'Neuf / refait à neuf', 'Très bon état', 'Bon état', 'Rafraîchissement à prévoir', 'Travaux à prévoir', 'À rénover'] })}${ef('Délai de vente estimé', K, id, 'rendu.delai', { ph: 'ex. 2 à 3 mois' })}${ef('Honoraires proposés', K, id, 'rendu.honoraires', { ph: 'ex. 4,5 % TTC charge vendeur' })}
    ${ef('Analyse du marché et justification du prix', K, id, 'rendu.analyse', { area: true, cls: 'span4', rows: 4 })}${ef('Stratégie de commercialisation proposée', K, id, 'rendu.strategie', { area: true, cls: 'span4' })}</div>
    <h3>Biens comparables</h3>${(e.rendu.comparables || []).map((x, i) => `<div class="grid4 comp">${ef('Adresse / secteur', K, id, `rendu.comparables.${i}.adresse`)}${ef('Surface (m²)', K, id, `rendu.comparables.${i}.surface`, { type: 'number' })}${ef('Prix (€)', K, id, `rendu.comparables.${i}.prix`, { type: 'number' })}${ef('Vendu / en vente', K, id, `rendu.comparables.${i}.statut`, { options: ['Vendu', 'En vente', 'Estimé'] })}</div>`).join('')}
    <button class="btn small" data-a="compAdd" data-id="${id}">＋ Comparable</button>
    <div class="row gap wrap modal-actions"><button class="btn primary" data-a="renduPdf" data-id="${id}">🖨️ Générer le PDF</button><button class="btn" data-a="renduSave" data-id="${id}">💾 Enregistrer le PDF dans le dossier</button>
      <button class="btn" data-a="renduMail" data-id="${id}">✉️ Mail d’envoi prêt à copier</button>${aiOn() ? `<button class="btn ghost" data-a="renduAi" data-id="${id}">✨ Rédiger l’analyse avec l’IA</button>` : ''}
      <label class="btn ghost">⬆️ Importer un rapport existant<input type="file" hidden accept=".pdf,.doc,.docx" data-estim-upload="${id}"></label></div></section>
  <section class="card"><h2>Retour du vendeur & issue</h2><div class="grid4">
    ${ef('Retour du vendeur', K, id, 'retour', { options: RETOUR_ESTIM, r: true })}${ef('Issue', K, id, 'issue', { options: ISSUE_ESTIM, r: true })}
    ${e.issue === 'concurrent' || e.issue === 'abandon' ? ef('Motif de perte', K, id, 'motifPerte', { options: ['', 'Prix (concurrent plus haut)', 'Honoraires', 'Relationnel / confiance', 'Projet abandonné', 'Vente entre particuliers', 'Autre'] }) : ''}
    ${ef('Notes', K, id, 'notes', { area: true, cls: 'span4' })}</div>
    ${e.issue === 'mandat' && d ? `<a class="btn primary" href="#/d/${d.id}/fiche">📝 Compléter le mandat</a>` : `<button class="btn" data-a="estim2mandat" data-id="${id}">📝 Mandat obtenu : passer au mandat</button>`}</section>
  <p class="right"><button class="btn danger small" data-a="estimDel" data-id="${id}">Supprimer l’estimation</button></p>`;
}

/* =========================================================================
   BIENS
   ========================================================================= */
const BIEN_FILTRES = [['commercialisation', 'En commercialisation', d => ['commercialisation', 'offre'].includes(d.phase)], ['alertes', 'Sans activité', d => bienAlertes(d).length > 0],
  ['estimation', 'En estimation', d => d.phase === 'estimation'], ['mandat', 'Mandat en préparation', d => d.phase === 'mandat'], ['compromis', 'Sous compromis', d => d.phase === 'compromis'],
  ['vendus', 'Vendus', d => d.phase === 'acte'], ['tous', 'Tous', () => true]];
function viewBiens(filter) {
  const f = BIEN_FILTRES.find(x => x[0] === filter) || BIEN_FILTRES[0], list = App.dossiers.filter(f[2]).sort((a, b) => b.updatedAt - a.updatedAt);
  return `<div class="page-head"><div><h1>🏠 Biens</h1><p class="muted">Chaque bien porte sa fiche, son mandat, ses visites, sa vente et son dossier copropriété.</p></div>
    <div class="row gap wrap"><button class="btn ghost" data-a="importPdf" data-kind="mandat">📄 Importer un mandat</button><button class="btn primary" data-a="newDossier">＋ Bien</button></div></div>
  <div class="seg scroll filters">${BIEN_FILTRES.map(x => `<a class="${x[0] === f[0] ? 'on' : ''}" href="#/biens/${x[0]}">${x[1]} <small>${App.dossiers.filter(x[2]).length}</small></a>`).join('')}</div>
  ${list.length ? `<div class="bgrid">${list.map(bienCard).join('')}</div>` : `<div class="empty"><p>Aucun bien ici.</p></div>`}`;
}
function bienCard(d) {
  const al = bienAlertes(d), vis = visitesOf(d), days = d.com.dateEntree ? -daysUntil(d.com.dateEntree) : null, ph = phaseDef(d.phase);
  return `<a class="bcard" href="#/d/${d.id}/${['commercialisation', 'offre'].includes(d.phase) ? 'commercialisation' : d.phase === 'compromis' ? 'vente' : 'parcours'}">
    <div class="row between"><span class="pill" style="--c:${ph.color}">${ph.label}</span><small class="muted">${esc(d.ref)}</small></div>
    <h3>${esc(dossierTitle(d))}</h3><p class="small muted">${esc([d.bien.type, d.bien.surface ? d.bien.surface + ' m²' : '', d.bien.pieces ? d.bien.pieces + ' p.' : ''].filter(Boolean).join(' · '))} · ${esc(names(d.vendeurs) || 'propriétaire ?')}</p>
    <p class="price">${eur(prixActuel(d))}${num(d.com.prixLancement) && num(d.com.prixActuel) && d.com.prixActuel < d.com.prixLancement ? ` <small class="muted"><s>${eur(d.com.prixLancement)}</s></small>` : ''}</p>
    <div class="stats3"><span><b>${num(d.com.demandes) || 0}</b>demandes</span><span><b>${vis.length}</b>visites</span><span><b>${num(d.com.offres) || 0}</b>offres</span>${days != null ? `<span><b>${days}</b>jours</span>` : ''}</div>
    ${al.map(x => `<p class="alert-line">⚠️ ${esc(x)}</p>`).join('')}</a>`;
}

/* ---------- Onglet Commercialisation d'un bien ---------- */
function tabCommercialisation(d) {
  const C = d.com, vis = visitesOf(d), al = bienAlertes(d), done = (C.actions || []).filter(a => a.done).length;
  return `${al.length ? `<div class="warn">⚠️ ${al.map(esc).join(' · ')} <button class="btn small" data-a="bilanVendeur">📊 Faire le bilan au vendeur</button></div>` : ''}
  <div class="kpis"><div class="kpi"><span class="klabel">Prix actuel</span><b>${eur(prixActuel(d))}</b>${num(C.prixLancement) ? `<small class="muted">lancement ${eur(C.prixLancement)}</small>` : ''}</div>
    <div class="kpi"><span class="klabel">Demandes</span><b>${num(C.demandes) || 0}</b><span class="row gap"><button class="btn small" data-a="comInc" data-k="demandes" data-n="1">＋1</button><button class="btn small ghost" data-a="comInc" data-k="demandes" data-n="-1">−1</button></span></div>
    <div class="kpi"><span class="klabel">Visites</span><b>${vis.length}</b><small class="muted">${vis.filter(v => v.statut === 'realisee').length} réalisée(s)</small></div>
    <div class="kpi"><span class="klabel">Offres</span><b>${num(C.offres) || 0}</b><span class="row gap"><button class="btn small" data-a="comInc" data-k="offres" data-n="1">＋1</button><button class="btn small ghost" data-a="comInc" data-k="offres" data-n="-1">−1</button></span></div></div>
  <section class="card"><h2>Prix & dates</h2><div class="grid4">
    ${field('Prix de lancement (€)', 'com.prixLancement', { type: 'number', r: true })}<div class="field"><span>Prix actuel</span><div class="row gap"><b>${eur(prixActuel(d))}</b><button class="btn small" data-a="prixChange">Modifier le prix</button></div></div>
    ${field('Entrée en commercialisation', 'com.dateEntree', { type: 'date', r: true })}${field('Publication des annonces', 'com.datePublication', { type: 'date' })}
    ${field('Dernier échange avec le vendeur', 'com.dernierEchangeVendeur', { type: 'date', r: true })}${field('Dernier compte rendu envoyé', 'com.dernierBilan', { type: 'date', r: true })}${field('Prochain bilan prévu', 'com.prochainBilan', { type: 'date' })}</div>
    ${(C.historiquePrix || []).length ? `<h3>Historique des prix</h3><ul class="mini-list">${C.historiquePrix.map(h => `<li><span>${fdate(h.date)} — ${esc(h.motif || 'modification')}</span><b>${eur(h.prix)}</b></li>`).join('')}</ul>` : ''}</section>
  <section class="card"><h2>Supports de diffusion</h2>${(C.supports || []).map((s, i) => `<div class="grid4 comp">${field('Support', `com.supports.${i}.nom`, { list: 'supportsList' })}${field('Lien de l’annonce', `com.supports.${i}.url`, { cls: 'span2', type: 'url' })}<div class="field"><span>&nbsp;</span><div class="row gap">${s.url ? `<a class="btn small" href="${esc(s.url)}" target="_blank" rel="noopener">Ouvrir ↗</a>` : ''}<button class="btn small ghost" data-a="supportDel" data-i="${i}">🗑</button></div></div></div>`).join('')}
    <datalist id="supportsList"><option>Site de l’agence / réseau</option><option>Leboncoin</option><option>SeLoger</option><option>Bien’ici</option><option>Logic-Immo</option><option>Réseaux sociaux</option><option>Vitrine / panneau</option></datalist>
    <button class="btn small" data-a="supportAdd">＋ Support</button></section>
  <section class="card"><div class="row between"><h2>Actions à réaliser</h2><small class="muted">${done}/${(C.actions || []).length}</small></div>
    <ul class="tasks">${(C.actions || []).map((a, i) => `<li class="${a.done ? 'ok' : ''}"><label class="check"><input type="checkbox" data-b="com.actions.${i}.done" data-r ${a.done ? 'checked' : ''}> <span>${esc(a.txt)}</span></label><button class="icon-btn" data-a="comActDel" data-i="${i}">🗑</button></li>`).join('')}</ul>
    <div class="chips">${['Compléter les photos', 'Récupérer un document', 'Revoir l’annonce', 'Discuter du prix', 'Organiser une visite groupée', 'Mettre à jour le panneau'].map(t => `<button class="chip" data-a="comActAdd" data-t="${esc(t)}">＋ ${t}</button>`).join('')}</div>
    <div class="row gap"><input id="comActTxt" class="grow" placeholder="Autre action…"><button class="btn small" data-a="comActAdd">Ajouter</button></div></section>
  <section class="card"><h2>📝 Annonce</h2>${annonceEditor(d)}</section>
  <section class="card"><h2>Documents commerciaux</h2><div class="row gap wrap"><button class="btn" data-a="ficheCom" data-id="${d.id}">🖨️ Fiche de commercialisation</button><button class="btn" data-a="bilanVendeur">📊 Bilan vendeur (PDF + mail)</button><a class="btn" href="#/d/${d.id}/visites">🚪 Visites (${vis.length})</a></div></section>
  ${field('Notes internes de commercialisation', 'com.notes', { area: true })}`;
}

/* ---------- Inventaire des équipements de la copropriété (dans la fiche) ---------- */
function equipBlock(d) {
  const E = (d.copro.equip = d.copro.equip || {}), all = EQUIPEMENTS.flatMap(g => g.items), filled = all.filter(([k]) => E[k] !== undefined && E[k] !== '').length, open = App.open.equip;
  const row = ([k, label, type, opts]) => {
    if (type === 'num') return `<div class="eq-row"><span>${esc(label)}</span><input type="number" min="0" class="eq-num" data-b="copro.equip.${k}" value="${esc(E[k] ?? '')}" placeholder="0"></div>`;
    if (type === 'select') return `<div class="eq-row"><span>${esc(label)}</span><select class="eq-sel" data-b="copro.equip.${k}">${opts.map(o => `<option ${E[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    return `<div class="eq-row"><span>${esc(label)}</span><div class="seg small">${[['oui', 'Oui'], ['non', 'Non'], ['ind', 'Indéterminé']].map(([v, l]) => `<button class="${E[k] === v ? 'on' : ''}" data-a="equipSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  };
  return `<button class="eq-head" data-a="equipToggle" aria-expanded="${!!open}"><b>🧰 Inventaire des équipements de la copropriété</b><small>${filled}/${all.length} renseignés</small><span>${open ? '▾' : '▸'}</span></button>
    ${open ? `<div class="eq-grid">${EQUIPEMENTS.map(g => `<div class="eq-group"><h3>${esc(g.titre)}</h3>${g.items.map(row).join('')}</div>`).join('')}</div>
      <p class="small muted">Source : fiche synthétique, carnet d’entretien, contrats de la copropriété ou visite de l’immeuble.</p>` : ''}`;
}

/* ---------- Mandat (dans la fiche) ---------- */
function mandatExtra(d) {
  const M = d.mandat;
  return `<div class="grid4">${field('Statut du mandat', 'mandat.statut', { options: ST_MANDAT.map(x => [x[0], x[1]]), r: true })}${field('Prise d’effet', 'mandat.dateEffet', { type: 'date' })}
    ${field('Répartition des honoraires (intervenants)', 'mandat.repartition', { cls: 'span2', ph: 'ex. 50 % agence / 50 % mandataire' })}</div>
    <h3>Échéances à surveiller</h3>${(M.echeances || []).map((x, i) => `<div class="grid4 comp">${field('Échéance', `mandat.echeances.${i}.label`, { cls: 'span2' })}${field('Date', `mandat.echeances.${i}.date`, { type: 'date', r: true })}<div class="field"><span>&nbsp;</span><button class="btn small ghost" data-a="mEchDel" data-i="${i}">🗑</button></div></div>`).join('')}
    <button class="btn small" data-a="mEchAdd">＋ Échéance (fin d’exclusivité, avenant, bilan…)</button>
    ${(M.historique || []).length ? `<h3>Historique des conditions</h3><ul class="mini-list">${M.historique.map(h => `<li><span>${fdate(h.date)}</span><span>${esc(h.txt)}</span></li>`).join('')}</ul>` : ''}
    ${(d.mandatsHisto || []).length ? `<h3>Mandats précédents</h3><ul class="mini-list">${d.mandatsHisto.map(m => `<li><span>${esc(m.numero || 'sans n°')} · ${esc(m.type)} · ${fdate(m.date)}</span>${badge(ST_MANDAT, m.statut)}</li>`).join('')}</ul>` : ''}
    <p class="small"><a href="#/d/${d.id}/pieces#p_avenant">📎 Avenants</a> · <button class="link" data-a="mandatNouveau">Clore ce mandat et en démarrer un nouveau</button></p>`;
}

/* ---------- Mandats ---------- */
function viewMandats() {
  const rows = App.dossiers.filter(d => !['abandon'].includes(d.phase)).map(d => ({ d, ech: mandatEcheances(d) })).filter(x => ['actif', 'a_signer', 'preparation'].includes(x.d.mandat.statut) && x.d.phase !== 'acte' && x.d.phase !== 'estimation');
  rows.sort((a, b) => ((a.ech[0] || {}).date || '9').localeCompare((b.ech[0] || {}).date || '9'));
  const histo = App.dossiers.flatMap(d => (d.mandatsHisto || []).map(m => ({ d, m }))).concat(App.dossiers.filter(d => ['termine', 'resilie'].includes(d.mandat.statut) || d.phase === 'acte').map(d => ({ d, m: d.mandat })));
  const typeLab = { exclusif: 'Exclusif', semi: 'Semi-exclusif', simple: 'Simple' };
  return `<div class="page-head"><div><h1>📝 Mandats</h1><p class="muted">Mandats actifs triés par prochaine échéance (rappel ${App.settings.delais.rappelMandat} jours avant).</p></div><button class="btn primary" data-a="newDossier">＋ Mandat</button></div>
  ${rows.length ? `<div class="clist">${rows.map(({ d, ech }) => { const n = ech[0] ? daysUntil(ech[0].date) : null;
    return `<a class="crow" href="#/d/${d.id}/fiche"><span class="rmain"><b>${esc(dossierTitle(d))}</b><small>${esc(typeLab[d.mandat.type] || '')} ${d.mandat.numero ? 'n° ' + esc(d.mandat.numero) : ''} · ${esc(names(d.vendeurs) || '')} · ${eur(prixActuel(d))} · honoraires ${eur(d.mandat.honoraires)}</small>
      <small>${ech[0] ? `<span class="${n < 0 ? 'late' : n <= App.settings.delais.rappelMandat ? 'soon' : 'muted'}">${esc(ech[0].label)} : ${fdate(ech[0].date)}${n < 0 ? ' (dépassée)' : n <= 30 ? ` (J-${n})` : ''}</span>` : '<span class="muted">Aucune échéance renseignée</span>'}</small></span><span class="cside">${badge(ST_MANDAT, d.mandat.statut)}</span></a>`; }).join('')}</div>`
    : '<div class="empty"><p>Aucun mandat actif.</p></div>'}
  ${histo.length ? `<h2 class="section-title">Mandats terminés</h2><div class="clist">${histo.map(({ d, m }) => `<a class="crow light" href="#/d/${d.id}/fiche"><span class="rmain"><b>${esc(dossierTitle(d))}</b><small>${esc(typeLab[m.type] || '')} ${m.numero ? 'n° ' + esc(m.numero) : ''} · ${fdate(m.date)}</small></span>${d.phase === 'acte' && m === d.mandat ? '<span class="sbadge s-green">Vendu</span>' : badge(ST_MANDAT, m.statut)}</a>`).join('')}</div>` : ''}`;
}

/* =========================================================================
   VISITES
   ========================================================================= */
function viewVisites(f) {
  f = f || 'avenir';
  const all = App.crm.visites, F = { aujourdhui: v => isToday(v.quand), avenir: v => !visitePassee(v) && !['annulee'].includes(v.statut), cr: crManquant, passees: v => visitePassee(v), toutes: () => true };
  const list = all.filter(F[f] || F.avenir).sort((a, b) => f === 'passees' || f === 'toutes' ? b.quand.localeCompare(a.quand) : a.quand.localeCompare(b.quand));
  return `<div class="page-head"><div><h1>🚪 Visites</h1><p class="muted">Compte rendu en une minute après chaque visite.</p></div><button class="btn primary" data-a="visiteNew">＋ Ajouter une visite de bien</button></div>
  <div class="seg scroll filters">${[['aujourdhui', 'Aujourd’hui'], ['avenir', 'À venir'], ['cr', 'Compte rendu manquant'], ['passees', 'Passées'], ['toutes', 'Toutes']].map(([id, l]) => `<a class="${f === id ? 'on' : ''}" href="#/visites/${id}">${l} <small>${all.filter(F[id]).length}</small></a>`).join('')}</div>
  ${list.length ? `<div class="clist">${list.map(visiteRow).join('')}</div>` : '<div class="empty"><p>Aucune visite ici.</p></div>'}`;
}
function visiteRow(v) {
  const d = App.dossiers.find(x => x.id === v.dossierId), q = contactById(v.acquereurId);
  return `<div class="crow"><a class="rmain" href="#/v/${v.id}"><b>${fdatetime(v.quand)}</b><small>${esc(d ? dossierTitle(d) : 'Bien ?')} · ${esc(cName(q) || 'Visiteur ?')}</small>
    <small>${crManquant(v) ? '<span class="soon">Compte rendu à faire</span>' : v.interet ? `Intérêt ${'★'.repeat(+v.interet)} · ${esc((SUITES.find(x => x[0] === v.suite) || ['', ''])[1])}` : ''}</small></a>
    <div class="cside">${badge(ST_VISITE, v.statut)}${crManquant(v) ? `<a class="btn small primary" href="#/v/${v.id}">✍️ CR</a>` : q ? contactActions(q, true) : ''}</div></div>`;
}
function tabVisitesBien(d) {
  const list = App.crm.visites.filter(v => v.dossierId === d.id).sort((a, b) => b.quand.localeCompare(a.quand));
  return `<div class="row between wrap gap"><p class="muted">${list.length} visite(s) pour ce bien.</p><div class="row gap"><button class="btn" data-a="bilanVendeur">📊 Bilan vendeur</button><button class="btn primary" data-a="visiteNew" data-bien="${d.id}">＋ Ajouter une visite de bien</button></div></div>
  ${list.length ? `<div class="clist">${list.map(visiteRow).join('')}</div>` : '<div class="empty"><p>Aucune visite enregistrée.</p></div>'}`;
}
function viewVisite(id) {
  const v = App.crm.visites.find(x => x.id === id); if (!v) return '<p>Visite introuvable.</p>';
  const K = 'visites', d = App.dossiers.find(x => x.id === v.dossierId), q = contactById(v.acquereurId);
  const chipsMulti = (path, list) => `<div class="chips">${list.map(x => `<button class="chip ${(getPath(v, path) || []).includes(x) ? 'on' : ''}" data-a="chipToggle" data-id="${id}" data-path="${path}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
  const one = (path, list) => `<div class="chips">${list.filter(x => x[0]).map(([val, lab]) => `<button class="chip ${String(getPath(v, path)) === String(val) ? 'on' : ''}" data-a="chipSet" data-id="${id}" data-path="${path}" data-v="${esc(val)}">${esc(lab)}</button>`).join('')}</div>`;
  return `<a href="#/visites" class="muted small">← Visites</a>
  <div class="page-head"><div><h1>🚪 Visite du ${fdatetime(v.quand)}</h1><p class="muted">${esc(d ? dossierTitle(d) : 'Bien à choisir')} · ${esc(cName(q) || 'Visiteur à choisir')}</p></div>${q ? contactActions(q) : ''}</div>
  <section class="card"><h2>Préparation</h2><div class="grid4">
    <label class="field span2"><span>Bien visité</span><select data-eb="${K}|${id}|dossierId" data-r><option value="">— Choisir —</option>${App.dossiers.filter(x => !['acte', 'abandon'].includes(x.phase)).map(x => `<option value="${x.id}" ${x.id === v.dossierId ? 'selected' : ''}>${esc(dossierTitle(x))}</option>`).join('')}</select></label>
    <label class="field span2"><span>Visiteur (fiche acquéreur)</span><div class="row gap"><select data-eb="${K}|${id}|acquereurId" data-r class="grow"><option value="">— Choisir —</option>${App.crm.contacts.filter(c => c.roles.acquereur).map(c => `<option value="${c.id}" ${c.id === v.acquereurId ? 'selected' : ''}>${esc(cName(c))}</option>`).join('')}</select><button class="btn small" data-a="visiteNewAcq" data-id="${id}">＋ Nouveau</button></div></label>
    ${ef('Date et heure', K, id, 'quand', { type: 'datetime-local', r: true })}${ef('Statut', K, id, 'statut', { options: ST_VISITE.map(x => [x[0], x[1]]), r: true })}${ef('Consignes d’accès', K, id, 'consignes', { cls: 'span2', ph: 'code, clés, interphone…' })}</div>
    ${q ? `<p class="small muted">Budget ${eur(q.acq.budget)} · ${esc((FINANCEMENT.find(x => x[0] === q.acq.financement) || ['', 'financement ?'])[1])} · ${esc(q.acq.criteres || '')}</p>` : ''}</section>
  <section class="card cr"><h2>✍️ Compte rendu en 1 minute</h2>
    <h3>Intérêt</h3>${one('interet', [['1', '★ Faible'], ['2', '★★ Moyen'], ['3', '★★★ Fort']])}
    <h3>Points appréciés</h3>${chipsMulti('aime', AIME)}
    <h3>Objections</h3>${chipsMulti('objections', OBJECTIONS)}
    <h3>Appréciation du prix</h3>${one('prix', [['cher', 'Trop cher'], ['correct', 'Correct'], ['attractif', 'Attractif']])}
    <h3>Suite à donner</h3>${one('suite', SUITES)}
    <div class="grid4">${ef('Rappeler le', K, id, 'rappel', { type: 'date' })}${ef('Commentaire', K, id, 'commentaire', { area: true, cls: 'span4', ph: 'Ce que le visiteur a dit, en quelques mots…' })}${ef('Notes internes (jamais transmises)', K, id, 'notesInternes', { area: true, cls: 'span4' })}</div>
    <div class="row gap wrap modal-actions"><button class="btn primary" data-a="crGen" data-id="${id}">${aiOn() ? '✨ Rédiger les comptes rendus avec l’IA' : '⚡ Générer les comptes rendus'}</button></div></section>
  <section class="card"><h2>Comptes rendus</h2><div class="grid4">${ef('Pour le vendeur (sans notes internes)', K, id, 'crVendeur', { area: true, cls: 'span2', rows: 9 })}${ef('Pour le visiteur', K, id, 'crVisiteur', { area: true, cls: 'span2', rows: 9 })}</div>
    <div class="row gap wrap"><button class="btn" data-a="crPdf" data-id="${id}">🖨️ PDF compte rendu vendeur</button><button class="btn" data-a="crMail" data-id="${id}" data-to="vendeur">✉️ Mail au propriétaire</button><button class="btn" data-a="crMail" data-id="${id}" data-to="visiteur">✉️ Mail au visiteur</button>
      ${ef('Compte rendu fait', K, id, 'crFait', { check: true, r: true })}</div></section>
  <p class="right"><button class="btn danger small" data-a="visiteDel" data-id="${id}">Supprimer la visite</button></p>`;
}

/* =========================================================================
   VENTES
   ========================================================================= */
const honor = d => num(d.mandat.honoraires) || 0;
const dateVente = d => d.vente.acteRealise || d.dates.acte || '';
function viewVentes() {
  const enCours = App.dossiers.filter(venteEnCours), vendus = App.dossiers.filter(d => d.phase === 'acte').sort((a, b) => dateVente(b).localeCompare(dateVente(a)));
  const y = String(new Date().getFullYear()), an = vendus.filter(d => dateVente(d).startsWith(y));
  const enc = an.reduce((s, d) => s + (num(d.vente.honoEncaisse) || 0), 0), prev = enCours.reduce((s, d) => s + honor(d), 0);
  return `<div class="page-head"><div><h1>🤝 Ventes</h1><p class="muted">Suivi dès l’offre acceptée, jusqu’à l’après-vente.</p></div></div>
  <div class="kpis">${kpiTile(enCours.length, 'En cours de signature')}${kpiTile(eur(prev), 'Honoraires prévisionnels')}${kpiTile(an.length, 'Ventes actées ' + y)}${kpiTile(eur(enc), 'Honoraires encaissés ' + y)}</div>
  <h2 class="section-title">Ventes en cours de signature</h2>
  ${enCours.length ? `<div class="clist">${enCours.map(d => { const s = venteSituation(d), n = s.next && s.next[1] ? daysUntil(s.next[1]) : null;
    return `<a class="crow" href="#/d/${d.id}/vente"><span class="rmain"><b>${esc(dossierTitle(d))}</b><small>${esc(names(d.vendeurs) || '?')} → ${esc(names(d.acquereurs) || '?')} · ${eur(d.vente.offreMontant || d.offre.prix)}</small>
      <small>${s.next ? `Prochaine échéance : <b>${esc(s.next[0])}</b> ${s.next[1] ? `<span class="${n < 0 ? 'late' : n <= 7 ? 'soon' : ''}">${fdate(s.next[1])}</span>` : '<span class="muted">date à fixer</span>'}` : 'Toutes les étapes sont réalisées'}</small>
      ${s.bloc ? `<small class="late">⛔ ${esc(s.bloc)}</small>` : ''}</span><span class="cside"><span class="pill" style="--c:${phaseDef(d.phase).color}">${phaseDef(d.phase).label}</span></span></a>`; }).join('')}</div>` : '<div class="empty"><p>Aucune vente en cours. Une vente apparaît ici dès que l’offre est acceptée.</p></div>'}
  <h2 class="section-title">Ventes réalisées</h2>
  ${vendus.length ? `<div class="clist">${vendus.map(d => `<a class="crow light" href="#/d/${d.id}/vente"><span class="rmain"><b>${esc(dossierTitle(d))}</b><small>Acte ${fdate(dateVente(d))} · ${eur(d.vente.offreMontant || d.offre.prix || d.mandat.prix)} · honoraires ${eur(d.mandat.honoraires)} ${num(d.vente.honoEncaisse) ? '<span class="okc">encaissés</span>' : num(d.vente.honoFacture) ? '<span class="soon">facturés</span>' : '<span class="late">à facturer</span>'}</small></span>
    <span class="cside">${d.vente.avis ? '⭐' : `<span class="sbadge s-amber">Après-vente</span>`}</span></a>`).join('')}</div>` : '<p class="muted">Aucune vente actée.</p>'}`;
}
function tabVente(d) {
  const V = d.vente, s = venteSituation(d), et = venteEtapes(d);
  return `${s.bloc ? `<div class="warn">⛔ Point bloquant : ${esc(s.bloc)}</div>` : ''}
  <section class="card"><h2>Offre</h2><div class="grid4">${field('Montant de l’offre acceptée (€)', 'vente.offreMontant', { type: 'number', r: true })}${field('Offre reçue le', 'vente.offreDate', { type: 'date' })}${field('Acceptée le', 'vente.offreAcceptee', { type: 'date', r: true })}
    ${field('Origine de l’affaire', 'vente.origine', { options: [''].concat(ORIGINES) })}</div><p class="small"><a href="#/d/${d.id}/pieces#p_acq_offre">📎 Offre signée</a> · <a href="#/d/${d.id}/fiche">Vendeurs, acquéreurs, notaires</a></p></section>
  <section class="card"><h2>Étapes</h2><div class="steps-v">${et.map(([l, prev, real, key, dk]) => `<div class="sv ${real ? 'ok' : prev && daysUntil(prev) < 0 ? 'late' : ''}"><b>${real ? '✓' : '○'} ${l}</b><div class="grid2">${field('Prévu le', 'dates.' + dk, { type: 'date', r: true })}${field('Réalisé le', 'vente.' + key, { type: 'date', r: true })}</div></div>`).join('')}</div>
    ${field('Point bloquant / à surveiller (saisie libre)', 'vente.blocage', { r: true, ph: 'ex. attente de l’offre de prêt' })}</section>
  <section class="card"><h2>Pièces attendues</h2>${s.missing.length ? `<ul class="mini-list">${s.missing.map(({ p, qui }) => `<li><a href="#/d/${d.id}/pieces#p_${p.id}">${esc(p.label)}</a><span>${esc(qui || 'qui ?')}</span></li>`).join('')}</ul>` : '<p class="small muted">Aucune pièce en attente (statut « Demandée »).</p>'}</section>
  <section class="card"><h2>Honoraires</h2><div class="grid4"><div class="field"><span>Prévisionnels</span><div class="readout"><b>${eur(d.mandat.honoraires)}</b></div></div>
    ${field('Facturés (€)', 'vente.honoFacture', { type: 'number', r: true })}${field('Facturés le', 'vente.honoFactureDate', { type: 'date' })}${field('Encaissés (€)', 'vente.honoEncaisse', { type: 'number', r: true })}${field('Encaissés le', 'vente.honoEncaisseDate', { type: 'date' })}</div>
    <button class="btn" data-a="factureOpen" data-id="${d.id}">🧾 Générer la facture d’honoraires</button></section>
  <section class="card"><h2>Après-vente</h2>${field('Remerciements envoyés', 'vente.merci', { check: true })}${field('Avis demandé / obtenu', 'vente.avis', { check: true })}${field('Prise de nouvelles prévue le', 'vente.nouvelles', { type: 'date' })}
    <button class="btn small" data-a="compose" data-tpl="vendeur_merci">✉️ Mail de remerciement</button></section>`;
}

/* =========================================================================
   INDICATEURS
   ========================================================================= */
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function shortNum(v) { return v >= 1e6 ? (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M' : v >= 1e3 ? (v / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' k' : String(Math.round(v)); }
function barChart(data, o = {}) {
  const max = Math.max(0, ...data.map(d => d.value));
  if (!max && o.empty) return `<div class="chart-empty">${o.empty}</div>`;
  const W = 640, H = o.h || 200, L = 44, B = 24, T = 14, top = niceMax(max), n = data.length, step = (W - L - 8) / n, bw = Math.min(34, step * 0.56), y = v => T + (H - T - B) * (1 - v / top);
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - 4}" y1="${y(top * f)}" y2="${y(top * f)}" class="grid"/><text x="${L - 6}" y="${y(top * f) + 4}" class="axis" text-anchor="end">${shortNum(top * f)}</text>`).join('');
  const peak = data.reduce((m, d, i) => d.value > data[m].value ? i : m, 0);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Graphique')}">${grid}<line x1="${L}" x2="${W - 4}" y1="${y(0)}" y2="${y(0)}" class="base"/>${data.map((d, i) => {
    const x = L + step * i + (step - bw) / 2, h = Math.max(0, y(0) - y(d.value)), r = Math.min(4, h, bw / 2);
    const path = h > 0 ? `M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + bw - r} Q${x + bw},${y(0) - h} ${x + bw},${y(0) - h + r} V${y(0)} Z` : '';
    return `<g class="hit" data-tip="${esc(d.tip || d.label + ' : ' + (o.fmt ? o.fmt(d.value) : d.value))}"><rect x="${L + step * i}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent"/>${path ? `<path d="${path}" class="mark"/>` : ''}${i === peak && d.value ? `<text x="${x + bw / 2}" y="${y(d.value) - 5}" class="vlabel" text-anchor="middle">${o.fmt ? o.fmt(d.value) : d.value}</text>` : ''}<text x="${x + bw / 2}" y="${H - 6}" class="axis" text-anchor="middle">${esc(d.label)}</text></g>`; }).join('')}</svg>`;
}
function hbars(rows, empty) {
  const max = Math.max(0, ...rows.map(r => r.value)); if (!max) return `<div class="chart-empty">${empty}</div>`;
  return `<div class="funnel">${rows.map(r => `<div class="frow" data-tip="${esc(r.tip || r.label + ' : ' + r.value)}"><span class="flabel">${esc(r.label)}</span><span class="ftrack"><i style="width:${Math.max(r.value ? 3 : 0, r.value / max * 100)}%"></i></span><b>${r.fmt || r.value}</b></div>`).join('')}</div>`;
}
function kpiTile(value, label, extra = '', href) { const inner = `<span class="klabel">${label}</span><b>${value}</b>${extra}`; return href ? `<a class="kpi link" href="${href}">${inner}</a>` : `<div class="kpi">${inner}</div>`; }
function viewStats() {
  const C = App.crm, y = String(new Date().getFullYear());
  const prosp = C.contacts.filter(c => c.roles.vendeur && !['client', 'sans_suite'].includes(c.vend.statut));
  const retard = C.contacts.filter(c => c.next.date && daysUntil(c.next.date) < 0);
  const rdvByOrigin = ORIGINES.map(o => ({ label: o, value: C.contacts.filter(c => c.origine === o && (['rdv', 'client'].includes(c.vend.statut) || C.estimations.some(e => e.contactId === c.id))).length }));
  const delais = C.estimations.filter(e => e.dateVisite && e.restitRealisee).map(e => (new Date(e.restitRealisee) - new Date(e.dateVisite)) / 864e5);
  const clos = C.estimations.filter(e => ['mandat', 'concurrent', 'abandon'].includes(e.issue)), ok = clos.filter(e => e.issue === 'mandat');
  const motifs = {}; C.estimations.filter(e => e.motifPerte).forEach(e => { motifs[e.motifPerte] = (motifs[e.motifPerte] || 0) + 1; });
  const vendus = App.dossiers.filter(d => d.phase === 'acte'), an = vendus.filter(d => dateVente(d).startsWith(y));
  const dV = vendus.filter(d => d.mandat.date && dateVente(d)).map(d => (new Date(dateVente(d)) - new Date(d.mandat.date)) / 864e5);
  const orig = {}; vendus.forEach(d => { const o = d.vente.origine || 'Non renseignée'; orig[o] = (orig[o] || 0) + 1; });
  const now = new Date(), months = []; for (let i = 11; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: dt.toISOString().slice(0, 7), label: MOIS[dt.getMonth()] }); }
  const encByMonth = months.map(m => { const l = vendus.filter(d => (d.vente.honoEncaisseDate || dateVente(d)).slice(0, 7) === m.key); const v = l.reduce((s, d) => s + (num(d.vente.honoEncaisse) || 0), 0); return { label: m.label, value: v, tip: `${m.label} : ${eur(v)} encaissés` }; });
  const avg = a => a.length ? Math.round(a.reduce((x, z) => x + z, 0) / a.length) : null;
  return `<div class="page-head"><div><h1>📈 Indicateurs</h1></div></div>
  <h2 class="section-title">Prospection</h2><div class="kpis">${kpiTile(prosp.length, 'Prospects actifs')}${kpiTile(retard.length, 'Relances en retard', '', '#/relances')}${kpiTile(C.contacts.filter(c => c.vend.statut === 'rdv').length, 'Rendez-vous fixés')}</div>
  <section class="card"><h2>Rendez-vous obtenus par origine</h2>${hbars(rdvByOrigin.filter(r => r.value), 'Renseignez l’origine des contacts pour voir ce graphique.')}</section>
  <h2 class="section-title">Estimations</h2><div class="kpis">${kpiTile(avg(delais) != null ? avg(delais) + ' j' : '—', 'Délai visite → restitution')}${kpiTile(clos.length ? Math.round(ok.length / clos.length * 100) + ' %' : '—', 'Taux de transformation en mandat')}${kpiTile(C.estimations.filter(e => estStage(e) === 'restituee').length, 'Restituées sans décision')}</div>
  <section class="card"><h2>Motifs de perte</h2>${hbars(Object.entries(motifs).map(([label, value]) => ({ label, value })), 'Aucune estimation perdue enregistrée.')}</section>
  <h2 class="section-title">Ventes</h2><div class="kpis">${kpiTile(an.length, 'Ventes actées ' + y)}${kpiTile(eur(an.reduce((s, d) => s + (num(d.vente.honoEncaisse) || 0), 0)), 'Honoraires encaissés ' + y)}${kpiTile(avg(dV) != null ? avg(dV) + ' j' : '—', 'Délai moyen mandat → acte')}</div>
  <div class="grid2"><section class="card"><h2>Honoraires encaissés — 12 mois</h2>${barChart(encByMonth, { fmt: v => eur(v), empty: 'Saisissez les honoraires encaissés dans l’onglet Vente des dossiers.' })}</section>
  <section class="card"><h2>Origine des affaires</h2>${hbars(Object.entries(orig).map(([label, value]) => ({ label, value })), 'Aucune vente actée.')}</section></div>`;
}

/* =========================================================================
   MON PROFIL (enregistrement explicite)
   ========================================================================= */
const PROFIL_FIELDS = [['civ', 'Civilité', ['', 'M.', 'Mme']], ['prenom', 'Prénom'], ['nom', 'Nom'], ['statut', 'Statut'], ['reseau', 'Réseau / agence'], ['siren', 'N° SIREN'],
  ['rsac', 'N° RSAC (mandataire)'], ['carte', 'Carte professionnelle (du titulaire)'], ['tel', 'Téléphone'], ['email', 'E-mail'], ['adresse', 'Adresse professionnelle', null, 2], ['objectif', 'Objectif annuel d’honoraires (€)', 'number'],
  ['tva', 'Régime de TVA (factures)', ['TVA non applicable, art. 293 B du CGI', 'TVA 20 %']], ['tvaIntra', 'N° TVA intracommunautaire'], ['iban', 'IBAN (factures)', null, 2], ['factureNext', 'Prochain n° de facture', 'number'],
  ['signature', 'Signature des mails (laisser vide pour la générer)', 'area']];
function viewProfil() {
  const a = App.settings.agent; App.profilDirty = false;
  const inp = ([k, l, t, span]) => { const v = a[k] ?? '';
    if (Array.isArray(t)) return `<label class="field"><span>${l}</span><select data-p="${k}">${t.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    if (t === 'area') return `<label class="field span4"><span>${l}</span><textarea data-p="${k}" rows="5" placeholder="${esc(signature())}">${esc(v)}</textarea></label>`;
    return `<label class="field ${span ? 'span' + span : ''}"><span>${l}</span><input data-p="${k}" type="${t || 'text'}" value="${esc(v)}"></label>`; };
  return `<div class="page-head"><div><h1>👤 Mon profil</h1><p class="muted">Alimente vos signatures, annonces (SIREN / RSAC obligatoires), offres, rendus et comptes rendus.</p></div></div>
  <section class="card"><div class="grid4">${PROFIL_FIELDS.map(inp).join('')}</div></section>
  <div class="savebar"><span id="profilState" class="muted">Aucune modification</span><div class="row gap"><button class="btn ghost" data-a="profilCancel">Annuler</button><button class="btn primary" id="profilSave" data-a="profilSave" disabled>💾 Enregistrer les modifications</button></div></div>`;
}
function profilDirty() { App.profilDirty = true; const b = $('#profilSave'); if (b) b.disabled = false; const s = $('#profilState'); if (s) { s.textContent = '● Modifications non enregistrées'; s.className = 'soon'; } }
function profilSave() {
  $$('[data-p]').forEach(el => { App.settings.agent[el.dataset.p] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim(); });
  saveSettings(); App.profilDirty = false; const b = $('#profilSave'); if (b) b.disabled = true;
  const s = $('#profilState'); if (s) { s.textContent = '✔ Enregistré à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); s.className = 'okc'; } toast('Profil enregistré');
}
