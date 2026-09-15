import { getSupabaseClient } from '../supabaseClient';
import { TmdbSyncLog, TmdbSyncEntityType, TmdbSyncStatus } from '../../types';

export interface CreateTmdbSyncLogInput {
  entityType: TmdbSyncEntityType;
  internalId: string;
  tmdbId?: number | null;
  operation: string;
  source?: string;
  status: TmdbSyncStatus;
  details?: Record<string, any>;
  errorMessage?: string | null;
}

export interface TmdbSyncLogFilters {
  entityType?: TmdbSyncEntityType;
  internalId?: string;
  tmdbId?: number;
  status?: TmdbSyncStatus;
  limit?: number;
}

/**
 * Cria um registro de auditoria para operações de sincronização ou vínculo TMDB
 */
export async function createTmdbSyncLog(
  input: CreateTmdbSyncLogInput
): Promise<{ data: TmdbSyncLog | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error('Supabase client não configurado.') };
  }

  try {
    const payload = {
      entity_type: input.entityType,
      internal_id: input.internalId,
      tmdb_id: input.tmdbId ? Number(input.tmdbId) : null,
      operation: input.operation,
      source: input.source || 'admin',
      status: input.status,
      details: input.details || {},
      error_message: input.errorMessage || null,
    };

    const { data, error } = await supabase
      .from('tmdb_sync_logs')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Falha ao gravar tmdb_sync_log:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return {
      data: {
        id: data.id,
        entityType: data.entity_type,
        internalId: data.internal_id,
        tmdbId: data.tmdb_id,
        operation: data.operation,
        source: data.source,
        status: data.status,
        details: data.details,
        errorMessage: data.error_message,
        createdAt: data.created_at,
      },
      error: null,
    };
  } catch (err: any) {
    console.warn('Exceção ao gravar tmdb_sync_log:', err);
    return { data: null, error: new Error(err.message || 'Erro inesperado ao registrar log TMDB.') };
  }
}

/**
 * Consulta histórico de logs de sincronização TMDB com filtros
 */
export async function fetchTmdbSyncLogs(
  filters: TmdbSyncLogFilters = {}
): Promise<{ data: TmdbSyncLog[]; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: [], error: new Error('Supabase client não configurado.') };
  }

  try {
    let query = supabase
      .from('tmdb_sync_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters.internalId) {
      query = query.eq('internal_id', filters.internalId);
    }
    if (filters.tmdbId) {
      query = query.eq('tmdb_id', filters.tmdbId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const logs: TmdbSyncLog[] = (data || []).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      internalId: row.internal_id,
      tmdbId: row.tmdb_id,
      operation: row.operation,
      source: row.source,
      status: row.status,
      details: row.details,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));

    return { data: logs, error: null };
  } catch (err: any) {
    return { data: [], error: new Error(err.message || 'Erro ao carregar logs TMDB.') };
  }
}
