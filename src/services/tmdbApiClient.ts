// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Cliente Frontend para a Camada Segura /api/tmdb/*
// Arquivo: src/services/tmdbApiClient.ts
//
// Regra de Segurança Inviolável:
// - Este cliente NUNCA comunica diretamente com a API do TMDB.
// - Todas as requisições passam exclusivamente pelos endpoints server-side /api/tmdb/*.
// - Anexa automaticamente o token JWT de sessão do Supabase no cabeçalho Authorization.
// ==============================================================================

import { getSupabaseClient } from './supabaseClient';
import type {
  ApiErrorResponse,
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
} from '../../api/_lib/types';

// Re-exportar tipos para uso no frontend
export type {
  ApiErrorResponse,
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
};

export class TmdbApiError extends Error {
  public code: string;
  public status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'TmdbApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Obtém o token de autorização JWT da sessão atual do Supabase
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    return session.access_token || null;
  } catch (err) {
    console.warn('[tmdbApiClient] Erro ao recuperar sessão Supabase:', err);
    return null;
  }
}

/**
 * Executa requisição autenticada contra os endpoints /api/tmdb/*
 */
async function tmdbFetch<T>(endpoint: string, queryParams: Record<string, string | number | undefined> = {}): Promise<T> {
  const token = await getAuthToken();

  const url = new URL(endpoint.startsWith('/') ? endpoint : `/${endpoint}`, window.location.origin);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });
  } catch (netErr: any) {
    throw new TmdbApiError(0, 'NETWORK_ERROR', 'Falha de conexão com o servidor local.');
  }

  if (!response.ok) {
    let errorPayload: ApiErrorResponse | null = null;
    try {
      errorPayload = await response.json();
    } catch (_) {}

    const status = response.status;
    const code = errorPayload?.error?.code || (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'API_ERROR');
    const message = errorPayload?.error?.message || `Erro na requisição TMDB (HTTP ${status}).`;

    throw new TmdbApiError(status, code, message);
  }

  return (await response.json()) as T;
}

// ------------------------------------------------------------------------------
// Métodos de Filmes
// ------------------------------------------------------------------------------

/**
 * Busca filmes no TMDB por título e ano
 */
export async function searchTmdbMovies(params: {
  query: string;
  year?: number;
  page?: number;
}): Promise<TmdbMovieSearchResult> {
  return tmdbFetch<TmdbMovieSearchResult>('/api/tmdb/movies/search', {
    query: params.query,
    year: params.year,
    page: params.page,
  });
}

/**
 * Obtém detalhes completos de um filme no TMDB por ID
 */
export async function getTmdbMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/api/tmdb/movies/${tmdbId}`);
}

/**
 * Obtém os créditos (elenco e equipe) de um filme no TMDB por ID
 */
export async function getTmdbMovieCredits(tmdbId: number): Promise<TmdbMovieCredits> {
  return tmdbFetch<TmdbMovieCredits>(`/api/tmdb/movies/${tmdbId}/credits`);
}

// ------------------------------------------------------------------------------
// Métodos de Pessoas
// ------------------------------------------------------------------------------

/**
 * Busca pessoas no TMDB por nome
 */
export async function searchTmdbPeople(params: {
  query: string;
  page?: number;
}): Promise<TmdbPersonSearchResult> {
  return tmdbFetch<TmdbPersonSearchResult>('/api/tmdb/people/search', {
    query: params.query,
    page: params.page,
  });
}

/**
 * Obtém detalhes completos de uma pessoa no TMDB por ID
 */
export async function getTmdbPersonDetails(tmdbId: number): Promise<TmdbPersonDetails> {
  return tmdbFetch<TmdbPersonDetails>(`/api/tmdb/people/${tmdbId}`);
}

/**
 * Obtém a filmografia e créditos de uma pessoa no TMDB por ID
 */
export async function getTmdbPersonCredits(tmdbId: number): Promise<TmdbPersonCredits> {
  return tmdbFetch<TmdbPersonCredits>(`/api/tmdb/people/${tmdbId}/credits`);
}
