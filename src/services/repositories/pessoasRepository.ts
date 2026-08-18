import { getSupabaseClient } from '../supabaseClient';
import { ContentStatus } from '../../types';
import { SupabaseCountry } from './countriesRepository';

export interface SupabasePessoa {
  id: string;
  legacy_id: string | null;
  name: string;
  slug: string;
  photo_url: string | null;
  birth_date: string | null; // ISO Date YYYY-MM-DD
  death_date: string | null; // ISO Date YYYY-MM-DD
  country_id: string | null;
  country: string | null; // Legado / Fallback
  country_data?: SupabaseCountry | null;
  bio: string | null;
  is_editorial_profile: boolean;
  editorial_profile: string | null;
  primary_roles: string[];
  highlight_home: boolean;
  status: ContentStatus;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePessoaInput {
  name: string;
  slug?: string;
  photo_url?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  country_id?: string | null;
  country?: string | null;
  bio?: string | null;
  is_editorial_profile?: boolean;
  editorial_profile?: string | null;
  primary_roles?: string[];
  highlight_home?: boolean;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  legacy_id?: string | null;
}

export interface UpdatePessoaInput {
  name?: string;
  slug?: string;
  photo_url?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  country_id?: string | null;
  country?: string | null;
  bio?: string | null;
  is_editorial_profile?: boolean;
  editorial_profile?: string | null;
  primary_roles?: string[];
  highlight_home?: boolean;
  status?: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
}

/**
 * Sanitiza texto para slug amigável (sem acentos, minúsculo, hífens)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Normaliza datas parciais (ex: "1938" -> "1938-01-01", "16/12/1938" -> "1938-12-16") para o tipo DATE do PostgreSQL.
 * Se a string já estiver no formato YYYY-MM-DD, a preserva. Se for vazia ou nula, retorna null.
 */
export function normalizeDateToIso(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

  // 1. Se já for formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Se for ISO timestamp completo (YYYY-MM-DDTHH:mm:ss...)
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.split('T')[0];
  }

  // 3. Se for formato brasileiro DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. Se for apenas ano YYYY
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`;
  }

  // 5. Se for YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }

  // 6. Se for MM/YYYY
  const myMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{4})$/);
  if (myMatch) {
    const month = myMatch[1].padStart(2, '0');
    const year = myMatch[2];
    return `${year}-${month}-01`;
  }

  // 7. Parse de fallback via Date nativo em UTC
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (_) {}

  return null;
}

/**
 * Busca todas as pessoas cadastradas em public.pessoas.
 * Para o painel administrativo (allStatuses = true), retorna todos os status ordenados alfabeticamente por name.
 * Para o site público (allStatuses = false), retorna apenas published (ou scheduled cujo scheduled_at <= now).
 */
export async function fetchPessoas(options?: {
  allStatuses?: boolean;
  searchQuery?: string;
}): Promise<{ data: SupabasePessoa[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    let query = supabase
      .from('pessoas')
      .select('*, country_data:countries(id, name, slug, flag_url)')
      .order('name', { ascending: true });

    if (!options?.allStatuses) {
      query = query.in('status', ['published', 'scheduled']);
    }

    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,country.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    let { data, error } = await query;
    
    // Fallback caso a relação com countries ainda não esteja disponível no cache do PostgREST
    if (error && (error.message.includes('countries') || error.message.includes('relation'))) {
      let fallbackQuery = supabase
        .from('pessoas')
        .select('*')
        .order('name', { ascending: true });

      if (!options?.allStatuses) {
        fallbackQuery = fallbackQuery.in('status', ['published', 'scheduled']);
      }
      if (options?.searchQuery && options.searchQuery.trim()) {
        const q = options.searchQuery.trim();
        fallbackQuery = fallbackQuery.or(`name.ilike.%${q}%,country.ilike.%${q}%,slug.ilike.%${q}%`);
      }
      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const rawList = (data as SupabasePessoa[]) || [];

    // Se for público, filtra para garantir que scheduled só apareça se scheduled_at <= now
    if (!options?.allStatuses) {
      const nowTime = Date.now();
      const filtered = rawList.filter((p) => {
        if (p.status === 'published') {
          if (p.published_at) {
            return new Date(p.published_at).getTime() <= nowTime;
          }
          return true;
        }
        if (p.status === 'scheduled') {
          return p.scheduled_at ? new Date(p.scheduled_at).getTime() <= nowTime : false;
        }
        return false;
      });
      return { data: filtered, error: null };
    }

    return { data: rawList, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar pessoas.') };
  }
}

/**
 * Busca uma pessoa específica pelo ID (UUID).
 */
export async function fetchPessoaById(id: string): Promise<{ data: SupabasePessoa | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    let { data, error } = await supabase
      .from('pessoas')
      .select('*, country_data:countries(id, name, slug, flag_url)')
      .eq('id', id)
      .single();

    if (error && (error.message.includes('countries') || error.message.includes('relation'))) {
      const fallback = await supabase
        .from('pessoas')
        .select('*')
        .eq('id', id)
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabasePessoa, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar pessoa por ID.') };
  }
}

/**
 * Busca uma pessoa específica pelo slug.
 */
export async function fetchPessoaBySlug(slug: string): Promise<{ data: SupabasePessoa | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    let { data, error } = await supabase
      .from('pessoas')
      .select('*, country_data:countries(id, name, slug, flag_url)')
      .eq('slug', slug)
      .single();

    if (error && (error.message.includes('countries') || error.message.includes('relation'))) {
      const fallback = await supabase
        .from('pessoas')
        .select('*')
        .eq('slug', slug)
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabasePessoa, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar pessoa por slug.') };
  }
}

/**
 * Cria uma nova pessoa na tabela public.pessoas utilizando estritamente as colunas reais.
 */
export async function createPessoa(
  input: CreatePessoaInput
): Promise<{ data: SupabasePessoa | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  const name = input.name.trim();
  if (!name) {
    return { data: null, error: new Error('O nome da pessoa é obrigatório.') };
  }

  const slug = (input.slug && input.slug.trim()) ? slugify(input.slug) : slugify(name);
  if (!slug) {
    return { data: null, error: new Error('O slug da pessoa é obrigatório.') };
  }

  const birthDate = normalizeDateToIso(input.birth_date);
  const deathDate = normalizeDateToIso(input.death_date);

  const payload: Record<string, any> = {
    name,
    slug,
    photo_url: input.photo_url?.trim() || null,
    birth_date: birthDate,
    death_date: deathDate,
    country_id: input.country_id || null,
    country: input.country?.trim() || null,
    bio: input.bio?.trim() || null,
    is_editorial_profile: input.is_editorial_profile ?? Boolean(input.editorial_profile?.trim()),
    editorial_profile: input.editorial_profile?.trim() || null,
    primary_roles: input.primary_roles && input.primary_roles.length > 0 ? input.primary_roles : ['Profissional do Cinema'],
    highlight_home: input.highlight_home ?? false,
    status: input.status || 'published',
    published_at: input.published_at || (input.status === 'published' ? new Date().toISOString() : null),
    scheduled_at: input.scheduled_at || null,
    legacy_id: input.legacy_id || null,
  };

  try {
    let { data, error } = await supabase
      .from('pessoas')
      .insert([payload])
      .select('*, country_data:countries(id, name, slug, flag_url)')
      .single();

    if (error && (error.message.includes('country_id') || error.message.includes('countries'))) {
      // Se a coluna country_id ainda não foi adicionada no banco remoto, remove do payload temporariamente
      delete payload.country_id;
      const fallback = await supabase
        .from('pessoas')
        .insert([payload])
        .select('*')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`Já existe uma pessoa cadastrada com o slug "${slug}".`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabasePessoa, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao cadastrar pessoa.') };
  }
}

/**
 * Atualiza um registro existente em public.pessoas.
 */
export async function updatePessoa(
  id: string,
  input: UpdatePessoaInput
): Promise<{ data: SupabasePessoa | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { data: null, error: new Error('O nome não pode ficar vazio.') };
    payload.name = name;
  }

  if (input.slug !== undefined) {
    const slug = slugify(input.slug);
    if (!slug) return { data: null, error: new Error('O slug não pode ficar vazio.') };
    payload.slug = slug;
  }

  if (input.photo_url !== undefined) {
    payload.photo_url = input.photo_url?.trim() || null;
  }

  if (input.birth_date !== undefined) {
    payload.birth_date = normalizeDateToIso(input.birth_date);
  }

  if (input.death_date !== undefined) {
    payload.death_date = normalizeDateToIso(input.death_date);
  }

  if (input.country_id !== undefined) {
    payload.country_id = input.country_id || null;
  }

  if (input.country !== undefined) {
    payload.country = input.country?.trim() || null;
  }

  if (input.bio !== undefined) {
    payload.bio = input.bio?.trim() || null;
  }

  if (input.editorial_profile !== undefined) {
    payload.editorial_profile = input.editorial_profile?.trim() || null;
    if (input.is_editorial_profile === undefined) {
      payload.is_editorial_profile = Boolean(payload.editorial_profile);
    }
  }

  if (input.is_editorial_profile !== undefined) {
    payload.is_editorial_profile = input.is_editorial_profile;
  }

  if (input.primary_roles !== undefined) {
    payload.primary_roles = input.primary_roles;
  }

  if (input.highlight_home !== undefined) {
    payload.highlight_home = input.highlight_home;
  }

  if (input.status !== undefined) {
    payload.status = input.status;
    if (input.status === 'published' && !input.published_at) {
      payload.published_at = new Date().toISOString();
    }
  }

  if (input.published_at !== undefined) {
    payload.published_at = input.published_at;
  }

  if (input.scheduled_at !== undefined) {
    payload.scheduled_at = input.scheduled_at;
  }

  try {
    let { data, error } = await supabase
      .from('pessoas')
      .update(payload)
      .eq('id', id)
      .select('*, country_data:countries(id, name, slug, flag_url)')
      .single();

    if (error && (error.message.includes('country_id') || error.message.includes('countries'))) {
      delete payload.country_id;
      const fallback = await supabase
        .from('pessoas')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`Já existe outra pessoa cadastrada com este slug.`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabasePessoa, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao atualizar pessoa.') };
  }
}

/**
 * Remove uma pessoa da tabela public.pessoas.
 */
export async function deletePessoa(id: string): Promise<{ error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error('Supabase client não configurado.') };
  }

  try {
    const { error } = await supabase
      .from('pessoas')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: any) {
    return { error: new Error(err.message || 'Falha ao remover pessoa.') };
  }
}
