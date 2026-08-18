import { getSupabaseClient } from '../supabaseClient';
import { ContentStatus } from '../../types';
import { SupabaseCountry } from './countriesRepository';
import { SupabaseGenero } from './generosRepository';
import { SupabasePessoa } from './pessoasRepository';

export interface SupabaseFilmCredit {
  id: string;
  film_id: string;
  person_id: string | null;
  fallback_person_name: string | null;
  department: string;
  role: string | null;
  character_name: string | null;
  order_index: number;
  created_at?: string;
  person?: SupabasePessoa | null;
}

export interface SupabaseFilme {
  id: string;
  legacy_id: string | null;
  title: string;
  original_title: string | null;
  slug: string;
  year: number;
  country: string | null;
  duration_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  synopsis: string | null;
  editorial_rating: number | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  legacy_director_name: string | null;
  // Joined relational data
  generos?: SupabaseGenero[];
  countries?: SupabaseCountry[];
  credits?: SupabaseFilmCredit[];
}

export interface FilmCreditInput {
  person_id?: string | null;
  fallback_person_name?: string | null;
  department: string;
  role?: string | null;
  character_name?: string | null;
  order_index?: number;
}

export interface CreateFilmeInput {
  title: string;
  original_title?: string | null;
  slug?: string;
  year: number;
  country?: string | null;
  duration_minutes?: number | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  synopsis?: string | null;
  editorial_rating?: number | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_director_name?: string | null;
  genero_ids?: string[];
  country_ids?: string[];
  credits?: FilmCreditInput[];
}

export interface UpdateFilmeInput {
  title?: string;
  original_title?: string | null;
  slug?: string;
  year?: number;
  country?: string | null;
  duration_minutes?: number | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  synopsis?: string | null;
  editorial_rating?: number | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_director_name?: string | null;
  genero_ids?: string[];
  country_ids?: string[];
  credits?: FilmCreditInput[];
}

/**
 * Sanitiza texto para slug URL amigável
 */
export function slugifyFilm(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Helper para formatar a resposta bruta do Supabase com as relações aninhadas
 */
function mapRawFilmToSupabaseFilme(row: any): SupabaseFilme {
  // Map generos from join
  let generos: SupabaseGenero[] = [];
  if (Array.isArray(row.filme_generos)) {
    generos = row.filme_generos
      .map((fg: any) => fg.genero)
      .filter(Boolean);
  }

  // Map countries from join
  let countries: SupabaseCountry[] = [];
  if (Array.isArray(row.filme_countries)) {
    countries = row.filme_countries
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((fc: any) => fc.country)
      .filter(Boolean);
  }

  // Map credits from join
  let credits: SupabaseFilmCredit[] = [];
  if (Array.isArray(row.credits)) {
    credits = row.credits
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((c: any) => ({
        id: c.id,
        film_id: c.film_id,
        person_id: c.person_id,
        fallback_person_name: c.fallback_person_name,
        department: c.department,
        role: c.role,
        character_name: c.character_name,
        order_index: c.order_index ?? 0,
        created_at: c.created_at,
        person: c.person || null,
      }));
  }

  return {
    id: row.id,
    legacy_id: row.legacy_id || null,
    title: row.title,
    original_title: row.original_title || null,
    slug: row.slug,
    year: row.year,
    country: row.country || null,
    duration_minutes: row.duration_minutes || null,
    poster_url: row.poster_url || null,
    backdrop_url: row.backdrop_url || null,
    synopsis: row.synopsis || null,
    editorial_rating: row.editorial_rating ? Number(row.editorial_rating) : null,
    status: row.status || 'published',
    published_at: row.published_at || null,
    scheduled_at: row.scheduled_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    legacy_director_name: row.legacy_director_name || null,
    generos,
    countries,
    credits,
  };
}

/**
 * String de seleção canônica com todas as relações estruturais de Filmes
 */
const FILM_SELECT_QUERY = `
  *,
  filme_generos (
    genero:generos (*)
  ),
  filme_countries (
    order_index,
    country:countries (*)
  ),
  credits:film_credits (
    id,
    film_id,
    person_id,
    fallback_person_name,
    department,
    role,
    character_name,
    order_index,
    created_at,
    person:pessoas (
      id,
      name,
      slug,
      photo_url,
      primary_roles,
      birth_date,
      death_date
    )
  )
`;

/**
 * Busca todos os filmes cadastrados com relações estruturais completas.
 */
export async function fetchFilmes(options?: {
  onlyPublished?: boolean;
  allStatuses?: boolean;
  search?: string;
  limit?: number;
}): Promise<{ data: SupabaseFilme[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    let query = supabase
      .from('filmes')
      .select(FILM_SELECT_QUERY)
      .order('year', { ascending: false })
      .order('title', { ascending: true });

    if (options?.onlyPublished || options?.allStatuses === false) {
      const nowIso = new Date().toISOString();
      query = query.or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${nowIso})`);
    }

    if (options?.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`title.ilike.%${term}%,original_title.ilike.%${term}%,slug.ilike.%${term}%`);
    }

    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback sem filme_countries caso a tabela associativa ainda não tenha sido criada no banco remoto
      if (error.message && error.message.includes('filme_countries')) {
        const { data: fallbackData, error: fbError } = await supabase
          .from('filmes')
          .select(`
            *,
            filme_generos (
              genero:generos (*)
            ),
            credits:film_credits (
              id,
              film_id,
              person_id,
              fallback_person_name,
              department,
              role,
              character_name,
              order_index,
              created_at,
              person:pessoas (
                id,
                name,
                slug,
                photo_url,
                primary_roles,
                birth_date,
                death_date
              )
            )
          `)
          .order('year', { ascending: false });

        if (fbError) return { data: null, error: new Error(fbError.message) };
        return { data: (fallbackData || []).map(mapRawFilmToSupabaseFilme), error: null };
      }

      return { data: null, error: new Error(error.message) };
    }

    const mapped = (data || []).map(mapRawFilmToSupabaseFilme);
    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar filmes.') };
  }
}

/**
 * Busca um único filme por ID com todos os gêneros, países e créditos.
 */
export async function fetchFilmeById(id: string): Promise<{ data: SupabaseFilme | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('filmes')
      .select(FILM_SELECT_QUERY)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    return { data: mapRawFilmToSupabaseFilme(data), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao carregar filme por ID.') };
  }
}

/**
 * Busca um único filme pelo slug com todos os metadados canônicos.
 */
export async function fetchFilmeBySlug(slug: string): Promise<{ data: SupabaseFilme | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('filmes')
      .select(FILM_SELECT_QUERY)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      // Fallback gracioso
      if (error.message && error.message.includes('filme_countries')) {
        const { data: fallbackData, error: fbError } = await supabase
          .from('filmes')
          .select(`
            *,
            filme_generos (
              genero:generos (*)
            ),
            credits:film_credits (
              id,
              film_id,
              person_id,
              fallback_person_name,
              department,
              role,
              character_name,
              order_index,
              created_at,
              person:pessoas (
                id,
                name,
                slug,
                photo_url,
                primary_roles,
                birth_date,
                death_date
              )
            )
          `)
          .eq('slug', slug)
          .maybeSingle();

        if (fbError) return { data: null, error: new Error(fbError.message) };
        if (!fallbackData) return { data: null, error: null };
        return { data: mapRawFilmToSupabaseFilme(fallbackData), error: null };
      }

      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    return { data: mapRawFilmToSupabaseFilme(data), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar filme por slug.') };
  }
}

/**
 * Cria um novo filme no Supabase com relações associativas completas (Gêneros, Países e Créditos).
 */
export async function createFilme(input: CreateFilmeInput): Promise<{ data: SupabaseFilme | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  const title = input.title.trim();
  if (!title) {
    return { data: null, error: new Error('O título do filme é obrigatório.') };
  }

  const slug = input.slug?.trim() ? slugifyFilm(input.slug) : slugifyFilm(title);
  if (!slug) {
    return { data: null, error: new Error('Slug inválido para o filme.') };
  }

  const status = input.status || 'published';
  const nowIso = new Date().toISOString();
  const publishedAt = status === 'published' ? (input.published_at || nowIso) : (input.published_at || null);
  const scheduledAt = status === 'scheduled' ? (input.scheduled_at || null) : null;

  try {
    // 1. Inserir registro base em public.filmes
    const { data: filmRow, error: insertError } = await supabase
      .from('filmes')
      .insert({
        title,
        original_title: input.original_title?.trim() || null,
        slug,
        year: Number(input.year) || new Date().getFullYear(),
        country: input.country?.trim() || null,
        duration_minutes: input.duration_minutes ? Number(input.duration_minutes) : null,
        poster_url: input.poster_url?.trim() || null,
        backdrop_url: input.backdrop_url?.trim() || null,
        synopsis: input.synopsis?.trim() || null,
        editorial_rating: input.editorial_rating ? Number(input.editorial_rating) : null,
        status,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        legacy_director_name: input.legacy_director_name?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: new Error(insertError.message) };
    }

    const filmId = filmRow.id;

    // 2. Inserir Gêneros associativos em public.filme_generos
    if (input.genero_ids && input.genero_ids.length > 0) {
      const distinctGeneroIds = Array.from(new Set(input.genero_ids));
      const rows = distinctGeneroIds.map((gId) => ({
        filme_id: filmId,
        genero_id: gId,
      }));
      await supabase.from('filme_generos').insert(rows);
    }

    // 3. Inserir Países associativos em public.filme_countries
    if (input.country_ids && input.country_ids.length > 0) {
      const distinctCountryIds = Array.from(new Set(input.country_ids));
      const rows = distinctCountryIds.map((cId, idx) => ({
        filme_id: filmId,
        country_id: cId,
        order_index: idx,
      }));
      try {
        await supabase.from('filme_countries').insert(rows);
      } catch (_) {
        // Ignora silenciosamente caso tabela associativa ainda não exista no schema remoto
      }
    }

    // 4. Inserir Créditos (Film Credits)
    if (input.credits && input.credits.length > 0) {
      const creditRows = input.credits.map((c, index) => ({
        film_id: filmId,
        person_id: c.person_id || null,
        fallback_person_name: (c.fallback_person_name?.trim() || (c as any).personName?.trim() || null),
        department: c.department?.trim() || 'Outro',
        role: c.role?.trim() || null,
        character_name: c.character_name?.trim() || null,
        order_index: c.order_index ?? index,
      }));
      await supabase.from('film_credits').insert(creditRows);
    }

    // Retorna o filme completo recém-criado
    return fetchFilmeById(filmId);
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao criar registro do filme.') };
  }
}

/**
 * Atualiza um filme existente e sincroniza suas relações (Gêneros, Países e Créditos).
 */
export async function updateFilme(id: string, input: UpdateFilmeInput): Promise<{ data: SupabaseFilme | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.original_title !== undefined) updatePayload.original_title = input.original_title?.trim() || null;
    if (input.slug !== undefined) updatePayload.slug = slugifyFilm(input.slug);
    if (input.year !== undefined) updatePayload.year = Number(input.year);
    if (input.country !== undefined) updatePayload.country = input.country?.trim() || null;
    if (input.duration_minutes !== undefined) updatePayload.duration_minutes = input.duration_minutes ? Number(input.duration_minutes) : null;
    if (input.poster_url !== undefined) updatePayload.poster_url = input.poster_url?.trim() || null;
    if (input.backdrop_url !== undefined) updatePayload.backdrop_url = input.backdrop_url?.trim() || null;
    if (input.synopsis !== undefined) updatePayload.synopsis = input.synopsis?.trim() || null;
    if (input.editorial_rating !== undefined) updatePayload.editorial_rating = input.editorial_rating ? Number(input.editorial_rating) : null;
    if (input.legacy_director_name !== undefined) updatePayload.legacy_director_name = input.legacy_director_name?.trim() || null;

    if (input.status !== undefined) {
      updatePayload.status = input.status;
      if (input.status === 'published' && input.published_at === undefined) {
        updatePayload.published_at = new Date().toISOString();
      } else if (input.published_at !== undefined) {
        updatePayload.published_at = input.published_at;
      }
      if (input.status === 'scheduled' && input.scheduled_at !== undefined) {
        updatePayload.scheduled_at = input.scheduled_at;
      }
    }

    // 1. Atualizar campos escalares em public.filmes
    const { error: updateError } = await supabase
      .from('filmes')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      return { data: null, error: new Error(updateError.message) };
    }

    // 2. Sincronizar Gêneros se fornecidos
    if (input.genero_ids !== undefined) {
      await supabase.from('filme_generos').delete().eq('filme_id', id);
      if (input.genero_ids.length > 0) {
        const distinctGeneroIds = Array.from(new Set(input.genero_ids));
        const rows = distinctGeneroIds.map((gId) => ({
          filme_id: id,
          genero_id: gId,
        }));
        await supabase.from('filme_generos').insert(rows);
      }
    }

    // 3. Sincronizar Países se fornecidos
    if (input.country_ids !== undefined) {
      try {
        await supabase.from('filme_countries').delete().eq('filme_id', id);
        if (input.country_ids.length > 0) {
          const distinctCountryIds = Array.from(new Set(input.country_ids));
          const rows = distinctCountryIds.map((cId, idx) => ({
            filme_id: id,
            country_id: cId,
            order_index: idx,
          }));
          await supabase.from('filme_countries').insert(rows);
        }
      } catch (_) {
        // Fallback silencioso se tabela associativa ainda não existe no schema
      }
    }

    // 4. Sincronizar Créditos se fornecidos
    if (input.credits !== undefined) {
      await supabase.from('film_credits').delete().eq('film_id', id);
      if (input.credits.length > 0) {
        const creditRows = input.credits.map((c, index) => ({
          film_id: id,
          person_id: c.person_id || null,
          fallback_person_name: (c.fallback_person_name?.trim() || (c as any).personName?.trim() || null),
          department: c.department?.trim() || 'Outro',
          role: c.role?.trim() || null,
          character_name: c.character_name?.trim() || null,
          order_index: c.order_index ?? index,
        }));
        await supabase.from('film_credits').insert(creditRows);
      }
    }

    // Retornar filme atualizado
    return fetchFilmeById(id);
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao atualizar filme.') };
  }
}

/**
 * Exclui um filme do Supabase.
 * Trata integridade relacional sem deletar pessoas, gêneros ou países.
 */
export async function deleteFilme(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Supabase client não configurado.') };
  }

  try {
    // 1. Limpar explicitamente relações associativas para garantia
    await supabase.from('filme_generos').delete().eq('filme_id', id);
    try {
      await supabase.from('filme_countries').delete().eq('filme_id', id);
    } catch (_) {}
    await supabase.from('film_credits').delete().eq('film_id', id);

    // 2. Excluir o registro principal de public.filmes
    const { error } = await supabase
      .from('filmes')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err.message || 'Falha ao excluir filme.') };
  }
}
