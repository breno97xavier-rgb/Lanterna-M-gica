import { getSupabaseClient } from '../supabaseClient';

export interface SupabaseGenero {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export function slugifyGenero(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Busca todos os gêneros cadastrados em public.generos, ordenados alfabeticamente.
 */
export async function fetchGeneros(): Promise<{ data: SupabaseGenero[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('generos')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as SupabaseGenero[]) || [], error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao buscar gêneros.') };
  }
}

/**
 * Cria um novo gênero cinematográfico em public.generos.
 */
export async function createGenero(name: string): Promise<{ data: SupabaseGenero | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { data: null, error: new Error('O nome do gênero não pode ser vazio.') };
  }

  const slug = slugifyGenero(trimmed);

  try {
    const { data, error } = await supabase
      .from('generos')
      .insert({
        name: trimmed,
        slug,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SupabaseGenero, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || 'Falha ao cadastrar gênero.') };
  }
}
