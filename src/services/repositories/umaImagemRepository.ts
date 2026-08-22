import { getSupabaseClient } from '../supabaseClient';
import { ContentStatus, EditorialAuthorCredit, UmaImagemUmaIdeia } from '../../types';
import { SupabaseTag, fetchTags, createTag } from './tagsRepository';
import { mapSupabaseTeamMemberToDomain } from './teamMembersRepository';
import { getEditorialDateString } from '../../utils/dateUtils';

export interface SupabaseUmaImagemFilmJoin {
  id: string;
  title: string;
  slug: string;
  year?: number;
  poster_url?: string | null;
  backdrop_url?: string | null;
}

export interface SupabaseUmaImagemPersonJoin {
  id: string;
  name: string;
  slug: string;
  photo_url?: string | null;
}

export interface SupabaseUmaImagem {
  id: string;
  legacy_id: string | null;
  title: string;
  slug: string;
  image_url: string;
  content: string;
  film_id: string | null;
  person_id: string | null;
  highlight_home: boolean;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined relational data
  film?: SupabaseUmaImagemFilmJoin | null;
  person?: SupabaseUmaImagemPersonJoin | null;
  tags?: SupabaseTag[];
  authors?: EditorialAuthorCredit[];
}

export interface CreateUmaImagemInput {
  title: string;
  slug?: string;
  image_url: string;
  content: string;
  film_id?: string | null;
  person_id?: string | null;
  highlight_home?: boolean;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_id?: string | null;
  tag_ids?: string[];
  tags?: string[];
}

export interface UpdateUmaImagemInput {
  title?: string;
  slug?: string;
  image_url?: string;
  content?: string;
  film_id?: string | null;
  person_id?: string | null;
  highlight_home?: boolean;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  tag_ids?: string[];
  tags?: string[];
}

/**
 * Sanitiza texto para geração de slug URL amigável
 */
export function slugifyUmaImagem(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Valida se um registro de Uma Imagem atende rigorosamente aos critérios de visibilidade pública:
 * (
 *   status = 'published' AND (published_at IS NULL OR published_at <= now)
 * )
 * OR
 * (
 *   status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now
 * )
 */
export function isUmaImagemPubliclyVisible(
  item: Pick<SupabaseUmaImagem, 'status' | 'published_at' | 'scheduled_at'>,
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
 * Query padrão com relacionamentos aninhados (tags, autores, filme e pessoa)
 */
export const UMA_IMAGEM_SELECT_QUERY = `
  id,
  legacy_id,
  title,
  slug,
  image_url,
  content,
  film_id,
  person_id,
  highlight_home,
  status,
  published_at,
  scheduled_at,
  created_at,
  updated_at,
  film:filmes (
    id,
    title,
    slug,
    year,
    poster_url,
    backdrop_url
  ),
  person:pessoas (
    id,
    name,
    slug,
    photo_url
  ),
  uma_imagem_tags (
    tag:tags (
      id,
      name,
      slug,
      created_at
    )
  ),
  uma_imagem_authors (
    id,
    member_id,
    role_name,
    order_index,
    created_at,
    team_members (
      id,
      legacy_id,
      name,
      slug,
      photo_url,
      birth_date,
      bio,
      short_bio,
      social_links,
      display_on_about,
      order_index,
      status,
      created_at,
      updated_at
    )
  )
`;

/**
 * Mapeia registro cru retornado pelo Supabase (com joins) para a interface SupabaseUmaImagem
 */
export function mapRawUmaImagemToSupabase(row: any): SupabaseUmaImagem {
  const tags: SupabaseTag[] = [];
  if (Array.isArray(row.uma_imagem_tags)) {
    row.uma_imagem_tags.forEach((item: any) => {
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

  const authors: EditorialAuthorCredit[] = [];
  if (Array.isArray(row.uma_imagem_authors)) {
    row.uma_imagem_authors.forEach((item: any) => {
      if (item) {
        const memberRaw = Array.isArray(item.team_members) ? item.team_members[0] : item.team_members;
        authors.push({
          id: item.id,
          publicationId: row.id,
          memberId: item.member_id,
          roleName: item.role_name || 'Texto',
          orderIndex: typeof item.order_index === 'number' ? item.order_index : 0,
          createdAt: item.created_at,
          member: memberRaw ? mapSupabaseTeamMemberToDomain(memberRaw) : undefined,
        });
      }
    });
    authors.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  const rawFilm = Array.isArray(row.film) ? row.film[0] : row.film;
  const film: SupabaseUmaImagemFilmJoin | null = rawFilm ? {
    id: rawFilm.id,
    title: rawFilm.title,
    slug: rawFilm.slug,
    year: rawFilm.year ?? undefined,
    poster_url: rawFilm.poster_url || null,
    backdrop_url: rawFilm.backdrop_url || null,
  } : null;

  const rawPerson = Array.isArray(row.person) ? row.person[0] : row.person;
  const person: SupabaseUmaImagemPersonJoin | null = rawPerson ? {
    id: rawPerson.id,
    name: rawPerson.name,
    slug: rawPerson.slug,
    photo_url: rawPerson.photo_url || null,
  } : null;

  return {
    id: row.id,
    legacy_id: row.legacy_id || null,
    title: row.title,
    slug: row.slug,
    image_url: row.image_url || '',
    content: row.content || '',
    film_id: row.film_id || null,
    person_id: row.person_id || null,
    highlight_home: Boolean(row.highlight_home),
    status: row.status || 'draft',
    published_at: row.published_at || null,
    scheduled_at: row.scheduled_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    film,
    person,
    tags,
    authors,
  };
}

/**
 * Mapper central: converte SupabaseUmaImagem (snake_case e dados relacionais)
 * para o modelo de domínio UmaImagemUmaIdeia utilizado no frontend.
 */
export function mapSupabaseUmaImagemToDomain(item: SupabaseUmaImagem): UmaImagemUmaIdeia {
  const tagNames = item.tags?.map((t) => t.name) || [];
  const sourceDate = item.status === 'scheduled' && item.scheduled_at
    ? item.scheduled_at
    : item.published_at || item.created_at;

  const editorialDate = getEditorialDateString(sourceDate);

  // Nomes auxiliares para retrocompatibilidade com componentes legados
  const relatedMovieTitle = item.film?.title || undefined;
  const relatedFilmmakerName = item.person?.name || undefined;

  return {
    id: item.id,
    legacyId: item.legacy_id,
    title: item.title,
    slug: item.slug,
    image: item.image_url,
    content: item.content,
    filmId: item.film_id,
    personId: item.person_id,
    film: item.film ? {
      id: item.film.id,
      title: item.film.title,
      slug: item.film.slug,
      year: item.film.year,
      posterUrl: item.film.poster_url,
      backdropUrl: item.film.backdrop_url,
    } : null,
    person: item.person ? {
      id: item.person.id,
      name: item.person.name,
      slug: item.person.slug,
      photoUrl: item.person.photo_url,
    } : null,
    relatedMovie: relatedMovieTitle,
    relatedFilmmaker: relatedFilmmakerName,
    tags: tagNames,
    authors: item.authors,
    highlightHome: item.highlight_home,
    date: editorialDate,
    status: item.status,
    publishedAt: item.published_at || undefined,
    scheduledAt: item.scheduled_at || undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

/**
 * Sincroniza tags de Uma Imagem atomicamente através da RPC public.sync_uma_imagem_tags
 */
export async function syncUmaImagemTags(
  umaImagemId: string,
  tagIds?: string[],
  tagNames?: string[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  const targetTagIds = new Set<string>();

  // 1. Incluir IDs diretos de tags
  if (Array.isArray(tagIds)) {
    tagIds.filter(Boolean).forEach((id) => targetTagIds.add(id));
  }

  // 2. Se nomes de tags foram passados como strings, busca ou cria as tags correspondentes
  if (Array.isArray(tagNames) && tagNames.length > 0) {
    const { data: existingTags } = await fetchTags();
    const existingTagsList = existingTags || [];

    for (const rawName of tagNames) {
      const trimmed = rawName.trim();
      if (!trimmed) continue;

      const found = existingTagsList.find(
        (t) => t.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (found) {
        targetTagIds.add(found.id);
      } else {
        const { data: newTag } = await createTag(trimmed);
        if (newTag) {
          targetTagIds.add(newTag.id);
          existingTagsList.push(newTag);
        }
      }
    }
  }

  const rpcPayload = Array.from(targetTagIds).map((tagId) => ({
    tag_id: tagId,
  }));

  try {
    const { error } = await supabase.rpc('sync_uma_imagem_tags', {
      p_uma_imagem_id: umaImagemId,
      p_tags: rpcPayload,
    });

    if (error) {
      if (error.code === '42501' || error.message.toLowerCase().includes('acesso negado') || error.message.toLowerCase().includes('not authorized')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem gerenciar tags de Uma Imagem.') };
      }
      if (error.code === 'P0002' || error.message.toLowerCase().includes('não foi encontrado')) {
        return { success: false, error: new Error('Publicação de Uma Imagem não encontrada.') };
      }
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key') || error.message.toLowerCase().includes('não existe')) {
        return { success: false, error: new Error('Uma ou mais tags selecionadas não foram encontradas no banco de dados.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar tags de Uma Imagem.') };
  }
}

/**
 * Busca publicações de "Uma Imagem" com suporte a filtros, destaques e busca textual.
 * Consultas públicas (allStatuses !== true) aplicam estritamente o filtro de disponibilidade editorial.
 */
export async function fetchUmaImagem(options?: {
  allStatuses?: boolean;
  status?: ContentStatus;
  highlightHome?: boolean;
  filmId?: string;
  personId?: string;
  searchQuery?: string;
  limit?: number;
}): Promise<{ data: SupabaseUmaImagem[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('uma_imagem')
      .select(UMA_IMAGEM_SELECT_QUERY);

    // Se for consulta pública, pré-filtra por status no banco
    if (!options?.allStatuses) {
      if (options?.status) {
        query = query.eq('status', options.status);
      } else {
        query = query.in('status', ['published', 'scheduled']);
      }
    } else if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.highlightHome !== undefined) {
      query = query.eq('highlight_home', options.highlightHome);
    }

    if (options?.filmId) {
      query = query.eq('film_id', options.filmId);
    }

    if (options?.personId) {
      query = query.eq('person_id', options.personId);
    }

    if (options?.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    let mapped = (data || []).map(mapRawUmaImagemToSupabase);

    // Aplicação estrita em memória das regras de visibilidade pública
    if (!options?.allStatuses) {
      const nowTime = Date.now();
      mapped = mapped.filter((item) => isUmaImagemPubliclyVisible(item, nowTime));
    }

    // Aplica limit após o filtro de visibilidade pública
    if (options?.limit && options.limit > 0) {
      mapped = mapped.slice(0, options.limit);
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro inesperado ao buscar registros de Uma Imagem.') };
  }
}

/**
 * Busca registro de Uma Imagem por ID com joins completos.
 */
export async function fetchUmaImagemById(
  id: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: SupabaseUmaImagem | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('uma_imagem')
      .select(UMA_IMAGEM_SELECT_QUERY)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const mapped = mapRawUmaImagemToSupabase(data);

    if (!options?.allStatuses && !isUmaImagemPubliclyVisible(mapped)) {
      return { data: null, error: new Error('Registro de Uma Imagem não disponível publicamente.') };
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao buscar Uma Imagem por ID.') };
  }
}

/**
 * Busca registro de Uma Imagem por slug com joins completos.
 * Em consultas públicas (padrão), bloqueia acesso direto a conteúdos não publicados.
 */
export async function fetchUmaImagemBySlug(
  slug: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: SupabaseUmaImagem | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('uma_imagem')
      .select(UMA_IMAGEM_SELECT_QUERY)
      .eq('slug', slug)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const mapped = mapRawUmaImagemToSupabase(data);

    if (!options?.allStatuses && !isUmaImagemPubliclyVisible(mapped)) {
      return { data: null, error: new Error('Esta publicação de Uma Imagem não está disponível publicamente.') };
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao buscar Uma Imagem por slug.') };
  }
}

/**
 * Cria uma nova publicação de "Uma Imagem" no Supabase
 */
export async function createUmaImagem(
  input: CreateUmaImagemInput
): Promise<{ data: SupabaseUmaImagem | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const baseSlug = input.slug?.trim() ? slugifyUmaImagem(input.slug) : slugifyUmaImagem(input.title);
    const finalSlug = baseSlug || `uma-imagem-${Date.now()}`;

    const nowIso = new Date().toISOString();
    const status = input.status || 'draft';

    let publishedAt: string | null = null;
    let scheduledAt: string | null = null;

    if (status === 'published') {
      publishedAt = input.published_at || nowIso;
      scheduledAt = null;
    } else if (status === 'scheduled') {
      scheduledAt = input.scheduled_at || nowIso;
      publishedAt = null;
    } else {
      publishedAt = null;
      scheduledAt = null;
    }

    const payload = {
      title: input.title.trim(),
      slug: finalSlug,
      image_url: input.image_url.trim(),
      content: input.content,
      film_id: input.film_id || null,
      person_id: input.person_id || null,
      highlight_home: Boolean(input.highlight_home),
      status,
      published_at: publishedAt,
      scheduled_at: scheduledAt,
      legacy_id: input.legacy_id || null,
    };

    const { data, error } = await supabase
      .from('uma_imagem')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`O slug "${finalSlug}" já está em uso por outra publicação de Uma Imagem.`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    // Sincronizar tags se foram passadas
    if (input.tag_ids || input.tags) {
      await syncUmaImagemTags(data.id, input.tag_ids, input.tags);
    }

    return fetchUmaImagemById(data.id, { allStatuses: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao criar publicação de Uma Imagem.') };
  }
}

/**
 * Atualiza uma publicação de "Uma Imagem" existente no Supabase
 */
export async function updateUmaImagem(
  id: string,
  input: UpdateUmaImagemInput
): Promise<{ data: SupabaseUmaImagem | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.slug !== undefined) {
      const sanitized = slugifyUmaImagem(input.slug);
      if (sanitized) updatePayload.slug = sanitized;
    }
    if (input.image_url !== undefined) updatePayload.image_url = input.image_url.trim();
    if (input.content !== undefined) updatePayload.content = input.content;
    if (input.film_id !== undefined) updatePayload.film_id = input.film_id || null;
    if (input.person_id !== undefined) updatePayload.person_id = input.person_id || null;
    if (input.highlight_home !== undefined) updatePayload.highlight_home = Boolean(input.highlight_home);

    if (input.status !== undefined) {
      updatePayload.status = input.status;
      if (input.status === 'published') {
        updatePayload.published_at = input.published_at || new Date().toISOString();
        updatePayload.scheduled_at = null;
      } else if (input.status === 'scheduled') {
        updatePayload.scheduled_at = input.scheduled_at || null;
        updatePayload.published_at = null;
      } else {
        updatePayload.published_at = null;
        updatePayload.scheduled_at = null;
      }
    } else {
      if (input.published_at !== undefined) updatePayload.published_at = input.published_at;
      if (input.scheduled_at !== undefined) updatePayload.scheduled_at = input.scheduled_at;
    }

    const { error } = await supabase
      .from('uma_imagem')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`O slug informado já está em uso por outra publicação de Uma Imagem.`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    // Sincronizar tags se foram passadas
    if (input.tag_ids !== undefined || input.tags !== undefined) {
      await syncUmaImagemTags(id, input.tag_ids, input.tags);
    }

    return fetchUmaImagemById(id, { allStatuses: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao atualizar publicação de Uma Imagem.') };
  }
}

/**
 * Remove uma publicação de "Uma Imagem" do Supabase
 */
export async function deleteUmaImagem(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { error } = await supabase
      .from('uma_imagem')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Erro ao excluir publicação de Uma Imagem.') };
  }
}
