import { getSupabaseClient } from '../supabaseClient';
import { EditorialRole } from '../../types';

export interface SupabaseEditorialRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  group_category: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEditorialRoleInput {
  name: string;
  slug?: string;
  description?: string | null;
  group_category?: string;
  order_index?: number;
}

export interface UpdateEditorialRoleInput {
  name?: string;
  slug?: string;
  description?: string | null;
  group_category?: string;
  order_index?: number;
}

/**
 * Sanitiza texto para slug amigável (sem acentos, minúsculo, hífens)
 */
export function slugifyEditorialRole(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Converte registro do Supabase para o tipo de domínio da aplicação
 */
export function mapSupabaseEditorialRoleToDomain(row: SupabaseEditorialRole): EditorialRole {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    groupCategory: row.group_category || 'redacao',
    orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Busca todas as funções editoriais cadastradas em public.editorial_roles, ordenadas por ordem e nome.
 */
export async function fetchEditorialRoles(): Promise<{ data: EditorialRole[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('editorial_roles')
      .select('*')
      .order('order_index', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const mapped = (data as SupabaseEditorialRole[] || []).map(mapSupabaseEditorialRoleToDomain);
    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar funções editoriais.') };
  }
}

/**
 * Busca uma função editorial por ID.
 */
export async function fetchEditorialRoleById(id: string): Promise<{ data: EditorialRole | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('editorial_roles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Função editorial não encontrada.') };
    }

    return { data: mapSupabaseEditorialRoleToDomain(data as SupabaseEditorialRole), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar função editorial por ID.') };
  }
}

/**
 * Busca uma função editorial por Slug.
 */
export async function fetchEditorialRoleBySlug(slug: string): Promise<{ data: EditorialRole | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { data, error } = await supabase
      .from('editorial_roles')
      .select('*')
      .eq('slug', slug.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Função editorial não encontrada.') };
    }

    return { data: mapSupabaseEditorialRoleToDomain(data as SupabaseEditorialRole), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao buscar função editorial por slug.') };
  }
}

/**
 * Cadastra uma nova função editorial institucional.
 */
export async function createEditorialRole(
  input: CreateEditorialRoleInput
): Promise<{ data: EditorialRole | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { data: null, error: new Error('O nome da função editorial é obrigatório.') };
  }

  const slug = input.slug?.trim() ? slugifyEditorialRole(input.slug) : slugifyEditorialRole(trimmedName);
  if (!slug) {
    return { data: null, error: new Error('Não foi possível gerar um slug válido para a função editorial.') };
  }

  try {
    const { data, error } = await supabase
      .from('editorial_roles')
      .insert({
        name: trimmedName,
        slug,
        description: input.description?.trim() || null,
        group_category: input.group_category?.trim() || 'redacao',
        order_index: typeof input.order_index === 'number' ? input.order_index : 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
        return { data: null, error: new Error(`Já existe uma função editorial com o nome "${trimmedName}" ou slug "${slug}".`) };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: mapSupabaseEditorialRoleToDomain(data as SupabaseEditorialRole), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao criar função editorial.') };
  }
}

/**
 * Atualiza uma função editorial existente.
 */
export async function updateEditorialRole(
  id: string,
  input: UpdateEditorialRoleInput
): Promise<{ data: EditorialRole | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const payload: Record<string, any> = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) {
      return { data: null, error: new Error('O nome da função editorial não pode ser vazio.') };
    }
    payload.name = trimmed;
  }

  if (input.slug !== undefined) {
    const trimmedSlug = slugifyEditorialRole(input.slug);
    if (!trimmedSlug) {
      return { data: null, error: new Error('Slug inválido.') };
    }
    payload.slug = trimmedSlug;
  } else if (input.name !== undefined && !input.slug) {
    // Se mudou o nome sem especificar slug, opcionalmente mantém ou recalcula
  }

  if (input.description !== undefined) {
    payload.description = input.description ? input.description.trim() : null;
  }

  if (input.group_category !== undefined) {
    payload.group_category = input.group_category.trim() || 'redacao';
  }

  if (input.order_index !== undefined) {
    payload.order_index = input.order_index;
  }

  try {
    const { data, error } = await supabase
      .from('editorial_roles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('unique')) {
        return { data: null, error: new Error('Já existe outra função editorial com este nome ou slug.') };
      }
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Função editorial não encontrada para atualização.') };
    }

    return { data: mapSupabaseEditorialRoleToDomain(data as SupabaseEditorialRole), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Falha ao atualizar função editorial.') };
  }
}

/**
 * Remove uma função editorial. Trata vínculos com team_member_roles via ON DELETE CASCADE (ou erro se houver restrição).
 */
export async function deleteEditorialRole(id: string): Promise<{ success: boolean; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: new Error('Cliente Supabase não configurado.') };
  }

  try {
    const { error } = await supabase
      .from('editorial_roles')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503' || error.message.toLowerCase().includes('foreign key') || error.message.toLowerCase().includes('violates foreign key')) {
        return {
          success: false,
          error: new Error('Não é possível excluir esta função pois ela está vinculada a integrantes da equipe.')
        };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err?.message || 'Falha ao remover função editorial.') };
  }
}
