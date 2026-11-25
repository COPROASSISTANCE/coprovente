/* =========================================================================
   CoproVente — pages générales, actions, import PDF, sauvegarde, démarrage
   ========================================================================= */

/* ---------- Modèles de mails ---------- */
const VAR_HELP = ['ref', 'adresse', 'adresse_complete', 'lots', 'vendeur_noms', 'vendeur_civilite', 'acquereur_noms', 'acquereur_civilite', 'copro_nom', 'syndic_nom', 'notaire_nom',
  'mandat_numero', 'prix_mandat', 'offre_prix', 'offre_validite', 'offre_financement', 'honoraires_montant', 'honoraires_charge', 'date_compromis', 'date_fin_retractation',
  'date_pret', 'date_acte', 'pieces_manquantes_vendeur', 'pieces_manquantes_copro', 'pieces_manquantes_extranet', 'pieces_recues', 'signaux', 'ped_contact', 'signature'];
function viewModeles() {
  const ts = allTemplates().filter(t => t.id !== 'ped_commande');
  return `<div class="page-head"><div><h1>Modèles de mails</h1><p class="muted">Les variables entre {{doubles accolades}} sont remplies automatiquement depuis le dossier.</p></div>
    <button class="btn primary" data-a="editTpl" data-id="">＋ Nouveau modèle</button></div>
  ${CANAUX.map(c => `<section class="card"><h2>${c.icon} ${c.label}</h2><ul class="tpl-list">${ts.filter(t => t.canal === c.id).map(t => `<li><div><b>${esc(t.titre)}</b>${t.modified ? ' <span class="tag">modifié</span>' : ''}${t.custom ? ' <span class="tag">perso</span>' : ''}<small class="muted">${esc(t.sujet)}</small></div><button class="btn small" data-a="editTpl" data-id="${t.id}">Modifier</button></li>`).join('') || '<li class="muted">—</li>'}</ul></section>`).join('')}
  <section class="card"><h2>Variables disponibles</h2><p class="small">${VAR_HELP.map(v => `<code>{{${v}}}</code>`).join(' ')}</p></section>`;
}
function editTpl(id) {
  const t = id ? allTemplates().find(x => x.id === id) : { id: '', canal: 'vendeur', titre: '', sujet: '', corps: '\n\n{{signature}}' };
  openModal(id ? 'Modifier le modèle' : 'Nouveau modèle', `<div class="grid4">
    <label class="field span2"><span>Titre</span><input id="t_titre" value="${esc(t.titre)}"></label>
    <label class="field span2"><span>Fil</span><select id="t_canal">${CANAUX.map(c => `<option value="${c.id}" ${c.id === t.canal ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
    <label class="field span4"><span>Objet</span><input id="t_sujet" value="${esc(t.sujet)}"></label>
    <label class="field span4"><span>Corps</span><textarea id="t_corps" rows="16">${esc(t.corps)}</textarea></label></div>
    <div class="row gap modal-actions"><button class="btn primary" data-a="saveTpl" data-id="${esc(t.id)}" data-custom="${t.custom || !id ? 1 : ''}">Enregistrer</button>
    ${t.modified ? `<button class="btn" data-a="resetTpl" data-id="${t.id}">Rétablir l’original</button>` : ''}${t.custom ? `<button class="btn danger" data-a="delTpl" data-id="${t.id}">Supprimer</button>` : ''}</div>`, { wide: true });
}

/* ---------- Outils ---------- */
App.tools = { prix: 250000, honPct: 5, honMode: 'acquereur', fnPrix: 250000, fnMeubles: 0, fnDmto: 5.81, tfMontant: 1200, tfDate: today(), qpGlobal: 12000, qpTant: 125, qpCle: 10000,
  rtDate: today(), dgType: 'erp', dgDate: today(), prCap: 200000, prTaux: 3.5, prDuree: 20, gq: '' };
function emolumentsNotaire(p) {
  const tr = [[6500, 3.870], [17000, 1.596], [60000, 1.064], [Infinity, 0.799]];
  let prev = 0, tot = 0;
  for (const [lim, r] of tr) { if (p > prev) tot += (Math.min(p, lim) - prev) * r / 100; prev = lim; }
  return tot;
}
function tinput(key, label, type = 'number', extra = '') {
  return `<label class="field"><span>${label}</span><input type="${type}" data-t="${key}" value="${esc(App.tools[key])}" ${extra}></label>`;
}
function viewOutils() {
  const T = App.tools, n = k => Number(T[k]) || 0;
  // Honoraires
  let hon, net, fai;
  if (T.honMode === 'acquereur') { net = n('prix'); hon = net * n('honPct') / 100; fai = net + hon; } else { fai = n('prix'); hon = fai * n('honPct') / 100; net = fai - hon; }
  // Frais d'acquisition
  const base = Math.max(0, n('fnPrix') - n('fnMeubles')), dmto = base * n('fnDmto') / 100, emol = emolumentsNotaire(base) * 1.2, csi = Math.max(15, base * 0.001), deb = 1200;
  const fn = dmto + emol + csi + deb;
  // Taxe foncière
  const y = (T.tfDate || today()).slice(0, 4), dy = (new Date(+y, 1, 29).getMonth() === 1) ? 366 : 365;
  const rest = Math.max(0, Math.round((new Date(y + '-12-31T12:00:00') - new Date(T.tfDate + 'T12:00:00')) / 864e5));
  const tfAcq = n('tfMontant') * rest / dy;
  // Quote-part
  const qp = n('qpCle') ? n('qpGlobal') * n('qpTant') / n('qpCle') : 0;
  // Diagnostics
  const dg = PIECES.find(p => p.id === T.dgType);
  // Prêt
  const i = n('prTaux') / 100 / 12, N = n('prDuree') * 12, mens = i ? n('prCap') * i / (1 - Math.pow(1 + i, -N)) : n('prCap') / N;
  const out = (label, val) => `<div class="out"><span>${label}</span><b>${val}</b></div>`;
  return `<div class="page-head"><div><h1>Outils & calculateurs</h1><p class="muted">Estimations indicatives — à confirmer par le notaire ou le professionnel compétent.</p></div></div>
  <div class="tools">
  <section class="card"><h2>💼 Honoraires & net vendeur</h2><div class="grid2">${tinput('prix', T.honMode === 'acquereur' ? 'Prix net vendeur (€)' : 'Prix FAI (€)')}${tinput('honPct', 'Honoraires (%)', 'number', 'step="0.1"')}
    <label class="field"><span>Honoraires à la charge de</span><select data-t="honMode"><option value="acquereur" ${T.honMode === 'acquereur' ? 'selected' : ''}>Acquéreur (% du net)</option><option value="vendeur" ${T.honMode === 'vendeur' ? 'selected' : ''}>Vendeur (% du FAI)</option></select></label></div>
    ${out('Prix FAI', eur(fai))}${out('Honoraires TTC', eur(hon))}${out('Net vendeur', eur(net))}${T.honMode === 'acquereur' ? out('Mention annonce', (hon / net * 100).toFixed(2).replace('.', ',') + ' % TTC du prix hors honoraires') : ''}</section>
  <section class="card"><h2>🏛️ Frais d’acquisition (ancien)</h2><div class="grid2">${tinput('fnPrix', 'Prix net vendeur (€)')}${tinput('fnMeubles', 'Mobilier déductible (€)')}${tinput('fnDmto', 'Droits de mutation (%)', 'number', 'step="0.01"')}</div>
    <p class="small muted">5,81 % dans la plupart des départements ; jusqu’à 6,32 % là où le département a relevé son taux depuis 2025.</p>
    ${out('Droits de mutation', eur(dmto))}${out('Émoluments du notaire (TTC, barème)', eur(emol))}${out('Contribution de sécurité immobilière', eur(csi))}${out('Débours & formalités (forfait)', eur(deb))}${out('Total estimé', eur(fn) + ' ≈ ' + (base ? (fn / base * 100).toFixed(1) : 0) + ' %')}</section>
  <section class="card"><h2>🧾 Prorata de taxe foncière</h2><div class="grid2">${tinput('tfMontant', 'Taxe foncière annuelle (€)')}${tinput('tfDate', 'Date de l’acte', 'date')}</div>
    ${out('Jours restant à courir', rest + ' / ' + dy)}${out('Remboursement par l’acquéreur (usage)', eur(tfAcq, 2))}</section>
  <section class="card"><h2>➗ Quote-part selon les tantièmes</h2><div class="grid2">${tinput('qpGlobal', 'Montant global (€)')}${tinput('qpTant', 'Vos tantièmes')}${tinput('qpCle', 'Total de la clé')}</div>
    ${out('Votre part', eur(qp, 2))}<p class="small muted">Ne s’applique pas aux consommations individuelles, soldes, frais ou régularisations.</p></section>
  <section class="card"><h2>🗓️ Délai de rétractation (10 jours)</h2>${tinput('rtDate', 'Date de 1re présentation / remise', 'date')}
    ${out('Fin du délai', fdate(finRetractation(T.rtDate)))}<p class="small muted">Point de départ : lendemain de la première présentation. Prorogé au 1er jour ouvrable si le dernier jour est un samedi, dimanche ou jour férié.</p></section>
  <section class="card"><h2>🔎 Validité d’un diagnostic</h2><div class="grid2"><label class="field"><span>Diagnostic</span><select data-t="dgType">${PIECES.filter(p => p.cat === 'diag' && p.validite).map(p => `<option value="${p.id}" ${T.dgType === p.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label>${tinput('dgDate', 'Date de réalisation', 'date')}</div>
    ${out('Valide jusqu’au', dg && T.dgDate ? fdate(addMonths(T.dgDate, dg.validite)) : '—')}<p class="small muted">${esc(dg ? dg.hint : '')}</p></section>
  <section class="card"><h2>🏦 Mensualité de prêt (hors assurance)</h2><div class="grid2">${tinput('prCap', 'Capital (€)')}${tinput('prTaux', 'Taux (%)', 'number', 'step="0.01"')}${tinput('prDuree', 'Durée (ans)')}</div>
    ${out('Mensualité', eur(mens, 2))}${out('Coût des intérêts', eur(mens * N - n('prCap')))}</section>
  </div>`;
}

/* ---------- Guides ---------- */
function viewGuides() {
  const q = normalize(App.tools.gq);
  const gs = GUIDES.filter(g => !q || normalize(g.titre + ' ' + g.tags + ' ' + g.html.replace(/<[^>]+>/g, ' ')).includes(q));
  return `<div class="page-head"><div><h1>Guides & conseils</h1><p class="muted">Synthèse des guides pratiques Copro-Assistance (édition 2026). Information générale, sans substitution à un conseil personnalisé.</p></div>
    <input class="search" data-t="gq" value="${esc(App.tools.gq)}" placeholder="Rechercher : PV, fonds de travaux, extranet…"></div>
  ${gs.map((g, i) => `<details class="card guide" ${q || i === 0 ? 'open' : ''}><summary><h2>${esc(g.titre)}</h2></summary><div class="guide-body">${g.html}</div></details>`).join('') || '<p class="muted">Aucun résultat.</p>'}
  <section class="card cta"><h2>Besoin d’un pré-état daté ?</h2><p>${COPRO_ASSISTANCE.nom} réalise le dossier administratif et financier ${COPRO_ASSISTANCE.delai} pour ${COPRO_ASSISTANCE.prix}.</p>
    <a class="btn primary" href="${COPRO_ASSISTANCE.site}" target="_blank" rel="noopener">Copro-Assistance.fr</a></section>`;
}

/* ---------- Paramètres ---------- */
function viewParametres() {
  const s = { settings: true };
  return `<div class="page-head"><div><h1>Paramètres</h1><p class="muted">Tout est enregistré localement dans ce navigateur.</p></div></div>
  <section class="card row between wrap gap"><div><h2>👤 Mon profil</h2><p class="small muted">Nom, coordonnées, carte professionnelle, signature et objectif annuel.</p></div><a class="btn" href="#/profil">Modifier mon profil</a></section>
  <section class="card"><h2>✨ Assistant IA (facultatif)</h2>
    <p>Avec une clé API Claude, l’application rédige les comptes rendus de visite, annonces, bilans vendeur, analyses d’estimation et e-mails. Sans clé, une rédaction automatique à partir de modèles reste disponible.</p>
    <div class="grid4">${field('Clé API Claude (console.anthropic.com)', 'ai.key', { settings: true, type: 'password', cls: 'span3', ph: 'sk-ant-…', help: 'Stockée uniquement dans ce navigateur. Les données du dossier utiles à la rédaction sont envoyées à Anthropic à chaque génération ; l’usage est facturé sur votre compte Anthropic.' })}
    ${field('Modèle', 'ai.model', { settings: true, options: [['claude-opus-5-5', 'Claude Opus 5.5 (recommandé)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (économique)']] })}</div></section>
  <section class="card"><h2>⏱️ Délais d’alerte</h2><div class="grid4">
    ${field('Bien sans visite depuis (jours)', 'delais.inactivite', { settings: true, type: 'number' })}${field('Sans compte rendu vendeur depuis (jours)', 'delais.bilan', { settings: true, type: 'number' })}
    ${field('Relance après restitution d’estimation (jours)', 'delais.relanceEstim', { settings: true, type: 'number' })}${field('Rappel avant échéance de mandat (jours)', 'delais.rappelMandat', { settings: true, type: 'number' })}</div></section>
  <section class="card"><h2>💾 Sauvegarde & transfert</h2>
    <p>Vos données ne sont stockées que sur cet appareil. Exportez régulièrement une sauvegarde (dossiers + fichiers), par exemple vers votre Drive.</p>
    <div class="row gap wrap"><button class="btn primary" data-a="backup">⬇️ Exporter une sauvegarde complète</button><label class="btn">⬆️ Restaurer une sauvegarde<input type="file" accept=".json,application/json" hidden data-restore></label>
    <button class="btn" data-a="demo">Charger un dossier d’exemple</button></div></section>
  <section class="card"><h2>ℹ️ À propos</h2><p>CoproVente — application libre et gratuite (licence MIT) pour les agents et mandataires immobiliers. Contenus métier issus des guides pratiques de ${COPRO_ASSISTANCE.nom}. Informations générales : adaptez toujours au bien, à la copropriété et aux demandes de l’étude notariale.</p>
    <p class="right"><button class="btn danger small" data-a="wipe">Effacer toutes les données de cet appareil</button></p></section>`;
}

/* ---------- Import PDF (mandat / offre) ---------- */
async function pdfText(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let txt = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    const c = await (await pdf.getPage(i)).getTextContent();
    let lastY = null;
    c.items.forEach(it => { const yy = it.transform[5]; txt += (lastY !== null && Math.abs(yy - lastY) > 4 ? '\n' : ' ') + it.str; lastY = yy; });
    txt += '\n';
  }
  return txt.replace(/[ \t]+/g, ' ');
}
const parseEur = s => num(String(s).replace(/[\s .]/g, '').replace(',', '.'));
function extractFields(txt, kind) {
  const f = {}, T = txt.replace(/ /g, ' ');
  const m = (re, i = 1) => { const r = T.match(re); return r ? r[i].trim() : ''; };
  const toIso = s => { const r = s.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/); return r ? `${r[3]}-${r[2].padStart(2, '0')}-${r[1].padStart(2, '0')}` : ''; };
  f.numero = m(/mandat[^\n]{0,20}?n[°o]\s*:?\s*([A-Z0-9][A-Z0-9\-\/]{1,20})/i);
  f.type = /exclusi/i.test(T) ? (/semi[- ]?exclusi/i.test(T) ? 'semi' : 'exclusif') : (kind === 'mandat' ? 'simple' : '');
  const amounts = [...T.matchAll(/(\d{1,3}(?:[ .]\d{3})+|\d{4,7})(?:,\d{2})?\s*(?:€|euros?|EUR)/gi)].map(x => parseEur(x[0].replace(/€|euros?|EUR/gi, ''))).filter(x => x >= 1000);
  const prixCtx = m(/prix[^\n€]{0,120}?((?:\d{1,3}(?:[ .]\d{3})+|\d{4,7})(?:,\d{2})?)\s*(?:€|euros?)/i);
  f.prix = prixCtx ? parseEur(prixCtx) : (amounts.length ? Math.max(...amounts) : '');
  const honCtx = m(/honoraires[^\n€]{0,120}?((?:\d{1,3}(?:[ .]\d{3})+|\d{3,7})(?:,\d{2})?)\s*(?:€|euros?)/i);
  f.honoraires = honCtx ? parseEur(honCtx) : '';
  f.charge = /charge de l.acqu[ée]reur/i.test(T) ? 'acquereur' : /charge du vendeur/i.test(T) ? 'vendeur' : '';
  f.duree = m(/(?:dur[ée]e|p[ée]riode)[^\n]{0,60}?(\d{1,2})\s*mois/i) || m(/(\d{1,2})\s*mois/i);
  f.adresse = m(/(\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|av\.|boulevard|bd|place|all[ée]e|chemin|impasse|quai|cours|route|square|villa|passage)\s+[^\n,]{3,60})/i);
  const cpv = T.match(/\b((?:0[1-9]|[1-8]\d|9[0-5]|97)\d{3})\s+([A-ZÉÈÊÀÂÎÔÛÇ][A-Za-zÉÈÊÀÂÎÔÛÇéèêàâîôûç' -]{1,40})/);
  if (cpv) { f.cp = cpv[1]; f.ville = cpv[2].trim().split(/\s{2,}|\n/)[0]; }
  const lots = [...T.matchAll(/lots?\s*(?:n[°o]s?|num[ée]ros?)?\s*:?\s*((?:\d{1,5}\s*(?:,|et|&|-|\/)?\s*){1,8})/gi)].flatMap(x => x[1].match(/\d{1,5}/g) || []);
  f.lots = [...new Set(lots)].slice(0, 10).join(', ');
  f.surface = m(/(\d{1,4}(?:[,.]\d{1,2})?)\s*m(?:²|2)\b/i).replace(',', '.');
  f.emails = [...new Set(T.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [])].join(', ');
  f.tels = [...new Set((T.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g) || []).map(x => x.replace(/[\s.-]/g, '')))].join(', ');
  f.personnes = [...new Set([...T.matchAll(/\b(Monsieur|Madame|M\.|Mme)\s+([A-ZÉÈ][A-Za-zÉÈéèêëàâîïôöûüç'-]+(?:\s+[A-ZÉÈ][A-Za-zÉÈéèêëàâîïôöûüç'-]+){0,2})/g)].map(x => x[1] + ' ' + x[2]))].slice(0, 6).join(' ; ');
  const dates = [...T.matchAll(/\b\d{1,2}[\/.]\d{1,2}[\/.]\d{4}\b/g)].map(x => toIso(x[0])).filter(Boolean);
  f.date = dates[0] || '';
  f.validite = kind === 'offre' ? (toIso(m(/(?:valable|validit[ée])[^\n]{0,60}?(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})/i)) || '') : '';
  return f;
}
const IMPORT_FIELDS = {
  mandat: [['numero', 'N° de mandat', 'mandat.numero'], ['type', 'Type de mandat', 'mandat.type'], ['date', 'Date du mandat', 'mandat.date'], ['duree', 'Durée (mois)', 'mandat.duree'],
    ['prix', 'Prix (€)', 'mandat.prix'], ['honoraires', 'Honoraires (€)', 'mandat.honoraires'], ['charge', 'Honoraires à la charge de', 'mandat.charge'],
    ['adresse', 'Adresse du bien', 'bien.adresse'], ['cp', 'Code postal', 'bien.cp'], ['ville', 'Ville', 'bien.ville'], ['surface', 'Surface (m²)', 'bien.surface'], ['lots', 'N° de lots', 'lots'],
    ['personnes', 'Mandant(s) / vendeur(s)', 'vendeurs'], ['emails', 'E-mails trouvés', 'vendeurs.email'], ['tels', 'Téléphones trouvés', 'vendeurs.tel']],
  offre: [['prix', 'Prix proposé (€)', 'offre.prix'], ['date', 'Date de l’offre', 'offre.date'], ['validite', 'Valable jusqu’au', 'offre.validite'],
    ['personnes', 'Acquéreur(s)', 'acquereurs'], ['emails', 'E-mails trouvés', 'acquereurs.email'], ['tels', 'Téléphones trouvés', 'acquereurs.tel']],
};
function startImport(kind, into) {
  App.imp = { kind, into };
  openModal(kind === 'offre' ? 'Importer une offre d’achat (PDF)' : 'Importer un mandat (PDF)', `
    <p>Sélectionnez le PDF : le texte est lu <b>dans votre navigateur</b> (aucun envoi), puis les informations détectées vous sont proposées pour validation. Le PDF est ensuite rangé dans les pièces du dossier.</p>
    <label class="btn primary">Choisir le PDF<input type="file" accept="application/pdf,.pdf" hidden data-import-pdf></label>
    <p class="small muted">Les PDF scannés (images) ne contiennent pas de texte : saisissez alors les informations manuellement.</p><div id="impres"></div>`, { wide: true });
}
async function handleImportPdf(file) {
  $('#impres').innerHTML = '<p>Lecture du PDF…</p>';
  try {
    const txt = await pdfText(file);
    App.imp.file = file; App.imp.txt = txt;
    if (txt.replace(/\s/g, '').length < 40) { $('#impres').innerHTML = '<p class="warn">Aucun texte exploitable (PDF scanné ?). Le fichier peut quand même être rangé dans le dossier.</p><button class="btn" data-a="applyImport" data-none="1">Ranger le PDF sans extraire</button>'; return; }
    const f = extractFields(txt, App.imp.kind);
    $('#impres').innerHTML = `<table class="tbl"><thead><tr><th></th><th>Champ</th><th>Valeur détectée (modifiable)</th></tr></thead><tbody>
      ${IMPORT_FIELDS[App.imp.kind].map(([k, l]) => `<tr><td><input type="checkbox" class="imp_ck" data-k="${k}" ${f[k] ? 'checked' : ''}></td><td>${l}</td><td><input class="imp_v" data-k="${k}" value="${esc(f[k] ?? '')}"></td></tr>`).join('')}</tbody></table>
      <details><summary>Texte extrait</summary><pre class="mono preview">${esc(txt.slice(0, 8000))}</pre></details>
      <p class="small muted">Vérifiez chaque valeur : l’extraction est automatique et peut se tromper.</p>
      <div class="row gap modal-actions"><button class="btn primary" data-a="applyImport">${App.imp.into ? 'Appliquer au dossier' : 'Créer le dossier'}</button></div>`;
  } catch (e) { $('#impres').innerHTML = `<p class="warn">${esc(e.message)}</p>`; }
}
async function applyImport(none) {
  const { kind, into, file } = App.imp;
  let d = into && App.current ? App.current : null;
  if (!d) { d = newDossier(); App.dossiers.push(d); }
  if (!none) {
    const vals = {};
    $$('.imp_ck').forEach(c => { if (c.checked) vals[c.dataset.k] = $(`.imp_v[data-k="${c.dataset.k}"]`).value.trim(); });
    const listKey = kind === 'offre' ? 'acquereurs' : 'vendeurs';
    for (const [k, , path] of IMPORT_FIELDS[kind]) {
      const v = vals[k]; if (!v) continue;
      if (path === 'lots') { d.lots = v.split(/[,;\s]+/).filter(Boolean).map((n, i) => ({ num: n, nature: i === 0 ? (d.bien.type || 'Appartement') : '', tantiemes: '', obs: '' })); }
      else if (path === listKey) {
        const ppl = v.split(';').map(s => s.trim()).filter(Boolean).map(s => { const r = s.match(/^(Monsieur|Madame|M\.|Mme)\s+(.*)$/); const civ = r ? (/^(Monsieur|M\.)$/.test(r[1]) ? 'M.' : 'Mme') : ''; const rest = (r ? r[2] : s).split(' '); return { ...newPerson(), civ, prenom: rest.length > 1 ? rest.slice(0, -1).join(' ') : '', nom: rest[rest.length - 1] }; });
        d[listKey] = ppl.length ? ppl : d[listKey];
      } else if (path.endsWith('.email') || path.endsWith('.tel')) {
        const key = path.split('.')[1], items = v.split(/[,;]\s*/);
        if (!d[listKey].length) d[listKey].push(newPerson());
        items.forEach((x, i) => { if (d[listKey][i] && !d[listKey][i][key]) d[listKey][i][key] = x; });
      } else setPath(d, path, ['mandat.prix', 'mandat.honoraires', 'mandat.duree', 'offre.prix'].includes(path) ? parseEur(v) : v);
    }
  }
  if (file) {
    const pid = kind === 'offre' ? 'acq_offre' : 'mandat';
    const rec = { id: uid(), dossierId: d.id, pieceId: pid, name: file.name, type: file.type || 'application/pdf', size: file.size, blob: file, addedAt: Date.now() };
    await Store.putFile(rec);
    const st = pstate(d, pid); st.s = 'R'; st.dr = today();
    if (App.current && App.current.id === d.id) App.files.push(rec);
  }
  if (kind === 'offre' && d.phase === 'mandat' || kind === 'offre' && d.phase === 'commercialisation') d.phase = 'offre';
  log(d, `Import PDF (${kind}) : ${file ? file.name : ''}`);
  saveDossier(d, true); closeModal();
  if (App.current && App.current.id === d.id) rerender(); else location.hash = `#/d/${d.id}/fiche`;
  toast('Informations importées — vérifiez la fiche.');
}

/* ---------- Fichiers ---------- */
async function handleFiles(fileList, target) {
  const d = App.current; if (!d) return;
  const summary = {};
  for (const file of fileList) {
    const pid = target === 'auto' ? (guessPiece(file.name) || 'divers') : target;
    const rec = { id: uid(), dossierId: d.id, pieceId: pid, name: file.name, type: file.type, size: file.size, blob: file, addedAt: Date.now() };
    await Store.putFile(rec); App.files.push(rec);
    const st = pstate(d, pid);
    if (pid !== 'divers' && ['', 'D', 'A'].includes(st.s || '')) { st.s = (pieceDef(pid).cat === 'copro_compta' ? 'V' : 'R'); st.dr = today(); }
    summary[pid] = (summary[pid] || 0) + 1;
  }
  const txt = Object.entries(summary).map(([k, n]) => `${pieceDef(k).label}${n > 1 ? ' ×' + n : ''}`).join(', ');
  log(d, 'Fichiers ajoutés : ' + txt);
  toast(`${fileList.length} fichier(s) rangé(s) : ${txt}`);
  rerender();
}
function fileMenu(id) {
  const f = App.files.find(x => x.id === id); if (!f) return;
  openModal('Fichier', `<p><b>${esc(f.name)}</b> <small class="muted">${fsize(f.size)} · ajouté le ${fdatetime(f.addedAt)}</small></p>
    <label class="field"><span>Classer dans</span><select id="fm_piece">${PIECE_CATEGORIES.map(c => `<optgroup label="${c.label}">${PIECES.filter(p => p.cat === c.id).map(p => `<option value="${p.id}" ${p.id === f.pieceId ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <div class="row gap modal-actions"><button class="btn primary" data-a="reclass" data-id="${id}">Reclasser</button><button class="btn" data-a="dlFile" data-id="${id}">⬇️ Télécharger</button><button class="btn danger" data-a="delFile" data-id="${id}">Supprimer</button></div>`);
}

/* ---------- Sauvegarde ---------- */
async function backup() {
  toast('Préparation de la sauvegarde…');
  const files = await Store.allFiles();
  const enc = await Promise.all(files.map(async f => ({ ...f, blob: undefined, data: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f.blob); }) })));
  const json = JSON.stringify({ app: 'CoproVente', version: 1, exportedAt: new Date().toISOString(), settings: App.settings, dossiers: App.dossiers, crm: App.crm, files: enc });
  download(`CoproVente_sauvegarde_${today()}.json`, new Blob([json], { type: 'application/json' }));
}
async function restore(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'CoproVente') throw new Error('Fichier de sauvegarde non reconnu.');
    if (!confirmBox(`Restaurer ${data.dossiers.length} dossier(s) et ${data.files.length} fichier(s) ? Les dossiers portant le même identifiant seront remplacés.`)) return;
    for (const d of data.dossiers) await Store.putDossier(d);
    for (const f of data.files) { const blob = await (await fetch(f.data)).blob(); delete f.data; await Store.putFile({ ...f, blob }); }
    if (data.settings) { App.settings = { ...structuredClone(DEFAULT_SETTINGS), ...data.settings }; saveSettings(); }
    if (data.crm) { data.crm = migrateCrm(data.crm); for (const k of ['contacts', 'estimations', 'visites']) { const ids = new Set((data.crm[k] || []).map(x => x.id)); App.crm[k] = App.crm[k].filter(x => !ids.has(x.id)).concat(data.crm[k] || []); } saveCrm(); }
    App.dossiers = await Store.allDossiers();
    toast('Sauvegarde restaurée ✔'); location.hash = '#/';  render();
  } catch (e) { toast(e.message, 'err'); }
}

/* ---------- Dossier d'exemple ---------- */
function demo() {
  const d = newDossier({
    mandat: { numero: '2026-114', type: 'exclusif', date: addDays(today(), -12), duree: 3, prix: 289000, honoraires: 14000, charge: 'vendeur' },
    bien: { adresse: '12 rue des Lilas', cp: '69003', ville: 'Lyon', type: 'Appartement', etage: '3', pieces: 3, surface: 64.2, annee: 1972, occupation: 'libre', chauffage: 'collectif', dpe: 'D', ges: 'D', description: 'T3 traversant, balcon, cave et parking.' },
    lots: [{ num: '24', nature: 'Appartement', tantiemes: '118/10000', obs: '' }, { num: '81', nature: 'Cave', tantiemes: '3/10000', obs: '' }, { num: '122', nature: 'Parking', tantiemes: '4/10000', obs: '' }],
    copro: { nom: 'Résidence Les Jardins (exemple)', immat: 'AB1-234-567', nbLots: 148, syndicNom: 'Cabinet Exemple Gestion', syndicContact: 'Mme Durand', syndicEmail: 'gestion@exemple-syndic.fr', syndicTel: '04 00 00 00 00', syndicType: 'professionnel', extranet: 'https://extranet.exemple-syndic.fr', charges: 2240, fondsTravaux: 590, procedure: 'non', procedureDetail: '', ex1Debut: '2025-01-01', ex1Fin: '2025-12-31', ex2Debut: '2024-01-01', ex2Fin: '2024-12-31' },
    vendeurs: [{ civ: 'Mme', prenom: 'Claire', nom: 'Martin', email: 'claire.martin@exemple.fr', tel: '06 00 00 00 01', adresse: '12 rue des Lilas, 69003 Lyon', situation: 'célibataire' }],
    acquereurs: [{ civ: 'M.', prenom: 'Karim', nom: 'Benali', email: 'karim.benali@exemple.fr', tel: '06 00 00 00 02', adresse: '5 place Bellecour, 69002 Lyon', situation: 'pacsé' }],
    notaireV: { nom: 'Maître Exemple', etude: 'Office notarial Exemple', email: 'office@notaire-exemple.fr', tel: '04 00 00 00 10', adresse: '' },
    phase: 'offre',
  });
  d.offre = { ...d.offre, prix: 279000, financement: 'mixte', apport: 60000, pret: 219000, duree: 25, taux: 3.6, lieu: 'Lyon', dateCompromis: addDays(today(), 21), dateActe: addDays(today(), 100) };
  Object.assign(d.pieces, { titre: { s: 'R', dr: addDays(today(), -10) }, mandat: { s: 'R' }, dpe: { s: 'R', doc: '2025-03-10' }, erp: { s: 'R', doc: addDays(today(), -170) }, elec: { s: 'R', doc: '2024-02-01' },
    amiante: { s: 'R', doc: '2019-06-01' }, carrez: { s: 'R' }, rcp: { s: 'R' }, pv_ag: { s: 'R', ex: 'AG 2024, 2025, AGE 2025' }, appels_fonds: { s: 'V', ex: 'T1 à T4 2026' }, fiche_synth: { s: 'D', dd: addDays(today(), -9) }, decomptes: { s: 'D', dd: addDays(today(), -9) } });
  ['mandat.vendeurs', 'mandat.lots', 'mandat.occupation', 'mandat.mandat_signe', 'entretien.questionnaire', 'entretien.notaire_vendeur'].forEach(k => d.tasks[k] = { done: true, date: addDays(today(), -11) });
  d.signaux = { trav_non_appeles: { etat: 'oui', source: 'PV AG du 12/05/2025, résolution 14', montant: 3150, question: 'Échéancier des appels ravalement 2027 ?' } };
  d.appels = [{ periode: '4e trimestre 2026', exig: '2026-10-01', solde: 40.5, sens: 'credit', lignes: [
    { nature: 'Provisions générales', cat: 'courant', global: 12000, tant: 125, cle: 10000 }, { nature: 'Provisions ascenseur', cat: 'courant', global: 3600, tant: 210, cle: 8000 },
    { nature: 'Toiture : appel 2/3', cat: 'travaux', global: 30000, tant: 125, cle: 10000 }, { nature: 'Fonds de travaux', cat: 'fonds', global: 2400, tant: 125, cle: 10000 }] }];
  d.mails.syndic.messages.push({ id: 'ex1', source: 'manuel', from: 'gestion@exemple-syndic.fr', subject: 'RE: Vente lots 24/81/122 — documents', date: Date.now() - 3 * 864e5, body: 'Bonjour,\nVeuillez trouver les PV demandés sur l’extranet. La fiche synthétique sera mise en ligne cette semaine.\nCordialement', snippet: 'Veuillez trouver les PV demandés…' });
  d.journal.unshift({ t: Date.now(), txt: 'Dossier d’exemple chargé (données fictives)', type: 'auto' });
  App.dossiers.push(d); saveDossier(d, true);
  location.hash = `#/d/${d.id}/parcours`;
  toast('Dossier d’exemple créé (données fictives).');
}

/* ---------- Actions ---------- */
const ACT = {
  closeModal,
  newDossier() {
    openModal('Nouveau dossier de vente', `<div class="grid4">
      <label class="field span2"><span>Adresse du bien</span><input id="n_adr" autofocus></label><label class="field"><span>Code postal</span><input id="n_cp"></label><label class="field"><span>Ville</span><input id="n_ville"></label>
      <label class="field"><span>Civilité vendeur</span><select id="n_civ"><option></option><option>M.</option><option>Mme</option></select></label><label class="field"><span>Prénom</span><input id="n_prenom"></label><label class="field"><span>Nom</span><input id="n_nom"></label>
      <label class="field"><span>E-mail vendeur</span><input id="n_email" type="email"></label>
      <label class="field"><span>Type de mandat</span><select id="n_type"><option value="exclusif">Exclusif</option><option value="semi">Semi-exclusif</option><option value="simple">Simple</option></select></label>
      <label class="field"><span>N° de mandat</span><input id="n_num"></label><label class="field"><span>Prix FAI (€)</span><input id="n_prix" type="number"></label><label class="field"><span>N° des lots</span><input id="n_lots" placeholder="24, 81, 122"></label></div>
      <div class="row gap modal-actions"><button class="btn primary" data-a="createDossier">Créer le dossier</button><button class="btn ghost" data-a="importPdf" data-kind="mandat">ou importer le mandat PDF</button></div>`, { wide: true });
  },
  createDossier() {
    const v = id => $('#' + id).value.trim();
    const d = newDossier();
    Object.assign(d.bien, { adresse: v('n_adr'), cp: v('n_cp'), ville: v('n_ville') });
    Object.assign(d.vendeurs[0], { civ: v('n_civ'), prenom: v('n_prenom'), nom: v('n_nom'), email: v('n_email') });
    Object.assign(d.mandat, { type: v('n_type'), numero: v('n_num'), prix: num(v('n_prix')) ?? '' });
    if (v('n_lots')) d.lots = v('n_lots').split(/[,;\s]+/).filter(Boolean).map((n, i) => ({ num: n, nature: i ? '' : 'Appartement', tantiemes: '', obs: '' }));
    App.dossiers.push(d); saveDossier(d, true); closeModal();
    location.hash = `#/d/${d.id}/parcours`;
  },
  demo,
  importPdf(el) { startImport(el.dataset.kind, !!el.dataset.into); },
  applyImport(el) { applyImport(!!el.dataset.none); },
  toggleStep(el) { const id = el.dataset.id, cur = currentStep(App.current).id === id; App.open[id] = !(App.open[id] ?? cur); rerender(); },
  toggleTask(el) { const d = App.current, k = el.dataset.key; d.tasks[k] = el.checked ? { done: true, date: today() } : { done: false }; if (el.checked) log(d, 'Tâche faite : ' + (el.closest('li').querySelector('span').textContent)); saveDossier(); rerender(); },
  addLot() { App.current.lots.push({ num: '', nature: '', tantiemes: '', obs: '' }); saveDossier(); rerender(); },
  delLot(el) { App.current.lots.splice(+el.dataset.i, 1); saveDossier(); rerender(); },
  addPerson(el) { App.current[el.dataset.list].push(newPerson()); saveDossier(); if (el.dataset.go) location.hash = `#/d/${App.current.id}/${el.dataset.go}`; else rerender(); },
  delPerson(el) { if (!confirmBox('Retirer cette personne ?')) return; App.current[el.dataset.list].splice(+el.dataset.i, 1); saveDossier(); rerender(); },
  async deleteDossier() {
    const d = App.current;
    if (!confirmBox(`Supprimer définitivement le dossier « ${dossierTitle(d)} » et ses ${App.files.length} fichier(s) ? Cette action est irréversible (pensez à exporter une sauvegarde).`)) return;
    for (const f of App.files) await Store.delFile(f.id);
    await Store.delDossier(d.id); App.dossiers = App.dossiers.filter(x => x.id !== d.id); App.current = null; location.hash = '#/'; toast('Dossier supprimé');
  },
  pieceFilter(el) { App.pieceFilter = el.dataset.f; rerender(); },
  setPieceStatus(el) {
    const d = App.current, st = pstate(d, el.dataset.id); st.s = el.value;
    if (st.s === 'D' && !st.dd) st.dd = today(); if (st.s === 'R' && !st.dr) st.dr = today();
    log(d, `${pieceDef(el.dataset.id).label} → ${PIECE_STATUTS.find(x => x.id === st.s).label}`); saveDossier(); rerender();
  },
  async openFile(el) { const f = await Store.getFile(el.dataset.id); if (f) window.open(URL.createObjectURL(f.blob), '_blank'); },
  fileMenu(el) { fileMenu(el.dataset.id); },
  async reclass(el) {
    const f = App.files.find(x => x.id === el.dataset.id), pid = $('#fm_piece').value; f.pieceId = pid;
    await Store.putFile(f); const st = pstate(App.current, pid); if (['', 'D', 'A'].includes(st.s || '')) { st.s = 'R'; st.dr = today(); }
    saveDossier(); closeModal(); rerender();
  },
  async dlFile(el) { const f = await Store.getFile(el.dataset.id); if (f) download(f.name, f.blob); },
  async delFile(el) {
    if (!confirmBox('Supprimer ce fichier de l’application ? (irréversible)')) return;
    await Store.delFile(el.dataset.id); App.files = App.files.filter(x => x.id !== el.dataset.id); closeModal(); rerender();
  },
  entretienRep(el) { const d = App.current, x = d.entretien[el.dataset.id] || (d.entretien[el.dataset.id] = {}); x.r = x.r === el.dataset.v ? '' : el.dataset.v; saveDossier(); rerender(); },
  setSignal(el) { const d = App.current, x = d.signaux[el.dataset.id] || (d.signaux[el.dataset.id] = {}); x.etat = el.dataset.v; saveDossier(); rerender(); },
  addAlerte() { App.current.alertesLibres.push({ label: '', source: '', question: '' }); saveDossier(); rerender(); },
  delAlerte(el) { App.current.alertesLibres.splice(+el.dataset.i, 1); saveDossier(); rerender(); },
  addAppel() { App.current.appels.unshift({ periode: '', lignes: [{ nature: 'Provisions générales', cat: 'courant' }], sens: 'debit' }); saveDossier(); rerender(); },
  delAppel(el) { if (confirmBox('Supprimer cette fiche ?')) { App.current.appels.splice(+el.dataset.i, 1); saveDossier(); rerender(); } },
  addLigne(el) { App.current.appels[+el.dataset.i].lignes.push({ nature: '', cat: 'courant' }); saveDossier(); rerender(); },
  delLigne(el) { App.current.appels[+el.dataset.i].lignes.splice(+el.dataset.j, 1); saveDossier(); rerender(); },
  annonceCopro() { const t = annonceText(App.current); openModal('Les mentions obligatoires pour l’annonce en copropriété', `<textarea id="ann" rows="9">${esc(t)}</textarea><p class="small muted">Complétez les zones entre crochets. Données issues de la fiche (onglet Fiche › Copropriété).</p><div class="row gap modal-actions"><button class="btn primary" data-a="copyAnn">📋 Copier</button></div>`); },
  copyAnn() { copyText($('#ann').value); },
  calcRetract() {
    const d = App.current;
    openModal('Fin du délai de rétractation', `${field('Date de 1re présentation de la notification (ou remise en main propre)', 'dates.notification', { type: 'date' })}
      <p>Fin du délai : <b id="rt_out">${fdate(d.dates.finRetractation)}</b></p><p class="small muted">Le délai court à compter du lendemain ; prorogation au 1er jour ouvrable suivant si le dernier jour est un samedi, dimanche ou jour férié. La date est enregistrée dans le dossier.</p>
      <div class="row modal-actions"><button class="btn primary" data-a="closeRt">OK</button></div>`);
  },
  closeRt() { closeModal(); rerender(); },
  addNote() { const v = $('#jnote').value.trim(); if (!v) return; log(App.current, v, 'note'); rerender(); },
  compose(el) { openCompose(App.current, { tpl: el.dataset.tpl, canal: el.dataset.canal }); },
  composeTpl(el) {
    const t = allTemplates().find(x => x.id === el.value); if (!t) return;
    const d = App.current; $('#c_subject').value = fill(t.sujet, d); $('#c_body').value = fill(t.corps, d);
    $('#c_canal').value = t.canal; $('#c_to').value = canalEmails(d, t.canal).join(', ');
  },
  composeDo(el) { composeDo(App.current, el.dataset.how); },
  setCanal(el) { App.canal = el.dataset.c; rerender(); },
  syncCanal() { syncCanal(App.current, App.canal); },
  toggleMsg(el) { const k = 'm_' + el.dataset.id; App.open[k] = !App.open[k]; rerender(); },
  delMsg(el) { const d = App.current, { c } = findMsg(d, el.dataset.id); d.mails[c].messages = d.mails[c].messages.filter(m => m.id !== el.dataset.id); saveDossier(); rerender(); },
  copyMsg(el) { const { m } = findMsg(App.current, el.dataset.id); copyText(`De : ${m.from}\nDate : ${fdatetime(m.date)}\nObjet : ${m.subject}\n\n${m.body}`); },
  reply(el) {
    const d = App.current, { m, c } = findMsg(d, el.dataset.id);
    const addr = (m.from.match(/<([^>]+)>/) || [, m.from])[1];
    openCompose(d, { canal: c, to: m.source === 'brouillon' ? m.to : addr, subject: /^re\s*:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject,
      body: `\n\n${signature()}\n\n> Le ${fdatetime(m.date)}, ${m.from} a écrit :\n${(m.body || '').split('\n').slice(0, 40).map(l => '> ' + l).join('\n')}`, title: 'Répondre' });
  },
  pasteMail() {
    openModal('Coller un mail dans le fil', `<div class="grid4"><label class="field span2"><span>De</span><input id="p_from" placeholder="nom ou e-mail"></label><label class="field"><span>Date</span><input id="p_date" type="date" value="${today()}"></label>
      <label class="field"><span>Fil</span><select id="p_canal">${CANAUX.map(c => `<option value="${c.id}" ${c.id === App.canal ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
      <label class="field span4"><span>Objet</span><input id="p_subject"></label><label class="field span4"><span>Contenu</span><textarea id="p_body" rows="12" placeholder="Collez ici le mail (Ctrl+V)"></textarea></label></div>
      <div class="row modal-actions"><button class="btn primary" data-a="savePaste">Ajouter au fil</button></div>`, { wide: true });
  },
  savePaste() {
    const d = App.current, body = $('#p_body').value.trim(); if (!body) return toast('Le contenu est vide.', 'err');
    const subj = $('#p_subject').value.trim() || (body.match(/^(?:objet|subject)\s*:\s*(.+)$/im) || [, body.split('\n')[0].slice(0, 80)])[1];
    const from = $('#p_from').value.trim() || (body.match(/^(?:de|from)\s*:\s*(.+)$/im) || [, 'Inconnu'])[1];
    const c = $('#p_canal').value;
    d.mails[c].messages.push({ id: 'p_' + uid(), source: 'manuel', from, subject: subj, body, snippet: body.slice(0, 160), date: new Date($('#p_date').value + 'T12:00:00').getTime() || Date.now() });
    log(d, `Mail ajouté au fil ${c} : ${subj}`, 'mail'); App.canal = c; closeModal(); rerender();
  },
  offreDo(el) {
    const d = App.current, html = docShell('Offre d’achat — ' + dossierTitle(d), offreBody(d)), name = `Offre_achat_${slug(names(d.acquereurs) || 'acquereur')}_${today()}`;
    if (el.dataset.how === 'print') printHtml(html);
    else if (el.dataset.how === 'word') download(name + '.doc', wordBlob(html));
    else saveGeneratedToPieces(d, 'acq_offre', name + '.html', html).then(rerender);
    if (d.phase === 'mandat' || d.phase === 'commercialisation') { d.phase = 'offre'; saveDossier(); }
  },
  pedCompose() {
    const d = App.current;
    openCompose(d, { canal: 'autre', to: COPRO_ASSISTANCE.email, subject: fill('Commande pré-état daté — {{adresse}} — lots {{lots}}', d), body: pedRequestText(d), title: 'Demande de pré-état daté' });
    App.compose.onDone = () => { if (!d.ped.commandeLe) d.ped.commandeLe = today(); };
  },
  pedCopy() { copyText(pedRequestText(App.current)); },
  notaireMail() {
    const d = App.current, t = allTemplates().find(x => x.id === 'notaire_transmission');
    openCompose(d, { tpl: 'notaire_transmission', subject: fill(t.sujet, d), body: fill(t.corps, d) });
  },
  noteDo(el) {
    const d = App.current, html = docShell('Note de transmission — ' + dossierTitle(d), noteBody(d));
    if (el.dataset.how === 'print') printHtml(html); else saveGeneratedToPieces(d, 'divers', `Note_transmission_${d.ref}_${today()}.html`, html).then(rerender);
  },
  exportZip() { exportZip(App.current); },
  editTpl(el) { editTpl(el.dataset.id); },
  saveTpl(el) {
    const id = el.dataset.id, t = { titre: $('#t_titre').value.trim() || 'Sans titre', canal: $('#t_canal').value, sujet: $('#t_sujet').value, corps: $('#t_corps').value };
    if (el.dataset.custom) {
      const list = App.settings.customTemplates, i = list.findIndex(x => x.id === id);
      if (i >= 0) list[i] = { ...list[i], ...t }; else list.push({ id: 'c_' + uid(), ...t });
    } else App.settings.tplOverrides[id] = t;
    saveSettings(); closeModal(); rerender(); toast('Modèle enregistré');
  },
  resetTpl(el) { delete App.settings.tplOverrides[el.dataset.id]; saveSettings(); closeModal(); rerender(); },
  delTpl(el) { if (!confirmBox('Supprimer ce modèle ?')) return; App.settings.customTemplates = App.settings.customTemplates.filter(t => t.id !== el.dataset.id); saveSettings(); closeModal(); rerender(); },
  copy(el) { copyText(el.dataset.v); },
  backup,
  async wipe() {
    if (!confirmBox('Effacer TOUTES les données (dossiers, fichiers, paramètres) de cet appareil ? Irréversible.')) return;
    if (!confirmBox('Dernière confirmation : avez-vous exporté une sauvegarde ?')) return;
    await Store.clearAll(); location.hash = '#/'; location.reload();
  },
};

/* ---------- Démarrage & écouteurs ---------- */
function wire() {
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-a]');
    if (!a || !ACT[a.dataset.a]) return;
    if (a.tagName === 'BUTTON' || a.tagName === 'A') e.preventDefault();
    ACT[a.dataset.a](a, e);
  });
  document.addEventListener('input', e => {
    if (e.target.dataset && e.target.dataset.t !== undefined) {
      App.tools[e.target.dataset.t] = e.target.value;
      clearTimeout(App.tTimer); App.tTimer = setTimeout(rerender, e.target.tagName === 'SELECT' ? 0 : 450);
      return;
    }
    onBind(e);
    if (e.target.dataset && e.target.dataset.b === 'dates.notification' && $('#rt_out')) $('#rt_out').textContent = fdate(App.current.dates.finRetractation);
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.aChange) { ACT[el.dataset.aChange](el, e); return; }
    if (el.matches('input[data-upload]')) { handleFiles([...el.files], el.dataset.upload); el.value = ''; return; }
    if (el.matches('input[data-import-pdf]')) { if (el.files[0]) handleImportPdf(el.files[0]); return; }
    if (el.matches('input[data-restore]')) { if (el.files[0]) restore(el.files[0]); el.value = ''; return; }
    if (el.dataset && el.dataset.t !== undefined) return;
    onBind(e);
  });
  document.addEventListener('dragover', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const z = e.target.closest('[data-drop]'); if (z) z.classList.remove('over'); });
  document.addEventListener('drop', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.remove('over'); if (e.dataTransfer.files.length) handleFiles([...e.dataTransfer.files], 'auto'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  window.addEventListener('hashchange', () => { closeModal(); render().then(() => { const h = location.hash.split('#')[2]; if (h) { const n = document.getElementById(h); if (n) n.scrollIntoView({ block: 'center' }); } else scrollTo(0, 0); }); });
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $$('.sidebar a, .top-links a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
  $('#navBack').addEventListener('click', () => document.body.classList.remove('nav-open'));
}
function applyBranding() {
  const C = typeof APP_CONFIG === 'object' ? APP_CONFIG : {};
  const r = document.documentElement.style;
  if (C.couleurPrincipale) { r.setProperty('--teal', C.couleurPrincipale); r.setProperty('--teal-ink', `color-mix(in srgb, ${C.couleurPrincipale} 80%, black)`); }
  if (C.couleurBandeau) r.setProperty('--navy', C.couleurBandeau);
  if (C.logo) $('#brandLogo').src = C.logo;
  if (C.nom && C.nom !== 'CoproVente') $('#brandName').textContent = C.nom;
}
async function boot() {
  applyBranding();
  try {
    await Store.open();
    const s = await Store.get('settings');
    if (s) App.settings = { ...structuredClone(DEFAULT_SETTINGS), ...s, agent: { ...DEFAULT_SETTINGS.agent, ...(s.agent || {}) }, delais: { ...DEFAULT_SETTINGS.delais, ...(s.delais || {}) }, ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai || {}) } };
    App.dossiers = await Store.allDossiers();
    const crm = await Store.get('crm');
    App.crm = migrateCrm(crm);
    App.dossiers.forEach(ensureDossier);
    if (crm && crm.prospects) Store.set('crm', App.crm);
  } catch (e) {
    $('#view').innerHTML = `<div class="card"><h2>Stockage indisponible</h2><p>Votre navigateur bloque le stockage local (navigation privée ?). ${esc(e.message)}</p></div>`;
    return;
  }
  wire();
  await render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
/* boot() est appelé à la fin de crm.js (dernier script chargé) */
