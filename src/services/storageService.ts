import { getSupabaseClient } from './supabaseClient';

export type StorageFolder = 'covers' | 'films' | 'people' | 'countries' | 'uploads';

export interface StorageUploadResult {
  storagePath: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB bucket limit
const BUCKET_NAME = 'media';

/**
 * Sanitizes a filename preserving extension.
 */
function sanitizeFilename(originalName: string): string {
  const lastDotIndex = originalName.lastIndexOf('.');
  const namePart = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
  const extPart = lastDotIndex !== -1 ? originalName.substring(lastDotIndex).toLowerCase() : '';

  const cleanName = namePart
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'imagem';

  return `${cleanName}${extPart}`;
}

/**
 * Uploads a binary File to Supabase Storage in the 'media' bucket.
 */
export async function uploadFile(
  file: File,
  folder: StorageFolder = 'uploads'
): Promise<{ data: StorageUploadResult | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Cliente Supabase não configurado.') };
  }

  // 1. Validate MIME type
  if (!file.type.startsWith('image/')) {
    return {
      data: null,
      error: new Error(`Tipo de arquivo inválido (${file.type}). Apenas imagens são permitidas.`),
    };
  }

  // 2. Validate file size (10 MB limit)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      data: null,
      error: new Error(`O arquivo excede o limite de 10 MB (tamanho: ${sizeInMb} MB).`),
    };
  }

  // 3. Generate unique, safe storage path
  const cleanFilename = sanitizeFilename(file.name);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const finalFilename = `${uniquePrefix}-${cleanFilename}`;
  const storagePath = `${folder}/${finalFilename}`;

  // 4. Upload binary File directly
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: new Error(`Falha no upload para o Storage: ${uploadError.message}`) };
  }

  // 5. Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    return { data: null, error: new Error('Não foi possível gerar a URL pública para o arquivo.') };
  }

  return {
    data: {
      storagePath,
      publicUrl: publicUrlData.publicUrl,
      filename: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    },
    error: null,
  };
}

/**
 * Removes an object from the 'media' bucket by its storage path.
 */
export async function deleteFile(storagePath: string): Promise<{ error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error('Cliente Supabase não configurado.') };
  }

  if (!storagePath) {
    return { error: null };
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    return { error: new Error(`Falha ao remover arquivo do Storage (${storagePath}): ${error.message}`) };
  }

  return { error: null };
}
