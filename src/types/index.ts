export type ProvinceMZ =
  | 'Maputo Cidade'
  | 'Maputo Província'
  | 'Gaza'
  | 'Inhambane'
  | 'Sofala'
  | 'Manica'
  | 'Tete'
  | 'Zambézia'
  | 'Nampula'
  | 'Cabo Delgado'
  | 'Niassa'
  | 'Não informado'
  | 'Todo Moçambique'
  | 'Remoto';

export type ProfessionalArea =
  | 'Cybersecurity'
  | 'Software Engineering'
  | 'Database Administration'
  | 'Data Analysis'
  | 'Systems Analysis'
  | 'Network Engineering'
  | 'Information Technology'
  | 'Artificial Intelligence'
  | 'Telecommunications'
  | 'Cloud Computing'
  | 'IT Support'
  | 'Engenharia'
  | 'Contabilidade e Finanças'
  | 'Administração'
  | 'Recursos Humanos'
  | 'Saúde'
  | 'Educação'
  | 'Logística'
  | 'Marketing'
  | 'Construção'
  | 'Indústria'
  | 'Comércio'
  | 'Outras áreas';

export type ContractType =
  | 'Estágio Profissional'
  | 'Programa de Trainees'
  | 'Tempo Inteiro'
  | 'Contrato a Prazo'
  | 'Consultoria / Freelance'
  | 'Não informado';

export type OpportunityKind = 'Estágio' | 'Emprego' | 'Trainee';

export type WorkMode = 'Presencial' | 'Remoto' | 'Híbrido' | 'Não informado';

export type ExperienceLevel =
  | 'Estudante / Estágio'
  | 'Júnior / Entry-Level'
  | 'Pleno / Mid-Level'
  | 'Sénior'
  | 'Não informado';

export type ApplicationStatus =
  | 'Pretendo candidatar-me'
  | 'Candidatura preparada'
  | 'Candidatura enviada'
  | 'Em análise'
  | 'Contactado'
  | 'Entrevista marcada'
  | 'Teste técnico'
  | 'Proposta recebida'
  | 'Aceite'
  | 'Rejeitada'
  | 'Desistência';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Pretendo candidatar-me',
  'Candidatura preparada',
  'Candidatura enviada',
  'Em análise',
  'Contactado',
  'Entrevista marcada',
  'Teste técnico',
  'Proposta recebida',
  'Aceite',
  'Rejeitada',
  'Desistência',
];

export const MOZAMBIQUE_PROVINCES: ProvinceMZ[] = [
  'Maputo Cidade',
  'Maputo Província',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa',
  'Não informado',
  'Todo Moçambique',
  'Remoto',
];

export const TECH_AREAS: ProfessionalArea[] = [
  'Cybersecurity',
  'Software Engineering',
  'Database Administration',
  'Data Analysis',
  'Systems Analysis',
  'Network Engineering',
  'Information Technology',
  'Artificial Intelligence',
  'Telecommunications',
  'Cloud Computing',
  'IT Support',
];

export const ALL_PROFESSIONAL_AREAS: ProfessionalArea[] = [
  ...TECH_AREAS,
  'Engenharia',
  'Contabilidade e Finanças',
  'Administração',
  'Recursos Humanos',
  'Saúde',
  'Educação',
  'Logística',
  'Marketing',
  'Construção',
  'Indústria',
  'Comércio',
  'Outras áreas',
];

export interface JobSourceRef {
  sourceId: string;
  sourceName: string;
  canonicalUrl: string;
  verifiedAt: string;
  isOfficialCareerPage?: boolean;
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  companyId?: string;
  location: string;
  province: ProvinceMZ;
  city: string;
  area: ProfessionalArea;
  contractType: ContractType;
  opportunityKind: OpportunityKind;
  workMode: WorkMode;
  remoteOpenToMZ: boolean;
  experienceLevel: ExperienceLevel;
  publishedAt: string;
  deadline: string; // ISO date string or 'Não informado'
  salaryRange: string; // e.g. 'Não informado' or disclosed string
  description: string;
  responsibilities: string[];
  requirements: string[];
  desiredSkills: string[];
  benefits: string[];
  sources: JobSourceRef[];
  lastVerifiedAt: string;
  availabilityStatus: 'Activa' | 'Prazo próximo' | 'Expirada' | 'Por confirmar';
  provenance: 'real_verified' | 'manual_verified' | 'feed_imported' | 'manual_unverified' | 'demonstration';
  isDemo: boolean;
}

export interface SavedJobRecord {
  jobId: string;
  savedAt: string;
  customArea?: ProfessionalArea;
  notes?: string;
}

export interface ApplicationContact {
  id: string;
  name: string;
  role: string;
  contactInfo: string;
}

export interface ApplicationInterview {
  id: string;
  date: string;
  format: 'Presencial' | 'Online / Vídeo' | 'Telefone' | 'Teste Técnico';
  notes: string;
  completed: boolean;
}

export interface ApplicationHistoryEntry {
  status: ApplicationStatus;
  timestamp: string;
  note?: string;
}

export interface ApplicationDocumentChecklist {
  cvUpdated: boolean;
  coverLetter: boolean;
  certificates: boolean;
  biAndNuit: boolean;
  portfolioOrLinkedin: boolean;
}

export interface JobApplicationRecord {
  isDemo?: boolean;
  id: string;
  jobId?: string;
  jobTitle: string;
  company: string;
  location: string;
  area: ProfessionalArea;
  officialUrl: string;
  status: ApplicationStatus;
  appliedDate: string;
  deadline: string;
  notes: string;
  nextAction: string;
  nextActionDate?: string;
  contacts: ApplicationContact[];
  interviews: ApplicationInterview[];
  documentChecklist?: ApplicationDocumentChecklist;
  isExternal: boolean;
  updatedAt: string;
  history: ApplicationHistoryEntry[];
}

export interface UserProfile {
  id: string;
  name: string;
  areasOfInterest: ProfessionalArea[];
  preferredProvinces: ProvinceMZ[];
  skills: string[];
  experienceLevel: ExperienceLevel;
  education: string;
  preferredContracts: ContractType[];
  interestedInInternships: boolean;
  openToRemote: boolean;
  updatedAt: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  sector: string;
  location: string;
  province: ProvinceMZ;
  officialWebsite: string;
  careersUrl: string;
  description: string;
  verifiedSource: string;
  isDemo: boolean;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  category: 'API Pública' | 'RSS / Atom' | 'Página Oficial de Carreiras' | 'Importação Manual';
  endpointUrl: string;
  enabled: boolean;
  lastSyncAt: string | null;
  lastStatus: 'sincronizado' | 'por_configurar' | 'indisponivel' | 'a_sincronizar';
  statusMessage: string;
  itemsCollected: number;
}

export interface CareerAlert {
  id: string;
  type: 'prazo_proximo' | 'entrevista' | 'acompanhamento' | 'estagio_relevante' | 'nova_vaga';
  severity: 'alta' | 'media' | 'info';
  title: string;
  description: string;
  relatedJobId?: string;
  relatedApplicationId?: string;
  dateLabel: string;
  read: boolean;
}

export interface JobFilterState {
  query: string;
  province: ProvinceMZ | 'Todas';
  city: string;
  area: ProfessionalArea | 'Todas';
  contractType: ContractType | 'Todos';
  opportunityKind: OpportunityKind | 'Todos';
  workMode: WorkMode | 'Todos';
  experienceLevel: ExperienceLevel | 'Todos';
  publishedWithinDays: number | 'all';
  onlyActiveDeadlines: boolean;
  onlyDisclosedSalary: boolean;
  includeDemo: boolean;
  sortBy: 'recent' | 'deadline' | 'match' | 'company';
}

export type ActivePage =
  | 'dashboard'
  | 'explorar'
  | 'estagios'
  | 'guardadas'
  | 'candidaturas'
  | 'empresas'
  | 'alertas'
  | 'perfil'
  | 'definicoes';
