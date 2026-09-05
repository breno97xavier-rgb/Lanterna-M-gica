import { getSupabaseClient } from '../supabaseClient';
import { ContentStatus, Critica, EditorialAuthorCredit } from '../../types';
import { SupabaseFilme, fetchFilmes } from './filmesRepository';
import { SupabaseTag, fetchTags, createTag } from './tagsRepository';
import { mapSupabaseTeamMemberToDomain } from './teamMembersRepository';
import { getEditorialDateString } from '../../utils/dateUtils';

export interface SupabaseCritica {
  id: string;
  legacy_id: string | null;
  film_id: string | null;
  editorial_title: string;
  slug: string;
  content: string;
  star_rating: number; // 0.5 to 5.0 in steps of 0.5
  is_new_release: boolean;
  highlight_home: boolean;
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  // Fallback fields for legacy/unlinked items
  legacy_movie_title: string | null;
  legacy_director: string | null;
  legacy_year: number | null;
  legacy_country: string | null;

  // Joined relational data
  film?: SupabaseFilme | null;
  tags?: SupabaseTag[];
  authors?: EditorialAuthorCredit[];
}

export interface CreateCriticaInput {
  editorial_title: string;
  slug?: string;
  content: string;
  star_rating: number;
  film_id: string;
  is_new_release?: boolean;
  highlight_home?: boolean;
  cover_image?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_id?: string | null;
  legacy_movie_title?: string | null;
  legacy_director?: string | null;
  legacy_year?: number | null;
  legacy_country?: string | null;
  tag_ids?: string[];
  tags?: string[];
}

export interface UpdateCriticaInput {
  editorial_title?: string;
  slug?: string;
  content?: string;
  star_rating?: number;
  film_id?: string | null;
  is_new_release?: boolean;
  highlight_home?: boolean;
  cover_image?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_movie_title?: string | null;
  legacy_director?: string | null;
  legacy_year?: number | null;
  legacy_country?: string | null;
  tag_ids?: string[];
  tags?: string[];
}

/**
 * Sanitiza texto para slug URL amigável
 */
export function slugifyCritica(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Normaliza a classificação por estrelas para garantir múltiplos de 0.5 entre 0.5 e 5.0
 */
export function normalizeStarRating(rating: number): number {
  if (isNaN(rating) || rating <= 0) return 4.0;
  const clamped = Math.max(0.5, Math.min(5.0, rating));
  return Math.round(clamped * 2) / 2;
}

/**
 * Mapeia a linha bruta retornada pelo Supabase com joins em SupabaseCritica tipado
 */
function mapRawCriticaToSupabaseCritica(row: any): SupabaseCritica {
  // Map tags from join
  let tags: SupabaseTag[] = [];
  if (Array.isArray(row.critica_tags)) {
    tags = row.critica_tags
      .map((ct: any) => ct.tag)
      .filter(Boolean);
  }

  // Map authors from join
  const authors: EditorialAuthorCredit[] = [];
  if (Array.isArray(row.critica_authors)) {
    row.critica_authors.forEach((ca: any) => {
      if (ca) {
        const memberRaw = Array.isArray(ca.team_members) ? ca.team_members[0] : ca.team_members;
        authors.push({
          id: ca.id,
          publicationId: row.id,
          memberId: ca.member_id,
          roleName: ca.role_name || 'Crítica',
          orderIndex: typeof ca.order_index === 'number' ? ca.order_index : 0,
          createdAt: ca.created_at,
          member: memberRaw ? mapSupabaseTeamMemberToDomain(memberRaw) : undefined,
        });
      }
    });
    authors.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // Map film from join
  let film: SupabaseFilme | null = null;
  if (row.film && typeof row.film === 'object') {
    const f = row.film;
    film = {
      id: f.id,
      legacy_id: f.legacy_id || null,
      title: f.title,
      original_title: f.original_title || null,
      slug: f.slug,
      year: f.year,
      country: f.country || null,
      duration_minutes: f.duration_minutes || null,
      poster_url: f.poster_url || null,
      backdrop_url: f.backdrop_url || null,
      synopsis: f.synopsis || null,
      editorial_rating: f.editorial_rating ? Number(f.editorial_rating) : null,
      status: f.status || 'published',
      published_at: f.published_at || null,
      scheduled_at: f.scheduled_at || null,
      created_at: f.created_at,
      updated_at: f.updated_at,
      legacy_director_name: f.legacy_director_name || null,
      generos: Array.isArray(f.generos) ? f.generos.map((g: any) => g.genero || g).filter(Boolean) : [],
      countries: Array.isArray(f.countries) ? f.countries.map((c: any) => c.country || c).filter(Boolean) : [],
      credits: Array.isArray(f.credits) ? f.credits.map((c: any) => ({
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
      })) : [],
    };
  }

  return {
    id: row.id,
    legacy_id: row.legacy_id || null,
    film_id: row.film_id || null,
    editorial_title: row.editorial_title,
    slug: row.slug,
    content: row.content,
    star_rating: row.star_rating ? Number(row.star_rating) : 4.0,
    is_new_release: Boolean(row.is_new_release),
    highlight_home: Boolean(row.highlight_home),
    cover_image: row.cover_image || null,
    seo_title: row.seo_title || null,
    seo_description: row.seo_description || null,
    status: row.status || 'published',
    published_at: row.published_at || null,
    scheduled_at: row.scheduled_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    legacy_movie_title: row.legacy_movie_title || null,
    legacy_director: row.legacy_director || null,
    legacy_year: row.legacy_year ? Number(row.legacy_year) : null,
    legacy_country: row.legacy_country || null,
    film,
    tags,
    authors,
  };
}

/**
 * Valida se uma crítica atende rigorosamente aos critérios de visibilidade pública:
 * (
 *   status = 'published' AND (published_at IS NULL OR published_at <= now)
 * )
 * OR
 * (
 *   status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now
 * )
 */
export function isCriticaPubliclyVisible(
  critica: Pick<SupabaseCritica, 'status' | 'published_at' | 'scheduled_at'>,
  nowTime: number = Date.now()
): boolean {
  if (critica.status === 'published') {
    if (!critica.published_at) return true;
    const pubTime = new Date(critica.published_at).getTime();
    return !isNaN(pubTime) && pubTime <= nowTime;
  }

  if (critica.status === 'scheduled') {
    if (!critica.scheduled_at) return false;
    const schTime = new Date(critica.scheduled_at).getTime();
    return !isNaN(schTime) && schTime <= nowTime;
  }

  return false;
}

/**
 * Converte um SupabaseCritica no formato da interface Critica do frontend
 */
export function mapSupabaseCriticaToCritica(item: SupabaseCritica): Critica {
  const film = item.film;
  const directorCredit = film?.credits?.find((c) => c.department === 'Direção' || c.department.toLowerCase().includes('dire'));
  const directorName = directorCredit?.person?.name || directorCredit?.fallback_person_name || film?.legacy_director_name || item.legacy_director || 'Direção Desconhecida';
  
  const countryName = film?.countries && film.countries.length > 0
    ? film.countries.map((c) => c.name).join(' / ')
    : (film?.country || item.legacy_country || 'Internacional');

  const genresList = film?.generos && film.generos.length > 0
    ? film.generos.map((g) => g.name)
    : [];

  const genreStr = genresList.length > 0 ? genresList.join(', ') : 'Cinema';

  const sourceDate = item.status === 'scheduled' && item.scheduled_at
    ? item.scheduled_at
    : item.published_at || item.created_at;

  const editorialDate = getEditorialDateString(sourceDate);

  const primaryAuthor = (item.authors && item.authors.length > 0)
    ? item.authors[0].member?.name
    : undefined;

  return {
    id: item.id,
    filmId: item.film_id || undefined,
    movieTitle: film?.title || item.legacy_movie_title || item.editorial_title,
    editorialTitle: item.editorial_title,
    slug: item.slug,
    director: directorName,
    year: film?.year || item.legacy_year || new Date().getFullYear(),
    country: countryName,
    durationMinutes: film?.duration_minutes || 120,
    genre: genreStr,
    genres: genresList,
    coverImage: item.cover_image || film?.backdrop_url || film?.poster_url || 'https://images.unsplash.com/photo-1518676590629-3dcbd9c7a5c1?auto=format&fit=crop&q=80&w=1600',
    content: item.content,
    starRating: item.star_rating,
    tags: item.tags?.map((t) => t.name) || [],
    authors: item.authors,
    author: primaryAuthor,
    isNewRelease: item.is_new_release,
    highlightHome: item.highlight_home,
    date: editorialDate,
    seoTitle: item.seo_title || undefined,
    seoDescription: item.seo_description || undefined,
    status: item.status,
    scheduledAt: item.scheduled_at || undefined,
    publishedAt: item.published_at || undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

/**
 * Consulta padrão com relacionamentos aninhados (filme, tags e autores editoriais)
 */
const CRITICAS_SELECT_QUERY = `
  id,
  legacy_id,
  film_id,
  editorial_title,
  slug,
  content,
  star_rating,
  is_new_release,
  highlight_home,
  cover_image,
  seo_title,
  seo_description,
  status,
  published_at,
  scheduled_at,
  created_at,
  updated_at,
  legacy_movie_title,
  legacy_director,
  legacy_year,
  legacy_country,
  film:filmes(
    id,
    legacy_id,
    title,
    original_title,
    slug,
    year,
    country,
    duration_minutes,
    poster_url,
    backdrop_url,
    synopsis,
    editorial_rating,
    status,
    published_at,
    scheduled_at,
    created_at,
    updated_at,
    legacy_director_name,
    generos:filme_generos(
      genero:generos(id, name, slug)
    ),
    countries:filme_countries(
      order_index,
      country:countries(id, name, slug, flag_url)
    ),
    credits:film_credits(
      id,
      film_id,
      person_id,
      fallback_person_name,
      department,
      role,
      character_name,
      order_index,
      created_at,
      person:pessoas(id, name, slug, photo_url)
    )
  ),
  critica_tags(
    tag:tags(id, name, slug, created_at)
  ),
  critica_authors(
    id,
    member_id,
    role_name,
    order_index,
    created_at,
    team_members(
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
 * Sincroniza as tags de uma crítica na tabela associativa public.critica_tags
 */
async function syncCriticaTags(
  criticaId: string,
  tagIds?: string[],
  tagNames?: string[]
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const targetTagIds = new Set<string>();

  // 1. Incluir IDs diretos
  if (Array.isArray(tagIds)) {
    tagIds.filter(Boolean).forEach((id) => targetTagIds.add(id));
  }

  // 2. Resolver/Criar tags por nome
  if (Array.isArray(tagNames) && tagNames.length > 0) {
    const { data: existingTags } = await fetchTags();
    const availableTags = existingTags || [];

    for (const rawName of tagNames) {
      const trimmed = rawName.trim();
      if (!trimmed) continue;

      const found = availableTags.find(
        (t) => t.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (found) {
        targetTagIds.add(found.id);
      } else {
        const { data: newTag } = await createTag(trimmed);
        if (newTag) {
          targetTagIds.add(newTag.id);
          availableTags.push(newTag);
        }
      }
    }
  }

  // 3. Remover relações existentes
  await supabase.from('critica_tags').delete().eq('critica_id', criticaId);

  // 4. Inserir novas relações
  if (targetTagIds.size > 0) {
    const rows = Array.from(targetTagIds).map((tagId) => ({
      critica_id: criticaId,
      tag_id: tagId,
    }));
    await supabase.from('critica_tags').insert(rows);
  }
}

/**
 * Busca críticas cadastradas no Supabase
 * allStatuses = true: Painel Admin (todas ordenadas pela mais recente)
 * allStatuses = false: Site público (apenas published/scheduled vigentes)
 */
export async function fetchCriticas(options?: {
  allStatuses?: boolean;
  searchQuery?: string;
  filmId?: string;
  highlightHome?: boolean;
  isNewRelease?: boolean;
  limit?: number;
}): Promise<{ data: SupabaseCritica[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('criticas')
      .select(CRITICAS_SELECT_QUERY);

    // Filtros de status no Supabase
    if (!options?.allStatuses) {
      query = query.in('status', ['published', 'scheduled']);
    }

    if (options?.filmId) {
      query = query.eq('film_id', options.filmId);
    }

    if (options?.highlightHome !== undefined) {
      query = query.eq('highlight_home', options.highlightHome);
    }

    if (options?.isNewRelease !== undefined) {
      query = query.eq('is_new_release', options.isNewRelease);
    }

    if (options?.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.or(`editorial_title.ilike.%${term}%,legacy_movie_title.ilike.%${term}%,content.ilike.%${term}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    let mapped = (data || []).map(mapRawCriticaToSupabaseCritica);

    // Validação temporal rigorosa de visibilidade pública (data + hora + minuto)
    if (!options?.allStatuses) {
      const nowTime = Date.now();
      mapped = mapped.filter((item) => isCriticaPubliclyVisible(item, nowTime));
    }

    if (options?.limit && options.limit > 0) {
      mapped = mapped.slice(0, options.limit);
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro inesperado ao buscar críticas.') };
  }
}

/**
 * Busca uma crítica pelo ID com todos os joins
 */
export async function fetchCriticaById(
  id: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: SupabaseCritica | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('criticas')
      .select(CRITICAS_SELECT_QUERY)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const mapped = mapRawCriticaToSupabaseCritica(data);

    if (!options?.allStatuses && !isCriticaPubliclyVisible(mapped)) {
      return { data: null, error: new Error('Crítica não disponível publicamente.') };
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao buscar crítica por ID.') };
  }
}

/**
 * Busca uma crítica pelo slug com todos os joins
 */
export async function fetchCriticaBySlug(
  slug: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: SupabaseCritica | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('criticas')
      .select(CRITICAS_SELECT_QUERY)
      .eq('slug', slug)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const mapped = mapRawCriticaToSupabaseCritica(data);

    if (!options?.allStatuses && !isCriticaPubliclyVisible(mapped)) {
      return { data: null, error: new Error('Esta crítica não está disponível publicamente.') };
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao buscar crítica por slug.') };
  }
}

/**
 * Cria uma nova crítica no Supabase e sincroniza as tags
 */
export async function createCritica(input: CreateCriticaInput): Promise<{ data: SupabaseCritica | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const editorialTitle = input.editorial_title.trim();
  if (!editorialTitle) {
    return { data: null, error: new Error('O título editorial da crítica é obrigatório.') };
  }

  if (!input.film_id || !input.film_id.trim()) {
    return { data: null, error: new Error('É obrigatório vincular a crítica a um filme existente no acervo.') };
  }

  const content = input.content.trim();
  if (!content) {
    return { data: null, error: new Error('O texto/conteúdo da crítica é obrigatório.') };
  }

  const slug = (input.slug && input.slug.trim())
    ? slugifyCritica(input.slug.trim())
    : slugifyCritica(`${input.legacy_movie_title || editorialTitle}-critica`);

  if (!slug) {
    return { data: null, error: new Error('Slug inválido para a crítica.') };
  }

  const starRating = normalizeStarRating(input.star_rating);
  const status = input.status || 'published';

  // Lógica editorial de datas
  let publishedAt: string | null = null;
  let scheduledAt: string | null = null;

  if (status === 'published') {
    publishedAt = input.published_at || new Date().toISOString();
    scheduledAt = null;
  } else if (status === 'scheduled') {
    scheduledAt = input.scheduled_at || new Date().toISOString();
    publishedAt = null;
  } else {
    publishedAt = input.published_at || null;
    scheduledAt = null;
  }

  try {
    const payload: any = {
      editorial_title: editorialTitle,
      slug,
      content,
      star_rating: starRating,
      film_id: input.film_id.trim(),
      is_new_release: Boolean(input.is_new_release),
      highlight_home: Boolean(input.highlight_home),
      cover_image: input.cover_image || null,
      seo_title: input.seo_title || null,
      seo_description: input.seo_description || null,
      status,
      published_at: publishedAt,
      scheduled_at: scheduledAt,
      legacy_id: input.legacy_id || null,
      legacy_movie_title: input.legacy_movie_title || null,
      legacy_director: input.legacy_director || null,
      legacy_year: input.legacy_year || null,
      legacy_country: input.legacy_country || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('criticas')
      .insert(payload)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505' || insertError.message.includes('slug')) {
        return { data: null, error: new Error(`O slug "${slug}" já está em uso por outra crítica.`) };
      }
      return { data: null, error: new Error(insertError.message) };
    }

    const createdId = inserted.id;

    // Sincronizar tags
    if (input.tag_ids || input.tags) {
      await syncCriticaTags(createdId, input.tag_ids, input.tags);
    }

    // Retorna a crítica criada completa (allStatuses: true para operações administrativas)
    return await fetchCriticaById(createdId, { allStatuses: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao salvar a nova crítica.') };
  }
}

/**
 * Atualiza uma crítica existente no Supabase e sincroniza suas tags
 */
export async function updateCritica(
  id: string,
  input: UpdateCriticaInput
): Promise<{ data: SupabaseCritica | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.editorial_title !== undefined) {
      const val = input.editorial_title.trim();
      if (!val) return { data: null, error: new Error('O título editorial não pode ser vazio.') };
      payload.editorial_title = val;
    }

    if (input.slug !== undefined) {
      const val = slugifyCritica(input.slug.trim());
      if (!val) return { data: null, error: new Error('Slug inválido.') };
      payload.slug = val;
    }

    if (input.content !== undefined) {
      const val = input.content.trim();
      if (!val) return { data: null, error: new Error('O conteúdo da crítica não pode ser vazio.') };
      payload.content = val;
    }

    if (input.star_rating !== undefined) {
      payload.star_rating = normalizeStarRating(input.star_rating);
    }

    if (input.film_id !== undefined) {
      const trimmedFilmId = input.film_id ? input.film_id.trim() : '';
      if (!trimmedFilmId) {
        return { data: null, error: new Error('Não é permitido desvincular o filme de uma crítica.') };
      }
      payload.film_id = trimmedFilmId;
    }

    if (input.is_new_release !== undefined) {
      payload.is_new_release = Boolean(input.is_new_release);
    }

    if (input.highlight_home !== undefined) {
      payload.highlight_home = Boolean(input.highlight_home);
    }

    if (input.cover_image !== undefined) {
      payload.cover_image = input.cover_image || null;
    }

    if (input.seo_title !== undefined) {
      payload.seo_title = input.seo_title || null;
    }

    if (input.seo_description !== undefined) {
      payload.seo_description = input.seo_description || null;
    }

    if (input.status !== undefined) {
      payload.status = input.status;
      if (input.status === 'published') {
        payload.published_at = input.published_at || new Date().toISOString();
        payload.scheduled_at = null;
      } else if (input.status === 'scheduled') {
        payload.scheduled_at = input.scheduled_at || null;
        payload.published_at = null;
      } else {
        payload.published_at = null;
        payload.scheduled_at = null;
      }
    } else {
      if (input.published_at !== undefined) payload.published_at = input.published_at || null;
      if (input.scheduled_at !== undefined) payload.scheduled_at = input.scheduled_at || null;
    }

    if (input.legacy_movie_title !== undefined) {
      payload.legacy_movie_title = input.legacy_movie_title || null;
    }

    if (input.legacy_director !== undefined) {
      payload.legacy_director = input.legacy_director || null;
    }

    if (input.legacy_year !== undefined) {
      payload.legacy_year = input.legacy_year || null;
    }

    if (input.legacy_country !== undefined) {
      payload.legacy_country = input.legacy_country || null;
    }

    const { error: updateError } = await supabase
      .from('criticas')
      .update(payload)
      .eq('id', id);

    if (updateError) {
      if (updateError.code === '23505' || updateError.message.includes('slug')) {
        return { data: null, error: new Error('O slug informado já pertence a outra crítica.') };
      }
      return { data: null, error: new Error(updateError.message) };
    }

    // Sincronizar tags caso fornecidas
    if (input.tag_ids !== undefined || input.tags !== undefined) {
      await syncCriticaTags(id, input.tag_ids, input.tags);
    }

    return await fetchCriticaById(id, { allStatuses: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao atualizar a crítica.') };
  }
}

/**
 * Exclui permanentemente uma crítica do Supabase
 */
export async function deleteCritica(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    // Exclui relações explícitas em critica_tags por segurança
    await supabase.from('critica_tags').delete().eq('critica_id', id);

    const { error } = await supabase
      .from('criticas')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Erro ao excluir a crítica.') };
  }
}
