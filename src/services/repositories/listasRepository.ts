import { getSupabaseClient } from '../supabaseClient';
import { ContentStatus, Lista, ListaItem } from '../../types';
import { SupabaseTag, fetchTags, createTag } from './tagsRepository';

export interface SupabaseListaFilmJoin {
  id: string;
  title: string;
  slug: string;
  year?: number;
  country?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
}

export interface SupabaseListaPersonJoin {
  id: string;
  name: string;
  slug: string;
  photo_url?: string | null;
}

export interface SupabaseListaItem {
  id: string;
  lista_id: string;
  film_id: string | null;
  rank: number | null;
  custom_title: string | null;
  custom_director: string | null;
  custom_year: number | null;
  custom_image: string | null;
  note: string | null;
  order_index: number;
  created_at: string;
  film?: SupabaseListaFilmJoin | null;
}

export interface SupabaseLista {
  id: string;
  legacy_id: string | null;
  title: string;
  slug: string;
  intro: string;
  cover_image: string;
  related_person_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;

  // Joins relacionais
  related_person?: SupabaseListaPersonJoin | null;
  lista_items?: SupabaseListaItem[];
  lista_tags?: { tag: SupabaseTag }[];
  tags?: SupabaseTag[];
  items?: SupabaseListaItem[];
}

export interface ListaItemInput {
  id?: string;
  film_id?: string | null;
  filmId?: string | null;
  rank?: number;
  title?: string;
  custom_title?: string;
  director?: string;
  custom_director?: string;
  year?: number;
  custom_year?: number;
  image?: string;
  custom_image?: string;
  note?: string;
  order_index?: number;
  orderIndex?: number;
}

export interface CreateListaInput {
  title: string;
  slug?: string;
  intro: string;
  cover_image?: string;
  coverImage?: string;
  related_person_id?: string | null;
  relatedPersonId?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  publishedAt?: string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  legacy_id?: string | null;
  items?: ListaItemInput[];
  tag_ids?: string[];
  tags?: string[];
}

export interface UpdateListaInput {
  title?: string;
  slug?: string;
  intro?: string;
  cover_image?: string;
  coverImage?: string;
  related_person_id?: string | null;
  relatedPersonId?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  publishedAt?: string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  items?: ListaItemInput[];
  tag_ids?: string[];
  tags?: string[];
}

export interface FetchListasOptions {
  status?: ContentStatus | 'all';
  allStatuses?: boolean;
  includeDrafts?: boolean;
  relatedPersonId?: string;
  filmId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Sanitiza texto para geração de slug URL amigável
 */
export function slugifyLista(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Valida se um registro de Lista atende rigorosamente aos critérios de visibilidade pública:
 * (
 *   status = 'published' AND (published_at IS NULL OR published_at <= now)
 * )
 * OR
 * (
 *   status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now
 * )
 */
export function isListaPubliclyVisible(
  item: Pick<SupabaseLista, 'status' | 'published_at' | 'scheduled_at'>,
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
 * Query padrão com relacionamentos aninhados (tags, itens com filmes e pessoa relacionada)
 */
export const LISTAS_SELECT_QUERY = `
  id,
  legacy_id,
  title,
  slug,
  intro,
  cover_image,
  related_person_id,
  status,
  published_at,
  scheduled_at,
  created_at,
  updated_at,
  related_person:pessoas (
    id,
    name,
    slug,
    photo_url
  ),
  lista_items (
    id,
    lista_id,
    film_id,
    rank,
    custom_title,
    custom_director,
    custom_year,
    custom_image,
    note,
    order_index,
    created_at,
    film:filmes (
      id,
      title,
      slug,
      year,
      country,
      poster_url,
      backdrop_url
    )
  ),
  lista_tags (
    tag:tags (
      id,
      name,
      slug,
      created_at
    )
  )
`;

/**
 * Mapeia registro cru retornado pelo Supabase (com joins) para a interface SupabaseLista
 */
export function mapRawListaToSupabase(row: any): SupabaseLista {
  const tags: SupabaseTag[] = [];
  if (Array.isArray(row.lista_tags)) {
    row.lista_tags.forEach((item: any) => {
      if (item && item.tag) {
        tags.push({
          id: item.tag.id,
          name: item.tag.name,
          slug: item.tag.slug,
          created_at: item.tag.created_at,
        });
      }
    });
  }

  const rawPerson = Array.isArray(row.related_person) ? row.related_person[0] : row.related_person;
  const relatedPerson: SupabaseListaPersonJoin | null = rawPerson ? {
    id: rawPerson.id,
    name: rawPerson.name,
    slug: rawPerson.slug,
    photo_url: rawPerson.photo_url || null,
  } : null;

  const rawItems = Array.isArray(row.lista_items) ? row.lista_items : [];
  const items: SupabaseListaItem[] = rawItems.map((it: any) => {
    const rawFilm = Array.isArray(it.film) ? it.film[0] : it.film;
    const film: SupabaseListaFilmJoin | null = rawFilm ? {
      id: rawFilm.id,
      title: rawFilm.title,
      slug: rawFilm.slug,
      year: rawFilm.year ?? undefined,
      country: rawFilm.country || null,
      poster_url: rawFilm.poster_url || null,
      backdrop_url: rawFilm.backdrop_url || null,
    } : null;

    return {
      id: it.id,
      lista_id: it.lista_id,
      film_id: it.film_id || null,
      rank: typeof it.rank === 'number' ? it.rank : null,
      custom_title: it.custom_title || null,
      custom_director: it.custom_director || null,
      custom_year: typeof it.custom_year === 'number' ? it.custom_year : null,
      custom_image: it.custom_image || null,
      note: it.note || null,
      order_index: typeof it.order_index === 'number' ? it.order_index : 0,
      created_at: it.created_at,
      film,
    };
  });

  // Ordena itens pela ordem editorial definida
  items.sort((a, b) => {
    if (a.order_index !== b.order_index) return a.order_index - b.order_index;
    if (a.rank && b.rank) return a.rank - b.rank;
    return 0;
  });

  return {
    id: row.id,
    legacy_id: row.legacy_id || null,
    title: row.title,
    slug: row.slug,
    intro: row.intro || '',
    cover_image: row.cover_image || '',
    related_person_id: row.related_person_id || null,
    status: row.status || 'draft',
    published_at: row.published_at || null,
    scheduled_at: row.scheduled_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    related_person: relatedPerson,
    lista_items: items,
    items,
    tags,
  };
}

/**
 * Mapper central: converte SupabaseLista para o modelo de domínio Lista do frontend
 */
export function mapSupabaseListaToDomain(raw: SupabaseLista): Lista {
  const domainItems: ListaItem[] = (raw.items || raw.lista_items || []).map((it) => {
    const title = it.film?.title || it.custom_title || '';
    const director = it.custom_director || undefined;
    const year = it.film?.year || it.custom_year || undefined;
    const image = it.film?.poster_url || it.custom_image || undefined;

    return {
      id: it.id,
      filmId: it.film_id,
      rank: it.rank || undefined,
      title,
      director,
      year,
      note: it.note || undefined,
      image,
      orderIndex: it.order_index,
      film: it.film ? {
        id: it.film.id,
        title: it.film.title,
        slug: it.film.slug,
        year: it.film.year,
        posterUrl: it.film.poster_url,
        backdropUrl: it.film.backdrop_url,
        country: it.film.country,
      } : null,
    };
  });

  const tagNames = raw.tags?.map((t) => t.name) || [];

  return {
    id: raw.id,
    legacyId: raw.legacy_id,
    title: raw.title,
    slug: raw.slug,
    intro: raw.intro,
    coverImage: raw.cover_image,
    items: domainItems,
    relatedPersonId: raw.related_person_id,
    relatedPerson: raw.related_person ? {
      id: raw.related_person.id,
      name: raw.related_person.name,
      slug: raw.related_person.slug,
      photoUrl: raw.related_person.photo_url,
    } : null,
    relatedFilmmaker: raw.related_person?.name || undefined,
    tags: tagNames,
    status: raw.status,
    publishedAt: raw.published_at,
    scheduledAt: raw.scheduled_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * Busca listagem de Listas com filtros, ordenação e integridade editorial
 */
export async function fetchListas(
  options: FetchListasOptions = {}
): Promise<{ data: Lista[]; count: number; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: [], count: 0, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('listas')
      .select(LISTAS_SELECT_QUERY, { count: 'exact' });

    // Filtragem por status
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    } else if (!options.allStatuses && !options.includeDrafts) {
      query = query.in('status', ['published', 'scheduled']);
    }

    if (options.relatedPersonId) {
      query = query.eq('related_person_id', options.relatedPersonId);
    }

    // Filtragem por filme vinculado nos itens
    if (options.filmId) {
      const { data: itemRows, error: itemErr } = await supabase
        .from('lista_items')
        .select('lista_id')
        .eq('film_id', options.filmId);

      if (itemErr) {
        console.error('Erro ao buscar itens vinculados do filme:', itemErr);
      }

      const listaIds = (itemRows || []).map((r: any) => r.lista_id).filter(Boolean);
      if (listaIds.length === 0) {
        return { data: [], count: 0, error: null };
      }
      query = query.in('id', listaIds);
    }

    if (options.searchQuery?.trim()) {
      const term = `%${options.searchQuery.trim()}%`;
      query = query.or(`title.ilike.${term},intro.ilike.${term}`);
    }

    // Ordenação editorial canônica
    query = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao buscar Listas:', error);
      return { data: [], count: 0, error: new Error(error.message) };
    }

    const rawList = (data || []).map(mapRawListaToSupabase);
    let domainList = rawList.map(mapSupabaseListaToDomain);

    // Validação temporal rigorosa de visibilidade pública
    if (!options.allStatuses && !options.includeDrafts) {
      const nowTime = Date.now();
      domainList = domainList.filter((item) => {
        const rawItem = rawList.find((r) => r.id === item.id);
        return rawItem ? isListaPubliclyVisible(rawItem, nowTime) : false;
      });
    }

    const totalCount = count !== null && count !== undefined
      ? (options.allStatuses || options.includeDrafts ? count : domainList.length)
      : domainList.length;

    // Paginação aplicada após o filtro de visibilidade pública
    if (typeof options.offset === 'number' && options.offset > 0) {
      domainList = domainList.slice(
        options.offset,
        options.offset + (options.limit || 20)
      );
    } else if (typeof options.limit === 'number' && options.limit > 0) {
      domainList = domainList.slice(0, options.limit);
    }

    return {
      data: domainList,
      count: totalCount,
      error: null,
    };
  } catch (err: any) {
    return { data: [], count: 0, error: new Error(err?.message || 'Falha ao buscar Listas.') };
  }
}

/**
 * Busca Lista por ID
 */
export async function fetchListaById(
  id: string,
  options: { includeDrafts?: boolean } = {}
): Promise<{ data: Lista | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!id) {
    return { data: null, error: new Error('ID da Lista não informado.') };
  }

  try {
    const { data, error } = await supabase
      .from('listas')
      .select(LISTAS_SELECT_QUERY)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar Lista por ID:', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const raw = mapRawListaToSupabase(data);

    // Validação pública se includeDrafts for false
    if (!options.includeDrafts && !isListaPubliclyVisible(raw)) {
      return { data: null, error: null };
    }

    return { data: mapSupabaseListaToDomain(raw), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar Lista por ID.') };
  }
}

/**
 * Busca Lista por Slug
 */
export async function fetchListaBySlug(
  slug: string,
  options: { includeDrafts?: boolean } = {}
): Promise<{ data: Lista | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!slug) {
    return { data: null, error: new Error('Slug da Lista não informado.') };
  }

  try {
    const { data, error } = await supabase
      .from('listas')
      .select(LISTAS_SELECT_QUERY)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar Lista por Slug:', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const raw = mapRawListaToSupabase(data);

    // Validação pública se includeDrafts for false
    if (!options.includeDrafts && !isListaPubliclyVisible(raw)) {
      return { data: null, error: null };
    }

    return { data: mapSupabaseListaToDomain(raw), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar Lista por Slug.') };
  }
}

/**
 * Sincroniza de forma atômica e declarativa os itens ranqueados de uma Lista
 */
export async function syncListaItems(
  listaId: string,
  items: ListaItemInput[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!listaId) {
    return { success: false, error: new Error('ID da Lista é obrigatório para sincronizar itens.') };
  }

  try {
    // 1. Tentar execução via RPC transacional sync_lista_items
    const payload = (items || []).map((it, idx) => ({
      film_id: it.film_id || it.filmId || null,
      rank: typeof it.rank === 'number' ? it.rank : idx + 1,
      custom_title: it.custom_title || it.title || null,
      custom_director: it.custom_director || it.director || null,
      custom_year: typeof it.custom_year === 'number' ? it.custom_year : (typeof it.year === 'number' ? it.year : null),
      custom_image: it.custom_image || it.image || null,
      note: it.note || null,
      order_index: typeof it.order_index === 'number' ? it.order_index : (typeof it.orderIndex === 'number' ? it.orderIndex : idx),
    }));

    const { error: rpcError } = await supabase.rpc('sync_lista_items', {
      p_lista_id: listaId,
      p_items: payload,
    });

    if (!rpcError) {
      return { success: true, error: null };
    }

    // Se o RPC não estiver disponível no banco remoto, executar fallback seguro
    if (rpcError.message?.includes('function') || rpcError.code === '42883') {
      // 1. Excluir itens anteriores
      const { error: delError } = await supabase
        .from('lista_items')
        .delete()
        .eq('lista_id', listaId);

      if (delError) {
        return { success: false, error: new Error(delError.message) };
      }

      // 2. Inserir novos itens se array não estiver vazio
      if (payload.length > 0) {
        const rowsToInsert = payload.map((it, idx) => ({
          lista_id: listaId,
          film_id: it.film_id,
          rank: it.rank,
          custom_title: it.custom_title,
          custom_director: it.custom_director,
          custom_year: it.custom_year,
          custom_image: it.custom_image,
          note: it.note,
          order_index: typeof it.order_index === 'number' ? it.order_index : idx,
        }));

        const { error: insError } = await supabase
          .from('lista_items')
          .insert(rowsToInsert);

        if (insError) {
          return { success: false, error: new Error(insError.message) };
        }
      }

      return { success: true, error: null };
    }

    // Outros erros da RPC
    if (rpcError.code === '42501' || rpcError.message.toLowerCase().includes('acesso negado')) {
      return { success: false, error: new Error('Acesso negado: apenas administradores podem gerenciar itens de listas.') };
    }

    return { success: false, error: new Error(rpcError.message) };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar itens da Lista.') };
  }
}

/**
 * Sincroniza tags associadas a uma Lista
 */
export async function syncListaTags(
  listaId: string,
  tags: (string | { tagId: string })[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!listaId) {
    return { success: false, error: new Error('ID da Lista não informado.') };
  }

  try {
    const normalizedTagIds: string[] = [];

    // Resolver IDs de tags a partir de strings ou objetos
    for (const tagItem of tags || []) {
      if (typeof tagItem === 'string') {
        const trimmed = tagItem.trim();
        if (!trimmed) continue;

        // Verifica se é UUID válido
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
          normalizedTagIds.push(trimmed);
        } else {
          // Busca ou cria tag pelo nome
          const { data: existingTags } = await fetchTags();
          const found = existingTags.find(
            (t) => t.name.toLowerCase() === trimmed.toLowerCase()
          );

          if (found) {
            normalizedTagIds.push(found.id);
          } else {
            const { data: newTag } = await createTag(trimmed);
            if (newTag) {
              normalizedTagIds.push(newTag.id);
            }
          }
        }
      } else if (tagItem && typeof tagItem === 'object' && tagItem.tagId) {
        normalizedTagIds.push(tagItem.tagId);
      }
    }

    const uniqueTagIds = Array.from(new Set(normalizedTagIds));

    // 1. Tentar RPC transacional
    const { error: rpcError } = await supabase.rpc('sync_lista_tags', {
      p_lista_id: listaId,
      p_tags: uniqueTagIds.map((id) => ({ tag_id: id })),
    });

    if (!rpcError) {
      return { success: true, error: null };
    }

    // Fallback seguro se a RPC não existir
    if (rpcError.message?.includes('function') || rpcError.code === '42883') {
      const { error: delError } = await supabase
        .from('lista_tags')
        .delete()
        .eq('lista_id', listaId);

      if (delError) {
        return { success: false, error: new Error(delError.message) };
      }

      if (uniqueTagIds.length > 0) {
        const rows = uniqueTagIds.map((tagId) => ({
          lista_id: listaId,
          tag_id: tagId,
        }));

        const { error: insError } = await supabase
          .from('lista_tags')
          .insert(rows);

        if (insError) {
          return { success: false, error: new Error(insError.message) };
        }
      }

      return { success: true, error: null };
    }

    return { success: false, error: new Error(rpcError.message) };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar tags da Lista.') };
  }
}

/**
 * Cria uma nova Lista no Supabase com suporte a itens e tags
 */
export async function createLista(
  input: CreateListaInput
): Promise<{
  data: Lista | null;
  itemsError?: Error | null;
  tagsError?: Error | null;
  error: Error | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!input.title?.trim()) {
    return { data: null, error: new Error('O título da Lista é obrigatório.') };
  }

  const coverImage = input.cover_image?.trim() || input.coverImage?.trim();
  if (!coverImage) {
    return { data: null, error: new Error('A imagem de capa da Lista é obrigatória.') };
  }

  const slug = input.slug?.trim() || slugifyLista(input.title);

  try {
    const insertPayload: Record<string, any> = {
      title: input.title.trim(),
      slug,
      intro: input.intro?.trim() || '',
      cover_image: coverImage,
      related_person_id: input.related_person_id || input.relatedPersonId || null,
      status: input.status || 'published',
      published_at: input.published_at || input.publishedAt || (input.status === 'published' ? new Date().toISOString() : null),
      scheduled_at: input.scheduled_at || input.scheduledAt || null,
      legacy_id: input.legacy_id || null,
    };

    const { data: createdRow, error: insertError } = await supabase
      .from('listas')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505' || insertError.message.includes('slug')) {
        return {
          data: null,
          error: new Error(`Já existe uma Lista cadastrada com a URL/slug "${slug}". Escolha um título ou slug diferente.`),
        };
      }
      if (insertError.code === '42501') {
        return { data: null, error: new Error('Acesso negado: apenas administradores podem criar Listas.') };
      }
      return { data: null, error: new Error(insertError.message) };
    }

    const listaId = createdRow.id;

    // Sincronizar itens vinculados se fornecidos
    let itemsError: Error | null = null;
    if (input.items && Array.isArray(input.items)) {
      const { error: itemsErr } = await syncListaItems(listaId, input.items);
      if (itemsErr) {
        console.error('Erro ao sincronizar itens da Lista criada:', itemsErr);
        itemsError = itemsErr;
      }
    }

    // Sincronizar tags se fornecidas
    let tagsError: Error | null = null;
    const tagsToSync = input.tags || input.tag_ids;
    if (tagsToSync && Array.isArray(tagsToSync)) {
      const { error: tagsErr } = await syncListaTags(listaId, tagsToSync);
      if (tagsErr) {
        console.error('Erro ao sincronizar tags da Lista criada:', tagsErr);
        tagsError = tagsErr;
      }
    }

    // Retornar Lista completa criada
    const { data: fullLista, error: fetchErr } = await fetchListaById(listaId, { includeDrafts: true });
    return {
      data: fullLista,
      itemsError,
      tagsError,
      error: fetchErr,
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao criar Lista.') };
  }
}

/**
 * Atualiza uma Lista existente no Supabase
 */
export async function updateLista(
  id: string,
  input: UpdateListaInput
): Promise<{
  data: Lista | null;
  itemsError?: Error | null;
  tagsError?: Error | null;
  error: Error | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!id) {
    return { data: null, error: new Error('ID da Lista não informado.') };
  }

  try {
    const updatePayload: Record<string, any> = {};

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.slug !== undefined) updatePayload.slug = input.slug.trim() || slugifyLista(input.title || '');
    if (input.intro !== undefined) updatePayload.intro = input.intro.trim();
    if (input.cover_image !== undefined || input.coverImage !== undefined) {
      updatePayload.cover_image = (input.cover_image || input.coverImage || '').trim();
    }
    if (input.related_person_id !== undefined || input.relatedPersonId !== undefined) {
      updatePayload.related_person_id = input.related_person_id || input.relatedPersonId || null;
    }
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.published_at !== undefined || input.publishedAt !== undefined) {
      updatePayload.published_at = input.published_at || input.publishedAt || null;
    }
    if (input.scheduled_at !== undefined || input.scheduledAt !== undefined) {
      updatePayload.scheduled_at = input.scheduled_at || input.scheduledAt || null;
    }

    updatePayload.updated_at = new Date().toISOString();

    if (Object.keys(updatePayload).length > 1) {
      const { error: updateErr } = await supabase
        .from('listas')
        .update(updatePayload)
        .eq('id', id);

      if (updateErr) {
        if (updateErr.code === '23505' || updateErr.message.includes('slug')) {
          return {
            data: null,
            error: new Error(`Já existe uma Lista com o slug "${updatePayload.slug}". Escolha outro slug.`),
          };
        }
        if (updateErr.code === '42501') {
          return { data: null, error: new Error('Acesso negado: apenas administradores podem editar Listas.') };
        }
        return { data: null, error: new Error(updateErr.message) };
      }
    }

    // Sincronizar itens se fornecidos
    let itemsError: Error | null = null;
    if (input.items !== undefined && Array.isArray(input.items)) {
      const { error: itemsErr } = await syncListaItems(id, input.items);
      if (itemsErr) {
        console.error('Erro ao sincronizar itens da Lista atualizada:', itemsErr);
        itemsError = itemsErr;
      }
    }

    // Sincronizar tags se fornecidas
    let tagsError: Error | null = null;
    const tagsToSync = input.tags || input.tag_ids;
    if (tagsToSync !== undefined && Array.isArray(tagsToSync)) {
      const { error: tagsErr } = await syncListaTags(id, tagsToSync);
      if (tagsErr) {
        console.error('Erro ao sincronizar tags da Lista atualizada:', tagsErr);
        tagsError = tagsErr;
      }
    }

    const { data: fullLista, error: fetchErr } = await fetchListaById(id, { includeDrafts: true });
    return {
      data: fullLista,
      itemsError,
      tagsError,
      error: fetchErr,
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao atualizar Lista.') };
  }
}

/**
 * Exclui uma Lista do Supabase (itens e tags são removidos via ON DELETE CASCADE)
 */
export async function deleteLista(
  id: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!id) {
    return { success: false, error: new Error('ID da Lista não informado.') };
  }

  try {
    const { error } = await supabase
      .from('listas')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem excluir Listas.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao excluir Lista.') };
  }
}
