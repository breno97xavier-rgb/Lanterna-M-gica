import { getSupabaseClient } from '../supabaseClient';
import { ContentStatus, Ensaio, EditorialAuthorCredit } from '../../types';
import { SupabaseTag, fetchTags, createTag } from './tagsRepository';
import { mapSupabaseTeamMemberToDomain } from './teamMembersRepository';
import { getEditorialDateString } from '../../utils/dateUtils';

export interface SupabaseEnsaio {
  id: string;
  legacy_id: string | null;
  title: string;
  slug: string;
  subtitle: string;
  cover_image: string;
  content: string;
  category: string;
  author: string;
  read_time_minutes: number;
  highlight_home: boolean;
  seo_title: string | null;
  seo_description: string | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;

  // Relational data
  tags?: SupabaseTag[];
  authors?: EditorialAuthorCredit[];
}

export interface CreateEnsaioInput {
  title: string;
  slug?: string;
  subtitle?: string;
  cover_image?: string;
  content: string;
  category?: string;
  author?: string;
  read_time_minutes?: number;
  highlight_home?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_id?: string | null;
  tag_ids?: string[];
  tags?: string[];
}

export interface UpdateEnsaioInput {
  title?: string;
  slug?: string;
  subtitle?: string;
  cover_image?: string;
  content?: string;
  category?: string;
  author?: string;
  read_time_minutes?: number;
  highlight_home?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  tag_ids?: string[];
  tags?: string[];
}

/**
 * Sanitiza texto para geração de slug URL amigável
 */
export function slugifyEnsaio(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Calcula tempo estimado de leitura (aprox. 200 palavras por minuto)
 */
export function calculateReadTimeMinutes(content: string): number {
  if (!content || !content.trim()) return 3;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Valida se um ensaio atende rigorosamente aos critérios de visibilidade pública:
 * (
 *   status = 'published' AND (published_at IS NULL OR published_at <= now)
 * )
 * OR
 * (
 *   status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now
 * )
 */
export function isEnsaioPubliclyVisible(
  ensaio: Pick<SupabaseEnsaio, 'status' | 'published_at' | 'scheduled_at'>,
  nowTime: number = Date.now()
): boolean {
  if (ensaio.status === 'published') {
    if (!ensaio.published_at) return true;
    const pubTime = new Date(ensaio.published_at).getTime();
    return !isNaN(pubTime) && pubTime <= nowTime;
  }

  if (ensaio.status === 'scheduled') {
    if (!ensaio.scheduled_at) return false;
    const schTime = new Date(ensaio.scheduled_at).getTime();
    return !isNaN(schTime) && schTime <= nowTime;
  }

  return false;
}

/**
 * Mapeia registro cru do banco (com joins) para a interface SupabaseEnsaio
 */
function mapRawEnsaioToSupabaseEnsaio(row: any): SupabaseEnsaio {
  const tags: SupabaseTag[] = [];
  if (Array.isArray(row.ensaio_tags)) {
    row.ensaio_tags.forEach((et: any) => {
      if (et && et.tag) {
        tags.push({
          id: et.tag.id,
          name: et.tag.name,
          slug: et.tag.slug,
          created_at: et.tag.created_at,
        });
      }
    });
  }

  const authors: EditorialAuthorCredit[] = [];
  if (Array.isArray(row.ensaio_authors)) {
    row.ensaio_authors.forEach((ea: any) => {
      if (ea) {
        const memberRaw = Array.isArray(ea.team_members) ? ea.team_members[0] : ea.team_members;
        authors.push({
          id: ea.id,
          publicationId: row.id,
          memberId: ea.member_id,
          roleName: ea.role_name || 'Texto',
          orderIndex: typeof ea.order_index === 'number' ? ea.order_index : 0,
          createdAt: ea.created_at,
          member: memberRaw ? mapSupabaseTeamMemberToDomain(memberRaw) : undefined,
        });
      }
    });
    authors.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  return {
    id: row.id,
    legacy_id: row.legacy_id || null,
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle || '',
    cover_image: row.cover_image || '',
    content: row.content || '',
    category: row.category || 'Filosofia & Estética',
    author: row.author || 'Redação Lanterna Mágica',
    read_time_minutes: row.read_time_minutes ?? 5,
    highlight_home: Boolean(row.highlight_home),
    seo_title: row.seo_title || null,
    seo_description: row.seo_description || null,
    status: row.status || 'draft',
    published_at: row.published_at || null,
    scheduled_at: row.scheduled_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags,
    authors,
  };
}

/**
 * Converte SupabaseEnsaio para o formato da interface Ensaio utilizada no frontend.
 * Garante que a data editorial corresponda ao dia correto de publicação/agendamento.
 */
export function mapSupabaseEnsaioToEnsaio(item: SupabaseEnsaio): Ensaio {
  const tagNames = item.tags?.map((t) => t.name) || [];
  const sourceDate = item.status === 'scheduled' && item.scheduled_at
    ? item.scheduled_at
    : item.published_at || item.created_at;

  const editorialDate = getEditorialDateString(sourceDate);

  // Nome do autor principal a partir de relacionamentos reais, com fallback transparente para item.author legado
  const primaryAuthorName = (item.authors && item.authors.length > 0)
    ? (item.authors[0].member?.name || item.author || 'Redação Lanterna Mágica')
    : (item.author || 'Redação Lanterna Mágica');

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    subtitle: item.subtitle,
    coverImage: item.cover_image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1600',
    content: item.content,
    category: item.category,
    tags: tagNames,
    author: primaryAuthorName,
    authors: item.authors,
    date: editorialDate,
    readTimeMinutes: item.read_time_minutes,
    highlightHome: item.highlight_home,
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
 * Query padrão com relacionamentos aninhados (tags e autores editoriais)
 */
const ENSAIOS_SELECT_QUERY = `
  id,
  legacy_id,
  title,
  slug,
  subtitle,
  cover_image,
  content,
  category,
  author,
  read_time_minutes,
  highlight_home,
  seo_title,
  seo_description,
  status,
  published_at,
  scheduled_at,
  created_at,
  updated_at,
  ensaio_tags(
    tag:tags(id, name, slug, created_at)
  ),
  ensaio_authors(
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
 * Sincroniza tags de um ensaio na tabela associativa public.ensaio_tags
 */
async function syncEnsaioTags(
  ensaioId: string,
  tagIds?: string[],
  tagNames?: string[]
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

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

  // 3. Remover relações antigas
  const { error: deleteError } = await supabase
    .from('ensaio_tags')
    .delete()
    .eq('ensaio_id', ensaioId);

  if (deleteError) {
    console.error('Erro ao limpar tags do ensaio:', deleteError);
  }

  // 4. Inserir novas relações
  if (targetTagIds.size > 0) {
    const insertPayload = Array.from(targetTagIds).map((tagId) => ({
      ensaio_id: ensaioId,
      tag_id: tagId,
    }));

    const { error: insertError } = await supabase
      .from('ensaio_tags')
      .insert(insertPayload);

    if (insertError) {
      console.error('Erro ao associar novas tags ao ensaio:', insertError);
    }
  }
}

/**
 * Busca ensaios com suporte a filtros e ordenação.
 * Consultas públicas (allStatuses !== true) aplicam estritamente o filtro de disponibilidade editorial.
 */
export async function fetchEnsaios(options?: {
  allStatuses?: boolean;
  category?: string;
  highlightHome?: boolean;
  searchQuery?: string;
  limit?: number;
}): Promise<{ data: SupabaseEnsaio[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('ensaios')
      .select(ENSAIOS_SELECT_QUERY);

    // Se for consulta pública, pré-filtra por status no banco
    if (!options?.allStatuses) {
      query = query.in('status', ['published', 'scheduled']);
    }

    if (options?.category && options.category !== 'todas' && options.category !== 'Todos') {
      query = query.eq('category', options.category);
    }

    if (options?.highlightHome !== undefined) {
      query = query.eq('highlight_home', options.highlightHome);
    }

    if (options?.searchQuery && options.searchQuery.trim()) {
      const term = options.searchQuery.trim();
      query = query.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%,content.ilike.%${term}%,author.ilike.%${term}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    let mapped = (data || []).map(mapRawEnsaioToSupabaseEnsaio);

    // Aplicação estrita em memória das regras de visibilidade pública
    if (!options?.allStatuses) {
      const nowTime = Date.now();
      mapped = mapped.filter((item) => isEnsaioPubliclyVisible(item, nowTime));
    }

    // Aplica limit após o filtro de visibilidade pública
    if (options?.limit && options.limit > 0) {
      mapped = mapped.slice(0, options.limit);
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro inesperado ao buscar ensaios.') };
  }
}

/**
 * Busca ensaio por ID com joins de tags.
 */
export async function fetchEnsaioById(
  id: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: SupabaseEnsaio | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('ensaios')
      .select(ENSAIOS_SELECT_QUERY)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const mapped = mapRawEnsaioToSupabaseEnsaio(data);

    if (!options?.allStatuses && !isEnsaioPubliclyVisible(mapped)) {
      return { data: null, error: new Error('Ensaio não disponível publicamente.') };
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao buscar ensaio por ID.') };
  }
}

/**
 * Busca ensaio por slug com joins de tags.
 * Em consultas públicas (padrão), bloqueia acesso direto a conteúdos agendados no futuro,
 * rascunhos ou arquivados.
 */
export async function fetchEnsaioBySlug(
  slug: string,
  options?: { allStatuses?: boolean }
): Promise<{ data: SupabaseEnsaio | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('ensaios')
      .select(ENSAIOS_SELECT_QUERY)
      .eq('slug', slug)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const mapped = mapRawEnsaioToSupabaseEnsaio(data);

    // Validação estrita de disponibilidade pública
    if (!options?.allStatuses && !isEnsaioPubliclyVisible(mapped)) {
      return { data: null, error: new Error('Este ensaio não está disponível publicamente.') };
    }

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao buscar ensaio por slug.') };
  }
}

/**
 * Cria um novo ensaio no Supabase
 */
export async function createEnsaio(
  input: CreateEnsaioInput
): Promise<{ data: SupabaseEnsaio | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const baseSlug = input.slug?.trim() ? slugifyEnsaio(input.slug) : slugifyEnsaio(input.title);
    const finalSlug = baseSlug || `ensaio-${Date.now()}`;
    const readTime = input.read_time_minutes ?? calculateReadTimeMinutes(input.content);

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
      subtitle: input.subtitle?.trim() || '',
      cover_image: input.cover_image?.trim() || '',
      content: input.content,
      category: input.category?.trim() || 'Filosofia & Estética',
      author: input.author?.trim() || 'Redação Lanterna Mágica',
      read_time_minutes: readTime,
      highlight_home: Boolean(input.highlight_home),
      seo_title: input.seo_title?.trim() || null,
      seo_description: input.seo_description?.trim() || null,
      status,
      published_at: publishedAt,
      scheduled_at: scheduledAt,
      legacy_id: input.legacy_id || null,
    };

    const { data, error } = await supabase
      .from('ensaios')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`O slug "${finalSlug}" já está em uso por outro ensaio.`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    // Sincronizar tags
    if (input.tag_ids || input.tags) {
      await syncEnsaioTags(data.id, input.tag_ids, input.tags);
    }

    return fetchEnsaioById(data.id, { allStatuses: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao criar ensaio.') };
  }
}

/**
 * Atualiza um ensaio existente no Supabase
 */
export async function updateEnsaio(
  id: string,
  input: UpdateEnsaioInput
): Promise<{ data: SupabaseEnsaio | null; error: Error | null }> {
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
      const sanitized = slugifyEnsaio(input.slug);
      if (sanitized) updatePayload.slug = sanitized;
    }
    if (input.subtitle !== undefined) updatePayload.subtitle = input.subtitle.trim();
    if (input.cover_image !== undefined) updatePayload.cover_image = input.cover_image.trim();
    if (input.content !== undefined) {
      updatePayload.content = input.content;
      if (input.read_time_minutes === undefined) {
        updatePayload.read_time_minutes = calculateReadTimeMinutes(input.content);
      }
    }
    if (input.category !== undefined) updatePayload.category = input.category.trim();
    if (input.author !== undefined) updatePayload.author = input.author.trim();
    if (input.read_time_minutes !== undefined) updatePayload.read_time_minutes = input.read_time_minutes;
    if (input.highlight_home !== undefined) updatePayload.highlight_home = Boolean(input.highlight_home);
    if (input.seo_title !== undefined) updatePayload.seo_title = input.seo_title?.trim() || null;
    if (input.seo_description !== undefined) updatePayload.seo_description = input.seo_description?.trim() || null;

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
      .from('ensaios')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`O slug informado já está em uso por outro ensaio.`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    // Sincronizar tags se foram passadas
    if (input.tag_ids !== undefined || input.tags !== undefined) {
      await syncEnsaioTags(id, input.tag_ids, input.tags);
    }

    return fetchEnsaioById(id, { allStatuses: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Erro ao atualizar ensaio.') };
  }
}

/**
 * Remove um ensaio do Supabase
 */
export async function deleteEnsaio(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { error } = await supabase
      .from('ensaios')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Erro ao excluir ensaio.') };
  }
}
