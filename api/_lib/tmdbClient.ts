// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Cliente Server-Side TMDB Seguro (The Movie Database v3)
// Arquivo: api/_lib/tmdbClient.ts
// ==============================================================================

import { AppError } from './errors.js';
import {
  TmdbMovieSummary,
  TmdbMovieSearchResult,
  TmdbMovieDetails,
  TmdbMovieCredits,
  TmdbMovieCastMember,
  TmdbMovieCrewMember,
  TmdbPersonSummary,
  TmdbPersonSearchResult,
  TmdbPersonDetails,
  TmdbPersonCredits,
  TmdbPersonCastCredit,
  TmdbPersonCrewCredit,
} from './types.js';

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_POSTER = 'https://image.tmdb.org/t/p/w780';
const TMDB_IMAGE_BASE_BACKDROP = 'https://image.tmdb.org/t/p/original';
const TMDB_IMAGE_BASE_PROFILE = 'https://image.tmdb.org/t/p/h632';

export function buildTmdbImageUrl(
  path: string | null | undefined,
  type: 'poster' | 'backdrop' | 'profile'
): string | null {
  if (!path || typeof path !== 'string') return null;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (type === 'poster') return `${TMDB_IMAGE_BASE_POSTER}${cleanPath}`;
  if (type === 'backdrop') return `${TMDB_IMAGE_BASE_BACKDROP}${cleanPath}`;
  if (type === 'profile') return `${TMDB_IMAGE_BASE_PROFILE}${cleanPath}`;
  return null;
}

/**
 * Executa requisição HTTP segura contra a API do TMDB
 */
async function fetchTmdb<T>(endpoint: string, queryParams: Record<string, string | number | undefined> = {}): Promise<T> {
  const readAccessToken = (process.env.TMDB_READ_ACCESS_TOKEN || '').trim();
  const apiKey = (process.env.TMDB_API_KEY || '').trim();

  if (!readAccessToken && !apiKey) {
    console.error('[TMDB Client] Credenciais TMDB não configuradas no servidor (TMDB_READ_ACCESS_TOKEN ou TMDB_API_KEY ausente).');
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Configuração da API TMDB ausente no servidor. Defina TMDB_READ_ACCESS_TOKEN nas variáveis de ambiente.'
    );
  }

  const url = new URL(`${TMDB_API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  // Parâmetros padrão
  url.searchParams.set('language', 'pt-BR');

  // Adiciona parâmetros customizados fornecidos
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  // Fallback para API Key v3 se Token v4 Bearer não estiver configurado
  if (!readAccessToken && apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (readAccessToken) {
    headers['Authorization'] = `Bearer ${readAccessToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      throw new AppError(404, 'NOT_FOUND', 'Entidade não encontrada no catálogo do TMDB.');
    }

    if (response.status === 401 || response.status === 403) {
      console.error('[TMDB Client] Chave de API ou Token TMDB rejeitado pelo serviço upstream.');
      throw new AppError(
        502,
        'UPSTREAM_ERROR',
        'Falha de autenticação com o serviço TMDB. Verifique as credenciais no servidor.'
      );
    }

    if (response.status === 429) {
      throw new AppError(429, 'RATE_LIMITED', 'Limite de requisições ao TMDB atingido. Tente novamente em instantes.');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[TMDB Client] Erro upstream TMDB HTTP ${response.status}:`, errorText.slice(0, 300));
      throw new AppError(
        502,
        'UPSTREAM_ERROR',
        `O serviço TMDB retornou um erro temporário (HTTP ${response.status}).`
      );
    }

    const data = await response.json();
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof AppError) {
      throw err;
    }
    if (err.name === 'AbortError') {
      throw new AppError(504, 'UPSTREAM_ERROR', 'Tempo limite excedido ao comunicar com o TMDB (Timeout 10s).');
    }
    console.error('[TMDB Client] Erro de rede ao consultar TMDB:', err?.message || err);
    throw new AppError(502, 'UPSTREAM_ERROR', 'Não foi possível conectar ao serviço TMDB.');
  }
}

// ------------------------------------------------------------------------------
// Métodos de Filmes
// ------------------------------------------------------------------------------

/**
 * Busca filmes por título e ano opcional
 */
export async function searchMovies(
  query: string,
  year?: number,
  page: number = 1
): Promise<TmdbMovieSearchResult> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    throw new AppError(400, 'INVALID_PARAMS', 'O parâmetro "query" é obrigatório para busca de filmes.');
  }

  const queryParams: Record<string, string | number | undefined> = {
    query: cleanQuery,
    page: Math.max(1, page),
    include_adult: 'false',
  };

  if (year && !isNaN(year) && year >= 1880 && year <= 2100) {
    queryParams['primary_release_year'] = year;
  }

  const raw = await fetchTmdb<any>('/search/movie', queryParams);

  const results: TmdbMovieSummary[] = Array.isArray(raw.results)
    ? raw.results.map((m: any) => {
        const releaseDate = m.release_date || null;
        let yearNum: number | null = null;
        if (releaseDate && typeof releaseDate === 'string') {
          const parsed = parseInt(releaseDate.slice(0, 4), 10);
          if (!isNaN(parsed)) yearNum = parsed;
        }

        return {
          tmdbId: m.id,
          title: m.title || m.original_title || '',
          originalTitle: m.original_title || m.title || '',
          releaseDate,
          year: yearNum,
          posterPath: m.poster_path || null,
          posterUrl: buildTmdbImageUrl(m.poster_path, 'poster'),
          backdropPath: m.backdrop_path || null,
          backdropUrl: buildTmdbImageUrl(m.backdrop_path, 'backdrop'),
          overview: m.overview || '',
          originalLanguage: m.original_language || 'en',
          popularity: m.popularity,
          voteAverage: m.vote_average,
        };
      })
    : [];

  return {
    page: raw.page || 1,
    totalPages: raw.total_pages || 1,
    totalResults: raw.total_results || results.length,
    results,
  };
}

/**
 * Obtém detalhes completos de um filme por tmdb_id
 */
export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  if (!id || isNaN(id) || id <= 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador de filme do TMDB inválido.');
  }

  const raw = await fetchTmdb<any>(`/movie/${id}`, {
    append_to_response: 'external_ids',
  });

  const releaseDate = raw.release_date || null;
  let yearNum: number | null = null;
  if (releaseDate && typeof releaseDate === 'string') {
    const parsed = parseInt(releaseDate.slice(0, 4), 10);
    if (!isNaN(parsed)) yearNum = parsed;
  }

  const genres = Array.isArray(raw.genres)
    ? raw.genres.map((g: any) => ({ id: g.id, name: g.name }))
    : [];

  const productionCountries = Array.isArray(raw.production_countries)
    ? raw.production_countries.map((c: any) => ({
        iso_3166_1: c.iso_3166_1,
        name: c.name,
      }))
    : [];

  const imdbId = raw.external_ids?.imdb_id || raw.imdb_id || null;

  return {
    tmdbId: raw.id,
    title: raw.title || raw.original_title || '',
    originalTitle: raw.original_title || raw.title || '',
    originalLanguage: raw.original_language || 'en',
    overview: raw.overview || '',
    releaseDate,
    year: yearNum,
    runtime: typeof raw.runtime === 'number' ? raw.runtime : null,
    posterPath: raw.poster_path || null,
    posterUrl: buildTmdbImageUrl(raw.poster_path, 'poster'),
    backdropPath: raw.backdrop_path || null,
    backdropUrl: buildTmdbImageUrl(raw.backdrop_path, 'backdrop'),
    genres,
    productionCountries,
    imdbId,
    tagline: raw.tagline || null,
    status: raw.status || undefined,
  };
}

/**
 * Obtém créditos (elenco e equipe técnica) de um filme
 */
export async function getMovieCredits(id: number): Promise<TmdbMovieCredits> {
  if (!id || isNaN(id) || id <= 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador de filme do TMDB inválido.');
  }

  const raw = await fetchTmdb<any>(`/movie/${id}/credits`);

  const cast: TmdbMovieCastMember[] = Array.isArray(raw.cast)
    ? raw.cast.map((c: any) => ({
        tmdbPersonId: c.id,
        name: c.name || c.original_name || '',
        originalName: c.original_name || c.name || '',
        character: c.character || '',
        order: typeof c.order === 'number' ? c.order : 999,
        profilePath: c.profile_path || null,
        profileUrl: buildTmdbImageUrl(c.profile_path, 'profile'),
      }))
    : [];

  const crew: TmdbMovieCrewMember[] = Array.isArray(raw.crew)
    ? raw.crew.map((c: any) => ({
        tmdbPersonId: c.id,
        name: c.name || c.original_name || '',
        originalName: c.original_name || c.name || '',
        department: c.department || 'Outro',
        job: c.job || c.department || '',
        profilePath: c.profile_path || null,
        profileUrl: buildTmdbImageUrl(c.profile_path, 'profile'),
      }))
    : [];

  return {
    tmdbMovieId: id,
    cast,
    crew,
  };
}

// ------------------------------------------------------------------------------
// Métodos de Pessoas
// ------------------------------------------------------------------------------

/**
 * Busca pessoas por nome
 */
export async function searchPeople(
  query: string,
  page: number = 1
): Promise<TmdbPersonSearchResult> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    throw new AppError(400, 'INVALID_PARAMS', 'O parâmetro "query" é obrigatório para busca de pessoas.');
  }

  const queryParams: Record<string, string | number | undefined> = {
    query: cleanQuery,
    page: Math.max(1, page),
    include_adult: 'false',
  };

  const raw = await fetchTmdb<any>('/search/person', queryParams);

  const results: TmdbPersonSummary[] = Array.isArray(raw.results)
    ? raw.results.map((p: any) => {
        const knownFor: string[] = [];
        if (Array.isArray(p.known_for)) {
          p.known_for.forEach((item: any) => {
            const title = item.title || item.name || item.original_title;
            if (title) knownFor.push(title);
          });
        }

        return {
          tmdbId: p.id,
          name: p.name || p.original_name || '',
          knownForDepartment: p.known_for_department || 'Outro',
          profilePath: p.profile_path || null,
          profileUrl: buildTmdbImageUrl(p.profile_path, 'profile'),
          knownFor,
        };
      })
    : [];

  return {
    page: raw.page || 1,
    totalPages: raw.total_pages || 1,
    totalResults: raw.total_results || results.length,
    results,
  };
}

/**
 * Obtém detalhes completos de uma pessoa por tmdb_id
 */
export async function getPersonDetails(id: number): Promise<TmdbPersonDetails> {
  if (!id || isNaN(id) || id <= 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador de pessoa do TMDB inválido.');
  }

  const raw = await fetchTmdb<any>(`/person/${id}`, {
    append_to_response: 'external_ids',
  });

  const imdbId = raw.external_ids?.imdb_id || raw.imdb_id || null;

  return {
    tmdbId: raw.id,
    name: raw.name || '',
    biography: raw.biography || '',
    birthday: raw.birthday || null,
    deathday: raw.deathday || null,
    placeOfBirth: raw.place_of_birth || null,
    profilePath: raw.profile_path || null,
    profileUrl: buildTmdbImageUrl(raw.profile_path, 'profile'),
    knownForDepartment: raw.known_for_department || 'Direção',
    imdbId,
    alsoKnownAs: Array.isArray(raw.also_known_as) ? raw.also_known_as : [],
  };
}

/**
 * Obtém créditos e filmografia de uma pessoa
 */
export async function getPersonCredits(id: number): Promise<TmdbPersonCredits> {
  if (!id || isNaN(id) || id <= 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador de pessoa do TMDB inválido.');
  }

  const raw = await fetchTmdb<any>(`/person/${id}/combined_credits`);

  const cast: TmdbPersonCastCredit[] = Array.isArray(raw.cast)
    ? raw.cast.map((c: any) => {
        const releaseDate = c.release_date || c.first_air_date || null;
        let yearNum: number | null = null;
        if (releaseDate && typeof releaseDate === 'string') {
          const parsed = parseInt(releaseDate.slice(0, 4), 10);
          if (!isNaN(parsed)) yearNum = parsed;
        }

        return {
          tmdbMovieId: c.id,
          title: c.title || c.name || c.original_title || '',
          character: c.character || '',
          releaseDate,
          year: yearNum,
          posterPath: c.poster_path || null,
          posterUrl: buildTmdbImageUrl(c.poster_path, 'poster'),
          mediaType: c.media_type,
        };
      })
    : [];

  const crew: TmdbPersonCrewCredit[] = Array.isArray(raw.crew)
    ? raw.crew.map((c: any) => {
        const releaseDate = c.release_date || c.first_air_date || null;
        let yearNum: number | null = null;
        if (releaseDate && typeof releaseDate === 'string') {
          const parsed = parseInt(releaseDate.slice(0, 4), 10);
          if (!isNaN(parsed)) yearNum = parsed;
        }

        return {
          tmdbMovieId: c.id,
          title: c.title || c.name || c.original_title || '',
          department: c.department || 'Outro',
          job: c.job || c.department || '',
          releaseDate,
          year: yearNum,
          posterPath: c.poster_path || null,
          posterUrl: buildTmdbImageUrl(c.poster_path, 'poster'),
          mediaType: c.media_type,
        };
      })
    : [];

  return {
    tmdbPersonId: id,
    cast,
    crew,
  };
}
