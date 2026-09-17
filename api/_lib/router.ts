// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Roteador Central Unificado para Endpoints /api/tmdb/*
// Arquivo: api/_lib/router.ts
// ==============================================================================

import { requireAdmin } from './authMiddleware.js';
import { sendApiError, sendJsonResponse, AppError } from './errors.js';
import {
  searchMovies,
  getMovieDetails,
  getMovieCredits,
  searchPeople,
  getPersonDetails,
  getPersonCredits,
} from './tmdbClient.js';
import { importTmdbMovieServerSide } from './movieImporter.js';

export interface StandardRequest {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, any>;
  body?: any;
  params?: Record<string, any>;
}

export interface StandardResponse {
  status: (code: number) => StandardResponse;
  json: (body: any) => void;
  writeHead?: (code: number, headers: Record<string, string>) => void;
  end?: (chunk?: any) => void;
}

/**
 * Helper para extrair body JSON de requisições POST
 */
async function parseJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

/**
 * Handler central para despachar requisições /api/tmdb/*
 */
export async function handleTmdbApiRequest(req: any, res: any): Promise<void> {
  // 1. Validar método HTTP
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    sendApiError(res, 405, 'METHOD_NOT_ALLOWED', `Método HTTP "${method}" não permitido.`);
    return;
  }

  // 2. Validar autenticação Supabase Admin-Only
  const isAuthorized = await requireAdmin(req, res);
  if (!isAuthorized) {
    return;
  }

  // 3. Extrair pathname e search params
  const rawUrl = req.url || '';
  const urlObj = new URL(rawUrl, 'http://localhost');
  const pathname = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
  const queryParams = Object.fromEntries(urlObj.searchParams.entries());

  // Merge com req.query se existir (ex: Vercel handler)
  const mergedQuery = { ...queryParams, ...(req.query || {}) };

  try {
    // --------------------------------------------------------------------------
    // ROTA POST: POST /api/tmdb/movies/import (F10.3)
    // --------------------------------------------------------------------------
    if (pathname === '/api/tmdb/movies/import' && method === 'POST') {
      const body = await parseJsonBody(req);
      const rawTmdbId = body?.tmdb_id ?? body?.tmdbId ?? mergedQuery?.tmdb_id ?? mergedQuery?.tmdbId;
      const tmdbId = parseInt(String(rawTmdbId), 10);

      if (isNaN(tmdbId) || tmdbId <= 0) {
        throw new AppError(400, 'INVALID_PARAMS', 'Identificador tmdb_id / tmdbId obrigatório e deve ser um inteiro positivo.');
      }

      const result = await importTmdbMovieServerSide(tmdbId, req);
      sendJsonResponse(res, result.alreadyExists ? 200 : 201, result);
      return;
    }

    // Se for POST em rota diferente de import
    if (method === 'POST') {
      sendApiError(res, 404, 'NOT_FOUND', `Endpoint POST não encontrado: "${pathname}".`);
      return;
    }

    // --------------------------------------------------------------------------
    // ROTA 1: GET /api/tmdb/movies/search
    // --------------------------------------------------------------------------
    if (pathname === '/api/tmdb/movies/search') {
      const query = typeof mergedQuery.query === 'string' ? mergedQuery.query.trim() : '';
      if (!query) {
        throw new AppError(400, 'INVALID_PARAMS', 'O parâmetro "query" é obrigatório para busca de filmes.');
      }

      let year: number | undefined = undefined;
      if (mergedQuery.year) {
        const parsedYear = parseInt(String(mergedQuery.year), 10);
        if (isNaN(parsedYear) || parsedYear < 1880 || parsedYear > 2100) {
          throw new AppError(400, 'INVALID_PARAMS', 'O parâmetro "year" deve ser um ano válido (1880-2100).');
        }
        year = parsedYear;
      }

      let page = 1;
      if (mergedQuery.page) {
        const parsedPage = parseInt(String(mergedQuery.page), 10);
        if (!isNaN(parsedPage) && parsedPage >= 1) {
          page = parsedPage;
        }
      }

      const result = await searchMovies(query, year, page);
      sendJsonResponse(res, 200, result);
      return;
    }

    // --------------------------------------------------------------------------
    // ROTA 2: GET /api/tmdb/movies/:id/credits
    // --------------------------------------------------------------------------
    const movieCreditsMatch = pathname.match(/^\/api\/tmdb\/movies\/([0-9a-zA-Z_-]+)\/credits$/);
    if (movieCreditsMatch) {
      const rawId = movieCreditsMatch[1];
      const id = parseInt(rawId, 10);
      if (isNaN(id) || id <= 0) {
        throw new AppError(400, 'INVALID_PARAMS', `Identificador de filme inválido: "${rawId}".`);
      }

      const result = await getMovieCredits(id);
      sendJsonResponse(res, 200, result);
      return;
    }

    // --------------------------------------------------------------------------
    // ROTA 3: GET /api/tmdb/movies/:id
    // --------------------------------------------------------------------------
    const movieDetailsMatch = pathname.match(/^\/api\/tmdb\/movies\/([0-9a-zA-Z_-]+)$/);
    if (movieDetailsMatch) {
      const rawId = movieDetailsMatch[1];
      const id = parseInt(rawId, 10);
      if (isNaN(id) || id <= 0) {
        throw new AppError(400, 'INVALID_PARAMS', `Identificador de filme inválido: "${rawId}".`);
      }

      const result = await getMovieDetails(id);
      sendJsonResponse(res, 200, result);
      return;
    }

    // --------------------------------------------------------------------------
    // ROTA 4: GET /api/tmdb/people/search
    // --------------------------------------------------------------------------
    if (pathname === '/api/tmdb/people/search') {
      const query = typeof mergedQuery.query === 'string' ? mergedQuery.query.trim() : '';
      if (!query) {
        throw new AppError(400, 'INVALID_PARAMS', 'O parâmetro "query" é obrigatório para busca de pessoas.');
      }

      let page = 1;
      if (mergedQuery.page) {
        const parsedPage = parseInt(String(mergedQuery.page), 10);
        if (!isNaN(parsedPage) && parsedPage >= 1) {
          page = parsedPage;
        }
      }

      const result = await searchPeople(query, page);
      sendJsonResponse(res, 200, result);
      return;
    }

    // --------------------------------------------------------------------------
    // ROTA 5: GET /api/tmdb/people/:id/credits
    // --------------------------------------------------------------------------
    const personCreditsMatch = pathname.match(/^\/api\/tmdb\/people\/([0-9a-zA-Z_-]+)\/credits$/);
    if (personCreditsMatch) {
      const rawId = personCreditsMatch[1];
      const id = parseInt(rawId, 10);
      if (isNaN(id) || id <= 0) {
        throw new AppError(400, 'INVALID_PARAMS', `Identificador de pessoa inválido: "${rawId}".`);
      }

      const result = await getPersonCredits(id);
      sendJsonResponse(res, 200, result);
      return;
    }

    // --------------------------------------------------------------------------
    // ROTA 6: GET /api/tmdb/people/:id
    // --------------------------------------------------------------------------
    const personDetailsMatch = pathname.match(/^\/api\/tmdb\/people\/([0-9a-zA-Z_-]+)$/);
    if (personDetailsMatch) {
      const rawId = personDetailsMatch[1];
      const id = parseInt(rawId, 10);
      if (isNaN(id) || id <= 0) {
        throw new AppError(400, 'INVALID_PARAMS', `Identificador de pessoa inválido: "${rawId}".`);
      }

      const result = await getPersonDetails(id);
      sendJsonResponse(res, 200, result);
      return;
    }

    // Rota desconhecida sob /api/tmdb/
    sendApiError(res, 404, 'NOT_FOUND', `Endpoint TMDB não encontrado: "${pathname}".`);
  } catch (err: any) {
    if (err instanceof AppError) {
      sendApiError(res, err.statusCode, err.code, err.message);
    } else {
      console.error('[TMDB Router] Erro não tratado:', err);
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Ocorreu um erro interno ao processar a requisição TMDB.');
    }
  }
}
