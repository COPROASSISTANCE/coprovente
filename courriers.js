/* =========================================================================
   CoproVente — courrier de demande d'inscription à l'ordre du jour
   Autorisation de travaux privatifs affectant les parties communes ou
   l'aspect extérieur (loi du 10 juillet 1965, art. 25 b ; décret du
   17 mars 1967, art. 10). Envoi en LRAR (ou LRE) au syndic.
   ========================================================================= */
const TRAVAUX_TYPES = [
  { id: 'mur', label: 'Ouverture ou modification d’un mur porteur', desc: 'création d’une ouverture de [largeur] m dans le mur porteur séparant [pièce] et [pièce], avec pose d’un linteau / d’une poutre IPN dimensionnée par un bureau d’études structure', docs: ['Note de calcul et plans du bureau d’études structure', 'Plans avant / après travaux'], cond: 'Les travaux seront réalisés sur la base de l’étude d’un bureau d’études structure, sous le contrôle de l’architecte de la copropriété ou d’un bureau de contrôle si l’assemblée l’exige, aux frais exclusifs du demandeur.' },
  { id: 'clim', label: 'Climatisation / pompe à chaleur (unité extérieure)', desc: 'installation d’une unité extérieure de climatisation sur [balcon / façade / toiture], de dimensions [l × h × p] cm, avec passage des liaisons frigorifiques [trajet]', docs: ['Fiche technique de l’appareil (dimensions, niveau sonore)', 'Photomontage ou plan d’implantation'], cond: 'L’appareil respectera la réglementation acoustique et l’harmonie de la façade ; l’entretien et la dépose éventuelle resteront à la charge du demandeur.' },
  { id: 'fenetres', label: 'Remplacement des fenêtres / menuiseries extérieures', desc: 'remplacement des fenêtres de l’appartement par des menuiseries [matériau], de teinte [teinte] et de partition identique à l’existant', docs: ['Devis et fiche technique des menuiseries', 'Photos de la façade'], cond: 'Les menuiseries respecteront la teinte, le matériau et les partitions définis pour l’immeuble afin de préserver l’harmonie de la façade.' },
  { id: 'sanitaire', label: 'Création de salle d’eau / WC (raccordement aux colonnes)', desc: 'création d’une salle d’eau / d’un WC dans [pièce], avec raccordement aux colonnes communes d’alimentation et d’évacuation [emplacement], par une entreprise qualifiée', docs: ['Plan de la création et du raccordement', 'Descriptif de l’entreprise (pompe de relevage le cas échéant)'], cond: 'Le raccordement aux colonnes communes sera réalisé selon les règles de l’art, sans modification de leur section ni de leur fonctionnement.' },
  { id: 'veranda', label: 'Fermeture de balcon / véranda', desc: 'fermeture du balcon / de la loggia par [type de structure], de teinte [teinte]', docs: ['Plans et photomontage', 'Déclaration préalable d’urbanisme (si requise)'], cond: 'Les travaux seront subordonnés à l’obtention des autorisations d’urbanisme nécessaires.' },
  { id: 'gaine', label: 'Percement / passage de gaine en parties communes', desc: 'percement [du mur / du plancher] pour le passage d’une gaine [ventilation / évacuation] de diamètre [Ø] mm via [trajet en parties communes]', docs: ['Plan du trajet en parties communes'], cond: 'Les percements seront rebouchés et les parties communes remises en état à l’issue des travaux.' },
  { id: 'autre', label: 'Autres travaux affectant les parties communes ou l’aspect extérieur', desc: '[décrire précisément la nature, l’emplacement et la consistance des travaux]', docs: [], cond: '' },
];
const DOCS_BASE = ['Descriptif détaillé des travaux', 'Devis de l’entreprise', 'Attestation d’assurance responsabilité civile et décennale de l’entreprise'];
function resolutionData() {
  const t = App.tools, d = App.dossiers.find(x => x.id === t.res_bien), c = contactById(t.res_contact);
  const ty = TRAVAUX_TYPES.find(x => x.id === (t.res_type || 'mur')) || TRAVAUX_TYPES[0];
  return { d, c, ty, nom: c ? cName(c) : (t.res_nom || ''), adresse: c ? c.adresse : (t.res_adresse || ''), desc: t.res_desc ?? ty.desc };
}
function resolutionTexte() {
  const t = App.tools, { d, ty, nom, desc } = resolutionData();
  return `PROJET DE RÉSOLUTION\n\nAutorisation donnée à ${nom || '[nom du copropriétaire]'}, copropriétaire ${lotsPhrase(d)}, d’effectuer à ses frais exclusifs des travaux affectant les parties communes ou l’aspect extérieur de l’immeuble (article 25 b de la loi du 10 juillet 1965).\n\nL’assemblée générale, après avoir pris connaissance du descriptif des travaux et des documents joints à la convocation, autorise ${nom || '[nom du copropriétaire]'} à réaliser à ses frais exclusifs les travaux suivants : ${desc}.\n\nCette autorisation est consentie aux conditions suivantes :\n- les travaux seront réalisés conformément au descriptif joint, selon les règles de l’art, par une entreprise qualifiée et assurée (responsabilité civile et décennale) ;\n- ${ty.cond || 'les travaux respecteront la destination de l’immeuble et les droits des autres copropriétaires'}\n- le demandeur fera son affaire de l’obtention de toutes autorisations administratives nécessaires ;\n- le demandeur restera seul responsable des conséquences des travaux à l’égard du syndicat et des tiers, et prendra en charge la remise en état des parties communes éventuellement endommagées ;\n- le syndic sera informé des dates de début et de fin du chantier${t.res_duree ? ` (durée prévue : ${t.res_duree})` : ''}.`;
}
const lotsTxtShort = d => d.lots.filter(l => l.num).map(l => l.num + (l.nature ? ' (' + l.nature.toLowerCase() + ')' : '')).join(', ');
const lotsPhrase = d => { const n = d ? d.lots.filter(l => l.num).length : 0; return n > 1 ? 'des lots n° ' + lotsTxtShort(d) : n === 1 ? 'du lot n° ' + lotsTxtShort(d) : 'du (des) lot(s) n° [numéros]'; };
function resolutionLettre() {
  const t = App.tools, { d, c, ty, nom, adresse } = resolutionData(), a = App.settings.agent;
  const docs = DOCS_BASE.concat(ty.docs).concat(t.res_docsLibre ? [t.res_docsLibre] : []);
  const syn = d ? [d.copro.syndicNom, d.copro.syndicContact].filter(Boolean).join(' — ') : '';
  return `${nom || '[Nom et prénom du copropriétaire]'}\n${adresse || '[Adresse]'}\n${c && c.tel ? 'Tél. : ' + c.tel + '\n' : ''}${c && c.email ? c.email + '\n' : ''}\n${syn || '[Syndic de la copropriété]'}\nSyndic de la copropriété ${d && d.copro.nom ? d.copro.nom : '[nom de la copropriété]'}${d && d.bien.adresse ? ' (' + [d.bien.adresse, d.bien.ville].filter(Boolean).join(', ') + ')' : ''}\n${t.res_syndicAdr || '[Adresse du syndic]'}\n\nÀ ${t.res_lieu || '[ville]'}, le ${fdate(today())}\n\nLettre recommandée avec accusé de réception\n\nObjet : demande d’inscription à l’ordre du jour de la prochaine assemblée générale — autorisation de travaux (article 25 b de la loi du 10 juillet 1965)\n\nMadame, Monsieur,\n\nCopropriétaire ${lotsPhrase(d)} au sein de la copropriété ${d && d.copro.nom ? d.copro.nom : '[nom]'}, je vous notifie, en application de l’article 10 du décret du 17 mars 1967, ma demande d’inscription à l’ordre du jour de la prochaine assemblée générale de la question suivante :\n\n« Autorisation à donner à ${nom || '[nom]'} d’effectuer à ses frais des travaux affectant les parties communes : ${ty.label.toLowerCase()} ».\n\nConformément à ce même article, vous trouverez ci-joints le projet de résolution ainsi que les documents précisant l’implantation et la consistance des travaux :\n${docs.map(x => '- ' + x).join('\n')}\n\nJe vous remercie de bien vouloir joindre ces documents à la convocation et de m’accuser réception de la présente demande. ${t.res_ag ? `Une assemblée générale étant prévue le ${fdate(t.res_ag)}, je vous serais reconnaissant(e) d’y inscrire cette question si les délais de convocation le permettent, ou à défaut à l’assemblée suivante.` : 'Si les délais de convocation de la prochaine assemblée ne le permettent pas, je vous remercie d’inscrire cette question à l’assemblée suivante.'}\n\nJe reste à votre disposition pour tout renseignement complémentaire.\n\nVeuillez agréer, Madame, Monsieur, l’expression de mes salutations distinguées.\n\n${nom || '[Signature]'}\n\nPièce jointe : projet de résolution${a.nom ? `\n\nCourrier préparé avec l’accompagnement de ${[a.prenom, a.nom].join(' ').trim()}${a.reseau ? ', ' + a.reseau : ''}.` : ''}`;
}
function resolutionHtml() {
  const L = esc(resolutionLettre()).replace(/\n/g, '<br>'), R = esc(resolutionTexte()).replace(/\n/g, '<br>');
  return doc2('Demande d’inscription à l’ordre du jour', `<div style="font-size:12.5px">${L}</div><div style="page-break-before:always"></div><h1 style="font-size:18px">Projet de résolution</h1><div>${R.replace(/^PROJET DE RÉSOLUTION<br><br>/, '')}</div>${agentFoot()}`);
}
function toolResolution() {
  const t = App.tools; if (!t.res_type) Object.assign(t, { res_type: 'mur', res_bien: '', res_contact: '' });
  const { d, ty } = resolutionData();
  const sel = (key, label, opts) => `<label class="field"><span>${label}</span><select data-t="${key}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(t[key] ?? '') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const inp = (key, label, type = 'text', cls = '') => `<label class="field ${cls}"><span>${label}</span><input type="${type}" data-t="${key}" value="${esc(t[key] ?? '')}"></label>`;
  return `<a href="#/outils" class="muted small">← Outils</a>
  <div class="page-head"><div><h1>📮 Demande d’inscription à l’ordre du jour — autorisation de travaux</h1><p class="muted">Courrier en LRAR au syndic (art. 10 du décret du 17 mars 1967) avec projet de résolution, pour des travaux privatifs affectant les parties communes ou l’aspect extérieur (art. 25 b de la loi du 10 juillet 1965).</p></div></div>
  <section class="card ca-box"><h2>💼 Faites préparer le dossier de résolution par ${COPRO_ASSISTANCE.nom}</h2><p class="small">Rédaction du projet de résolution, constitution du dossier technique à joindre et suivi jusqu’à l’assemblée générale.</p>
    <a class="btn primary" href="${COPRO_ASSISTANCE.urlResolution}" target="_blank" rel="noopener">Découvrir la prestation « Dossier de résolution AG » ↗</a></section>
  <div class="grid-side"><div>
  <section class="card"><h2>1. Le copropriétaire et l’immeuble</h2><div class="grid4">
    <label class="field span2"><span>Bien (copropriété, lots, syndic)</span><select data-t="res_bien"><option value="">— Saisie libre —</option>${App.dossiers.filter(x => x.phase !== 'abandon').map(x => `<option value="${x.id}" ${x.id === t.res_bien ? 'selected' : ''}>${esc(dossierTitle(x))}</option>`).join('')}</select></label>
    <label class="field span2"><span>Copropriétaire demandeur</span><select data-t="res_contact"><option value="">— Saisie libre —</option>${App.crm.contacts.map(c => `<option value="${c.id}" ${c.id === t.res_contact ? 'selected' : ''}>${esc(cName(c))}</option>`).join('')}</select></label>
    ${!t.res_contact ? inp('res_nom', 'Nom du copropriétaire', 'text', 'span2') + inp('res_adresse', 'Adresse du copropriétaire', 'text', 'span2') : ''}
    ${inp('res_syndicAdr', 'Adresse postale du syndic', 'text', 'span2')}${inp('res_lieu', 'Fait à')}${inp('res_ag', 'Date de la prochaine AG (si connue)', 'date')}</div>
    ${d && !d.copro.syndicNom ? '<p class="small soon">Le nom du syndic n’est pas renseigné dans la fiche du bien.</p>' : ''}</section>
  <section class="card"><h2>2. Les travaux</h2><div class="grid4">${sel('res_type', 'Type de travaux', TRAVAUX_TYPES.map(x => [x.id, x.label]))}${inp('res_duree', 'Durée prévue du chantier')}
    <label class="field span4"><span>Description (nature, emplacement, consistance) — complétez les [crochets]</span><textarea data-t="res_desc" rows="4">${esc(t.res_desc ?? ty.desc)}</textarea></label>
    ${inp('res_docsLibre', 'Autre document joint', 'text', 'span4')}</div>
    <p class="small muted">Documents joints proposés : ${DOCS_BASE.concat(ty.docs).map(esc).join(' · ')}.</p>
    <button class="btn small ghost" data-a="resReset">Réinitialiser la description selon le type</button></section></div>
  <aside class="card sticky"><h2>Courrier et projet de résolution</h2>
    <div class="row gap wrap"><button class="btn primary" data-a="resDo" data-how="print">🖨️ PDF</button><button class="btn" data-a="resDo" data-how="word">⬇️ Word</button><button class="btn" data-a="resDo" data-how="copy">📋 Copier le courrier</button><button class="btn" data-a="resDo" data-how="copyRes">📋 Copier la résolution</button>${t.res_bien ? '<button class="btn" data-a="resDo" data-how="save">💾 Ranger dans le dossier</button>' : ''}</div>
    <div class="tip small">📮 À envoyer en <b>lettre recommandée avec accusé de réception</b> (ou recommandé électronique), assez tôt pour que le syndic puisse l’inscrire avant l’envoi de la convocation. Ces travaux sont votés à la majorité de l’article 25.</div>
    <pre class="preview mono">${esc(resolutionLettre())}</pre><pre class="preview mono">${esc(resolutionTexte())}</pre></aside></div>`;
}
Object.assign(ACT, {
  resReset() { delete App.tools.res_desc; rerender(); },
  async resDo(el) {
    const how = el.dataset.how, d = App.dossiers.find(x => x.id === App.tools.res_bien);
    if (how === 'copy') return copyText(resolutionLettre());
    if (how === 'copyRes') return copyText(resolutionTexte());
    const html = resolutionHtml(), name = `Demande_inscription_ODJ_travaux_${today()}`;
    if (how === 'print') printHtml(html); else if (how === 'word') download(name + '.doc', wordBlob(html));
    else if (d) { const blob = new Blob([html], { type: 'text/html' }); await Store.putFile({ id: uid(), dossierId: d.id, pieceId: 'divers', name: name + '.html', type: 'text/html', size: blob.size, blob, addedAt: Date.now() }); log(d, 'Demande d’inscription à l’ordre du jour (travaux) préparée'); toast('Courrier rangé dans les pièces du bien'); }
  },
});
/* Changer de type de travaux reprend la description type */
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.t === 'res_type') delete App.tools.res_desc; });
