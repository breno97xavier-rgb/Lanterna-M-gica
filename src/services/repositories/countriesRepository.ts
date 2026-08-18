import { getSupabaseClient } from '../supabaseClient';

export interface SupabaseCountry {
  id: string;
  name: string;
  slug: string;
  flag_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCountryInput {
  name: string;
  slug?: string;
  flag_url?: string | null;
}

export interface UpdateCountryInput {
  name?: string;
  slug?: string;
  flag_url?: string | null;
}

/**
 * Sanitiza texto para slug amigável de país (ex: "Escócia" -> "escocia", "Estados Unidos" -> "estados-unidos")
 */
export function slugifyCountry(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Busca todos os países cadastrados em public.countries, ordenados alfabeticamente por nome.
 */
export async function fetchCountries(): Promise<{ data: SupabaseCountry[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as SupabaseCountry[]) || [], error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar países.') };
  }
}

/**
 * Busca um país pelo ID (UUID).
 */
export async function fetchCountryById(id: string): Promise<{ data: SupabaseCountry | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabaseCountry, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar país por ID.') };
  }
}

/**
 * Busca um país pelo slug.
 */
export async function fetchCountryBySlug(slug: string): Promise<{ data: SupabaseCountry | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabaseCountry, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar país por slug.') };
  }
}

/**
 * Cadastra um novo país em public.countries.
 */
export async function createCountry(
  input: CreateCountryInput
): Promise<{ data: SupabaseCountry | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  const name = input.name.trim();
  if (!name) {
    return { data: null, error: new Error('O nome do país é obrigatório.') };
  }

  const slug = (input.slug && input.slug.trim()) ? slugifyCountry(input.slug) : slugifyCountry(name);
  if (!slug) {
    return { data: null, error: new Error('O slug do país é obrigatório.') };
  }

  const payload = {
    name,
    slug,
    flag_url: input.flag_url?.trim() || null,
  };

  try {
    const { data, error } = await supabase
      .from('countries')
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`O país "${name}" (slug: "${slug}") já está cadastrado.`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabaseCountry, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao cadastrar país.') };
  }
}

/**
 * Atualiza um país existente em public.countries.
 */
export async function updateCountry(
  id: string,
  input: UpdateCountryInput
): Promise<{ data: SupabaseCountry | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { data: null, error: new Error('O nome do país não pode ficar vazio.') };
    payload.name = name;
  }

  if (input.slug !== undefined) {
    const slug = slugifyCountry(input.slug);
    if (!slug) return { data: null, error: new Error('O slug não pode ficar vazio.') };
    payload.slug = slug;
  }

  if (input.flag_url !== undefined) {
    payload.flag_url = input.flag_url?.trim() || null;
  }

  try {
    const { data, error } = await supabase
      .from('countries')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error(`Já existe outro país com este slug.`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabaseCountry, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao atualizar país.') };
  }
}

/**
 * Remove um país de public.countries.
 */
export async function deleteCountry(id: string): Promise<{ error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error('Supabase client não configurado.') };
  }

  try {
    const { error } = await supabase
      .from('countries')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return { error: new Error('Este país não pode ser excluído pois possui pessoas ou filmes associados.') };
      }
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: any) {
    return { error: new Error(err.message || 'Falha ao excluir país.') };
  }
}
