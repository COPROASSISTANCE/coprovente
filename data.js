/* =========================================================================
   CoproVente — référentiel métier
   Étapes de vente, pièces, questionnaire vendeur, signaux, modèles de mails,
   contenus des guides. Tout est modifiable ici sans toucher au reste du code.
   ========================================================================= */

/* Les coordonnées Copro-Assistance (COPRO_ASSISTANCE) sont définies dans brand.js */

/* ---------- Statuts des pièces ---------- */
const PIECE_STATUTS = [
  { id: '',   label: 'À demander',  short: 'À dem.', cls: 'st-todo' },
  { id: 'D',  label: 'Demandée',    short: 'Dem.',   cls: 'st-asked' },
  { id: 'P',  label: 'Partiellement reçue', short: 'Partiel', cls: 'st-update' },
  { id: 'R',  label: 'Reçue',       short: 'Reçue',  cls: 'st-ok' },
  { id: 'V',  label: 'À analyser',  short: 'À anal.', cls: 'st-check' },
  { id: 'A',  label: 'À actualiser', short: 'À act.', cls: 'st-update' },
  { id: 'NR', label: 'Non réalisé sur la copropriété', short: 'Non réalisé', cls: 'st-na', copro: true },
  { id: 'SO', label: 'Sans objet (confirmé)', short: 'S.O.', cls: 'st-na' },
];

/* ---------- Catégories de pièces ---------- */
const PIECE_CATEGORIES = [
  { id: 'vendeur', label: 'Vendeur & propriété', icon: '👤', canal: 'vendeur' },
  { id: 'diag', label: 'Diagnostics du logement', icon: '🔎', canal: 'autre' },
  { id: 'copro_org', label: 'Copropriété — organisation', icon: '🏢', canal: 'syndic' },
  { id: 'copro_compta', label: 'Copropriété — comptabilité & finances', icon: '💶', canal: 'syndic' },
  { id: 'copro_tech', label: 'Copropriété — technique & travaux', icon: '🛠️', canal: 'syndic' },
  { id: 'acquereur', label: 'Acquéreur', icon: '🤝', canal: 'acquereur' },
  { id: 'transaction', label: 'Transaction', icon: '📑', canal: 'notaire' },
  { id: 'autres', label: 'Autres pièces', icon: '📎', canal: 'autre' },
];

/* cond(d) : renvoie false si la pièce est probablement sans objet pour ce dossier.
   validite : durée de validité indicative en mois (diagnostics) — null = illimitée sous conditions. */
const PIECES = [
  // Vendeur
  { id: 'titre', cat: 'vendeur', label: 'Titre de propriété complet', hint: 'Coordonnées de tous les titulaires de droits. Comparez la désignation du titre, du mandat, du règlement et du mesurage.', ped: false, kw: ['titre', 'acte de vente', 'attestation de propriete', 'acte authentique'] },
  { id: 'etat_civil', cat: 'vendeur', label: 'État civil, régime matrimonial, pièces d’identité', hint: 'Indivision, démembrement, succession ou représentation éventuelle.', kw: ['identite', 'cni', 'passeport', 'livret de famille', 'etat civil'] },
  { id: 'photos', cat: 'vendeur', opt: true, label: 'Photos du bien', hint: 'Utilisées dans le rendu d’estimation et la fiche de commercialisation (avec l’accord du vendeur).', multi: true, kw: ['photo', 'img', 'jpg', 'jpeg', 'png', 'heic'] },
  { id: 'rapport_estim', cat: 'vendeur', opt: true, label: 'Rapport d’estimation (versions)', hint: 'Chaque version déposée est conservée.', multi: true, kw: ['estimation', 'avis de valeur'] },
  { id: 'avenant', cat: 'vendeur', opt: true, label: 'Avenants au mandat', hint: 'Baisse de prix, prolongation, changement de conditions.', multi: true, kw: ['avenant'] },
  { id: 'mandat', cat: 'vendeur', label: 'Mandat de vente signé', hint: 'Désignation exacte de tous les lots et dépendances. Numéro au registre des mandats.', kw: ['mandat'] },
  { id: 'taxe_fonciere', cat: 'vendeur', label: 'Dernier avis de taxe foncière', hint: 'Utile au prorata de taxe foncière au jour de l’acte.', kw: ['taxe fonciere', 'foncier'] },
  { id: 'plans', opt: true, cat: 'vendeur', label: 'Plans & documents de modification des lots', hint: 'Lot réuni, divisé, transformé ? Autorisations d’AG et modificatifs.', kw: ['plan'] },
  { id: 'bail', cat: 'vendeur', label: 'Bail, état des lieux, quittances, dépôt de garantie, congé', hint: 'Uniquement si le bien est loué.', cond: d => d.bien.occupation === 'loue', kw: ['bail', 'quittance', 'etat des lieux', 'conge'] },
  { id: 'equipements', opt: true, cat: 'vendeur', label: 'Liste des équipements inclus, contrats & garanties', hint: 'Contrats d’entretien et garanties encore valables.', kw: ['garantie', 'contrat entretien', 'equipement'] },
  { id: 'travaux_privatifs', opt: true, cat: 'vendeur', label: 'Factures & autorisations des travaux privatifs', hint: 'Travaux touchant parties communes, structure, fenêtres ou réseaux : autorisation d’AG ?', kw: ['facture', 'devis', 'autorisation'] },
  { id: 'sinistres', opt: true, cat: 'vendeur', label: 'Déclarations de sinistre, expertises, indemnisations', hint: 'Concernant le logement.', kw: ['sinistre', 'expertise', 'degat des eaux'] },
  // Diagnostics
  { id: 'dpe', cat: 'diag', label: 'DPE (diagnostic de performance énergétique)', hint: 'Validité 10 ans (les DPE réalisés avant le 1er juillet 2021 ne sont plus valables). Classes à afficher dans l’annonce.', validite: 120, kw: ['dpe', 'performance energetique'] },
  { id: 'amiante', cat: 'diag', label: 'Diagnostic amiante', hint: 'Permis de construire antérieur au 1er juillet 1997. Validité illimitée si absence d’amiante.', validite: null, cond: d => !d.bien.annee || +d.bien.annee < 1997, kw: ['amiante'] },
  { id: 'plomb', cat: 'diag', label: 'Diagnostic plomb (CREP)', hint: 'Immeuble construit avant le 1er janvier 1949. Illimité si négatif, 1 an si positif.', validite: 12, cond: d => !d.bien.annee || +d.bien.annee < 1949, kw: ['plomb', 'crep'] },
  { id: 'elec', cat: 'diag', label: 'Diagnostic électrique', hint: 'Installation de plus de 15 ans. Validité 3 ans.', validite: 36, kw: ['electricite', 'elec'] },
  { id: 'gaz', opt: true, cat: 'diag', label: 'Diagnostic gaz', hint: 'Installation de plus de 15 ans. Validité 3 ans.', validite: 36, kw: ['gaz'] },
  { id: 'termites', opt: true, cat: 'diag', label: 'Diagnostic termites', hint: 'Zone délimitée par arrêté préfectoral. Validité 6 mois.', validite: 6, kw: ['termite'] },
  { id: 'erp', cat: 'diag', label: 'État des risques (ERP)', hint: 'Toujours requis. Validité 6 mois — à actualiser avant compromis puis acte.', validite: 6, kw: ['erp', 'etat des risques', 'georisques'] },
  { id: 'bruit', opt: true, cat: 'diag', label: 'Bruit (plan d’exposition aéroport)', hint: 'Si zone de bruit d’un aérodrome.', kw: ['bruit'] },
  { id: 'carrez', cat: 'diag', label: 'Mesurage loi Carrez', hint: 'Adapté aux lots vendus et cohérent avec le titre et le règlement.', kw: ['carrez', 'mesurage', 'superficie'] },
  { id: 'carnet_logement', opt: true, cat: 'diag', label: 'Carnet d’information du logement', hint: 'Lorsqu’il existe (travaux de rénovation énergétique depuis 2023).', kw: ['carnet d information'] },
  // Copro organisation
  { id: 'rcp', cat: 'copro_org', label: 'Règlement de copropriété & état descriptif de division', hint: 'Rubriques « Copropriété » ou « Documents » de l’extranet, dossier d’acquisition ; syndic ou notaire si manquant.', ped: true, extranet: true, kw: ['reglement', 'rcp', 'etat descriptif', 'edd'] },
  { id: 'modificatifs', cat: 'copro_org', label: 'Modificatifs publiés', hint: 'Un fichier ancien peut ne pas décrire la situation actuelle. Vérifiez les numéros des lots vendus.', ped: true, extranet: true, kw: ['modificatif'] },
  { id: 'fiche_synth', cat: 'copro_org', label: 'Fiche synthétique à jour', hint: 'Identification, organisation, données financières globales, immatriculation.', ped: true, extranet: true, kw: ['fiche synthetique'] },
  { id: 'carnet_entretien', cat: 'copro_org', label: 'Carnet d’entretien de l’immeuble', hint: 'Contrats, entretien et travaux de l’immeuble.', ped: true, extranet: true, kw: ['carnet d entretien', 'carnet entretien'] },
  { id: 'pv_ag', cat: 'copro_org', label: 'PV de toutes les AG des 3 dernières années', hint: 'Les PV des 3 dernières années — pas seulement 3 PV. Inclure les AG extraordinaires.', ped: true, extranet: true, multi: true, kw: ['pv', 'proces verbal', 'proces-verbal', 'assemblee'] },
  { id: 'convocation', cat: 'copro_org', label: 'Dernière convocation & annexes', hint: 'La convocation contient les projets ; seul le PV constate les décisions.', ped: true, kw: ['convocation', 'ordre du jour'] },
  { id: 'contrat_syndic', cat: 'copro_org', label: 'Contrat de syndic en cours', hint: 'Fait partie de la liste minimale de l’extranet.', extranet: true, kw: ['contrat de syndic'] },
  { id: 'syndic_coord', cat: 'copro_org', label: 'Coordonnées du syndic, n° d’immatriculation, accès extranet', hint: 'Accès extranet uniquement avec l’accord exprès du vendeur.', kw: ['immatriculation'] },
  // Copro compta
  { id: 'appels_fonds', cat: 'copro_compta', label: 'Appels de fonds des 12 derniers mois', hint: 'Charges courantes, travaux, appels exceptionnels. Un appel ne prouve pas un paiement.', ped: true, extranet: true, multi: true, kw: ['appel de fonds', 'appel', 'avis d echeance'] },
  { id: 'decomptes', cat: 'copro_compta', label: 'Décomptes individuels des 2 derniers exercices', hint: 'Charges courantes et hors budget payées par le vendeur sur les deux exercices précédant la vente.', ped: true, extranet: true, multi: true, kw: ['decompte', 'repartition', 'regularisation'] },
  { id: 'ped', cat: 'copro_compta', label: 'Pré-état daté', hint: 'Informations financières à remettre à l’acquéreur au plus tard à la promesse (CCH L.721-2).', kw: ['pre-etat', 'pre etat', 'ped'] },
  { id: 'etat_date', cat: 'copro_compta', label: 'État daté (syndic, pour l’acte)', hint: 'Demandé au syndic en vue de l’acte authentique — distinct du pré-état daté.', kw: ['etat date'] },
  // Copro technique
  { id: 'dtg', cat: 'copro_tech', label: 'Conclusions du DTG', hint: 'Lorsqu’un diagnostic technique global a été réalisé.', ped: true, kw: ['dtg', 'diagnostic technique global'] },
  { id: 'ppt', cat: 'copro_tech', label: 'Plan pluriannuel de travaux (PPT) ou projet (PPPT)', hint: 'Adopté s’il existe, à défaut projet élaboré.', ped: true, kw: ['ppt', 'pppt', 'plan pluriannuel'] },
  { id: 'dpe_collectif', cat: 'copro_tech', label: 'DPE collectif', hint: 'Concerne l’immeuble — à ne pas confondre avec le DPE du logement.', ped: true, kw: ['dpe collectif'] },
  { id: 'diag_communs', opt: true, cat: 'copro_tech', label: 'Diagnostics des parties communes (DTA amiante, plomb…)', hint: 'Selon le bâtiment.', extranet: true, kw: ['dta', 'parties communes'] },
  { id: 'travaux_docs', opt: true, cat: 'copro_tech', label: 'Rapports, audits, expertises, contrats travaux/sinistres', hint: 'Utiles aux travaux ou sinistres signalés.', kw: ['rapport', 'audit'] },
  // Acquéreur
  { id: 'acq_identite', cat: 'acquereur', label: 'Pièces d’identité & état civil acquéreur(s)', hint: '', kw: [] },
  { id: 'acq_financement', cat: 'acquereur', label: 'Plan de financement / accord de principe', hint: 'Attestation de capacité d’emprunt ou de fonds propres.', kw: ['financement', 'accord de principe', 'simulation'] },
  { id: 'acq_offre', cat: 'acquereur', label: 'Offre d’achat signée', hint: 'Aucun versement ne peut être exigé de l’acquéreur avant la promesse (art. 1589-1 C. civ.).', kw: ['offre'] },
  // Transaction
  { id: 'offre_acceptee', cat: 'transaction', label: 'Acceptation de l’offre par le vendeur', hint: '', kw: ['acceptation'] },
  { id: 'compromis', cat: 'transaction', label: 'Compromis / promesse de vente signé(e)', hint: '', kw: ['compromis', 'promesse'] },
  { id: 'notif_sru', cat: 'transaction', label: 'Notification du compromis (délai de rétractation)', hint: 'Lettre recommandée ou remise en main propre : point de départ du délai de 10 jours.', kw: ['notification', 'sru', 'recommande'] },
  { id: 'accord_pret', cat: 'transaction', label: 'Offre / accord de prêt acquéreur', hint: '', kw: ['offre de pret', 'accord de pret'] },
  { id: 'acte', cat: 'transaction', label: 'Acte authentique / attestation de vente', hint: '', kw: ['attestation de vente'] },
  { id: 'facture_honoraires', cat: 'transaction', label: 'Facture d’honoraires', hint: '', kw: ['honoraires'] },
];

/* ---------- Questionnaire de l'entretien vendeur ---------- */
const ENTRETIEN = [
  { id: 'lots', titre: 'Le bien et les lots', questions: [
    ['lots_num', 'Quels numéros de lots sont vendus : logement, cave, parking, grenier, jardin ou autre jouissance ?'],
    ['lots_modif', 'Le lot a-t-il été réuni, divisé, transformé ou agrandi ? Les autorisations et modificatifs existent-ils ?'],
    ['occupation', 'Le logement est-il libre, occupé, loué, meublé ou soumis à un congé en cours ?'],
    ['travaux_priv', 'Des travaux privatifs ont-ils touché les parties communes, la structure, les fenêtres ou les réseaux ?'],
    ['juridique', 'Existe-t-il un prêt, une saisie, une indivision, un démembrement ou une succession en cours ?'],
  ]},
  { id: 'copro', titre: 'La copropriété', questions: [
    ['travaux', 'Quels travaux ont été votés, réalisés récemment ou évoqués pour les prochaines années ?'],
    ['sinistres', 'Y a-t-il des sinistres, infiltrations, fissures, pannes ou réserves de chantier ?'],
    ['litiges', 'Existe-t-il un litige avec le syndic, un voisin, une entreprise ou la copropriété ?'],
    ['charges', 'Les charges sont-elles stables ? Une régularisation importante ou un impayé personnel existe-t-il ?'],
    ['gouvernance', 'L’ambiance, la gouvernance ou le fonctionnement du conseil syndical présentent-ils une difficulté ?'],
  ]},
  { id: 'usage', titre: 'Usage et règles', questions: [
    ['usage_ok', 'Le règlement autorise-t-il l’usage actuel et le projet de l’acquéreur ?'],
    ['usage_pro', 'Location saisonnière, activité professionnelle, enseigne ou changement d’usage sont-ils concernés ?'],
    ['servitude', 'Un droit de jouissance, une servitude ou une convention particulière doit-il être signalé ?'],
    ['acces', 'Des clés, badges, télécommandes, compteurs ou équipements sont-ils rattachés aux lots ?'],
  ]},
  { id: 'calendrier', titre: 'Calendrier de vente', questions: [
    ['notaire', 'Quel notaire suivra le dossier et à quelle date le compromis est-il envisagé ?'],
    ['syndic_contact', 'Le vendeur a-t-il déjà contacté son syndic ou commandé un document ?'],
    ['appels_dispo', 'Peut-il fournir immédiatement ses derniers appels et décomptes de charges ?'],
    ['extranet', 'Accepte-t-il de transmettre un accès temporaire à son extranet syndic ?'],
  ]},
];

/* ---------- Signaux à traiter avant commercialisation ---------- */
const SIGNAUX = [
  { id: 'trav_non_appeles', groupe: 'Finances et travaux', label: 'Travaux votés non encore appelés ou chantier en cours' },
  { id: 'trav_evoques', groupe: 'Finances et travaux', label: 'Projet de travaux important évoqué mais non voté' },
  { id: 'hausse_charges', groupe: 'Finances et travaux', label: 'Hausse forte des charges ou régularisation inhabituelle' },
  { id: 'impayes', groupe: 'Finances et travaux', label: 'Impayés globaux élevés ou dette fournisseurs' },
  { id: 'procedure', groupe: 'Finances et travaux', label: 'Procédure judiciaire concernant la copropriété' },
  { id: 'sinistre', groupe: 'Finances et travaux', label: 'Sinistre non clos, expertise ou indemnité en attente' },
  { id: 'transfo_lot', groupe: 'Lots et gouvernance', label: 'Transformation de lot sans autorisation retrouvée' },
  { id: 'usage', groupe: 'Lots et gouvernance', label: 'Usage réel incompatible ou incertain au regard du règlement' },
  { id: 'ecart_lots', groupe: 'Lots et gouvernance', label: 'Écart entre titre, lots vendus, plan et mesurage' },
  { id: 'compte_debiteur', groupe: 'Lots et gouvernance', label: 'Compte vendeur débiteur ou échéancier en cours' },
  { id: 'ppt_dtg', groupe: 'Lots et gouvernance', label: 'PPPT/PPT, DTG ou DPE révélant des besoins majeurs' },
  { id: 'chgt_syndic', groupe: 'Lots et gouvernance', label: 'Changement récent de syndic ou archives incomplètes' },
];

/* ---------- Parcours de vente (timeline) ---------- */
/* Chaque tâche : [id, libellé, {piece?, action?}] */
const ETAPES = [
  { id: 'mandat', titre: 'Prise de mandat', sous: 'Cadrer — les 48 premières heures', phase: 'mandat',
    taches: [
      ['vendeurs', 'Identifier tous les vendeurs et titulaires de droits (indivision, démembrement, régime matrimonial)', { action: 'fiche' }],
      ['lots', 'Lister précisément les lots vendus, annexes et dépendances (avec tantièmes)', { action: 'fiche' }],
      ['occupation', 'Préciser l’occupation (libre, loué, occupé) et la date de signature visée', { action: 'fiche' }],
      ['mandat_signe', 'Mandat signé, désignation exacte des lots, n° au registre des mandats', { piece: 'mandat' }],
      ['info_precontract', 'Information précontractuelle remise (honoraires, médiateur) — mandat hors établissement : délai de rétractation de 14 jours', {}],
      ['dossier_unique', 'Dossier unique créé : un statut pour chaque pièce (reçue, à demander, à actualiser, à analyser)', { action: 'pieces' }],
    ],
    conseils: [
      'Demandez les documents avant même la première offre : une copropriété mal documentée retarde le compromis et multiplie les échanges de dernière minute.',
      'Comparez toujours la désignation du mandat, du titre, du règlement et du mesurage : une différence de lot ou d’annexe doit être clarifiée tôt.',
    ],
    actions: [['importMandat', '📄 Importer un mandat (PDF)'], ['tpl:vendeur_bienvenue', '✉️ Mail de bienvenue au vendeur']],
  },
  { id: 'entretien', titre: 'Entretien vendeur', sous: 'Questionner — faire raconter la copropriété', phase: 'mandat',
    taches: [
      ['questionnaire', 'Questionnaire vendeur complété (bien, copropriété, usage, calendrier)', { action: 'entretien' }],
      ['incertains', 'Réponses incertaines notées comme points à vérifier', { action: 'entretien' }],
      ['notaire_vendeur', 'Notaire du vendeur identifié', { action: 'fiche' }],
    ],
    conseils: ['Notez les réponses incertaines comme des points à vérifier, jamais comme des faits acquis.'],
    actions: [['go:entretien', '🗒️ Ouvrir le questionnaire']],
  },
  { id: 'collecte_vendeur', titre: 'Collecte des pièces vendeur', sous: 'Construire le socle juridique, technique et commercial', phase: 'mandat',
    taches: [
      ['titre', 'Titre de propriété reçu', { piece: 'titre' }],
      ['diagnostics', 'Dossier de diagnostic technique commandé / reçu', { piece: 'dpe' }],
      ['carrez', 'Mesurage Carrez cohérent avec le titre et le règlement', { piece: 'carrez' }],
      ['occupation_docs', 'Documents d’occupation (bail, congé…) si loué', { piece: 'bail' }],
      ['taxe', 'Taxe foncière reçue', { piece: 'taxe_fonciere' }],
    ],
    conseils: ['Vérifiez la date de validité de chaque diagnostic : l’ERP (6 mois) devra souvent être actualisé avant l’acte.'],
    actions: [['tpl:vendeur_pieces', '✉️ Demander les pièces manquantes au vendeur'], ['tpl:diag_commande', '✉️ Commander les diagnostics']],
  },
  { id: 'collecte_copro', titre: 'Collecte du dossier copropriété', sous: 'À demander sans attendre la première offre', phase: 'mandat',
    taches: [
      ['extranet', 'Accès extranet obtenu avec l’accord exprès du vendeur (ou export des rubriques demandé)', {}],
      ['rcp', 'Règlement, état descriptif et modificatifs récupérés', { piece: 'rcp' }],
      ['pv', 'PV de toutes les AG des 3 dernières années', { piece: 'pv_ag' }],
      ['fiche', 'Fiche synthétique et carnet d’entretien', { piece: 'fiche_synth' }],
      ['appels', 'Appels de fonds des 12 derniers mois et 2 derniers décomptes', { piece: 'appels_fonds' }],
      ['technique', 'DTG, PPT/PPPT, DPE collectif selon l’immeuble', { piece: 'ppt' }],
      ['manquants', 'Documents manquants sur l’extranet signalés au syndic (mise en ligne gratuite)', {}],
    ],
    conseils: [
      'L’extranet peut contenir des données personnelles : ne téléchargez que les pièces utiles. Les identifiants se notent dans la fiche (stockés sur cet appareil) et le vendeur change son mot de passe après la collecte.',
      'Formulation simple pour le vendeur : « Vous pouvez modifier temporairement votre mot de passe pendant la vente. Nous récupérons uniquement les documents nécessaires, puis vous le modifiez à nouveau. »',
      'Si un document de la liste minimale manque sur l’extranet, le vendeur peut demander au syndic de le mettre en ligne gratuitement (art. 18 loi 1965, décret 2019-502).',
    ],
    actions: [['tpl:vendeur_extranet', '✉️ Demander l’accès extranet'], ['tpl:syndic_extranet', '✉️ Docs manquants sur l’extranet (syndic)'], ['tpl:syndic_documents', '✉️ Demande de documents au syndic']],
  },
  { id: 'analyse', titre: 'Analyse du dossier', sous: 'Contrôler — transformer les documents en informations', phase: 'mandat',
    taches: [
      ['lecture_pv', 'PV lus : travaux votés/refusés, appels futurs, procédures, sinistres, décisions sur les lots', { action: 'analyse' }],
      ['lecture_charges', 'Charges comparées sur deux exercices ; appels de fonds lus', { action: 'analyse' }],
      ['signaux', 'Signaux repérés : source, date, montant et question à poser', { action: 'analyse' }],
      ['incidence', 'Incidence financière ou commerciale mesurée, explication du vendeur demandée', { action: 'analyse' }],
    ],
    conseils: [
      'Pour chaque alerte : vérifier le document source, demander l’explication du vendeur, mesurer l’incidence, transmettre l’information utile au notaire.',
      'N’interprétez pas seul une information ambiguë : faites analyser le dossier par un professionnel.',
    ],
    actions: [['go:analyse', '📊 Ouvrir l’analyse (signaux, appels de fonds, annexes)']],
  },
  { id: 'commercialisation', titre: 'Commercialisation', sous: 'Annonce conforme, visites, retours', phase: 'commercialisation',
    taches: [
      ['annonce_copro', 'Annonce : bien en copropriété, nombre de lots, charges annuelles moyennes (quote-part), procédure éventuelle', {}],
      ['annonce_dpe', 'Annonce : classes DPE et GES, estimation des dépenses énergétiques', { piece: 'dpe' }],
      ['annonce_prix', 'Annonce : prix et honoraires (charge, % TTC du prix hors honoraires)', {}],
      ['visites', 'Visites organisées, bons de visite signés', {}],
      ['compte_rendu', 'Compte rendu de visites envoyé au vendeur', {}],
    ],
    conseils: ['Les informations copropriété de l’annonce découlent de la fiche synthétique et des décomptes : collectez-les avant la mise en ligne.'],
    actions: [['annonceCopro', '📝 Générer les mentions copropriété de l’annonce'], ['tpl:vendeur_cr_visites', '✉️ Compte rendu de visites']],
  },
  { id: 'offre', titre: 'Offre d’achat', sous: 'Formaliser, transmettre, faire accepter', phase: 'offre',
    taches: [
      ['offre_redigee', 'Offre d’achat rédigée et signée par l’acquéreur', { piece: 'acq_offre' }],
      ['financement', 'Plan de financement de l’acquéreur vérifié', { piece: 'acq_financement' }],
      ['transmise', 'Offre transmise au vendeur', {}],
      ['acceptee', 'Offre acceptée par écrit par le vendeur', { piece: 'offre_acceptee' }],
    ],
    conseils: ['Aucun versement ne peut être demandé à un acquéreur non professionnel avant la promesse de vente (art. 1589-1 du Code civil).'],
    actions: [['go:offre', '✍️ Générer l’offre d’achat'], ['tpl:vendeur_offre', '✉️ Transmettre l’offre au vendeur'], ['tpl:acq_offre_recue', '✉️ Accuser réception à l’acquéreur']],
  },
  { id: 'ped', titre: 'Pré-état daté', sous: 'Anticiper — avant de fixer le compromis', phase: 'offre',
    taches: [
      ['ped_choix', 'Solutions présentées au vendeur (syndic ou prestataire) — le choix lui appartient', {}],
      ['ped_commande', 'Pré-état daté commandé', { action: 'ped' }],
      ['ped_recu', 'Pré-état daté reçu et transmis au notaire', { piece: 'ped' }],
      ['ped_actualise', 'Actualisation vérifiée si nouvelle AG, nouvel appel ou report', {}],
    ],
    conseils: [
      'Les informations financières doivent être remises à l’acquéreur au plus tard à la promesse. À défaut, le délai de rétractation de 10 jours ne court qu’à compter du lendemain de leur communication (CCH L.721-3).',
      'Le vendeur n’est pas tenu de commander le pré-état daté au syndic : sans commande préalable, le syndic ne peut pas l’imposer ni le facturer.',
    ],
    actions: [['go:ped', '📦 Préparer la demande de pré-état daté']],
  },
  { id: 'compromis', titre: 'Préparation du compromis', sous: 'Transmettre un dossier immédiatement lisible', phase: 'offre',
    taches: [
      ['fichiers_nommes', 'Fichiers nommés (date, nature, exercice), PDF lisibles et complets', { action: 'notaire' }],
      ['liste_pieces', 'Liste des pièces transmises et manquantes', { action: 'notaire' }],
      ['alertes_resumees', 'Alertes résumées, sans les masquer ni les dramatiser', { action: 'notaire' }],
      ['dossier_notaire', 'Dossier transmis au(x) notaire(s)', { action: 'notaire' }],
      ['rdv_compromis', 'Date de signature du compromis fixée', { date: 'compromis' }],
    ],
    conseils: ['Ne fixez pas la signature du compromis sans vérifier que les informations financières et les principales pièces de copropriété peuvent être produites.'],
    actions: [['go:notaire', '📤 Préparer la transmission au notaire'], ['tpl:notaire_transmission', '✉️ Mail de transmission au notaire']],
  },
  { id: 'retractation', titre: 'Compromis signé & rétractation', sous: 'Délai de 10 jours (CCH L.271-1)', phase: 'compromis',
    taches: [
      ['signe', 'Compromis signé', { piece: 'compromis', date: 'compromis' }],
      ['notifie', 'Notification à l’acquéreur (date de première présentation / remise)', { piece: 'notif_sru', date: 'notification' }],
      ['fin_retract', 'Fin du délai de rétractation vérifiée', { date: 'finRetractation' }],
    ],
    conseils: ['Le délai de 10 jours court à compter du lendemain de la première présentation de la lettre de notification (ou de la remise en main propre). S’il expire un samedi, dimanche ou jour férié, il est prorogé au premier jour ouvrable suivant.'],
    actions: [['calcRetract', '🗓️ Calculer la fin du délai'], ['tpl:acq_retractation', '✉️ Rappel du délai à l’acquéreur']],
  },
  { id: 'financement', titre: 'Conditions suspensives', sous: 'Financement et autres conditions', phase: 'compromis',
    taches: [
      ['depot_pret', 'Demandes de prêt déposées par l’acquéreur (justificatifs)', {}],
      ['accord_pret', 'Accord / offre de prêt obtenu', { piece: 'accord_pret', date: 'pret' }],
      ['autres_cs', 'Autres conditions suspensives levées', {}],
    ],
    conseils: ['Suivez la date limite d’obtention du prêt prévue au compromis et informez le notaire de toute difficulté sans attendre.'],
    actions: [['tpl:acq_suivi_pret', '✉️ Suivi du financement (acquéreur)'], ['tpl:notaire_suivi', '✉️ Point d’étape avec le notaire']],
  },
  { id: 'acte', titre: 'Acte authentique', sous: 'Jusqu’à la signature définitive', phase: 'compromis',
    taches: [
      ['etat_date', 'État daté demandé au syndic par le notaire', { piece: 'etat_date' }],
      ['erp_maj', 'ERP et diagnostics à durée courte actualisés si nécessaire', { piece: 'erp' }],
      ['rdv_acte', 'Date de signature de l’acte fixée', { date: 'acte' }],
      ['visite_finale', 'Visite avant signature, relevés de compteurs, remise des clés et badges', {}],
      ['facture', 'Facture d’honoraires émise', { piece: 'facture_honoraires' }],
    ],
    conseils: ['Ne confondez pas le pré-état daté avec l’état daté, demandé ensuite au syndic pour la vente définitive.'],
    actions: [['tpl:notaire_acte', '✉️ Confirmation du rendez-vous de signature']],
  },
  { id: 'cloture', titre: 'Après-vente', sous: 'Clôturer proprement', phase: 'acte',
    taches: [
      ['extranet_off', 'Le vendeur a modifié son mot de passe extranet ; données inutiles supprimées', {}],
      ['avis', 'Avis client demandé (vendeur et acquéreur)', {}],
      ['archive', 'Dossier archivé (export sauvegardé)', {}],
    ],
    conseils: ['Supprimez l’accès extranet et les données inutiles après usage (RGPD).'],
    actions: [['tpl:vendeur_merci', '✉️ Remerciements & demande d’avis'], ['exportZip', '🗜️ Exporter le dossier complet (ZIP)']],
  },
];

const PHASES = [
  { id: 'estimation', label: 'Estimation', color: '#8a6fb3' },
  { id: 'mandat', label: 'Mandat', color: '#5b7a99' },
  { id: 'commercialisation', label: 'Commercialisation', color: '#1a9ba8' },
  { id: 'offre', label: 'Offre / pré-compromis', color: '#c58a12' },
  { id: 'compromis', label: 'Compromis signé', color: '#7a5bd6' },
  { id: 'acte', label: 'Acte signé', color: '#2f9e5b' },
  { id: 'abandon', label: 'Abandonné', color: '#9a9a9a' },
];

/* ---------- Canaux de mails (5 fils synchronisés par bien) ---------- */
const CANAUX = [
  { id: 'notaire', label: 'Notaire', icon: '⚖️' },
  { id: 'syndic', label: 'Syndic', icon: '🏢' },
  { id: 'vendeur', label: 'Vendeur', icon: '👤' },
  { id: 'acquereur', label: 'Acquéreur', icon: '🤝' },
  { id: 'autre', label: 'Autre', icon: '📨' },
];

/* ---------- Modèles de mails ---------- */
/* Variables disponibles : voir TEMPLATE_VARS (app.js) */
const TEMPLATES = [
  { id: 'vendeur_bienvenue', canal: 'vendeur', titre: 'Bienvenue après signature du mandat',
    sujet: 'Votre vente — {{adresse}} : prochaines étapes',
    corps: `Bonjour {{vendeur_civilite}},

Merci pour votre confiance. Le mandat n° {{mandat_numero}} concernant votre bien situé {{adresse_complete}} est désormais enregistré.

Pour préparer une vente sereine et éviter tout retard au moment du compromis, je constitue dès maintenant le dossier complet de votre bien, y compris le volet copropriété. Je reviens vers vous très vite avec la liste précise des documents utiles.

Prochaines étapes :
1. Collecte des pièces (titre, diagnostics, documents de copropriété)
2. Mise en commercialisation
3. Visites et retours réguliers

Je reste à votre disposition.

{{signature}}` },
  { id: 'vendeur_pieces', canal: 'vendeur', titre: 'Demande des pièces manquantes',
    sujet: 'Documents à me transmettre — vente {{adresse}}',
    corps: `Bonjour {{vendeur_civilite}},

Afin de préparer le dossier de vente de votre bien situé {{adresse_complete}}, pourriez-vous me transmettre les documents suivants :

{{pieces_manquantes_vendeur}}

Pour la copropriété :
{{pieces_manquantes_copro}}

Où les trouver ? En priorité sur votre extranet syndic, puis dans vos convocations, procès-verbaux et courriels, et enfin dans votre dossier d’acquisition.

Anticiper ces documents évite de retarder le compromis : certaines informations manquantes peuvent repousser le point de départ du délai de rétractation de l’acquéreur.

Merci d’avance,

{{signature}}` },
  { id: 'vendeur_extranet', canal: 'vendeur', titre: 'Demande d’accès temporaire à l’extranet syndic',
    sujet: 'Accès temporaire à votre extranet syndic — vente {{adresse}}',
    corps: `Bonjour {{vendeur_civilite}},

Les documents de copropriété nécessaires à la vente devront, pour l’essentiel, être transmis au notaire et à l’acquéreur. Un accès temporaire à votre extranet syndic ({{syndic_nom}}) me permettrait de récupérer immédiatement les versions à jour, d’éviter les oublis et de préparer le pré-état daté sans relances successives.

Je vous propose de configurer un mot de passe provisoire, le temps que la vente se fasse.

Si vous préférez ne pas transmettre d’accès, pouvez-vous exporter les rubriques « Documents », « Comptes » et « Appels de fonds » puis me les adresser ?

{{signature}}` },
  { id: 'vendeur_offre', canal: 'vendeur', titre: 'Transmission d’une offre d’achat',
    sujet: 'Offre d’achat reçue — {{adresse}}',
    corps: `Bonjour {{vendeur_civilite}},

J’ai le plaisir de vous transmettre une offre d’achat pour votre bien situé {{adresse_complete}} :

- Acquéreur(s) : {{acquereur_noms}}
- Prix proposé : {{offre_prix}} (honoraires d’agence {{honoraires_charge}})
- Financement : {{offre_financement}}
- Offre valable jusqu’au {{offre_validite}}

Vous trouverez l’offre signée en pièce jointe. Je vous propose d’en discuter rapidement par téléphone.

{{signature}}` },
  { id: 'vendeur_cr_visites', canal: 'vendeur', titre: 'Compte rendu de visites',
    sujet: 'Compte rendu de visites — {{adresse}}',
    corps: `Bonjour {{vendeur_civilite}},

Voici le point sur la commercialisation de votre bien situé {{adresse_complete}} :

- Nombre de visites : [ ]
- Retours principaux : [ ]
- Points forts relevés : [ ]
- Freins exprimés : [ ]

Ma recommandation : [ ]

{{signature}}` },
  { id: 'vendeur_ped', canal: 'vendeur', titre: 'Proposer le pré-état daté au vendeur',
    sujet: 'Pré-état daté : anticiper le compromis — {{adresse}}',
    corps: `Bonjour {{vendeur_civilite}},

Avant la signature du compromis, la loi impose au vendeur de remettre à l’acquéreur les informations financières de la copropriété (charges payées sur les deux derniers exercices, sommes susceptibles d’être dues, impayés globaux, fonds de travaux…). C’est ce qu’on appelle le « pré-état daté ». Il est indispensable pour purger le délai de rétractation loi SRU de l'acquéreur, donc pour pouvoir signer l'acte authentique final.

Vous êtes libre de le réaliser vous-même (sous réserve de bien respecter le formalisme légal), de le commander à votre syndic, ou de le confier à un prestataire spécialisé. Copro-Assistance le prépare sous 24 h pour 60 € TTC à partir des documents du dossier (le syndic facture en moyenne plus de 300 € avec un délai d’environ une semaine). Le choix vous appartient naturellement mais je tenais à vous faire savoir que cette solution d'économie concrète existe.

Souhaitez-vous que je lance la demande pour vous ?
N'hésitez pas à revenir vers moi pour tout complément d'information

{{signature}}` },
  { id: 'vendeur_merci', canal: 'vendeur', titre: 'Remerciements & demande d’avis',
    sujet: 'Merci pour votre confiance — {{adresse}}',
    corps: `Bonjour {{vendeur_civilite}},

La vente de votre bien est désormais finalisée. Merci pour votre confiance tout au long de ce projet.

Pensez à modifier le mot de passe de votre extranet syndic si vous me l’aviez communiqué temporairement.

Si vous avez été satisfait(e) de mon accompagnement, un avis me serait précieux : [lien]

{{signature}}` },
  { id: 'syndic_extranet', canal: 'syndic', titre: 'Documents manquants sur l’extranet (pour le vendeur)',
    sujet: 'Documents manquants sur mon extranet — {{copro_nom}}',
    corps: `Madame, Monsieur,

Dans le cadre de la vente de mes lots ({{lots}}) situés {{adresse_complete}}, je constate que les documents suivants sont absents ou non actualisés sur mon espace sécurisé :

{{pieces_manquantes_extranet}}

Ces pièces relevant de la liste minimale prévue par le décret n° 2019-502 du 23 mai 2019, je vous remercie de bien vouloir les déposer sur mon extranet dans une version téléchargeable et à jour, conformément à l’article 18 de la loi du 10 juillet 1965 et à l’article 33-1-1 du décret du 17 mars 1967. Cette mise à disposition relevant de vos missions, elle ne doit pas entraîner de facturation individuelle supplémentaire.

Dans l’attente, vous pouvez également me les adresser par courriel.

Bien cordialement,
{{vendeur_nom}}` },
  { id: 'syndic_documents', canal: 'syndic', titre: 'Demande de documents au syndic (par l’agent)',
    sujet: 'Vente lots {{lots}} — {{copro_nom}} — demande de documents',
    corps: `Madame, Monsieur,

Mandaté(e) par {{vendeur_nom}} pour la vente de ses lots n° {{lots}} dans la copropriété {{copro_nom}} ({{adresse_complete}}), je me permets de vous solliciter, avec son accord, pour obtenir les documents suivants :

{{pieces_manquantes_copro}}

Je vous précise que le vendeur ne vous commande pas, à ce stade, de pré-état daté.

Je vous remercie par avance et reste à votre disposition.

{{signature}}` },
  { id: 'syndic_appel', canal: 'syndic', titre: 'Explication d’une ligne d’appel de fonds',
    sujet: 'Appel de fonds — lots {{lots}} — demande de précision',
    corps: `Madame, Monsieur,

Concernant l’appel de fonds du [période] relatif aux lots {{lots}} de la copropriété {{copro_nom}}, pourriez-vous me préciser le montant global réparti, la clé appliquée à ces lots et la décision ou le document justifiant la ligne « [libellé] » ?

Je vous remercie par avance.

{{signature}}` },
  { id: 'syndic_annexe', canal: 'syndic', titre: 'Question sur les annexes comptables',
    sujet: 'Annexes comptables {{copro_nom}} — demande d’explication',
    corps: `Madame, Monsieur,

Dans l’annexe [n°] de l’exercice [exercice], je relève [constat], pour un montant de [montant] €. Pourriez-vous m’indiquer les écritures ou justificatifs expliquant ce montant et son rapprochement avec [référence] ?

Je vous remercie par avance.

{{signature}}` },
  { id: 'notaire_transmission', canal: 'notaire', titre: 'Transmission du dossier pour compromis',
    sujet: 'Dossier {{ref}} — {{adresse}} — préparation du compromis',
    corps: `Maître,

Je vous transmets le dossier de vente concernant :

- Vendeur(s) : {{vendeur_noms}}
- Acquéreur(s) : {{acquereur_noms}}
- Bien : {{adresse_complete}} — lots n° {{lots}}
- Occupation : {{occupation}}
- Prix : {{offre_prix}} — honoraires {{honoraires_montant}} {{honoraires_charge}}
- Syndic : {{syndic_nom}} {{syndic_email}}
- Date de compromis envisagée : {{date_compromis}}

Pièces transmises :
{{pieces_recues}}

Pièces encore attendues :
{{pieces_manquantes_toutes}}

Points d’attention :
{{signaux}}

Le suivi du pré-état daté est assuré par : {{ped_contact}}.

Je reste à votre disposition.

{{signature}}` },
  { id: 'notaire_suivi', canal: 'notaire', titre: 'Point d’étape',
    sujet: 'Dossier {{ref}} — {{adresse}} — point d’étape',
    corps: `Maître,

Je me permets de faire un point sur le dossier {{vendeur_noms}} / {{acquereur_noms}} ({{adresse_complete}}) :

- Compromis signé le {{date_compromis}}
- Fin du délai de rétractation : {{date_fin_retractation}}
- Date limite d’obtention du prêt : {{date_pret}}

[Informations / questions]

{{signature}}` },
  { id: 'notaire_acte', canal: 'notaire', titre: 'Confirmation du rendez-vous de signature',
    sujet: 'Signature de l’acte — {{adresse}} — {{date_acte}}',
    corps: `Maître,

Je vous confirme le rendez-vous de signature de l’acte authentique le {{date_acte}} pour la vente {{vendeur_noms}} / {{acquereur_noms}}.

Je vous remercie de me faire parvenir le décompte et de me confirmer le montant des honoraires d’agence à régler : {{honoraires_montant}}.

{{signature}}` },
  { id: 'acq_offre_recue', canal: 'acquereur', titre: 'Accusé de réception de l’offre',
    sujet: 'Votre offre d’achat — {{adresse}}',
    corps: `Bonjour {{acquereur_civilite}},

J’accuse bonne réception de votre offre d’achat au prix de {{offre_prix}} pour le bien situé {{adresse_complete}}. Je la transmets dès aujourd’hui au vendeur et reviens vers vous au plus vite.

Pour rappel, aucun versement ne vous est demandé à ce stade.

{{signature}}` },
  { id: 'acq_acceptation', canal: 'acquereur', titre: 'Offre acceptée — pièces à fournir',
    sujet: 'Offre acceptée ! Prochaines étapes — {{adresse}}',
    corps: `Bonjour {{acquereur_civilite}},

Bonne nouvelle : le vendeur a accepté votre offre pour le bien situé {{adresse_complete}}.

Pour préparer le compromis, merci de me transmettre :
- copie de vos pièces d’identité, situation familiale et régime matrimonial ;
- les coordonnées de votre notaire (si vous en avez un) ;
- votre plan de financement / accord de principe bancaire.

Vous recevrez avant ou lors du compromis les documents de copropriété et les informations financières (pré-état daté).

{{signature}}` },
  { id: 'acq_retractation', canal: 'acquereur', titre: 'Rappel du délai de rétractation',
    sujet: 'Votre délai de rétractation — {{adresse}}',
    corps: `Bonjour {{acquereur_civilite}},

Suite à la signature du compromis le {{date_compromis}}, vous disposez d’un délai de rétractation de 10 jours à compter du lendemain de la première présentation de la notification. Selon les informations dont je dispose, ce délai expire le {{date_fin_retractation}}.

N’hésitez pas à me contacter pour toute question.

{{signature}}` },
  { id: 'acq_suivi_pret', canal: 'acquereur', titre: 'Suivi du financement',
    sujet: 'Suivi de votre financement — {{adresse}}',
    corps: `Bonjour {{acquereur_civilite}},

Où en êtes-vous de vos démarches de financement ? Pour rappel, la date limite d’obtention du prêt prévue au compromis est le {{date_pret}}.

Pouvez-vous me transmettre une copie de vos dépôts de demande de prêt et, dès réception, l’accord de la banque ?

{{signature}}` },
  { id: 'diag_commande', canal: 'autre', titre: 'Commande de diagnostics',
    sujet: 'Commande de diagnostics — {{adresse}}',
    corps: `Bonjour,

Je souhaite commander les diagnostics nécessaires à la vente du bien suivant :
- Adresse : {{adresse_complete}}
- Lots : {{lots}} — type : {{type_bien}}, {{surface}} m²
- Année de construction : {{annee}}
- Occupation : {{occupation}}
- Contact pour l’accès : {{vendeur_noms}} — {{vendeur_tel}}

Diagnostics : DPE, ERP, Carrez{{diag_selon_bien}}.

Merci de m’indiquer vos disponibilités et votre tarif.

{{signature}}` },
  { id: 'ped_commande', canal: 'autre', titre: 'Demande de pré-état daté à Copro-Assistance',
    sujet: 'Commande pré-état daté — {{adresse}} — lots {{lots}}',
    corps: '(généré automatiquement depuis l’onglet « Pré-état daté »)' },
];

/* ---------- Guides & conseils (synthèse des guides Copro-Assistance) ---------- */
const GUIDES = [
  { id: 'methode', titre: 'La méthode des 48 premières heures', tags: 'mandat méthode', html: `
<p>Dès la prise de mandat, créez un dossier unique et attribuez un statut à chaque pièce : <b>reçue, à demander, à actualiser ou à analyser</b>. L’objectif n’est pas d’accumuler des PDF mais de comprendre le bien et sa copropriété.</p>
<ol><li><b>Cadrer</b> — vendeur, lots, annexes, occupants, date de signature visée.</li>
<li><b>Questionner</b> — travaux, tensions, sinistres, impayés, procédures, décisions récentes.</li>
<li><b>Collecter</b> — pièces du vendeur, du syndic et, avec accord, accès temporaire à l’extranet.</li>
<li><b>Contrôler</b> — lire les PV, comparer les charges, repérer ce qui modifiera la commercialisation.</li>
<li><b>Compléter</b> — relancer les pièces manquantes, commander les diagnostics.</li>
<li><b>Anticiper</b> — préparer le pré-état daté avant de fixer le compromis.</li></ol>
<div class="tip"><b>Le bon réflexe :</b> demandez les documents avant même la première offre.</div>` },
  { id: 'extranet', titre: 'L’extranet syndic : protocole recommandé', tags: 'extranet syndic rgpd', html: `
<ul><li>Obtenir une autorisation claire du vendeur.</li><li>Mot de passe temporaire et unique si possible ; double authentification avec le vendeur.</li>
<li>Télécharger uniquement les pièces utiles à la vente.</li><li>Supprimer l’accès et les données inutiles après usage.</li>
<li>Ne jamais conserver le mot de passe dans un courriel ou une note accessible.</li></ul>
<p><b>Alternative :</b> si le vendeur refuse, demandez-lui un export complet des rubriques documents, comptes et appels de fonds.</p>
<h4>Mise en ligne gratuite des documents manquants</h4>
<p>Si un document de la liste minimale manque ou n’est pas à jour sur l’extranet, le vendeur peut demander au syndic professionnel de régulariser gratuitement son espace (art. 18 loi du 10 juillet 1965 ; décret n° 2019-502 ; art. 33-1-1 décret du 17 mars 1967).</p>
<p><b>Immeuble :</b> règlement, EDD et modificatifs ; fiche synthétique et carnet d’entretien ; diagnostics communs, assurances, contrats ; PV des 3 dernières AG ; contrat de syndic.<br>
<b>Lot :</b> compte individuel arrêté ; charges payées sur les 2 derniers exercices ; part du fonds travaux ; avis d’appel des 3 dernières années.</p>` },
  { id: 'lecture', titre: 'Transformer les documents en informations', tags: 'analyse pv fiche règlement', html: `
<table><tr><th>Document</th><th>Ce qu’il faut en tirer</th></tr>
<tr><td>PV d’AG</td><td>Travaux votés ou refusés, appels futurs, procédures, changement de syndic, autorisations, sinistres.</td></tr>
<tr><td>Fiche synthétique</td><td>Nombre de lots, organisation, données financières globales, immatriculation, équipements.</td></tr>
<tr><td>Règlement</td><td>Destination de l’immeuble, usage des lots, clés de charges, restrictions, parties communes spéciales.</td></tr>
<tr><td>Appels de fonds</td><td>Niveau de charges, fonds travaux, échéances, cohérence avec le discours du vendeur.</td></tr>
<tr><td>Décomptes annuels</td><td>Charges réelles, régularisations, consommations, évolution sur deux exercices.</td></tr>
<tr><td>DTG / PPPT / PPT</td><td>État du bâti, scénarios et calendrier de travaux, votes déjà intervenus.</td></tr>
<tr><td>Diagnostics communs</td><td>Risques techniques, performance énergétique, besoins d’investigation.</td></tr></table>
<div class="tip"><b>Convocation ≠ procès-verbal :</b> la convocation contient les projets ; le PV constate les décisions. La présence des comptes dans la convocation ne prouve pas leur approbation.</div>` },
  { id: 'ped', titre: 'Le pré-état daté, c’est quoi ?', tags: 'pré-état daté ped L721-2', html: `
<p>Le « pré-état daté » est le nom d’usage du document qui rassemble les <b>informations financières exigées avant la vente d’un lot de copropriété</b> (CCH, art. L.721-2) :</p>
<ul><li>charges courantes et hors budget payées par le vendeur sur les deux derniers exercices ;</li>
<li>sommes susceptibles d’être dues au syndicat par l’acquéreur ;</li>
<li>impayés globaux de la copropriété et dette envers les fournisseurs ;</li>
<li>part du fonds de travaux attachée au lot et dernière cotisation versée.</li></ul>
<p><b>Pourquoi l’anticiper ?</b> Si ces informations ne sont pas remises au plus tard à la promesse, le délai de rétractation de 10 jours ne court qu’à compter du lendemain de leur communication (art. L.721-3).</p>
<p><b>À ne pas confondre :</b> il n’existe pas de formulaire réglementaire unique ; l’état daté (art. 5 du décret de 1967) est, lui, demandé au syndic pour l’acte authentique.</p>
<h4>Syndic ou prestataire ?</h4>
<table><tr><th>Critère</th><th>Commande au syndic</th><th>Copro-Assistance</th></tr>
<tr><td>Tarif</td><td>314 € TTC en moyenne (120 € à 890 €)*</td><td>60 € TTC tout compris, tous les lots</td></tr>
<tr><td>Délai</td><td>6,8 jours ouvrés en moyenne*</td><td>Sous 24 h (option urgente 4 h ouvrées +40 €)</td></tr>
<tr><td>Actualisation</td><td>Conditions à vérifier</td><td>Offerte pour la même vente</td></tr>
<tr><td>Garantie</td><td>À vérifier</td><td>Remboursé si le notaire refuse le document</td></tr></table>
<p class="small">* Observatoire Copro-Assistance du prix du pré-état daté, édition 2026.</p>
<div class="tip"><b>Libre choix du vendeur :</b> l’art. L.721-2 impose de remettre les informations, pas de commander le pré-état daté au syndic. Sans commande préalable non équivoque (devis accepté), le syndic ne peut ni l’imposer ni le facturer (art. 1113 C. civ. ; DGCCRF).</div>
<p><b>La phrase à dire au vendeur :</b> « Votre syndic facture en moyenne 314 € et met près d’une semaine et demie à établir ce document. Copro-Assistance le prépare en 24 h pour 60 €, et le rembourse si le notaire le refuse. Le choix vous appartient. »</p>` },
  { id: 'appel', titre: 'Lire et comprendre un appel de fonds', tags: 'appel de fonds charges tantièmes', html: `
<p>L’appel de fonds indique une somme <b>à régler à une date d’exigibilité</b>. Il ne prouve pas un paiement.</p>
<p><b>Trois notions :</b> <i>appelé</i> (montant demandé), <i>payé</i> (règlement enregistré), <i>solde</i> (résultat des mouvements à une date donnée).</p>
<h4>Les sept repères</h4>
<ol><li>Immeuble (nom, adresse, syndic)</li><li>Identité et lots</li><li>Nature de chaque somme</li><li>Période (trimestre, exercice, échéance travaux)</li><li>Clé et tantièmes</li><li>Somme à régler : nouvel appel, solde antérieur, total</li><li>Paiement : exigibilité, référence, IBAN du syndicat</li></ol>
<h4>Les catégories</h4>
<ul><li><b>Provisions courantes</b> : budget prévisionnel, souvent trimestrielles.</li><li><b>Travaux votés</b> : opération distincte, vérifier la décision.</li><li><b>Fonds de travaux</b> : cotisation, distincte d’un chantier.</li><li><b>Régularisation</b> : différence charges définitives / provisions, débitrice ou créditrice.</li><li><b>Autres</b> : avances, emprunts, frais individuels.</li></ul>
<div class="tip"><b>Formule :</b> montant global × vos tantièmes ÷ total de la clé = votre part. Ex. 12 000 € × 125 ÷ 10 000 = 150 €.</div>
<div class="warn"><b>Ne multipliez pas le total à payer par quatre</b> pour estimer des charges annuelles : il mélange provisions, travaux, fonds de travaux et soldes. Utilisez les décomptes des exercices.</div>
<h4>Qui paie autour de la vente ?</h4>
<p>Pour les dépenses hors budget, le paiement incombe à celui qui est copropriétaire à la date d’exigibilité. Les accords vendeur/acquéreur n’ont d’effet qu’entre eux. Les sommes du fonds de travaux restent attachées aux lots et ne sont pas remboursées lors de la vente.</p>` },
  { id: 'annexes', titre: 'Comprendre les annexes comptables', tags: 'annexes comptables sru comptes', html: `
<table><tr><th>Annexe</th><th>Ce qu’elle permet de lire</th></tr>
<tr><td>1 — État financier</td><td>Trésorerie, créances, dettes, avances et fonds à la clôture.</td></tr>
<tr><td>2 — Compte de gestion général</td><td>Charges et produits par nature (courant puis travaux).</td></tr>
<tr><td>3 — Opérations courantes</td><td>Charges nettes, provisions et soldes par clé de répartition.</td></tr>
<tr><td>4 — Opérations clôturées</td><td>Résultat des travaux et opérations exceptionnelles clôturés.</td></tr>
<tr><td>5 — Opérations non clôturées</td><td>Avancement et financement des opérations ouvertes.</td></tr></table>
<h4>Contrôles croisés</h4>
<ul><li>Charges courantes : total annexe 2 = total annexe 3.</li><li>Travaux clôturés : partie travaux annexe 2 = total annexe 4.</li><li>Solde en attente sur travaux (compte 12, annexe 1) = somme des soldes E de l’annexe 5.</li><li>État financier équilibré.</li></ul>
<p>Ces égalités vérifient la cohérence des totaux, pas la réalité des prestations ni la bonne clé appliquée au lot.</p>
<h4>Première lecture en 20 minutes</h4>
<ol><li>3 min — exercice, version, approbation, pièces manquantes.</li><li>4 min — annexe 1 et variations de soldes.</li><li>5 min — charges courantes vs budget et N-1 : isoler 2-3 écarts.</li><li>4 min — travaux clôturés / ouverts, concordances.</li><li>4 min — noter constat, montant, source, question.</li></ol>
<div class="warn"><b>Erreurs à éviter :</b> reporter une charge collective comme charge personnelle ; confondre appelé et payé ; prendre le fonds de travaux global pour la part du lot ; déduire les futurs appels de la seule colonne F de l’annexe 5.</div>
<p>Le ratio « créances copropriétaires / budget » est un indicateur de contexte, pas un « taux d’impayés ».</p>` },
  { id: 'transmission', titre: 'Transmettre un dossier lisible au notaire', tags: 'notaire compromis transmission', html: `
<h4>Avant l’envoi</h4><ul><li>Nommer les fichiers avec date, nature et exercice.</li><li>Vérifier que chaque PDF est lisible et complet.</li><li>Distinguer document définitif et projet.</li><li>Lister pièces transmises et manquantes.</li><li>Résumer les alertes sans les masquer ni les dramatiser.</li><li>Indiquer la date de validité des diagnostics.</li></ul>
<h4>Message au notaire</h4><ul><li>Identifier vendeur, bien et lots.</li><li>Coordonnées du syndic.</li><li>Occupation du logement.</li><li>Travaux, sinistres, litiges, particularités.</li><li>Pièces encore attendues.</li><li>Contact chargé du pré-état daté.</li></ul>
<div class="tip">Commandez le pré-état daté dès que le projet est suffisamment avancé, puis faites-le actualiser si une nouvelle AG, un nouvel appel ou un report modifie la situation.</div>` },
  { id: 'exceptions', titre: 'Lots annexes et acquéreur déjà copropriétaire', tags: 'exceptions L721-2 cave parking', html: `
<p>L’article L.721-2 prévoit des exceptions selon le lot vendu (lots annexes : cave, parking…) et la qualité de l’acquéreur (déjà copropriétaire dans l’immeuble). Elles ne dispensent pas de toute information : indiquez la situation au notaire pour déterminer les pièces effectivement requises.</p>
<p>Si les PV n’ont pu être obtenus auprès du syndic, conservez vos demandes et informez le notaire : l’article L.721-2 prévoit ce cas. N’en déduisez pas seul une dispense générale.</p>` },
  { id: 'annonce', titre: 'Mentions obligatoires de l’annonce en copropriété', tags: 'annonce publicité alur', html: `
<ul><li>Le fait que le bien est soumis au statut de la copropriété.</li><li>Le nombre de lots de la copropriété.</li><li>Le montant moyen annuel de la quote-part du vendeur dans le budget prévisionnel (charges courantes).</li><li>Le cas échéant, l’existence d’une procédure en cours (plan de sauvegarde, administration provisoire…).</li><li>Classes énergie (DPE) et climat (GES), estimation des dépenses annuelles d’énergie.</li><li>Prix et honoraires : à la charge de qui, et en % du prix hors honoraires si à la charge de l’acquéreur.</li></ul>` },
];

/* ---------- Inventaire des équipements de la copropriété ---------- */
/* [clé, libellé, type] — type : 'oni' (Oui / Non / Indéterminé), 'num' (nombre), 'select' (liste) */
const EQUIPEMENTS = [
  { titre: 'Extérieur', items: [['cloture', 'Clôture'], ['parkingsExt', 'Parkings extérieurs', 'num'], ['eclairageExt', 'Éclairage extérieur'], ['portail', 'Portail / barrière automatique'],
    ['porteGarage', 'Porte de garage'], ['nbGarages', 'Nombre de garages', 'num'], ['espacesVerts', 'Espaces verts'], ['sprinkler', 'Sprinkler'], ['aireJeux', 'Aire de jeux'], ['tennis', 'Court de tennis']] },
  { titre: 'Contrôle d’accès', items: [['interphone', 'Interphone'], ['videophone', 'Vidéophone'], ['digicode', 'Digicode'], ['telpass', 'Telpass'], ['vigik', 'Vigik'],
    ['gardien', 'Gardien (loge)'], ['alarme', 'Alarme'], ['horloge', 'Horloge automatique']] },
  { titre: 'Équipements divers', items: [['antenne', 'Antenne collective'], ['antenneType', 'Si oui, de quel type ?', 'select', ['', 'Hertzienne (TNT)', 'Parabole satellite', 'Hertzienne + satellite', 'Autre']],
    ['fibre', 'Fibre optique'], ['cable', 'Réseau câblé'], ['monteCharge', 'Monte-charge'], ['telesurveillance', 'Télésurveillance'], ['groupeElectrogene', 'Groupe électrogène'],
    ['aspersion', 'Système d’aspersion sécurité incendie', 'num'], ['detectionIncendie', 'Détection incendie'], ['vmc', 'VMC'], ['climatisation', 'Climatisation'], ['surpresseur', 'Surpresseur'],
    ['pompeRelevage', 'Pompe de relevage'], ['colonneSeche', 'Colonne sèche'], ['videOrdures', 'Vide-ordures'], ['blocSecours', 'Bloc de secours'], ['fermePorte', 'Ferme-porte'],
    ['porteCoupeFeu', 'Porte coupe-feu'], ['colonneTerre', 'Colonne de terre'], ['assainissement', 'Assainissement collectif ou communal'], ['extracteurs', 'Extracteurs']] },
  { titre: 'Réseau sanitaire', items: [['eauFroideColl', 'Eau froide collective'], ['eauChaudeColl', 'Eau chaude collective']] },
  { titre: 'Compteurs', items: [['cptEauFroide', 'Eau froide'], ['cptEauChaude', 'Eau chaude'], ['releveDistance', 'Relevés à distance'], ['cptCalories', 'De calories'], ['repartiteurs', 'Répartiteurs de calories']] },
];

/* ---------- Mentions obligatoires d'une annonce (Service Public, vérifié le 12/09/2025) ---------- */
const MENTIONS_ANNONCE = [
  ['Type de bien (appartement, loft…)', d => !!d.bien.type],
  ['Prix de vente', d => !!num(d.com.prixActuel || d.mandat.prix)],
  ['Situation géographique', d => !!d.bien.ville],
  ['Superficie et composition', d => !!d.bien.surface && !!d.bien.pieces],
  ['État du bien (travaux à prévoir, rénové…)', d => !!(d.com.annonce.etat)],
  ['Bien soumis au statut de la copropriété', () => true],
  ['Nombre de lots de la copropriété', d => !!d.copro.nbLots],
  ['Montant moyen annuel des charges payées par le vendeur', d => !!num(d.copro.charges)],
  ['Procédure en cours (mesures préventives, plan de sauvegarde…) ou absence vérifiée', d => d.copro.procedure !== '?'],
  ['DPE : classes énergie et climat, dépenses annuelles estimées et année de référence', d => !!d.bien.dpe && !!d.bien.ges],
  ['Mention « logement à consommation énergétique excessive » si classé F ou G', d => !['F', 'G'].includes(d.bien.dpe) || true],
  ['Mention Géorisques : « Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques : www.georisques.gouv.fr »', () => true],
  ['Honoraires : à la charge de qui ; si acquéreur : prix avec et sans honoraires + pourcentage TTC', d => !!d.mandat.charge],
  ['Agence : numéro SIREN et mention de l’inscription au guichet unique (ou RSAC du mandataire)', () => !!(App.settings.agent.siren || App.settings.agent.rsac)],
];

/* ---------- Classification automatique de fichiers ---------- */
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\-.]+/g, ' ');
}
function guessPiece(filename) {
  const n = normalize(filename);
  let best = null, bestLen = 0;
  for (const p of PIECES) for (const k of (p.kw || [])) {
    const kk = normalize(k);
    if (kk && n.includes(kk) && kk.length > bestLen) { best = p.id; bestLen = kk.length; }
  }
  return best;
}
