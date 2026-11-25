/* =========================================================================
   CoproVente — Mails (5 fils), offre d'achat, pré-état daté, notaire,
   génération de documents (impression/PDF, Word, ZIP)
   ========================================================================= */

/* ---------- Nombres en lettres (offre d'achat) ---------- */
function enLettres(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return 'zéro';
  const u = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const t = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  const lt100 = (x, fin) => {
    if (x < 20) return u[x];
    const d = Math.floor(x / 10), r0 = x % 10, r = r0 + ((d === 7 || d === 9) ? 10 : 0);
    if (r === 0) return d === 8 ? (fin ? 'quatre-vingts' : 'quatre-vingt') : t[d];
    if (r0 === 1 && d < 8) return t[d] + ' et ' + u[r];
    return t[d] + '-' + u[r];
  };
  const lt1000 = (x, fin) => {
    const c = Math.floor(x / 100), r = x % 100;
    if (!c) return lt100(r, fin);
    const cent = c === 1 ? 'cent' : u[c] + ' cent' + (r === 0 && fin ? 's' : '');
    return r ? cent + ' ' + lt100(r, fin) : cent;
  };
  const parts = [];
  const mds = Math.floor(n / 1e9), mil = Math.floor((n % 1e9) / 1e6), th = Math.floor((n % 1e6) / 1000), rest = n % 1000;
  if (mds) parts.push(mds === 1 ? 'un milliard' : lt1000(mds, true) + ' milliards');
  if (mil) parts.push(mil === 1 ? 'un million' : lt1000(mil, true) + ' millions');
  if (th) parts.push(th === 1 ? 'mille' : lt1000(th, false) + ' mille');
  if (rest) parts.push(lt1000(rest, true));
  return parts.join(' ');
}
const eurLettres = n => enLettres(n) + ' euros';

/* ---------- Impression / export ---------- */
const DOC_CSS = `body{font-family:Georgia,'Times New Roman',serif;color:#111;max-width:760px;margin:24px auto;padding:0 24px;font-size:13.5px;line-height:1.55}
h1{font-size:22px;text-align:center;letter-spacing:.06em;margin:18px 0}h2{font-size:15px;border-bottom:1px solid #999;padding-bottom:3px;margin-top:22px}
.hdr{display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:11px;color:#333;border-bottom:2px solid #0b1f3a;padding-bottom:8px}
table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #bbb;padding:5px 7px;text-align:left;vertical-align:top;font-size:12.5px}th{background:#eef2f6}
.sig{display:flex;gap:24px;margin-top:28px}.sig div{flex:1;border:1px solid #999;min-height:120px;padding:8px;font-size:12px}
.small{font-size:11px;color:#444}.box{border:1px solid #0b1f3a;padding:10px 12px;margin:10px 0;background:#f6f8fb}
@media print{body{margin:0}}`;
function docShell(title, body) { return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${DOC_CSS}</style></head><body>${body}</body></html>`; }
function printHtml(html) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.append(f);
  f.onload = () => { setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 200); };
  f.srcdoc = html;
}
function wordBlob(html) {
  const w = html.replace('<html lang="fr">', '<html lang="fr" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">');
  return new Blob(['﻿' + w], { type: 'application/msword' });
}
async function saveGeneratedToPieces(d, pieceId, name, html) {
  const blob = new Blob([html], { type: 'text/html' });
  const rec = { id: uid(), dossierId: d.id, pieceId, name, type: 'text/html', size: blob.size, blob, addedAt: Date.now() };
  await Store.putFile(rec); App.files.push(rec);
  log(d, 'Document généré enregistré : ' + name);
  toast('Enregistré dans les pièces');
}
function agentHeader() {
  const a = App.settings.agent;
  return `<div class="hdr"><div><b>${esc([a.prenom, a.nom].join(' ').trim() || '[Agent]')}</b><br>${esc(a.statut || '')}${a.reseau || a.agence ? '<br>' + esc(a.reseau || a.agence) : ''}</div>
  <div style="text-align:right">${esc(a.tel || '')}<br>${esc(a.email || '')}${a.rsac ? '<br>RSAC ' + esc(a.rsac) : ''}${a.carte ? '<br>Carte pro ' + esc(a.carte) : ''}</div></div>`;
}
const personLine = p => `${esc(personName(p) || '…')}${p.situation ? ', ' + esc(p.situation) : ''}${p.adresse ? ', demeurant ' + esc(p.adresse) : ''}${p.email || p.tel ? ' — ' + esc([p.tel, p.email].filter(Boolean).join(' / ')) : ''}`;
function lotsTable(d) {
  return `<table><tr><th>Lot n°</th><th>Nature</th><th>Tantièmes</th><th>Observations</th></tr>${d.lots.map(l => `<tr><td>${esc(l.num || '…')}</td><td>${esc(l.nature)}</td><td>${esc(l.tantiemes)}</td><td>${esc(l.obs)}</td></tr>`).join('')}</table>`;
}

/* =========================================================================
   MAILS — 5 fils par bien
   ========================================================================= */
function canalEmails(d, c) {
  const list = {
    notaire: [d.notaireV.email, d.notaireA.email],
    syndic: [d.copro.syndicEmail],
    vendeur: d.vendeurs.map(p => p.email),
    acquereur: d.acquereurs.map(p => p.email),
    autre: [d.contacts.autreEmail, d.contacts.courtierEmail],
  }[c] || [];
  const extra = (d.mails[c].to || '').split(/[,;\s]+/);
  return [...new Set(list.concat(extra).map(x => (x || '').trim().toLowerCase()).filter(x => x.includes('@')))];
}
const copyBtn = (v, label = '📋') => `<button class="btn small ghost" data-a="copy" data-v="${esc(v)}" title="Copier">${label}</button>`;
function tabMails(d) {
  const c = App.canal, em = canalEmails(d, c), lab = CANAUX.find(x => x.id === c).label;
  const msgs = d.mails[c].messages.slice().sort((a, b) => b.date - a.date);
  return `<div class="seg big">${CANAUX.map(x => `<button class="${c === x.id ? 'on' : ''}" data-a="setCanal" data-c="${x.id}">${x.icon} ${x.label} <small>${d.mails[x.id].messages.length || ''}</small></button>`).join('')}</div>
  <section class="card">
    <p class="small muted">Préparez vos mails ici, copiez en un clic l’adresse, l’objet et le message, puis collez-les dans votre messagerie. Collez aussi les mails reçus pour garder tout l’historique du dossier au même endroit.</p>
    <div class="grid4">
      <div class="field span2"><span>Adresses du fil « ${lab} »</span><div class="readout">${em.length ? `<div class="row gap wrap">${em.map(e => `<span class="fchip">${esc(e)} ${copyBtn(e)}</span>`).join('')}${em.length > 1 ? copyBtn(em.join(', '), '📋 Toutes') : ''}</div>` : '<span class="muted">Aucune adresse : renseignez la fiche ou ajoutez-en ci-contre.</span>'}</div></div>
      ${field('Adresses supplémentaires', `mails.${c}.to`, { cls: 'span2', ph: 'a@x.fr, b@y.fr', r: true })}
    </div>
    <div class="row gap wrap"><button class="btn primary" data-a="compose" data-canal="${c}">✉️ Rédiger un mail</button><button class="btn" data-a="pasteMail">📥 Coller un mail reçu</button>
      ${allTemplates().filter(t => t.canal === c && t.id !== 'ped_commande').slice(0, 4).map(t => `<button class="btn small ghost" data-a="compose" data-tpl="${t.id}">${esc(t.titre)}</button>`).join('')}</div>
  </section>
  <section class="msgs">${msgs.length ? msgs.map(m => msgCard(m)).join('') : '<p class="muted center">Aucun message dans ce fil. Rédigez un mail ou collez un mail reçu.</p>'}</section>`;
}
function msgCard(m) {
  const open = App.open['m_' + m.id], sent = m.source === 'brouillon';
  return `<article class="msg ${open ? 'open' : ''}"><header data-a="toggleMsg" data-id="${m.id}">
    <span class="src ${m.source}">${sent ? 'Envoyé / préparé' : 'Reçu'}</span>
    <b>${esc(m.subject)}</b><span class="muted small">${esc(sent ? 'À : ' + (m.to || '') : m.from)} · ${fdatetime(m.date)}</span>
    ${!open ? `<p class="small muted">${esc((m.snippet || m.body || '').slice(0, 160))}</p>` : ''}</header>
    ${open ? `<div class="mbody"><pre>${esc(m.body)}</pre>
      <div class="row gap wrap"><button class="btn small" data-a="reply" data-id="${m.id}">↩️ Répondre</button><button class="btn small" data-a="copyMsg" data-id="${m.id}">📋 Copier</button><button class="btn small ghost" data-a="delMsg" data-id="${m.id}">Retirer du fil</button></div></div>` : ''}</article>`;
}
function findMsg(d, id) { for (const c of CANAUX) { const m = d.mails[c.id].messages.find(x => x.id === id); if (m) return { m, c: c.id }; } return {}; }

/* ---------- Rédaction : copier en un clic ---------- */
function openCompose(d, opts = {}) {
  const tpls = allTemplates().filter(t => t.id !== 'ped_commande');
  const tpl = opts.tpl ? tpls.find(t => t.id === opts.tpl) : null;
  const canal = opts.canal || (tpl && tpl.canal) || App.canal || 'vendeur';
  App.compose = { canal, saved: false };
  const to = opts.to ?? canalEmails(d, canal).join(', ');
  const subject = opts.subject ?? (tpl ? fill(tpl.sujet, d) : '');
  const body = opts.body ?? (tpl ? fill(tpl.corps, d) : '\n\n' + signature());
  const cp = (how, l = '📋 Copier') => `<button class="btn small" data-a="composeDo" data-how="${how}">${l}</button>`;
  openModal(opts.title || 'Rédiger un mail', `
    <div class="grid4">
      <label class="field span2"><span>Modèle</span><select id="c_tpl" data-a-change="composeTpl"><option value="">— Aucun —</option>
        ${CANAUX.map(cn => `<optgroup label="${cn.label}">${tpls.filter(t => t.canal === cn.id).map(t => `<option value="${t.id}" ${tpl && tpl.id === t.id ? 'selected' : ''}>${esc(t.titre)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label class="field span2"><span>Fil du dossier</span><select id="c_canal">${CANAUX.map(cn => `<option value="${cn.id}" ${cn.id === canal ? 'selected' : ''}>${cn.label}</option>`).join('')}</select></label>
      <div class="field span4"><span>Destinataire(s)</span><div class="cfield"><input id="c_to" value="${esc(to)}">${cp('to')}</div></div>
      <div class="field span4"><span>Objet</span><div class="cfield"><input id="c_subject" value="${esc(subject)}">${cp('subject')}</div></div>
      <div class="field span4"><span>Message</span><textarea id="c_body" rows="16">${esc(body)}</textarea>
        <small>Relisez et complétez les zones entre crochets [ ] avant l’envoi.</small></div>
    </div>
    <div class="row gap wrap modal-actions">
      <button class="btn primary" data-a="composeDo" data-how="body">📋 Copier le message</button>
      <button class="btn" data-a="composeDo" data-how="all">📋 Tout copier (objet + message)</button>
      <button class="btn ghost" data-a="composeDo" data-how="save">💾 Garder dans le fil et fermer</button></div>
    <p class="small muted">Astuce : copiez l’adresse, collez-la dans votre messagerie, puis l’objet, puis le message. Le mail est gardé dans le fil du dossier dès que vous copiez le message.</p>`, { wide: true });
}
function composeValues() {
  return { canal: $('#c_canal').value, to: $('#c_to').value.trim(), subject: $('#c_subject').value, body: $('#c_body').value };
}
function composeDo(d, how) {
  const v = composeValues();
  if (how === 'to') return copyText(v.to);
  if (how === 'subject') return copyText(v.subject);
  if (how === 'body') copyText(v.body);
  if (how === 'all') copyText(`Objet : ${v.subject}\n\n${v.body}`);
  if (!App.compose.saved) {
    App.compose.saved = true;
    if (App.compose.onDone) App.compose.onDone();
    d.mails[v.canal].messages.push({ id: 'b_' + uid(), source: 'brouillon', from: 'Moi', to: v.to, subject: v.subject, body: v.body, date: Date.now(), snippet: v.body.slice(0, 160) });
    log(d, `Mail préparé (${CANAUX.find(c => c.id === v.canal).label}) : ${v.subject}`, 'mail');
    saveDossier();
  }
  if (how === 'save') { closeModal(); rerender(); }
}

/* =========================================================================
   OFFRE D'ACHAT
   ========================================================================= */
function tabOffre(d) {
  const o = d.offre, prix = num(o.prix), hon = num(d.mandat.honoraires);
  return `<div class="grid-side"><div>
  <section class="card"><h2>Acquéreur(s)</h2>
    ${d.acquereurs.length ? `<p>${d.acquereurs.map(personLine).join('<br>')}</p>` : '<p class="muted">Aucun acquéreur renseigné.</p>'}
    <a class="btn small" href="#/d/${d.id}/fiche">Compléter dans la fiche</a> <button class="btn small" data-a="addPerson" data-list="acquereurs" data-go="fiche">＋ Ajouter un acquéreur</button>
    <button class="btn small ghost" data-a="importPdf" data-kind="offre" data-into="1">📄 Importer une offre (PDF)</button></section>
  <section class="card"><h2>Conditions de l’offre</h2><div class="grid4">
    ${field('Prix proposé (€, honoraires inclus)', 'offre.prix', { type: 'number', r: true, help: d.mandat.prix ? 'Prix du mandat : ' + eur(d.mandat.prix) : '' })}
    ${field('Date de l’offre', 'offre.date', { type: 'date', r: true })}${field('Valable jusqu’au', 'offre.validite', { type: 'date', r: true })}${field('Fait à', 'offre.lieu', { r: true })}
    ${field('Financement', 'offre.financement', { options: [['pret', 'Prêt immobilier'], ['mixte', 'Apport + prêt'], ['comptant', 'Comptant']], r: true })}
    ${o.financement !== 'comptant' ? field('Apport (€)', 'offre.apport', { type: 'number', r: true }) + field('Montant du prêt (€)', 'offre.pret', { type: 'number', r: true }) + field('Durée (ans)', 'offre.duree', { type: 'number', r: true }) +
      field('Taux maximum (%)', 'offre.taux', { type: 'number', step: '0.01', r: true }) + field('Délai pour obtenir le prêt (jours)', 'offre.delaiPret', { type: 'number', r: true }) + field('Condition suspensive de prêt', 'offre.conditionPret', { check: true, r: true }) : field('Apport / fonds propres (€)', 'offre.apport', { type: 'number', r: true })}
    ${field('Compromis souhaité avant le', 'offre.dateCompromis', { type: 'date', r: true })}${field('Acte souhaité avant le', 'offre.dateActe', { type: 'date', r: true })}
    ${field('Autres conditions', 'offre.autresConditions', { area: true, cls: 'span4', r: true, ph: 'ex. sous réserve de l’obtention d’un permis, de la vente d’un bien…' })}
    ${field('Observations', 'offre.obs', { area: true, cls: 'span4', r: true })}</div>
    ${prix && hon ? `<p class="small">Net vendeur estimé : <b>${eur(prix - hon)}</b> (honoraires ${eur(hon)} ${d.mandat.charge === 'acquereur' ? 'à la charge de l’acquéreur' : 'à la charge du vendeur'}).</p>` : ''}
  </section></div>
  <aside class="card sticky"><h2>Document</h2>
    <div class="row gap wrap"><button class="btn primary" data-a="offreDo" data-how="print">🖨️ Imprimer / PDF</button><button class="btn" data-a="offreDo" data-how="word">⬇️ Word</button>
    <button class="btn" data-a="offreDo" data-how="save">💾 Enregistrer dans les pièces</button><button class="btn" data-a="compose" data-tpl="vendeur_offre">✉️ Envoyer au vendeur</button></div>
    <div class="preview">${offreBody(d)}</div></aside></div>`;
}
function offreBody(d) {
  const o = d.offre, b = d.bien, prix = num(o.prix) || 0, hon = num(d.mandat.honoraires);
  const acqs = d.acquereurs.length ? d.acquereurs : [newPerson()];
  return `${agentHeader()}<h1>OFFRE D’ACHAT</h1>
  <p>${acqs.length > 1 ? 'Nous soussignés' : 'Je soussigné(e)'} :</p><p>${acqs.map(personLine).join('<br>')}</p>
  <p>${acqs.length > 1 ? 'déclarons' : 'déclare'} faire une offre d’acquisition ferme portant sur le bien ci-après désigné, dépendant d’un immeuble soumis au statut de la copropriété${d.copro.nom ? ' dénommé « ' + esc(d.copro.nom) + ' »' : ''}${d.copro.nbLots ? ' (' + esc(d.copro.nbLots) + ' lots)' : ''} :</p>
  <h2>Désignation du bien</h2>
  <p><b>${esc(b.type)}</b> situé ${esc([b.adresse, [b.cp, b.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '…')}${b.etage ? ', ' + esc(b.etage) + (isNaN(b.etage) ? '' : (b.etage == 1 ? 'er' : 'e') + ' étage') : ''}${b.pieces ? ', ' + esc(b.pieces) + ' pièce(s)' : ''}${b.surface ? ', d’une superficie privative (loi Carrez) de ' + esc(b.surface) + ' m²' : ''}.</p>
  ${lotsTable(d)}
  <p>Appartenant à : ${esc(names(d.vendeurs) || '…')}. ${b.occupation === 'loue' ? 'Le bien est vendu loué.' : 'Le bien sera vendu libre de toute occupation au jour de l’acte authentique.'}</p>
  <h2>Prix</h2>
  <div class="box">Prix proposé : <b>${eur(prix)}</b> (${esc(eurLettres(prix))}), honoraires d’agence inclus${hon ? ` de ${eur(hon)} ${d.mandat.charge === 'acquereur' ? 'à la charge de l’acquéreur' : 'à la charge du vendeur'}, soit un prix net vendeur de ${eur(prix - hon)}` : ''}.</div>
  <h2>Financement</h2><p>${esc(financementText(d)).replace(/^./, c => c.toUpperCase())}.${o.financement !== 'comptant' && o.conditionPret ? ` L’acquéreur s’engage à déposer ses demandes de prêt dans les meilleurs délais ; la condition suspensive devra être réalisée dans un délai de ${esc(o.delaiPret || 45)} jours à compter de la signature de l’avant-contrat.` : ''}</p>
  ${o.autresConditions ? `<h2>Autres conditions</h2><p>${esc(o.autresConditions).replace(/\n/g, '<br>')}</p>` : ''}
  <h2>Calendrier souhaité</h2><p>Signature de l’avant-contrat avant le ${fdate(o.dateCompromis)} ; réitération par acte authentique avant le ${fdate(o.dateActe)}${d.notaireA.nom ? ', en l’étude de ' + esc(d.notaireA.nom) + ' (notaire de l’acquéreur)' : ''}${d.notaireV.nom ? ', avec le concours de ' + esc(d.notaireV.nom) + ' (notaire du vendeur)' : ''}.</p>
  <h2>Durée de validité</h2><p>La présente offre est valable jusqu’au <b>${fdate(o.validite)}</b> inclus. À défaut d’acceptation écrite du vendeur dans ce délai, elle sera considérée comme caduque.</p>
  ${o.obs ? `<h2>Observations</h2><p>${esc(o.obs).replace(/\n/g, '<br>')}</p>` : ''}
  <h2>Informations de l’acquéreur</h2><p class="small">L’acquéreur reconnaît avoir été informé : que l’accord des parties sera régularisé par un avant-contrat (compromis ou promesse de vente) ; qu’il bénéficiera d’un délai de rétractation de dix jours (art. L.271-1 du CCH) ; qu’aucun versement ne peut être exigé ni accepté avant la signature de l’avant-contrat (art. 1589-1 du Code civil) ; que les documents et informations relatifs à la copropriété, dont les informations financières prévues par l’art. L.721-2 du CCH, lui seront remis au plus tard lors de la signature de l’avant-contrat.</p>
  <p>Fait à ${esc(o.lieu || '…')}, le ${fdate(o.date)}, en ${acqs.length + 1} exemplaires.</p>
  <div class="sig"><div><b>L’acquéreur</b><br><span class="small">Signature précédée de la mention manuscrite « Bon pour offre d’achat au prix de ${esc(eur(prix))} »</span></div>
  <div><b>Acceptation du vendeur</b><br><span class="small">Date et signature précédées de la mention « Bon pour acceptation de l’offre au prix de ${esc(eur(prix))} »</span></div></div>
  <p class="small">Offre établie par ${esc([App.settings.agent.prenom, App.settings.agent.nom].join(' ').trim() || 'l’agent')} — mandat n° ${esc(d.mandat.numero || '…')} du ${fdate(d.mandat.date)}.</p>`;
}

/* =========================================================================
   PRÉ-ÉTAT DATÉ
   ========================================================================= */
function pedPieces() { return PIECES.filter(p => p.ped); }
function pedRequestText(d) {
  const V = tplVars(d), P = d.ped;
  const got = pedPieces().filter(p => (d.pieces[p.id] || {}).s === 'R');
  const miss = pedPieces().filter(p => isApplicable(d, p) && !['R', 'SO', 'NR'].includes((d.pieces[p.id] || {}).s || ''));
  const ex = (a, b) => a || b ? `du ${fdate(a)} au ${fdate(b)}` : 'à préciser';
  return `Bonjour,

Je souhaite commander un pré-état daté pour le compte de mon client vendeur.

VENDEUR
${d.vendeurs.map(p => '- ' + personName(p) + (p.email ? ' — ' + p.email : '') + (p.tel ? ' — ' + p.tel : '')).join('\n') || '- [à compléter]'}

BIEN
- Adresse : ${V.adresse_complete}
- Lots vendus : ${d.lots.map(l => l.num + (l.nature ? ' (' + l.nature + ')' : '') + (l.tantiemes ? ' — ' + l.tantiemes + ' tantièmes' : '')).join(' ; ') || '[à compléter]'}
- Occupation : ${V.occupation}

COPROPRIÉTÉ
- Nom : ${d.copro.nom || '[à compléter]'}${d.copro.immat ? ' — immatriculation ' + d.copro.immat : ''}
- Syndic : ${d.copro.syndicNom || '[à compléter]'}${d.copro.syndicType !== 'professionnel' ? ' (' + d.copro.syndicType + ')' : ''}${d.copro.syndicEmail ? ' — ' + d.copro.syndicEmail : ''}${d.copro.syndicTel ? ' — ' + d.copro.syndicTel : ''}
- Extranet : ${d.copro.extranet ? 'oui (' + d.copro.extranet + ') — accès communiqué séparément avec l’accord du vendeur' : 'non communiqué'}
- Exercice N-1 : ${ex(d.copro.ex1Debut, d.copro.ex1Fin)} ; exercice N-2 : ${ex(d.copro.ex2Debut, d.copro.ex2Fin)}

CALENDRIER
- Compromis envisagé le : ${V.date_compromis}
- Notaire : ${[d.notaireV.nom, d.notaireV.etude, d.notaireV.email].filter(Boolean).join(' — ') || '[à compléter]'}
${d.acquereurs.length ? '- Acquéreur : ' + names(d.acquereurs) + '\n' : ''}- Option urgente (4 h ouvrées) : ${P.urgence ? 'OUI' : 'non'}
- Facturation : ${P.facturation === 'agence' ? 'facture à mon agence' : 'lien de paiement à adresser au vendeur'}

PIÈCES JOINTES / DISPONIBLES
${bullets(got.map(p => p.label + ((d.pieces[p.id] || {}).ex ? ' — ' + d.pieces[p.id].ex : '')))}

PIÈCES NON ENCORE RÉUNIES
${bullets(miss.map(p => p.label))}
${P.notes ? '\nPRÉCISIONS\n' + P.notes + '\n' : ''}
Merci de me confirmer la prise en charge et le délai.

${signature()}`;
}
function pedCompareCard(d, withCA) {
  const mode = d.ped.mode || 'extranet';
  return `<section class="card ${withCA ? 'ca-box' : ''}"><h2>${withCA ? '📦 ' : ''}Qui peut réaliser le pré-état daté ?</h2>
    <p>Les informations financières de la copropriété doivent être remises à l’acquéreur <b>au plus tard à la promesse</b> (CCH, art. L.721-2), sinon le délai de rétractation ne court qu’après leur communication.</p>
    <div class="ped-opts"><div class="pedo"><b>Le syndic</b><span class="big">≈ 320 €</span><small>prix moyen</small><span class="big">≈ 6 jours</span><small>délai moyen</small></div>
      <div class="pedo ca"><b>${COPRO_ASSISTANCE.nom}</b><span class="big">60 € TTC</span><small>tous lots inclus</small><span class="big">24 h</span><small>à réception d’un dossier exploitable</small></div></div>
    <div class="tip">💡 Vous pouvez présenter les deux solutions à votre client : le choix lui appartient. Sans commande préalable de sa part, le syndic ne peut ni imposer ni facturer son pré-état daté.</div>
    ${withCA ? `<div class="seg">${[['extranet', 'Option 1 · Accès extranet'], ['documents', 'Option 2 · Envoi des documents']].map(([v, l]) => `<button class="${mode === v ? 'on' : ''}" data-a="pedMode" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="row gap wrap modal-actions"><button class="btn primary" data-a="pedCA">📦 Demander le pré-état daté à ${COPRO_ASSISTANCE.nom}</button><a class="btn ghost" href="#/d/${d.id}/ped">Voir le détail de la demande</a></div>
    <p class="small muted">Mail pré-rempli vers ${COPRO_ASSISTANCE.email} · 📞 <a href="tel:${COPRO_ASSISTANCE.tel.replace(/\s/g, '')}">${COPRO_ASSISTANCE.tel}</a></p>` : ''}
    <div class="row gap wrap"><button class="btn" data-a="compose" data-tpl="vendeur_ped">✉️ Présenter les deux options au vendeur</button><button class="btn small ghost" data-a="compose" data-tpl="syndic_documents">Écrire au syndic</button></div></section>`;
}
function tabPed(d) {
  const ps = pedPieces(), got = ps.filter(p => ['R', 'SO', 'NR'].includes((d.pieces[p.id] || {}).s || '')).length;
  const P = d.ped, mode = P.mode || 'extranet';
  const ok = (cond, txt, link) => `<li class="${cond ? 'okc' : 'soon'}">${cond ? '✔' : '⚠️'} ${txt}${!cond && link ? ` — <a href="${link}">compléter</a>` : ''}</li>`;
  const st = id => (d.pieces[id] || {}).s || '', recu = id => ['R', 'P', 'V'].includes(st(id));
  const vendMail = (d.vendeurs.find(p => p.email) || {}).email;
  return `${pedCompareCard(d)}
  <section class="card ca-box"><h2>📦 Demander le pré-état daté à ${COPRO_ASSISTANCE.nom}</h2>
    <p class="small">Mail pré-rempli à copier-coller vers <b>${COPRO_ASSISTANCE.email}</b> · 📞 <a href="tel:${COPRO_ASSISTANCE.tel.replace(/\s/g, '')}">${COPRO_ASSISTANCE.tel}</a></p>
    <div class="seg big">${[['extranet', 'Option 1 · Accès extranet'], ['documents', 'Option 2 · Envoi des documents']].map(([v, l]) => `<button class="${mode === v ? 'on' : ''}" data-a="pedMode" data-v="${v}">${l}</button>`).join('')}</div>
    ${mode === 'extranet' ? `<p class="small muted">Avec l’accord du vendeur. Le mail contiendra :</p><ul class="mentions">
      ${ok(d.copro.syndicNom, 'Nom du syndic' + (d.copro.syndicNom ? ' : ' + esc(d.copro.syndicNom) : ''), `#/d/${d.id}/fiche`)}
      ${ok(d.copro.extranetLogin && d.copro.extranetPass, 'Identifiants de connexion à l’extranet', `#/d/${d.id}/fiche`)}
      ${ok(d.lots.some(l => l.num), 'Lot(s) vendu(s)' + (d.lots.some(l => l.num) ? ' : ' + esc(lotsText(d)) : ''), `#/d/${d.id}/fiche`)}
      ${ok(vendMail, 'E-mail du vendeur pour l’envoi de la facture' + (vendMail ? ' : ' + esc(vendMail) : ''), `#/d/${d.id}/fiche`)}</ul>`
    : `<p class="small muted">Documents à joindre à votre mail :</p><ul class="mentions">
      ${ok(recu('appels_fonds'), 'Dernier appel de fonds', `#/d/${d.id}/pieces#p_appels_fonds`)}
      ${ok(recu('decomptes'), 'Derniers décomptes individuels des 2 derniers exercices', `#/d/${d.id}/pieces#p_decomptes`)}
      ${ok(recu('convocation'), 'Dernière convocation d’AG complète avec les annexes comptables', `#/d/${d.id}/pieces#p_convocation`)}
      ${ok(recu('pv_ag'), 'PV d’AG des 3 dernières années', `#/d/${d.id}/pieces#p_pv_ag`)}
      ${ok(d.lots.some(l => l.num), 'Lot(s) vendu(s)', `#/d/${d.id}/fiche`)}${ok(vendMail, 'E-mail du vendeur pour l’envoi de la facture', `#/d/${d.id}/fiche`)}</ul>`}
    <div class="grid4">${field('Option urgente (4 h ouvrées, +40 €)', 'ped.urgence', { check: true })}${field('Compromis envisagé le', 'dates.compromis', { type: 'date' })}${field('Précisions', 'ped.notes', { cls: 'span2' })}</div>
    <div class="row gap wrap modal-actions"><button class="btn primary" data-a="pedCA">📦 Demander le pré-état daté à ${COPRO_ASSISTANCE.nom}</button><a class="btn ghost" href="${COPRO_ASSISTANCE.urlPro}" target="_blank" rel="noopener">🌐 Commande en ligne</a></div></section>
  <section class="card"><h2>Suivi</h2><div class="grid4">${field('Réalisé par', 'ped.prestataire', { options: [['copro-assistance', COPRO_ASSISTANCE.nom], ['syndic', 'Syndic'], ['vendeur', 'Le vendeur lui-même']], r: true })}
    ${field('Commandé le', 'ped.commandeLe', { type: 'date', r: true })}${field('Reçu le', 'ped.recuLe', { type: 'date', r: true })}</div></section>
  <section class="card"><h2>Pièces utiles (${got}/${ps.length})</h2><div class="bar"><i style="width:${Math.round(got / ps.length * 100)}%"></i></div>
    <ul class="plist">${ps.map(p => { const s = (d.pieces[p.id] || {}).s || ''; const stt = PIECE_STATUTS.find(x => x.id === s); const n = filesFor(p.id).length;
      return `<li><span class="badge ${stt.cls}">${stt.short}</span> <a href="#/d/${d.id}/pieces#p_${p.id}">${esc(p.label)}</a> ${n ? `<small class="muted">${n} fichier(s)</small>` : ''}</li>`; }).join('')}</ul></section>`;
}
function pedMailCA(d) {
  const P = d.ped, mode = P.mode || 'extranet', V = tplVars(d), vendMail = (d.vendeurs.find(p => p.email) || {}).email || '[e-mail du vendeur]';
  const st = id => (d.pieces[id] || {}).s || '', mark = id => ['R', 'P', 'V'].includes(st(id)) ? '' : ' (à joindre)';
  const head = `Bonjour,\n\nJe souhaite commander un pré-état daté pour le compte de mon client vendeur, ${names(d.vendeurs) || '[nom du vendeur]'}.\n\nBien : ${V.adresse_complete}\nLot(s) vendu(s) : ${d.lots.filter(l => l.num).map(l => l.num + (l.nature ? ' (' + l.nature.toLowerCase() + ')' : '')).join(', ') || '[n° de lots]'}\n`;
  const body = mode === 'extranet'
    ? `${head}\nOption 1 — accès à l’extranet syndic, avec l’accord du vendeur :\n- Syndic : ${d.copro.syndicNom || '[nom du syndic]'}${d.copro.syndicEmail ? ' (' + d.copro.syndicEmail + ')' : ''}\n- Adresse de l’extranet : ${d.copro.extranet || '[adresse]'}\n- Identifiant : ${d.copro.extranetLogin || '[identifiant]'}\n- Mot de passe : ${d.copro.extranetPass || '[mot de passe]'}\n`
    : `${head}\nOption 2 — vous trouverez ci-joints les documents suivants :\n- Dernier appel de fonds${mark('appels_fonds')}\n- Derniers décomptes individuels des 2 derniers exercices${mark('decomptes')}\n- Dernière convocation d’AG complète avec les annexes comptables${mark('convocation')}\n- PV d’AG des 3 dernières années${mark('pv_ag')}\n${d.copro.syndicNom ? `\nSyndic : ${d.copro.syndicNom}\n` : ''}`;
  return { to: COPRO_ASSISTANCE.email, subject: `Demande de pré-état daté — ${d.bien.adresse || 'bien'} — lot(s) ${lotsText(d)}`,
    body: `${body}\nAdresse e-mail du vendeur pour l’envoi de la facture : ${vendMail}\n${d.dates.compromis ? `Compromis envisagé le ${fdate(d.dates.compromis)}.\n` : ''}${P.urgence ? 'Je souhaite l’option urgente (4 h ouvrées).\n' : ''}${P.notes ? '\nPrécisions : ' + P.notes + '\n' : ''}\nMerci de me confirmer la prise en charge.\n\n${signature()}` };
}

/* =========================================================================
   NOTAIRE — note de transmission & export ZIP
   ========================================================================= */
const NOTAIRE_CHECKS = [
  ['noms', 'Fichiers nommés avec date, nature et exercice (automatique à l’export ZIP)'], ['lisibles', 'Chaque PDF vérifié : lisible et complet'],
  ['projets', 'Documents définitifs distingués des projets'], ['liste', 'Liste des pièces transmises et manquantes (note de transmission)'],
  ['alertes', 'Alertes résumées sans les masquer ni les dramatiser'], ['diags', 'Dates de validité des diagnostics indiquées'],
  ['syndic', 'Coordonnées du syndic jointes'], ['occupation', 'Occupation du logement précisée'], ['ped', 'Contact chargé du pré-état daté indiqué'],
];
function tabNotaire(d) {
  return `<div class="grid-side"><div>
  <section class="card"><h2>Avant l’envoi</h2>${NOTAIRE_CHECKS.map(([id, l]) => field(l, 'notaireChecks.' + id, { check: true })).join('')}</section>
  <section class="card"><h2>Envoyer</h2><div class="row gap wrap">
    <button class="btn primary" data-a="notaireMail">✉️ Mail au notaire avec les pièces</button>
    <button class="btn" data-a="noteDo" data-how="print">🖨️ Note de transmission (PDF)</button>
    <button class="btn" data-a="noteDo" data-how="save">💾 Enregistrer la note dans les pièces</button>
    <button class="btn" data-a="exportZip">🗜️ Exporter tout le dossier (ZIP)</button></div>
    <p class="small muted">Le ZIP range les fichiers par catégorie et les renomme « date_nature_nom-d-origine », avec la note de transmission et un inventaire CSV : idéal pour un dépôt sur la plateforme de l’étude ou un lien de partage.</p></section></div>
  <aside class="card sticky"><h2>Aperçu de la note</h2><div class="preview">${noteBody(d)}</div></aside></div>`;
}
function noteBody(d) {
  const V = tplVars(d);
  const row = p => { const st = d.pieces[p.id] || {}, s = PIECE_STATUTS.find(x => x.id === (st.s || '')); const exp = diagExpiry(d, p);
    return `<tr><td>${esc(p.label)}</td><td>${s.label}</td><td>${esc(st.ex || '')}${exp ? ' — valide jusqu’au ' + fdate(exp) : ''}</td><td>${filesFor(p.id).length || ''}</td></tr>`; };
  return `${agentHeader()}<h1>NOTE DE TRANSMISSION</h1><p class="small">Dossier ${esc(d.ref)} — établie le ${fdate(today())}</p>
  <h2>Parties</h2><p><b>Vendeur(s) :</b> ${d.vendeurs.map(personLine).join('<br>') || '…'}</p><p><b>Acquéreur(s) :</b> ${d.acquereurs.map(personLine).join('<br>') || '…'}</p>
  <p><b>Notaire vendeur :</b> ${esc([d.notaireV.nom, d.notaireV.etude, d.notaireV.email].filter(Boolean).join(' — ') || '…')}<br><b>Notaire acquéreur :</b> ${esc([d.notaireA.nom, d.notaireA.etude, d.notaireA.email].filter(Boolean).join(' — ') || '…')}</p>
  <h2>Bien</h2><p>${esc(d.bien.type)} — ${esc(V.adresse_complete)}${d.bien.surface ? ' — ' + esc(d.bien.surface) + ' m² Carrez' : ''} — ${esc(V.occupation)}</p>${lotsTable(d)}
  <p><b>Copropriété :</b> ${esc(d.copro.nom || '…')}${d.copro.immat ? ' (immat. ' + esc(d.copro.immat) + ')' : ''}${d.copro.nbLots ? ' — ' + esc(d.copro.nbLots) + ' lots' : ''}<br>
  <b>Syndic :</b> ${esc([d.copro.syndicNom, d.copro.syndicContact, d.copro.syndicEmail, d.copro.syndicTel].filter(Boolean).join(' — ') || '…')}</p>
  <h2>Conditions</h2><p>Prix : ${esc(V.offre_prix)} — honoraires ${esc(V.honoraires_montant)} ${esc(V.honoraires_charge)}<br>Financement : ${esc(V.offre_financement)}<br>
  Compromis envisagé : ${esc(V.date_compromis)} — acte envisagé : ${esc(V.date_acte)}<br>Pré-état daté : ${esc(V.ped_contact)}${d.ped.commandeLe ? ' — commandé le ' + fdate(d.ped.commandeLe) : ''}${d.ped.recuLe ? ', reçu le ' + fdate(d.ped.recuLe) : ''}</p>
  <h2>Points d’attention</h2><p>${esc(V.signaux).replace(/\n/g, '<br>')}</p>
  ${PIECE_CATEGORIES.filter(c => c.id !== 'autres').map(c => { const ps = PIECES.filter(p => p.cat === c.id && (isApplicable(d, p) || (d.pieces[p.id] || {}).s)); return ps.length ? `<h2>${c.label}</h2><table><tr><th>Pièce</th><th>Statut</th><th>Exercice / validité</th><th>Fichiers</th></tr>${ps.map(row).join('')}</table>` : ''; }).join('')}`;
}
function loadScript(src) {
  return new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Chargement impossible (connexion internet requise) : ' + src)); document.head.append(s); });
}
async function exportZip(d) {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    const zip = new JSZip(), files = await Store.filesOf(d.id);
    const csv = [['Catégorie', 'Pièce', 'Statut', 'Exercice/note', 'Fichier']];
    const used = new Set();
    for (const f of files) {
      const p = pieceDef(f.pieceId) || pieceDef('divers'), cat = PIECE_CATEGORIES.find(c => c.id === p.cat);
      const date = new Date(f.addedAt).toISOString().slice(0, 10);
      const ext = (f.name.match(/\.[a-z0-9]{1,5}$/i) || [''])[0];
      let name = `${date}_${slug(p.label)}_${slug(f.name.replace(/\.[^.]+$/, ''))}${ext}`;
      while (used.has(cat.id + name)) name = name.replace(/(\.[^.]*)?$/, '_' + uid().slice(-3) + '$1');
      used.add(cat.id + name);
      zip.folder(`${PIECE_CATEGORIES.indexOf(cat) + 1}_${slug(cat.label)}`).file(name, f.blob);
      csv.push([cat.label, p.label, (PIECE_STATUTS.find(x => x.id === ((d.pieces[p.id] || {}).s || '')) || {}).label, (d.pieces[p.id] || {}).ex || '', name]);
    }
    zip.file('00_Note_de_transmission.html', docShell('Note de transmission', noteBody(d)));
    zip.file('00_Inventaire.csv', '﻿' + csv.map(r => r.map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n'));
    const blob = await zip.generateAsync({ type: 'blob' });
    download(`${d.ref}_${slug(dossierTitle(d))}.zip`, blob);
    log(d, `Export ZIP du dossier (${files.length} fichier(s))`);
  } catch (e) { toast(e.message, 'err'); }
}

/* ---------- Mentions d'annonce ---------- */
function annonceText(d) {
  const c = d.copro, b = d.bien, prix = num(d.mandat.prix), hon = num(d.mandat.honoraires);
  const lines = ['Bien soumis au statut de la copropriété.'];
  lines.push(c.nbLots ? `Copropriété de ${c.nbLots} lots.` : 'Copropriété de [nombre] lots.');
  lines.push(num(c.charges) ? `Montant moyen annuel de la quote-part de charges (budget prévisionnel) : ${eur(c.charges)}.` : 'Charges annuelles moyennes : [montant] €.');
  lines.push(c.procedure === 'oui' ? `Procédure en cours : ${c.procedureDetail || '[préciser]'}.` : c.procedure === 'non' ? 'Aucune procédure en cours.' : '[Procédure : à vérifier]');
  lines.push(b.dpe ? `DPE : classe énergie ${b.dpe}${b.ges ? ', classe climat ' + b.ges : ''}. Estimation des coûts annuels d’énergie : [fourchette] (année de référence [année]).` : 'DPE : [classe énergie / classe climat / estimation des coûts annuels].');
  if (prix) lines.push(d.mandat.charge === 'acquereur' && hon
    ? `Prix : ${eur(prix)} honoraires inclus à la charge de l’acquéreur, soit ${(hon / (prix - hon) * 100).toFixed(2).replace('.', ',')} % du prix hors honoraires (${eur(prix - hon)}).`
    : `Prix : ${eur(prix)} — honoraires à la charge du vendeur.`);
  return lines.join('\n');
}
