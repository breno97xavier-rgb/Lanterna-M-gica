import { getSupabaseClient } from '../supabaseClient';
import { TeamMember, TeamMemberRole, TeamMemberStatus, TeamMemberSocialLinks } from '../../types';
import {
  SupabaseEditorialRole,
  mapSupabaseEditorialRoleToDomain,
} from './editorialRolesRepository';

export interface SupabaseTeamMemberRoleRow {
  member_id: string;
  role_id: string;
  is_primary: boolean;
  order_index: number;
  created_at: string;
  editorial_roles?: SupabaseEditorialRole | SupabaseEditorialRole[] | null;
}

export interface SupabaseTeamMember {
  id: string;
  legacy_id: string | null;
  name: string;
  slug: string;
  photo_url: string | null;
  birth_date: string | null;
  bio: string | null;
  short_bio: string | null;
  social_links: Record<string, any> | null;
  display_on_about: boolean;
  order_index: number;
  status: TeamMemberStatus;
  created_at: string;
  updated_at: string;
  team_member_roles?: SupabaseTeamMemberRoleRow[] | null;
}

export interface TeamMemberRoleInput {
  role_id: string;
  is_primary?: boolean;
  order_index?: number;
}

export interface CreateTeamMemberInput {
  name: string;
  slug?: string;
  photo_url?: string | null;
  birth_date?: string | null;
  bio?: string | null;
  short_bio?: string | null;
  social_links?: TeamMemberSocialLinks | Record<string, any>;
  display_on_about?: boolean;
  order_index?: number;
  status?: TeamMemberStatus;
  legacy_id?: string | null;
  roles?: TeamMemberRoleInput[];
}

export interface UpdateTeamMemberInput {
  name?: string;
  slug?: string;
  photo_url?: string | null;
  birth_date?: string | null;
  bio?: string | null;
  short_bio?: string | null;
  social_links?: TeamMemberSocialLinks | Record<string, any>;
  display_on_about?: boolean;
  order_index?: number;
  status?: TeamMemberStatus;
  legacy_id?: string | null;
  roles?: TeamMemberRoleInput[];
}

export interface FetchTeamMembersOptions {
  status?: TeamMemberStatus | 'all';
  displayOnAboutOnly?: boolean;
  roleId?: string;
  search?: string;
  orderBy?: 'order_index' | 'name' | 'created_at';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Sanitiza texto para slug URL amigável
 */
export function slugifyTeamMember(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Normaliza datas parciais ou ISO para o tipo DATE (YYYY-MM-DD) do PostgreSQL
 */
export function normalizeDateToIsoDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.split('T')[0];
  }
  const brMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Converte registro relacional do Supabase para o tipo de domínio TeamMember
 */
export function mapSupabaseTeamMemberToDomain(row: SupabaseTeamMember): TeamMember {
  const roles: TeamMemberRole[] = (row.team_member_roles || [])
    .map((r) => {
      const roleRaw = Array.isArray(r.editorial_roles) ? r.editorial_roles[0] : r.editorial_roles;
      return {
        memberId: r.member_id,
        roleId: r.role_id,
        isPrimary: Boolean(r.is_primary),
        orderIndex: typeof r.order_index === 'number' ? r.order_index : 0,
        createdAt: r.created_at,
        role: roleRaw ? mapSupabaseEditorialRoleToDomain(roleRaw) : undefined,
      };
    })
    .sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.orderIndex - b.orderIndex;
    });

  return {
    id: row.id,
    legacyId: row.legacy_id,
    name: row.name,
    slug: row.slug,
    photoUrl: row.photo_url,
    birthDate: row.birth_date,
    bio: row.bio,
    shortBio: row.short_bio,
    socialLinks: (row.social_links as TeamMemberSocialLinks) || {},
    displayOnAbout: row.display_on_about ?? true,
    orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
    status: row.status || 'published',
    roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TEAM_MEMBERS_SELECT_QUERY = `
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
`;

/**
 * Busca integrantes da equipe com opções de filtro, visibilidade pública ou administrativa.
 */
export async function fetchTeamMembers(
  options?: FetchTeamMembersOptions
): Promise<{ data: TeamMember[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('team_members')
      .select(TEAM_MEMBERS_SELECT_QUERY);

    // Filtro de status: por padrão apenas 'published' (público), a menos que especificado ou 'all' (admin)
    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    } else if (!options?.status) {
      query = query.eq('status', 'published');
    }

    // Filtro display_on_about
    if (options?.displayOnAboutOnly) {
      query = query.eq('display_on_about', true);
    }

    // Ordenação
    const orderBy = options?.orderBy || 'order_index';
    const ascending = options?.orderDirection !== 'desc';
    query = query.order(orderBy, { ascending });
    if (orderBy !== 'name') {
      query = query.order('name', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    let items = ((data as unknown as SupabaseTeamMember[]) || []).map(mapSupabaseTeamMemberToDomain);

    // Filtro em memória se roleId for especificado
    if (options?.roleId) {
      items = items.filter((m) => m.roles?.some((r) => r.roleId === options.roleId));
    }

    // Filtro textual em memória
    if (options?.search?.trim()) {
      const term = options.search.toLowerCase().trim();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.shortBio?.toLowerCase().includes(term) ||
          m.bio?.toLowerCase().includes(term)
      );
    }

    return { data: items, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar integrantes da equipe.') };
  }
}

/**
 * Busca um integrante da equipe por ID.
 */
export async function fetchTeamMemberById(
  id: string,
  options?: { allowUnpublished?: boolean }
): Promise<{ data: TeamMember | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('team_members')
      .select(TEAM_MEMBERS_SELECT_QUERY)
      .eq('id', id);

    if (!options?.allowUnpublished) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Integrante não encontrado.') };
    }

    return { data: mapSupabaseTeamMemberToDomain(data as unknown as SupabaseTeamMember), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar integrante por ID.') };
  }
}

/**
 * Busca um integrante da equipe por Slug.
 */
export async function fetchTeamMemberBySlug(
  slug: string,
  options?: { allowUnpublished?: boolean }
): Promise<{ data: TeamMember | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    let query = supabase
      .from('team_members')
      .select(TEAM_MEMBERS_SELECT_QUERY)
      .eq('slug', slug.trim().toLowerCase());

    if (!options?.allowUnpublished) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Integrante não encontrado.') };
    }

    return { data: mapSupabaseTeamMemberToDomain(data as unknown as SupabaseTeamMember), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar integrante por slug.') };
  }
}

/**
 * Sincroniza as funções editoriais de um integrante da equipe na tabela N:N public.team_member_roles
 * de forma atômica via RPC PostgreSQL (public.sync_team_member_roles).
 * Garante em tempo de aplicação e de banco que no máximo uma função seja primária (is_primary = true).
 */
export async function syncTeamMemberRoles(
  memberId: string,
  roles: TeamMemberRoleInput[]
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  if (!memberId) {
    return { success: false, error: new Error('ID do integrante não fornecido.') };
  }

  const safeRoles = Array.isArray(roles) ? roles : [];

  // Validação em memória: no máximo UMA função primária
  const primaryRoles = safeRoles.filter((r) => Boolean(r.is_primary));
  if (primaryRoles.length > 1) {
    return {
      success: false,
      error: new Error('Um integrante da equipe pode ter no máximo uma função principal (is_primary).'),
    };
  }

  // Desduplica por role_id preservando ordem
  const seenRoleIds = new Set<string>();
  const uniqueRoles: TeamMemberRoleInput[] = [];

  for (const r of safeRoles) {
    if (r.role_id && !seenRoleIds.has(r.role_id)) {
      seenRoleIds.add(r.role_id);
      uniqueRoles.push(r);
    }
  }

  // Prepara payload JSONB para a RPC
  const rpcPayload = uniqueRoles.map((r, index) => ({
    role_id: r.role_id,
    is_primary: Boolean(r.is_primary),
    order_index: typeof r.order_index === 'number' ? r.order_index : index,
  }));

  try {
    const { error } = await supabase.rpc('sync_team_member_roles', {
      p_member_id: memberId,
      p_roles: rpcPayload,
    });

    if (error) {
      if (error.code === '42501' || error.message.toLowerCase().includes('acesso negado') || error.message.toLowerCase().includes('not authorized')) {
        return { success: false, error: new Error('Acesso negado: apenas administradores podem alterar funções da equipe.') };
      }
      if (error.code === 'P0002' || error.message.toLowerCase().includes('não foi encontrado')) {
        return { success: false, error: new Error('Integrante da equipe não encontrado.') };
      }
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key')) {
        return { success: false, error: new Error('Uma ou mais funções editoriais selecionadas não existem no banco de dados.') };
      }
      if (error.message.includes('is_primary') || error.message.includes('função principal')) {
        return { success: false, error: new Error('Um integrante da equipe pode ter no máximo uma função principal (is_primary).') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao sincronizar funções do integrante.') };
  }
}

/**
 * Cria um novo integrante da equipe.
 */
export async function createTeamMember(
  input: CreateTeamMemberInput
): Promise<{ data: TeamMember | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { data: null, error: new Error('O nome do integrante é obrigatório.') };
  }

  const slug = input.slug?.trim() ? slugifyTeamMember(input.slug) : slugifyTeamMember(trimmedName);
  if (!slug) {
    return { data: null, error: new Error('Não foi possível gerar um slug válido para o integrante.') };
  }

  // Validação prévia de funções se enviadas
  if (input.roles && input.roles.length > 0) {
    const primaryCount = input.roles.filter((r) => Boolean(r.is_primary)).length;
    if (primaryCount > 1) {
      return {
        data: null,
        error: new Error('Um integrante da equipe pode ter no máximo uma função principal (is_primary).'),
      };
    }
  }

  try {
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .insert({
        name: trimmedName,
        slug,
        legacy_id: input.legacy_id?.trim() || null,
        photo_url: input.photo_url?.trim() || null,
        birth_date: normalizeDateToIsoDate(input.birth_date),
        bio: input.bio?.trim() || null,
        short_bio: input.short_bio?.trim() || null,
        social_links: input.social_links || {},
        display_on_about: input.display_on_about ?? true,
        order_index: typeof input.order_index === 'number' ? input.order_index : 0,
        status: input.status || 'published',
      })
      .select('id')
      .single();

    if (memberError) {
      if (memberError.code === '23505' || memberError.message.toLowerCase().includes('duplicate') || memberError.message.toLowerCase().includes('unique')) {
        return { data: null, error: new Error(`Já existe um integrante cadastrado com o slug "${slug}".`) };
      }
      return { data: null, error: new Error(memberError.message) };
    }

    const memberId = memberData.id;

    // Sincroniza funções institucionais se houver
    if (input.roles && input.roles.length > 0) {
      const syncRes = await syncTeamMemberRoles(memberId, input.roles);
      if (syncRes.error) {
        return { data: null, error: syncRes.error };
      }
    }

    // Retorna o integrante completo carregado
    return await fetchTeamMemberById(memberId, { allowUnpublished: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao criar integrante da equipe.') };
  }
}

/**
 * Atualiza os dados de um integrante da equipe e sincroniza suas funções.
 */
export async function updateTeamMember(
  id: string,
  input: UpdateTeamMemberInput
): Promise<{ data: TeamMember | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const payload: Record<string, any> = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) {
      return { data: null, error: new Error('O nome do integrante não pode ser vazio.') };
    }
    payload.name = trimmed;
  }

  if (input.slug !== undefined) {
    const trimmedSlug = slugifyTeamMember(input.slug);
    if (!trimmedSlug) {
      return { data: null, error: new Error('Slug inválido.') };
    }
    payload.slug = trimmedSlug;
  }

  if (input.legacy_id !== undefined) {
    payload.legacy_id = input.legacy_id ? input.legacy_id.trim() : null;
  }

  if (input.photo_url !== undefined) {
    payload.photo_url = input.photo_url ? input.photo_url.trim() : null;
  }

  if (input.birth_date !== undefined) {
    payload.birth_date = normalizeDateToIsoDate(input.birth_date);
  }

  if (input.bio !== undefined) {
    payload.bio = input.bio ? input.bio.trim() : null;
  }

  if (input.short_bio !== undefined) {
    payload.short_bio = input.short_bio ? input.short_bio.trim() : null;
  }

  if (input.social_links !== undefined) {
    payload.social_links = input.social_links || {};
  }

  if (input.display_on_about !== undefined) {
    payload.display_on_about = Boolean(input.display_on_about);
  }

  if (input.order_index !== undefined) {
    payload.order_index = input.order_index;
  }

  if (input.status !== undefined) {
    payload.status = input.status;
  }

  try {
    if (Object.keys(payload).length > 0) {
      const { error: updateError } = await supabase
        .from('team_members')
        .update(payload)
        .eq('id', id);

      if (updateError) {
        if (updateError.code === '23505' || updateError.message.toLowerCase().includes('duplicate') || updateError.message.toLowerCase().includes('unique')) {
          return { data: null, error: new Error('Já existe outro integrante cadastrado com este slug.') };
        }
        return { data: null, error: new Error(updateError.message) };
      }
    }

    // Sincroniza funções institucionais se enviadas
    if (input.roles !== undefined) {
      const syncRes = await syncTeamMemberRoles(id, input.roles);
      if (syncRes.error) {
        return { data: null, error: syncRes.error };
      }
    }

    // Retorna o registro completo atualizado
    return await fetchTeamMemberById(id, { allowUnpublished: true });
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao atualizar integrante da equipe.') };
  }
}

/**
 * Remove um integrante da equipe.
 * Trata estritamente a restrição ON DELETE RESTRICT (ensaio_authors e critica_authors):
 * Não permite exclusão se houver histórico editorial assinado.
 */
export async function deleteTeamMember(
  id: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) {
      // Postgres error 23503: foreign key constraint violation (ON DELETE RESTRICT)
      if (
        error.code === '23503' ||
        error.message.toLowerCase().includes('foreign key') ||
        error.message.toLowerCase().includes('violates foreign key') ||
        error.message.toLowerCase().includes('ensaio_authors') ||
        error.message.toLowerCase().includes('critica_authors')
      ) {
        return {
          success: false,
          error: new Error(
            'Integrantes com histórico editorial (ensaios ou críticas assinadas) não podem ser excluídos antes da remoção ou reassociação prévia de seus créditos.'
          ),
        };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao excluir integrante da equipe.') };
  }
}
