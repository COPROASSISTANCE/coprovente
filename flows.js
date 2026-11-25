/* =========================================================================
   CoproVente — actions, saisies rapides, reprise des données, exemple, démarrage
   ========================================================================= */

/* ---------- Reprise des données des versions précédentes ---------- */
function migrateCrm(raw) {
  const C = { contacts: [], estimations: [], visites: [], ...(raw || {}) };
  const stMap = { nouveau: 'a_contacter', contacte: 'contact', rdv: 'rdv', estimation: 'client', mandat: 'client', perdu: 'sans_suite' };
  (C.prospects || []).forEach(p => C.contacts.push(newContact({ id: p.id, nom: p.nom || '', tel: p.tel || '', email: p.email || '', origine: p.source || '', notes: p.notes || '',
    vend: { ...newContact().vend, statut: stMap[p.statut] || 'a_contacter', bienAdresse: p.adresse || '', bienVille: p.ville || '', bienType: p.type || 'Appartement', echeance: p.projet || '' },
    next: { date: p.relance || '', action: 'appeler', note: '' } })));
  delete C.prospects;
  C.estimations = C.estimations.map(e => {
    if (e.rendu) return e;
    let cid = '';
    if (e.proprietaire) { const c = newContact({ nom: e.proprietaire, tel: e.tel || '', email: e.email || '', vend: { ...newContact().vend, statut: 'client', bienAdresse: e.adresse || '', bienVille: e.ville || '' }, next: { date: e.relance || '', action: 'appeler', note: '' } }); C.contacts.push(c); cid = c.id; }
    return newEstimation({ id: e.id, contactId: cid, dossierId: e.dossierId || '', dateDemande: e.date || today(), prixBas: e.valBasse || '', prixHaut: e.valHaute || '', prixReco: e.valRetenue || '',
      restitRealisee: e.statut === 'remise' ? (e.date || today()) : '', issue: e.statut === 'mandat' ? 'mandat' : e.statut === 'refusee' ? 'abandon' : '', relance: e.relance || '', notes: e.notes || '' });
  });
  C.visites = C.visites.map(v => {
    if (v.aime) return v;
    let aid = '';
    if (v.visiteur) { const c = newContact({ nom: v.visiteur, tel: v.tel || '', email: v.email || '', roles: { vendeur: false, acquereur: true }, next: { date: '', action: 'appeler', note: '' } }); C.contacts.push(c); aid = c.id; }
    return newVisite({ id: v.id, dossierId: v.dossierId, acquereurId: aid, quand: v.quand, statut: v.statut === 'faite' ? 'realisee' : v.statut === 'annulee' ? 'annulee' : 'prevue',
      interet: v.interet || '', suite: { reflexion: 'reflexion', '2e': '2e', offre: 'offre', non: 'non' }[v.suite] || '', commentaire: v.retour || '', crFait: v.statut === 'faite' });
  });
  return C;
}

/* ---------- Dossier depuis un contact / une estimation ---------- */
function bienFromContact(c, phase) {
  const d = newDossier({ phase: phase || 'estimation' });
  d.vendeurs = [personFromContact(c)];
  Object.assign(d.bien, { adresse: c.vend.bienAdresse || '', ville: c.vend.bienVille || '', type: c.vend.bienType || 'Appartement' });
  d.vente.origine = c.origine || '';
  log(d, `Bien créé depuis la fiche de ${cName(c)}`);
  App.dossiers.push(d); saveDossier(d, true);
  if (c.vend.statut !== 'sans_suite') c.vend.statut = 'client';
  return d;
}

/* ---------- Ajout rapide ---------- */
function quickAddMenu() {
  openModal('Ajouter', `<div class="quick-grid">
    <button class="qa" data-a="contactNew" data-role="vendeur"><span>🏠</span>Prospect vendeur</button><button class="qa" data-a="contactNew" data-role="acquereur"><span>🔑</span>Acquéreur</button>
    <button class="qa" data-a="estimNew"><span>📐</span>Nouvelle estimation</button><button class="qa" data-a="visiteNew"><span>🚪</span>Ajouter une visite de bien</button>
    <button class="qa" data-a="newDossier"><span>📝</span>Bien / mandat</button><button class="qa" data-a="importPdf" data-kind="mandat"><span>📄</span>Importer un mandat PDF</button></div>`);
}
function contactNewModal(role) {
  openModal(role === 'acquereur' ? 'Nouvel acquéreur' : 'Nouveau prospect vendeur', `<div class="grid4">
    <label class="field"><span>Civilité</span><select id="n_civ"><option></option><option>M.</option><option>Mme</option><option>M. et Mme</option></select></label><label class="field"><span>Prénom</span><input id="n_prenom"></label><label class="field span2"><span>Nom</span><input id="n_nom" autofocus></label>
    <label class="field span2"><span>Téléphone</span><input id="n_tel" type="tel" inputmode="tel"></label><label class="field span2"><span>E-mail</span><input id="n_email" type="email"></label>
    ${role === 'acquereur' ? `<label class="field span2"><span>Budget max (€)</span><input id="n_budget" type="number"></label><label class="field span2"><span>Secteurs</span><input id="n_sect"></label>`
      : `<label class="field span2"><span>Adresse du bien</span><input id="n_badr"></label><label class="field"><span>Ville</span><input id="n_bville"></label>`}
    <label class="field"><span>Origine</span><select id="n_orig"><option></option>${ORIGINES.map(o => `<option>${o}</option>`).join('')}</select></label>
    <label class="field span2"><span>Prochaine action</span><select id="n_act">${optList(ACTIONS_NEXT, role === 'acquereur' ? 'appeler' : 'estimation')}</select></label><label class="field span2"><span>Le</span><input type="date" id="n_date" value="${addDays(today(), 1)}"></label></div>
    <div class="row modal-actions"><button class="btn primary" data-a="contactCreate" data-role="${role}">Créer la fiche</button></div>`, { wide: true });
}
function visiteNewModal(o = {}) {
  const v = newVisite({ dossierId: o.bien || '', acquereurId: o.acq || '' });
  App.crm.visites.push(v); saveCrm(true); closeModal(); location.hash = '#/v/' + v.id;
}

/* ---------- Actions ---------- */
Object.assign(ACT, {
  quickAdd: quickAddMenu, demoAll,
  contactNew(el) { contactNewModal(el.dataset.role || 'vendeur'); },
  contactCreate(el) {
    const v = id => ($('#' + id) || {}).value || '', role = el.dataset.role;
    if (!v('n_nom').trim() && !v('n_tel').trim()) return toast('Indiquez au moins un nom ou un téléphone.', 'err');
    const c = newContact({ civ: v('n_civ'), prenom: v('n_prenom').trim(), nom: v('n_nom').trim(), tel: v('n_tel').trim(), email: v('n_email').trim(), origine: v('n_orig'),
      roles: { vendeur: role !== 'acquereur', acquereur: role === 'acquereur' }, next: { date: v('n_date'), action: v('n_act'), note: '' } });
    if (role === 'acquereur') Object.assign(c.acq, { budget: num(v('n_budget')) ?? '', secteurs: v('n_sect') }); else Object.assign(c.vend, { bienAdresse: v('n_badr'), bienVille: v('n_bville') });
    App.crm.contacts.push(c); saveCrm(true); closeModal(); location.hash = '#/c/' + c.id; toast('Fiche créée');
  },
  contactFilter(el) { App.flt.contacts = { ...(App.flt.contacts || { q: '' }), s: el.dataset.s }; rerender(); },
  contactDel(el) {
    if (!confirmBox('Supprimer ce contact ? Les biens et visites liés sont conservés.')) return;
    App.crm.contacts = App.crm.contacts.filter(c => c.id !== el.dataset.cid); saveCrm(true); location.hash = '#/contacts';
  },
  copyMail(el) {
    const c = contactById(el.dataset.cid); const msg = messageRelance(c);
    copyModal('E-mail à ' + cName(c), c.email, 'Votre projet immobilier', msg.replace(/^Bonjour ([^,]*), c’est ([^.]*)\./, 'Bonjour $1,\n\n') + '\n\n' + signature());
  },
  echangeQuick(el) { openEchange(el.dataset.cid); },
  chipOne(el) { el.parentElement.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === el)); },
  setDateIn(el) { $('#' + el.dataset.target).value = el.dataset.n === '' ? '' : addDays(today(), +el.dataset.n); },
  echangeSave(el) {
    const c = contactById(el.dataset.cid), on = sel => ($(sel + ' .chip.on') || {}).dataset;
    const ex = { id: uid(), date: $('#x_date').value || today(), canal: (on('#x_canal') || {}).v || 'appel', resume: $('#x_resume').value.trim(), resultat: (on('#x_res') || {}).v || '' };
    c.echanges = c.echanges || []; c.echanges.push(ex);
    c.next = { date: $('#x_nextd').value, action: $('#x_next').value, note: '' };
    if (c.vend.statut === 'a_contacter' && ['Joint', 'Rendez-vous fixé', 'Intéressé'].includes(ex.resultat)) c.vend.statut = ex.resultat === 'Rendez-vous fixé' ? 'rdv' : 'contact';
    biensOf(c).forEach(d => { if (d.vendeurs.some(p => p.contactId === c.id)) { d.com.dernierEchangeVendeur = ex.date; log(d, `Échange avec ${cName(c)} : ${ex.resume || ex.resultat}`, 'note'); } });
    saveCrm(true); closeModal(); rerender(); toast('Échange noté' + (c.next.date ? ' · prochaine action le ' + fdate(c.next.date) : ''));
  },
  nextIn(el) { const c = contactById(el.dataset.cid); c.next.date = addDays(today(), +el.dataset.n); saveCrm(); rerender(); },
  estimFromContact(el) {
    const c = contactById(el.dataset.cid); let d = biensOf(c).find(x => x.phase === 'estimation') || bienFromContact(c, 'estimation');
    const e = newEstimation({ contactId: c.id, dossierId: d.id }); d.estimationId = e.id; App.crm.estimations.push(e); saveCrm(true); saveDossier(d, true);
    location.hash = '#/e/' + e.id;
  },
  bienFromContact(el) { const c = contactById(el.dataset.cid), d = bienFromContact(c, 'mandat'); saveCrm(true); location.hash = `#/d/${d.id}/fiche`; },
  estimNew() {
    openModal('Nouvelle estimation', `<p>Pour quel propriétaire ?</p><label class="field"><span>Contact existant</span><select id="en_c"><option value="">— Nouveau contact —</option>${App.crm.contacts.filter(c => c.roles.vendeur).map(c => `<option value="${c.id}">${esc(cName(c))}</option>`).join('')}</select></label>
      <div class="grid4"><label class="field span2"><span>Nom (nouveau contact)</span><input id="en_nom"></label><label class="field span2"><span>Téléphone</span><input id="en_tel" type="tel"></label><label class="field span2"><span>Adresse du bien</span><input id="en_adr"></label><label class="field span2"><span>Ville</span><input id="en_ville"></label></div>
      <div class="row modal-actions"><button class="btn primary" data-a="estimCreate">Créer</button></div>`);
  },
  estimCreate() {
    let c = contactById($('#en_c').value);
    if (!c) { c = newContact({ nom: $('#en_nom').value.trim(), tel: $('#en_tel').value.trim(), vend: { ...newContact().vend, statut: 'client', bienAdresse: $('#en_adr').value.trim(), bienVille: $('#en_ville').value.trim() } }); App.crm.contacts.push(c); }
    closeModal(); ACT.estimFromContact({ dataset: { cid: c.id } });
  },
  estimMakeBien(el) { const e = App.crm.estimations.find(x => x.id === el.dataset.id), c = contactById(e.contactId) || newContact(); const d = bienFromContact(c, 'estimation'); e.dossierId = d.id; saveCrm(true); rerender(); },
  compAdd(el) { const e = App.crm.estimations.find(x => x.id === el.dataset.id); e.rendu.comparables.push({ adresse: '', surface: '', prix: '', statut: 'Vendu' }); saveCrm(); rerender(); },
  async renduPdf(el) { printHtml(await renduHtml(App.crm.estimations.find(x => x.id === el.dataset.id))); },
  async renduSave(el) {
    const e = App.crm.estimations.find(x => x.id === el.dataset.id), d = estBien(e); if (!d) return toast('Rattachez d’abord un bien.', 'err');
    const html = await renduHtml(e), blob = new Blob([html], { type: 'text/html' });
    await Store.putFile({ id: uid(), dossierId: d.id, pieceId: 'rapport_estim', name: `Rendu_estimation_${today()}.html`, type: 'text/html', size: blob.size, blob, addedAt: Date.now() });
    log(d, 'Rendu d’estimation enregistré'); toast('Rendu enregistré dans les pièces du bien (versions conservées)');
  },
  renduMail(el) { const e = App.crm.estimations.find(x => x.id === el.dataset.id), m = renduMailText(e), d = estBien(e); copyModal('Envoi du rendu d’estimation', m.to, m.subject, m.body, d); },
  async renduAi(el) {
    const e = App.crm.estimations.find(x => x.id === el.dataset.id), d = estBien(e);
    const data = { bien: d ? { adresse: dossierTitle(d), ...d.bien, lots: lotsText(d), copro: coproRows(d) } : {}, valeur: { bas: e.prixBas, haut: e.prixHaut, recommande: e.prixReco, attendu_par_vendeur: e.prixAttendu }, rendu: e.rendu };
    const out = await withAi(el, () => aiAsk(AI_SYSTEM, `À partir de ces informations d’estimation (JSON), rédige le paragraphe « Analyse et justification du prix » d’un avis de valeur (120 à 200 mots), en t’appuyant sur les caractéristiques, la copropriété et les comparables fournis.\n${JSON.stringify(data)}`, 2000));
    if (out) { e.rendu.analyse = out; saveCrm(); rerender(); toast('Analyse rédigée — relisez-la.'); }
  },
  estim2mandat(el) {
    const e = App.crm.estimations.find(x => x.id === el.dataset.id); let d = estBien(e);
    if (!d) { const c = contactById(e.contactId) || newContact(); d = bienFromContact(c, 'mandat'); e.dossierId = d.id; }
    e.issue = 'mandat'; d.phase = 'mandat'; d.mandat.statut = 'a_signer'; if (num(e.prixReco)) { d.mandat.prix = e.prixReco; d.com.prixLancement = e.prixReco; }
    log(d, 'Estimation transformée en mandat'); saveDossier(d, true); saveCrm(true); location.hash = `#/d/${d.id}/fiche`; toast('Mandat à signer — complétez la fiche.');
  },
  estimDel(el) { if (!confirmBox('Supprimer cette estimation ?')) return; App.crm.estimations = App.crm.estimations.filter(x => x.id !== el.dataset.id); saveCrm(true); location.hash = '#/estimations'; },
  comInc(el) { const d = App.current; d.com[el.dataset.k] = Math.max(0, (num(d.com[el.dataset.k]) || 0) + +el.dataset.n); saveDossier(); rerender(); },
  prixChange() {
    const d = App.current;
    openModal('Modifier le prix', `<div class="grid4"><label class="field span2"><span>Nouveau prix (€)</span><input type="number" id="pc_p" value="${prixActuel(d) || ''}" autofocus></label><label class="field span2"><span>Motif</span><input id="pc_m" placeholder="ex. baisse après bilan vendeur"></label></div>
      <p class="small muted">L’ancien prix est conservé dans l’historique du bien et du mandat. Pensez à l’avenant au mandat.</p><div class="row modal-actions"><button class="btn primary" data-a="prixSave">Enregistrer</button></div>`);
  },
  prixSave() {
    const d = App.current, p = num($('#pc_p').value); if (!p) return;
    if (!d.com.historiquePrix.length && prixActuel(d)) d.com.historiquePrix.push({ date: d.com.dateEntree || d.mandat.date || today(), prix: prixActuel(d), motif: 'Prix de lancement' });
    if (!num(d.com.prixLancement)) d.com.prixLancement = prixActuel(d) || p;
    d.com.historiquePrix.push({ date: today(), prix: p, motif: $('#pc_m').value.trim() }); d.com.prixActuel = p;
    d.mandat.historique.push({ date: today(), txt: `Prix modifié : ${eur(p)}${$('#pc_m').value.trim() ? ' (' + $('#pc_m').value.trim() + ')' : ''}` });
    log(d, 'Nouveau prix : ' + eur(p)); saveDossier(); closeModal(); rerender();
  },
  supportAdd() { App.current.com.supports.push({ nom: '', url: '' }); saveDossier(); rerender(); },
  supportDel(el) { App.current.com.supports.splice(+el.dataset.i, 1); saveDossier(); rerender(); },
  comActAdd(el) { const t = el.dataset.t || $('#comActTxt').value.trim(); if (!t) return; App.current.com.actions.push({ id: uid(), txt: t, done: false, date: today() }); saveDossier(); rerender(); },
  comActDel(el) { App.current.com.actions.splice(+el.dataset.i, 1); saveDossier(); rerender(); },
  atoutToggle(el) { const A = App.current.com.annonce; A.atouts = A.atouts || []; const i = A.atouts.indexOf(el.dataset.v); i >= 0 ? A.atouts.splice(i, 1) : A.atouts.push(el.dataset.v); saveDossier(); rerender(); },
  async annonceGen(el) {
    const d = App.current, base = annonceTemplate(d);
    if (aiOn()) {
      const data = { bien: d.bien, lots: lotsText(d), copro: coproRows(d), prix: prixActuel(d), atouts: d.com.annonce.atouts, etat: d.com.annonce.etat, ton: d.com.annonce.ton };
      const out = await withAi(el, () => aiAsk(AI_SYSTEM, `Rédige une annonce immobilière professionnelle et commerciale (ton : ${d.com.annonce.ton}) à partir de ces informations (JSON). Première ligne : un titre accrocheur de moins de 70 caractères. Puis une ligne vide, puis le texte de l’annonce (130 à 220 mots). N’ajoute pas les mentions légales : elles sont ajoutées séparément.\n${JSON.stringify(data)}`, 2000));
      if (out) { const [t, ...rest] = out.split('\n'); d.com.annonce.titre = t.replace(/^titre\s*:\s*/i, '').trim(); d.com.annonce.texte = rest.join('\n').trim(); saveDossier(); rerender(); return; }
    }
    d.com.annonce.titre = base.titre; d.com.annonce.texte = base.texte; saveDossier(); rerender(); toast('Annonce rédigée — personnalisez-la.');
  },
  annonceCopy(el) { const d = App.current, A = d.com.annonce; copyText(el.dataset.w === 'titre' ? A.titre : `${A.titre}\n\n${A.texte}\n\n${annonceMentions(d)}`); },
  async ficheCom(el) { const d = App.dossiers.find(x => x.id === (el.dataset.id || App.current.id)); printHtml(await ficheHtml(d)); },
  ficheFromTool() { const id = $('#tb_bien').value; if (!id) return toast('Choisissez un bien.', 'err'); ACT.ficheCom({ dataset: { id } }); },
  annonceFromTool() { const id = $('#tb_bien').value; if (!id) return toast('Choisissez un bien.', 'err'); location.hash = `#/d/${id}/commercialisation`; },
  async bilanVendeur(el) {
    const d = App.current; let text = bilanText(d);
    if (aiOn()) { const B = bilanData(d); const out = await withAi(el, () => aiAsk(AI_SYSTEM, `Rédige le compte rendu de commercialisation adressé au(x) propriétaire(s) (${civilite(d.vendeurs)}) à partir de ces données (JSON). Factuel, constructif, avec une recommandation. Termine par la signature fournie.\n${JSON.stringify({ bien: dossierTitle(d), prix: prixActuel(d), demandes: d.com.demandes, offres: d.com.offres, jours_en_vente: B.jours, visites: B.vis.length, interesses: B.forts, apprecie: B.aime, reserves: B.obj, actions: B.actions, historique_prix: d.com.historiquePrix, signature: signature() })}`, 2500)); if (out) text = out; }
    App.bilanTxt = text;
    openModal('Bilan vendeur', `<textarea id="bl_txt" rows="16">${esc(text)}</textarea><div class="row gap wrap modal-actions"><button class="btn primary" data-a="bilanMail">✉️ Mail au propriétaire</button><button class="btn" data-a="bilanPdf">🖨️ PDF</button><button class="btn ghost" data-a="bilanDone">✔ Marquer comme envoyé aujourd’hui</button></div>`, { wide: true });
  },
  bilanMail() { const d = App.current, t = $('#bl_txt').value; closeModal(); openCompose(d, { canal: 'vendeur', subject: 'Point sur la commercialisation — ' + dossierTitle(d), body: t, title: 'Bilan vendeur' }); App.compose.onDone = () => { d.com.dernierBilan = today(); }; },
  bilanPdf() { printHtml(bilanHtml(App.current, $('#bl_txt').value)); },
  bilanDone() { const d = App.current; d.com.dernierBilan = today(); log(d, 'Bilan vendeur envoyé'); saveDossier(); closeModal(); rerender(); },
  mEchAdd() { App.current.mandat.echeances.push({ label: '', date: '' }); saveDossier(); rerender(); },
  mEchDel(el) { App.current.mandat.echeances.splice(+el.dataset.i, 1); saveDossier(); rerender(); },
  mandatNouveau() {
    const d = App.current; if (!confirmBox('Clore le mandat actuel (conservé dans l’historique) et en démarrer un nouveau ?')) return;
    d.mandatsHisto.push({ ...structuredClone(d.mandat), statut: d.mandat.statut === 'actif' ? 'termine' : d.mandat.statut });
    d.mandat = { ...d.mandat, numero: '', date: today(), statut: 'a_signer', dateEffet: '', echeances: [], historique: [{ date: today(), txt: 'Nouveau mandat' }] };
    log(d, 'Nouveau mandat démarré'); saveDossier(); rerender();
  },
  visiteNew(el) { visiteNewModal({ bien: el.dataset.bien || (App.current && App.current.id) || '', acq: el.dataset.acq || '' }); },
  visiteNewAcq(el) {
    const v = App.crm.visites.find(x => x.id === el.dataset.id), nom = prompt('Nom du visiteur'); if (!nom) return;
    const c = newContact({ nom, roles: { vendeur: false, acquereur: true }, next: { date: '', action: 'appeler', note: '' } }); App.crm.contacts.push(c); v.acquereurId = c.id; saveCrm(true); rerender();
  },
  chipToggle(el) { const v = App.crm.visites.find(x => x.id === el.dataset.id), arr = getPath(v, el.dataset.path) || []; const i = arr.indexOf(el.dataset.v); i >= 0 ? arr.splice(i, 1) : arr.push(el.dataset.v); setPath(v, el.dataset.path, arr); saveCrm(); el.classList.toggle('on'); },
  chipSet(el) { const v = App.crm.visites.find(x => x.id === el.dataset.id); setPath(v, el.dataset.path, getPath(v, el.dataset.path) === el.dataset.v ? '' : el.dataset.v); if (v.statut === 'prevue' || v.statut === 'confirmee') v.statut = 'realisee'; saveCrm(); rerender(); },
  async crGen(el) {
    const v = App.crm.visites.find(x => x.id === el.dataset.id); await crGenerate(v, el); v.crFait = true;
    if (v.suite && v.acquereurId) { const q = contactById(v.acquereurId); if (q && v.rappel) q.next = { date: v.rappel, action: 'appeler', note: 'Suite visite' }; }
    const d = App.dossiers.find(x => x.id === v.dossierId); if (d) { log(d, `Compte rendu de visite (${fdatetime(v.quand)})`, 'note'); }
    saveCrm(true); rerender(); toast('Comptes rendus prêts — relisez-les.');
  },
  crPdf(el) { printHtml(crPdfHtml(App.crm.visites.find(x => x.id === el.dataset.id))); },
  crMail(el) {
    const v = App.crm.visites.find(x => x.id === el.dataset.id), d = App.dossiers.find(x => x.id === v.dossierId), q = contactById(v.acquereurId);
    if (!v.crVendeur) { const t = crTemplate(v); v.crVendeur = t.vend; v.crVisiteur = t.visit; }
    if (el.dataset.to === 'vendeur') { copyModal('Compte rendu au propriétaire', d ? d.vendeurs.map(p => p.email).filter(Boolean).join(', ') : '', `Compte rendu de visite — ${d ? dossierTitle(d) : ''}`, v.crVendeur, d); if (d) App.compose.onDone = () => { d.com.dernierBilan = today(); }; }
    else copyModal('Message au visiteur', q ? q.email : '', `Suite à votre visite — ${d ? dossierTitle(d) : ''}`, v.crVisiteur);
  },
  visiteDel(el) { if (!confirmBox('Supprimer cette visite ?')) return; App.crm.visites = App.crm.visites.filter(x => x.id !== el.dataset.id); saveCrm(true); location.hash = '#/visites'; },
  offreTool(el) {
    const d = App.dossiers.find(x => x.id === $('#to_bien').value); if (!d) return toast('Choisissez un bien.', 'err');
    const q = contactById($('#to_acq').value), html = offreModeleHtml(d, q, { prixPre: $('#to_pre').checked, prix: $('#to_prix').value });
    const name = `Offre_achat_${slug(dossierTitle(d))}_${today()}`;
    if (el.dataset.how === 'print') printHtml(html); else if (el.dataset.how === 'word') download(name + '.doc', wordBlob(html));
    else { const blob = new Blob([html], { type: 'text/html' }); Store.putFile({ id: uid(), dossierId: d.id, pieceId: 'acq_offre', name: name + '.html', type: 'text/html', size: blob.size, blob, addedAt: Date.now() }).then(() => toast('Rangée dans les pièces du bien')); }
  },
  async mailTool(el) {
    const o = { cid: $('#tm_c').value, role: $('#tm_role').value, ton: $('#tm_ton').value, nom: $('#tm_nom').value.trim(), did: $('#tm_bien').value, objectif: $('#tm_obj').value.trim() };
    if (!o.objectif) return toast('Indiquez l’objectif du mail.', 'err');
    let m = mailTemplate(o); const d = o.did ? App.dossiers.find(x => x.id === o.did) : null, c = contactById(o.cid);
    if (aiOn()) {
      const ctx = { destinataire: c ? cName(c) : o.nom, role: o.role, ton: o.ton, objectif: o.objectif, bien: d ? { adresse: dossierTitle(d), type: d.bien.type, prix: prixActuel(d), etape: phaseDef(d.phase).label, vendeurs: names(d.vendeurs), acquereurs: names(d.acquereurs), copro: coproRows(d) } : null, signature: signature() };
      const out = await withAi(el, () => aiAsk(AI_SYSTEM, `Rédige un e-mail. Première ligne : « Objet : … ». Puis une ligne vide, puis le corps du mail terminé par la signature fournie. Contexte (JSON) :\n${JSON.stringify(ctx)}`, 2000));
      if (out) { const mm = out.match(/^objet\s*:\s*(.+)$/im); m = { to: m.to, subject: mm ? mm[1].trim() : m.subject, body: out.replace(/^objet\s*:.*\n+/im, '').trim() }; }
    }
    copyModal('E-mail prêt à copier', m.to, m.subject, m.body, d && c && d.vendeurs.concat(d.acquereurs).some(p => p.contactId === c.id) ? d : null);
  },
  cmCopy(el) { copyText($('#' + el.dataset.f).value); },
  factureOpen(el) { App.factureBien = el.dataset.id || ''; location.hash = '#/outils/facture'; },
  factureType(el) { const a = App.settings.agent; if (el.value === 'reseau') { $('#fa_client').value = a.reseau || ''; $('#fa_adr').value = ''; $('#fa_des').value = $('#fa_des').value.replace(/^Honoraires de négociation/, 'Commission sur honoraires de négociation'); } },
  factureDo(el) {
    const o = factureValues(), d = App.dossiers.find(x => x.id === o.bienId);
    if (!num(o.montant)) return toast('Indiquez le montant.', 'err');
    const html = factureHtml(o), name = `Facture_${o.numero}_${slug(o.client || 'client')}`;
    if (el.dataset.how === 'print') printHtml(html);
    else if (el.dataset.how === 'word') download(name + '.doc', wordBlob(html));
    else {
      if (!d) return toast('Choisissez le bien pour ranger la facture.', 'err');
      const blob = new Blob([html], { type: 'text/html' });
      Store.putFile({ id: uid(), dossierId: d.id, pieceId: 'facture_honoraires', name: name + '.html', type: 'text/html', size: blob.size, blob, addedAt: Date.now() });
      if (o.destType === 'client') { d.vente.honoFacture = num(o.montant); d.vente.honoFactureDate = o.date; }
      const st = pstate(d, 'facture_honoraires'); st.s = 'R'; st.dr = o.date; st.ex = 'N° ' + o.numero;
      log(d, `Facture d’honoraires n° ${o.numero} : ${eur(o.montant, 2)}`); saveDossier(d, true);
      toast('Facture rangée dans le dossier');
    }
    const n = (o.numero.match(/(\d+)$/) || [])[1];
    if (n && +n >= (num(App.settings.agent.factureNext) || 1)) { App.settings.agent.factureNext = +n + 1; saveSettings(); }
  },
  equipToggle() { App.open.equip = !App.open.equip; rerender(); },
  equipSet(el) { const E = (App.current.copro.equip = App.current.copro.equip || {}); E[el.dataset.k] = E[el.dataset.k] === el.dataset.v ? '' : el.dataset.v; saveDossier(); rerender(); },
  pedMode(el) { App.current.ped.mode = el.dataset.v; saveDossier(); rerender(); },
  pedCA() {
    const d = App.current, m = pedMailCA(d);
    openCompose(d, { canal: 'autre', to: m.to, subject: m.subject, body: m.body, title: `Demande à ${COPRO_ASSISTANCE.nom} — 📞 ${COPRO_ASSISTANCE.tel}` });
    App.compose.onDone = () => { if (!d.ped.commandeLe) d.ped.commandeLe = today(); d.ped.prestataire = 'copro-assistance'; };
  },
  pieceQuick(el) {
    const d = App.current, st = pstate(d, el.dataset.id); st.s = st.s === el.dataset.s ? '' : el.dataset.s;
    if (['R', 'P'].includes(st.s) && !st.dr) st.dr = today();
    log(d, `${pieceDef(el.dataset.id).label} → ${PIECE_STATUTS.find(x => x.id === st.s).label}`); saveDossier(); rerender();
  },
  pwToggle(el) { const i = el.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; },
  profilSave, profilCancel() { App.profilDirty = false; rerender(); },
  createDossier() {
    const v = id => $('#' + id).value.trim();
    const c = newContact({ civ: v('n_civ'), prenom: v('n_prenom'), nom: v('n_nom'), email: v('n_email'), vend: { ...newContact().vend, statut: 'client', bienAdresse: v('n_adr'), bienVille: v('n_ville') }, next: { date: '', action: 'appeler', note: '' } });
    if (c.nom || c.email) App.crm.contacts.push(c);
    const d = newDossier({ phase: 'mandat' }); Object.assign(d.bien, { adresse: v('n_adr'), cp: v('n_cp'), ville: v('n_ville') });
    d.vendeurs = [c.nom || c.email ? personFromContact(c) : newPerson()];
    Object.assign(d.mandat, { type: v('n_type'), numero: v('n_num'), prix: num(v('n_prix')) ?? '', statut: 'a_signer' });
    if (v('n_lots')) d.lots = v('n_lots').split(/[,;\s]+/).filter(Boolean).map((n, i) => ({ num: n, nature: i ? '' : 'Appartement', tantiemes: '', obs: '' }));
    App.dossiers.push(d); saveDossier(d, true); saveCrm(true); closeModal(); location.hash = `#/d/${d.id}/fiche`;
  },
});

/* Appel / SMS : proposer de noter l'échange au retour dans l'application */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-log]'); if (!a) return;
  const cid = a.dataset.cid, canal = a.dataset.log;
  const once = () => { document.removeEventListener('visibilitychange', vis); setTimeout(() => { openEchange(cid); const b = $(`#x_canal [data-v="${canal}"]`); if (b) ACT.chipOne(b); }, 300); };
  const vis = () => { if (document.visibilityState === 'visible') once(); };
  document.addEventListener('visibilitychange', vis);
  setTimeout(() => { if (document.visibilityState === 'visible' && $('#modal').hidden) { document.removeEventListener('visibilitychange', vis); once(); } }, 2500);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'fa_bien') { App.factureBien = el.value; rerender(); return; }
  if (el.matches && el.matches('input[data-estim-upload]') && el.files[0]) {
    const est = App.crm.estimations.find(x => x.id === el.dataset.estimUpload), d = estBien(est); if (!d) return toast('Rattachez d’abord un bien.', 'err');
    const f = el.files[0]; Store.putFile({ id: uid(), dossierId: d.id, pieceId: 'rapport_estim', name: f.name, type: f.type, size: f.size, blob: f, addedAt: Date.now() }).then(() => { log(d, 'Rapport d’estimation importé : ' + f.name); toast('Rapport importé (versions conservées dans les pièces)'); });
    el.value = '';
  }
});
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.p !== undefined) profilDirty();
  if (e.target.dataset && e.target.dataset.t === 'q_contacts') App.flt.contacts = { ...(App.flt.contacts || { s: 'tous' }), q: e.target.value };
});
document.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr && !e.target.closest('a,button')) location.hash = tr.dataset.href; });
window.addEventListener('beforeunload', e => { if (App.profilDirty) { e.preventDefault(); e.returnValue = ''; } });
(() => {
  const tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.append(tip);
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !t.dataset.tip) { tip.classList.remove('on'); return; }
    tip.textContent = t.dataset.tip; tip.classList.add('on'); tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 16) + 'px';
  });
})();

/* Données d'exemple : voir demo.js */

boot();
