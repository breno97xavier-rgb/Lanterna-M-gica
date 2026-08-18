import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { CMSData } from './cmsStore';

export const V4_STORAGE_KEY = 'lanterna_magica_cms_data_v4';

export interface TagAuditItem {
  name: string;
  slug: string;
  isDeclared: boolean;
  occurrences: number;
}

export interface DeduplicatedPessoa {
  legacyId: string;
  mergedLegacyIds: string[];
  name: string;
  slug: string;
  photoUrl?: string;
  birthDate?: string;
  deathDate?: string;
  country?: string;
  bio?: string;
  isEditorialProfile: boolean;
  editorialProfile?: string;
  primaryRoles: string[];
  tags: string[];
  highlightHome: boolean;
  status: string;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CriticaAuditItem {
  id: string;
  editorialTitle: string;
  movieTitle: string;
  year?: number;
  slug: string;
  matchedFilmId?: string;
  matchedFilmTitle?: string;
  matchType?: string;
  status: 'resolved' | 'blocked';
  reason?: string;
}

export interface Base64ImageAuditItem {
  entity: string;
  id: string;
  title: string;
  field: string;
  estimatedSizeKb: number;
  targetFolder: 'covers' | 'films' | 'people' | 'uploads';
  targetFilename: string;
}

export interface BlockedRecordItem {
  entity: string;
  id: string;
  title: string;
  reason: string;
}

export interface MigrationAuditReport {
  timestamp: string;
  v4Exists: boolean;
  totalV4Records: number;
  collectionCounts: {
    tags: number;
    media: number;
    cineastas: number;
    pessoas: number;
    filmes: number;
    ensaios: number;
    criticas: number;
    umaImagemList: number;
    manifestos: number;
    especiais: number;
    listas: number;
    estreias: number;
  };
  tagsAudit: {
    totalDeclared: number;
    totalInContent: number;
    totalConsolidated: number;
    tagsList: TagAuditItem[];
  };
  pessoasAudit: {
    totalPessoas: number;
    totalCineastas: number;
    mergedDuplicates: Array<{
      cineastaId: string;
      cineastaName: string;
      pessoaId: string;
      pessoaName: string;
      reason: string;
    }>;
    totalConsolidatedPessoas: number;
  };
  criticasAudit: {
    total: number;
    resolvedCount: number;
    blockedCount: number;
    items: CriticaAuditItem[];
  };
  listasAudit: {
    totalListas: number;
    totalItems: number;
    canonicalFilmItems: number;
    customTextItems: number;
  };
  imagesAudit: {
    totalImagesChecked: number;
    base64Images: Base64ImageAuditItem[];
    externalUrlsCount: number;
    relativeUrlsCount: number;
  };
  blockedRecords: BlockedRecordItem[];
  isReadyToMigrate: boolean;
  summaryMessage: string;
  rawData?: CMSData;
}

export interface MigrationProgressUpdate {
  stage: string;
  percent: number;
  message: string;
  timestamp: string;
}

export interface MigrationExecutionReport {
  success: boolean;
  timestamp: string;
  totalFoundV4: number;
  insertedCounts: Record<string, number>;
  updatedCounts: Record<string, number>;
  skippedCounts: Record<string, number>;
  storageUploads: Array<{
    path: string;
    publicUrl: string;
    sizeBytes: number;
    entity: string;
    entityId: string;
  }>;
  errors: Array<{
    step: string;
    entity?: string;
    id?: string;
    error: string;
  }>;
  unmigratedRecords: BlockedRecordItem[];
  localStorageIntact: boolean;
  logs: string[];
}

/**
 * Normaliza strings para slug URL-friendly
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

/**
 * Lê o conteúdo bruto de lanterna_magica_cms_data_v4 do localStorage sem alterá-lo
 */
export function getV4DataFromLocalStorage(): { exists: boolean; data: CMSData | null; error?: string } {
  try {
    if (typeof localStorage === 'undefined') {
      return { exists: false, data: null, error: 'localStorage não disponível no ambiente atual.' };
    }
    const raw = localStorage.getItem(V4_STORAGE_KEY);
    if (!raw) {
      return { exists: false, data: null, error: `Chave ${V4_STORAGE_KEY} não encontrada no localStorage.` };
    }
    const parsed = JSON.parse(raw);
    const data: CMSData = {
      ensaios: Array.isArray(parsed.ensaios) ? parsed.ensaios : [],
      criticas: Array.isArray(parsed.criticas) ? parsed.criticas : [],
      umaImagemList: Array.isArray(parsed.umaImagemList) ? parsed.umaImagemList : [],
      cineastas: Array.isArray(parsed.cineastas) ? parsed.cineastas : [],
      pessoas: Array.isArray(parsed.pessoas) ? parsed.pessoas : [],
      filmes: Array.isArray(parsed.filmes) ? parsed.filmes : [],
      estreias: Array.isArray(parsed.estreias) ? parsed.estreias : [],
      especiais: Array.isArray(parsed.especiais) ? parsed.especiais : [],
      listas: Array.isArray(parsed.listas) ? parsed.listas : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      media: Array.isArray(parsed.media) ? parsed.media : [],
      ...(parsed.manifestos && Array.isArray(parsed.manifestos) ? { manifestos: parsed.manifestos } : {}),
    };
    return { exists: true, data };
  } catch (err: any) {
    return { exists: false, data: null, error: `Erro ao analisar JSON do V4: ${err?.message || err}` };
  }
}

/**
 * Normaliza qualquer campo de data para o formato DATE (YYYY-MM-DD) do PostgreSQL ou NULL.
 * Aceita ESTRITAMENTE datas completas válidas (YYYY-MM-DD, ISO completo com timestamp, ou DD/MM/YYYY).
 * Qualquer ano isolado (como 1930, "1930", 2007, "2007"), formato incompleto ou inválido resulta ESTRITAMENTE em NULL.
 * Não inventa dia ou mês (nunca retorna 01-01 fictício).
 */
export function normalizePostgresDate(val: any): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (!str) return null;

  // 1. Se for apenas ano (ex: 1930, "1930", "2007", 2007) -> NULL
  if (/^\d{1,4}$/.test(str)) {
    return null;
  }

  // 2. Formato estrito YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (year >= 1800 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }
    return null;
  }

  // 3. Formato brasileiro estrito DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (year >= 1800 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }
    return null;
  }

  return null;
}

/**
 * Normaliza os estados de publicação para o ENUM content_status do Supabase
 */
export function normalizeContentStatus(item: any): {
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  published_at: string | null;
  scheduled_at: string | null;
} {
  const nowIso = new Date().toISOString();

  if (item.status === 'archived') {
    return {
      status: 'archived',
      published_at: item.publishedAt || item.date || item.createdAt || null,
      scheduled_at: null,
    };
  }

  if (item.status === 'scheduled' && item.scheduledAt) {
    return {
      status: 'scheduled',
      published_at: null,
      scheduled_at: item.scheduledAt,
    };
  }

  if (item.published === true || item.status === 'published' || item.status === undefined) {
    return {
      status: 'published',
      published_at: item.publishedAt || item.date || item.createdAt || nowIso,
      scheduled_at: null,
    };
  }

  return {
    status: 'draft',
    published_at: null,
    scheduled_at: null,
  };
}

/**
 * Converte base64 para Blob binário com mime type
 */
export function base64ToBlob(base64Data: string): { blob: Blob; mimeType: string; extension: string } {
  const match = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!match) {
    throw new Error('String de imagem não está em formato base64 data-URL válido');
  }
  const mimeType = match[1];
  const rawBase64 = match[2];
  const binaryString = atob(rawBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  let extension = 'jpg';
  if (mimeType.includes('png')) extension = 'png';
  else if (mimeType.includes('webp')) extension = 'webp';
  else if (mimeType.includes('gif')) extension = 'gif';
  else if (mimeType.includes('avif')) extension = 'avif';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';

  const blob = new Blob([bytes], { type: mimeType });
  return { blob, mimeType, extension };
}

/**
 * Realiza upload de imagem Base64 para o bucket 'media' do Supabase Storage
 */
export async function uploadBase64ImageToSupabase(
  supabase: SupabaseClient,
  base64Data: string,
  folder: 'covers' | 'films' | 'people' | 'uploads',
  filenameBase: string
): Promise<{ publicUrl: string; path: string; sizeBytes: number }> {
  const { blob, mimeType, extension } = base64ToBlob(base64Data);
  const safeFilename = filenameBase.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `${folder}/${safeFilename}.${extension}`;

  const { error } = await supabase.storage
    .from('media')
    .upload(path, blob, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha no upload para Storage (media/${path}): ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('media')
    .getPublicUrl(path);

  return {
    publicUrl: publicUrlData.publicUrl,
    path,
    sizeBytes: blob.size,
  };
}

/**
 * Processa qualquer campo de imagem: se for Base64 faz upload; se for URL HTTP/relativa mantém.
 */
export async function processImageField(
  supabase: SupabaseClient,
  imageValue: string | undefined | null,
  folder: 'covers' | 'films' | 'people' | 'uploads',
  filenameBase: string
): Promise<{ url: string; uploadedToStorage?: { path: string; publicUrl: string; sizeBytes: number } } | null> {
  if (!imageValue || typeof imageValue !== 'string' || !imageValue.trim()) {
    return null;
  }

  const trimmed = imageValue.trim();

  // Caso 1: Imagem já é URL HTTP/HTTPS ou caminho relativo válido
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return { url: trimmed };
  }

  // Caso 2: Imagem é Base64
  if (trimmed.startsWith('data:image/')) {
    const res = await uploadBase64ImageToSupabase(supabase, trimmed, folder, filenameBase);
    return {
      url: res.publicUrl,
      uploadedToStorage: res,
    };
  }

  // Fallback se não for base64 nem http
  return { url: trimmed };
}

/**
 * Deduplica cineastas e pessoas em uma lista consolidada de Pessoas
 */
export function deduplicatePessoasAndCineastas(
  pessoas: any[],
  cineastas: any[]
): {
  consolidated: DeduplicatedPessoa[];
  mergedDuplicates: Array<{
    cineastaId: string;
    cineastaName: string;
    pessoaId: string;
    pessoaName: string;
    reason: string;
  }>;
} {
  const list: DeduplicatedPessoa[] = [];
  const mergedDuplicates: Array<{
    cineastaId: string;
    cineastaName: string;
    pessoaId: string;
    pessoaName: string;
    reason: string;
  }> = [];

  const slugMap = new Map<string, DeduplicatedPessoa>();
  const nameMap = new Map<string, DeduplicatedPessoa>();

  // 1. Processar pessoas
  for (const p of pessoas) {
    const slug = (p.slug || slugify(p.name || 'pessoa')).trim();
    const normName = (p.name || '').trim().toLowerCase();
    const { status, published_at, scheduled_at } = normalizeContentStatus(p);
    const item: DeduplicatedPessoa = {
      legacyId: p.id,
      mergedLegacyIds: [p.id],
      name: p.name || 'Sem Nome',
      slug,
      photoUrl: p.photo || p.photoUrl || undefined,
      birthDate: normalizePostgresDate(p.birthDate) || undefined,
      deathDate: normalizePostgresDate(p.deathDate) || undefined,
      country: p.country || p.nationality || undefined,
      bio: p.bio || undefined,
      isEditorialProfile: Boolean(p.editorialProfile),
      editorialProfile: p.editorialProfile || undefined,
      primaryRoles: Array.isArray(p.primaryRoles) && p.primaryRoles.length > 0 ? p.primaryRoles : ['Outro'],
      tags: Array.isArray(p.tags) ? p.tags : [],
      highlightHome: Boolean(p.highlightHome),
      status,
      publishedAt: published_at || undefined,
      scheduledAt: scheduled_at || undefined,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    };

    list.push(item);
    slugMap.set(slug, item);
    if (normName) nameMap.set(normName, item);
  }

  // 2. Processar cineastas e mesclar se duplicado
  for (const c of cineastas) {
    const cSlug = (c.slug || slugify(c.name || c.nome || 'cineasta')).trim();
    const cNormName = (c.name || c.nome || '').trim().toLowerCase();

    let matched = slugMap.get(cSlug);
    let reason = 'slug idêntico';

    if (!matched && cNormName) {
      matched = nameMap.get(cNormName);
      reason = 'nome normalizado idêntico';
    }

    if (matched) {
      // Mesclar
      if (!matched.mergedLegacyIds.includes(c.id)) {
        matched.mergedLegacyIds.push(c.id);
      }
      if (!matched.primaryRoles.includes('Direção') && !matched.primaryRoles.includes('Diretor')) {
        matched.primaryRoles.push('Direção');
      }
      if (!matched.bio && c.bio) matched.bio = c.bio;
      if (!matched.photoUrl && (c.photo || c.foto)) matched.photoUrl = c.photo || c.foto;
      if (!matched.country && (c.country || c.pais)) matched.country = c.country || c.pais;
      if (!matched.birthDate && (c.birthDate || c.birthYear || c.anoNascimento)) {
        matched.birthDate = normalizePostgresDate(c.birthDate || c.birthYear || c.anoNascimento) || undefined;
      }
      if (!matched.deathDate && (c.deathDate || c.deathYear || c.anoMorte)) {
        matched.deathDate = normalizePostgresDate(c.deathDate || c.deathYear || c.anoMorte) || undefined;
      }
      if (Array.isArray(c.tags)) {
        for (const t of c.tags) {
          if (!matched.tags.includes(t)) matched.tags.push(t);
        }
      }

      mergedDuplicates.push({
        cineastaId: c.id,
        cineastaName: c.name || c.nome,
        pessoaId: matched.legacyId,
        pessoaName: matched.name,
        reason,
      });
    } else {
      // Novo registro proveniente de cineasta
      const { status, published_at, scheduled_at } = normalizeContentStatus(c);
      const item: DeduplicatedPessoa = {
        legacyId: c.id,
        mergedLegacyIds: [c.id],
        name: c.name || c.nome || 'Cineasta',
        slug: cSlug,
        photoUrl: c.photo || c.foto || undefined,
        birthDate: normalizePostgresDate(c.birthDate || c.birthYear || c.anoNascimento) || undefined,
        deathDate: normalizePostgresDate(c.deathDate || c.deathYear || c.anoMorte) || undefined,
        country: c.country || c.pais || undefined,
        bio: c.bio || undefined,
        isEditorialProfile: false,
        primaryRoles: ['Direção'],
        tags: Array.isArray(c.tags) ? c.tags : [],
        highlightHome: Boolean(c.highlightHome),
        status,
        publishedAt: published_at || undefined,
        scheduledAt: scheduled_at || undefined,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      };
      list.push(item);
      slugMap.set(cSlug, item);
      if (cNormName) nameMap.set(cNormName, item);
    }
  }

  return { consolidated: list, mergedDuplicates };
}

/**
 * Resolução estrita do filme canônico para uma Crítica
 */
export function resolveCriticaFilm(
  critica: any,
  filmes: any[]
): {
  status: 'resolved' | 'blocked';
  matchedFilmId?: string;
  matchedFilmTitle?: string;
  matchType?: string;
  reason?: string;
} {
  // 1. movieId / filmeId direto
  const directId = critica.movieId || critica.filmeId;
  if (directId) {
    const f = filmes.find((film) => film.id === directId);
    if (f) {
      return {
        status: 'resolved',
        matchedFilmId: f.id,
        matchedFilmTitle: f.title,
        matchType: 'movieId/filmeId direto',
      };
    }
  }

  const normMovieTitle = (critica.movieTitle || critica.title || '').trim().toLowerCase();
  const critYear = Number(critica.year) || 0;

  // 2. Título normalizado + Ano
  if (normMovieTitle && critYear > 0) {
    const matches = filmes.filter(
      (f) => (f.title || '').trim().toLowerCase() === normMovieTitle && Number(f.year) === critYear
    );
    if (matches.length === 1) {
      return {
        status: 'resolved',
        matchedFilmId: matches[0].id,
        matchedFilmTitle: matches[0].title,
        matchType: 'Título normalizado + Ano exato',
      };
    }
  }

  // 3. Título normalizado sozinho (exatamente 1 correspondência)
  if (normMovieTitle) {
    const matches = filmes.filter(
      (f) => (f.title || '').trim().toLowerCase() === normMovieTitle
    );
    if (matches.length === 1) {
      return {
        status: 'resolved',
        matchedFilmId: matches[0].id,
        matchedFilmTitle: matches[0].title,
        matchType: 'Título normalizado único',
      };
    }
  }

  // 4. movieSlug dedicado (somente se campo dedicated existir)
  const dedicatedSlug = critica.movieSlug || critica.filmSlug;
  if (dedicatedSlug) {
    const matches = filmes.filter((f) => f.slug === dedicatedSlug);
    if (matches.length === 1) {
      return {
        status: 'resolved',
        matchedFilmId: matches[0].id,
        matchedFilmTitle: matches[0].title,
        matchType: 'movieSlug dedicado',
      };
    }
  }

  return {
    status: 'blocked',
    reason: `Nenhum filme canônico correspondente encontrado para "${critica.movieTitle || critica.editorialTitle || critica.id}". Film_id é NOT NULL.`,
  };
}

/**
 * FASE A: AUDITORIA DE MIGRAÇÃO (Somente Leitura - Não altera nem grava nada)
 */
export async function auditV4Migration(): Promise<MigrationAuditReport> {
  const { exists, data, error } = getV4DataFromLocalStorage();

  if (!exists || !data) {
    return {
      timestamp: new Date().toISOString(),
      v4Exists: false,
      totalV4Records: 0,
      collectionCounts: {
        tags: 0,
        media: 0,
        cineastas: 0,
        pessoas: 0,
        filmes: 0,
        ensaios: 0,
        criticas: 0,
        umaImagemList: 0,
        manifestos: 0,
        especiais: 0,
        listas: 0,
        estreias: 0,
      },
      tagsAudit: { totalDeclared: 0, totalInContent: 0, totalConsolidated: 0, tagsList: [] },
      pessoasAudit: { totalPessoas: 0, totalCineastas: 0, mergedDuplicates: [], totalConsolidatedPessoas: 0 },
      criticasAudit: { total: 0, resolvedCount: 0, blockedCount: 0, items: [] },
      listasAudit: { totalListas: 0, totalItems: 0, canonicalFilmItems: 0, customTextItems: 0 },
      imagesAudit: { totalImagesChecked: 0, base64Images: [], externalUrlsCount: 0, relativeUrlsCount: 0 },
      blockedRecords: [{ entity: 'localStorage', id: V4_STORAGE_KEY, title: 'Chave V4', reason: error || 'Não encontrada' }],
      isReadyToMigrate: false,
      summaryMessage: `Erro: ${error || 'Chave V4 não encontrada no localStorage'}`,
    };
  }

  const manifestosCount = (data as any).manifestos ? (data as any).manifestos.length : 0;
  const collectionCounts = {
    tags: data.tags.length,
    media: data.media.length,
    cineastas: data.cineastas.length,
    pessoas: data.pessoas.length,
    filmes: data.filmes.length,
    ensaios: data.ensaios.length,
    criticas: data.criticas.length,
    umaImagemList: data.umaImagemList.length,
    manifestos: manifestosCount,
    especiais: data.especiais.length,
    listas: data.listas.length,
    estreias: data.estreias.length,
  };

  const totalV4Records = Object.values(collectionCounts).reduce((a, b) => a + b, 0);

  // 1. Tags Audit
  const declaredTagsMap = new Map<string, any>();
  for (const t of data.tags) {
    declaredTagsMap.set(t.name.trim().toLowerCase(), t);
  }

  const tagOccurrences = new Map<string, { originalName: string; count: number; isDeclared: boolean }>();

  // Adicionar declaradas
  for (const t of data.tags) {
    const key = t.name.trim().toLowerCase();
    tagOccurrences.set(key, { originalName: t.name.trim(), count: 1, isDeclared: true });
  }

  // Contar no conteúdo
  const inspectContentTags = (items: any[]) => {
    for (const item of items) {
      if (Array.isArray(item.tags)) {
        for (const rawTag of item.tags) {
          if (typeof rawTag === 'string' && rawTag.trim()) {
            const key = rawTag.trim().toLowerCase();
            const existing = tagOccurrences.get(key);
            if (existing) {
              existing.count += 1;
            } else {
              tagOccurrences.set(key, { originalName: rawTag.trim(), count: 1, isDeclared: false });
            }
          }
        }
      }
    }
  };

  inspectContentTags(data.ensaios);
  inspectContentTags(data.criticas);
  inspectContentTags(data.filmes);
  inspectContentTags(data.pessoas);
  inspectContentTags(data.cineastas);
  inspectContentTags(data.listas);
  inspectContentTags(data.umaImagemList);

  const tagsList: TagAuditItem[] = [];
  let totalInContent = 0;
  for (const [, info] of tagOccurrences.entries()) {
    tagsList.push({
      name: info.originalName,
      slug: slugify(info.originalName),
      isDeclared: info.isDeclared,
      occurrences: info.count,
    });
    if (!info.isDeclared) totalInContent += 1;
  }

  // 2. Pessoas + Cineastas Audit
  const { consolidated: consolidatedPessoas, mergedDuplicates } = deduplicatePessoasAndCineastas(
    data.pessoas,
    data.cineastas
  );

  // 3. Críticas Audit
  const criticasAuditItems: CriticaAuditItem[] = [];
  const blockedRecords: BlockedRecordItem[] = [];

  for (const c of data.criticas) {
    const res = resolveCriticaFilm(c, data.filmes);
    criticasAuditItems.push({
      id: c.id,
      editorialTitle: c.editorialTitle || c.movieTitle || (c as any).title || 'Crítica',
      movieTitle: c.movieTitle || (c as any).title || '',
      year: c.year,
      slug: c.slug,
      matchedFilmId: res.matchedFilmId,
      matchedFilmTitle: res.matchedFilmTitle,
      matchType: res.matchType,
      status: res.status,
      reason: res.reason,
    });

    if (res.status === 'blocked') {
      blockedRecords.push({
        entity: 'criticas',
        id: c.id,
        title: c.editorialTitle || c.movieTitle || (c as any).title || c.id,
        reason: res.reason || 'Filme canônico não encontrado',
      });
    }
  }

  // 4. Listas Audit
  let totalListItems = 0;
  let canonicalFilmItems = 0;
  let customTextItems = 0;

  for (const l of data.listas) {
    if (Array.isArray(l.items)) {
      totalListItems += l.items.length;
      for (const it of l.items) {
        const itemFilmId = (it as any).filmId;
        const matchingFilm = data.filmes.find(
          (f) =>
            (itemFilmId && f.id === itemFilmId) ||
            ((f.title || '').trim().toLowerCase() === (it.title || '').trim().toLowerCase() &&
              Number(f.year) === Number(it.year))
        );
        if (matchingFilm) {
          canonicalFilmItems += 1;
        } else {
          customTextItems += 1;
        }
      }
    }
  }

  // 5. Images & Base64 Audit
  const base64Images: Base64ImageAuditItem[] = [];
  let externalUrlsCount = 0;
  let relativeUrlsCount = 0;

  const checkImage = (
    val: string | undefined | null,
    entity: string,
    id: string,
    title: string,
    field: string,
    folder: 'covers' | 'films' | 'people' | 'uploads'
  ) => {
    if (!val || typeof val !== 'string') return;
    const str = val.trim();
    if (str.startsWith('data:image/')) {
      const estimatedKb = Math.round((str.length * 0.75) / 1024);
      base64Images.push({
        entity,
        id,
        title,
        field,
        estimatedSizeKb: estimatedKb,
        targetFolder: folder,
        targetFilename: `${folder}/${slugify(id)}-${field}.jpg`,
      });
    } else if (str.startsWith('http://') || str.startsWith('https://')) {
      externalUrlsCount += 1;
    } else if (str.startsWith('/')) {
      relativeUrlsCount += 1;
    }
  };

  for (const m of data.media) checkImage(m.url, 'media', m.id, m.filename || m.id, 'url', 'uploads');
  for (const p of data.pessoas) checkImage(p.photo, 'pessoas', p.id, p.name, 'photo', 'people');
  for (const c of data.cineastas) checkImage(c.photo, 'cineastas', c.id, c.name, 'photo', 'people');
  for (const f of data.filmes) {
    checkImage(f.posterImage, 'filmes', f.id, f.title, 'poster', 'films');
    checkImage((f as any).backdropImage, 'filmes', f.id, f.title, 'backdrop', 'films');
  }
  for (const e of data.ensaios) checkImage(e.coverImage, 'ensaios', e.id, e.title, 'cover', 'covers');
  for (const c of data.criticas) checkImage(c.coverImage, 'criticas', c.id, c.editorialTitle || c.movieTitle, 'cover', 'covers');
  for (const img of data.umaImagemList) checkImage(img.image || (img as any).imageUrl, 'umaImagemList', img.id, img.title, 'image', 'covers');
  for (const esp of data.especiais) checkImage(esp.coverImage, 'especiais', esp.id, esp.title, 'cover', 'covers');
  for (const l of data.listas) checkImage(l.coverImage, 'listas', l.id, l.title, 'cover', 'covers');
  if ((data as any).manifestos) {
    for (const man of (data as any).manifestos) checkImage(man.coverImage, 'manifestos', man.id, man.title, 'cover', 'covers');
  }

  const isReadyToMigrate = blockedRecords.length === 0;
  const summaryMessage = isReadyToMigrate
    ? `Pronto para migrar: ${totalV4Records} registros encontrados no V4. ${base64Images.length} imagem(ns) Base64 identificada(s) para upload no Storage.`
    : `Atenção: ${blockedRecords.length} registro(s) bloqueado(s) identificado(s). Corrija as dependências antes de executar.`;

  return {
    timestamp: new Date().toISOString(),
    v4Exists: true,
    totalV4Records,
    collectionCounts,
    tagsAudit: {
      totalDeclared: data.tags.length,
      totalInContent,
      totalConsolidated: tagsList.length,
      tagsList,
    },
    pessoasAudit: {
      totalPessoas: data.pessoas.length,
      totalCineastas: data.cineastas.length,
      mergedDuplicates,
      totalConsolidatedPessoas: consolidatedPessoas.length,
    },
    criticasAudit: {
      total: data.criticas.length,
      resolvedCount: criticasAuditItems.filter((i) => i.status === 'resolved').length,
      blockedCount: criticasAuditItems.filter((i) => i.status === 'blocked').length,
      items: criticasAuditItems,
    },
    listasAudit: {
      totalListas: data.listas.length,
      totalItems: totalListItems,
      canonicalFilmItems,
      customTextItems,
    },
    imagesAudit: {
      totalImagesChecked: base64Images.length + externalUrlsCount + relativeUrlsCount,
      base64Images,
      externalUrlsCount,
      relativeUrlsCount,
    },
    blockedRecords,
    isReadyToMigrate,
    summaryMessage,
    rawData: data,
  };
}

/**
 * FASE B: EXECUÇÃO DA MIGRAÇÃO (Idempotente, segura, respeitando FKs e Storage)
 */
export async function executeV4MigrationToSupabase(
  onProgress?: (update: MigrationProgressUpdate) => void
): Promise<MigrationExecutionReport> {
  const startTime = new Date().toISOString();
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  const report: MigrationExecutionReport = {
    success: false,
    timestamp: startTime,
    totalFoundV4: 0,
    insertedCounts: {},
    updatedCounts: {},
    skippedCounts: {},
    storageUploads: [],
    errors: [],
    unmigratedRecords: [],
    localStorageIntact: true, // SEMPRE true, pois não alteramos localStorage
    logs,
  };

  const emit = (stage: string, percent: number, message: string) => {
    log(`${stage} (${percent}%): ${message}`);
    if (onProgress) {
      onProgress({ stage, percent, message, timestamp: new Date().toISOString() });
    }
  };

  emit('Início', 0, 'Iniciando validações preliminares...');

  // 1. Verificar Supabase Client e Autenticação Admin
  const supabase = getSupabaseClient();
  if (!supabase) {
    const err = 'Cliente Supabase não configurado. Verifique as variáveis de ambiente.';
    report.errors.push({ step: 'auth', error: err });
    emit('Erro', 0, err);
    return report;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    const err = 'Nenhum usuário autenticado no Supabase. Faça login administrativo antes de migrar.';
    report.errors.push({ step: 'auth', error: err });
    emit('Erro', 0, err);
    return report;
  }

  const { data: isAdmin, error: adminRpcError } = await supabase.rpc('is_admin');
  if (adminRpcError || !isAdmin) {
    const err = 'O usuário autenticado não possui privilégios de administrador no Supabase (is_admin).';
    report.errors.push({ step: 'auth', error: err });
    emit('Erro', 0, err);
    return report;
  }

  // 2. Carregar dados brutos do V4 no localStorage
  const { exists, data } = getV4DataFromLocalStorage();
  if (!exists || !data) {
    const err = 'Não foi possível carregar os dados de lanterna_magica_cms_data_v4 do localStorage.';
    report.errors.push({ step: 'load_v4', error: err });
    emit('Erro', 0, err);
    return report;
  }

  report.totalFoundV4 =
    data.tags.length +
    data.media.length +
    data.cineastas.length +
    data.pessoas.length +
    data.filmes.length +
    data.ensaios.length +
    data.criticas.length +
    data.umaImagemList.length +
    data.especiais.length +
    data.listas.length +
    data.estreias.length +
    ((data as any).manifestos?.length || 0);

  emit('Auditoria', 5, `Total de ${report.totalFoundV4} registros lidos do V4. Iniciando migração estruturada...`);

  // Mapas de resolução em memória (legacy_id -> UUID canônico no Supabase)
  const tagUuidMap = new Map<string, string>(); // slug / normalizedName -> UUID
  const generoUuidMap = new Map<string, string>(); // slug -> UUID
  const personUuidMap = new Map<string, string>(); // legacy_id (pessoas e cineastas) -> UUID
  const filmUuidMap = new Map<string, string>(); // legacy_id -> UUID
  const ensaioUuidMap = new Map<string, string>(); // legacy_id -> UUID
  const criticaUuidMap = new Map<string, string>(); // legacy_id -> UUID
  const listaUuidMap = new Map<string, string>(); // legacy_id -> UUID
  const umaImagemUuidMap = new Map<string, string>(); // legacy_id -> UUID

  try {
    // =========================================================================
    // PASSO 1: TAGS E GÊNEROS (10%)
    // =========================================================================
    emit('Tags & Gêneros', 10, 'Consolidando e inserindo tags e gêneros...');

    // A. Coleta e consolidação de tags
    const allTagsMap = new Map<string, { name: string; slug: string }>();

    for (const t of data.tags) {
      const normName = t.name.trim();
      const slug = t.slug || slugify(normName);
      allTagsMap.set(normName.toLowerCase(), { name: normName, slug });
    }

    const collectFromList = (items: any[]) => {
      for (const it of items) {
        if (Array.isArray(it.tags)) {
          for (const t of it.tags) {
            if (typeof t === 'string' && t.trim()) {
              const normName = t.trim();
              const slug = slugify(normName);
              if (!allTagsMap.has(normName.toLowerCase())) {
                allTagsMap.set(normName.toLowerCase(), { name: normName, slug });
              }
            }
          }
        }
      }
    };

    collectFromList(data.ensaios);
    collectFromList(data.criticas);
    collectFromList(data.filmes);
    collectFromList(data.pessoas);
    collectFromList(data.cineastas);
    collectFromList(data.listas);
    collectFromList(data.umaImagemList);

    let tagsCount = 0;
    for (const [, tagInfo] of allTagsMap.entries()) {
      const { data: tagRow, error: tagErr } = await supabase
        .from('tags')
        .upsert(
          { name: tagInfo.name, slug: tagInfo.slug },
          { onConflict: 'slug' }
        )
        .select('id, name, slug')
        .single();

      if (tagErr) {
        report.errors.push({ step: 'tags', error: `Erro na tag "${tagInfo.name}": ${tagErr.message}` });
      } else if (tagRow) {
        tagUuidMap.set(tagInfo.name.toLowerCase(), tagRow.id);
        tagUuidMap.set(tagInfo.slug, tagRow.id);
        tagsCount += 1;
      }
    }
    report.insertedCounts['tags'] = tagsCount;

    // B. Gêneros a partir dos filmes
    const allGenresMap = new Map<string, { name: string; slug: string }>();
    for (const f of data.filmes) {
      if (Array.isArray(f.genres)) {
        for (const g of f.genres) {
          if (typeof g === 'string' && g.trim()) {
            const norm = g.trim();
            allGenresMap.set(norm.toLowerCase(), { name: norm, slug: slugify(norm) });
          }
        }
      }
    }

    let generosCount = 0;
    for (const [, gInfo] of allGenresMap.entries()) {
      const { data: gRow, error: gErr } = await supabase
        .from('generos')
        .upsert(
          { name: gInfo.name, slug: gInfo.slug },
          { onConflict: 'slug' }
        )
        .select('id, name, slug')
        .single();

      if (gErr) {
        report.errors.push({ step: 'generos', error: `Erro no gênero "${gInfo.name}": ${gErr.message}` });
      } else if (gRow) {
        generoUuidMap.set(gInfo.name.toLowerCase(), gRow.id);
        generoUuidMap.set(gInfo.slug, gRow.id);
        generosCount += 1;
      }
    }
    report.insertedCounts['generos'] = generosCount;

    // =========================================================================
    // PASSO 2: MEDIA ITEMS (20%)
    // =========================================================================
    emit('Mídias', 20, 'Processando biblioteca de mídias e Storage...');
    let mediaCount = 0;
    for (const m of data.media) {
      try {
        let finalUrl = m.url;
        let storagePath = `uploads/${slugify(m.id || 'media')}-file.jpg`;
        let fileSize: number | null = null;
        let mimeType: string | null = null;

        if (m.url && m.url.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            m.url,
            'uploads',
            `${slugify(m.id || 'med')}-${Date.now()}`
          );
          finalUrl = up.publicUrl;
          storagePath = up.path;
          fileSize = up.sizeBytes;
          const { mimeType: mt } = base64ToBlob(m.url);
          mimeType = mt;

          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'media_items',
            entityId: m.id,
          });
        }

        // media_items: verificar existência prévia por storage_path ou public_url
        const { data: existingMedia } = await supabase
          .from('media_items')
          .select('id')
          .or(`storage_path.eq.${storagePath},public_url.eq.${finalUrl}`)
          .maybeSingle();

        if (existingMedia?.id) {
          const { error: medErr } = await supabase
            .from('media_items')
            .update({
              storage_path: storagePath,
              public_url: finalUrl,
              filename: m.filename || `media-${m.id}`,
              mime_type: mimeType,
              file_size_bytes: fileSize,
              alt_text: m.altText || null,
              caption: m.caption || null,
              credit: m.credit || null,
              is_public: true,
            })
            .eq('id', existingMedia.id);

          if (medErr) {
            report.errors.push({ step: 'media_items', id: m.id, error: medErr.message });
          } else {
            mediaCount += 1;
          }
        } else {
          const { error: medErr } = await supabase
            .from('media_items')
            .insert({
              storage_path: storagePath,
              public_url: finalUrl,
              filename: m.filename || `media-${m.id}`,
              mime_type: mimeType,
              file_size_bytes: fileSize,
              alt_text: m.altText || null,
              caption: m.caption || null,
              credit: m.credit || null,
              is_public: true,
              created_at: m.createdAt || new Date().toISOString(),
            });

          if (medErr) {
            report.errors.push({ step: 'media_items', id: m.id, error: medErr.message });
          } else {
            mediaCount += 1;
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'media_items_upload', id: m.id, error: err.message || err });
        report.unmigratedRecords.push({ entity: 'media', id: m.id, title: m.filename || m.id, reason: err.message });
      }
    }
    report.insertedCounts['media_items'] = mediaCount;

    // =========================================================================
    // PASSO 3: PESSOAS E CINEASTAS (35%)
    // =========================================================================
    emit('Pessoas & Cineastas', 35, 'Unificando pessoas e cineastas canonicamente...');
    const { consolidated: pessoasConsolidadas } = deduplicatePessoasAndCineastas(data.pessoas, data.cineastas);

    let pessoasCount = 0;
    for (const p of pessoasConsolidadas) {
      try {
        let photoUrl = p.photoUrl || null;
        if (p.photoUrl && p.photoUrl.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            p.photoUrl,
            'people',
            `${slugify(p.legacyId)}-photo`
          );
          photoUrl = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'pessoas',
            entityId: p.legacyId,
          });
        }

        const { data: pessoaRow, error: pErr } = await supabase
          .from('pessoas')
          .upsert(
            {
              legacy_id: p.legacyId,
              name: p.name,
              slug: p.slug,
              photo_url: photoUrl,
              birth_date: normalizePostgresDate(p.birthDate),
              death_date: normalizePostgresDate(p.deathDate),
              country: p.country || null,
              bio: p.bio || null,
              is_editorial_profile: p.isEditorialProfile,
              editorial_profile: p.editorialProfile || null,
              primary_roles: p.primaryRoles,
              highlight_home: p.highlightHome,
              status: p.status || 'published',
              published_at: p.publishedAt || null,
              scheduled_at: p.scheduledAt || null,
              created_at: p.createdAt,
              updated_at: p.updatedAt,
            },
            { onConflict: 'slug' }
          )
          .select('id, slug, legacy_id')
          .single();

        if (pErr) {
          report.errors.push({ step: 'pessoas', id: p.legacyId, error: pErr.message });
        } else if (pessoaRow) {
          pessoasCount += 1;
          for (const legId of p.mergedLegacyIds) {
            personUuidMap.set(legId, pessoaRow.id);
          }
          personUuidMap.set(p.slug, pessoaRow.id);

          // Associar tags de pessoas
          for (const t of p.tags) {
            const tagUuid = tagUuidMap.get(t.toLowerCase()) || tagUuidMap.get(slugify(t));
            if (tagUuid) {
              await supabase
                .from('pessoa_tags')
                .upsert({ pessoa_id: pessoaRow.id, tag_id: tagUuid }, { onConflict: 'pessoa_id,tag_id' });
            }
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'pessoas_upload', id: p.legacyId, error: err.message || err });
        report.unmigratedRecords.push({ entity: 'pessoas', id: p.legacyId, title: p.name, reason: err.message });
      }
    }
    report.insertedCounts['pessoas'] = pessoasCount;

    // =========================================================================
    // PASSO 4: FILMES, GÊNEROS ASSOCIATIVOS E CRÉDITOS (50%)
    // =========================================================================
    emit('Filmes', 50, 'Migrando cinemateca canônica, gêneros e créditos...');
    let filmesCount = 0;
    for (const f of data.filmes) {
      try {
        let posterUrl = f.posterImage || null;
        if (posterUrl && posterUrl.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            posterUrl,
            'films',
            `${slugify(f.id)}-poster`
          );
          posterUrl = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'filmes',
            entityId: f.id,
          });
        }

        const { data: filmRow, error: fErr } = await supabase
          .from('filmes')
          .upsert(
            {
              legacy_id: f.id,
              title: f.title,
              original_title: f.originalTitle || null,
              slug: f.slug,
              year: Number(f.year),
              country: f.country || 'Desconhecido',
              duration_minutes: f.durationMinutes ? Number(f.durationMinutes) : null,
              poster_url: posterUrl,
              synopsis: f.synopsis || null,
              legacy_director_name: f.director || null,
              status: f.status === 'draft' ? 'draft' : 'published',
              created_at: f.createdAt || new Date().toISOString(),
              updated_at: f.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'slug' }
          )
          .select('id, slug, legacy_id')
          .single();

        if (fErr) {
          report.errors.push({ step: 'filmes', id: f.id, error: fErr.message });
        } else if (filmRow) {
          filmesCount += 1;
          filmUuidMap.set(f.id, filmRow.id);
          filmUuidMap.set(f.slug, filmRow.id);

          // A. Filme Gêneros
          if (Array.isArray(f.genres)) {
            for (const g of f.genres) {
              const gUuid = generoUuidMap.get(g.toLowerCase()) || generoUuidMap.get(slugify(g));
              if (gUuid) {
                await supabase
                  .from('filme_generos')
                  .upsert({ filme_id: filmRow.id, genero_id: gUuid }, { onConflict: 'filme_id,genero_id' });
              }
            }
          }

          // B. Filme Tags
          if (Array.isArray(f.tags)) {
            for (const t of f.tags) {
              const tagUuid = tagUuidMap.get(t.toLowerCase()) || tagUuidMap.get(slugify(t));
              if (tagUuid) {
                await supabase
                  .from('filme_tags')
                  .upsert({ filme_id: filmRow.id, tag_id: tagUuid }, { onConflict: 'filme_id,tag_id' });
              }
            }
          }

          // C. Film Credits (Idempotente: remove créditos anteriores do filme ou insere com verificação)
          if (Array.isArray(f.credits) && f.credits.length > 0) {
            let orderIdx = 0;
            for (const cr of f.credits) {
              const personUuid =
                cr.personId ? personUuidMap.get(cr.personId) :
                cr.personSlug ? personUuidMap.get(cr.personSlug) :
                null;

              if (personUuid) {
                // Com person_id: upsert utilizando a constraint única film_id, person_id, role
                await supabase.from('film_credits').upsert(
                  {
                    film_id: filmRow.id,
                    person_id: personUuid,
                    fallback_person_name: null,
                    department: cr.department || 'Outro',
                    role: cr.role || 'Participação',
                    character_name: cr.characterName || null,
                    order_index: orderIdx++,
                  },
                  { onConflict: 'film_id,person_id,role' }
                );
              } else {
                // Sem person_id: verificar se já existe registro com mesmo fallback_person_name, filme e role
                const fallbackName = cr.personName || 'Desconhecido';
                const { data: existingCredit } = await supabase
                  .from('film_credits')
                  .select('id')
                  .eq('film_id', filmRow.id)
                  .eq('fallback_person_name', fallbackName)
                  .eq('role', cr.role || 'Participação')
                  .maybeSingle();

                if (existingCredit?.id) {
                  await supabase
                    .from('film_credits')
                    .update({
                      department: cr.department || 'Outro',
                      character_name: cr.characterName || null,
                      order_index: orderIdx++,
                    })
                    .eq('id', existingCredit.id);
                } else {
                  await supabase.from('film_credits').insert({
                    film_id: filmRow.id,
                    person_id: null,
                    fallback_person_name: fallbackName,
                    department: cr.department || 'Outro',
                    role: cr.role || 'Participação',
                    character_name: cr.characterName || null,
                    order_index: orderIdx++,
                  });
                }
              }
            }
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'filmes_upload', id: f.id, error: err.message || err });
        report.unmigratedRecords.push({ entity: 'filmes', id: f.id, title: f.title, reason: err.message });
      }
    }
    report.insertedCounts['filmes'] = filmesCount;

    // =========================================================================
    // PASSO 5: ENSAIOS, CRÍTICAS, MANIFESTOS, UMA IMAGEM, ESPECIAIS, LISTAS, ESTREIAS (75%)
    // =========================================================================
    emit('Publicações Editoriais', 65, 'Migrando ensaios, críticas, manifestos, imagens e especiais...');

    // A. Ensaios
    let ensaiosCount = 0;
    for (const ens of data.ensaios) {
      try {
        let cover = ens.coverImage;
        if (cover && cover.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            cover,
            'covers',
            `${slugify(ens.id)}-cover`
          );
          cover = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'ensaios',
            entityId: ens.id,
          });
        }

        const normStatus = normalizeContentStatus(ens);

        const { data: ensRow, error: ensErr } = await supabase
          .from('ensaios')
          .upsert(
            {
              legacy_id: ens.id,
              title: ens.title,
              slug: ens.slug,
              subtitle: ens.subtitle || '',
              cover_image: cover || '',
              content: ens.content || '',
              category: ens.category || 'Geral',
              author: ens.author || 'Redação Lanterna Mágica',
              read_time_minutes: (ens as any).readingTimeMinutes || ens.readTimeMinutes || 5,
              highlight_home: Boolean(ens.highlightHome),
              seo_title: ens.seoTitle || null,
              seo_description: ens.seoDescription || null,
              status: normStatus.status,
              published_at: normStatus.published_at,
              scheduled_at: normStatus.scheduled_at,
              created_at: ens.createdAt || new Date().toISOString(),
              updated_at: ens.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'slug' }
          )
          .select('id, slug, legacy_id')
          .single();

        if (ensErr) {
          report.errors.push({ step: 'ensaios', id: ens.id, error: ensErr.message });
        } else if (ensRow) {
          ensaiosCount += 1;
          ensaioUuidMap.set(ens.id, ensRow.id);

          if (Array.isArray(ens.tags)) {
            for (const t of ens.tags) {
              const tagUuid = tagUuidMap.get(t.toLowerCase()) || tagUuidMap.get(slugify(t));
              if (tagUuid) {
                await supabase
                  .from('ensaio_tags')
                  .upsert({ ensaio_id: ensRow.id, tag_id: tagUuid }, { onConflict: 'ensaio_id,tag_id' });
              }
            }
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'ensaios_upload', id: ens.id, error: err.message || err });
        report.unmigratedRecords.push({ entity: 'ensaios', id: ens.id, title: ens.title, reason: err.message });
      }
    }
    report.insertedCounts['ensaios'] = ensaiosCount;

    // B. Críticas
    let criticasCount = 0;
    for (const c of data.criticas) {
      try {
        const filmRes = resolveCriticaFilm(c, data.filmes);
        if (filmRes.status === 'blocked' || !filmRes.matchedFilmId) {
          report.unmigratedRecords.push({
            entity: 'criticas',
            id: c.id,
            title: c.editorialTitle || c.movieTitle || (c as any).title || c.id,
            reason: filmRes.reason || 'Filme canônico não encontrado',
          });
          continue;
        }

        const canonicalFilmUuid = filmUuidMap.get(filmRes.matchedFilmId);
        if (!canonicalFilmUuid) {
          report.unmigratedRecords.push({
            entity: 'criticas',
            id: c.id,
            title: c.editorialTitle || c.movieTitle || (c as any).title || c.id,
            reason: `UUID do filme ${filmRes.matchedFilmId} não encontrado no banco.`,
          });
          continue;
        }

        let cover = c.coverImage || null;
        if (cover && cover.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            cover,
            'covers',
            `${slugify(c.id)}-cover`
          );
          cover = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'criticas',
            entityId: c.id,
          });
        }

        const normStatus = normalizeContentStatus(c);

        const { data: critRow, error: critErr } = await supabase
          .from('criticas')
          .upsert(
            {
              legacy_id: c.id,
              film_id: canonicalFilmUuid,
              editorial_title: c.editorialTitle || c.movieTitle || (c as any).title || 'Crítica',
              slug: c.slug,
              content: c.content || '',
              star_rating: Number(c.starRating || 3.0),
              is_new_release: Boolean(c.isNewRelease),
              highlight_home: Boolean(c.highlightHome),
              cover_image: cover,
              seo_title: c.seoTitle || null,
              seo_description: c.seoDescription || null,
              status: normStatus.status,
              published_at: normStatus.published_at,
              scheduled_at: normStatus.scheduled_at,
              created_at: c.createdAt || new Date().toISOString(),
              updated_at: c.updatedAt || new Date().toISOString(),
              legacy_movie_title: c.movieTitle || null,
              legacy_director: c.director || null,
              legacy_year: c.year ? Number(c.year) : null,
              legacy_country: c.country || null,
            },
            { onConflict: 'slug' }
          )
          .select('id, slug, legacy_id')
          .single();

        if (critErr) {
          report.errors.push({ step: 'criticas', id: c.id, error: critErr.message });
        } else if (critRow) {
          criticasCount += 1;
          criticaUuidMap.set(c.id, critRow.id);

          if (Array.isArray(c.tags)) {
            for (const t of c.tags) {
              const tagUuid = tagUuidMap.get(t.toLowerCase()) || tagUuidMap.get(slugify(t));
              if (tagUuid) {
                await supabase
                  .from('critica_tags')
                  .upsert({ critica_id: critRow.id, tag_id: tagUuid }, { onConflict: 'critica_id,tag_id' });
              }
            }
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'criticas_upload', id: c.id, error: err.message || err });
        report.unmigratedRecords.push({
          entity: 'criticas',
          id: c.id,
          title: c.editorialTitle || c.movieTitle || (c as any).title || c.id,
          reason: err.message,
        });
      }
    }
    report.insertedCounts['criticas'] = criticasCount;

    // C. Manifestos
    const manifestosList = (data as any).manifestos || [];
    let manifestosCount = 0;
    for (const man of manifestosList) {
      try {
        let cover = man.coverImage || null;
        if (cover && cover.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            cover,
            'covers',
            `${slugify(man.id)}-cover`
          );
          cover = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'manifestos',
            entityId: man.id,
          });
        }

        const normStatus = normalizeContentStatus(man);

        const { error: manErr } = await supabase
          .from('manifestos')
          .upsert(
            {
              legacy_id: man.id,
              title: man.title,
              subtitle: man.subtitle || null,
              edition: man.edition || null,
              author: man.author || 'Redação Lanterna Mágica',
              slug: man.slug || slugify(man.title),
              summary: man.summary || null,
              content: man.content || '',
              cover_image: cover,
              status: normStatus.status,
              published_at: normStatus.published_at,
              scheduled_at: normStatus.scheduled_at,
              created_at: man.createdAt || new Date().toISOString(),
              updated_at: man.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'slug' }
          );

        if (manErr) {
          report.errors.push({ step: 'manifestos', id: man.id, error: manErr.message });
        } else {
          manifestosCount += 1;
        }
      } catch (err: any) {
        report.errors.push({ step: 'manifestos_upload', id: man.id, error: err.message || err });
      }
    }
    report.insertedCounts['manifestos'] = manifestosCount;

    // D. Uma Imagem, Uma Ideia
    let umaImagemCount = 0;
    for (const img of data.umaImagemList) {
      try {
        let imageUrl = img.image || (img as any).imageUrl;
        if (imageUrl && imageUrl.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            imageUrl,
            'covers',
            `${slugify(img.id)}-image`
          );
          imageUrl = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'uma_imagem',
            entityId: img.id,
          });
        }

        const normStatus = normalizeContentStatus(img);
        const filmTargetId = (img as any).filmId || (img as any).relatedMovie;
        const personTargetId = (img as any).directorId || (img as any).relatedFilmmaker;

        const { data: imgRow, error: imgErr } = await supabase
          .from('uma_imagem')
          .upsert(
            {
              legacy_id: img.id,
              title: img.title,
              slug: img.slug,
              image_url: imageUrl,
              content: (img as any).commentary || img.content || '',
              film_id: filmTargetId ? filmUuidMap.get(filmTargetId) || null : null,
              person_id: personTargetId ? personUuidMap.get(personTargetId) || null : null,
              highlight_home: Boolean(img.highlightHome),
              status: normStatus.status,
              published_at: normStatus.published_at,
              scheduled_at: normStatus.scheduled_at,
              created_at: img.createdAt || new Date().toISOString(),
              updated_at: img.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'slug' }
          )
          .select('id, slug, legacy_id')
          .single();

        if (imgErr) {
          report.errors.push({ step: 'uma_imagem', id: img.id, error: imgErr.message });
        } else if (imgRow) {
          umaImagemCount += 1;
          umaImagemUuidMap.set(img.id, imgRow.id);

          if (Array.isArray(img.tags)) {
            for (const t of img.tags) {
              const tagUuid = tagUuidMap.get(t.toLowerCase()) || tagUuidMap.get(slugify(t));
              if (tagUuid) {
                await supabase
                  .from('uma_imagem_tags')
                  .upsert({ uma_imagem_id: imgRow.id, tag_id: tagUuid }, { onConflict: 'uma_imagem_id,tag_id' });
              }
            }
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'uma_imagem_upload', id: img.id, error: err.message || err });
      }
    }
    report.insertedCounts['uma_imagem'] = umaImagemCount;

    // E. Especiais
    let especiaisCount = 0;
    for (const esp of data.especiais) {
      try {
        let cover = esp.coverImage;
        if (cover && cover.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            cover,
            'covers',
            `${slugify(esp.id)}-cover`
          );
          cover = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'especiais',
            entityId: esp.id,
          });
        }

        const normStatus = normalizeContentStatus(esp);
        const relatedFilmmakerId = (esp as any).relatedFilmmaker;

        const { data: espRow, error: espErr } = await supabase
          .from('especiais')
          .upsert(
            {
              legacy_id: esp.id,
              title: esp.title,
              slug: esp.slug,
              subtitle: esp.subtitle || '',
              cover_image: cover,
              intro: esp.intro || '',
              content: esp.content || '',
              related_person_id: relatedFilmmakerId ? personUuidMap.get(relatedFilmmakerId) || null : null,
              highlight_home: Boolean(esp.highlightHome),
              status: normStatus.status,
              published_at: normStatus.published_at,
              scheduled_at: normStatus.scheduled_at,
              created_at: esp.createdAt || new Date().toISOString(),
              updated_at: esp.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'slug' }
          )
          .select('id, slug, legacy_id')
          .single();

        if (espErr) {
          report.errors.push({ step: 'especiais', id: esp.id, error: espErr.message });
        } else if (espRow) {
          especiaisCount += 1;

          // Processar especial_items
          if (Array.isArray(esp.relatedItemIds)) {
            let itemIdx = 0;
            for (const relId of esp.relatedItemIds) {
              let itemType: string | null = null;
              let ensaioId: string | null = null;
              let criticaId: string | null = null;
              let listaId: string | null = null;
              let umaImgId: string | null = null;
              let filmeId: string | null = null;
              let pessoaId: string | null = null;

              if (ensaioUuidMap.has(relId)) {
                itemType = 'ensaio';
                ensaioId = ensaioUuidMap.get(relId)!;
              } else if (criticaUuidMap.has(relId)) {
                itemType = 'critica';
                criticaId = criticaUuidMap.get(relId)!;
              } else if (listaUuidMap.has(relId)) {
                itemType = 'lista';
                listaId = listaUuidMap.get(relId)!;
              } else if (umaImagemUuidMap.has(relId)) {
                itemType = 'uma_imagem';
                umaImgId = umaImagemUuidMap.get(relId)!;
              } else if (filmUuidMap.has(relId)) {
                itemType = 'filme';
                filmeId = filmUuidMap.get(relId)!;
              } else if (personUuidMap.has(relId)) {
                itemType = 'pessoa';
                pessoaId = personUuidMap.get(relId)!;
              }

              if (itemType) {
                await supabase.from('especial_items').upsert(
                  {
                    especial_id: espRow.id,
                    item_type: itemType,
                    ensaio_id: ensaioId,
                    critica_id: criticaId,
                    lista_id: listaId,
                    uma_imagem_id: umaImgId,
                    filme_id: filmeId,
                    pessoa_id: pessoaId,
                    order_index: itemIdx++,
                  },
                  { onConflict: 'especial_id,order_index' }
                );
              }
            }
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'especiais_upload', id: esp.id, error: err.message || err });
      }
    }
    report.insertedCounts['especiais'] = especiaisCount;

    // F. Listas e Itens
    let listasCount = 0;
    for (const l of data.listas) {
      try {
        let cover = l.coverImage;
        if (cover && cover.startsWith('data:image/')) {
          const up = await uploadBase64ImageToSupabase(
            supabase,
            cover,
            'covers',
            `${slugify(l.id)}-cover`
          );
          cover = up.publicUrl;
          report.storageUploads.push({
            path: up.path,
            publicUrl: up.publicUrl,
            sizeBytes: up.sizeBytes,
            entity: 'listas',
            entityId: l.id,
          });
        }

        const normStatus = normalizeContentStatus(l);

        const { data: listaRow, error: lErr } = await supabase
          .from('listas')
          .upsert(
            {
              legacy_id: l.id,
              title: l.title,
              slug: l.slug,
              intro: l.intro || '',
              cover_image: cover,
              related_person_id: l.relatedFilmmaker ? personUuidMap.get(l.relatedFilmmaker) || null : null,
              status: normStatus.status,
              published_at: normStatus.published_at,
              scheduled_at: normStatus.scheduled_at,
              created_at: l.createdAt || new Date().toISOString(),
              updated_at: l.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'slug' }
          )
          .select('id, slug, legacy_id')
          .single();

        if (lErr) {
          report.errors.push({ step: 'listas', id: l.id, error: lErr.message });
        } else if (listaRow) {
          listasCount += 1;
          listaUuidMap.set(l.id, listaRow.id);

          // Inserir lista_items
          if (Array.isArray(l.items)) {
            let itemIdx = 0;
            for (const it of l.items) {
              const itemFilmId = (it as any).filmId;
              const matchedFilm = data.filmes.find(
                (f) =>
                  (itemFilmId && f.id === itemFilmId) ||
                  ((f.title || '').trim().toLowerCase() === (it.title || '').trim().toLowerCase() &&
                    Number(f.year) === Number(it.year))
              );

              const canonicalFilmUuid = matchedFilm ? filmUuidMap.get(matchedFilm.id) || null : null;

              await supabase.from('lista_items').upsert(
                {
                  lista_id: listaRow.id,
                  film_id: canonicalFilmUuid,
                  custom_title: !canonicalFilmUuid ? it.title : null,
                  custom_director: !canonicalFilmUuid ? it.director || null : null,
                  custom_year: !canonicalFilmUuid && it.year ? Number(it.year) : null,
                  custom_image: !canonicalFilmUuid ? it.image || null : null,
                  rank: it.rank ? Number(it.rank) : null,
                  note: it.note || null,
                  order_index: itemIdx++,
                },
                { onConflict: 'lista_id,order_index' }
              );
            }
          }

          // Lista tags
          if (Array.isArray(l.tags)) {
            for (const t of l.tags) {
              const tagUuid = tagUuidMap.get(t.toLowerCase()) || tagUuidMap.get(slugify(t));
              if (tagUuid) {
                await supabase
                  .from('lista_tags')
                  .upsert({ lista_id: listaRow.id, tag_id: tagUuid }, { onConflict: 'lista_id,tag_id' });
              }
            }
          }
        }
      } catch (err: any) {
        report.errors.push({ step: 'listas_upload', id: l.id, error: err.message || err });
      }
    }
    report.insertedCounts['listas'] = listasCount;

    // G. Estreias
    let estreiasCount = 0;
    for (const est of data.estreias) {
      try {
        const canonicalFilmUuid = est.filmId ? filmUuidMap.get(est.filmId) : null;
        if (!canonicalFilmUuid) {
          report.unmigratedRecords.push({
            entity: 'estreias',
            id: est.id,
            title: (est as any).filmTitle || (est as any).title || est.id,
            reason: `Filme ${est.filmId} não encontrado no mapa de filmes migrados.`,
          });
          continue;
        }

        const normStatus = normalizeContentStatus(est);

        const { error: estErr } = await supabase
          .from('estreias')
          .upsert(
            {
              legacy_id: est.id,
              film_id: canonicalFilmUuid,
              country: est.country || 'Brasil',
              release_date: est.releaseDate || new Date().toISOString().slice(0, 10),
              release_type: est.releaseType || 'Cinema',
              distributor: est.distributor || null,
              notes: est.notes || null,
              status: normStatus.status,
              created_at: est.createdAt || new Date().toISOString(),
              updated_at: est.updatedAt || new Date().toISOString(),
            },
            { onConflict: 'legacy_id' }
          );

        if (estErr) {
          report.errors.push({ step: 'estreias', id: est.id, error: estErr.message });
        } else {
          estreiasCount += 1;
        }
      } catch (err: any) {
        report.errors.push({ step: 'estreias', id: est.id, error: err.message || err });
      }
    }
    report.insertedCounts['estreias'] = estreiasCount;

    // =========================================================================
    // PASSO 6: FINALIZAÇÃO (100%)
    // =========================================================================
    report.success = report.errors.length === 0;
    emit(
      'Conclusão',
      100,
      report.success
        ? 'Migração concluída com sucesso no Supabase!'
        : `Migração finalizada com ${report.errors.length} erro(s). localStorage permanece 100% intacto.`
    );
  } catch (fatalErr: any) {
    report.success = false;
    report.errors.push({ step: 'fatal', error: fatalErr?.message || String(fatalErr) });
    emit('Erro Fatal', 100, `Erro inesperado: ${fatalErr?.message || fatalErr}`);
  }

  // Persistir o relatório detalhado para inspeção permanente no painel
  saveLastMigrationReport(report);

  return report;
}

export const LAST_MIGRATION_REPORT_KEY = 'lanterna_magica_last_migration_report';

export function saveLastMigrationReport(report: MigrationExecutionReport): void {
  try {
    localStorage.setItem(LAST_MIGRATION_REPORT_KEY, JSON.stringify(report));
  } catch (err) {
    console.error('Falha ao persistir relatório de migração no localStorage:', err);
  }
}

export function getLastMigrationReport(): MigrationExecutionReport | null {
  try {
    const raw = localStorage.getItem(LAST_MIGRATION_REPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MigrationExecutionReport;
  } catch (err) {
    console.error('Falha ao ler relatório de migração do localStorage:', err);
    return null;
  }
}

export function clearLastMigrationReport(): void {
  try {
    localStorage.removeItem(LAST_MIGRATION_REPORT_KEY);
  } catch (err) {
    console.error('Falha ao limpar relatório de migração do localStorage:', err);
  }
}

