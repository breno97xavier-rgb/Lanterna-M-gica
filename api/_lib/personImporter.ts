// ==============================================================================
// LANTERNA MÁGICA — F10.5B: Importação individual de Pessoas via TMDB
// ==============================================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPersonDetails } from './tmdbClient.js';
import { AppError } from './errors.js';
import { slugifyText } from './movieImporter.js';
import { preparePersonProfileImage, compensateStorageUploads, PreparedStorageImage } from './storageImageService.js';
import type { TmdbPersonImportResult } from './types.js';

function getServerSupabaseClient(req: any): SupabaseClient {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();
  const authHeader = (req?.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!url || !key) throw new AppError(500, 'INTERNAL_ERROR', 'Credenciais do Supabase não configuradas no servidor.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}

export function mapTmdbDepartmentToPrimaryRoles(department?: string | null): string[] {
  switch ((department || '').trim()) {
    case 'Acting': return ['Elenco'];
    case 'Directing': return ['Diretor'];
    case 'Writing': return ['Roteirista'];
    case 'Camera': return ['Diretor de Fotografia'];
    case 'Editing': return ['Montador'];
    case 'Production': return ['Produtor'];
    case 'Sound': return ['Som'];
    case 'Art': return ['Direção de Arte'];
    case 'Costume & Make-Up': return ['Figurino e Maquiagem'];
    case 'Visual Effects': return ['Efeitos Visuais'];
    default: return ['Profissional do Cinema'];
  }
}

async function generateUniquePersonSlug(supabase: SupabaseClient, name: string, tmdbId: number): Promise<string> {
  // Evita rejeitar nomes inteiramente escritos em alfabetos não latinos.
  const base = slugifyText(name) || `pessoa-tmdb-${tmdbId}`;
  const { data: existing } = await supabase.from('pessoas').select('id').eq('slug', base).maybeSingle();
  if (!existing) return base;
  const withTmdb = `${base}-tmdb-${tmdbId}`;
  const { data: existingTmdb } = await supabase.from('pessoas').select('id').eq('slug', withTmdb).maybeSingle();
  return existingTmdb ? `${withTmdb}-${Date.now().toString(36)}` : withTmdb;
}

export async function importTmdbPersonServerSide(tmdbId: number, req: any): Promise<TmdbPersonImportResult> {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) throw new AppError(400, 'INVALID_PARAMS', 'Identificador TMDB inválido para importação.');

  const supabase = getServerSupabaseClient(req);
  const { data: existing, error: existingError } = await supabase
    .from('pessoas')
    .select('id, name, slug, tmdb_id, tmdb_synced_at')
    .eq('tmdb_id', tmdbId)
    .maybeSingle();
  if (existingError) throw new AppError(500, 'INTERNAL_ERROR', existingError.message);
  if (existing) {
    return { success: true, alreadyExists: true, personId: existing.id, slug: existing.slug, name: existing.name, tmdbId, tmdbSyncedAt: existing.tmdb_synced_at, message: 'Pessoa já cadastrada no acervo.' };
  }

  const details = await getPersonDetails(tmdbId);
  const name = (details.name || '').trim();
  if (!name) throw new AppError(502, 'UPSTREAM_ERROR', 'Dados incompletos retornados pelo TMDB (nome ausente).');

  const nowIso = new Date().toISOString();
  const slug = await generateUniquePersonSlug(supabase, name, tmdbId);
  const preparedImages: PreparedStorageImage[] = [];
  let photoUrl: string | null = null;

  try {
    if (details.profileUrl) {
      const prepared = await preparePersonProfileImage(supabase, tmdbId, details.profileUrl);
      if (prepared) { preparedImages.push(prepared); photoUrl = prepared.publicUrl; }
    }

    // Terceira barreira imediatamente antes do INSERT.
    const { data: raced } = await supabase.from('pessoas').select('id, name, slug, tmdb_id, tmdb_synced_at').eq('tmdb_id', tmdbId).maybeSingle();
    if (raced) {
      await compensateStorageUploads(supabase, preparedImages);
      return { success: true, alreadyExists: true, personId: raced.id, slug: raced.slug, name: raced.name, tmdbId, tmdbSyncedAt: raced.tmdb_synced_at, message: 'Pessoa já cadastrada no acervo.' };
    }

    const { data: created, error: createError } = await supabase.from('pessoas').insert({
      name,
      slug,
      photo_url: photoUrl,
      birth_date: details.birthday || null,
      death_date: details.deathday || null,
      bio: details.biography?.trim() || null,
      primary_roles: mapTmdbDepartmentToPrimaryRoles(details.knownForDepartment),
      highlight_home: false,
      status: 'draft',
      published_at: null,
      tmdb_id: tmdbId,
      tmdb_synced_at: nowIso,
      imdb_id: details.imdbId || null,
    }).select('id, name, slug, tmdb_id, tmdb_synced_at').single();

    if (createError || !created) throw new AppError(500, 'INTERNAL_ERROR', createError?.message || 'Falha ao criar pessoa importada.');

    // Auditoria é complementar: falha do log não desfaz a entidade já criada.
    const { error: logError } = await supabase.from('tmdb_sync_logs').insert({
      entity_type: 'pessoa',
      internal_id: created.id,
      tmdb_id: tmdbId,
      operation: 'import_new',
      source: 'admin',
      status: 'success',
      details: { name, imported_at: nowIso, biography_imported: Boolean(details.biography?.trim()), place_of_birth: details.placeOfBirth || null },
    });
    if (logError) console.warn('[PersonImporter] Falha ao registrar log TMDB:', logError.message);

    return { success: true, alreadyExists: false, personId: created.id, slug: created.slug, name: created.name, tmdbId, tmdbSyncedAt: created.tmdb_synced_at, biographyImported: Boolean(details.biography?.trim()), message: 'Pessoa importada com sucesso do TMDB.' };
  } catch (err) {
    if (preparedImages.length) await compensateStorageUploads(supabase, preparedImages);
    throw err;
  }
}
