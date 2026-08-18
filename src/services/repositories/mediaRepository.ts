import { getSupabaseClient } from '../supabaseClient';
import { uploadFile, deleteFile, StorageFolder } from '../storageService';

export interface SupabaseMediaItem {
  id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  alt_text: string | null;
  caption: string | null;
  credit: string | null;
  is_public: boolean;
  created_at: string;
}

export interface CreateMediaItemInput {
  storage_path: string;
  public_url: string;
  filename: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  alt_text?: string | null;
  caption?: string | null;
  credit?: string | null;
  is_public?: boolean;
}

export interface UpdateMediaItemInput {
  alt_text?: string | null;
  caption?: string | null;
  credit?: string | null;
  is_public?: boolean;
  filename?: string;
}

/**
 * Fetches all media items ordered by creation date (newest first).
 */
export async function fetchMediaItems(): Promise<{ data: SupabaseMediaItem[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const { data, error } = await supabase
    .from('media_items')
    .select('id, storage_path, public_url, filename, mime_type, file_size_bytes, alt_text, caption, credit, is_public, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as SupabaseMediaItem[], error: null };
}

/**
 * Inserts a new record into public.media_items.
 */
export async function createMediaItem(
  input: CreateMediaItemInput
): Promise<{ data: SupabaseMediaItem | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      storage_path: input.storage_path,
      public_url: input.public_url,
      filename: input.filename,
      mime_type: input.mime_type ?? null,
      file_size_bytes: input.file_size_bytes ?? null,
      alt_text: input.alt_text ?? null,
      caption: input.caption ?? null,
      credit: input.credit ?? null,
      is_public: input.is_public ?? true,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as SupabaseMediaItem, error: null };
}

/**
 * Updates metadata fields of an existing media item.
 */
export async function updateMediaItem(
  id: string,
  updates: UpdateMediaItemInput
): Promise<{ data: SupabaseMediaItem | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  const payload: Record<string, any> = {};
  if (updates.alt_text !== undefined) payload.alt_text = updates.alt_text;
  if (updates.caption !== undefined) payload.caption = updates.caption;
  if (updates.credit !== undefined) payload.credit = updates.credit;
  if (updates.is_public !== undefined) payload.is_public = updates.is_public;
  if (updates.filename !== undefined) payload.filename = updates.filename;

  const { data, error } = await supabase
    .from('media_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as SupabaseMediaItem, error: null };
}

/**
 * Deletes a media item record and its file from Storage in a coordinated manner.
 * Reports clear warning if Storage deletion fails after database deletion.
 */
export async function deleteMediaItem(
  id: string,
  storagePath?: string | null
): Promise<{ error: Error | null; storageWarning: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error('Cliente Supabase não configurado.'), storageWarning: null };
  }

  // 1. Delete database record
  const { error: dbError } = await supabase
    .from('media_items')
    .delete()
    .eq('id', id);

  if (dbError) {
    return { error: new Error(`Erro ao excluir do banco de dados: ${dbError.message}`), storageWarning: null };
  }

  // 2. Coordinated deletion from Storage
  let storageWarning: string | null = null;
  if (storagePath) {
    const { error: storageError } = await deleteFile(storagePath);
    if (storageError) {
      storageWarning = `O registro foi removido do banco, mas não foi possível excluir o arquivo no Storage (${storagePath}): ${storageError.message}`;
    }
  }

  return { error: null, storageWarning };
}

/**
 * Uploads an image to Storage and creates the media_items record.
 * If database creation fails, executes compensation to remove the uploaded file, preventing orphans.
 */
export async function uploadAndCreateMediaItem(
  file: File,
  folder: StorageFolder = 'uploads',
  metadata?: {
    alt_text?: string;
    caption?: string;
    credit?: string;
  }
): Promise<{ data: SupabaseMediaItem | null; error: Error | null }> {
  // 1. Upload to Storage
  const uploadRes = await uploadFile(file, folder);
  if (uploadRes.error || !uploadRes.data) {
    return { data: null, error: uploadRes.error || new Error('Falha no upload do arquivo.') };
  }

  const { storagePath, publicUrl, filename, mimeType, fileSizeBytes } = uploadRes.data;

  // 2. Insert record into public.media_items
  const insertRes = await createMediaItem({
    storage_path: storagePath,
    public_url: publicUrl,
    filename: filename,
    mime_type: mimeType,
    file_size_bytes: fileSizeBytes,
    alt_text: metadata?.alt_text || null,
    caption: metadata?.caption || null,
    credit: metadata?.credit || null,
    is_public: true,
  });

  // 3. Compensation: if insert failed, immediately delete uploaded storage file
  if (insertRes.error || !insertRes.data) {
    console.error('Falha ao inserir registro em media_items. Executando compensação no Storage...', insertRes.error);
    await deleteFile(storagePath);
    return {
      data: null,
      error: new Error(
        `Erro ao registrar metadados da imagem (${insertRes.error?.message || 'Erro desconhecido'}). O arquivo enviado foi removido do Storage para evitar registros órfãos.`
      ),
    };
  }

  return { data: insertRes.data, error: null };
}
