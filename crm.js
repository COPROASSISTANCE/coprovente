/* =========================================================================
   CoproVente — activité commerciale : prospection, estimations, visites,
   mandats, ventes réalisées, tableau de bord graphique, page « Mon profil »
   ========================================================================= */

App.crm = { prospects: [], estimations: [], visites: [] };
function saveCrm() { Store.set('crm', App.crm); }

const TYPES_BIEN = ['Appartement', 'Studio', 'Duplex', 'Maison en copropriété', 'Local commercial', 'Parking / box', 'Autre'];
const SOURCES = ['Boîtage / pige', 'Recommandation', 'Ancien client', 'Portail / site', 'Réseaux sociaux', 'Appel entrant', 'Autre'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/* ---------- Définition des fiches ---------- */
const ENT = {
  prospects: {
    titre: 'Prospection', icon: '🎯', single: 'prospect', vide: 'Aucun prospect. Ajoutez les propriétaires rencontrés (pige, recommandation, boîtage…).',
    statuts: [['nouveau', 'Nouveau', 's-grey'], ['contacte', 'Contacté', 's-blue'], ['rdv', 'RDV fixé', 's-violet'], ['estimation', 'Estimation', 's-amber'], ['mandat', 'Mandat signé', 's-green'], ['perdu', 'Perdu', 's-grey']],
    fields: [['date', 'Date du contact', 'date'], ['nom', 'Nom du propriétaire'], ['tel', 'Téléphone', 'tel'], ['email', 'E-mail', 'email'],
      ['adresse', 'Adresse du bien', 'text', 2], ['ville', 'Ville'], ['type', 'Type de bien', 'select', TYPES_BIEN],
      ['source', 'Source', 'select', SOURCES], ['statut', 'Statut', 'statut'], ['relance', 'Prochaine relance', 'date'], ['projet', 'Projet / délai de vente'],
      ['notes', 'Notes', 'area']],
    cols: [['Contact', r => `<b>${esc(r.nom || '—')}</b><small>${esc(r.tel || r.email || '')}</small>`], ['Bien', r => esc([r.adresse, r.ville].filter(Boolean).join(', ') || '—')],
      ['Source', r => esc(r.source || '—')], ['Relance', r => relanceCell(r.relance, ['mandat', 'perdu'].includes(r.statut))]],
    actions: r => r.statut !== 'mandat' ? [['prospect2estim', '📐 Créer une estimation']] : [],
    defaults: () => ({ date: today(), statut: 'nouveau', type: 'Appartement', source: SOURCES[0] }),
  },
  estimations: {
    titre: 'Estimations', icon: '📐', single: 'estimation', vide: 'Aucune estimation. Créez-en une ici ou depuis un prospect.',
    statuts: [['en_cours', 'En cours', 's-blue'], ['remise', 'Remise au propriétaire', 's-amber'], ['mandat', 'Mandat signé', 's-green'], ['refusee', 'Sans suite', 's-grey']],
    fields: [['date', 'Date', 'date'], ['proprietaire', 'Propriétaire'], ['tel', 'Téléphone', 'tel'], ['email', 'E-mail', 'email'],
      ['adresse', 'Adresse du bien', 'text', 2], ['ville', 'Ville'], ['type', 'Type de bien', 'select', TYPES_BIEN],
      ['surface', 'Surface (m²)', 'number'], ['valBasse', 'Valeur basse (€)', 'number'], ['valHaute', 'Valeur haute (€)', 'number'], ['valRetenue', 'Prix conseillé (€)', 'number'],
      ['statut', 'Statut', 'statut'], ['relance', 'Prochaine relance', 'date'], ['notes', 'Notes (comparables, points forts, copropriété…)', 'area']],
    cols: [['Bien', r => `<b>${esc([r.adresse, r.ville].filter(Boolean).join(', ') || '—')}</b><small>${esc([r.type, r.surface ? r.surface + ' m²' : ''].filter(Boolean).join(' · '))}</small>`],
      ['Propriétaire', r => esc(r.proprietaire || '—')], ['Fourchette', r => num(r.valBasse) || num(r.valHaute) ? `${eur(r.valBasse)} – ${eur(r.valHaute)}` : '—'],
      ['Prix conseillé', r => `<b>${eur(r.valRetenue)}</b>${num(r.valRetenue) && num(r.surface) ? `<small>${eur(Math.round(r.valRetenue / r.surface))}/m²</small>` : ''}`]],
    actions: r => r.dossierId ? [['openDossierOf', '📂 Ouvrir le dossier']] : [['estim2mandat', '📝 Transformer en mandat']],
    defaults: () => ({ date: today(), statut: 'en_cours', type: 'Appartement' }),
  },
  visites: {
    titre: 'Visites', icon: '🚪', single: 'visite', vide: 'Aucune visite. Enregistrez chaque visite pour suivre les retours et alimenter le compte rendu au vendeur.',
    statuts: [['prevue', 'Prévue', 's-blue'], ['faite', 'Effectuée', 's-green'], ['annulee', 'Annulée', 's-grey']],
    fields: [['dossierId', 'Bien visité', 'dossier', 2], ['quand', 'Date et heure', 'datetime-local'], ['statut', 'Statut', 'statut'],
      ['visiteur', 'Visiteur(s)'], ['tel', 'Téléphone', 'tel'], ['email', 'E-mail', 'email'], ['bon', 'Bon de visite signé', 'check'],
      ['interet', 'Intérêt', 'select', [['', '—'], ['1', '★ Faible'], ['2', '★★ Moyen'], ['3', '★★★ Fort']]],
      ['suite', 'Suite', 'select', [['', '—'], ['reflexion', 'Réflexion'], ['2e', '2e visite'], ['offre', 'Offre attendue'], ['non', 'Pas intéressé']]],
      ['retour', 'Retour du visiteur (points forts, freins)', 'area']],
    cols: [['Date', r => `<b>${r.quand ? fdatetime(r.quand) : '—'}</b>`], ['Bien', r => { const d = App.dossiers.find(x => x.id === r.dossierId); return d ? esc(dossierTitle(d)) : '—'; }],
      ['Visiteur', r => esc(r.visiteur || '—')], ['Intérêt', r => r.interet ? '★'.repeat(+r.interet) : '—'], ['Suite', r => esc({ reflexion: 'Réflexion', '2e': '2e visite', offre: 'Offre attendue', non: 'Pas intéressé' }[r.suite] || '—')]],
    actions: () => [],
    defaults: () => { const t = new Date(); t.setMinutes(0, 0, 0); t.setHours(t.getHours() + 1); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return { quand: t.toISOString().slice(0, 16), statut: 'prevue' }; },
    sort: (a, b) => (b.quand || '').localeCompare(a.quand || ''),
  },
};
function relanceCell(date, done) {
  if (!date || done) return '<span class="muted">—</span>';
  const n = daysUntil(date);
  return `<span class="${n < 0 ? 'late' : n <= 2 ? 'soon' : ''}">${fdate(date)}${n < 0 ? ' · en retard' : n === 0 ? ' · aujourd’hui' : ''}</span>`;
}
const statutDef = (key, id) => (ENT[key].statuts.find(s => s[0] === id) || ENT[key].statuts[0]);
const statutBadge = (key, id) => { const s = statutDef(key, id); return `<span class="sbadge ${s[2]}">${s[1]}</span>`; };

/* ---------- Pages liste génériques ---------- */
App.flt = {};
function viewEntity(key) {
  const E = ENT[key], f = App.flt[key] || { s: 'tous', q: '' };
  const all = App.crm[key].slice().sort(E.sort || ((a, b) => (b.date || '').localeCompare(a.date || '')));
  const q = normalize(f.q);
  const rows = all.filter(r => (f.s === 'tous' || r.statut === f.s) && (!q || normalize(Object.values(r).join(' ')).includes(q)));
  return `<div class="page-head"><div><h1>${E.icon} ${E.titre}</h1><p class="muted">${all.length} ${E.single}(s) enregistré(s)</p></div>
    <button class="btn primary" data-a="entNew" data-k="${key}">＋ Nouveau ${E.single}</button></div>
  <div class="row between wrap gap filters"><div class="seg">${[['tous', 'Tous', all.length]].concat(E.statuts.map(s => [s[0], s[1], all.filter(r => r.statut === s[0]).length])).map(([id, l, n]) => `<button class="${f.s === id ? 'on' : ''}" data-a="entFilter" data-k="${key}" data-s="${id}">${l} <small>${n}</small></button>`).join('')}</div>
    <input class="search" data-t="q_${key}" value="${esc(f.q)}" placeholder="Rechercher…"></div>
  ${rows.length ? `<div class="card flush"><table class="list"><thead><tr>${E.cols.map(c => `<th>${c[0]}</th>`).join('')}<th>Statut</th></tr></thead><tbody>
    ${rows.map(r => `<tr data-a="entEdit" data-k="${key}" data-id="${r.id}" tabindex="0">${E.cols.map(c => `<td>${c[1](r)}</td>`).join('')}<td>${statutBadge(key, r.statut)}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="empty"><p>${all.length ? 'Aucun résultat pour ce filtre.' : E.vide}</p>${all.length ? '' : `<button class="btn primary" data-a="entNew" data-k="${key}">＋ Nouveau ${E.single}</button>`}</div>`}`;
}
function entInput(key, f, r) {
  const [id, label, type = 'text', a] = f, v = r[id] ?? '', span = (typeof a === 'number' ? `span${a}` : '') + (type === 'area' ? ' span4' : '');
  let input;
  if (type === 'select') input = `<select id="e_${id}">${a.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  else if (type === 'statut') input = `<select id="e_${id}">${ENT[key].statuts.map(s => `<option value="${s[0]}" ${v === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select>`;
  else if (type === 'dossier') input = `<select id="e_${id}"><option value="">— Choisir un bien —</option>${App.dossiers.filter(d => d.phase !== 'abandon').map(d => `<option value="${d.id}" ${v === d.id ? 'selected' : ''}>${esc(dossierTitle(d))} (${esc(d.ref)})</option>`).join('')}</select>`;
  else if (type === 'area') input = `<textarea id="e_${id}" rows="4">${esc(v)}</textarea>`;
  else if (type === 'check') return `<label class="check field"><span>&nbsp;</span><span class="row gap"><input type="checkbox" id="e_${id}" ${v ? 'checked' : ''}> ${label}</span></label>`;
  else input = `<input id="e_${id}" type="${type}" value="${esc(v)}">`;
  return `<label class="field ${span}"><span>${label}</span>${input}</label>`;
}
function openEntity(key, id, preset) {
  const E = ENT[key], r = id ? App.crm[key].find(x => x.id === id) : { ...E.defaults(), ...(preset || {}) };
  if (!r) return;
  openModal((id ? 'Modifier ' : 'Nouveau ') + E.single, `<div class="grid4">${E.fields.map(f => entInput(key, f, r)).join('')}</div>
    <div class="row between wrap gap modal-actions"><div class="row gap wrap"><button class="btn primary" data-a="entSave" data-k="${key}" data-id="${id || ''}">💾 Enregistrer</button>
      ${id ? E.actions(r).map(([a, l]) => `<button class="btn" data-a="${a}" data-id="${id}">${l}</button>`).join('') : ''}</div>
      ${id ? `<button class="btn danger small" data-a="entDel" data-k="${key}" data-id="${id}">Supprimer</button>` : ''}</div>`, { wide: true });
}
function entCollect(key) {
  const o = {};
  ENT[key].fields.forEach(([id, , type]) => { const el = $('#e_' + id); if (!el) return; o[id] = type === 'check' ? el.checked : type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim(); });
  return o;
}
function entSave(key, id) {
  const vals = entCollect(key);
  let r = id && App.crm[key].find(x => x.id === id);
  if (r) Object.assign(r, vals); else { r = { id: uid(), createdAt: Date.now(), ...vals }; App.crm[key].push(r); }
  r.updatedAt = Date.now(); saveCrm();
  if (key === 'visites' && r.dossierId) {
    const d = App.dossiers.find(x => x.id === r.dossierId);
    if (d && !d.journal.some(j => j.vid === r.id)) { d.journal.unshift({ t: Date.now(), txt: `Visite ${r.statut === 'faite' ? 'effectuée' : 'prévue'} le ${r.quand ? fdatetime(r.quand) : '?'} — ${r.visiteur || 'visiteur'}`, type: 'note', vid: r.id }); saveDossier(d); }
  }
  return r;
}

/* ---------- Mandats & biens ---------- */
const MANDAT_FILTRES = [['actifs', 'Actifs', d => !['acte', 'abandon'].includes(d.phase)], ['commercialisation', 'En commercialisation', d => ['commercialisation', 'offre'].includes(d.phase)],
  ['mandat', 'En préparation', d => d.phase === 'mandat'], ['compromis', 'Sous compromis', d => d.phase === 'compromis'], ['acte', 'Vendus', d => d.phase === 'acte'], ['tous', 'Tous', () => true]];
function viewMandats(filter) {
  const f = MANDAT_FILTRES.find(x => x[0] === (filter || App.flt.mandats || 'actifs')) || MANDAT_FILTRES[0];
  const ds = App.dossiers.filter(f[2]).sort((a, b) => b.updatedAt - a.updatedAt);
  const typeLab = { exclusif: 'Exclusif', semi: 'Semi-exclusif', simple: 'Simple' };
  return `<div class="page-head"><div><h1>📝 Mandats & biens</h1><p class="muted">Chaque mandat est un dossier de vente guidé pas à pas.</p></div>
    <div class="row gap wrap"><button class="btn ghost" data-a="importPdf" data-kind="mandat">📄 Importer un mandat PDF</button><button class="btn primary" data-a="newDossier">＋ Nouveau mandat</button></div></div>
  <div class="seg filters">${MANDAT_FILTRES.map(x => `<button class="${x[0] === f[0] ? 'on' : ''}" data-a="mandatFilter" data-f="${x[0]}">${x[1]} <small>${App.dossiers.filter(x[2]).length}</small></button>`).join('')}</div>
  ${ds.length ? `<div class="card flush"><table class="list"><thead><tr><th>Bien</th><th>Vendeur</th><th>Mandat</th><th>Prix</th><th>Échéance</th><th>Étape</th><th>Avancement</th></tr></thead><tbody>
  ${ds.map(d => { const p = progress(d), ph = phaseDef(d.phase), ech = d.mandat.date && d.mandat.duree ? addMonths(d.mandat.date, d.mandat.duree) : '', n = ech ? daysUntil(ech) : null;
    return `<tr data-href="#/d/${d.id}/parcours" tabindex="0"><td><b>${esc(dossierTitle(d))}</b><small>${esc(d.ref)} · lots ${esc(lotsText(d))}</small></td><td>${esc(names(d.vendeurs) || '—')}</td>
      <td>${esc(typeLab[d.mandat.type] || '—')}<small>${d.mandat.numero ? 'n° ' + esc(d.mandat.numero) : ''}</small></td><td><b>${eur(d.offre.prix || d.mandat.prix)}</b></td>
      <td>${ech ? `<span class="${n < 0 && d.phase !== 'acte' ? 'late' : n < 30 && d.phase !== 'acte' ? 'soon' : ''}">${fdate(ech)}</span>` : '—'}</td>
      <td><span class="pill" style="--c:${ph.color}">${ph.label}</span></td><td><div class="bar slim"><i style="width:${p.pct}%"></i></div><small>${p.pct} % · ${esc(currentStep(d).titre)}</small></td></tr>`; }).join('')}</tbody></table></div>`
    : `<div class="empty"><p>Aucun mandat dans cette catégorie.</p><button class="btn primary" data-a="newDossier">＋ Nouveau mandat</button> <button class="btn ghost" data-a="demo">Charger un exemple</button></div>`}`;
}

/* ---------- Ventes réalisées ---------- */
function ventes() { return App.dossiers.filter(d => d.phase === 'acte'); }
const honor = d => num(d.mandat.honoraires) || 0;
const dateVente = d => d.dates.acte || (d.journal[0] && new Date(d.journal[0].t).toISOString().slice(0, 10)) || '';
function months12() {
  const out = [], now = new Date();
  for (let i = 11; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push({ key: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'), label: MOIS[dt.getMonth()], year: dt.getFullYear() }); }
  return out;
}
function honorairesParMois() {
  const ms = months12(), vs = ventes();
  return ms.map(m => { const list = vs.filter(d => dateVente(d).slice(0, 7) === m.key); const v = list.reduce((s, d) => s + honor(d), 0);
    return { label: m.label, value: v, tip: `${m.label} ${m.year} : ${eur(v)} d’honoraires · ${list.length} vente(s)` }; });
}
function viewVentes() {
  const y = String(new Date().getFullYear()), vs = ventes().sort((a, b) => dateVente(b).localeCompare(dateVente(a)));
  const an = vs.filter(d => dateVente(d).startsWith(y)), hon = an.reduce((s, d) => s + honor(d), 0);
  const compro = App.dossiers.filter(d => d.phase === 'compromis'), aVenir = compro.reduce((s, d) => s + honor(d), 0);
  const obj = num(App.settings.agent.objectif);
  const delais = vs.filter(d => d.mandat.date && d.dates.acte).map(d => (new Date(d.dates.acte) - new Date(d.mandat.date)) / 864e5);
  return `<div class="page-head"><div><h1>🏆 Ventes réalisées</h1><p class="muted">Actes signés et compromis en cours.</p></div></div>
  <div class="kpis">${kpiTile(an.length, 'Ventes ' + y)}${kpiTile(eur(hon), 'Honoraires ' + y, obj ? gauge(hon / obj, `Objectif ${eur(obj)}`) : `<a href="#/profil" class="small">Fixer un objectif annuel</a>`)}
    ${kpiTile(eur(aVenir), 'Honoraires sous compromis', `<small class="muted">${compro.length} compromis en cours</small>`)}${kpiTile(delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) + ' j' : '—', 'Délai moyen mandat → acte')}</div>
  <section class="card"><h2>Honoraires par mois — 12 derniers mois</h2>${barChart(honorairesParMois(), { fmt: v => eur(v), empty: 'Aucune vente signée sur la période.' })}</section>
  <section class="card flush"><h2 class="pad">Historique</h2>${vs.length || compro.length ? `<table class="list"><thead><tr><th>Bien</th><th>Vendeur → acquéreur</th><th>Prix</th><th>Honoraires</th><th>Date</th><th>Statut</th></tr></thead><tbody>
    ${compro.concat(vs).map(d => `<tr data-href="#/d/${d.id}/parcours" tabindex="0"><td><b>${esc(dossierTitle(d))}</b><small>${esc(d.ref)}</small></td><td>${esc(names(d.vendeurs) || '—')} → ${esc(names(d.acquereurs) || '—')}</td>
      <td>${eur(d.offre.prix || d.mandat.prix)}</td><td><b>${eur(d.mandat.honoraires)}</b></td><td>${fdate(d.phase === 'acte' ? dateVente(d) : d.dates.acte)}</td><td><span class="pill" style="--c:${phaseDef(d.phase).color}">${d.phase === 'acte' ? 'Vendu' : 'Sous compromis'}</span></td></tr>`).join('')}</tbody></table>`
    : '<p class="muted pad">Aucune vente pour l’instant. Passez un dossier à l’étape « Acte signé » pour qu’il apparaisse ici.</p>'}</section>`;
}

/* ---------- Graphiques (SVG, sans bibliothèque) ---------- */
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function shortNum(v) { return v >= 1e6 ? (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M' : v >= 1e3 ? (v / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' k' : String(Math.round(v)); }
function barChart(data, o = {}) {
  const max = Math.max(0, ...data.map(d => d.value));
  if (!max && o.empty) return `<div class="chart-empty">${o.empty}</div>`;
  const W = 640, H = o.h || 200, L = 44, B = 24, T = 14, top = niceMax(max), n = data.length, step = (W - L - 8) / n, bw = Math.min(34, step * 0.56);
  const y = v => T + (H - T - B) * (1 - v / top);
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - 4}" y1="${y(top * f)}" y2="${y(top * f)}" class="grid"/><text x="${L - 6}" y="${y(top * f) + 4}" class="axis" text-anchor="end">${shortNum(top * f)}</text>`).join('');
  const peak = data.reduce((m, d, i) => d.value > data[m].value ? i : m, 0);
  const bars = data.map((d, i) => {
    const x = L + step * i + (step - bw) / 2, h = Math.max(0, y(0) - y(d.value)), r = Math.min(4, h, bw / 2);
    const path = h > 0 ? `M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + bw - r} Q${x + bw},${y(0) - h} ${x + bw},${y(0) - h + r} V${y(0)} Z` : '';
    return `<g class="hit" data-tip="${esc(d.tip || d.label + ' : ' + (o.fmt ? o.fmt(d.value) : d.value))}"><rect x="${L + step * i}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent"/>${path ? `<path d="${path}" class="mark"/>` : ''}
      ${i === peak && d.value ? `<text x="${x + bw / 2}" y="${y(d.value) - 5}" class="vlabel" text-anchor="middle">${o.fmt ? o.fmt(d.value) : d.value}</text>` : ''}
      <text x="${x + bw / 2}" y="${H - 6}" class="axis" text-anchor="middle">${esc(d.label)}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Graphique en barres')}">${grid}<line x1="${L}" x2="${W - 4}" y1="${y(0)}" y2="${y(0)}" class="base"/>${bars}</svg>`;
}
function funnel(rows) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return `<div class="funnel">${rows.map(r => `<a class="frow" href="${r.href}" data-tip="${esc(r.tip || '')}"><span class="flabel">${r.label}</span><span class="ftrack"><i style="width:${Math.max(r.value ? 3 : 0, r.value / max * 100)}%"></i></span><b>${r.value}</b></a>`).join('')}</div>`;
}
function stackBar(parts, total) {
  if (!total) return '<div class="chart-empty">Aucun mandat actif.</div>';
  return `<div class="stack">${parts.filter(p => p.value).map(p => `<i class="${p.cls}" style="flex:${p.value}" data-tip="${esc(p.label)} : ${p.value} (${Math.round(p.value / total * 100)} %)"></i>`).join('')}</div>
    <ul class="legend">${parts.map(p => `<li><i class="${p.cls}"></i>${p.label} <b>${p.value}</b><span class="muted">${Math.round(p.value / total * 100)} %</span></li>`).join('')}</ul>`;
}
function gauge(ratio, label) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return `<div class="gauge" data-tip="${pct} % de l’objectif"><div class="bar"><i style="width:${pct}%"></i></div><small>${pct} % · ${label}</small></div>`;
}
function kpiTile(value, label, extra = '', href) {
  const inner = `<span class="klabel">${label}</span><b>${value}</b>${extra}`;
  return href ? `<a class="kpi link" href="${href}">${inner}</a>` : `<div class="kpi">${inner}</div>`;
}
function visitesParSemaine() {
  const out = [], now = new Date(); now.setHours(12, 0, 0, 0);
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  for (let i = 7; i >= 0; i--) {
    const s = new Date(monday); s.setDate(monday.getDate() - 7 * i); const e = new Date(s); e.setDate(s.getDate() + 7);
    const list = App.crm.visites.filter(v => v.statut !== 'annulee' && v.quand && new Date(v.quand) >= s && new Date(v.quand) < e);
    out.push({ label: i === 0 ? 'cette sem.' : s.getDate() + '/' + (s.getMonth() + 1), value: list.length, tip: `Semaine du ${s.toLocaleDateString('fr-FR')} : ${list.length} visite(s)` });
  }
  return out;
}

/* ---------- Tableau de bord ---------- */
function viewDashboard() {
  const C = App.crm, ds = App.dossiers, a = App.settings.agent, y = String(new Date().getFullYear());
  const prosActifs = C.prospects.filter(p => !['mandat', 'perdu'].includes(p.statut));
  const aRelancer = C.prospects.concat(C.estimations).filter(p => p.relance && daysUntil(p.relance) <= 0 && !['mandat', 'perdu', 'refusee'].includes(p.statut));
  const estEnCours = C.estimations.filter(e => ['en_cours', 'remise'].includes(e.statut));
  const estClos = C.estimations.filter(e => ['mandat', 'refusee'].includes(e.statut)), estOk = C.estimations.filter(e => e.statut === 'mandat');
  const mandats = ds.filter(d => !['acte', 'abandon'].includes(d.phase));
  const commer = ds.filter(d => ['commercialisation', 'offre'].includes(d.phase));
  const compro = ds.filter(d => d.phase === 'compromis');
  const vs = ventes(), vAn = vs.filter(d => dateVente(d).startsWith(y)), honAn = vAn.reduce((s, d) => s + honor(d), 0);
  const in7 = d => { const t = new Date(d); const n = (t - Date.now()) / 864e5; return n >= -0.1 && n <= 7; };
  const visSem = C.visites.filter(v => v.statut !== 'annulee' && v.quand && in7(v.quand));
  const vis30 = C.visites.filter(v => v.statut === 'faite' && v.quand && (Date.now() - new Date(v.quand)) / 864e5 <= 30);
  const obj = num(a.objectif);
  const valeurCommer = commer.reduce((s, d) => s + (num(d.offre.prix) || num(d.mandat.prix) || 0), 0);
  const types = { exclusif: 0, semi: 0, simple: 0 }; mandats.forEach(d => { types[d.mandat.type] = (types[d.mandat.type] || 0) + 1; });
  const ech = allEcheances().filter(e => daysUntil(e.date) <= 14).slice(0, 8);
  const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
  const isEmpty = !ds.length && !C.prospects.length && !C.estimations.length && !C.visites.length;

  return `<div class="page-head"><div><h1>${hello}${a.prenom ? ' ' + esc(a.prenom) : ''} 👋</h1><p class="muted">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
    <div class="row gap wrap quick"><button class="btn small" data-a="entNew" data-k="prospects">＋ Prospect</button><button class="btn small" data-a="entNew" data-k="estimations">＋ Estimation</button>
    <button class="btn small" data-a="entNew" data-k="visites">＋ Visite</button><button class="btn small primary" data-a="newDossier">＋ Mandat</button></div></div>
  ${!a.nom ? `<div class="banner">Commencez par compléter <a href="#/profil">votre profil</a> : il alimente vos signatures, offres d’achat et mails.${isEmpty ? ` Vous pouvez aussi <button class="link" data-a="demoAll">charger des données d’exemple</button> pour découvrir l’application.` : ''}</div>` : ''}

  <div class="kpis six">
    ${kpiTile(prosActifs.length, '🎯 Prospection', `<small class="${aRelancer.length ? 'soon' : 'muted'}">${aRelancer.length} à relancer</small>`, '#/prospection')}
    ${kpiTile(estEnCours.length, '📐 Estimations en cours', `<small class="muted">${estClos.length ? Math.round(estOk.length / estClos.length * 100) + ' % transformées en mandat' : 'taux de transformation —'}</small>`, '#/estimations')}
    ${kpiTile(mandats.length, '📝 Mes mandats', `<small class="muted">${mandats.length ? Math.round(types.exclusif / mandats.length * 100) : 0} % exclusifs</small>`, '#/mandats')}
    ${kpiTile(commer.length, '🏷️ En commercialisation', `<small class="muted">${eur(valeurCommer)} en portefeuille</small>`, '#/mandats/commercialisation')}
    ${kpiTile(visSem.length, '🚪 Visites (7 jours)', `<small class="muted">${vis30.length} effectuée(s) sur 30 jours</small>`, '#/visites')}
    ${kpiTile(vAn.length, '🏆 Ventes ' + y, obj ? gauge(honAn / obj, eur(honAn) + ' / ' + eur(obj)) : `<small class="muted">${eur(honAn)} d’honoraires</small>`, '#/ventes')}
  </div>

  <div class="grid2">
    <section class="card"><h2>Entonnoir d’activité</h2><p class="small muted">Du premier contact à la vente : où en est votre portefeuille ?</p>
      ${funnel([{ label: 'Prospects actifs', value: prosActifs.length, href: '#/prospection' }, { label: 'Estimations en cours', value: estEnCours.length, href: '#/estimations' },
        { label: 'Mandats en préparation', value: ds.filter(d => d.phase === 'mandat').length, href: '#/mandats/mandat' }, { label: 'En commercialisation', value: commer.length, href: '#/mandats/commercialisation' },
        { label: 'Sous compromis', value: compro.length, href: '#/mandats/compromis' }, { label: 'Vendus (' + y + ')', value: vAn.length, href: '#/ventes' }])}</section>
    <section class="card"><h2>Honoraires — 12 derniers mois</h2><p class="small muted">Actes signés, par mois de signature${compro.length ? ` · ${eur(compro.reduce((s, d) => s + honor(d), 0))} sous compromis` : ''}.</p>
      ${barChart(honorairesParMois(), { fmt: v => eur(v), empty: 'Les honoraires des ventes signées apparaîtront ici.', aria: 'Honoraires par mois' })}</section>
    <section class="card"><h2>Visites — 8 dernières semaines</h2><p class="small muted">Visites prévues ou effectuées, par semaine.</p>
      ${barChart(visitesParSemaine(), { empty: 'Enregistrez vos visites pour suivre l’activité de commercialisation.', aria: 'Visites par semaine' })}</section>
    <section class="card"><h2>Mes mandats actifs par type</h2><p class="small muted">${mandats.length} mandat(s) actif(s).</p>
      ${stackBar([{ label: 'Exclusif', value: types.exclusif, cls: 'c1' }, { label: 'Semi-exclusif', value: types.semi, cls: 'c2' }, { label: 'Simple', value: types.simple, cls: 'c3' }], mandats.length)}
      <h3>Échéances de mandat (60 jours)</h3>${(() => { const l = mandats.filter(d => d.mandat.date && d.mandat.duree).map(d => ({ d, e: addMonths(d.mandat.date, d.mandat.duree) })).filter(x => daysUntil(x.e) <= 60).sort((a, b) => a.e.localeCompare(b.e));
        return l.length ? `<ul class="mini-list">${l.map(x => `<li><a href="#/d/${x.d.id}/fiche">${esc(dossierTitle(x.d))}</a><span class="${daysUntil(x.e) < 0 ? 'late' : 'soon'}">${fdate(x.e)}</span></li>`).join('')}</ul>` : '<p class="small muted">Aucune échéance proche.</p>'; })()}</section>
  </div>

  <div class="grid2">
    <section class="card"><h2>⏰ À faire — 14 prochains jours</h2>${todoList(ech, aRelancer, visSem)}</section>
    <section class="card"><h2>🏷️ Mes biens en commercialisation</h2>${commer.length ? `<ul class="mini-list big">${commer.map(d => { const nv = C.visites.filter(v => v.dossierId === d.id && v.statut !== 'annulee').length;
      return `<li><a href="#/d/${d.id}/parcours"><b>${esc(dossierTitle(d))}</b><small>${eur(d.offre.prix || d.mandat.prix)} · ${nv} visite(s) · ${esc(currentStep(d).titre)}</small></a><span class="pill" style="--c:${phaseDef(d.phase).color}">${phaseDef(d.phase).label}</span></li>`; }).join('')}</ul>`
      : '<p class="small muted">Aucun bien en commercialisation. Passez un mandat à l’étape « Commercialisation » depuis son dossier.</p>'}</section>
  </div>`;
}
function todoList(ech, relances, visites) {
  const items = [];
  ech.forEach(e => items.push({ date: e.date, html: `<a href="#/d/${e.d.id}/${e.kind === 'relance' ? 'pieces' : e.kind === 'ped' ? 'ped' : 'parcours'}">${esc(e.label)}<small>${esc(dossierTitle(e.d))}</small></a>` }));
  relances.forEach(r => { const k = r.proprietaire !== undefined ? 'estimations' : 'prospects'; items.push({ date: r.relance, html: `<a href="#" data-a="entEdit" data-k="${k}" data-id="${r.id}">Relancer ${esc(r.nom || r.proprietaire || '')}<small>${k === 'prospects' ? 'Prospect' : 'Estimation'} · ${esc([r.adresse, r.ville].filter(Boolean).join(', '))}</small></a>` }); });
  visites.forEach(v => { const d = App.dossiers.find(x => x.id === v.dossierId); items.push({ date: v.quand.slice(0, 10), html: `<a href="#" data-a="entEdit" data-k="visites" data-id="${v.id}">Visite ${v.quand.slice(11, 16)} — ${esc(v.visiteur || '')}<small>${esc(d ? dossierTitle(d) : '')}</small></a>` }); });
  items.sort((a, b) => a.date.localeCompare(b.date));
  if (!items.length) return '<p class="muted">Rien d’urgent. 👌</p>';
  return `<ul class="ech">${items.slice(0, 12).map(i => { const n = daysUntil(i.date); return `<li class="${n < 0 ? 'late' : n <= 2 ? 'soon' : ''}"><span class="when">${n < 0 ? 'Retard ' + -n + ' j' : n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : fdate(i.date).slice(0, 5)}</span>${i.html}</li>`; }).join('')}</ul>`;
}

/* ---------- Mon profil (enregistrement explicite) ---------- */
const PROFIL_FIELDS = [['civ', 'Civilité', ['', 'M.', 'Mme']], ['prenom', 'Prénom'], ['nom', 'Nom'], ['statut', 'Statut'], ['reseau', 'Réseau / agence'], ['rsac', 'N° RSAC'],
  ['carte', 'Carte professionnelle (du titulaire)'], ['tel', 'Téléphone'], ['email', 'E-mail'], ['adresse', 'Adresse', null, 3], ['objectif', 'Objectif annuel d’honoraires (€)', 'number'],
  ['signature', 'Signature des mails (laisser vide pour la générer automatiquement)', 'area']];
function viewProfil() {
  const a = App.settings.agent;
  App.profilDirty = false;
  const inp = ([k, l, t, span]) => {
    const v = a[k] ?? '';
    if (Array.isArray(t)) return `<label class="field"><span>${l}</span><select data-p="${k}">${t.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    if (t === 'area') return `<label class="field span4"><span>${l}</span><textarea data-p="${k}" rows="5" placeholder="${esc(signature())}">${esc(v)}</textarea></label>`;
    return `<label class="field ${span ? 'span' + span : ''}"><span>${l}</span><input data-p="${k}" type="${t || 'text'}" value="${esc(v)}"></label>`;
  };
  return `<div class="page-head"><div><h1>👤 Mon profil</h1><p class="muted">Ces informations alimentent vos signatures, offres d’achat, notes au notaire et demandes de pré-état daté.</p></div></div>
  <section class="card"><div class="grid4">${PROFIL_FIELDS.map(inp).join('')}</div></section>
  <div class="savebar"><span id="profilState" class="muted">Aucune modification</span><div class="row gap"><button class="btn ghost" data-a="profilCancel">Annuler</button><button class="btn primary" id="profilSave" data-a="profilSave" disabled>💾 Enregistrer les modifications</button></div></div>`;
}
function profilDirty() {
  App.profilDirty = true;
  const b = $('#profilSave'); if (b) b.disabled = false;
  const s = $('#profilState'); if (s) { s.textContent = '● Modifications non enregistrées'; s.className = 'soon'; }
}
function profilSave() {
  $$('[data-p]').forEach(el => { App.settings.agent[el.dataset.p] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim(); });
  saveSettings(); App.profilDirty = false;
  const b = $('#profilSave'); if (b) b.disabled = true;
  const s = $('#profilState'); if (s) { s.textContent = '✔ Enregistré le ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); s.className = 'okc'; }
  toast('Profil enregistré');
}

/* ---------- Données d'exemple ---------- */
function demoAll() {
  const d0 = today();
  if (!App.dossiers.some(d => d.copro.nom.includes('exemple'))) demo();
  const mk = (seed) => newDossier(seed);
  const sold = [
    { m: -1, prix: 245000, hon: 11500, adr: '8 rue Paul Bert', ville: 'Lyon', v: 'Mme Roux' }, { m: -3, prix: 312000, hon: 14800, adr: '21 cours Vitton', ville: 'Lyon', v: 'M. Petit' },
    { m: -5, prix: 189000, hon: 9500, adr: '3 place Sathonay', ville: 'Lyon', v: 'Mme Garnier' }, { m: -8, prix: 410000, hon: 18000, adr: '14 quai Saint-Vincent', ville: 'Lyon', v: 'M. Lambert' },
  ];
  sold.forEach((s, i) => { const acte = addMonths(d0, s.m); const d = mk({ ref: 'V-EX-' + (i + 1), phase: 'acte' });
    Object.assign(d.bien, { adresse: s.adr, ville: s.ville, cp: '6900' + (i + 1) }); d.vendeurs[0].nom = s.v.split(' ')[1]; d.vendeurs[0].civ = s.v.split(' ')[0];
    Object.assign(d.mandat, { prix: s.prix, honoraires: s.hon, type: i % 2 ? 'simple' : 'exclusif', date: addMonths(acte, -5), numero: 'EX-' + (i + 1) }); d.offre.prix = s.prix; d.dates.acte = acte;
    d.copro.nom = 'Copropriété (exemple)'; App.dossiers.push(d); saveDossier(d, true); });
  [['12 rue Duguesclin', 'commercialisation', 'exclusif', 265000], ['5 avenue Foch', 'commercialisation', 'semi', 398000], ['40 rue Ney', 'compromis', 'exclusif', 228000], ['2 rue Bossuet', 'mandat', 'simple', 175000]].forEach(([adr, ph, ty, prix], i) => {
    const d = mk({ ref: 'V-EX-' + (10 + i), phase: ph }); Object.assign(d.bien, { adresse: adr, ville: 'Lyon' }); Object.assign(d.mandat, { prix, honoraires: Math.round(prix * 0.045), type: ty, date: addDays(d0, -20 - i * 25) });
    d.vendeurs[0] = { ...newPerson(), civ: i % 2 ? 'M.' : 'Mme', nom: ['Bernard', 'Moreau', 'Fournier', 'Girard'][i] }; d.copro.nom = 'Copropriété (exemple)';
    if (ph === 'compromis') { d.dates.compromis = addDays(d0, -12); d.dates.acte = addDays(d0, 60); d.acquereurs = [{ ...newPerson(), civ: 'M.', nom: 'Faure' }]; }
    App.dossiers.push(d); saveDossier(d, true); });
  const P = App.crm.prospects;
  [['M. Blanc', '18 rue de Créqui', 'nouveau', 2], ['Mme Henry', '7 rue Vauban', 'contacte', -1], ['M. et Mme Rousseau', '33 rue Garibaldi', 'rdv', 3], ['Mme Perrin', '11 rue Tête d’Or', 'estimation', 5],
    ['M. Morel', '9 rue Juliette Récamier', 'contacte', 0], ['Mme Fontaine', '26 rue Bugeaud', 'perdu', null], ['M. Chevalier', '4 rue Boileau', 'nouveau', 1]].forEach(([nom, adr, st, rel], i) =>
    P.push({ id: uid(), date: addDays(d0, -i * 4), nom, tel: '06 00 00 00 1' + i, adresse: adr, ville: 'Lyon', type: 'Appartement', source: SOURCES[i % SOURCES.length], statut: st, relance: rel == null ? '' : addDays(d0, rel), notes: 'Donnée fictive' }));
  [['Mme Perrin', '11 rue Tête d’Or', 72, 330000, 355000, 345000, 'remise'], ['M. Leroy', '15 rue Sully', 48, 225000, 240000, 235000, 'en_cours'], ['Mme Bernard', '12 rue Duguesclin', 61, 255000, 270000, 265000, 'mandat'],
    ['M. Dupont', '30 rue Pierre Corneille', 85, 380000, 410000, 0, 'refusee']].forEach(([p, adr, s, b, h, r, st], i) =>
    App.crm.estimations.push({ id: uid(), date: addDays(d0, -i * 9), proprietaire: p, adresse: adr, ville: 'Lyon', type: 'Appartement', surface: s, valBasse: b, valHaute: h, valRetenue: r || '', statut: st, relance: st === 'remise' ? addDays(d0, 1) : '', notes: 'Donnée fictive' }));
  const com = App.dossiers.filter(d => ['commercialisation', 'offre'].includes(d.phase));
  for (let i = 0; i < 14; i++) { const d = com[i % com.length]; const t = new Date(); t.setDate(t.getDate() - Math.floor(i * 3.7) + 3); t.setHours(10 + (i % 7), 0, 0, 0);
    const q = new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    App.crm.visites.push({ id: uid(), dossierId: d.id, quand: q, statut: t > new Date() ? 'prevue' : 'faite', visiteur: ['M. Caron', 'Mme Lucas', 'M. Mercier', 'Mme Robin', 'M. Gauthier'][i % 5], interet: String(1 + (i % 3)), suite: ['reflexion', '2e', 'offre', 'non'][i % 4], bon: true, retour: 'Donnée fictive' }); }
  saveCrm(); location.hash = '#/'; rerender(); toast('Données d’exemple chargées (fictives).');
}

/* ---------- Actions ---------- */
Object.assign(ACT, {
  entNew(el) { openEntity(el.dataset.k); },
  entEdit(el) { openEntity(el.dataset.k, el.dataset.id); },
  entSave(el) { const k = el.dataset.k, r = entSave(k, el.dataset.id); closeModal(); rerender(); toast(ENT[k].single.replace(/^./, c => c.toUpperCase()) + ' enregistré(e)'); return r; },
  entDel(el) { const k = el.dataset.k; if (!confirmBox('Supprimer définitivement cette fiche ?')) return; App.crm[k] = App.crm[k].filter(x => x.id !== el.dataset.id); saveCrm(); closeModal(); rerender(); },
  entFilter(el) { const k = el.dataset.k; App.flt[k] = { ...(App.flt[k] || { q: '' }), s: el.dataset.s }; rerender(); },
  mandatFilter(el) { App.flt.mandats = el.dataset.f; location.hash = '#/mandats/' + el.dataset.f; },
  prospect2estim(el) {
    const p = App.crm.prospects.find(x => x.id === el.dataset.id); Object.assign(p, entCollect('prospects'), { statut: 'estimation' }); saveCrm();
    openEntity('estimations', null, { proprietaire: p.nom, tel: p.tel, email: p.email, adresse: p.adresse, ville: p.ville, type: p.type, prospectId: p.id });
  },
  estim2mandat(el) {
    const e = App.crm.estimations.find(x => x.id === el.dataset.id); Object.assign(e, entCollect('estimations'));
    const d = newDossier(); Object.assign(d.bien, { adresse: e.adresse, ville: e.ville, type: e.type, surface: e.surface });
    const parts = (e.proprietaire || '').replace(/^(M\.|Mme|Monsieur|Madame)\s+/, '').split(' ');
    Object.assign(d.vendeurs[0], { civ: /^(Mme|Madame)/.test(e.proprietaire || '') ? 'Mme' : /^(M\.|Monsieur)/.test(e.proprietaire || '') ? 'M.' : '', nom: parts.pop() || '', prenom: parts.join(' '), tel: e.tel || '', email: e.email || '' });
    d.mandat.prix = num(e.valRetenue) ?? ''; log(d, 'Dossier créé depuis l’estimation du ' + fdate(e.date));
    e.statut = 'mandat'; e.dossierId = d.id;
    const p = e.prospectId && App.crm.prospects.find(x => x.id === e.prospectId); if (p) p.statut = 'mandat';
    App.dossiers.push(d); saveDossier(d, true); saveCrm(); closeModal(); location.hash = `#/d/${d.id}/fiche`; toast('Mandat créé — complétez la fiche.');
  },
  openDossierOf(el) { const e = App.crm.estimations.find(x => x.id === el.dataset.id); closeModal(); location.hash = `#/d/${e.dossierId}/parcours`; },
  profilSave, profilCancel() { App.profilDirty = false; rerender(); },
  demoAll,
});

/* Lignes cliquables, saisie du profil, recherche, infobulle */
document.addEventListener('click', e => {
  const tr = e.target.closest('tr[data-href]'); if (tr && !e.target.closest('a,button')) location.hash = tr.dataset.href;
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return; const tr = e.target.closest && e.target.closest('tr[data-href],tr[data-a]'); if (tr) tr.click();
});
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.p !== undefined) profilDirty();
  if (e.target.dataset && e.target.dataset.t && e.target.dataset.t.startsWith('q_')) { const k = e.target.dataset.t.slice(2); App.flt[k] = { ...(App.flt[k] || { s: 'tous' }), q: e.target.value }; }
});
window.addEventListener('beforeunload', e => { if (App.profilDirty) { e.preventDefault(); e.returnValue = ''; } });
(() => {
  const tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.append(tip);
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !t.dataset.tip) { tip.classList.remove('on'); return; }
    tip.textContent = t.dataset.tip; tip.classList.add('on');
    const w = tip.offsetWidth; tip.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 16) + 'px';
  });
})();

boot();
