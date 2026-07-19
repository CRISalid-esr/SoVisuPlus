/**
 * Employee position labels by HCERES corps code, generated from
 * crisalid-directory-bridge/conf/employee_types.yml (HCERES RH nomenclature,
 * local_values dropped). Labels are French only — the nomenclature has no
 * official English translation, so they are displayed as-is in every locale.
 */
export const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  PR: 'Professeur',
  DIR: "Directeur d'études",
  Phys: 'Physicien',
  Astro: 'Astronome',
  PUPH: 'Professeur des université-Praticien hospitalier',
  PR_AutMin: "Professeur des établissements dépendant d'autres ministères",
  MCF: 'Maître de conférences',
  Phys_adj: 'Physicien adjoint',
  Astro_adj: 'Astronome adjoint',
  MCUPH: 'Maître de conférences des universités-Praticiens hospitaliers',
  MC_AutMin:
    "Maître de conférences ou Maître assistant des établissements dépendant d'autres ministères",
  PREM: 'Professeur émérite',
  MCFEM: 'Maître de conférences émérite',
  CCA: 'Chef de clinique assistant',
  AHU: 'Attaché hospitalier universitaire',
  PHU: 'Praticien hospitalier universitaire',
  ECC: 'Enseignant-chercheur contractuel (dont contrats LRU)',
  PAST: 'Enseignant-chercheur associé (MC, PR à temps partiel ou temps plein)',
  ChPJ: 'Chaire de professeur junior',
  EC_CDD:
    'Enseignant-chercheur en contrat à durée déterminée sans préciser la catégorie',
  EC_CDI:
    'Enseignant-chercheur en contrat à durée indéterminée sans préciser la catégorie',
  Autre_EC: 'Autre statut',
  DR: 'Directeur de recherche et assimilés',
  CR: 'Chargé de recherche et assimilés',
  'CS-CEA': 'Cadre scientifique CEA',
  CBIB: 'Conservateur des bibliothèques',
  CPAT: 'Conservateur du patrimoine',
  DREM: 'Directeur de recherche émérite',
  'CS-CEA-NP': 'Cadre scientifique CEA - non permanent',
  CJC: 'Contrat jeune chercheur (CDD 3 / 5 ans, ATIP-Avenir)',
  ATER: "Attaché temporaire d'enseignement et de recherche",
  'Post-doc': 'Post-doctorant',
  Docteur: 'Docteur en médecine, pharmacie, etc.',
  Invité:
    "Visiteur : professeur invité et chercheur invité, ayant séjourné au moins 3 mois au sein de l'unité",
  PATP: "Personnel associé à temps partiel, doit faire l'objet d'une convention d'accueil",
  Ch_CDD: 'Chercheur en contrat à durée déterminée sans préciser la catégorie',
  Ch_CDI:
    'Chercheur en contrat à durée indéterminée sans préciser la catégorie',
  Autre_Ch: 'Autre statut',
  PRAG: 'Professeur agrégé',
  PCAP: 'Professeur certifié',
  IR: 'Ingénieur de recherche',
  IE: "Ingénieur d'études",
  AI: 'Assistant ingénieur',
  TECH: 'Technicien de recherche',
  AJT: 'Adjoint technique de recherche',
  ADMAENES:
    "Administrateur de l'éducation nationale et de l'enseignement supérieur, Conseiller d'administration scolaire et universitaire",
  ADAENES:
    "Attaché et Attaché principal d'administration de l'éducation nationale et de l'enseignement supérieur",
  SAENES:
    "Secrétaire administratif de l'éducation nationale et de l'enseignement supérieur",
  ADJAENES:
    "Adjoint d'administration de l'éducation nationale et de l'enseignement supérieur",
  'NCS-CEA': 'Non cadre scientifique CEA',
  'CA-CEA': 'Cadre administratif CEA',
  'NCA-CEA': 'Non cadre administratif CEA',
  BIB: "Bibliothécaire d'état",
  BIBAS: 'Bibliothécaire assistant spécialisé',
  ASBIB: 'Assistant des bibliothèques',
  MABIB: 'Magasinier et magasinier principal des bibliothèques',
  PH: 'Praticien hospitalier',
  AJH: 'Adjoint administratif, technique, ouvrier, agent de service hospitaliers',
  ASPM: 'Aide-soignant, auxiliaire de puériculture, aide médico-psychologique',
  SEC: 'Secrétaire hospitalier',
  TEC: 'Technicien hospitalier',
  INF: 'Infirmier',
  SF: 'Sage-femme',
  ARC: 'Attaché de recherche clinique',
  CS: 'Cadre de santé',
  Igh: 'Ingénieur hospitalier',
  CP: 'Chef de projet (en milieu hospitalier)',
  PAR_CDD:
    "Personnel d'appui à la recherche en contrat à durée déterminée sans préciser la catégorie",
  PAR_CDI:
    "Personnel d'appui à la recherche en contrat à durée indéterminée sans préciser la catégorie",
  Autre_PAR: 'Autre statut',
  'NCS-CEA_NP': 'Non cadre scientifique CEA - non permanent',
  'CA-CEA-NP': 'Cadre administratif CEA - non permanent',
  'NCA-CEA-NP': 'Non cadre administratif CEA - non permanent',
  Stag: "Stagiaire BTS, M1 ou M2 présent au moins 3 mois dans l'unité",
}

/** Full label for a corps code; unknown codes are shown as-is. */
export const employeeTypeLabel = (code: string): string =>
  EMPLOYEE_TYPE_LABELS[code] ?? code
