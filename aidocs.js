/* =========================================================================
   CoproVente — analyse IA de documents de copropriété
   Appels de fonds, annexes comptables (6 documents max), PV d'AG (5 max).
   Les fichiers sont toujours rangés dans les pièces du bien ; l'analyse
   nécessite l'assistant IA (clé Claude dans Paramètres).
   ========================================================================= */
App.aiBusy = {};
const AI_KINDS = {
  appel: { piece: 'appels_fonds', max: 1 },
  annexes: { piece: 'convocation', max: 6 },
  pv: { piece: 'pv_ag', max: 5 },
};
const AI_DOC_SYSTEM = AI_SYSTEM + ' Tu analyses des documents de copropriété pour un agent immobilier qui prépare une vente. Tu ne retiens que ce qui figure dans les documents. Tu distingues ce qui est appelé de ce qui est payé, ce qui est voté de ce qui est seulement évoqué, et tu ne conclus jamais à partir d’un silence. Les montants sont des nombres en euros, sans symbole ; une valeur absente vaut null.';

function aiDropZone(kind, title, sub, max) {
  const busy = App.aiBusy[kind];
  return `<div class="dropzone ai" data-aidrop="${kind}"><div class="dz-txt"><b>${busy ? '⏳ Analyse en cours…' : '📥 ' + title}</b>
    <small>${busy ? esc(busy) : aiOn() ? '✨ ' + sub : 'Les fichiers sont rangés dans les pièces du bien. Activez l’assistant IA (Paramètres) pour l’analyse automatique.'}</small></div>
    <label class="btn small primary ${busy ? 'disabled' : ''}">Choisir${max > 1 ? ` (${max} max.)` : ''}<input type="file" hidden ${max > 1 ? 'multiple' : ''} accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/gif" data-aifile="${kind}"></label></div>`;
}

/* ---------- Appel au modèle avec documents et réponse JSON ---------- */
function fileToB64(blob) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); }); }
async function docBlocks(files) {
  const out = [];
  for (const f of files) {
    const data = await fileToB64(f), t = (f.type || '').toLowerCase();
    if (t === 'application/pdf' || /\.pdf$/i.test(f.name)) out.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data }, title: f.name });
    else if (/^image\/(jpeg|png|webp|gif)$/.test(t)) out.push({ type: 'image', source: { type: 'base64', media_type: t, data } });
  }
  return out;
}
async function aiAskJson(content, schema, maxTokens = 8000) {
  if (!anthropicMod) anthropicMod = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.39.0/+esm');
  const Anthropic = anthropicMod.default || anthropicMod.Anthropic;
  const client = new Anthropic({ apiKey: App.settings.ai.key.trim(), dangerouslyAllowBrowser: true });
  const res = await client.beta.messages.create({
    model: App.settings.ai.model || 'claude-opus-5-5', max_tokens: maxTokens, system: AI_DOC_SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
  });
  if (res.stop_reason === 'refusal') throw new Error('Le modèle a refusé d’analyser ce document.');
  if (res.stop_reason === 'max_tokens') throw new Error('Réponse incomplète (document trop long) : réessayez avec moins de documents.');
  const txt = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try { return JSON.parse(txt); } catch (e) { const m = txt.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Réponse illisible du modèle.'); }
}
const N = { anyOf: [{ type: 'number' }, { type: 'null' }] }, S = { type: 'string' }, AS = { type: 'array', items: { type: 'string' } }, AN = { type: 'array', items: { type: 'number' } };
const obj = (props) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
const SCHEMA_APPEL = obj({
  periode: S, exigibilite: { type: 'string', description: 'Date d’exigibilité au format AAAA-MM-JJ, ou chaîne vide' }, reference: S, lots: S,
  lignes: { type: 'array', items: obj({ nature: S, categorie: { type: 'string', enum: ['courant', 'travaux', 'fonds', 'regul', 'autre'] }, montant_global: N, tantiemes: N, total_cle: N, quote_part: N }) },
  solde_anterieur: N, sens_solde: { type: 'string', enum: ['debit', 'credit', 'aucun'] }, total_a_regler: N,
  analyse: { type: 'string', description: 'Lecture commentée en 5 à 10 lignes pour un agent immobilier' }, question_syndic: S,
});
const SCHEMA_ANNEXES = obj({
  exercice: S, comptes_approuves: { type: 'string', enum: ['oui', 'non', 'inconnu'] }, budget_courant: N,
  annexe2_total_charges_courantes: N, annexe3_charges_par_cle: AN, annexe2_total_travaux_clotures: N, annexe4_cout_par_operation: AN,
  annexe1_compte12: N, annexe5_soldes_E: AN, annexe1_total_actif: N, annexe1_total_passif: N, creances_coproprietaires: N, dette_fournisseurs: N,
  analyse: { type: 'string', description: 'Commentaire en 6 à 12 lignes : situation financière, écarts budget, impayés, travaux, points à vérifier' }, points_attention: AS,
});
const SCHEMA_PV = obj({
  date_ag: { type: 'string', description: 'AAAA-MM-JJ ou chaîne vide' }, type_ag: S, synthese: { type: 'string', description: '3 à 5 phrases' },
  points_acquereur: { type: 'array', items: S, description: 'Les points importants pour un acquéreur' },
  travaux_votes: { type: 'array', items: obj({ objet: S, montant: N, echeancier: S }) }, travaux_envisages: AS, procedures_litiges: AS,
  comptes_approuves: S, niveau_vigilance: { type: 'string', enum: ['faible', 'moyen', 'eleve'] },
});

/* ---------- Traitement des fichiers déposés ---------- */
async function aiProcess(kind, fileList) {
  const d = App.current; if (!d) return;
  const K = AI_KINDS[kind]; let files = [...fileList];
  if (files.length > K.max) { toast(`${K.max} document(s) maximum : seuls les ${K.max} premiers sont pris en compte.`, 'warn'); files = files.slice(0, K.max); }
  for (const f of files) {
    const rec = { id: uid(), dossierId: d.id, pieceId: K.piece, name: f.name, type: f.type, size: f.size, blob: f, addedAt: Date.now() };
    await Store.putFile(rec); App.files.push(rec);
  }
  const st = pstate(d, K.piece); if (['', 'D'].includes(st.s || '')) { st.s = 'V'; st.dr = today(); }
  log(d, `Document(s) déposé(s) pour analyse : ${files.map(f => f.name).join(', ')}`); saveDossier(d, true);
  if (!aiOn()) { toast('Fichiers rangés dans les pièces. Activez l’assistant IA pour l’analyse automatique.', 'warn'); rerender(); return; }
  const ok = files.filter(f => /pdf|image\/(jpeg|png|webp|gif)/i.test(f.type || '') || /\.pdf$/i.test(f.name));
  if (ok.length < files.length) toast('Seuls les PDF et les photos (JPG, PNG) peuvent être analysés.', 'warn');
  if (!ok.length) { rerender(); return; }
  if (ok.reduce((s, f) => s + f.size, 0) > 24e6) { toast('Documents trop lourds pour l’analyse (24 Mo max.).', 'err'); rerender(); return; }
  App.aiBusy[kind] = ok.map(f => f.name).join(', '); rerender();
  try {
    if (kind === 'appel') await analyseAppel(d, ok[0]);
    else if (kind === 'annexes') await analyseAnnexes(d, ok);
    else await Promise.all(ok.map(f => analysePv(d, f)));
    saveDossier(d, true); toast('Analyse terminée — vérifiez les montants avec le document.');
  } catch (e) { toast(e.message || String(e), 'err'); }
  finally { delete App.aiBusy[kind]; rerender(); }
}
async function analyseAppel(d, f) {
  const lotsInfo = d.lots.filter(l => l.num).map(l => `lot ${l.num}${l.tantiemes ? ' (' + l.tantiemes + ' tantièmes)' : ''}`).join(', ');
  const r = await aiAskJson([...(await docBlocks([f])), { type: 'text', text: `Voici un appel de fonds de copropriété${lotsInfo ? ` (lots vendus : ${lotsInfo})` : ''}. Extrais chaque ligne (nature, catégorie : provisions courantes = courant, travaux votés = travaux, fonds de travaux = fonds, régularisation = regul, sinon autre), le montant global appelé, les tantièmes du copropriétaire, le total de la clé et sa quote-part, puis le solde antérieur et le total à régler. Rédige ensuite une lecture commentée : ventilation provisions / travaux / fonds de travaux, cohérence des quotes-parts (montant global × tantièmes ÷ total de la clé), points à vérifier (un appel ne prouve pas un paiement ; ne pas multiplier le total par quatre pour estimer des charges annuelles). Propose enfin une question précise à poser au syndic si une ligne est inexpliquée.` }], SCHEMA_APPEL);
  d.appels.unshift({ periode: r.periode, exig: /^\d{4}-\d{2}-\d{2}$/.test(r.exigibilite) ? r.exigibilite : '', ref: r.reference, piece: 'Appel de fonds déposé', fichier: f.name,
    lignes: (r.lignes || []).map(l => ({ nature: l.nature, cat: l.categorie, global: l.montant_global ?? '', tant: l.tantiemes ?? '', cle: l.total_cle ?? '', part: l.quote_part ?? '' })),
    solde: r.solde_anterieur ?? '', sens: r.sens_solde === 'credit' ? 'credit' : 'debit', analyse: r.analyse, question: r.question_syndic, conclusion: r.question_syndic ? 'explication' : '' });
  log(d, `Appel de fonds analysé par l’IA : ${r.periode || f.name}`);
}
async function analyseAnnexes(d, files) {
  const r = await aiAskJson([...(await docBlocks(files)), { type: 'text', text: `Voici des documents comptables d’une copropriété (annexes comptables 1 à 5 du décret de 2005, budget, convocation…). Relève les totaux demandés pour l’exercice clôturé le plus récent (N) : annexe 1 (total actif, total passif, compte 12 solde en attente sur travaux, créances copropriétaires, dette fournisseurs), annexe 2 (total des charges courantes réalisées, total des travaux et opérations exceptionnelles clôturés), annexe 3 (charges nettes par clé), annexe 4 (coût final par opération clôturée), annexe 5 (solde E en attente par opération non clôturée), budget courant N. Indique si les comptes sont approuvés d’après un PV, sinon « inconnu ». Rédige un commentaire pour un agent immobilier et liste les points d’attention pour l’acquéreur. Ne cumule pas les annexes 2, 3 et 4 comme des dépenses différentes : ce sont des présentations des mêmes comptes.` }], SCHEMA_ANNEXES, 10000);
  const j = a => (a || []).filter(x => x != null).join('; ');
  d.annexes = Object.assign(d.annexes || {}, {
    exercice: r.exercice, approuve: r.comptes_approuves === 'oui' ? 'oui' : r.comptes_approuves === 'non' ? 'non' : '', budget: r.budget_courant ?? '',
    a2c: r.annexe2_total_charges_courantes ?? '', a3: j(r.annexe3_charges_par_cle), a2t: r.annexe2_total_travaux_clotures ?? '', a4: j(r.annexe4_cout_par_operation),
    a1c12: r.annexe1_compte12 ?? '', a5: j(r.annexe5_soldes_E), actif: r.annexe1_total_actif ?? '', passif: r.annexe1_total_passif ?? '', creances: r.creances_coproprietaires ?? '', fournisseurs: r.dette_fournisseurs ?? '',
    analyse: r.analyse + ((r.points_attention || []).length ? '\n\nPoints d’attention :\n' + r.points_attention.map(x => '- ' + x).join('\n') : ''), fichiers: files.map(f => f.name).join(', '),
  });
  log(d, `Annexes comptables analysées par l’IA (${files.length} document(s))`);
}
async function analysePv(d, f) {
  const lotsInfo = d.lots.filter(l => l.num).map(l => l.num).join(', ');
  const r = await aiAskJson([...(await docBlocks([f])), { type: 'text', text: `Voici le procès-verbal d’une assemblée générale de copropriété${lotsInfo ? ` (lots vendus : ${lotsInfo})` : ''}. Rédige une synthèse courte et relève les points importants pour un acquéreur : travaux votés (objet, montant, échéancier des appels), travaux seulement évoqués ou études, procédures et litiges, approbation des comptes, changement de syndic, sinistres, décisions concernant les lots vendus, autorisations, évolution des charges ou du fonds de travaux. Distingue un vote d’une simple discussion. Évalue un niveau de vigilance (faible, moyen, élevé) pour l’acquéreur.` }], SCHEMA_PV);
  d.pvAnalyses = d.pvAnalyses || [];
  d.pvAnalyses.push({ id: uid(), fichier: f.name, date: /^\d{4}-\d{2}-\d{2}$/.test(r.date_ag) ? r.date_ag : '', type: r.type_ag, synthese: r.synthese, points: r.points_acquereur || [],
    travaux: r.travaux_votes || [], envisages: r.travaux_envisages || [], procedures: r.procedures_litiges || [], comptes: r.comptes_approuves, vigilance: r.niveau_vigilance, at: Date.now() });
  log(d, `PV d’AG analysé par l’IA : ${r.date_ag ? fdate(r.date_ag) : f.name}`);
}

/* ---------- Bloc PV d'AG ---------- */
const VIG = { faible: ['Vigilance faible', 's-green'], moyen: ['Vigilance moyenne', 's-amber'], eleve: ['Vigilance élevée', 's-red'] };
function pvTexte(p) {
  return `AG ${p.type ? p.type.toLowerCase() + ' ' : ''}du ${p.date ? fdate(p.date) : '[date]'}\n${p.synthese}\n${p.points.length ? '\nPoints importants pour l’acquéreur :\n' + p.points.map(x => '- ' + x).join('\n') : ''}${p.travaux.length ? '\n\nTravaux votés :\n' + p.travaux.map(t => `- ${t.objet}${num(t.montant) ? ' — ' + eur(t.montant) : ''}${t.echeancier ? ' (' + t.echeancier + ')' : ''}`).join('\n') : ''}${p.envisages.length ? '\n\nTravaux évoqués (non votés) :\n' + p.envisages.map(x => '- ' + x).join('\n') : ''}${p.procedures.length ? '\n\nProcédures / litiges :\n' + p.procedures.map(x => '- ' + x).join('\n') : ''}`;
}
function pvCard(d) {
  const list = (d.pvAnalyses || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<section class="card"><div class="row between wrap gap"><h2>🗳️ Procès-verbaux d’AG — synthèse IA</h2>${list.length ? '<button class="btn small" data-a="pvCopyAll">📋 Copier toutes les synthèses</button>' : ''}</div>
    <p class="small muted">Les PV des 3 dernières années — pas seulement 3 PV. La synthèse aide à repérer l’essentiel ; vérifiez toujours dans le procès-verbal.</p>
    ${aiDropZone('pv', 'Déposez jusqu’à 5 procès-verbaux d’AG', 'Une synthèse est rédigée pour chaque assemblée, avec les points importants pour l’acquéreur.', 5)}
    ${list.map(p => { const v = VIG[p.vigilance] || ['', 's-grey'];
      return `<div class="pv"><div class="row between wrap gap"><b>AG ${esc((p.type || '').toLowerCase())} du ${p.date ? fdate(p.date) : '?'}</b><span class="row gap">${v[0] ? `<span class="sbadge ${v[1]}">${v[0]}</span>` : ''}<button class="icon-btn" data-a="pvCopy" data-id="${p.id}" title="Copier">📋</button><button class="icon-btn" data-a="pvDel" data-id="${p.id}" title="Supprimer">🗑</button></span></div>
      <small class="muted">${esc(p.fichier)}${p.comptes ? ' · comptes : ' + esc(p.comptes) : ''}</small><p>${esc(p.synthese)}</p>
      ${p.points.length ? `<b class="small">Pour l’acquéreur</b><ul>${p.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${p.travaux.length ? `<b class="small">Travaux votés</b><ul>${p.travaux.map(t => `<li>${esc(t.objet)}${num(t.montant) ? ' — <b>' + eur(t.montant) + '</b>' : ''}${t.echeancier ? ' <span class="muted">(' + esc(t.echeancier) + ')</span>' : ''}</li>`).join('')}</ul>` : ''}
      ${p.envisages.length ? `<b class="small">Évoqués, non votés</b><ul>${p.envisages.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${p.procedures.length ? `<b class="small">Procédures / litiges</b><ul>${p.procedures.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`; }).join('')}</section>`;
}

Object.assign(ACT, {
  pvDel(el) { const d = App.current; if (!confirmBox('Supprimer cette synthèse ? (le PV reste dans les pièces)')) return; d.pvAnalyses = d.pvAnalyses.filter(p => p.id !== el.dataset.id); saveDossier(); rerender(); },
  pvCopy(el) { copyText(pvTexte(App.current.pvAnalyses.find(p => p.id === el.dataset.id))); },
  pvCopyAll() { const d = App.current; copyText(`Synthèse des assemblées générales — ${dossierTitle(d)}\n\n` + d.pvAnalyses.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(pvTexte).join('\n\n———\n\n') + '\n\nSynthèse établie à partir des procès-verbaux ; seuls les documents originaux font foi.'); },
});
document.addEventListener('change', e => {
  const el = e.target; if (!el.matches || !el.matches('input[data-aifile]') || !el.files.length) return;
  aiProcess(el.dataset.aifile, el.files); el.value = '';
});
document.addEventListener('dragover', e => { const z = e.target.closest && e.target.closest('[data-aidrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('[data-aidrop]'); if (z) z.classList.remove('over'); });
document.addEventListener('drop', e => { const z = e.target.closest && e.target.closest('[data-aidrop]'); if (!z) return; e.preventDefault(); z.classList.remove('over'); if (!App.aiBusy[z.dataset.aidrop] && e.dataTransfer.files.length) aiProcess(z.dataset.aidrop, e.dataTransfer.files); });
