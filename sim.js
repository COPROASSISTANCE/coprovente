/* =========================================================================
   CoproVente — simulateur de budget travaux
   Repères de prix publics (TTC, fourchettes basses / hautes) : modifiables ici.
   Source des repères : article « Simulateur devis travaux » de ynspir.com
   (prix constatés 2025-2026). Estimation indicative, ne remplace pas des devis.
   ========================================================================= */
const TRAVAUX_POSTES = [
  { id: 'demolition', label: 'Démolition / dépose', unite: 'm²', bas: 30, haut: 80, qty: s => 0 },
  { id: 'murPorteur', label: 'Ouverture de mur porteur (avec IPN)', unite: 'ouverture', bas: 2500, haut: 5000, qty: s => 0 },
  { id: 'electricite', label: 'Électricité : mise aux normes complète', unite: 'm² habitable', bas: 80, haut: 120, qty: s => s },
  { id: 'plomberie', label: 'Plomberie : création de point d’eau', unite: 'point d’eau', bas: 600, haut: 900, qty: s => 0 },
  { id: 'cloisons', label: 'Cloisons, isolation, plâtrerie', unite: 'm²', bas: 40, haut: 80, qty: s => 0 },
  { id: 'peinture', label: 'Peinture murs et plafonds', unite: 'm² de murs', bas: 25, haut: 45, qty: s => Math.round(s * 2.7) },
  { id: 'sols', label: 'Revêtements de sol', unite: 'm²', bas: 30, haut: 150, qty: s => s },
  { id: 'sdb', label: 'Salle de bain complète (5 à 8 m²)', unite: 'pièce', bas: 5000, haut: 15000, qty: s => 0 },
  { id: 'cuisine', label: 'Cuisine équipée', unite: 'cuisine', bas: 8000, haut: 35000, qty: s => 0 },
];
/* Coût global au m² (TTC) observé selon le niveau de rénovation */
const TRAVAUX_FORMULES = [
  { id: 'rafraichissement', label: 'Rafraîchissement', m2: 800, desc: 'Peintures, sols, petites reprises' },
  { id: 'confort', label: 'Rénovation confort', m2: 1440, desc: 'Électricité, plomberie, cuisine, salle de bain' },
  { id: 'premium', label: 'Rénovation premium', m2: 1850, desc: 'Rénovation lourde, redistribution, finitions haut de gamme' },
];
const GAMMES = [['eco', 'Économique'], ['std', 'Standard'], ['premium', 'Haut de gamme']];
/* Une gamme sélectionne un tiers de la fourchette du poste */
function posteFourchette(p, g) {
  const span = p.haut - p.bas, i = g === 'eco' ? 0 : g === 'premium' ? 2 : 1;
  return [p.bas + span * i / 3, p.bas + span * (i + 1) / 3];
}
const PRESETS = {
  rafraichissement: { peinture: 'std', sols: 'eco' },
  confort: { electricite: 'std', plomberie: 'std', cloisons: 'std', peinture: 'std', sols: 'std', sdb: 'std', cuisine: 'std' },
  premium: { demolition: 'std', electricite: 'premium', plomberie: 'premium', cloisons: 'premium', peinture: 'premium', sols: 'premium', sdb: 'premium', cuisine: 'premium' },
};
const T = () => App.tools;
const simNum = k => num(T()[k]) || 0;
function simInit() {
  const t = T();
  if (t.sim_init) return;
  Object.assign(t, { sim_init: 1, sim_bien: '', sim_type: 'appartement', sim_surface: 60, sim_etage: 2, sim_ascenseur: 'oui', sim_mode: 'postes', sim_formule: 'confort', sim_alea: 'oui', sim_archi: 'non' });
  simPreset('confort');
}
function simPreset(id) {
  const t = T(), s = simNum('sim_surface') || 60, P = PRESETS[id] || {};
  TRAVAUX_POSTES.forEach(p => {
    const g = P[p.id];
    t['sim_g_' + p.id] = g || 'std';
    let q = g ? (p.qty(s) || ({ plomberie: id === 'premium' ? 6 : 4, sdb: 1, cuisine: 1, cloisons: Math.round(s * (id === 'premium' ? 0.6 : 0.3)), demolition: Math.round(s * 0.5) }[p.id] || 0)) : 0;
    t['sim_q_' + p.id] = q;
  });
  t.sim_formule = id;
}
function simAcces() { const t = T(); return t.sim_type === 'appartement' && simNum('sim_etage') >= 3 && t.sim_ascenseur === 'non'; }
function simCalc() {
  const t = T(), s = simNum('sim_surface');
  let lines = [], bas = 0, haut = 0;
  if (t.sim_mode === 'formule') {
    const f = TRAVAUX_FORMULES.find(x => x.id === t.sim_formule) || TRAVAUX_FORMULES[1];
    bas = s * f.m2 * 0.85; haut = s * f.m2 * 1.15;
    lines.push({ label: `${f.label} — ${s} m² × ${eur(f.m2)}/m² (± 15 %)`, bas, haut });
  } else {
    TRAVAUX_POSTES.forEach(p => {
      const q = simNum('sim_q_' + p.id); if (!q) return;
      const [b, h] = posteFourchette(p, t['sim_g_' + p.id]);
      lines.push({ label: `${p.label} — ${q} ${p.unite} (${(GAMMES.find(g => g[0] === t['sim_g_' + p.id]) || GAMMES[1])[1].toLowerCase()})`, bas: q * b, haut: q * h });
      bas += q * b; haut += q * h;
    });
    const autre = simNum('sim_autre'); if (autre) { lines.push({ label: T().sim_autreLib || 'Autre poste', bas: autre, haut: autre }); bas += autre; haut += autre; }
  }
  const sub = { bas, haut };
  if (simAcces()) { lines.push({ label: 'Contraintes d’accès en copropriété (étage sans ascenseur) : + 10 à 20 %', bas: sub.bas * 0.10, haut: sub.haut * 0.20 }); bas += sub.bas * 0.10; haut += sub.haut * 0.20; }
  if (t.sim_alea === 'oui') { const b0 = bas, h0 = haut; lines.push({ label: 'Marge pour imprévus : + 10 à 15 %', bas: b0 * 0.10, haut: h0 * 0.15 }); bas += b0 * 0.10; haut += h0 * 0.15; }
  let archi = null; if (t.sim_archi === 'oui') archi = { bas: bas * 0.08, haut: haut * 0.15 };
  const r = v => Math.round(v / 100) * 100;
  return { lines: lines.map(l => ({ ...l, bas: r(l.bas), haut: r(l.haut) })), bas: r(bas), haut: r(haut), archi: archi && { bas: r(archi.bas), haut: r(archi.haut) }, m2: s ? [Math.round(bas / s), Math.round(haut / s)] : null };
}
function simInput(key, label, type = 'number', extra = '') { return `<label class="field"><span>${label}</span><input type="${type}" data-t="${key}" value="${esc(T()[key] ?? '')}" ${extra}></label>`; }
function simSelect(key, label, opts) { return `<label class="field"><span>${label}</span><select data-t="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(T()[key]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`; }
function toolTravaux() {
  simInit();
  const t = T(), R = simCalc();
  return `<a href="#/outils" class="muted small">← Outils</a>
  <div class="page-head"><div><h1>🔨 Simulateur de budget travaux</h1><p class="muted">Une première fourchette à donner à un acquéreur ou à un vendeur. Estimation indicative : elle ne remplace pas des devis d’artisans.</p></div></div>
  <div class="grid-side"><div>
  <section class="card"><h2>1. Le bien</h2><div class="grid4">
    <label class="field span2"><span>Bien du portefeuille (facultatif)</span><select id="sim_bien"><option value="">— Saisie libre —</option>${App.dossiers.filter(d => d.phase !== 'abandon').map(d => `<option value="${d.id}" ${d.id === t.sim_bien ? 'selected' : ''}>${esc(dossierTitle(d))}</option>`).join('')}</select></label>
    ${simSelect('sim_type', 'Type', [['appartement', 'Appartement'], ['maison', 'Maison']])}${simInput('sim_surface', 'Surface habitable (m²)', 'number', 'min="0"')}
    ${t.sim_type === 'appartement' ? simInput('sim_etage', 'Étage', 'number', 'min="0"') + simSelect('sim_ascenseur', 'Ascenseur', [['oui', 'Oui'], ['non', 'Non']]) : ''}</div>
    ${simAcces() ? '<p class="small soon">Étage élevé sans ascenseur : la main-d’œuvre est majorée de 10 à 20 % (accès, manutention).</p>' : ''}</section>
  <section class="card"><h2>2. Méthode</h2><div class="seg big">${[['postes', 'Détail par poste'], ['formule', 'Estimation rapide au m²']].map(([v, l]) => `<button class="${t.sim_mode === v ? 'on' : ''}" data-a="simSet" data-k="sim_mode" data-v="${v}">${l}</button>`).join('')}</div>
    <h3>Niveau de rénovation</h3><div class="ped-opts three">${TRAVAUX_FORMULES.map(f => `<button class="pedo ${t.sim_formule === f.id ? 'ca' : ''}" data-a="simFormule" data-v="${f.id}"><b>${f.label}</b><span class="big">${eur(f.m2)}/m²</span><small>${f.desc}</small></button>`).join('')}</div>
    ${t.sim_mode === 'postes' ? `<p class="small muted">Choisir un niveau pré-remplit les postes selon la surface ; ajustez ensuite les quantités (0 = poste non retenu).</p>` : ''}</section>
  ${t.sim_mode === 'postes' ? `<section class="card"><h2>3. Postes de travaux</h2>
    <div class="sim-postes">${TRAVAUX_POSTES.map(p => { const [b, h] = posteFourchette(p, t['sim_g_' + p.id]); const q = simNum('sim_q_' + p.id);
      return `<div class="sim-p ${q ? 'on' : ''}"><div class="sim-l"><b>${p.label}</b><small>${eur(p.bas)} à ${eur(p.haut)} / ${p.unite} · retenu : ${eur(Math.round(b))} – ${eur(Math.round(h))}</small></div>
      <label class="field"><span>Quantité (${p.unite})</span><input type="number" min="0" data-t="sim_q_${p.id}" value="${esc(t['sim_q_' + p.id] ?? 0)}"></label>
      ${simSelect('sim_g_' + p.id, 'Gamme', GAMMES)}<div class="sim-v">${q ? `${eur(Math.round(q * b / 100) * 100)} – ${eur(Math.round(q * h / 100) * 100)}` : '—'}</div></div>`; }).join('')}</div>
    <div class="grid4">${simInput('sim_autreLib', 'Autre poste (libellé)', 'text', 'class="span2"')}${simInput('sim_autre', 'Montant (€)')}</div></section>` : ''}
  <section class="card"><h2>${t.sim_mode === 'postes' ? '4' : '3'}. Options</h2><div class="grid4">${simSelect('sim_alea', 'Marge pour imprévus (10 à 15 %)', [['oui', 'Incluse'], ['non', 'Non incluse']])}${simSelect('sim_archi', 'Honoraires d’architecte / maître d’œuvre (8 à 15 %)', [['non', 'Non'], ['oui', 'Afficher en plus']])}</div></section></div>
  <aside class="card sticky sim-res"><h2>Budget estimé</h2>
    <div class="sim-total">${eur(R.bas)} <span>à</span> ${eur(R.haut)}</div><p class="muted small">TTC${R.m2 ? ` · soit ${eur(R.m2[0])} à ${eur(R.m2[1])} / m²` : ''}</p>
    ${R.archi ? `<p class="small">+ maîtrise d’œuvre : ${eur(R.archi.bas)} à ${eur(R.archi.haut)}</p>` : ''}
    ${t.sim_mode === 'postes' ? (() => { const f = TRAVAUX_FORMULES.find(x => x.id === t.sim_formule) || TRAVAUX_FORMULES[1], s = simNum('sim_surface'); return s ? `<p class="small muted">Repère : une « ${f.label.toLowerCase()} » complète (menuiseries, chauffage, finitions comprises) coûte en moyenne ${eur(f.m2)}/m², soit environ ${eur(Math.round(s * f.m2 / 1000) * 1000)}. Le détail par poste ne chiffre que les postes retenus.</p>` : ''; })() : ''}
    <table class="tbl">${R.lines.map(l => `<tr><td>${esc(l.label)}</td><td style="text-align:right;white-space:nowrap">${l.bas === l.haut ? eur(l.bas) : `${eur(l.bas)} – ${eur(l.haut)}`}</td></tr>`).join('') || '<tr><td class="muted">Renseignez au moins un poste.</td></tr>'}</table>
    <div class="row gap wrap modal-actions"><button class="btn primary" data-a="simPdf">🖨️ PDF</button><button class="btn" data-a="simCopy">📋 Copier le résumé</button>${t.sim_bien ? '<button class="btn" data-a="simSave">💾 Ranger dans le dossier</button>' : ''}</div>
    <p class="small muted">Repères de prix publics 2025-2026 (TTC), à affiner par des devis. Prix susceptibles de varier selon la région, l’état du bien et les contraintes de la copropriété (autorisation d’AG pour les travaux touchant les parties communes ou l’aspect extérieur).</p></aside></div>`;
}
function simTexte() {
  const t = T(), R = simCalc(), d = App.dossiers.find(x => x.id === t.sim_bien);
  return `Estimation indicative du budget travaux${d ? ' — ' + dossierTitle(d) : ''}\n${t.sim_type === 'maison' ? 'Maison' : 'Appartement'} de ${simNum('sim_surface')} m²\n\n${R.lines.map(l => `- ${l.label} : ${l.bas === l.haut ? eur(l.bas) : eur(l.bas) + ' à ' + eur(l.haut)}`).join('\n')}\n\nBudget estimé : ${eur(R.bas)} à ${eur(R.haut)} TTC${R.m2 ? ` (${eur(R.m2[0])} à ${eur(R.m2[1])} / m²)` : ''}${R.archi ? `\nMaîtrise d’œuvre en sus : ${eur(R.archi.bas)} à ${eur(R.archi.haut)}` : ''}\n\nEstimation établie à partir de repères de prix publics ; elle ne remplace pas les devis d’entreprises. En copropriété, les travaux touchant les parties communes ou l’aspect extérieur nécessitent une autorisation de l’assemblée générale.`;
}
function simHtml() {
  const t = T(), R = simCalc(), d = App.dossiers.find(x => x.id === t.sim_bien);
  return doc2('Budget travaux', `${agentTop(`Estimation budget travaux<br>${fdate(today())}`)}<p class="kicker">Simulation de budget travaux</p><h1>${esc(d ? dossierTitle(d) : 'Projet de rénovation')}</h1>
    <p class="sub">${t.sim_type === 'maison' ? 'Maison' : 'Appartement'} · ${simNum('sim_surface')} m²${t.sim_type === 'appartement' ? ` · ${simNum('sim_etage')}e étage ${t.sim_ascenseur === 'oui' ? 'avec' : 'sans'} ascenseur` : ''}</p>
    <div class="price"><div><span class="muted">Budget estimé (TTC)</span><br><span class="big">${eur(R.bas)} – ${eur(R.haut)}</span></div><div style="text-align:right">${R.m2 ? `<span class="muted">Soit</span><br><b>${eur(R.m2[0])} – ${eur(R.m2[1])} / m²</b>` : ''}</div></div>
    <h2>Détail</h2><table>${R.lines.map(l => `<tr><td>${esc(l.label)}</td><td style="text-align:right;white-space:nowrap">${l.bas === l.haut ? eur(l.bas) : eur(l.bas) + ' – ' + eur(l.haut)}</td></tr>`).join('')}</table>
    ${R.archi ? `<p>Honoraires de maîtrise d’œuvre en sus : ${eur(R.archi.bas)} – ${eur(R.archi.haut)}.</p>` : ''}
    <h2>À savoir</h2><ul><li>Estimation indicative établie à partir de repères de prix publics (2025-2026) ; elle ne remplace pas les devis d’entreprises.</li><li>En copropriété, les travaux touchant les parties communes, la structure ou l’aspect extérieur nécessitent l’autorisation de l’assemblée générale.</li><li>Les accès difficiles (étage sans ascenseur, stationnement) peuvent majorer la main-d’œuvre.</li></ul>${agentFoot()}`);
}
Object.assign(ACT, {
  simSet(el) { T()[el.dataset.k] = el.dataset.v; rerender(); },
  simFormule(el) { simPreset(el.dataset.v); rerender(); },
  simPdf() { printHtml(simHtml()); },
  simCopy() { copyText(simTexte()); },
  async simSave() {
    const d = App.dossiers.find(x => x.id === T().sim_bien); if (!d) return;
    const html = simHtml(), blob = new Blob([html], { type: 'text/html' });
    await Store.putFile({ id: uid(), dossierId: d.id, pieceId: 'divers', name: `Budget_travaux_${today()}.html`, type: 'text/html', size: blob.size, blob, addedAt: Date.now() });
    log(d, `Simulation de budget travaux : ${eur(simCalc().bas)} – ${eur(simCalc().haut)}`); toast('Simulation rangée dans les pièces du bien');
  },
});
document.addEventListener('change', e => {
  if (e.target.id !== 'sim_bien') return;
  const t = T(), d = App.dossiers.find(x => x.id === e.target.value); t.sim_bien = e.target.value;
  if (d) { t.sim_type = /maison/i.test(d.bien.type) ? 'maison' : 'appartement'; if (num(d.bien.surface)) t.sim_surface = Math.round(d.bien.surface); if (d.bien.etage !== '') t.sim_etage = num(d.bien.etage) ?? t.sim_etage; simPreset(t.sim_formule); }
  rerender();
});
