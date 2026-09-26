// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Serviço de Gerenciamento e Download Seguro de Imagens no Supabase Storage
// Arquivo: api/_lib/storageImageService.ts
//
// Regras Fundamentais:
// 1. Download seguro restrito ao hostname oficial TMDB (https://image.tmdb.org/*).
// 2. Validação estrita de Content-Type (image/jpeg, image/png, image/webp) e tamanho máximo.
// 3. Caminho determinístico em Storage: people/tmdb-{tmdbPersonId}/profile.<ext>
// 4. Idempotência: Se o objeto já existir, REUTILIZA (PREEXISTING) sem re-upload.
// 5. Rastreamento e compensação: em caso de falha a jusante, remove APENAS CREATED_THIS_ATTEMPT.
// 6. NUNCA remove objetos marcados como PREEXISTING.
// 7. Não há hotlink TMDB em banco de dados: apenas URL pública Supabase Storage.
// ==============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from './errors.js';

export const STORAGE_BUCKET_MEDIA = 'media';
export const STORAGE_FOLDER_PEOPLE = 'people';
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_CONTENT_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export type StorageObjectStatus = 'PREEXISTING' | 'CREATED_THIS_ATTEMPT';

export interface PreparedStorageImage {
  tmdbPersonId: number;
  storagePath: string;
  publicUrl: string;
  status: StorageObjectStatus;
  contentType: string;
  sizeBytes: number;
}

export interface StorageCompensationResult {
  attemptedRemovals: number;
  successfulRemovals: number;
  failedRemovals: number;
  warnings: string[];
  orphanPaths: string[];
}

/**
 * Valida se uma URL pertence estritamente ao CDN oficial do TMDB
 */
export function isValidTmdbImageUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'image.tmdb.org' || parsed.hostname.endsWith('.tmdb.org'))
    );
  } catch {
    return false;
  }
}

/**
 * Constrói o caminho determinístico do arquivo no Supabase Storage
 */
export function buildDeterministicPersonStoragePath(
  tmdbPersonId: number,
  extension: string
): string {
  const cleanExt = extension.replace(/^\./, '').toLowerCase() || 'jpg';
  return `${STORAGE_FOLDER_PEOPLE}/tmdb-${tmdbPersonId}/profile.${cleanExt}`;
}

/**
 * Verifica se um objeto já existe no Supabase Storage
 */
export async function checkStorageObjectExists(
  supabase: SupabaseClient,
  storagePath: string
): Promise<boolean> {
  try {
    const parts = storagePath.split('/');
    const fileName = parts.pop() || '';
    const folder = parts.join('/');

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET_MEDIA)
      .list(folder, {
        limit: 10,
        search: fileName,
      });

    if (error || !data) {
      return false;
    }

    return data.some((item) => item.name === fileName);
  } catch {
    return false;
  }
}

/**
 * Obtém a URL pública de um objeto no bucket
 */
export function getStoragePublicUrl(
  supabase: SupabaseClient,
  storagePath: string
): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET_MEDIA)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Baixa e valida com segurança uma imagem do TMDB
 */
export async function downloadTmdbImageBuffer(
  imageUrl: string
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  if (!isValidTmdbImageUrl(imageUrl)) {
    throw new AppError(
      400,
      'INVALID_PARAMS',
      `URL de imagem inválida ou fora do domínio oficial TMDB: "${imageUrl}".`
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        Accept: 'image/jpeg, image/png, image/webp, image/*',
      },
      signal: controller.signal,
      redirect: 'error', // Não segue redirects arbitrários para hosts não confiáveis
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        502,
        'UPSTREAM_ERROR',
        `Falha ao baixar imagem do TMDB (HTTP ${response.status}).`
      );
    }

    const rawContentType = (response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    const extension = ALLOWED_CONTENT_TYPES.get(rawContentType);

    if (!extension) {
      throw new AppError(
        400,
        'INVALID_PARAMS',
        `Formato de imagem não suportado do TMDB: "${rawContentType}". Apenas JPEG, PNG e WebP são permitidos.`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new AppError(400, 'INVALID_PARAMS', 'Imagem baixada do TMDB está vazia (0 bytes).');
    }

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new AppError(
        400,
        'INVALID_PARAMS',
        `Tamanho da imagem (${(buffer.length / 1024 / 1024).toFixed(2)} MB) excede o limite máximo permitido de 10 MB.`
      );
    }

    return { buffer, contentType: rawContentType, extension };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') {
      throw new AppError(504, 'UPSTREAM_ERROR', 'Tempo limite excedido ao baixar foto do TMDB (15s).');
    }
    throw new AppError(502, 'UPSTREAM_ERROR', `Erro de rede ao baixar foto do TMDB: ${err.message || err}`);
  }
}

/**
 * Prepara de forma idempotente o armazenamento de foto de pessoa no Storage
 */
export async function preparePersonProfileImage(
  supabase: SupabaseClient,
  tmdbPersonId: number,
  tmdbProfileUrl: string | null
): Promise<PreparedStorageImage | null> {
  if (!tmdbProfileUrl || typeof tmdbProfileUrl !== 'string' || !tmdbProfileUrl.trim()) {
    return null;
  }

  // 1. Determinar caminho provisório com extensão padrão .jpg
  const defaultPath = buildDeterministicPersonStoragePath(tmdbPersonId, 'jpg');

  // 2. Verificar idempotência: se o arquivo já existir no Storage, REUTILIZAR
  const alreadyExists = await checkStorageObjectExists(supabase, defaultPath);
  if (alreadyExists) {
    const publicUrl = getStoragePublicUrl(supabase, defaultPath);
    return {
      tmdbPersonId,
      storagePath: defaultPath,
      publicUrl,
      status: 'PREEXISTING',
      contentType: 'image/jpeg',
      sizeBytes: 0,
    };
  }

  // 3. Baixar e validar a foto do TMDB
  const { buffer, contentType, extension } = await downloadTmdbImageBuffer(tmdbProfileUrl.trim());
  const finalStoragePath = buildDeterministicPersonStoragePath(tmdbPersonId, extension);

  // 4. Se não existe, fazer o upload com upsert: false
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_MEDIA)
    .upload(finalStoragePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error(`[StorageService] Falha no upload para ${finalStoragePath}:`, uploadError);
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `Não foi possível salvar a imagem no Storage: ${uploadError.message}`
    );
  }

  const publicUrl = getStoragePublicUrl(supabase, finalStoragePath);

  return {
    tmdbPersonId,
    storagePath: finalStoragePath,
    publicUrl,
    status: 'CREATED_THIS_ATTEMPT',
    contentType,
    sizeBytes: buffer.length,
  };
}

/**
 * Executa a compensação de Storage em caso de falha transacional da RPC
 * IMPORTANTE: Remove APENAS os objetos com status CREATED_THIS_ATTEMPT. NUNCA remove PREEXISTING.
 */
export async function compensateStorageUploads(
  supabase: SupabaseClient,
  preparedImages: PreparedStorageImage[]
): Promise<StorageCompensationResult> {
  const imagesToRemove = preparedImages.filter((img) => img.status === 'CREATED_THIS_ATTEMPT');
  const result: StorageCompensationResult = {
    attemptedRemovals: imagesToRemove.length,
    successfulRemovals: 0,
    failedRemovals: 0,
    warnings: [],
    orphanPaths: [],
  };

  if (imagesToRemove.length === 0) {
    return result;
  }

  const paths = imagesToRemove.map((img) => img.storagePath);

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET_MEDIA)
      .remove(paths);

    if (error) {
      result.failedRemovals = paths.length;
      result.orphanPaths.push(...paths);
      result.warnings.push(`Erro na compensação do Storage: ${error.message}`);
    } else {
      result.successfulRemovals = data?.length || paths.length;
    }
  } catch (err: any) {
    result.failedRemovals = paths.length;
    result.orphanPaths.push(...paths);
    result.warnings.push(`Exceção durante compensação do Storage: ${err?.message || err}`);
  }

  return result;
}
