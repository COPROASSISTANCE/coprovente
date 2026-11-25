/* =========================================================================
   CoproVente — base de test fictive
   Remplit tous les modules avec des données inventées (noms, adresses,
   e-mails @exemple.fr, téléphones 06 00 …). Chaque élément porte demo: true
   et peut être supprimé d'un clic (Paramètres › Supprimer les données d'exemple).
   ========================================================================= */
function demoPhoto(hue, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,82%)"/><stop offset="1" stop-color="hsl(${hue},35%,62%)"/></linearGradient></defs>
  <rect width="1200" height="800" fill="url(#g)"/><rect x="300" y="180" width="600" height="520" fill="hsl(${hue},15%,92%)" stroke="hsl(${hue},20%,40%)" stroke-width="6"/>
  ${[0, 1, 2].map(r => [0, 1, 2, 3].map(c => `<rect x="${345 + c * 135}" y="${225 + r * 150}" width="90" height="100" fill="hsl(${hue + 180},30%,70%)" stroke="hsl(${hue},20%,40%)" stroke-width="4"/>`).join('')).join('')}
  <rect x="0" y="700" width="1200" height="100" fill="hsl(110,25%,55%)"/><text x="600" y="770" font-family="Arial" font-size="40" text-anchor="middle" fill="#fff">${label} — photo fictive</text></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}
async function demoFile(d, pieceId, name, blob) {
  const rec = { id: uid(), dossierId: d.id, pieceId, name, type: blob.type, size: blob.size, blob, addedAt: Date.now(), demo: true };
  await Store.putFile(rec);
}
const txtBlob = t => new Blob([t], { type: 'text/plain' });

async function demoAll() {
  if (App.crm.contacts.some(c => c.demo) && !confirmBox('Des données d’exemple sont déjà chargées. Les remplacer ?')) return;
  await demoClear(true);
  const D = n => addDays(today(), n), Mo = n => addMonths(today(), n), C = App.crm, all = [];
  const at = (n, h) => { const t = new Date(); t.setDate(t.getDate() + n); t.setHours(h, 0, 0, 0); return new Date(t - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  const ex = (n, canal, resume, resultat) => ({ id: uid(), date: D(n), canal, resume, resultat });
  const con = s => { const c = newContact({ demo: true, ...s }); C.contacts.push(c); return c; };
  const bien = (s, f) => { const d = newDossier({ demo: true, ...s }); f(d); App.dossiers.push(d); all.push(d); return d; };
  const lots = (...l) => l.map(([num, nature, tantiemes]) => ({ num, nature, tantiemes, obs: '' }));

  /* ---------- Profil (seulement s'il est vide) ---------- */
  if (!App.settings.agent.nom) {
    Object.assign(App.settings.agent, { civ: 'Mme', prenom: 'Camille', nom: 'Exemple', statut: 'Agent commercial indépendant (mandataire)', reseau: 'Réseau Immo Exemple', siren: '000 000 000', rsac: 'Lyon 000 000 000', carte: 'CPI 6901 2026 000 000 000', tel: '06 00 00 00 00', email: 'camille.exemple@exemple.fr', adresse: '1 place Exemple, 69002 Lyon', objectif: 90000, tva: 'TVA non applicable, art. 293 B du CGI', iban: 'FR76 0000 0000 0000 0000 0000 000', factureNext: 4 });
    App.settings.demoProfil = true; saveSettings();
  }

  /* ---------- Prospects vendeurs ---------- */
  const P = [
    ['M.', 'Paul', 'Blanc', '18 rue de Créqui', 'Lyon 6e', 'a_contacter', 'Pige / boîtage', 'froid', 0, 'appeler', [], 'Succession, réflexion en cours', 320000],
    ['Mme', 'Sophie', 'Girard', '4 rue Boileau', 'Lyon 6e', 'a_contacter', 'Panneau', '', -2, 'appeler', [], '', ''],
    ['M.', 'Yann', 'Roche', '27 rue Duquesne', 'Lyon 6e', 'a_contacter', 'Réseaux sociaux', '', 3, 'sms', [], '', ''],
    ['Mme', 'Lucie', 'Henry', '7 rue Vauban', 'Lyon 6e', 'contact', 'Recommandation', 'tiede', -1, 'appeler', [ex(-12, 'appel', 'Premier contact, projet de vente au printemps', 'Joint')], 'Achat d’une maison', 410000],
    ['M.', 'Hugo', 'Morel', '9 rue Juliette Récamier', 'Lyon 6e', 'contact', 'Ancien client', 'tiede', 0, 'document', [ex(-5, 'appel', 'Souhaite un point sur les prix du quartier', 'Joint')], 'Agrandissement', 280000],
    ['Mme', 'Nadia', 'Benali', '12 cours Lafayette', 'Lyon 3e', 'contact', 'Portail / site', 'froid', 6, 'email', [ex(-8, 'email', 'Demande d’informations sur les honoraires', 'Intéressé')], '', ''],
    ['M. et Mme', '', 'Rousseau', '33 rue Garibaldi', 'Lyon 3e', 'projet', 'Recommandation', 'chaud', 0, 'estimation', [ex(-20, 'rdv', 'Rencontre au salon de l’immobilier', 'Intéressé'), ex(-3, 'appel', 'Veulent vendre avant la rentrée', 'Joint')], 'Mutation professionnelle', 365000],
    ['M.', 'Antoine', 'Lefèvre', '5 rue Tronchet', 'Lyon 6e', 'projet', 'Appel entrant', 'tiede', 10, 'appeler', [ex(-15, 'appel', 'Attend l’accord de son ex-conjoint', 'Joint')], 'Séparation', 250000],
    ['Mme', 'Claire', 'Dumont', '44 rue de Sèze', 'Lyon 6e', 'rdv', 'Recommandation', 'chaud', 2, 'rdv', [ex(-4, 'appel', 'RDV fixé pour découvrir l’appartement', 'Rendez-vous fixé')], 'Départ en retraite', 450000],
    ['M.', 'Julien', 'Marchand', '2 quai de Serbie', 'Lyon 6e', 'rdv', 'Réseau pro', 'chaud', 1, 'rdv', [ex(-2, 'appel', 'RDV estimation confirmé', 'Rendez-vous fixé')], 'Investissement ailleurs', 520000],
    ['Mme', 'Anne', 'Fontaine', '26 rue Bugeaud', 'Lyon 6e', 'sans_suite', 'Réseaux sociaux', 'froid', null, 'appeler', [ex(-30, 'appel', 'Ne vend finalement pas', 'Pas vendeur pour l’instant')], '', ''],
  ];
  P.forEach(([civ, prenom, nom, adr, ville, st, o, mat, n, act, echs, motif, prix], i) => con({ civ, prenom, nom, tel: `06 00 00 01 ${String(10 + i)}`, email: `${normalize(nom).replace(/\s/g, '')}@exemple.fr`, origine: o, secteur: ville,
    vend: { ...newContact().vend, statut: st, bienAdresse: adr, bienVille: 'Lyon', maturite: mat, motif, prixSouhaite: prix, echeance: st === 'projet' ? 'D’ici 6 mois' : '' },
    next: { date: n == null ? '' : D(n), action: act, note: '' }, echanges: echs, notes: 'Contact fictif' }));
  con({ civ: 'M.', prenom: 'Bernard', nom: 'Poulain', tel: '06 00 00 01 99', origine: 'Pige / boîtage', opposition: true, vend: { ...newContact().vend, statut: 'sans_suite', bienAdresse: '8 rue Vendôme' }, next: { date: '', action: 'appeler', note: '' }, notes: 'Opposé à la prospection (fictif)' });

  /* ---------- Acquéreurs ---------- */
  const A = [['M.', 'Karim', 'Caron', 290000, 60000, 'accord', 'Lyon 3e, 6e', 'T3 avec balcon, ascenseur', 'actif', 0], ['Mme', 'Julie', 'Lucas', 340000, 90000, 'simulation', 'Lyon 6e', 'T3/T4 traversant, parking', 'actif', 2],
    ['M.', 'Marc', 'Mercier', 260000, 260000, 'comptant', 'Lyon 3e, 7e', 'T2/T3, investissement locatif', 'actif', -1], ['Mme', 'Inès', 'Robin', 420000, 120000, 'offre_pret', 'Lyon 6e', 'T4 familial, proche écoles', 'offre', 5],
    ['M.', 'Thomas', 'Gauthier', 230000, 40000, 'accord', 'Lyon 3e', 'T2 lumineux', 'achete', null], ['Mme', 'Emma', 'Perrot', 310000, 50000, 'non_etudie', 'Villeurbanne, Lyon 3e', 'T3 calme', 'pause', 20]];
  const acq = A.map(([civ, prenom, nom, budget, apport, fin, sect, crit, st, n], i) => con({ civ, prenom, nom, tel: `06 00 00 02 ${String(10 + i)}`, email: `${normalize(nom)}@exemple.fr`, origine: ORIGINES[(i + 3) % ORIGINES.length],
    roles: { vendeur: false, acquereur: true }, acq: { statut: st, budget, apport, secteurs: sect, criteres: crit, calendrier: 'Dans les 6 mois', financement: fin }, next: { date: n == null ? '' : D(n), action: 'appeler', note: n === 0 ? 'Suite visite' : '' },
    echanges: [ex(-10 - i, 'appel', 'Découverte du projet d’achat', 'Joint')] }));

  /* ---------- Propriétaires clients ---------- */
  const owner = (civ, prenom, nom, i, o) => con({ civ, prenom, nom, tel: `06 00 00 03 ${String(10 + i)}`, email: `${normalize(nom)}@exemple.fr`, origine: o, adresse: '', vend: { ...newContact().vend, statut: 'client' }, next: { date: '', action: 'bilan', note: '' } });
  const oMartin = owner('Mme', 'Claire', 'Martin', 1, 'Recommandation'), oMoreau = owner('M.', 'Pierre', 'Moreau', 2, 'Portail / site'), oBernard = owner('Mme', 'Lise', 'Bernard', 3, 'Ancien client');
  const oFournier = owner('Mme', 'Agnès', 'Fournier', 4, 'Panneau'), oPerrin = owner('Mme', 'Claire', 'Perrin', 5, 'Recommandation'), oLeroy = owner('M.', 'Louis', 'Leroy', 6, 'Pige / boîtage');
  const oDurand = owner('M.', 'Alain', 'Durand', 7, 'Réseau pro'), oGirod = owner('Mme', 'Odile', 'Girod', 8, 'Appel entrant'), oVasseur = owner('M.', 'Rémi', 'Vasseur', 9, 'Recommandation');
  const oPetit = owner('M.', 'Hervé', 'Petit', 10, 'Pige / boîtage'), oRoux = owner('Mme', 'Lina', 'Roux', 11, 'Recommandation'), oGarnier = owner('M.', 'Noël', 'Garnier', 12, 'Portail / site');
  oMartin.adresse = '12 rue des Lilas, 69003 Lyon'; oMartin.next = { date: D(1), action: 'bilan', note: 'Point mensuel' };
  oMoreau.next = { date: D(-3), action: 'bilan', note: 'Bilan de commercialisation en retard' };

  const copro = (o) => Object.assign({ nom: 'Copropriété (exemple)', immat: 'AA0-000-000', nbLots: 60, syndicNom: 'Cabinet Exemple Gestion', syndicContact: 'Mme Gestionnaire', syndicEmail: 'gestion@syndic-exemple.fr', syndicTel: '04 00 00 00 00', syndicType: 'professionnel', extranet: 'https://extranet.syndic-exemple.fr', extranetLogin: '', extranetPass: '', charges: 1800, fondsTravaux: 350, procedure: 'non', procedureDetail: '', ex1Debut: '2025-01-01', ex1Fin: '2025-12-31', ex2Debut: '2024-01-01', ex2Fin: '2024-12-31' }, o);

  /* ---------- 1. Estimation : rendez-vous à faire ---------- */
  const b1 = bien({ phase: 'estimation', ref: 'EX-01' }, d => { d.vendeurs = [personFromContact(oLeroy)]; Object.assign(d.bien, { adresse: '15 rue Sully', cp: '69006', ville: 'Lyon', type: 'Appartement', surface: 48, pieces: 2, etage: '2' }); d.copro = copro({ nbLots: 24 }); d.vente.origine = oLeroy.origine; });
  C.estimations.push(newEstimation({ demo: true, contactId: oLeroy.id, dossierId: b1.id, dateDemande: D(-3), dateVisite: D(2), restitPrevue: D(9) }));
  /* ---------- 2. Estimation : rapport à restituer ---------- */
  const b2 = bien({ phase: 'estimation', ref: 'EX-02' }, d => { d.vendeurs = [personFromContact(oPerrin)]; Object.assign(d.bien, { adresse: '11 rue Tête d’Or', cp: '69006', ville: 'Lyon', type: 'Appartement', surface: 72, pieces: 3, etage: '4', annee: 1965, dpe: 'D', ges: 'C', description: 'T3 traversant à deux pas du parc, double séjour et deux chambres.' }); d.lots = lots(['17', 'Appartement', '210/10000'], ['54', 'Cave', '6/10000']); d.copro = copro({ nbLots: 40, charges: 1900 }); });
  C.estimations.push(newEstimation({ demo: true, contactId: oPerrin.id, dossierId: b2.id, dateDemande: D(-14), dateVisite: D(-6), visiteFaite: true, restitPrevue: D(1), prixBas: 330000, prixHaut: 355000, prixReco: 345000, prixAttendu: 370000,
    rendu: { contexte: 'Mme Perrin souhaite vendre pour rejoindre sa famille en Bretagne d’ici l’automne.', pointsForts: 'Traversant\nÀ deux pas du parc de la Tête d’Or\nCave\nImmeuble bien entretenu', pointsAttention: 'Pas d’ascenseur (4e étage)\nCuisine à moderniser', environnement: 'Quartier résidentiel recherché, commerces et écoles à pied, métro Masséna à 6 minutes.', etat: 'Bon état', analyse: 'Les ventes récentes du secteur s’établissent entre 4 600 et 5 000 €/m² pour des biens comparables. L’absence d’ascenseur et la cuisine à reprendre justifient un positionnement dans la moyenne de la fourchette.', strategie: 'Mise en vente à 345 000 € avec photos professionnelles et diffusion sur les principaux portails ; bilan après 3 semaines.', delai: '2 à 3 mois', honoraires: '4,5 % TTC à la charge du vendeur',
      comparables: [{ adresse: 'Rue Tête d’Or (secteur)', surface: 70, prix: 340000, statut: 'Vendu' }, { adresse: 'Rue Vendôme', surface: 75, prix: 362000, statut: 'Vendu' }, { adresse: 'Boulevard des Belges', surface: 68, prix: 349000, statut: 'En vente' }] } }));
  /* ---------- 3. Estimation : restituée sans décision ---------- */
  const b3 = bien({ phase: 'estimation', ref: 'EX-03' }, d => { const r = C.contacts.find(c => c.nom === 'Rousseau'); d.vendeurs = [personFromContact(r)]; r.vend.statut = 'client'; Object.assign(d.bien, { adresse: '33 rue Garibaldi', cp: '69003', ville: 'Lyon', type: 'Appartement', surface: 81, pieces: 4, etage: '5' }); d.copro = copro({ nbLots: 90 }); d.estimRef = r.id; });
  C.estimations.push(newEstimation({ demo: true, contactId: b3.estimRef, dossierId: b3.id, dateDemande: D(-25), dateVisite: D(-20), visiteFaite: true, restitPrevue: D(-12), restitRealisee: D(-12), relance: D(0), prixBas: 350000, prixHaut: 372000, prixReco: 365000, prixAttendu: 390000, retour: 'hesite', notes: 'Hésitent sur le prix, comparent avec une autre agence.' }));
  /* Estimations clôturées */
  const lost = con({ civ: 'M.', prenom: 'Gilles', nom: 'Dupont', tel: '06 00 00 04 10', origine: 'Portail / site', vend: { ...newContact().vend, statut: 'sans_suite', bienAdresse: '30 rue Pierre Corneille' }, next: { date: '', action: 'appeler', note: '' } });
  C.estimations.push(newEstimation({ demo: true, contactId: lost.id, dateDemande: D(-60), dateVisite: D(-55), visiteFaite: true, restitRealisee: D(-48), prixBas: 380000, prixHaut: 405000, prixReco: 395000, prixAttendu: 440000, retour: 'desaccord', issue: 'concurrent', motifPerte: 'Prix (concurrent plus haut)' }));

  /* ---------- 4. Mandat à signer ---------- */
  bien({ phase: 'mandat', ref: 'EX-04' }, d => { d.vendeurs = [personFromContact(oBernard)]; Object.assign(d.bien, { adresse: '2 rue Bossuet', cp: '69006', ville: 'Lyon', type: 'Studio', surface: 24, pieces: 1, etage: '1', annee: 1930, dpe: 'E', ges: 'D' });
    d.lots = lots(['8', 'Studio', '95/10000']); d.copro = copro({ nbLots: 18, charges: 950 }); Object.assign(d.mandat, { type: 'exclusif', statut: 'a_signer', prix: 175000, honoraires: 8000, date: D(0), duree: 3 });
    Object.assign(d.pieces, { titre: { s: 'R', dr: D(-2) }, dpe: { s: 'R', doc: '2025-06-12' }, rcp: { s: 'D', dd: D(-2), qui: 'Vendeur' } }); });

  /* ---------- 5. Bien en commercialisation, dossier copropriété complet ---------- */
  const b5 = bien({ phase: 'commercialisation', ref: 'EX-05' }, d => {
    d.vendeurs = [personFromContact(oMartin)];
    Object.assign(d.bien, { adresse: '12 rue des Lilas', cp: '69003', ville: 'Lyon', type: 'Appartement', etage: '3', pieces: 3, surface: 64.2, annee: 1972, occupation: 'libre', chauffage: 'collectif', dpe: 'D', ges: 'D', description: 'T3 traversant avec balcon, séjour lumineux, deux chambres, cave et parking.' });
    d.lots = lots(['24', 'Appartement', '118/10000'], ['81', 'Cave', '3/10000'], ['122', 'Parking', '4/10000']);
    d.copro = copro({ nom: 'Résidence Les Jardins (exemple)', nbLots: 148, charges: 2240, fondsTravaux: 590, extranetLogin: 'claire.martin@exemple.fr', extranetPass: 'Provisoire-2026',
      equip: { cloture: 'oui', parkingsExt: 40, eclairageExt: 'oui', portail: 'oui', porteGarage: 'non', nbGarages: 0, espacesVerts: 'oui', interphone: 'oui', digicode: 'oui', vigik: 'oui', gardien: 'oui', antenne: 'oui', antenneType: 'Hertzienne (TNT)', fibre: 'oui', vmc: 'oui', detectionIncendie: 'ind', colonneSeche: 'oui', videOrdures: 'non', eauFroideColl: 'oui', eauChaudeColl: 'non', cptEauFroide: 'oui', releveDistance: 'oui', repartiteurs: 'oui' } });
    Object.assign(d.mandat, { numero: '2026-114', type: 'exclusif', statut: 'actif', date: D(-60), dateEffet: D(-60), duree: 3, prix: 289000, honoraires: 14000, charge: 'vendeur', repartition: '70 % mandataire / 30 % réseau',
      echeances: [{ label: 'Fin de l’exclusivité', date: D(30) }], historique: [{ date: D(-60), txt: 'Mandat exclusif signé à 289 000 €' }, { date: D(-15), txt: 'Prix modifié : 279 000 € (ajustement après bilan)' }] });
    Object.assign(d.com, { prixLancement: 289000, prixActuel: 279000, dateEntree: D(-55), datePublication: D(-54), demandes: 14, offres: 1, dernierEchangeVendeur: D(-4), dernierBilan: D(-10), prochainBilan: D(5),
      historiquePrix: [{ date: D(-55), prix: 289000, motif: 'Prix de lancement' }, { date: D(-15), prix: 279000, motif: 'Ajustement après bilan' }],
      supports: [{ nom: 'Site du réseau', url: 'https://www.exemple.fr/annonce/2026-114' }, { nom: 'Leboncoin', url: 'https://www.exemple.fr/lbc/2026-114' }, { nom: 'SeLoger', url: 'https://www.exemple.fr/seloger/2026-114' }],
      actions: [{ id: uid(), txt: 'Compléter les photos', done: true, date: D(-50) }, { id: uid(), txt: 'Revoir l’annonce', done: true, date: D(-15) }, { id: uid(), txt: 'Organiser une visite groupée', done: false, date: D(-2) }],
      annonce: { titre: 'Appartement 3 pièces de 64,2 m² — Lyon 3e', texte: 'Coup de cœur ! Idéalement situé, découvrez cet appartement de 3 pièces offrant 64,2 m² Carrez, situé au 3e étage d’une résidence arborée. Traversant et lumineux, il se compose d’un séjour ouvrant sur balcon, d’une cuisine indépendante, de deux chambres et d’une salle d’eau. Vendu avec cave et parking. Un cadre de vie chaleureux à visiter sans tarder.', atouts: ['Traversant', 'Balcon / terrasse', 'Cave', 'Parking', 'Copropriété bien entretenue'], ton: 'commercial', etat: 'Bon état' } });
    const R = (s, o = {}) => Object.assign({ s, dr: D(-40) }, o);
    Object.assign(d.pieces, { titre: R('R'), etat_civil: R('R'), mandat: R('R'), taxe_fonciere: R('R', { ex: '2025' }), photos: R('R'), dpe: R('R', { doc: '2025-03-10' }), amiante: R('R', { doc: '2019-06-01' }), elec: R('R', { doc: '2024-02-01' }), gaz: R('SO'), termites: R('SO'), erp: R('R', { doc: D(-170) }), carrez: R('R'),
      rcp: R('R'), modificatifs: R('R', { ex: '2 modificatifs (2001, 2014)' }), fiche_synth: R('R', { ex: '2026' }), carnet_entretien: R('R'), pv_ag: R('R', { ex: 'AG 2023, 2024, 2025 et AGE 2025' }), convocation: R('R', { ex: 'AG du 12/05/2025' }), contrat_syndic: R('R'),
      appels_fonds: R('V', { ex: 'T1 à T4 2026' }), decomptes: R('P', { ex: 'Exercice 2025 reçu, 2024 manquant', qui: 'Syndic' }), dtg: R('NR'), ppt: R('R', { ex: 'PPPT 2025' }), dpe_collectif: R('NR'), ped: { s: '' } });
    d.signaux = { trav_non_appeles: { etat: 'oui', source: 'PV AG du 12/05/2025, résolution 14', date: '2025-05-12', montant: 3150, question: 'Échéancier des appels du ravalement en 2027 ?', vendeur: true }, hausse_charges: { etat: 'non' }, procedure: { etat: 'non' }, impayes: { etat: '?', source: 'Annexe 1', question: 'Détail des créances copropriétaires' } };
    d.appels = [{ periode: '4e trimestre 2026', exig: '2026-10-01', ref: 'AF-2026-04', piece: 'Appel de fonds', solde: 40.5, sens: 'credit', conclusion: 'compris', lignes: [
      { nature: 'Provisions générales', cat: 'courant', global: 12000, tant: 125, cle: 10000 }, { nature: 'Provisions ascenseur', cat: 'courant', global: 3600, tant: 210, cle: 8000 },
      { nature: 'Toiture : appel 2/3', cat: 'travaux', global: 30000, tant: 125, cle: 10000 }, { nature: 'Fonds de travaux', cat: 'fonds', global: 2400, tant: 125, cle: 10000 }] }];
    d.annexes = { exercice: 'Résidence Les Jardins — exercice 2025 — comptes approuvés', approuve: 'oui', budget: 98000, a2c: 102680, a3: '56350; 12080; 34250', a2t: 68500, a4: '46000; 14500; 8000', a1c12: 9000, a5: '6000; 3000', actif: 91500, passif: 91500, creances: 15860, fournisseurs: 18200 };
    d.pvAnalyses = [{ id: uid(), fichier: 'PV_AG_2025-05-12.pdf', date: '2025-05-12', type: 'Ordinaire', comptes: 'approuvés', vigilance: 'moyen', at: Date.now(),
      synthese: 'Assemblée annuelle : approbation des comptes 2024, vote du ravalement des façades et renouvellement du contrat de syndic pour 3 ans. Le remplacement de l’ascenseur a été discuté sans être voté.',
      points: ['Ravalement voté : appels en 2026 et 2027, à la charge du copropriétaire à la date d’exigibilité', 'Remplacement de l’ascenseur évoqué : vote probable lors d’une prochaine AG', 'Comptes 2024 approuvés'],
      travaux: [{ objet: 'Ravalement des façades', montant: 270000, echeancier: '3 appels : 01/2026, 07/2026, 01/2027' }], envisages: ['Remplacement de l’ascenseur (devis en cours)'], procedures: [] },
      { id: uid(), fichier: 'PV_AG_2024-05-14.pdf', date: '2024-05-14', type: 'Ordinaire', comptes: 'approuvés', vigilance: 'faible', at: Date.now(),
      synthese: 'Assemblée sans difficulté : approbation des comptes 2023, budget 2025 voté, réfection de la toiture votée en 2023 en cours de réalisation.', points: ['Toiture : derniers appels en 2026'], travaux: [], envisages: ['Audit énergétique'], procedures: [] }];
    d.ped = { ...d.ped, prestataire: 'copro-assistance', mode: 'extranet' };
    d.mails.vendeur.messages.push({ id: uid(), source: 'brouillon', from: 'Moi', to: 'martin@exemple.fr', subject: 'Point sur la commercialisation — 12 rue des Lilas', body: 'Bonjour Madame Martin,\n\nVoici le point de la semaine… (exemple)', date: Date.now() - 10 * 864e5, snippet: 'Voici le point de la semaine…' });
    d.mails.syndic.messages.push({ id: uid(), source: 'manuel', from: 'gestion@syndic-exemple.fr', subject: 'RE: Vente lots 24/81/122 — documents', body: 'Bonjour,\nLes PV demandés sont en ligne sur l’extranet. Le décompte 2024 suivra cette semaine.\nCordialement', date: Date.now() - 5 * 864e5, snippet: 'Les PV demandés sont en ligne…' });
  });
  /* ---------- 6. Bien en commercialisation sans activité ---------- */
  const b6 = bien({ phase: 'commercialisation', ref: 'EX-06' }, d => { d.vendeurs = [personFromContact(oMoreau)]; Object.assign(d.bien, { adresse: '5 avenue Foch', cp: '69006', ville: 'Lyon', type: 'Appartement', surface: 95, pieces: 4, etage: '6', annee: 1910, dpe: 'C', ges: 'C' });
    d.lots = lots(['41', 'Appartement', '260/10000'], ['102', 'Cave', '5/10000']); d.copro = copro({ nbLots: 32, charges: 3100 });
    Object.assign(d.mandat, { numero: '2026-087', type: 'semi', statut: 'actif', date: D(-85), duree: 3, prix: 398000, honoraires: 16000 });
    Object.assign(d.com, { prixLancement: 398000, dateEntree: D(-80), dernierBilan: D(-40), demandes: 3, supports: [{ nom: 'Site du réseau', url: 'https://www.exemple.fr/annonce/2026-087' }], historiquePrix: [{ date: D(-80), prix: 398000, motif: 'Prix de lancement' }] }); });
  /* ---------- 7. Offre acceptée, compromis à venir ---------- */
  const b7 = bien({ phase: 'offre', ref: 'EX-07' }, d => { d.vendeurs = [personFromContact(oDurand)]; d.acquereurs = [personFromContact(acq[3])]; Object.assign(d.bien, { adresse: '12 rue Duguesclin', cp: '69006', ville: 'Lyon', type: 'Appartement', surface: 88, pieces: 4, etage: '2', dpe: 'C', ges: 'B' });
    d.lots = lots(['6', 'Appartement', '180/10000']); d.copro = copro({ nbLots: 22, charges: 2600 }); Object.assign(d.mandat, { numero: '2026-061', type: 'exclusif', statut: 'actif', date: D(-70), duree: 3, prix: 425000, honoraires: 17500 });
    Object.assign(d.com, { prixLancement: 425000, dateEntree: D(-65), dernierBilan: D(-6), demandes: 9, offres: 2 }); Object.assign(d.offre, { prix: 412000, financement: 'mixte', apport: 120000, pret: 292000, duree: 25, taux: 3.6, lieu: 'Lyon' });
    Object.assign(d.vente, { offreMontant: 412000, offreDate: D(-9), offreAcceptee: D(-7), origine: 'Ancien client' }); d.dates.compromis = D(6);
    d.tasks['offre.acceptee'] = { done: true, date: D(-7) }; Object.assign(d.pieces, { acq_offre: { s: 'R', dr: D(-9) }, offre_acceptee: { s: 'R', dr: D(-7) }, ped: { s: 'D', dd: D(-5), qui: 'Copro-Assistance' }, decomptes: { s: 'D', dd: D(-6), qui: 'Vendeur' } });
    d.ped = { ...d.ped, prestataire: 'copro-assistance', commandeLe: D(-5) }; d.notaireV = { nom: 'Maître Exemple', etude: 'Office notarial Exemple', email: 'office@notaire-exemple.fr', tel: '04 00 00 00 10', adresse: '' }; });
  /* ---------- 8. Compromis signé, financement en retard ---------- */
  bien({ phase: 'compromis', ref: 'EX-08' }, d => { d.vendeurs = [personFromContact(oFournier)]; d.acquereurs = [personFromContact(acq[4])]; Object.assign(d.bien, { adresse: '40 rue Ney', cp: '69006', ville: 'Lyon', type: 'Appartement', surface: 52, pieces: 2, etage: '3' });
    d.lots = lots(['33', 'Appartement', '120/10000']); d.copro = copro({ nbLots: 45 }); Object.assign(d.mandat, { numero: '2026-040', type: 'simple', statut: 'actif', date: D(-110), duree: 3, prix: 238000, honoraires: 10500 });
    Object.assign(d.vente, { offreMontant: 228000, offreDate: D(-45), offreAcceptee: D(-42), compromisRealise: D(-30), origine: 'Portail / site', blocage: 'Offre de prêt toujours attendue : relancer le courtier' });
    Object.assign(d.dates, { compromis: D(-30), notification: D(-29), finRetractation: finRetractation(D(-29)), pret: D(-2), acte: D(45) }); Object.assign(d.pieces, { compromis: { s: 'R', dr: D(-30) }, notif_sru: { s: 'R', dr: D(-29) }, etat_date: { s: 'D', dd: D(-12), qui: 'Syndic' }, accord_pret: { s: 'D', dd: D(-20), qui: 'Acquéreur' } }); });
  /* ---------- 9-11. Ventes réalisées ---------- */
  [[oVasseur, '8 rue Paul Bert', 245000, 11500, -1, true, 'Recommandation', 'Appartement', 55], [oPetit, '21 cours Vitton', 312000, 14800, -3, true, 'Pige / boîtage', 'Appartement', 70], [oRoux, '3 place Sathonay', 189000, 9500, -6, false, 'Recommandation', 'Studio', 31], [oGarnier, '14 quai Saint-Vincent', 410000, 18000, -9, true, 'Portail / site', 'Appartement', 96]].forEach(([o, adr, prix, hon, m, enc, orig, type, s], i) =>
    bien({ phase: 'acte', ref: 'EX-1' + i }, d => { const acte = Mo(m); d.vendeurs = [personFromContact(o)]; Object.assign(d.bien, { adresse: adr, ville: 'Lyon', type, surface: s }); d.copro = copro({});
      Object.assign(d.mandat, { numero: '2025-0' + (20 + i), prix, honoraires: hon, date: addMonths(acte, -4), statut: 'termine' }); Object.assign(d.vente, { offreMontant: prix, offreAcceptee: addMonths(acte, -3), compromisRealise: addDays(addMonths(acte, -3), 10), pretRealise: addMonths(acte, -1), acteRealise: acte, honoFacture: hon, honoFactureDate: acte, honoEncaisse: enc ? hon : '', honoEncaisseDate: enc ? addDays(acte, 7) : '', origine: orig, merci: true, avis: i % 2 === 0, nouvelles: i === 0 ? D(20) : '' });
      d.dates.acte = acte; d.dates.compromis = d.vente.compromisRealise; d.pieces.facture_honoraires = { s: 'R', dr: acte, ex: 'N° 2026-00' + (i + 1) }; }));

  /* ---------- Visites ---------- */
  const V = (dossier, q, n, h, s) => { const v = newVisite({ demo: true, dossierId: dossier.id, acquereurId: q.id, quand: at(n, h), ...s }); C.visites.push(v); return v; };
  V(b5, acq[0], -40, 11, { statut: 'realisee', interet: '3', aime: ['Luminosité', 'Emplacement'], objections: ['Prix'], prix: 'cher', suite: 'reflexion', commentaire: 'Aime beaucoup, trouve le prix un peu élevé.', crFait: true });
  V(b5, acq[1], -33, 17, { statut: 'realisee', interet: '2', aime: ['Agencement', 'Cave / parking'], objections: ['Travaux de copropriété'], prix: 'correct', suite: 'documents', commentaire: 'Inquiète du ravalement voté.', crFait: true });
  V(b5, acq[2], -18, 10, { statut: 'realisee', interet: '3', aime: ['Calme', 'Extérieur', 'Copropriété bien tenue'], objections: ['Étage / ascenseur'], prix: 'correct', suite: '2e', commentaire: 'Souhaite revenir avec son associé.', crFait: true });
  V(b5, acq[2], -6, 18, { statut: 'realisee', interet: '3', aime: ['Luminosité'], objections: [], prix: 'attractif', suite: 'offre', commentaire: 'Seconde visite : une offre est annoncée.', crFait: true });
  V(b5, acq[5], -2, 12, { statut: 'realisee' });
  V(b5, acq[0], 0, 18, { statut: 'confirmee', consignes: 'Code 1234B, 3e gauche' });
  V(b5, acq[1], 2, 11, { statut: 'prevue' });
  V(b6, acq[1], -38, 10, { statut: 'realisee', interet: '1', objections: ['Prix', 'Charges de copropriété'], prix: 'cher', suite: 'non', crFait: true });
  V(b6, acq[3], -31, 15, { statut: 'annulee' });
  V(b7, acq[3], -20, 10, { statut: 'realisee', interet: '3', aime: ['Emplacement', 'Agencement'], prix: 'correct', suite: '2e', crFait: true });
  V(b7, acq[3], -12, 18, { statut: 'realisee', interet: '3', aime: ['Prestations'], prix: 'correct', suite: 'offre', crFait: true });
  V(b7, acq[0], -15, 11, { statut: 'absence' });
  C.visites.filter(v => v.demo && v.crFait).forEach(v => { const t = crTemplate(v); v.crVendeur = t.vend; v.crVisiteur = t.visit; });

  /* ---------- Journal, photos et fichiers ---------- */
  all.forEach(d => d.journal.unshift({ t: Date.now(), txt: 'Dossier d’exemple (données fictives)', type: 'auto' }));
  for (const [d, label, hues] of [[b5, '12 rue des Lilas', [200, 30, 140]], [b2, '11 rue Tête d’Or', [260, 50]], [b7, '12 rue Duguesclin', [10]]])
    for (let i = 0; i < hues.length; i++) await demoFile(d, 'photos', `photo_${i + 1}.svg`, demoPhoto(hues[i], label));
  await demoFile(b5, 'pv_ag', 'PV_AG_2025-05-12 (exemple).txt', txtBlob('Procès-verbal fictif — document d’exemple.'));
  await demoFile(b5, 'appels_fonds', 'Appel_de_fonds_T4_2026 (exemple).txt', txtBlob('Appel de fonds fictif — document d’exemple.'));
  await demoFile(b5, 'mandat', 'Mandat_2026-114 (exemple).txt', txtBlob('Mandat fictif — document d’exemple.'));

  App.dossiers.forEach(d => saveDossier(d, true)); saveCrm(true);
  location.hash = '#/'; rerender(); toast('Base de test chargée : données entièrement fictives.');
}

async function demoClear(silent) {
  const ids = new Set(App.dossiers.filter(d => d.demo).map(d => d.id));
  if (!silent && !ids.size && !App.crm.contacts.some(c => c.demo)) return toast('Aucune donnée d’exemple à supprimer.');
  if (!silent && !confirmBox('Supprimer toutes les données d’exemple (contacts, biens, estimations, visites et fichiers fictifs) ? Vos propres données sont conservées.')) return;
  for (const f of await Store.allFiles()) if (f.demo || ids.has(f.dossierId)) await Store.delFile(f.id);
  for (const id of ids) await Store.delDossier(id);
  App.dossiers = App.dossiers.filter(d => !d.demo);
  // ancienne version de l'exemple (sans marqueur)
  for (const d of App.dossiers.filter(d => (d.copro.nom || '').includes('exemple') || /^V-EX-/.test(d.ref || ''))) { await Store.delDossier(d.id); for (const f of await Store.filesOf(d.id)) await Store.delFile(f.id); }
  App.dossiers = App.dossiers.filter(d => !((d.copro.nom || '').includes('exemple') || /^V-EX-/.test(d.ref || '')));
  App.crm.contacts = App.crm.contacts.filter(c => !c.demo && !/exemple\.fr$/.test(c.email || ''));
  App.crm.estimations = App.crm.estimations.filter(e => !e.demo && (!e.contactId || App.crm.contacts.some(c => c.id === e.contactId)));
  App.crm.visites = App.crm.visites.filter(v => !v.demo && App.dossiers.some(d => d.id === v.dossierId));
  if (App.settings.demoProfil) { App.settings.agent = structuredClone(DEFAULT_SETTINGS.agent); delete App.settings.demoProfil; saveSettings(); }
  saveCrm(true); App.current = null;
  if (!silent) { location.hash = '#/'; rerender(); toast('Données d’exemple supprimées.'); }
}
Object.assign(ACT, { demoAll, demo: demoAll, demoClear() { demoClear(false); } });
