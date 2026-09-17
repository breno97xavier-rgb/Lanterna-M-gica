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
  | 'INTERNAL_ERROR';

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
  tmdbPersonId: number;
  name: string;
  originalName: string;
  character: string;
  order: number;
  profilePath: string | null;
  profileUrl: string | null;
}

export interface TmdbMovieCrewMember {
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

