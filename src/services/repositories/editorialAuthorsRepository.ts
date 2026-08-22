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

export interface SupabaseUmaImagemAuthorRow {
  id: string;
  uma_imagem_id: string;
  member_id: string;
  role_name: string;
  order_index: number;
  created_at: string;
  team_members?: SupabaseTeamMember | SupabaseTeamMember[] | null;
}

export interface SupabaseEspecialAuthorRow {
  id: string;
  especial_id: string;
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
  type: 'ensaio' | 'critica' | 'uma_imagem' | 'especial';
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
 * Valida visibilidade pública de um conteúdo editorial
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
 * Busca todas as publicações (ensaios, críticas, uma imagem e especiais) assinadas por um integrante específico,
 * respeitando rigorosamente as regras de visibilidade pública (published e scheduled passados).
 * Drafts, archived e agendamentos futuros NUNCA são retornados.
 */
export async function fetchMemberPublications(
  memberId: string
): Promise<{
  ensaios: MemberPublicationItem[];
  criticas: MemberPublicationItem[];
  umaImagem: MemberPublicationItem[];
  especiais: MemberPublicationItem[];
  all: MemberPublicationItem[];
  error: Error | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ensaios: [], criticas: [], umaImagem: [], especiais: [], all: [], error: new Error('Cliente Supabase não configurado.') };
  }

  if (!memberId) {
    return { ensaios: [], criticas: [], umaImagem: [], especiais: [], all: [], error: null };
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

    // 3. Busca publicações de Uma Imagem assinadas pelo integrante
    let umaImagemRowsData: any[] | null = null;
    const { data: umaImagemRows, error: umaImagemErr } = await supabase
      .from('uma_imagem_authors')
      .select(`
        id,
        role_name,
        order_index,
        uma_imagem:uma_imagem (
          id,
          title,
          slug,
          image_url,
          status,
          published_at,
          scheduled_at,
          created_at,
          film:filmes (
            id,
            title,
            year,
            country,
            poster_url,
            backdrop_url,
            legacy_director_name,
            credits:film_credits (
              department,
              fallback_person_name,
              person:pessoas (name)
            )
          ),
          person:pessoas (
            id,
            name,
            slug,
            photo_url
          )
        )
      `)
      .eq('member_id', memberId)
      .order('order_index', { ascending: true });

    if (umaImagemErr) {
      console.warn('Aviso na consulta principal de Uma Imagem do integrante, tentando fallback simplificado:', umaImagemErr);
      const { data: fbUmaRows, error: fbUmaErr } = await supabase
        .from('uma_imagem_authors')
        .select(`
          id,
          role_name,
          order_index,
          uma_imagem:uma_imagem (
            id,
            title,
            slug,
            image_url,
            status,
            published_at,
            scheduled_at,
            created_at
          )
        `)
        .eq('member_id', memberId)
        .order('order_index', { ascending: true });

      if (fbUmaErr) {
        console.error('Erro no fallback de Uma Imagem do integrante:', fbUmaErr);
      } else {
        umaImagemRowsData = fbUmaRows;
      }
    } else {
      umaImagemRowsData = umaImagemRows;
    }

    // 4. Busca Especiais assinados pelo integrante
    let especialRowsData: any[] | null = null;
    const { data: especialRows, error: especialErr } = await supabase
      .from('especial_authors')
      .select(`
        id,
        role_name,
        order_index,
        especial:especiais (
          id,
          title,
          slug,
          subtitle,
          cover_image,
          status,
          published_at,
          scheduled_at,
          created_at
        )
      `)
      .eq('member_id', memberId)
      .order('order_index', { ascending: true });

    if (especialErr) {
      console.warn('Erro ao consultar especiais do integrante:', especialErr);
    } else {
      especialRowsData = especialRows;
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

    // Formata e filtra Uma Imagem públicas
    const mappedUmaImagem: MemberPublicationItem[] = [];
    if (Array.isArray(umaImagemRowsData)) {
      for (const row of umaImagemRowsData) {
        const itemData = Array.isArray(row.uma_imagem) ? row.uma_imagem[0] : row.uma_imagem;
        if (itemData && isContentPubliclyAvailable(itemData, nowTime)) {
          const film = Array.isArray(itemData.film) ? itemData.film[0] : itemData.film;
          const person = Array.isArray(itemData.person) ? itemData.person[0] : itemData.person;

          let dirName: string | undefined = person?.name;
          let movieTitle: string | undefined = film?.title;
          let movieYear: number | undefined = film?.year;
          let movieCountry: string | undefined = film?.country;

          if (film && !dirName) {
            const dirCredit = film.credits?.find(
              (c: any) => c.department === 'Direção' || (c.department && c.department.toLowerCase().includes('dire'))
            );
            dirName = dirCredit?.person?.name || dirCredit?.fallback_person_name || film.legacy_director_name || undefined;
          }

          const sourceDate = itemData.status === 'scheduled' && itemData.scheduled_at
            ? itemData.scheduled_at
            : itemData.published_at || itemData.created_at;

          mappedUmaImagem.push({
            id: itemData.id,
            type: 'uma_imagem',
            title: itemData.title,
            slug: itemData.slug,
            coverImage: itemData.image_url || film?.backdrop_url || film?.poster_url || undefined,
            date: sourceDate,
            rawDate: sourceDate,
            roleName: row.role_name || 'Texto',
            orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
            movieTitle: movieTitle || undefined,
            director: dirName || undefined,
            year: movieYear,
            country: movieCountry,
          });
        }
      }
    }

    // Formata e filtra Especiais públicos
    const mappedEspeciais: MemberPublicationItem[] = [];
    if (Array.isArray(especialRowsData)) {
      for (const row of especialRowsData) {
        const espData = Array.isArray(row.especial) ? row.especial[0] : row.especial;
        if (espData && isContentPubliclyAvailable(espData, nowTime)) {
          const sourceDate = espData.status === 'scheduled' && espData.scheduled_at
            ? espData.scheduled_at
            : espData.published_at || espData.created_at;

          mappedEspeciais.push({
            id: espData.id,
            type: 'especial',
            title: espData.title,
            slug: espData.slug,
            subtitle: espData.subtitle || undefined,
            coverImage: espData.cover_image || undefined,
            date: sourceDate,
            rawDate: sourceDate,
            roleName: row.role_name || 'Curadoria',
            orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
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
    mappedUmaImagem.sort(sortByDateDesc);
    mappedEspeciais.sort(sortByDateDesc);

    const allPublications = [...mappedEnsaios, ...mappedCriticas, ...mappedUmaImagem, ...mappedEspeciais].sort(sortByDateDesc);

    return {
      ensaios: mappedEnsaios,
      criticas: mappedCriticas,
      umaImagem: mappedUmaImagem,
      especiais: mappedEspeciais,
      all: allPublications,
      error: null,
    };
  } catch (err: any) {
    return {
      ensaios: [],
      criticas: [],
      umaImagem: [],
      especiais: [],
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

// -----------------------------------------------------------------------------
// UMA IMAGEM, UMA IDEIA: Autoria e Créditos Editoriais
// -----------------------------------------------------------------------------

/**
 * Busca todos os autores/créditos editoriais vinculados a uma publicação de Uma Imagem.
 */
export async function fetchUmaImagemAuthors(
  umaImagemId: string
): Promise<{ data: EditorialAuthorCredit[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!umaImagemId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('uma_imagem_authors')
      .select(`
        uma_imagem_id,
        ${AUTHOR_CREDITS_JOIN_QUERY}
      `)
      .eq('uma_imagem_id', umaImagemId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const credits: EditorialAuthorCredit[] = (data as unknown as SupabaseUmaImagemAuthorRow[] || []).map((row) => {
      const memberRaw = Array.isArray(row.team_members) ? row.team_members[0] : row.team_members;
      return {
        id: row.id,
        publicationId: row.uma_imagem_id,
        memberId: row.member_id,
        roleName: row.role_name || 'Texto',
        orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
        createdAt: row.created_at,
        member: memberRaw ? mapSupabaseTeamMemberToDomain(memberRaw) : undefined,
      };
    });

    return { data: credits, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar autores de Uma Imagem.') };
  }
}

/**
 * Sincroniza de forma atômica e declarativa os autores de Uma Imagem na tabela relacional public.uma_imagem_authors
 * via RPC PostgreSQL (public.sync_uma_imagem_authors).
 * Atua exclusivamente na tabela de créditos, sem alterar os dados da publicação.
 */
export async function syncUmaImagemAuthors(
  umaImagemId: string,
  authors: AuthorCreditInput[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!umaImagemId) {
    return { success: false, error: new Error('ID de Uma Imagem não informado.') };
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
    const { error } = await supabase.rpc('sync_uma_imagem_authors', {
      p_uma_imagem_id: umaImagemId,
      p_authors: rpcPayload,
    });

    if (error) {
      if (error.code === '42501' || error.message.toLowerCase().includes('acesso negado') || error.message.toLowerCase().includes('not authorized')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem alterar a autoria de Uma Imagem.') };
      }
      if (error.code === 'P0002' || error.message.toLowerCase().includes('não foi encontrado')) {
        return { success: false, error: new Error('Registro de Uma Imagem não encontrado.') };
      }
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key')) {
        return { success: false, error: new Error('Um ou mais integrantes selecionados não foram encontrados no banco de dados.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar autores de Uma Imagem.') };
  }
}

// -----------------------------------------------------------------------------
// ESPECIAIS E DOSSIÊS: Autoria e Curadoria Editorial (Fase 8)
// -----------------------------------------------------------------------------

/**
 * Busca todos os autores/curadores vinculados a um Especial.
 */
export async function fetchEspecialAuthors(
  especialId: string
): Promise<{ data: EditorialAuthorCredit[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!especialId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('especial_authors')
      .select(`
        especial_id,
        ${AUTHOR_CREDITS_JOIN_QUERY}
      `)
      .eq('especial_id', especialId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const credits: EditorialAuthorCredit[] = (data as unknown as SupabaseEspecialAuthorRow[] || []).map((row) => {
      const memberRaw = Array.isArray(row.team_members) ? row.team_members[0] : row.team_members;
      return {
        id: row.id,
        publicationId: row.especial_id,
        memberId: row.member_id,
        roleName: row.role_name || 'Curadoria',
        orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
        createdAt: row.created_at,
        member: memberRaw ? mapSupabaseTeamMemberToDomain(memberRaw) : undefined,
      };
    });

    return { data: credits, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar autores do Especial.') };
  }
}

/**
 * Sincroniza de forma atômica e declarativa os autores/curadores de um Especial na tabela relacional public.especial_authors
 * via RPC PostgreSQL (public.sync_especial_authors).
 * Atua exclusivamente na tabela de créditos, sem alterar os dados do especial.
 */
export async function syncEspecialAuthors(
  especialId: string,
  authors: AuthorCreditInput[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!especialId) {
    return { success: false, error: new Error('ID do Especial não informado.') };
  }

  const safeAuthors = Array.isArray(authors) ? authors : [];

  // Desduplica por (member_id, role_name) para respeitar a constraint UNIQUE
  const seen = new Set<string>();
  const uniqueCredits: AuthorCreditInput[] = [];

  for (const a of safeAuthors) {
    if (a.member_id) {
      const role = a.role_name?.trim() || 'Curadoria';
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
    role_name: item.role_name?.trim() || 'Curadoria',
    order_index: typeof item.order_index === 'number' ? item.order_index : index,
  }));

  try {
    const { error } = await supabase.rpc('sync_especial_authors', {
      p_especial_id: especialId,
      p_authors: rpcPayload,
    });

    if (error) {
      if (error.code === '42501' || error.message.toLowerCase().includes('acesso negado') || error.message.toLowerCase().includes('not authorized')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem alterar a autoria de Especiais.') };
      }
      if (error.code === 'P0002' || error.message.toLowerCase().includes('não foi encontrado')) {
        return { success: false, error: new Error('Especial não encontrado.') };
      }
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key')) {
        return { success: false, error: new Error('Um ou mais integrantes selecionados não foram encontrados no banco de dados.') };
      }
      if (error.code === '23505' || error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
        return { success: false, error: new Error('Há autores duplicados com o mesmo papel editorial.') };
      }
      if (error.code === '22023') {
        return { success: false, error: new Error('Dados de autoria inválidos para o Especial.') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar autores do Especial.') };
  }
}


