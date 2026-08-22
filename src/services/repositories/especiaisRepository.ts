import { getSupabaseClient } from '../supabaseClient';
import {
  ContentStatus,
  EditorialAuthorCredit,
  Especial,
  EspecialItem,
  EspecialItemType,
  EspecialItemEntityJoin,
} from '../../types';
import { mapSupabaseTeamMemberToDomain } from './teamMembersRepository';
import {
  AuthorCreditInput,
  fetchEspecialAuthors,
  syncEspecialAuthors,
} from './editorialAuthorsRepository';

export interface SupabaseEspecialItemRow {
  id: string;
  especial_id: string;
  item_type: EspecialItemType;
  ensaio_id: string | null;
  critica_id: string | null;
  lista_id: string | null;
  uma_imagem_id: string | null;
  filme_id: string | null;
  pessoa_id: string | null;
  custom_label: string | null;
  order_index: number;
  created_at: string;

  // Polymorphic joined entities
  ensaio?: any;
  critica?: any;
  lista?: any;
  uma_imagem?: any;
  filme?: any;
  pessoa?: any;
}

export interface SupabaseEspecial {
  id: string;
  legacy_id: string | null;
  title: string;
  slug: string;
  subtitle: string;
  cover_image: string;
  intro: string;
  content: string;
  related_person_id: string | null;
  highlight_home: boolean;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined relational data
  related_person?: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
  } | null;
  especial_items?: SupabaseEspecialItemRow[];
  especial_authors?: any[];
}

export interface EspecialItemInput {
  item_type: EspecialItemType;
  target_id: string;
  custom_label?: string;
  order_index?: number;
}

export interface CreateEspecialInput {
  title: string;
  slug?: string;
  subtitle?: string;
  cover_image: string;
  intro?: string;
  content?: string;
  related_person_id?: string | null;
  highlight_home?: boolean;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_id?: string | null;
  items?: EspecialItemInput[];
  authors?: AuthorCreditInput[];
  related_item_ids?: string[];
}

export interface UpdateEspecialInput {
  title?: string;
  slug?: string;
  subtitle?: string;
  cover_image?: string;
  intro?: string;
  content?: string;
  related_person_id?: string | null;
  highlight_home?: boolean;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  items?: EspecialItemInput[];
  authors?: AuthorCreditInput[];
  related_item_ids?: string[];
}

export interface FetchEspeciaisOptions {
  limit?: number;
  offset?: number;
  allStatuses?: boolean;
  highlightOnly?: boolean;
  relatedPersonId?: string;
  searchQuery?: string;
  includeDrafts?: boolean;
}

/**
 * Sanitiza texto para geração de slug URL amigável
 */
export function slugifyEspecial(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Calcula o status editorial efetivo de um Especial considerando agendamentos atingidos
 */
export function getEffectiveEditorialStatus(
  status: ContentStatus,
  scheduledAt?: string | null,
  nowTime: number = Date.now()
): ContentStatus {
  if (status === 'scheduled' && scheduledAt) {
    const schTime = new Date(scheduledAt).getTime();
    if (!isNaN(schTime) && schTime <= nowTime) {
      return 'published';
    }
  }
  return status;
}

/**
 * Valida se um Especial atende rigorosamente aos critérios de visibilidade pública:
 * (status = 'published' AND (published_at IS NULL OR published_at <= now))
 * OR
 * (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now)
 */
export function isEspecialPubliclyVisible(
  item: {
    status?: ContentStatus;
    published_at?: string | null;
    publishedAt?: string | null;
    scheduled_at?: string | null;
    scheduledAt?: string | null;
  } | null | undefined,
  nowTime: number = Date.now()
): boolean {
  if (!item) return false;

  const status = item.status;
  const publishedAt = item.published_at !== undefined ? item.published_at : item.publishedAt;
  const scheduledAt = item.scheduled_at !== undefined ? item.scheduled_at : item.scheduledAt;

  if (status === 'published') {
    if (!publishedAt) return true;
    const pubTime = new Date(publishedAt).getTime();
    return !isNaN(pubTime) && pubTime <= nowTime;
  }

  if (status === 'scheduled') {
    if (!scheduledAt) return false;
    const schTime = new Date(scheduledAt).getTime();
    return !isNaN(schTime) && schTime <= nowTime;
  }

  return false;
}

/**
 * Query padrão com relacionamentos aninhados (itens polimórficos, autores e pessoa relacionada)
 * Executa uma única requisição com joins para evitar N+1
 */
export const ESPECIAIS_SELECT_QUERY = `
  id,
  legacy_id,
  title,
  slug,
  subtitle,
  cover_image,
  intro,
  content,
  related_person_id,
  highlight_home,
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
  especial_items (
    id,
    especial_id,
    item_type,
    ensaio_id,
    critica_id,
    lista_id,
    uma_imagem_id,
    filme_id,
    pessoa_id,
    custom_label,
    order_index,
    created_at,
    ensaio:ensaios (
      id,
      title,
      slug,
      subtitle,
      cover_image,
      category,
      status,
      published_at,
      scheduled_at
    ),
    critica:criticas (
      id,
      editorial_title,
      slug,
      cover_image,
      star_rating,
      status,
      published_at,
      scheduled_at,
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
    lista:listas (
      id,
      title,
      slug,
      intro,
      cover_image,
      status
    ),
    uma_imagem:uma_imagem (
      id,
      title,
      slug,
      image_url,
      status,
      published_at,
      scheduled_at
    ),
    filme:filmes (
      id,
      title,
      slug,
      year,
      country,
      poster_url,
      backdrop_url
    ),
    pessoa:pessoas (
      id,
      name,
      slug,
      photo_url
    )
  ),
  especial_authors (
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
 * Mapeia registro do Supabase para o modelo de domínio Especial
 */
export function mapSupabaseEspecialToDomain(raw: SupabaseEspecial): Especial {
  const now = Date.now();

  // 1. Mapeamento dos Autores / Curadores
  const authorCredits: EditorialAuthorCredit[] = [];
  if (Array.isArray(raw.especial_authors)) {
    const sortedAuthors = [...raw.especial_authors].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const auth of sortedAuthors) {
      const memberRaw = Array.isArray(auth.team_members) ? auth.team_members[0] : auth.team_members;
      if (memberRaw) {
        authorCredits.push({
          id: auth.id,
          publicationId: raw.id,
          memberId: auth.member_id,
          roleName: auth.role_name || 'Curadoria',
          orderIndex: auth.order_index ?? 0,
          createdAt: auth.created_at,
          member: mapSupabaseTeamMemberToDomain(memberRaw),
        });
      }
    }
  }

  // 2. Mapeamento dos Itens Polimórficos do Dossiê
  const items: EspecialItem[] = [];
  const relatedItemIds: string[] = [];

  if (Array.isArray(raw.especial_items)) {
    const sortedItems = [...raw.especial_items].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const it of sortedItems) {
      const itemType = it.item_type as EspecialItemType;
      let targetId = '';
      let entity: EspecialItemEntityJoin | undefined = undefined;

      const ensaioObj = Array.isArray(it.ensaio) ? it.ensaio[0] : it.ensaio;
      const criticaObj = Array.isArray(it.critica) ? it.critica[0] : it.critica;
      const listaObj = Array.isArray(it.lista) ? it.lista[0] : it.lista;
      const umaImagemObj = Array.isArray(it.uma_imagem) ? it.uma_imagem[0] : it.uma_imagem;
      const filmeObj = Array.isArray(it.filme) ? it.filme[0] : it.filme;
      const pessoaObj = Array.isArray(it.pessoa) ? it.pessoa[0] : it.pessoa;

      if (itemType === 'ensaio' && it.ensaio_id) {
        targetId = it.ensaio_id;
        if (ensaioObj) {
          entity = {
            id: ensaioObj.id,
            title: ensaioObj.title,
            slug: ensaioObj.slug,
            coverImage: ensaioObj.cover_image,
            category: ensaioObj.category,
          };
        }
      } else if (itemType === 'critica' && it.critica_id) {
        targetId = it.critica_id;
        if (criticaObj) {
          const critFilm = Array.isArray(criticaObj.film) ? criticaObj.film[0] : criticaObj.film;
          entity = {
            id: criticaObj.id,
            title: criticaObj.editorial_title,
            slug: criticaObj.slug,
            coverImage: criticaObj.cover_image || critFilm?.backdrop_url || critFilm?.poster_url,
            starRating: criticaObj.star_rating,
            film: critFilm,
          };
        }
      } else if (itemType === 'lista' && it.lista_id) {
        targetId = it.lista_id;
        if (listaObj) {
          entity = {
            id: listaObj.id,
            title: listaObj.title,
            slug: listaObj.slug,
            coverImage: listaObj.cover_image,
            intro: listaObj.intro,
          };
        }
      } else if (itemType === 'uma_imagem' && it.uma_imagem_id) {
        targetId = it.uma_imagem_id;
        if (umaImagemObj) {
          entity = {
            id: umaImagemObj.id,
            title: umaImagemObj.title,
            slug: umaImagemObj.slug,
            coverImage: umaImagemObj.image_url,
          };
        }
      } else if (itemType === 'filme' && it.filme_id) {
        targetId = it.filme_id;
        if (filmeObj) {
          entity = {
            id: filmeObj.id,
            title: filmeObj.title,
            slug: filmeObj.slug,
            year: filmeObj.year,
            country: filmeObj.country,
            poster_url: filmeObj.poster_url,
            backdrop_url: filmeObj.backdrop_url,
            coverImage: filmeObj.backdrop_url || filmeObj.poster_url,
          };
        }
      } else if (itemType === 'pessoa' && it.pessoa_id) {
        targetId = it.pessoa_id;
        if (pessoaObj) {
          entity = {
            id: pessoaObj.id,
            name: pessoaObj.name,
            title: pessoaObj.name,
            slug: pessoaObj.slug,
            photo_url: pessoaObj.photo_url,
            coverImage: pessoaObj.photo_url,
          };
        }
      }

      if (targetId) {
        relatedItemIds.push(targetId);
        items.push({
          id: it.id,
          especialId: raw.id,
          itemType,
          targetId,
          customLabel: it.custom_label || undefined,
          orderIndex: it.order_index ?? 0,
          createdAt: it.created_at,
          ensaio: ensaioObj,
          critica: criticaObj,
          lista: listaObj,
          umaImagem: umaImagemObj,
          filme: filmeObj,
          pessoa: pessoaObj,
          entity,
        });
      }
    }
  }

  // 3. Pessoa Relacionada (se houver)
  const relPerson = Array.isArray(raw.related_person) ? raw.related_person[0] : raw.related_person;

  // 4. Status Editorial Efetivo
  const effectiveStatus = getEffectiveEditorialStatus(raw.status, raw.scheduled_at, now);

  return {
    id: raw.id,
    legacyId: raw.legacy_id,
    title: raw.title,
    slug: raw.slug,
    subtitle: raw.subtitle || '',
    coverImage: raw.cover_image,
    intro: raw.intro || '',
    content: raw.content || '',
    relatedPersonId: raw.related_person_id,
    relatedPerson: relPerson
      ? {
          id: relPerson.id,
          name: relPerson.name,
          slug: relPerson.slug,
          photo_url: relPerson.photo_url,
        }
      : null,
    items,
    relatedItemIds,
    highlightHome: Boolean(raw.highlight_home),
    status: effectiveStatus,
    publishedAt: raw.published_at,
    scheduledAt: raw.scheduled_at,
    authorCredits,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * Busca Especiais com filtros opcionais
 */
export async function fetchEspeciais(
  options: FetchEspeciaisOptions = {}
): Promise<{ data: Especial[]; count: number; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: [], count: 0, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase.from('especiais').select(ESPECIAIS_SELECT_QUERY, { count: 'exact' });

    // Se for consulta pública (não allStatuses e não includeDrafts), pré-filtra status no banco
    if (!options.allStatuses && !options.includeDrafts) {
      query = query.in('status', ['published', 'scheduled']);
    }

    if (options.highlightOnly) {
      query = query.eq('highlight_home', true);
    }

    if (options.relatedPersonId) {
      query = query.eq('related_person_id', options.relatedPersonId);
    }

    if (options.searchQuery?.trim()) {
      const term = `%${options.searchQuery.trim()}%`;
      query = query.or(`title.ilike.${term},subtitle.ilike.${term},intro.ilike.${term}`);
    }

    query = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      console.error('Erro ao buscar Especiais:', error);
      return { data: [], count: 0, error: new Error(error.message) };
    }

    const rawList = (data as unknown as SupabaseEspecial[]) || [];
    let domainList = rawList.map(mapSupabaseEspecialToDomain);

    // Validação temporal e editorial rigorosa de visibilidade pública (data + hora + timezone)
    if (!options.allStatuses && !options.includeDrafts) {
      const nowTime = Date.now();
      domainList = domainList.filter((item) => isEspecialPubliclyVisible(item, nowTime));
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
    return { data: [], count: 0, error: new Error(err?.message || 'Falha ao buscar Especiais.') };
  }
}

/**
 * Busca Especial por ID
 */
export async function fetchEspecialById(
  id: string,
  options: { includeDrafts?: boolean } = {}
): Promise<{ data: Especial | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!id) {
    return { data: null, error: new Error('ID do Especial não informado.') };
  }

  try {
    const { data, error } = await supabase
      .from('especiais')
      .select(ESPECIAIS_SELECT_QUERY)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const raw = data as unknown as SupabaseEspecial;

    if (!options.includeDrafts && !isEspecialPubliclyVisible(raw)) {
      return { data: null, error: null };
    }

    return { data: mapSupabaseEspecialToDomain(raw), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar Especial por ID.') };
  }
}

/**
 * Busca Especial por Slug
 */
export async function fetchEspecialBySlug(
  slug: string,
  options: { includeDrafts?: boolean } = {}
): Promise<{ data: Especial | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!slug) {
    return { data: null, error: new Error('Slug do Especial não informado.') };
  }

  try {
    const { data, error } = await supabase
      .from('especiais')
      .select(ESPECIAIS_SELECT_QUERY)
      .eq('slug', slug.trim())
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const raw = data as unknown as SupabaseEspecial;

    if (!options.includeDrafts && !isEspecialPubliclyVisible(raw)) {
      return { data: null, error: null };
    }

    return { data: mapSupabaseEspecialToDomain(raw), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar Especial por Slug.') };
  }
}

/**
 * Sincroniza de forma atômica e declarativa os itens de um Especial na tabela relacional public.especial_items
 * via RPC PostgreSQL (public.sync_especial_items).
 */
export async function syncEspecialItems(
  especialId: string,
  items: EspecialItemInput[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!especialId) {
    return { success: false, error: new Error('ID do Especial não informado.') };
  }

  const safeItems = Array.isArray(items) ? items : [];

  const rpcPayload = safeItems.map((item, index) => ({
    item_type: item.item_type,
    item_id: item.target_id,
    custom_label: item.custom_label?.trim() || null,
    order_index: typeof item.order_index === 'number' ? item.order_index : index,
  }));

  try {
    const { error } = await supabase.rpc('sync_especial_items', {
      p_especial_id: especialId,
      p_items: rpcPayload,
    });

    if (error) {
      if (error.code === '42501' || error.message.toLowerCase().includes('acesso negado') || error.message.toLowerCase().includes('not authorized')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem gerenciar itens de Especiais.') };
      }
      if (error.code === 'P0002' || error.message.toLowerCase().includes('não foi encontrado')) {
        return { success: false, error: new Error('Especial não encontrado.') };
      }
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key') || error.message.toLowerCase().includes('não existe')) {
        return { success: false, error: new Error('Uma ou mais entidades vinculadas nos itens não foram encontradas no banco de dados.') };
      }
      if (error.code === '22023') {
        return { success: false, error: new Error('Dados de itens inválidos para o Especial.') };
      }
      if (error.code === '23505') {
        return { success: false, error: new Error('Erro de duplicidade ao salvar os itens do Especial.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar itens do Especial.') };
  }
}

/**
 * Cria um novo Especial no Supabase com suporte a itens e autores relacionais
 */
export async function createEspecial(
  input: CreateEspecialInput
): Promise<{
  data: Especial | null;
  itemsError?: Error | null;
  authorsError?: Error | null;
  error: Error | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!input.title?.trim()) {
    return { data: null, error: new Error('O título do Especial é obrigatório.') };
  }

  if (!input.cover_image?.trim()) {
    return { data: null, error: new Error('A imagem de capa do Especial é obrigatória.') };
  }

  const slug = input.slug?.trim() || slugifyEspecial(input.title);

  try {
    const insertPayload: Record<string, any> = {
      title: input.title.trim(),
      slug,
      subtitle: input.subtitle?.trim() || '',
      cover_image: input.cover_image.trim(),
      intro: input.intro?.trim() || '',
      content: input.content?.trim() || '',
      related_person_id: input.related_person_id || null,
      highlight_home: Boolean(input.highlight_home),
      status: input.status || 'published',
      published_at: input.published_at || (input.status === 'published' ? new Date().toISOString() : null),
      scheduled_at: input.scheduled_at || null,
      legacy_id: input.legacy_id || null,
    };

    const { data: createdRow, error: insertError } = await supabase
      .from('especiais')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505' || insertError.message.includes('slug')) {
        return {
          data: null,
          error: new Error(`Já existe um Especial cadastrado com a URL/slug "${slug}". Escolha um título ou slug diferente.`),
        };
      }
      if (insertError.code === '42501') {
        return { data: null, error: new Error('Acesso negado: apenas administradores podem criar Especiais.') };
      }
      return { data: null, error: new Error(insertError.message) };
    }

    const especialId = createdRow.id;

    // Sincronizar itens vinculados se fornecidos
    let itemsError: Error | null = null;
    if (input.items && Array.isArray(input.items)) {
      const { error: itemsErr } = await syncEspecialItems(especialId, input.items);
      if (itemsErr) {
        console.error('Erro ao sincronizar itens do Especial criado:', itemsErr);
        itemsError = itemsErr;
      }
    }

    // Sincronizar autores se fornecidos
    let authorsError: Error | null = null;
    if (input.authors && Array.isArray(input.authors)) {
      const { error: authErr } = await syncEspecialAuthors(especialId, input.authors);
      if (authErr) {
        console.error('Erro ao sincronizar autores do Especial criado:', authErr);
        authorsError = authErr;
      }
    }

    const { data: createdEspecial, error: fetchErr } = await fetchEspecialById(especialId, { includeDrafts: true });
    return {
      data: createdEspecial,
      itemsError,
      authorsError,
      error: fetchErr,
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao criar Especial.') };
  }
}

/**
 * Atualiza um Especial existente no Supabase com suporte a itens e autores relacionais
 */
export async function updateEspecial(
  id: string,
  input: UpdateEspecialInput
): Promise<{
  data: Especial | null;
  itemsError?: Error | null;
  authorsError?: Error | null;
  error: Error | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!id) {
    return { data: null, error: new Error('ID do Especial não informado.') };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.slug !== undefined) updatePayload.slug = input.slug.trim();
    if (input.subtitle !== undefined) updatePayload.subtitle = input.subtitle.trim();
    if (input.cover_image !== undefined) updatePayload.cover_image = input.cover_image.trim();
    if (input.intro !== undefined) updatePayload.intro = input.intro.trim();
    if (input.content !== undefined) updatePayload.content = input.content.trim();
    if (input.related_person_id !== undefined) updatePayload.related_person_id = input.related_person_id;
    if (input.highlight_home !== undefined) updatePayload.highlight_home = Boolean(input.highlight_home);
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.published_at !== undefined) updatePayload.published_at = input.published_at;
    if (input.scheduled_at !== undefined) updatePayload.scheduled_at = input.scheduled_at;

    const { error: updateError } = await supabase
      .from('especiais')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      if (updateError.code === '23505' || updateError.message.includes('slug')) {
        return {
          data: null,
          error: new Error(`Já existe outro Especial com o slug informado. Escolha um slug diferente.`),
        };
      }
      if (updateError.code === '42501') {
        return { data: null, error: new Error('Acesso negado: apenas administradores podem editar Especiais.') };
      }
      if (updateError.code === 'P0002') {
        return { data: null, error: new Error('Especial não encontrado para atualização.') };
      }
      return { data: null, error: new Error(updateError.message) };
    }

    // Sincronizar itens vinculados se especificado
    let itemsError: Error | null = null;
    if (input.items !== undefined) {
      const { error: itemsErr } = await syncEspecialItems(id, input.items);
      if (itemsErr) {
        console.error('Erro ao sincronizar itens do Especial atualizado:', itemsErr);
        itemsError = itemsErr;
      }
    }

    // Sincronizar autores se especificado
    let authorsError: Error | null = null;
    if (input.authors !== undefined) {
      const { error: authErr } = await syncEspecialAuthors(id, input.authors);
      if (authErr) {
        console.error('Erro ao sincronizar autores do Especial atualizado:', authErr);
        authorsError = authErr;
      }
    }

    const { data: updatedEspecial, error: fetchErr } = await fetchEspecialById(id, { includeDrafts: true });
    return {
      data: updatedEspecial,
      itemsError,
      authorsError,
      error: fetchErr,
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao atualizar Especial.') };
  }
}

/**
 * Exclui um Especial pelo ID (cascateia para especial_items e especial_authors)
 */
export async function deleteEspecial(
  id: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!id) {
    return { success: false, error: new Error('ID do Especial não informado.') };
  }

  try {
    const { error } = await supabase.from('especiais').delete().eq('id', id);

    if (error) {
      if (error.code === '42501') {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem excluir Especiais.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao excluir Especial.') };
  }
}
