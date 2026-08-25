import { getSupabaseClient } from '../supabaseClient';
import { ContentStatus, Estreia } from '../../types';
import { getEditorialDateString } from '../../utils/dateUtils';

/**
 * Interface para o join aninhado de Filme na consulta de Estreia
 */
export interface SupabaseEstreiaFilmJoin {
  id: string;
  title: string;
  original_title: string | null;
  slug: string;
  year: number;
  country: string | null;
  duration_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  synopsis: string | null;
  legacy_director_name: string | null;
  filme_generos?: Array<{
    genero: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }>;
  credits?: Array<{
    id: string;
    department: string;
    role: string | null;
    fallback_person_name: string | null;
    order_index: number;
    person?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }>;
}

/**
 * Interface crua da linha de Estreia no PostgreSQL / Supabase
 */
export interface SupabaseEstreia {
  id: string;
  legacy_id: string | null;
  film_id: string;
  country: string;
  release_date: string; // Formato YYYY-MM-DD
  release_type: string; // 'Cinema' | 'Streaming' | 'Festival' | 'Especial' | 'Relançamento'
  distributor: string | null;
  notes: string | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined relational data
  film?: SupabaseEstreiaFilmJoin | null;
}

/**
 * Dados para criação de uma nova Estreia
 */
export interface CreateEstreiaInput {
  film_id: string;
  country?: string;
  release_date: string; // YYYY-MM-DD
  release_type?: string;
  distributor?: string | null;
  notes?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_id?: string | null;
}

/**
 * Dados para atualização de uma Estreia existente
 */
export interface UpdateEstreiaInput {
  film_id?: string;
  country?: string;
  release_date?: string; // YYYY-MM-DD
  release_type?: string;
  distributor?: string | null;
  notes?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
}

/**
 * Opções de filtragem para consulta de Estreias
 */
export interface EstreiaFilterOptions {
  allStatuses?: boolean;
  onlyPublished?: boolean;
  searchQuery?: string;
  year?: number;
  month?: number;
  releaseType?: string;
  filmId?: string;
  filmSlug?: string;
  country?: string;
  distributor?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  limit?: number;
  offset?: number;
}

/**
 * Estrutura de agrupamento semanal de Estreias (Quinta a Quarta-feira)
 */
export interface ReleaseWeekRange {
  thursdayDate: string; // YYYY-MM-DD
  wednesdayDate: string; // YYYY-MM-DD
  thursdayFormatted: string;
  rangeFormatted: string;
  year: number;
  month: string;
  day: string;
}

export interface ReleaseWeekGroup {
  thursdayDate: string;
  rangeFormatted: string;
  weekRange: ReleaseWeekRange;
  items: Estreia[];
  isCurrentWeek: boolean;
}

/**
 * Query padrão de seleção de Estreias com dados do filme e créditos de direção
 */
const ESTREIA_SELECT_QUERY = `
  id,
  legacy_id,
  film_id,
  country,
  release_date,
  release_type,
  distributor,
  notes,
  status,
  published_at,
  scheduled_at,
  created_at,
  updated_at,
  film:filmes (
    id,
    title,
    original_title,
    slug,
    year,
    country,
    duration_minutes,
    poster_url,
    backdrop_url,
    synopsis,
    legacy_director_name,
    filme_generos (
      genero:generos (
        id,
        name,
        slug
      )
    ),
    credits:film_credits (
      id,
      department,
      role,
      fallback_person_name,
      order_index,
      person:pessoas (
        id,
        name,
        slug
      )
    )
  )
`;

/**
 * Valida se um registro de Estreia atende rigorosamente aos critérios de visibilidade pública:
 * (
 *   status = 'published' AND (published_at IS NULL OR published_at <= now)
 * )
 * OR
 * (
 *   status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now
 * )
 */
export function isEstreiaPubliclyVisible(
  item: Pick<SupabaseEstreia, 'status' | 'published_at' | 'scheduled_at'>,
  nowTime: number = Date.now()
): boolean {
  if (item.status === 'published') {
    if (!item.published_at) return true;
    const pubTime = new Date(item.published_at).getTime();
    return !isNaN(pubTime) && pubTime <= nowTime;
  }

  if (item.status === 'scheduled') {
    if (!item.scheduled_at) return false;
    const schTime = new Date(item.scheduled_at).getTime();
    return !isNaN(schTime) && schTime <= nowTime;
  }

  return false;
}

/**
 * Mapeia uma linha crua do Supabase com joins para a interface canônica de domínio Estreia
 */
export function mapSupabaseEstreiaToDomain(raw: any): Estreia {
  const film = raw.film || null;

  // Extrair direção a partir dos créditos do filme (departamento 'Direção')
  let director = '';
  if (film) {
    if (Array.isArray(film.credits) && film.credits.length > 0) {
      const directors = film.credits
        .filter((c: any) => c.department === 'Direção')
        .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((c: any) => c.person?.name || c.fallback_person_name)
        .filter(Boolean);

      if (directors.length > 0) {
        director = directors.join(', ');
      }
    }

    if (!director && film.legacy_director_name) {
      director = film.legacy_director_name;
    }
  }

  // Extrair gêneros do filme
  const genres: string[] = [];
  if (film && Array.isArray(film.filme_generos)) {
    film.filme_generos.forEach((fg: any) => {
      if (fg?.genero?.name) {
        genres.push(fg.genero.name);
      }
    });
  }

  // Formatar estritamente a data civil de lançamento (YYYY-MM-DD)
  const cleanReleaseDate = getEditorialDateString(raw.release_date);

  return {
    id: raw.id,
    filmId: raw.film_id,
    filmTitle: film?.title || 'Filme não identificado',
    filmSlug: film?.slug || '',
    filmOriginalTitle: film?.original_title || undefined,
    filmDirector: director || 'Direção não informada',
    filmYear: film?.year || new Date().getFullYear(),
    filmCountry: film?.country || 'Internacional',
    filmGenres: genres.length > 0 ? genres : undefined,
    filmDurationMinutes: film?.duration_minutes || undefined,
    filmPoster: film?.poster_url || undefined,
    country: raw.country || 'Brasil',
    releaseDate: cleanReleaseDate,
    releaseType: raw.release_type || 'Cinema',
    distributor: raw.distributor || undefined,
    notes: raw.notes || undefined,
    status: raw.status || 'published',
    publishedAt: raw.published_at || null,
    scheduledAt: raw.scheduled_at || null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * Calcula a semana cinematográfica brasileira (Quinta a Quarta-feira)
 * para qualquer data civil YYYY-MM-DD sem sofrer deslocamentos por fuso horário.
 */
export function getReleaseWeekRange(dateStr: string): ReleaseWeekRange {
  const cleanDate = getEditorialDateString(dateStr);
  const [yStr, mStr, dStr] = cleanDate.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1; // 0-indexed
  const day = parseInt(dStr, 10);

  // Instancia a data usando hora local ao meio-dia para evitar deslocamento UTC
  const d = new Date(year, month, day, 12, 0, 0);
  const dayOfWeek = d.getDay(); // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado

  // Distância até a Quinta-feira da mesma semana cinematográfica
  // Quinta = 4. Se dia >= 4 (Qui, Sex, Sáb), recua (dayOfWeek - 4) dias. Se < 4 (Dom, Seg, Ter, Qua), recua (dayOfWeek + 3) dias.
  const diffToThursday = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
  const thursday = new Date(year, month, day - diffToThursday, 12, 0, 0);

  // Quarta-feira de encerramento da semana (Quinta + 6 dias)
  const wednesday = new Date(thursday.getFullYear(), thursday.getMonth(), thursday.getDate() + 6, 12, 0, 0);

  const formatYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const thursdayDate = formatYMD(thursday);
  const wednesdayDate = formatYMD(wednesday);
  const monthName = thursday.toLocaleDateString('pt-BR', { month: 'long' });

  return {
    thursdayDate,
    wednesdayDate,
    thursdayFormatted: thursday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    rangeFormatted: `${thursday.getDate()}–${wednesday.getDate()} DE ${monthName.toUpperCase()} DE ${thursday.getFullYear()}`,
    year: thursday.getFullYear(),
    month: String(thursday.getMonth() + 1).padStart(2, '0'),
    day: String(thursday.getDate()).padStart(2, '0'),
  };
}

/**
 * Agrupa uma lista de Estreias em blocos semanais (Quinta a Quarta) ordenados cronologicamente (mais recente primeiro)
 */
export function groupEstreiasByWeek(
  estreias: Estreia[],
  referenceDate: string = '2026-08-13'
): ReleaseWeekGroup[] {
  const currentWeek = getReleaseWeekRange(referenceDate);
  const map = new Map<string, Estreia[]>();

  estreias.forEach((est) => {
    const r = getReleaseWeekRange(est.releaseDate);
    const key = r.thursdayDate;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(est);
  });

  // Ordenar chaves de semanas descendente (mais recentes primeiro)
  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const items = map.get(key) || [];
    const r = getReleaseWeekRange(key);
    return {
      thursdayDate: key,
      rangeFormatted: r.rangeFormatted,
      weekRange: r,
      items,
      isCurrentWeek: key === currentWeek.thursdayDate,
    };
  });
}

/**
 * Retorna as Estreias da semana atual com base na data de referência
 */
export function getCurrentWeekEstreiasFromList(
  estreias: Estreia[],
  referenceDate: string = '2026-08-13'
): {
  weekRange: ReleaseWeekRange;
  items: Estreia[];
} {
  const weekRange = getReleaseWeekRange(referenceDate);
  const items = estreias.filter((est) => {
    const estRange = getReleaseWeekRange(est.releaseDate);
    return estRange.thursdayDate === weekRange.thursdayDate;
  });

  return { weekRange, items };
}

/**
 * Busca Estreias no Supabase com suporte a filtros de data, status, busca textual e relacionamentos
 */
export async function fetchEstreias(
  options?: EstreiaFilterOptions
): Promise<{ data: Estreia[]; count: number; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: [], count: 0, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('estreias')
      .select(ESTREIA_SELECT_QUERY, { count: 'exact' })
      .order('release_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Filtragem de status / publicação
    if (!options?.allStatuses) {
      const nowIso = new Date().toISOString();
      query = query.or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${nowIso})`);
    }

    // Filtro por filme específico
    if (options?.filmId) {
      query = query.eq('film_id', options.filmId);
    }

    // Filtro por tipo de lançamento (Cinema, Streaming, etc.)
    if (options?.releaseType && options.releaseType !== 'todos') {
      query = query.eq('release_type', options.releaseType);
    }

    // Filtro por país da estreia
    if (options?.country) {
      query = query.eq('country', options.country);
    }

    // Filtro por distribuidora
    if (options?.distributor) {
      query = query.ilike('distributor', `%${options.distributor}%`);
    }

    // Filtro por data inicial / final
    if (options?.startDate) {
      query = query.gte('release_date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('release_date', options.endDate);
    }

    const { data: rawData, count, error } = await query;

    if (error) {
      return { data: [], count: 0, error: new Error(error.message) };
    }

    let domainItems = (rawData || []).map(mapSupabaseEstreiaToDomain);

    // Validação de visibilidade pública (caso público)
    if (!options?.allStatuses) {
      const nowTime = Date.now();
      domainItems = domainItems.filter((item) => {
        const rawMatch = (rawData || []).find((r) => r.id === item.id);
        return rawMatch ? isEstreiaPubliclyVisible(rawMatch, nowTime) : true;
      });
    }

    // Filtragem por ano (caso solicitado)
    if (options?.year) {
      domainItems = domainItems.filter((item) => {
        const itemYear = parseInt(item.releaseDate.slice(0, 4), 10);
        return itemYear === options.year;
      });
    }

    // Filtragem por mês (caso solicitado, 1 a 12)
    if (options?.month) {
      domainItems = domainItems.filter((item) => {
        const itemMonth = parseInt(item.releaseDate.slice(5, 7), 10);
        return itemMonth === options.month;
      });
    }

    // Filtragem por busca textual (título do filme, diretor, distribuidora, notas)
    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      domainItems = domainItems.filter((item) => {
        return (
          item.filmTitle.toLowerCase().includes(q) ||
          item.filmDirector.toLowerCase().includes(q) ||
          (item.distributor && item.distributor.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q)) ||
          item.releaseDate.includes(q)
        );
      });
    }

    // Filtragem por slug do filme
    if (options?.filmSlug) {
      domainItems = domainItems.filter((item) => item.filmSlug === options.filmSlug);
    }

    // Paginação se especificada
    if (options?.offset && options.offset > 0) {
      domainItems = domainItems.slice(options.offset);
    }
    if (options?.limit && options.limit > 0) {
      domainItems = domainItems.slice(0, options.limit);
    }

    return { data: domainItems, count: count ?? domainItems.length, error: null };
  } catch (err: any) {
    return { data: [], count: 0, error: new Error(err?.message || 'Erro inesperado ao buscar estreias.') };
  }
}

/**
 * Busca uma Estreia por ID no Supabase com todos os relacionamentos
 */
export async function fetchEstreiaById(
  id: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: Estreia | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('estreias')
      .select(ESTREIA_SELECT_QUERY)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!options?.allStatuses && !isEstreiaPubliclyVisible(data)) {
      return { data: null, error: new Error('Estreia não disponível publicamente.') };
    }

    return { data: mapSupabaseEstreiaToDomain(data), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao buscar estreia por ID.') };
  }
}

/**
 * Busca Estreias vinculadas a um filme específico pelo ID do filme
 */
export async function fetchEstreiasByFilmId(
  filmId: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: Estreia[]; error: Error | null }> {
  const res = await fetchEstreias({
    filmId,
    allStatuses: options?.allStatuses ?? false,
  });
  return { data: res.data, error: res.error };
}

/**
 * Busca Estreia vinculada a um filme específico pelo Slug do filme
 */
export async function fetchEstreiaByFilmSlug(
  filmSlug: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: Estreia | null; error: Error | null }> {
  const res = await fetchEstreias({
    filmSlug,
    allStatuses: options?.allStatuses ?? false,
    limit: 1,
  });

  if (res.error) {
    return { data: null, error: res.error };
  }

  return { data: res.data[0] || null, error: null };
}

/**
 * Cria um novo registro de Estreia no Supabase
 */
export async function createEstreia(
  input: CreateEstreiaInput
): Promise<{ data: Estreia | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const cleanReleaseDate = getEditorialDateString(input.release_date);

    const rowToInsert = {
      film_id: input.film_id,
      country: input.country?.trim() || 'Brasil',
      release_date: cleanReleaseDate,
      release_type: input.release_type || 'Cinema',
      distributor: input.distributor?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status || 'published',
      published_at: input.published_at || (input.status === 'published' ? new Date().toISOString() : null),
      scheduled_at: input.scheduled_at || null,
      legacy_id: input.legacy_id || null,
    };

    const { data, error } = await supabase
      .from('estreias')
      .insert(rowToInsert)
      .select(ESTREIA_SELECT_QUERY)
      .single();

    if (error) {
      if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
        return { data: null, error: new Error('Acesso negado: apenas administradores podem criar registros de Estreias.') };
      }
      return { data: null, error: new Error(`Erro ao criar estreia: ${error.message}`) };
    }

    return { data: mapSupabaseEstreiaToDomain(data), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro inesperado ao criar estreia.') };
  }
}

/**
 * Atualiza um registro de Estreia existente no Supabase
 */
export async function updateEstreia(
  id: string,
  input: UpdateEstreiaInput
): Promise<{ data: Estreia | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.film_id !== undefined) updatePayload.film_id = input.film_id;
    if (input.country !== undefined) updatePayload.country = input.country.trim() || 'Brasil';
    if (input.release_date !== undefined) updatePayload.release_date = getEditorialDateString(input.release_date);
    if (input.release_type !== undefined) updatePayload.release_type = input.release_type;
    if (input.distributor !== undefined) updatePayload.distributor = input.distributor?.trim() || null;
    if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;
    if (input.status !== undefined) {
      updatePayload.status = input.status;
      if (input.status === 'published' && input.published_at === undefined) {
        updatePayload.published_at = new Date().toISOString();
      }
    }
    if (input.published_at !== undefined) updatePayload.published_at = input.published_at;
    if (input.scheduled_at !== undefined) updatePayload.scheduled_at = input.scheduled_at;

    const { data, error } = await supabase
      .from('estreias')
      .update(updatePayload)
      .eq('id', id)
      .select(ESTREIA_SELECT_QUERY)
      .single();

    if (error) {
      if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
        return { data: null, error: new Error('Acesso negado: apenas administradores podem editar registros de Estreias.') };
      }
      return { data: null, error: new Error(`Erro ao atualizar estreia: ${error.message}`) };
    }

    return { data: mapSupabaseEstreiaToDomain(data), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro inesperado ao atualizar estreia.') };
  }
}

/**
 * Exclui um registro de Estreia pelo ID
 */
export async function deleteEstreia(
  id: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { error } = await supabase
      .from('estreias')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem excluir registros de Estreias.') };
      }
      return { success: false, error: new Error(`Erro ao excluir estreia: ${error.message}`) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Erro inesperado ao excluir estreia.') };
  }
}
