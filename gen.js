/* =========================================================================
   CoproVente — générateurs de documents et assistant de rédaction (IA)
   Sans clé IA : rédaction automatique à partir de modèles (hors ligne).
   Avec une clé Claude (Paramètres) : rédaction par Claude, depuis le navigateur.
   ========================================================================= */

/* ---------- IA (Claude, SDK officiel chargé à la demande) ---------- */
const aiOn = () => !!(App.settings.ai && App.settings.ai.key);
let anthropicMod = null;
async function aiAsk(system, prompt, maxTokens = 4000) {
  if (!aiOn()) throw new Error('IA non configurée (Paramètres › Assistant IA).');
  if (!anthropicMod) anthropicMod = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.39.0/+esm');
  const Anthropic = anthropicMod.default || anthropicMod.Anthropic;
  const client = new Anthropic({ apiKey: App.settings.ai.key.trim(), dangerouslyAllowBrowser: true });
  const res = await client.beta.messages.create({
    model: App.settings.ai.model || 'claude-opus-5-5', max_tokens: maxTokens, system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
  });
  if (res.stop_reason === 'refusal') throw new Error('La demande a été refusée par le modèle. Reformulez-la.');
  return res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}
const AI_SYSTEM = 'Tu es l’assistant de rédaction d’un agent immobilier français indépendant. Tu écris en français, dans un style professionnel, clair et chaleureux, sans exagération ni promesse. Tu n’inventes jamais de fait absent des informations fournies : si une information manque, tu l’omets. Tu ne mets pas de mise en forme Markdown (pas d’astérisques, pas de dièses).';
async function withAi(btn, fn) {
  const t = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = '⏳ Rédaction…'; }
  try { return await fn(); } catch (e) { toast(e.message || String(e), 'err'); return null; } finally { if (btn) { btn.disabled = false; btn.textContent = t; } }
}

/* ---------- Style des documents (neutre, moderne) ---------- */
const DOC2_CSS = `@page{margin:14mm}*{box-sizing:border-box}body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1f2937;margin:0;padding:0 2px;font-size:12.5px;line-height:1.55}
.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #d1d5db;padding-bottom:10px;margin-bottom:18px;font-size:11px;color:#4b5563}.top b{color:#111827;font-size:13px}
.kicker{text-transform:uppercase;letter-spacing:.14em;font-size:10.5px;color:#6b7280;margin:0}h1{font-size:26px;font-weight:600;margin:4px 0 2px;color:#111827;letter-spacing:-.01em}.sub{color:#6b7280;margin:0 0 14px}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#374151;margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid #e5e7eb}
.hero{width:100%;height:230px;object-fit:cover;border-radius:6px;margin:6px 0 4px}.thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}.thumbs img{width:100%;height:110px;object-fit:cover;border-radius:4px}
table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid #eef0f3;text-align:left;vertical-align:top}th{color:#6b7280;font-weight:500;width:38%}
.spec{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.spec div{background:#f6f7f9;border-radius:6px;padding:8px 10px}.spec small{display:block;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em}.spec b{font-size:14px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.box{background:#f6f7f9;border-radius:8px;padding:12px 14px}.price{border:1.5px solid #111827;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin:8px 0}
.price .big{font-size:24px;font-weight:600}.muted{color:#6b7280}.small{font-size:10.5px;color:#6b7280}ul{margin:4px 0;padding-left:18px}li{margin:2px 0}
.dpe{display:flex;gap:3px;margin:6px 0}.dpe span{width:26px;height:20px;display:grid;place-items:center;color:#fff;font-weight:700;font-size:11px;border-radius:3px;opacity:.35}.dpe span.on{opacity:1;outline:2px solid #111827}
.foot{margin-top:26px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:10px;color:#6b7280}.sig{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}.sig div{border:1px solid #9ca3af;border-radius:6px;min-height:95px;padding:8px;font-size:11px}
.line{border-bottom:1px dotted #6b7280;display:inline-block;min-width:160px}.check{display:inline-block;width:12px;height:12px;border:1px solid #374151;margin-right:6px;vertical-align:-1px}p{margin:6px 0}`;
const DPE_COL = { A: '#009a52', B: '#52b153', C: '#b4cf47', D: '#f2e600', E: '#f0b40f', F: '#eb7d1b', G: '#d7221f' };
const dpeScale = v => `<div class="dpe">${'ABCDEFG'.split('').map(l => `<span style="background:${DPE_COL[l]}" class="${v === l ? 'on' : ''}">${l}</span>`).join('')}</div>`;
const doc2 = (title, body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${DOC2_CSS}</style></head><body>${body}</body></html>`;
function agentTop(right) {
  const a = App.settings.agent;
  return `<div class="top"><div><b>${esc([a.prenom, a.nom].join(' ').trim() || 'Votre conseiller')}</b><br>${esc(a.statut || '')}${a.reseau ? ' · ' + esc(a.reseau) : ''}<br>${esc([a.tel, a.email].filter(Boolean).join(' · '))}</div><div style="text-align:right">${right || ''}</div></div>`;
}
function agentFoot(extra = '') {
  const a = App.settings.agent;
  return `<div class="foot">${extra}${[a.siren ? 'SIREN ' + a.siren : '', a.rsac ? 'RSAC ' + a.rsac : '', a.carte ? 'Carte professionnelle ' + a.carte : ''].filter(Boolean).map(esc).join(' · ')}<br>${esc(BRAND.docPied)}</div>`;
}
async function photosOf(d, max = 4) {
  const files = (await Store.filesOf(d.id)).filter(f => f.pieceId === 'photos' && /^image\//.test(f.type || '')).slice(0, max);
  return Promise.all(files.map(f => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f.blob); })));
}
const lines = s => String(s || '').split('\n').map(x => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
const bienSpecs = d => [['Type', d.bien.type], ['Surface Carrez', d.bien.surface ? d.bien.surface + ' m²' : ''], ['Pièces', d.bien.pieces], ['Étage', d.bien.etage],
  ['Construction', d.bien.annee], ['Chauffage', d.bien.chauffage], ['Occupation', { libre: 'Libre', loue: 'Loué', occupe: 'Occupé par le vendeur' }[d.bien.occupation]], ['DPE / GES', [d.bien.dpe, d.bien.ges].filter(Boolean).join(' / ')]].filter(x => x[1]);
function coproRows(d) {
  return [['Copropriété', d.copro.nom], ['Nombre de lots', d.copro.nbLots], ['Charges courantes annuelles (quote-part)', num(d.copro.charges) ? eur(d.copro.charges) : ''], ['Fonds de travaux (part du lot)', num(d.copro.fondsTravaux) ? eur(d.copro.fondsTravaux) : ''],
    ['Procédure en cours', d.copro.procedure === 'oui' ? (d.copro.procedureDetail || 'oui') : d.copro.procedure === 'non' ? 'Aucune' : ''], ['Lots', d.lots.some(l => l.num) ? lotsText(d) : '']].filter(x => x[1]);
}
const rows = arr => `<table>${arr.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
function copyModal(title, to, subject, body, d) {
  if (d) return openCompose(d, { canal: 'vendeur', to, subject, body, title });
  openModal(title, `<div class="grid4"><div class="field span4"><span>Destinataire</span><div class="cfield"><input id="cm_to" value="${esc(to || '')}"><button class="btn small" data-a="cmCopy" data-f="cm_to">📋</button></div></div>
    <div class="field span4"><span>Objet</span><div class="cfield"><input id="cm_su" value="${esc(subject || '')}"><button class="btn small" data-a="cmCopy" data-f="cm_su">📋</button></div></div>
    <div class="field span4"><span>Message</span><textarea id="cm_bo" rows="16">${esc(body || '')}</textarea></div></div>
    <div class="row gap modal-actions"><button class="btn primary" data-a="cmCopy" data-f="cm_bo">📋 Copier le message</button></div>`, { wide: true });
}

/* =========================================================================
   RENDU D'ESTIMATION
   ========================================================================= */
async function renduHtml(e) {
  const d = estBien(e), c = contactById(e.contactId), R = e.rendu || {}, ph = d ? await photosOf(d, 4) : [];
  const m2 = num(e.prixReco) && d && num(d.bien.surface) ? Math.round(e.prixReco / d.bien.surface) : null;
  const signaux = d ? SIGNAUX.filter(s => (d.signaux[s.id] || {}).etat === 'oui').map(s => s.label) : [];
  const comps = (R.comparables || []).filter(x => x.adresse || x.prix);
  return doc2('Rendu d’estimation', `${agentTop(`Rendu d’estimation<br>${fdate(e.restitPrevue || today())}`)}
  <p class="kicker">Avis de valeur</p><h1>${esc(d ? dossierTitle(d) : 'Votre bien')}</h1><p class="sub">Préparé pour ${esc(cName(c) || 'le propriétaire')}${e.dateVisite ? ' · visite du ' + fdate(e.dateVisite) : ''}</p>
  ${ph[0] ? `<img class="hero" src="${ph[0]}">${ph.length > 1 ? `<div class="thumbs">${ph.slice(1).map(s => `<img src="${s}">`).join('')}</div>` : ''}` : ''}
  <div class="price"><div><span class="muted">Fourchette de valeur</span><br><b>${eur(e.prixBas)} – ${eur(e.prixHaut)}</b></div><div style="text-align:right"><span class="muted">Prix de présentation recommandé</span><br><span class="big">${eur(e.prixReco)}</span>${m2 ? `<br><span class="small">soit ${eur(m2)} / m² Carrez</span>` : ''}</div></div>
  ${R.contexte ? `<h2>Votre projet</h2><p>${esc(R.contexte).replace(/\n/g, '<br>')}</p>` : ''}
  ${d ? `<h2>Le bien</h2><div class="spec">${bienSpecs(d).slice(0, 8).map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>${d.bien.dpe ? dpeScale(d.bien.dpe) : ''}
    ${d.bien.description ? `<p>${esc(d.bien.description)}</p>` : ''}${R.etat ? `<p><b>État général :</b> ${esc(R.etat)}</p>` : ''}
    <h2>La copropriété</h2>${rows(coproRows(d))}` : ''}
  ${R.environnement ? `<h2>Environnement</h2><p>${esc(R.environnement).replace(/\n/g, '<br>')}</p>` : ''}
  ${lines(R.pointsForts).length || lines(R.pointsAttention).length || signaux.length ? `<div class="two"><div><h2>Points forts</h2><ul>${lines(R.pointsForts).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><h2>Points d’attention</h2><ul>${lines(R.pointsAttention).concat(signaux).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
  ${comps.length ? `<h2>Biens comparables</h2><table><tr><th style="width:auto">Adresse / secteur</th><th style="width:auto">Surface</th><th style="width:auto">Prix</th><th style="width:auto">€/m²</th><th style="width:auto">Statut</th></tr>
    ${comps.map(x => `<tr><td>${esc(x.adresse || '')}</td><td>${x.surface ? esc(x.surface) + ' m²' : ''}</td><td>${eur(x.prix)}</td><td>${num(x.prix) && num(x.surface) ? eur(Math.round(x.prix / x.surface)) : ''}</td><td>${esc(x.statut || '')}</td></tr>`).join('')}</table>` : ''}
  ${R.analyse ? `<h2>Analyse et justification du prix</h2><p>${esc(R.analyse).replace(/\n/g, '<br>')}</p>` : ''}
  ${R.strategie || R.delai || R.honoraires ? `<h2>Notre proposition</h2>${R.strategie ? `<p>${esc(R.strategie).replace(/\n/g, '<br>')}</p>` : ''}${rows([['Délai de vente estimé', R.delai], ['Honoraires', R.honoraires]].filter(x => x[1]))}` : ''}
  ${agentFoot('Avis de valeur établi à partir des informations communiquées et de la visite du bien. Il ne constitue pas une expertise immobilière. ')}`);
}
function renduMailText(e) {
  const c = contactById(e.contactId), d = estBien(e), civ = c ? (c.civ === 'Mme' ? 'Madame ' : c.civ === 'M.' ? 'Monsieur ' : '') + (c.nom || '') : '';
  return { to: c ? c.email : '', subject: `Rendu d’estimation — ${d ? dossierTitle(d) : 'votre bien'}`,
    body: `Bonjour ${civ.trim() || ''},\n\nSuite à notre rendez-vous${e.dateVisite ? ' du ' + fdate(e.dateVisite) : ''}, je vous adresse le rendu d’estimation de votre bien${d ? ' situé ' + dossierTitle(d) : ''}.\n\nEn résumé :\n- Fourchette de valeur : ${eur(e.prixBas)} – ${eur(e.prixHaut)}\n- Prix de présentation recommandé : ${eur(e.prixReco)}${e.rendu.delai ? '\n- Délai de vente estimé : ' + e.rendu.delai : ''}\n\nCe prix tient compte des caractéristiques du bien, de la copropriété et des ventes récentes du secteur. Le document joint détaille les points forts, les points d’attention et la stratégie de commercialisation que je vous propose.\n\nJe vous propose d’en échanger de vive voix : seriez-vous disponible dans les prochains jours ?\n\n${signature()}` };
}

/* =========================================================================
   COMPTES RENDUS DE VISITE
   ========================================================================= */
const INT_TXT = { 1: 'faible', 2: 'moyen', 3: 'fort' }, PRIX_TXT = { cher: 'jugé élevé', correct: 'jugé cohérent', attractif: 'jugé attractif' };
function crTemplate(v) {
  const d = App.dossiers.find(x => x.id === v.dossierId), q = contactById(v.acquereurId), owners = d ? civilite(d.vendeurs) : 'Madame, Monsieur';
  const fin = q ? (FINANCEMENT.find(x => x[0] === q.acq.financement) || ['', ''])[1] : '', suite = (SUITES.find(x => x[0] === v.suite) || ['', ''])[1];
  const analyse = (v.objections || []).includes('Prix') || v.prix === 'cher' ? 'Le prix ressort comme un frein : je vous propose d’en parler si cette remarque se confirme lors des prochaines visites.'
    : +v.interet >= 3 ? 'Le retour est encourageant ; je reste en contact étroit avec ce visiteur.' : 'Je poursuis la commercialisation et vous tiens informé(e) des prochains retours.';
  const vend = `Bonjour ${owners},\n\nVoici le compte rendu de la visite de votre bien${d ? ' (' + dossierTitle(d) + ')' : ''} du ${fdatetime(v.quand)}.\n\n` +
    `Visiteur : ${q ? (q.prenom ? q.prenom + ' ' : '') + (q.nom ? q.nom.charAt(0) + '.' : '') : 'acquéreur'}${fin ? ' — financement : ' + fin.toLowerCase() : ''}\nIntérêt exprimé : ${INT_TXT[v.interet] || 'non précisé'}\n` +
    `${(v.aime || []).length ? 'Points appréciés : ' + v.aime.join(', ').toLowerCase() + '\n' : ''}${(v.objections || []).length ? 'Réserves exprimées : ' + v.objections.join(', ').toLowerCase() + '\n' : ''}` +
    `${v.prix ? 'Prix : ' + PRIX_TXT[v.prix] + '\n' : ''}${suite && suite !== '—' ? 'Suite envisagée : ' + suite.toLowerCase() + '\n' : ''}${v.commentaire ? '\nEn quelques mots : ' + v.commentaire + '\n' : ''}\n${analyse}\n\n${signature()}`;
  const civQ = q ? (q.civ === 'Mme' ? 'Madame ' : q.civ === 'M.' ? 'Monsieur ' : '') + (q.nom || '') : '';
  const next = { documents: 'Je vous adresse comme convenu les documents demandés.', '2e': 'Je vous propose de fixer une seconde visite : quelles sont vos disponibilités ?', offre: 'Si vous souhaitez formuler une offre, je vous transmets une proposition d’offre d’achat à compléter et signer.', rappel: 'Je vous rappelle prochainement pour recueillir votre avis.' }[v.suite] || 'N’hésitez pas à revenir vers moi pour toute question.';
  const visit = `Bonjour ${civQ.trim()},\n\nMerci pour votre visite${d ? ' du bien situé ' + dossierTitle(d) : ''} le ${fdatetime(v.quand)}.\n\n${(v.aime || []).length ? 'Vous avez notamment apprécié : ' + v.aime.join(', ').toLowerCase() + '.\n' : ''}${(v.objections || []).length ? 'Vous avez relevé : ' + v.objections.join(', ').toLowerCase() + '. Je reste à votre disposition pour vous apporter des précisions sur ces points.\n' : ''}\n${next}\n\n${signature()}`;
  return { vend, visit };
}
async function crGenerate(v, btn) {
  const base = crTemplate(v);
  if (!aiOn()) { v.crVendeur = base.vend; v.crVisiteur = base.visit; return; }
  const d = App.dossiers.find(x => x.id === v.dossierId), q = contactById(v.acquereurId);
  const data = { bien: d ? dossierTitle(d) : '', proprietaires: d ? civilite(d.vendeurs) : '', date: fdatetime(v.quand), visiteur: q ? cName(q) : '', financement_visiteur: q ? (FINANCEMENT.find(x => x[0] === q.acq.financement) || ['', ''])[1] : '',
    interet: INT_TXT[v.interet] || '', points_apprecies: v.aime, objections: v.objections, appreciation_prix: PRIX_TXT[v.prix] || '', suite: (SUITES.find(x => x[0] === v.suite) || ['', ''])[1], commentaire: v.commentaire, signature: signature() };
  const out = await withAi(btn, () => aiAsk(AI_SYSTEM, `Rédige deux courts messages à partir de ce compte rendu de visite (données JSON) :\n${JSON.stringify(data)}\n\n1) Un compte rendu pour le(s) propriétaire(s) : factuel, constructif, avec une phrase d’analyse ; n’indique que l’initiale du nom du visiteur.\n2) Un message de suivi pour le visiteur : remerciement, rappel des points évoqués, prochaine étape selon la suite.\nTermine chaque message par la signature fournie. Sépare les deux messages par une ligne contenant exactement === VISITEUR ===`));
  if (!out) { v.crVendeur = base.vend; v.crVisiteur = base.visit; return; }
  const [a, b] = out.split(/===\s*VISITEUR\s*===/);
  v.crVendeur = (a || base.vend).trim(); v.crVisiteur = (b || base.visit).trim();
}
function crPdfHtml(v) {
  const d = App.dossiers.find(x => x.id === v.dossierId);
  return doc2('Compte rendu de visite', `${agentTop(`Compte rendu de visite<br>${fdate(v.quand.slice(0, 10))}`)}<p class="kicker">Compte rendu de visite</p><h1>${esc(d ? dossierTitle(d) : '')}</h1><p class="sub">Visite du ${fdatetime(v.quand)}</p>
    <div class="spec"><div><small>Intérêt</small><b>${esc(INT_TXT[v.interet] || '—')}</b></div><div><small>Prix</small><b>${esc(PRIX_TXT[v.prix] || '—')}</b></div><div><small>Suite</small><b>${esc((SUITES.find(x => x[0] === v.suite) || ['', '—'])[1])}</b></div><div><small>Statut</small><b>${esc((ST_VISITE.find(x => x[0] === v.statut) || ['', ''])[1])}</b></div></div>
    <div class="two"><div><h2>Points appréciés</h2><ul>${(v.aime || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul></div><div><h2>Réserves</h2><ul>${(v.objections || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul></div></div>
    <h2>Compte rendu</h2><p>${esc(v.crVendeur || crTemplate(v).vend).replace(/\n/g, '<br>')}</p>${agentFoot()}`);
}

/* =========================================================================
   BILAN VENDEUR
   ========================================================================= */
function bilanData(d) {
  const vis = visitesOf(d).filter(v => v.statut === 'realisee' || visitePassee(v)), since = d.com.dernierBilan || '';
  const recent = since ? vis.filter(v => v.quand.slice(0, 10) > since) : vis;
  const cnt = arr => { const o = {}; arr.forEach(x => { o[x] = (o[x] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  return { vis, recent, aime: cnt(vis.flatMap(v => v.aime || [])), obj: cnt(vis.flatMap(v => v.objections || [])), forts: vis.filter(v => +v.interet === 3).length,
    cher: vis.filter(v => v.prix === 'cher').length, actions: (d.com.actions || []).filter(a => a.done).map(a => a.txt), jours: d.com.dateEntree ? -daysUntil(d.com.dateEntree) : null };
}
function bilanText(d) {
  const B = bilanData(d), owners = civilite(d.vendeurs);
  const reco = B.vis.length >= 4 && B.cher / B.vis.length >= 0.5 ? 'Plus de la moitié des visiteurs jugent le prix élevé : je vous propose d’échanger sur un ajustement pour relancer l’intérêt.'
    : B.vis.length < 2 && B.jours > 21 ? 'L’activité est faible depuis la mise en vente : je vous propose de revoir ensemble l’annonce, les photos et le positionnement prix.' : 'La commercialisation suit son cours ; je vous tiens informé(e) de chaque retour.';
  return `Bonjour ${owners},\n\nVoici le point sur la commercialisation de votre bien (${dossierTitle(d)})${B.jours != null ? `, en vente depuis ${B.jours} jours` : ''}.\n\n` +
    `- Prix actuel : ${eur(prixActuel(d))}\n- Demandes reçues : ${num(d.com.demandes) || 0}\n- Visites réalisées : ${B.vis.length}${B.recent.length !== B.vis.length ? ` (dont ${B.recent.length} depuis notre dernier point)` : ''}\n- Visiteurs très intéressés : ${B.forts}\n- Offres reçues : ${num(d.com.offres) || 0}\n` +
    `${B.aime.length ? `\nCe que les visiteurs apprécient : ${B.aime.slice(0, 4).map(([k, n]) => `${k.toLowerCase()} (${n})`).join(', ')}.` : ''}${B.obj.length ? `\nLes réserves les plus fréquentes : ${B.obj.slice(0, 4).map(([k, n]) => `${k.toLowerCase()} (${n})`).join(', ')}.` : ''}` +
    `${B.actions.length ? `\n\nActions réalisées : ${B.actions.join(', ').toLowerCase()}.` : ''}\n\n${reco}\n\n${signature()}`;
}
function bilanHtml(d, text) {
  const B = bilanData(d);
  return doc2('Bilan de commercialisation', `${agentTop(`Bilan de commercialisation<br>${fdate(today())}`)}<p class="kicker">Bilan vendeur</p><h1>${esc(dossierTitle(d))}</h1>
    <div class="spec"><div><small>Prix actuel</small><b>${eur(prixActuel(d))}</b></div><div><small>Demandes</small><b>${num(d.com.demandes) || 0}</b></div><div><small>Visites</small><b>${B.vis.length}</b></div><div><small>Offres</small><b>${num(d.com.offres) || 0}</b></div></div>
    <div class="two"><div><h2>Points appréciés</h2><ul>${B.aime.slice(0, 6).map(([k, n]) => `<li>${esc(k)} (${n})</li>`).join('') || '<li>—</li>'}</ul></div><div><h2>Réserves</h2><ul>${B.obj.slice(0, 6).map(([k, n]) => `<li>${esc(k)} (${n})</li>`).join('') || '<li>—</li>'}</ul></div></div>
    ${(d.com.historiquePrix || []).length ? `<h2>Évolution du prix</h2>${rows(d.com.historiquePrix.map(h => [fdate(h.date), eur(h.prix)]))}` : ''}
    <h2>Visites</h2><table>${B.vis.map(v => `<tr><td>${fdatetime(v.quand)}</td><td>Intérêt ${esc(INT_TXT[v.interet] || '—')}</td><td>${esc((v.objections || []).join(', '))}</td></tr>`).join('') || '<tr><td>Aucune visite</td></tr>'}</table>
    <h2>Commentaire</h2><p>${esc(text).replace(/\n/g, '<br>')}</p>${agentFoot()}`);
}

/* =========================================================================
   ANNONCE
   ========================================================================= */
const ATOUTS = ['Lumineux', 'Traversant', 'Calme', 'Balcon / terrasse', 'Vue dégagée', 'Ascenseur', 'Cave', 'Parking', 'Proche transports', 'Proche commerces et écoles', 'Rénové', 'Belles prestations', 'Copropriété bien entretenue', 'Faibles charges', 'Gardien'];
function annonceMentions(d) {
  const c = d.copro, b = d.bien, prix = num(d.com.prixActuel) || num(d.mandat.prix), hon = num(d.mandat.honoraires), a = App.settings.agent, L = [];
  if (prix) L.push(d.mandat.charge === 'acquereur' && hon ? `Prix : ${eur(prix)} honoraires inclus à la charge de l’acquéreur (${(hon / (prix - hon) * 100).toFixed(2).replace('.', ',')} % TTC du prix hors honoraires). Prix hors honoraires : ${eur(prix - hon)}.` : `Prix : ${eur(prix)}. Honoraires à la charge du vendeur.`);
  L.push(`Bien soumis au statut de la copropriété${c.nbLots ? ` — ${c.nbLots} lots` : ' — [nombre] lots'}. Montant moyen annuel des charges : ${num(c.charges) ? eur(c.charges) : '[montant] €'}. ${c.procedure === 'oui' ? `Procédure en cours : ${c.procedureDetail || '[préciser]'}.` : c.procedure === 'non' ? 'Aucune procédure en cours.' : '[Procédure : à vérifier]'}`);
  L.push(b.dpe ? `DPE : classe énergie ${b.dpe}${b.ges ? ', classe climat ' + b.ges : ''}. Montant estimé des dépenses annuelles d’énergie pour un usage standard : [fourchette] (prix de l’énergie de référence [année]).${['F', 'G'].includes(b.dpe) ? ' Logement à consommation énergétique excessive.' : ''}` : 'DPE : [classes énergie et climat, dépenses annuelles estimées, année de référence].');
  L.push('Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques : www.georisques.gouv.fr');
  L.push([a.prenom || a.nom ? `${[a.prenom, a.nom].join(' ').trim()}${a.statut ? ', ' + a.statut.toLowerCase() : ''}` : '', a.siren ? 'SIREN ' + a.siren : '', a.rsac ? 'RSAC ' + a.rsac : '', a.carte ? 'carte professionnelle ' + a.carte : ''].filter(Boolean).join(' — ') || '[Agence : SIREN et inscription au guichet unique / RSAC]');
  return L.join('\n');
}
function annonceText(d) { return annonceMentions(d); }
function annonceTemplate(d) {
  const b = d.bien, A = d.com.annonce, at = A.atouts || [], pieces = num(b.pieces);
  const titre = `${b.type || 'Appartement'}${pieces ? ' ' + pieces + ' pièce' + (pieces > 1 ? 's' : '') : ''}${b.surface ? ' de ' + String(b.surface).replace('.', ',') + ' m²' : ''}${b.ville ? ' — ' + b.ville : ''}`;
  const ton = A.ton === 'premium' ? ['Rare', 'Élégant', 'raffiné'] : A.ton === 'sobre' ? ['', '', 'agréable'] : ['Coup de cœur', 'Idéalement situé', 'chaleureux'];
  const intro = `${ton[0] ? ton[0] + ' ! ' : ''}${ton[1] ? ton[1] + ', ' : ''}${ton[1] ? 'découvrez' : 'Découvrez'} ce${/^(Appartement|Studio|Duplex)/.test(b.type || 'Appartement') ? 't' : ''} ${(b.type || 'appartement').toLowerCase()}${pieces ? ' de ' + pieces + ' pièces' : ''}${b.surface ? ' offrant ' + String(b.surface).replace('.', ',') + ' m² Carrez' : ''}${b.etage ? ', situé au ' + b.etage + (b.etage == 1 ? 'er' : 'e') + ' étage' : ''}${b.ville ? ' à ' + b.ville : ''}.`;
  const atouts = at.length ? `\n\nSes atouts : ${at.map(x => x.toLowerCase()).join(', ')}.` : '';
  const desc = b.description ? `\n\n${b.description}` : '';
  const etat = A.etat ? `\n\nÉtat : ${A.etat.toLowerCase()}.` : '';
  const lots = d.lots.filter(l => l.num && !/appartement/i.test(l.nature || '')).map(l => (l.nature || '').toLowerCase()).filter(Boolean);
  const annex = lots.length ? `\nLe bien est vendu avec : ${lots.join(', ')}.` : '';
  const fin = `\n\nUn cadre de vie ${ton[2]} à visiter sans tarder. Contactez-moi pour organiser une visite.`;
  return { titre, texte: intro + atouts + desc + etat + annex + fin };
}
function annonceEditor(d) {
  const A = d.com.annonce;
  return `<div class="grid4">${field('Ton', 'com.annonce.ton', { options: [['commercial', 'Commercial'], ['sobre', 'Sobre'], ['premium', 'Haut de gamme']] })}${field('État du bien (mention obligatoire)', 'com.annonce.etat', { options: ['', 'Neuf', 'Rénové', 'Très bon état', 'Bon état', 'Rafraîchissement à prévoir', 'Travaux à prévoir'], r: true })}</div>
  <h3>Atouts à mettre en avant</h3><div class="chips">${ATOUTS.map(x => `<button class="chip ${(A.atouts || []).includes(x) ? 'on' : ''}" data-a="atoutToggle" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="row gap wrap"><button class="btn primary" data-a="annonceGen">${aiOn() ? '✨ Rédiger avec l’IA' : '⚡ Rédiger l’annonce'}</button></div>
  ${field('Titre', 'com.annonce.titre')}${field('Texte de l’annonce', 'com.annonce.texte', { area: true, rows: 9 })}
  <h3>Mentions obligatoires (ajoutées en fin d’annonce)</h3><pre class="preview mono">${esc(annonceMentions(d))}</pre>
  <div class="row gap wrap"><button class="btn" data-a="annonceCopy" data-w="titre">📋 Copier le titre</button><button class="btn primary" data-a="annonceCopy" data-w="tout">📋 Copier l’annonce complète</button></div>
  <h3>📌 Pense-bête : mentions obligatoires d’une annonce en copropriété</h3><ul class="mentions">${MENTIONS_ANNONCE.map(([t, ok]) => { let v = false; try { v = ok(d); } catch (e) {} return `<li class="${v ? 'okc' : 'soon'}">${v ? '✔' : '⚠️'} ${esc(t)}</li>`; }).join('')}</ul>
  <p class="small muted">Source : Service Public, « Que doit indiquer l’annonce d’une vente immobilière ? » (vérifié le 12/09/2025) — CCH L.721-1 s., arrêté du 10 janvier 2017.</p>`;
}

/* =========================================================================
   FICHE DE COMMERCIALISATION
   ========================================================================= */
async function ficheHtml(d) {
  const ph = await photosOf(d, 4), A = d.com.annonce, t = A.titre || annonceTemplate(d).titre;
  return doc2('Fiche de commercialisation', `${agentTop(`Réf. ${esc(d.ref)}`)}<p class="kicker">À vendre${d.bien.ville ? ' · ' + esc(d.bien.ville) : ''}</p><h1>${esc(t)}</h1>
    ${ph[0] ? `<img class="hero" src="${ph[0]}">${ph.length > 1 ? `<div class="thumbs">${ph.slice(1).map(s => `<img src="${s}">`).join('')}</div>` : ''}` : ''}
    <div class="price"><div><span class="muted">Prix</span><br><span class="big">${eur(prixActuel(d))}</span></div><div style="text-align:right">${d.bien.dpe ? `<span class="muted">DPE</span>${dpeScale(d.bien.dpe)}` : ''}</div></div>
    <div class="spec">${bienSpecs(d).slice(0, 8).map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>
    <h2>Description</h2><p>${esc(A.texte || d.bien.description || annonceTemplate(d).texte).replace(/\n/g, '<br>')}</p>
    <h2>Copropriété</h2>${rows(coproRows(d))}
    <h2>Informations réglementaires</h2><p class="small">${esc(annonceMentions(d)).replace(/\n/g, '<br>')}</p>${agentFoot()}`);
}

/* =========================================================================
   PROPOSITION D'OFFRE D'ACHAT (modèle à compléter et signer)
   ========================================================================= */
function offreModeleHtml(d, q, o) {
  const a = App.settings.agent, b = d.bien, prix = prixActuel(d), dots = '……………………………………';
  const acqLine = q ? `${esc(cName(q))}<br>${esc(q.adresse || dots)}<br>Tél. : ${esc(q.tel || dots)} · E-mail : ${esc(q.email || dots)}` : `Nom(s) et prénom(s) : ${dots}<br>Adresse : ${dots}${dots}<br>Téléphone : ${dots} · E-mail : ${dots}`;
  const price = o.prixPre && num(o.prix) ? `<b>${eur(o.prix)}</b> (${esc(eurLettres(o.prix))})` : `<span class="line"></span> euros (en lettres : <span class="line" style="min-width:260px"></span>)`;
  return doc2('Offre d’achat', `<div class="two"><div style="font-size:11.5px">${acqLine}</div><div style="font-size:11.5px;text-align:right">${esc(names(d.vendeurs) || 'Propriétaire vendeur')}<br>${esc((d.vendeurs[0] || {}).adresse || '')}<br><br>À <span class="line" style="min-width:90px"></span>, le <span class="line" style="min-width:90px"></span></div></div>
  <h1 style="text-align:center;margin-top:18px">OFFRE D’ACHAT D’UN BIEN IMMOBILIER</h1>
  <p><b>Objet :</b> offre d’achat — envoi par e-mail à l’adresse ${esc(a.email || dots)} ou par lettre recommandée avec accusé de réception.</p>
  <p>Madame, Monsieur,</p><p>Je m’engage / nous nous engageons <span class="small">(rayer la mention inutile)</span> à acquérir de façon ferme et irrévocable le bien désigné ci-dessous :</p>
  ${rows([['Nature et type du bien', `${b.type || 'Appartement'}${b.pieces ? ', ' + b.pieces + ' pièces' : ''}${b.etage ? ', ' + b.etage + 'e étage' : ''}, dépendant d’un immeuble soumis au statut de la copropriété — lots n° ${lotsText(d)}`],
    ['Localisation du bien', [b.adresse, [b.cp, b.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Superficie indiquée par le vendeur', b.surface ? b.surface + ' m² (loi Carrez)' : ''],
    ['Prix proposé par le vendeur', prix ? `${eur(prix)} (${eurLettres(prix)})${num(d.mandat.honoraires) ? `, honoraires d’agence ${d.mandat.charge === 'acquereur' ? 'à la charge de l’acquéreur inclus' : 'à la charge du vendeur'}` : ''}` : '']])}
  <h2>Prix de l’offre</h2><p>Je m’engage / nous nous engageons à acheter ce bien au prix de ${price}, hors frais de notaire. En cas d’acceptation de la présente offre, ce montant sera payé dans sa totalité le jour de la signature de l’acte de vente notarié.</p>
  <h2>Financement <span class="small">(cocher)</span></h2><p><span class="check"></span>L’offre d’achat est consentie sous réserve de la réalisation de la condition suspensive d’obtention d’un crédit immobilier d’un montant de <span class="line"></span> euros (en lettres : <span class="line" style="min-width:220px"></span>).</p>
  <p><span class="check"></span>Le prix indiqué dans la présente offre sera payé sans l’aide d’un prêt.</p>
  <h2>Durée de l’offre</h2><p>Conformément aux articles 1116 et 1117 du Code civil, en l’absence d’acceptation de la présente offre, celle-ci s’éteindra le <span class="line" style="min-width:120px"></span> à minuit.</p>
  <h2>Destinataire</h2><p>La présente offre d’achat est destinée au mandataire du vendeur, ${esc([a.civ === 'Mme' ? 'Madame' : a.civ === 'M.' ? 'Monsieur' : '', a.prenom, a.nom].filter(Boolean).join(' ') || dots)}${a.reseau ? ' (' + esc(a.reseau) + ')' : ''}, ${esc(a.adresse || dots)}${d.mandat.numero ? `, titulaire du mandat de vente n° ${esc(d.mandat.numero)}` : ''}.</p>
  <p>Je vous serais / nous vous serions gré de nous communiquer les diagnostics techniques et les documents de copropriété liés au bien vendu, dont les informations financières prévues à l’article L.721-2 du Code de la construction et de l’habitation.</p>
  <p class="small">Aucun versement ne peut être exigé ni accepté de l’acquéreur avant la signature de l’avant-contrat (art. 1589-1 du Code civil). L’acquéreur bénéficiera d’un délai de rétractation de dix jours après la signature de l’avant-contrat (art. L.271-1 CCH).</p>
  <div class="sig"><div><b>Date et signature de l’acquéreur</b><br><span class="small">précédée de la mention « Bon pour offre d’achat »</span></div><div><b>Date et signature du second acquéreur</b> <span class="small">(le cas échéant)</span></div></div>`);
}

/* =========================================================================
   FACTURE D'HONORAIRES
   ========================================================================= */
function factureNum() { const a = App.settings.agent, n = num(a.factureNext) || 1; return `${new Date().getFullYear()}-${String(n).padStart(3, '0')}`; }
function factureHtml(o) {
  const a = App.settings.agent, tva20 = /20/.test(a.tva || ''), ttc = num(o.montant) || 0, ht = tva20 ? Math.round(ttc / 1.2 * 100) / 100 : ttc, tva = Math.round((ttc - ht) * 100) / 100, pro = o.destType === 'reseau';
  return doc2('Facture ' + o.numero, `<div class="two"><div><b style="font-size:15px">${esc([a.prenom, a.nom].join(' ').trim() || '[Votre nom]')}</b><br>${esc(a.statut || '')}${a.reseau ? '<br>' + esc(a.reseau) : ''}<br>${esc(a.adresse || '[adresse]')}<br>${esc([a.tel, a.email].filter(Boolean).join(' · '))}
    <br><span class="small">${[a.siren ? 'SIREN ' + a.siren : 'SIREN [à compléter]', a.rsac ? 'RSAC ' + a.rsac : '', tva20 && a.tvaIntra ? 'TVA ' + a.tvaIntra : ''].filter(Boolean).map(esc).join(' · ')}</span></div>
    <div style="text-align:right"><p class="kicker">Facture</p><h1 style="margin:2px 0">N° ${esc(o.numero)}</h1><p>Date : ${fdate(o.date)}</p></div></div>
  <div class="box" style="margin:18px 0 10px;max-width:60%"><span class="small">Facturé à</span><br><b>${esc(o.client || '[client]')}</b><br>${esc(o.clientAdresse || '').replace(/\n/g, '<br>')}</div>
  <table><tr><th style="width:auto">Désignation</th><th style="width:120px;text-align:right">Montant HT</th></tr><tr><td>${esc(o.designation).replace(/\n/g, '<br>')}</td><td style="text-align:right">${eur(ht, 2)}</td></tr></table>
  <table style="width:50%;margin-left:auto;margin-top:10px"><tr><th>Total HT</th><td style="text-align:right">${eur(ht, 2)}</td></tr><tr><th>${tva20 ? 'TVA 20 %' : 'TVA'}</th><td style="text-align:right">${tva20 ? eur(tva, 2) : '—'}</td></tr><tr><th><b>Total TTC</b></th><td style="text-align:right"><b>${eur(ttc, 2)}</b></td></tr></table>
  ${tva20 ? '' : `<p class="small">${esc(a.tva || 'TVA non applicable, art. 293 B du CGI')}</p>`}
  <h2>Règlement</h2><p>Échéance : ${o.echeance ? fdate(o.echeance) : 'à réception de la facture'}.${a.iban ? ` Virement sur le compte IBAN ${esc(a.iban)}.` : ''}</p>
  ${pro ? '<p class="small">En cas de retard de paiement : pénalités au taux de 3 fois le taux d’intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L.441-10 et D.441-5 du Code de commerce). Pas d’escompte pour paiement anticipé.</p>' : '<p class="small">Pas d’escompte pour paiement anticipé.</p>'}
  ${agentFoot()}`);
}
function factureForm(d) {
  const a = App.settings.agent, ch = d && d.mandat.charge === 'acquereur' ? d.acquereurs : d ? d.vendeurs : [];
  const cl = ch.find(p => p.nom) || {}, acte = d ? (d.vente.acteRealise || d.dates.acte) : '';
  return `<div class="grid4"><label class="field span2"><span>Bien</span>${bienSelect('fa_bien', d ? d.id : '')}</label>
    <label class="field"><span>N° de facture</span><input id="fa_num" value="${esc(factureNum())}"></label><label class="field"><span>Date</span><input type="date" id="fa_date" value="${today()}"></label>
    <label class="field span2"><span>Destinataire</span><select id="fa_type" data-a-change="factureType"><option value="client">Client (${d && d.mandat.charge === 'acquereur' ? 'acquéreur' : 'vendeur'})</option><option value="reseau">Mon réseau / agence (commission)</option></select></label>
    <label class="field span2"><span>Nom du destinataire</span><input id="fa_client" value="${esc(personName(cl))}"></label>
    <label class="field span4"><span>Adresse du destinataire</span><textarea id="fa_adr" rows="2">${esc(cl.adresse || '')}</textarea></label>
    <label class="field span4"><span>Désignation</span><textarea id="fa_des" rows="3">${esc(d ? `Honoraires de négociation — vente du bien situé ${dossierTitle(d)}${d.lots.some(l => l.num) ? ', lots n° ' + lotsText(d) : ''}${d.mandat.numero ? '\nMandat n° ' + d.mandat.numero + ' du ' + fdate(d.mandat.date) : ''}${acte ? '\nActe authentique du ' + fdate(acte) : ''}` : 'Honoraires de négociation immobilière')}</textarea></label>
    <label class="field"><span>Montant TTC (€)</span><input type="number" step="0.01" id="fa_mt" value="${d ? esc(d.vente.honoFacture || d.mandat.honoraires || '') : ''}"></label>
    <label class="field"><span>Échéance</span><input type="date" id="fa_ech"></label><div class="field span2"><span>Régime de TVA</span><div class="readout">${esc(a.tva || 'TVA non applicable, art. 293 B du CGI')} <a href="#/profil" class="small">modifier</a></div></div></div>
    ${!a.siren || !a.adresse ? '<p class="warn small">Complétez votre SIREN et votre adresse dans « Mon profil » : ce sont des mentions obligatoires de la facture.</p>' : ''}
    <div class="row gap wrap modal-actions"><button class="btn primary" data-a="factureDo" data-how="print">🖨️ Imprimer / PDF</button><button class="btn" data-a="factureDo" data-how="word">⬇️ Word</button><button class="btn" data-a="factureDo" data-how="save">💾 Ranger dans le dossier et marquer facturé</button></div>`;
}
function factureValues() {
  return { bienId: $('#fa_bien').value, numero: $('#fa_num').value.trim(), date: $('#fa_date').value || today(), destType: $('#fa_type').value, client: $('#fa_client').value.trim(), clientAdresse: $('#fa_adr').value.trim(), designation: $('#fa_des').value.trim(), montant: $('#fa_mt').value, echeance: $('#fa_ech').value };
}

/* =========================================================================
   ASSISTANT E-MAIL
   ========================================================================= */
function mailTemplate(o) {
  const c = o.cid ? contactById(o.cid) : null, d = o.did ? App.dossiers.find(x => x.id === o.did) : null;
  const civ = c ? ((c.civ === 'Mme' ? 'Madame ' : c.civ === 'M.' ? 'Monsieur ' : '') + (c.nom || '')).trim() : (o.nom || 'Madame, Monsieur');
  const formel = o.ton === 'formel', obj = (o.objectif || '').trim().replace(/\.$/, '');
  return { to: c ? c.email : '', subject: (obj.charAt(0).toUpperCase() + obj.slice(1)).slice(0, 70) + (d ? ' — ' + dossierTitle(d) : ''),
    body: `${o.role === 'notaire' && !c ? 'Maître' : (formel ? 'Madame, Monsieur' : 'Bonjour ' + civ)},\n\nJe me permets de vous écrire ${d ? 'au sujet du bien situé ' + dossierTitle(d) + ' ' : ''}afin de ${obj.charAt(0).toLowerCase() + obj.slice(1)}.\n\n[Précisez ici les éléments utiles.]\n\n${formel ? 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.' : 'Je reste à votre disposition et vous remercie par avance de votre retour.'}\n\n${signature()}` };
}

/* =========================================================================
   PAGE OUTILS
   ========================================================================= */
function viewOutilsHub(sub) {
  if (sub === 'offre') return toolOffre();
  if (sub === 'mail') return toolMail();
  if (sub === 'fiche' || sub === 'annonce') return toolPickBien(sub);
  if (sub === 'travaux') return toolTravaux();
  if (sub === 'resolution') return toolResolution();
  if (sub === 'facture') return `<a href="#/outils" class="muted small">← Outils</a><div class="page-head"><div><h1>🧾 Facture d’honoraires</h1><p class="muted">Pré-remplie depuis le bien, le mandat et votre profil. Numérotation automatique.</p></div></div><section class="card">${factureForm(App.dossiers.find(d => d.id === App.factureBien) || null)}</section>`;
  const card = (href, icon, t, s) => `<a class="tool" href="${href}"><span>${icon}</span><b>${t}</b><small>${s}</small></a>`;
  return `<div class="page-head"><div><h1>🧰 Outils</h1><p class="muted">${aiOn() ? '✨ Assistant IA activé.' : 'Astuce : activez l’assistant IA dans Paramètres pour une rédaction encore plus fine.'}</p></div></div>
  <div class="tools-grid">${card('#/outils/offre', '✍️', 'Proposition d’offre d’achat', 'Pré-remplie, à compléter et signer par l’acquéreur')}${card('#/outils/facture', '🧾', 'Facture d’honoraires', 'Numérotée, pré-remplie depuis le dossier')}${card('#/outils/travaux', '🔨', 'Simulateur de budget travaux', 'Fourchette par poste ou au m², PDF pour l’acquéreur')}${card('#/outils/resolution', '📮', 'Inscription à l’ordre du jour (travaux)', 'Courrier LRAR au syndic + projet de résolution, travaux privatifs sur parties communes')}${card('#/outils/mail', '✉️', 'Rédiger un e-mail', 'Dites à qui vous écrivez et votre objectif')}
    ${card('#/outils/fiche', '🖨️', 'Fiche de commercialisation', 'Fiche PDF du bien avec photos et mentions')}${card('#/outils/annonce', '📝', 'Annonce', 'Rédaction + pense-bête des mentions obligatoires')}
    ${card('#/calculs', '🧮', 'Calculateurs', 'Honoraires, frais, prorata, délais, prêt')}${card('#/modeles', '📨', 'Modèles de mails', 'Vos modèles réutilisables')}${card('#/guides', '📚', 'Guides copropriété', 'Les guides Copro-Assistance')}</div>`;
}
const bienSelect = (id, v) => `<select id="${id}"><option value="">— Choisir un bien —</option>${App.dossiers.filter(d => d.phase !== 'abandon').map(d => `<option value="${d.id}" ${d.id === v ? 'selected' : ''}>${esc(dossierTitle(d))} (${esc(d.ref)})</option>`).join('')}</select>`;
function toolPickBien(sub) {
  return `<a href="#/outils" class="muted small">← Outils</a><div class="page-head"><div><h1>${sub === 'fiche' ? '🖨️ Fiche de commercialisation' : '📝 Annonce'}</h1><p class="muted">Choisissez le bien : ${sub === 'fiche' ? 'la fiche reprend photos, caractéristiques, annonce et mentions.' : 'l’éditeur s’ouvre dans l’onglet Commercialisation du bien.'}</p></div></div>
  <section class="card"><label class="field"><span>Bien</span>${bienSelect('tb_bien')}</label><div class="row gap modal-actions"><button class="btn primary" data-a="${sub === 'fiche' ? 'ficheFromTool' : 'annonceFromTool'}">${sub === 'fiche' ? '🖨️ Générer la fiche' : 'Ouvrir l’éditeur d’annonce'}</button></div></section>`;
}
function toolOffre() {
  return `<a href="#/outils" class="muted small">← Outils</a><div class="page-head"><div><h1>✍️ Proposition d’offre d’achat</h1><p class="muted">Document pré-rempli avec le bien, le vendeur et vos coordonnées : l’acquéreur n’a plus qu’à compléter son prix, son financement et signer.</p></div></div>
  <section class="card"><div class="grid4"><label class="field span2"><span>Bien</span>${bienSelect('to_bien')}</label>
    <label class="field span2"><span>Acquéreur (facultatif)</span><select id="to_acq"><option value="">— Laisser en blanc —</option>${App.crm.contacts.filter(c => c.roles.acquereur).map(c => `<option value="${c.id}">${esc(cName(c))}</option>`).join('')}</select></label>
    <label class="check field"><span>&nbsp;</span><span class="row gap"><input type="checkbox" id="to_pre"> Pré-remplir le prix proposé</span></label><label class="field"><span>Prix proposé (€)</span><input type="number" id="to_prix"></label></div>
    <div class="row gap wrap modal-actions"><button class="btn primary" data-a="offreTool" data-how="print">🖨️ Imprimer / PDF</button><button class="btn" data-a="offreTool" data-how="word">⬇️ Word</button><button class="btn" data-a="offreTool" data-how="save">💾 Ranger dans le dossier</button></div>
    <p class="small muted">Inspiré du modèle « Offre d’achat d’un bien immobilier » fourni, complété des mentions copropriété (L.721-2 CCH), de l’interdiction de tout versement (art. 1589-1 C. civ.) et du délai de rétractation.</p></section>`;
}
function toolMail() {
  return `<a href="#/outils" class="muted small">← Outils</a><div class="page-head"><div><h1>✉️ Rédiger un e-mail</h1><p class="muted">${aiOn() ? 'L’assistant IA rédige le mail à partir de votre objectif et des informations du dossier.' : 'Sans IA, un brouillon structuré est préparé ; activez l’assistant IA dans Paramètres pour une rédaction complète.'}</p></div></div>
  <section class="card"><div class="grid4">
    <label class="field span2"><span>À qui écrivez-vous ?</span><select id="tm_c"><option value="">— Saisie libre —</option>${App.crm.contacts.map(c => `<option value="${c.id}">${esc(cName(c))}</option>`).join('')}</select></label>
    <label class="field"><span>Rôle</span><select id="tm_role"><option value="vendeur">Vendeur</option><option value="acquereur">Acquéreur</option><option value="notaire">Notaire</option><option value="syndic">Syndic</option><option value="autre">Autre</option></select></label>
    <label class="field"><span>Ton</span><select id="tm_ton"><option value="cordial">Cordial</option><option value="formel">Formel</option><option value="commercial">Commercial</option></select></label>
    <label class="field span2"><span>Nom (si saisie libre)</span><input id="tm_nom"></label><label class="field span2"><span>Bien concerné (facultatif)</span>${bienSelect('tm_bien')}</label>
    <label class="field span4"><span>Objectif du mail</span><textarea id="tm_obj" rows="3" placeholder="ex. relancer pour obtenir les deux derniers décomptes de charges avant vendredi"></textarea></label></div>
    <div class="row gap modal-actions"><button class="btn primary" data-a="mailTool">${aiOn() ? '✨ Rédiger avec l’IA' : '⚡ Préparer le brouillon'}</button></div></section>`;
}
