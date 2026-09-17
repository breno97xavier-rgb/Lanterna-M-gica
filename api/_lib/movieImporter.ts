// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Motor Server-Side de Importação Controlada de Filmes via TMDB (F10.3)
// Arquivo: api/_lib/movieImporter.ts
//
// Regras Fundamentais:
// 1. Dados Factuais são consultados DIRETAMENTE do TMDB no servidor (Anti-Forgery).
// 2. Segunda barreira de deduplicação antes da escrita (Race Condition Barrier).
// 3. Respeito integral à Governança F9: status='draft', editorial_rating=NULL.
// 4. Criação atômica de relações (Gêneros, Países) com reutilização inteligente.
// 5. Registro automático e imutável de auditoria em public.tmdb_sync_logs.
// 6. Preenchimento de tmdb_synced_at = NOW() apenas para registros importados.
// 7. CRÉDITOS E PESSOAS NÃO SÃO IMPORTADOS NESTA ETAPA (F10.3).
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getMovieDetails } from './tmdbClient.js';
import { AppError } from './errors.js';
import type { TmdbMovieImportResult } from './types.js';

export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function getServerSupabaseClient(req: any): SupabaseClient {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  const authHeader = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const keyToUse = serviceKey || anonKey;

  if (!url || !keyToUse) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Credenciais do Supabase não configuradas no servidor.');
  }

  return createClient(url, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

/**
 * Encontra ou gera um slug único para o filme
 */
async function generateUniqueFilmSlug(
  supabase: SupabaseClient,
  title: string,
  year: number | null
): Promise<string> {
  const baseSlug = slugifyText(title) || 'filme';

  // 1. Tentar o slug base simples
  const { data: existingBase } = await supabase
    .from('filmes')
    .select('id')
    .eq('slug', baseSlug)
    .maybeSingle();

  if (!existingBase) {
    return baseSlug;
  }

  // 2. Tentar slug com o ano (ex: persona-1966)
  const yearSuffix = year ? `${baseSlug}-${year}` : `${baseSlug}-1`;
  const { data: existingWithYear } = await supabase
    .from('filmes')
    .select('id')
    .eq('slug', yearSuffix)
    .maybeSingle();

  if (!existingWithYear) {
    return yearSuffix;
  }

  // 3. Incrementar sufixo numérico determinístico
  let counter = 2;
  while (counter <= 50) {
    const candidateSlug = year ? `${baseSlug}-${year}-${counter}` : `${baseSlug}-${counter}`;
    const { data: candidateExists } = await supabase
      .from('filmes')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle();

    if (!candidateExists) {
      return candidateSlug;
    }
    counter++;
  }

  // Fallback aleatório seguro se houver mais de 50 colisões
  return `${baseSlug}-${Date.now().toString(36)}`;
}

/**
 * Mapeia ou cria gêneros no Supabase a partir dos gêneros fornecidos pelo TMDB
 */
async function resolveGeneroIds(
  supabase: SupabaseClient,
  tmdbGenres: { id: number; name: string }[]
): Promise<string[]> {
  if (!tmdbGenres || tmdbGenres.length === 0) return [];

  const generoIds: string[] = [];

  for (const tmdbGen of tmdbGenres) {
    const name = tmdbGen.name.trim();
    if (!name) continue;

    const slug = slugifyText(name);

    // Buscar gênero existente por slug ou nome (case insensitive)
    const { data: existing } = await supabase
      .from('generos')
      .select('id, name, slug')
      .or(`slug.eq.${slug},name.ilike.${name}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      generoIds.push(existing.id);
    } else {
      // Inserir novo gênero de forma segura
      const { data: newGen, error: createErr } = await supabase
        .from('generos')
        .insert({
          name,
          slug,
        })
        .select('id')
        .single();

      if (!createErr && newGen) {
        generoIds.push(newGen.id);
      }
    }
  }

  return Array.from(new Set(generoIds));
}

/**
 * Mapeia ou cria países no Supabase a partir dos países de produção fornecidos pelo TMDB
 */
async function resolveCountryIds(
  supabase: SupabaseClient,
  tmdbCountries: { iso_3166_1: string; name: string }[]
): Promise<string[]> {
  if (!tmdbCountries || tmdbCountries.length === 0) return [];

  const countryIds: string[] = [];

  for (const tmdbCountry of tmdbCountries) {
    const name = tmdbCountry.name.trim();
    if (!name) continue;

    const slug = slugifyText(name);

    // Buscar país existente por slug ou nome
    const { data: existing } = await supabase
      .from('countries')
      .select('id, name, slug')
      .or(`slug.eq.${slug},name.ilike.${name}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      countryIds.push(existing.id);
    } else {
      // Inserir novo país
      const { data: newCountry, error: createErr } = await supabase
        .from('countries')
        .insert({
          name,
          slug,
          flag_url: null,
        })
        .select('id')
        .single();

      if (!createErr && newCountry) {
        countryIds.push(newCountry.id);
      }
    }
  }

  return Array.from(new Set(countryIds));
}

/**
 * Executa a importação controlada do filme a partir do TMDB ID
 */
export async function importTmdbMovieServerSide(
  tmdbId: number,
  req: any
): Promise<TmdbMovieImportResult> {
  if (!tmdbId || isNaN(tmdbId) || tmdbId <= 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador TMDB inválido para importação.');
  }

  const supabase = getServerSupabaseClient(req);

  // --------------------------------------------------------------------------
  // 1. SEGUNDA BARREIRA DE DEDUPLICAÇÃO (RACE CONDITION CHECK)
  // --------------------------------------------------------------------------
  const { data: existingFilm } = await supabase
    .from('filmes')
    .select('id, title, original_title, slug, year, status, tmdb_id')
    .eq('tmdb_id', tmdbId)
    .maybeSingle();

  if (existingFilm) {
    return {
      success: true,
      alreadyExists: true,
      filmId: existingFilm.id,
      slug: existingFilm.slug,
      title: existingFilm.title,
      originalTitle: existingFilm.original_title,
      year: existingFilm.year,
      tmdbId: existingFilm.tmdb_id!,
      status: existingFilm.status,
      message: 'Filme já cadastrado no acervo.',
    };
  }

  // --------------------------------------------------------------------------
  // 2. CONSULTA DIRETA AO TMDB SERVER-SIDE (ANTI-FORGERY)
  // --------------------------------------------------------------------------
  const movieDetails = await getMovieDetails(tmdbId);
  if (!movieDetails) {
    throw new AppError(404, 'NOT_FOUND', `Filme ID ${tmdbId} não encontrado no catálogo do TMDB.`);
  }

  const title = (movieDetails.title || movieDetails.originalTitle || '').trim();
  if (!title) {
    throw new AppError(502, 'UPSTREAM_ERROR', 'Dados incompletos retornados pelo TMDB (título ausente).');
  }

  const year = movieDetails.year || (movieDetails.releaseDate ? parseInt(movieDetails.releaseDate.slice(0, 4), 10) : null);
  if (!year || isNaN(year)) {
    throw new AppError(400, 'INVALID_PARAMS', 'O filme do TMDB não possui ano de lançamento factual registrado.');
  }

  const primaryCountryName = movieDetails.productionCountries?.[0]?.name?.trim() || null;
  if (!primaryCountryName) {
    throw new AppError(400, 'INVALID_PARAMS', 'O filme do TMDB não possui país de produção registrado. A importação exige ao menos um país factual.');
  }

  const nowIso = new Date().toISOString();

  // Preparar payloads estruturados de taxonomias
  const genresPayload = (movieDetails.genres || []).map((g) => ({
    name: g.name.trim(),
    slug: slugifyText(g.name),
  }));

  const countriesPayload = (movieDetails.productionCountries || []).map((c, idx) => ({
    name: c.name.trim(),
    slug: slugifyText(c.name),
    order_index: idx,
  }));

  const syncDetailsPayload = {
    tmdbId,
    title: movieDetails.title,
    originalTitle: movieDetails.originalTitle,
    year: movieDetails.year,
    genres: (movieDetails.genres || []).map((g) => g.name),
    countries: (movieDetails.productionCountries || []).map((c) => c.name),
    imported_at: nowIso,
  };

  // --------------------------------------------------------------------------
  // 3. TENTATIVA DE EXECUÇÃO ATÔMICA VIA RPC POSTGRESQL (PREFERENCIAL)
  // --------------------------------------------------------------------------
  const { data: rpcResult, error: rpcError } = await supabase.rpc('import_tmdb_movie_atomic', {
    p_tmdb_id: tmdbId,
    p_title: title,
    p_original_title: movieDetails.originalTitle ? movieDetails.originalTitle.trim() : null,
    p_year: year,
    p_country: primaryCountryName,
    p_duration_minutes: movieDetails.runtime || null,
    p_poster_url: movieDetails.posterUrl || null,
    p_backdrop_url: movieDetails.backdropUrl || null,
    p_synopsis: movieDetails.overview ? movieDetails.overview.trim() : null,
    p_original_language: movieDetails.originalLanguage || null,
    p_imdb_id: movieDetails.imdbId || null,
    p_genres: genresPayload,
    p_countries: countriesPayload,
    p_sync_details: syncDetailsPayload,
  });

  if (!rpcError && rpcResult) {
    return {
      success: rpcResult.success,
      alreadyExists: rpcResult.alreadyExists,
      filmId: rpcResult.filmId,
      slug: rpcResult.slug,
      title: rpcResult.title,
      originalTitle: rpcResult.originalTitle,
      year: rpcResult.year,
      tmdbId: rpcResult.tmdbId,
      status: rpcResult.status,
      message: rpcResult.message || 'Filme importado com sucesso do TMDB!',
    };
  }

  // Se o erro do RPC for uma restrição de negócio (ex: não admin ou duplicação)
  if (rpcError && !rpcError.message?.includes('function public.import_tmdb_movie_atomic') && !rpcError.message?.includes('does not exist')) {
    throw new AppError(500, 'INTERNAL_ERROR', `Erro na execução da RPC transacional: ${rpcError.message}`);
  }

  // --------------------------------------------------------------------------
  // 4. FALLBACK SERVER-SIDE (CASO A RPC AINDA NÃO TENHA SIDO EXECUTADA NO SUPABASE)
  // --------------------------------------------------------------------------
  console.warn('[movieImporter] RPC import_tmdb_movie_atomic não encontrada no banco. Utilizando fallback server-side controlado.');

  const slug = await generateUniqueFilmSlug(supabase, title, year);
  const generoIds = await resolveGeneroIds(supabase, movieDetails.genres || []);
  const countryIds = await resolveCountryIds(supabase, movieDetails.productionCountries || []);

  let createdFilmId: string | null = null;

  try {
    const { data: newFilm, error: insertFilmErr } = await supabase
      .from('filmes')
      .insert({
        title,
        original_title: movieDetails.originalTitle ? movieDetails.originalTitle.trim() : null,
        slug,
        year,
        country: primaryCountryName || 'Internacional',
        duration_minutes: movieDetails.runtime || null,
        poster_url: movieDetails.posterUrl || null,
        backdrop_url: movieDetails.backdropUrl || null,
        synopsis: movieDetails.overview ? movieDetails.overview.trim() : null,
        editorial_rating: null, // GOVERNANÇA: NUNCA PREENCHIDO PELO TMDB
        status: 'draft', // GOVERNANÇA: RASCUNHO POR PADRÃO, NUNCA AUTO-PUBLICADO
        published_at: null,
        scheduled_at: null,
        tmdb_id: tmdbId,
        tmdb_synced_at: nowIso, // TIMESTAMP DA INGESTÃO FACTUAL
        original_language: movieDetails.originalLanguage || null,
        imdb_id: movieDetails.imdbId || null,
      })
      .select('id, title, original_title, slug, year, status, tmdb_id')
      .single();

    if (insertFilmErr || !newFilm) {
      if (insertFilmErr?.message?.includes('idx_filmes_tmdb_id') || insertFilmErr?.code === '23505') {
        const { data: racedFilm } = await supabase
          .from('filmes')
          .select('id, title, original_title, slug, year, status, tmdb_id')
          .eq('tmdb_id', tmdbId)
          .single();

        if (racedFilm) {
          return {
            success: true,
            alreadyExists: true,
            filmId: racedFilm.id,
            slug: racedFilm.slug,
            title: racedFilm.title,
            originalTitle: racedFilm.original_title,
            year: racedFilm.year,
            tmdbId: racedFilm.tmdb_id!,
            status: racedFilm.status,
            message: 'Filme já cadastrado no acervo.',
          };
        }
      }

      throw new AppError(500, 'INTERNAL_ERROR', `Falha ao gravar filme no banco: ${insertFilmErr?.message}`);
    }

    createdFilmId = newFilm.id;

    if (generoIds.length > 0) {
      const generoRows = generoIds.map((gId) => ({
        filme_id: createdFilmId,
        genero_id: gId,
      }));
      await supabase.from('filme_generos').insert(generoRows);
    }

    if (countryIds.length > 0) {
      const countryRows = countryIds.map((cId, idx) => ({
        filme_id: createdFilmId,
        country_id: cId,
        order_index: idx,
      }));
      await supabase.from('filme_countries').insert(countryRows);
    }

    await supabase.from('tmdb_sync_logs').insert({
      entity_type: 'filme',
      internal_id: createdFilmId,
      tmdb_id: tmdbId,
      operation: 'import_new',
      source: 'admin',
      status: 'success',
      details: syncDetailsPayload,
      error_message: null,
    });

    return {
      success: true,
      alreadyExists: false,
      filmId: newFilm.id,
      slug: newFilm.slug,
      title: newFilm.title,
      originalTitle: newFilm.original_title,
      year: newFilm.year,
      tmdbId: newFilm.tmdb_id!,
      status: newFilm.status,
      message: 'Filme importado com sucesso do TMDB!',
    };
  } catch (err: any) {
    if (createdFilmId) {
      try {
        await supabase.from('filmes').delete().eq('id', createdFilmId);
      } catch (cleanupErr) {
        console.error('[movieImporter] Falha no rollback manual:', cleanupErr);
      }
    }
    throw err instanceof AppError ? err : new AppError(500, 'INTERNAL_ERROR', err.message || 'Erro inesperado na importação.');
  }
}

/**
 * Executa a reconciliação / vinculação segura de um filme local existente ao TMDB (F10.3H)
 * PRESERVAÇÃO ABSOLUTA: Modifica SOMENTE o campo tmdb_id. tmdb_synced_at permanece NULL.
 */
export async function linkTmdbMovieServerSide(
  internalFilmId: string,
  tmdbId: number,
  req: any
): Promise<{ success: boolean; filmId: string; tmdbId: number; message: string }> {
  if (!internalFilmId || typeof internalFilmId !== 'string' || !internalFilmId.trim()) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador internalFilmId obrigatório.');
  }

  if (!tmdbId || isNaN(tmdbId) || tmdbId <= 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador tmdbId inválido para vinculação.');
  }

  const supabase = getServerSupabaseClient(req);

  // 1. Validar que o filme do TMDB existe no catálogo upstream (Anti-Forgery)
  const tmdbDetails = await getMovieDetails(tmdbId);
  if (!tmdbDetails) {
    throw new AppError(404, 'NOT_FOUND', `Filme ID ${tmdbId} não encontrado no catálogo do TMDB.`);
  }

  // 2. Bloqueio e verificação do filme local
  const { data: localFilm, error: localErr } = await supabase
    .from('filmes')
    .select('id, title, original_title, year, slug, tmdb_id')
    .eq('id', internalFilmId.trim())
    .maybeSingle();

  if (localErr || !localFilm) {
    throw new AppError(404, 'NOT_FOUND', `Filme local (UUID ${internalFilmId}) não encontrado no acervo.`);
  }

  // 3. Confirmar que o filme local possui tmdb_id IS NULL
  if (localFilm.tmdb_id !== null) {
    if (localFilm.tmdb_id === tmdbId) {
      return {
        success: true,
        filmId: localFilm.id,
        tmdbId: localFilm.tmdb_id,
        message: 'Filme já está vinculado a este TMDB ID.',
      };
    }
    throw new AppError(
      409,
      'CONFLICT',
      `O filme "${localFilm.title}" já está vinculado ao TMDB ID ${localFilm.tmdb_id}. Não é permitida a alteração de vínculo existente.`
    );
  }

  // 4. Confirmar que nenhum outro filme já possui esse tmdb_id
  const { data: conflictFilm } = await supabase
    .from('filmes')
    .select('id, title')
    .eq('tmdb_id', tmdbId)
    .neq('id', internalFilmId)
    .maybeSingle();

  if (conflictFilm) {
    throw new AppError(
      409,
      'CONFLICT',
      `O TMDB ID ${tmdbId} já está vinculado ao filme "${conflictFilm.title}" (UUID ${conflictFilm.id}). Vínculo duplicado impedido.`
    );
  }

  const syncDetailsPayload = {
    local_title: localFilm.title,
    local_original_title: localFilm.original_title,
    local_year: localFilm.year,
    tmdb_title: tmdbDetails.title,
    tmdb_original_title: tmdbDetails.originalTitle,
    tmdb_year: tmdbDetails.year,
    phase: 'F10.3H_LINK',
    note: 'Reconciliação manual de filme existente confirmada pelo editor via CMS',
  };

  // 5. Tentar execução via RPC PostgreSQL
  const { data: rpcResult, error: rpcError } = await supabase.rpc('link_tmdb_movie_existing', {
    p_internal_film_id: internalFilmId,
    p_tmdb_id: tmdbId,
    p_sync_details: syncDetailsPayload,
  });

  if (!rpcError && rpcResult) {
    return {
      success: true,
      filmId: rpcResult.filmId || internalFilmId,
      tmdbId: rpcResult.tmdbId || tmdbId,
      message: rpcResult.message || 'Filme vinculado com sucesso ao TMDB!',
    };
  }

  // Se erro de negócio da RPC
  if (rpcError && !rpcError.message?.includes('link_tmdb_movie_existing') && !rpcError.message?.includes('does not exist')) {
    throw new AppError(500, 'INTERNAL_ERROR', `Erro na execução da RPC de vínculo: ${rpcError.message}`);
  }

  // 6. Fallback Server-Side Seguro
  console.warn('[movieImporter] RPC link_tmdb_movie_existing não encontrada no banco. Utilizando fallback server-side controlado.');

  const { error: updateErr } = await supabase
    .from('filmes')
    .update({
      tmdb_id: tmdbId,
      // tmdb_synced_at permanece NULL conforme especificação da Fase 9/F10.3H
    })
    .eq('id', internalFilmId)
    .is('tmdb_id', null);

  if (updateErr) {
    throw new AppError(500, 'INTERNAL_ERROR', `Falha ao atualizar tmdb_id do filme local: ${updateErr.message}`);
  }

  // Inserir log de auditoria
  await supabase.from('tmdb_sync_logs').insert({
    entity_type: 'filme',
    internal_id: internalFilmId,
    tmdb_id: tmdbId,
    operation: 'LINK',
    source: 'admin',
    status: 'success',
    details: syncDetailsPayload,
    error_message: null,
  });

  return {
    success: true,
    filmId: internalFilmId,
    tmdbId,
    message: 'Filme vinculado com sucesso ao TMDB!',
  };
}

