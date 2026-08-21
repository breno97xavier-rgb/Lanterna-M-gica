import { getSupabaseClient } from '../supabaseClient';
import { EditorialAuthorCredit } from '../../types';
import {
  SupabaseTeamMember,
  mapSupabaseTeamMemberToDomain,
} from './teamMembersRepository';

export interface SupabaseEnsaioAuthorRow {
  id: string;
  ensaio_id: string;
  member_id: string;
  role_name: string;
  order_index: number;
  created_at: string;
  team_members?: SupabaseTeamMember | SupabaseTeamMember[] | null;
}

export interface SupabaseCriticaAuthorRow {
  id: string;
  critica_id: string;
  member_id: string;
  role_name: string;
  order_index: number;
  created_at: string;
  team_members?: SupabaseTeamMember | SupabaseTeamMember[] | null;
}

export interface AuthorCreditInput {
  member_id: string;
  role_name?: string;
  order_index?: number;
}

const AUTHOR_CREDITS_JOIN_QUERY = `
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
    updated_at,
    team_member_roles (
      member_id,
      role_id,
      is_primary,
      order_index,
      created_at,
      editorial_roles (
        id,
        name,
        slug,
        description,
        group_category,
        order_index,
        created_at,
        updated_at
      )
    )
  )
`;

// -----------------------------------------------------------------------------
// ENSAIOS: Autoria e Créditos Editoriais
// -----------------------------------------------------------------------------

/**
 * Busca todos os autores/créditos editoriais vinculados a um Ensaio.
 */
export async function fetchEnsaioAuthors(
  ensaioId: string
): Promise<{ data: EditorialAuthorCredit[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!ensaioId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('ensaio_authors')
      .select(`
        ensaio_id,
        ${AUTHOR_CREDITS_JOIN_QUERY}
      `)
      .eq('ensaio_id', ensaioId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const credits: EditorialAuthorCredit[] = (data as unknown as SupabaseEnsaioAuthorRow[] || []).map((row) => {
      const memberRaw = Array.isArray(row.team_members) ? row.team_members[0] : row.team_members;
      return {
        id: row.id,
        publicationId: row.ensaio_id,
        memberId: row.member_id,
        roleName: row.role_name || 'Texto',
        orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
        createdAt: row.created_at,
        member: memberRaw ? mapSupabaseTeamMemberToDomain(memberRaw) : undefined,
      };
    });

    return { data: credits, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar autores do ensaio.') };
  }
}

/**
 * Sincroniza de forma atômica e declarativa os autores de um Ensaio na tabela relacional public.ensaio_authors
 * via RPC PostgreSQL (public.sync_ensaio_authors).
 * Atua exclusivamente na tabela de créditos, sem alterar os dados do ensaio.
 */
export async function syncEnsaioAuthors(
  ensaioId: string,
  authors: AuthorCreditInput[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!ensaioId) {
    return { success: false, error: new Error('ID do ensaio não informado.') };
  }

  const safeAuthors = Array.isArray(authors) ? authors : [];

  // Desduplica por (member_id, role_name) para respeitar a constraint UNIQUE
  const seen = new Set<string>();
  const uniqueCredits: AuthorCreditInput[] = [];

  for (const a of safeAuthors) {
    if (a.member_id) {
      const role = a.role_name?.trim() || 'Texto';
      const key = `${a.member_id}:::${role.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCredits.push({
          member_id: a.member_id,
          role_name: role,
          order_index: a.order_index,
        });
      }
    }
  }

  const rpcPayload = uniqueCredits.map((item, index) => ({
    member_id: item.member_id,
    role_name: item.role_name?.trim() || 'Texto',
    order_index: typeof item.order_index === 'number' ? item.order_index : index,
  }));

  try {
    const { error } = await supabase.rpc('sync_ensaio_authors', {
      p_ensaio_id: ensaioId,
      p_authors: rpcPayload,
    });

    if (error) {
      if (error.code === '42501' || error.message.toLowerCase().includes('acesso negado') || error.message.toLowerCase().includes('not authorized')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem alterar a autoria de ensaios.') };
      }
      if (error.code === 'P0002' || error.message.toLowerCase().includes('não foi encontrado')) {
        return { success: false, error: new Error('Ensaio não encontrado.') };
      }
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key')) {
        return { success: false, error: new Error('Um ou mais integrantes selecionados não foram encontrados no banco de dados.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar autores do ensaio.') };
  }
}

// -----------------------------------------------------------------------------
// PUBLICAÇÕES DO INTEGRANTE (Página Pública /equipe/:slug)
// -----------------------------------------------------------------------------

export interface MemberPublicationItem {
  id: string;
  type: 'ensaio' | 'critica';
  title: string;
  slug: string;
  subtitle?: string;
  coverImage?: string;
  date: string;
  roleName: string;
  orderIndex: number;
  starRating?: number;
  movieTitle?: string;
  director?: string;
  year?: number;
  country?: string;
  category?: string;
  readTimeMinutes?: number;
  rawDate: string;
}

/**
 * Valida visibilidade pública de um ensaio ou crítica
 */
function isContentPubliclyAvailable(
  item: { status: string; published_at: string | null; scheduled_at: string | null },
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
 * Busca todas as publicações (ensaios e críticas) assinadas por um integrante específico,
 * respeitando rigorosamente as regras de visibilidade pública (published e scheduled passados).
 * Drafts, archived e agendamentos futuros NUNCA são retornados.
 */
export async function fetchMemberPublications(
  memberId: string
): Promise<{
  ensaios: MemberPublicationItem[];
  criticas: MemberPublicationItem[];
  all: MemberPublicationItem[];
  error: Error | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ensaios: [], criticas: [], all: [], error: new Error('Cliente Supabase não configurado.') };
  }

  if (!memberId) {
    return { ensaios: [], criticas: [], all: [], error: null };
  }

  try {
    const nowTime = Date.now();

    // 1. Busca Ensaios assinados pelo integrante
    const { data: ensaioRows, error: ensaioErr } = await supabase
      .from('ensaio_authors')
      .select(`
        id,
        role_name,
        order_index,
        ensaio:ensaios (
          id,
          title,
          slug,
          subtitle,
          cover_image,
          category,
          read_time_minutes,
          status,
          published_at,
          scheduled_at,
          created_at
        )
      `)
      .eq('member_id', memberId)
      .order('order_index', { ascending: true });

    if (ensaioErr) {
      console.warn('Erro ao consultar ensaios do integrante:', ensaioErr);
    }

    // 2. Busca Críticas assinadas pelo integrante
    let criticaRowsData: any[] | null = null;
    const { data: criticaRows, error: criticaErr } = await supabase
      .from('critica_authors')
      .select(`
        id,
        role_name,
        order_index,
        critica:criticas (
          id,
          editorial_title,
          slug,
          cover_image,
          star_rating,
          status,
          published_at,
          scheduled_at,
          created_at,
          legacy_movie_title,
          legacy_director,
          legacy_year,
          legacy_country,
          film:filmes (
            id,
            title,
            year,
            country,
            poster_url,
            backdrop_url,
            legacy_director_name,
            countries:filme_countries (country:countries(name)),
            credits:film_credits (
              department,
              fallback_person_name,
              person:pessoas (name)
            )
          )
        )
      `)
      .eq('member_id', memberId)
      .order('order_index', { ascending: true });

    if (criticaErr) {
      console.warn('Aviso na consulta principal de críticas do integrante, tentando fallback simplificado:', criticaErr);
      // Fallback resiliente sem junções aninhadas complexas de filme
      const { data: fbRows, error: fbErr } = await supabase
        .from('critica_authors')
        .select(`
          id,
          role_name,
          order_index,
          critica:criticas (
            id,
            editorial_title,
            slug,
            cover_image,
            star_rating,
            status,
            published_at,
            scheduled_at,
            created_at,
            legacy_movie_title,
            legacy_director,
            legacy_year,
            legacy_country
          )
        `)
        .eq('member_id', memberId)
        .order('order_index', { ascending: true });

      if (fbErr) {
        console.error('Erro no fallback de críticas do integrante:', fbErr);
      } else {
        criticaRowsData = fbRows;
      }
    } else {
      criticaRowsData = criticaRows;
    }

    // Formata e filtra Ensaios públicos
    const mappedEnsaios: MemberPublicationItem[] = [];
    if (Array.isArray(ensaioRows)) {
      for (const row of ensaioRows) {
        const ensaioData = Array.isArray(row.ensaio) ? row.ensaio[0] : row.ensaio;
        if (ensaioData && isContentPubliclyAvailable(ensaioData, nowTime)) {
          const sourceDate = ensaioData.status === 'scheduled' && ensaioData.scheduled_at
            ? ensaioData.scheduled_at
            : ensaioData.published_at || ensaioData.created_at;

          mappedEnsaios.push({
            id: ensaioData.id,
            type: 'ensaio',
            title: ensaioData.title,
            slug: ensaioData.slug,
            subtitle: ensaioData.subtitle || undefined,
            coverImage: ensaioData.cover_image || undefined,
            date: sourceDate,
            rawDate: sourceDate,
            roleName: row.role_name || 'Texto',
            orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
            category: ensaioData.category || 'Filosofia & Estética',
            readTimeMinutes: ensaioData.read_time_minutes || 5,
          });
        }
      }
    }

    // Formata e filtra Críticas públicas
    const mappedCriticas: MemberPublicationItem[] = [];
    if (Array.isArray(criticaRowsData)) {
      for (const row of criticaRowsData) {
        const criticaData = Array.isArray(row.critica) ? row.critica[0] : row.critica;
        if (criticaData && isContentPubliclyAvailable(criticaData, nowTime)) {
          const film = Array.isArray(criticaData.film) ? criticaData.film[0] : criticaData.film;
          
          let dirName = criticaData.legacy_director || '';
          let movieTitle = criticaData.legacy_movie_title || '';
          let movieYear = criticaData.legacy_year || undefined;
          let movieCountry = criticaData.legacy_country || undefined;

          if (film) {
            movieTitle = film.title || movieTitle;
            movieYear = film.year || movieYear;
            movieCountry = film.country || movieCountry;

            const dirCredit = film.credits?.find(
              (c: any) => c.department === 'Direção' || (c.department && c.department.toLowerCase().includes('dire'))
            );
            dirName = dirCredit?.person?.name || dirCredit?.fallback_person_name || film.legacy_director_name || dirName;
          }

          const sourceDate = criticaData.status === 'scheduled' && criticaData.scheduled_at
            ? criticaData.scheduled_at
            : criticaData.published_at || criticaData.created_at;

          mappedCriticas.push({
            id: criticaData.id,
            type: 'critica',
            title: criticaData.editorial_title,
            slug: criticaData.slug,
            coverImage: criticaData.cover_image || film?.backdrop_url || film?.poster_url || undefined,
            date: sourceDate,
            rawDate: sourceDate,
            roleName: row.role_name || 'Crítica',
            orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
            starRating: criticaData.star_rating ? Number(criticaData.star_rating) : undefined,
            movieTitle: movieTitle || undefined,
            director: dirName || undefined,
            year: movieYear,
            country: movieCountry,
          });
        }
      }
    }

    // Ordenação cronológica decrescente por data
    const sortByDateDesc = (a: MemberPublicationItem, b: MemberPublicationItem) => {
      const timeA = new Date(a.rawDate).getTime() || 0;
      const timeB = new Date(b.rawDate).getTime() || 0;
      return timeB - timeA;
    };

    mappedEnsaios.sort(sortByDateDesc);
    mappedCriticas.sort(sortByDateDesc);

    const allPublications = [...mappedEnsaios, ...mappedCriticas].sort(sortByDateDesc);

    return {
      ensaios: mappedEnsaios,
      criticas: mappedCriticas,
      all: allPublications,
      error: null,
    };
  } catch (err: any) {
    return {
      ensaios: [],
      criticas: [],
      all: [],
      error: new Error(err?.message || 'Falha ao buscar publicações do integrante.'),
    };
  }
}


/**
 * Busca todos os autores/créditos editoriais vinculados a uma Crítica.
 */
export async function fetchCriticaAuthors(
  criticaId: string
): Promise<{ data: EditorialAuthorCredit[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!criticaId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('critica_authors')
      .select(`
        critica_id,
        ${AUTHOR_CREDITS_JOIN_QUERY}
      `)
      .eq('critica_id', criticaId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const credits: EditorialAuthorCredit[] = (data as unknown as SupabaseCriticaAuthorRow[] || []).map((row) => {
      const memberRaw = Array.isArray(row.team_members) ? row.team_members[0] : row.team_members;
      return {
        id: row.id,
        publicationId: row.critica_id,
        memberId: row.member_id,
        roleName: row.role_name || 'Crítica',
        orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
        createdAt: row.created_at,
        member: memberRaw ? mapSupabaseTeamMemberToDomain(memberRaw) : undefined,
      };
    });

    return { data: credits, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar autores da crítica.') };
  }
}

/**
 * Sincroniza de forma atômica e declarativa os autores de uma Crítica na tabela relacional public.critica_authors
 * via RPC PostgreSQL (public.sync_critica_authors).
 * Atua exclusivamente na tabela de créditos, sem alterar os dados da crítica.
 */
export async function syncCriticaAuthors(
  criticaId: string,
  authors: AuthorCreditInput[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!criticaId) {
    return { success: false, error: new Error('ID da crítica não informado.') };
  }

  const safeAuthors = Array.isArray(authors) ? authors : [];

  // Desduplica por (member_id, role_name) para respeitar a constraint UNIQUE
  const seen = new Set<string>();
  const uniqueCredits: AuthorCreditInput[] = [];

  for (const a of safeAuthors) {
    if (a.member_id) {
      const role = a.role_name?.trim() || 'Crítica';
      const key = `${a.member_id}:::${role.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCredits.push({
          member_id: a.member_id,
          role_name: role,
          order_index: a.order_index,
        });
      }
    }
  }

  const rpcPayload = uniqueCredits.map((item, index) => ({
    member_id: item.member_id,
    role_name: item.role_name?.trim() || 'Crítica',
    order_index: typeof item.order_index === 'number' ? item.order_index : index,
  }));

  try {
    const { error } = await supabase.rpc('sync_critica_authors', {
      p_critica_id: criticaId,
      p_authors: rpcPayload,
    });

    if (error) {
      if (error.code === '42501' || error.message.toLowerCase().includes('acesso negado') || error.message.toLowerCase().includes('not authorized')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem alterar a autoria de críticas.') };
      }
      if (error.code === 'P0002' || error.message.toLowerCase().includes('não foi encontrada')) {
        return { success: false, error: new Error('Crítica não encontrada.') };
      }
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key')) {
        return { success: false, error: new Error('Um ou mais integrantes selecionados não foram encontrados no banco de dados.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar autores da crítica.') };
  }
}
