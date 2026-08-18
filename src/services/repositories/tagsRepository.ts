import { getSupabaseClient } from '../supabaseClient';

export interface SupabaseTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

/**
 * Sanitizes a tag name to create a clean URL-friendly slug.
 */
export function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Fetches all tags ordered by name alphabetically.
 */
export async function fetchTags(): Promise<{ data: SupabaseTag[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as SupabaseTag[], error: null };
}

/**
 * Creates a new tag with unique name and slug.
 */
export async function createTag(name: string): Promise<{ data: SupabaseTag | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { data: null, error: new Error('O nome da tag não pode ser vazio.') };
  }

  const slug = slugifyTag(trimmedName);
  if (!slug) {
    return { data: null, error: new Error('Não foi possível gerar um slug válido para a tag.') };
  }

  const { data, error } = await supabase
    .from('tags')
    .insert({
      name: trimmedName,
      slug,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
      return { data: null, error: new Error(`A tag "${trimmedName}" já está cadastrada.`) };
    }
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as SupabaseTag, error: null };
}

/**
 * Updates an existing tag's name and recalculates its slug.
 */
export async function updateTag(id: string, name: string): Promise<{ data: SupabaseTag | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { data: null, error: new Error('O nome da tag não pode ser vazio.') };
  }

  const slug = slugifyTag(trimmedName);
  if (!slug) {
    return { data: null, error: new Error('Não foi possível gerar um slug válido para a tag.') };
  }

  const { data, error } = await supabase
    .from('tags')
    .update({
      name: trimmedName,
      slug,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
      return { data: null, error: new Error(`Já existe outra tag com o nome "${trimmedName}".`) };
    }
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as SupabaseTag, error: null };
}

/**
 * Deletes a tag by its UUID.
 */
export async function deleteTag(id: string): Promise<{ error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error('Cliente Supabase não configurado.') };
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
