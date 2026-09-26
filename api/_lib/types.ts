// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Tipagens e DTOs da Camada Server-Side TMDB
// Arquivo: api/_lib/types.ts
// ==============================================================================

export type ApiErrorCode =
  | 'INVALID_PARAMS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR'
  | 'STALE_RECONCILIATION'
  | 'EXECUTION_LOCKED_PENDING_HOMOLOGATION'
  | 'CONFIRMATION_REQUIRED'
  | 'RPC_ERROR';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

// ------------------------------------------------------------------------------
// DTOs para Filmes
// ------------------------------------------------------------------------------

export interface TmdbMovieSummary {
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseDate: string | null;
  year: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
  overview: string;
  originalLanguage: string;
  popularity?: number;
  voteAverage?: number;
}

export interface TmdbMovieSearchResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: TmdbMovieSummary[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TmdbMovieDetails {
  tmdbId: number;
  title: string;
  originalTitle: string;
  originalLanguage: string;
  overview: string;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
  genres: TmdbGenre[];
  productionCountries: TmdbProductionCountry[];
  imdbId: string | null;
  tagline?: string | null;
  status?: string;
}

export interface TmdbMovieCastMember {
  creditId: string;
  tmdbPersonId: number;
  name: string;
  originalName: string;
  character: string;
  order: number;
  castId?: number;
  profilePath: string | null;
  profileUrl: string | null;
}

export interface TmdbMovieCrewMember {
  creditId: string;
  tmdbPersonId: number;
  name: string;
  originalName: string;
  department: string;
  job: string;
  profilePath: string | null;
  profileUrl: string | null;
}

export interface TmdbMovieCredits {
  tmdbMovieId: number;
  cast: TmdbMovieCastMember[];
  crew: TmdbMovieCrewMember[];
}

// ------------------------------------------------------------------------------
// DTOs para Pessoas
// ------------------------------------------------------------------------------

export interface TmdbPersonSummary {
  tmdbId: number;
  name: string;
  knownForDepartment: string;
  profilePath: string | null;
  profileUrl: string | null;
  knownFor: string[];
}

export interface TmdbPersonSearchResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: TmdbPersonSummary[];
}

export interface TmdbPersonDetails {
  tmdbId: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profilePath: string | null;
  profileUrl: string | null;
  knownForDepartment: string;
  imdbId: string | null;
  alsoKnownAs?: string[];
}

export interface TmdbPersonCastCredit {
  tmdbMovieId: number;
  title: string;
  character: string;
  releaseDate: string | null;
  year: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  mediaType?: string;
}

export interface TmdbPersonCrewCredit {
  tmdbMovieId: number;
  title: string;
  department: string;
  job: string;
  releaseDate: string | null;
  year: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  mediaType?: string;
}

export interface TmdbPersonCredits {
  tmdbPersonId: number;
  cast: TmdbPersonCastCredit[];
  crew: TmdbPersonCrewCredit[];
}

// ------------------------------------------------------------------------------
// DTOs para Importação Controlada e Reconciliação (F10.3 / F10.3H)
// ------------------------------------------------------------------------------

export interface TmdbMovieImportRequest {
  tmdbId: number;
}

export interface TmdbMovieImportResult {
  success: boolean;
  filmId: string;
  slug: string;
  title: string;
  originalTitle?: string | null;
  year: number;
  tmdbId: number;
  status: string;
  alreadyExists?: boolean;
  message?: string;
}

export interface TmdbMovieLinkRequest {
  internalFilmId: string;
  tmdbId: number;
}

export interface TmdbMovieLinkResult {
  success: boolean;
  filmId: string;
  tmdbId: number;
  message?: string;
}

// ------------------------------------------------------------------------------
// DTOs para Reconciliação e Preview de Créditos / Pessoas (F10.4E)
// ------------------------------------------------------------------------------

export type PersonMatchStatus =
  | 'EXACT_TMDB_MATCH'
  | 'POSSIBLE_LOCAL_MATCH'
  | 'AMBIGUOUS'
  | 'NEW_PERSON';

export interface PersonMatchSignals {
  exactTmdbIdMatch?: boolean;
  normalizedNameMatch?: boolean;
  originalNameMatched?: string;
  localName?: string;
  birthYearMatch?: boolean;
  tmdbBirthYear?: number | null;
  localBirthYear?: number | null;
  deathYearMatch?: boolean;
  tmdbDeathYear?: number | null;
  localDeathYear?: number | null;
  countryMatch?: boolean;
  tmdbCountry?: string | null;
  localCountry?: string | null;
  imdbIdMatch?: boolean;
  hasLocalCreditsInFilm?: boolean;
  otherLocalTmdbIdConflict?: number | null;
  confidenceNotes: string[];
}

export interface SuggestedPersonCandidate {
  localPersonId: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  birthDate: string | null;
  deathDate: string | null;
  country: string | null;
  isEditorialProfile: boolean;
  status: string;
  existingRolesInFilm: string[];
  signals: PersonMatchSignals;
}

export interface ReconciledPerson {
  tmdbPersonId: number;
  name: string;
  originalName: string;
  profilePath: string | null;
  profileUrl: string | null;
  status: PersonMatchStatus;
  statusDescription: string;
  matchedLocalPersonId: string | null;
  matchedLocalPerson?: {
    id: string;
    name: string;
    slug: string;
    photoUrl: string | null;
    isEditorialProfile: boolean;
    status: string;
  } | null;
  suggestedCandidates: SuggestedPersonCandidate[];
  signals: PersonMatchSignals;
}

export type LocalCreditComparisonStatus =
  | 'EXACT_LOCAL_CREDIT'
  | 'SEMANTIC_LOCAL_CREDIT'
  | 'NEW_CREDIT';

export interface ReconciledCreditItem {
  id: string; // ID provisório determinístico do preview
  source: 'TMDB' | 'LOCAL';
  tmdbPersonId: number | null;
  personId: string | null;
  personName: string;
  personPhotoUrl: string | null;
  personMatchStatus: PersonMatchStatus | 'LOCAL_ONLY';
  suggestedLocalPersonId: string | null;
  department: string;
  role: string | null;
  characterName: string | null;
  orderIndex: number;
  isDefaultSelected: boolean;
  isCast: boolean;
  // Classificação semântica em relação ao crédito local (F10.4E-C2B)
  localCreditComparisonStatus: LocalCreditComparisonStatus;
  localCreditId: string | null;
  localDepartment: string | null;
  localRole: string | null;
  localCharacterName: string | null;
  localOrderIndex: number | null;
  semanticEquivalenceReason: string | null;
  // Compatibilidade legada para o modal
  creditComparisonStatus:
    | 'EXACT_LOCAL_MATCH'
    | 'SEMANTIC_LOCAL_MATCH'
    | 'NEW_CREDIT_EXISTING_PERSON'
    | 'NEW_CREDIT_POSSIBLE_PERSON'
    | 'NEW_CREDIT_NEW_PERSON'
    | 'NEW_CREDIT_AMBIGUOUS_PERSON'
    | 'LOCAL_ONLY_PRESERVED';
  existingLocalCreditId: string | null;
}

export interface LocalOnlyCreditItem {
  localCreditId: string;
  personId: string | null;
  personName: string;
  personSlug: string | null;
  personPhotoUrl: string | null;
  department: string;
  role: string | null;
  characterName: string | null;
  orderIndex: number;
  statusText: string;
}

export interface CreditsReconcileRequest {
  filmId: string;
}

export interface CreditsReconcileSummary {
  totalTmdbCrew: number;
  totalTmdbCast: number;
  totalTmdbUniquePeople: number;
  totalLocalCredits: number;
  exactTmdbMatchesCount: number;
  possibleLocalMatchesCount: number;
  ambiguousCount: number;
  newPeopleCount: number;
  defaultSelectedCount: number;
  localOnlyPreservedCount: number;
  // Contadores semânticos de créditos (F10.4E-C2B)
  exactLocalCreditsCount: number;
  semanticLocalCreditsCount: number;
  newCreditsCount: number;
}

export interface CreditsReconcileResponse {
  film: {
    id: string;
    title: string;
    originalTitle: string | null;
    year: number;
    slug: string;
    tmdbId: number;
    status: string;
    updatedAt?: string | null;
    updated_at?: string | null;
  };
  baseUpdatedAt?: string | null;
  summary: CreditsReconcileSummary;
  people: ReconciledPerson[];
  credits: ReconciledCreditItem[];
  localOnlyCredits: LocalOnlyCreditItem[];
}

// ------------------------------------------------------------------------------
// Contrato de Decisões e Execução Transacional (F10.4E-D1)
// ------------------------------------------------------------------------------

export interface PersonSyncDecisionItem {
  tmdbPersonId: number;
  action: 'LINK_EXISTING' | 'CREATE_NEW';
  localPersonId?: string; // Obrigatório se LINK_EXISTING
}

export interface CreditsSyncExecuteRequest {
  filmId: string;
  baseUpdatedAt?: string;
  selectedCredits: string[]; // Identificadores canônicos dos créditos TMDB escolhidos
  personDecisions: PersonSyncDecisionItem[];
  dryRun?: boolean; // Se true, apenas monta e valida o payload sem bloquear
  confirmExecution?: boolean; // Obrigatório true para execução real (dryRun: false)
}

export interface RpcPersonsToLinkItem {
  local_person_id: string;
  tmdb_person_id: number;
}

export interface RpcPersonsToCreateItem {
  tmdb_person_id: number;
  name: string;
  slug: string;
  photo_url: string | null;
  birth_date: string | null;
  death_date: string | null;
  imdb_id: string | null;
  bio: string | null;
  known_for_department: string | null;
}

export interface RpcCreditsToSyncItem {
  tmdb_person_id: number;
  department: string;
  role: string | null;
  character_name: string | null;
  order_index: number;
}

export interface RpcSyncFilmCreditsPayload {
  p_film_id: string;
  p_tmdb_id: number;
  p_persons_to_link: RpcPersonsToLinkItem[];
  p_persons_to_create: RpcPersonsToCreateItem[];
  p_credits_to_sync: RpcCreditsToSyncItem[];
  p_user_id: string;
}

export type PersonSyncDecisionAction = 'LINK_EXISTING' | 'CREATE_NEW' | 'REUSE_EXACT' | 'IGNORE';
export type PersonSyncDecision = PersonSyncDecisionItem;
export interface SelectedCreditDecision {
  tmdbPersonId: number;
  department: string;
  role?: string | null;
  characterName?: string | null;
  orderIndex: number;
}

export interface CreditsSyncExecuteSummary {
  totalSelectedCredits: number;
  exactLocalCreditsPreserved: number;
  semanticLocalCreditsPreserved: number;
  newCreditsInserted: number;
  personsToLinkCount: number;
  personsToCreateCount: number;
  distinctPersonsInSelectionCount: number;
}

export interface CreditsSyncExecuteResult {
  success: boolean;
  locked?: boolean;
  dryRun?: boolean;
  filmId: string;
  tmdbId: number;
  createdPeopleCount?: number;
  linkedPeopleCount?: number;
  insertedCreditsCount?: number;
  updatedCreditsCount?: number;
  unchangedCreditsCount?: number;
  semanticCreditsReusedCount?: number;
  storageCreatedCount?: number;
  storageReusedCount?: number;
  warnings?: string[];
  executionStatus?: 'PREVIEW' | 'DRY_RUN' | 'SUCCESS' | 'BLOCKED';
  payload?: RpcSyncFilmCreditsPayload;
  summary?: CreditsSyncExecuteSummary;
  message?: string;
}


