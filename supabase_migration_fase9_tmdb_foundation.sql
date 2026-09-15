-- ==============================================================================
-- LANTERNA MÁGICA — FASE 9: FUNDAÇÃO TMDB E MIGRAÇÃO SEGURA
-- Etapa: F9.2 — Estratégia de Schema, Preservação e Rollback
-- Arquivo: supabase_migration_fase9_tmdb_foundation.sql
--
-- Princípios e Diretrizes:
-- 1. 100% Não-Destrutivo: Preserva todos os UUIDs, slugs, legacy_ids e vínculos relacionais.
-- 2. Identidade TMDB Auxiliar: O UUID interno permanece como identidade canônica primária.
-- 3. Idempotente: Executável múltiplas vezes sem efeitos colaterais.
-- 4. Constraints Defensivas: Índices únicos parciais (WHERE tmdb_id IS NOT NULL).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CAMPOS INCREMENTAIS EM public.filmes
-- ------------------------------------------------------------------------------
ALTER TABLE public.filmes 
  ADD COLUMN IF NOT EXISTS tmdb_id INTEGER,
  ADD COLUMN IF NOT EXISTS tmdb_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_language TEXT,
  ADD COLUMN IF NOT EXISTS imdb_id TEXT;

-- ------------------------------------------------------------------------------
-- 2. CAMPOS INCREMENTAIS EM public.pessoas
-- ------------------------------------------------------------------------------
ALTER TABLE public.pessoas 
  ADD COLUMN IF NOT EXISTS tmdb_id INTEGER,
  ADD COLUMN IF NOT EXISTS tmdb_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS imdb_id TEXT;

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES ÚNICOS PARCIAIS E DE CONSULTA (IDEMPOTENTES)
-- ------------------------------------------------------------------------------
-- Impede que duas obras locais apontem para o mesmo tmdb_id, mas permite múltiplos NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_filmes_tmdb_id 
  ON public.filmes(tmdb_id) 
  WHERE tmdb_id IS NOT NULL;

-- Impede que duas pessoas locais apontem para o mesmo tmdb_id, mas permite múltiplos NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_tmdb_id 
  ON public.pessoas(tmdb_id) 
  WHERE tmdb_id IS NOT NULL;

-- Índices auxiliares para consultas cruzadas e matching por IMDB
CREATE INDEX IF NOT EXISTS idx_filmes_imdb_id 
  ON public.filmes(imdb_id) 
  WHERE imdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pessoas_imdb_id 
  ON public.pessoas(imdb_id) 
  WHERE imdb_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. TABELA DE AUDITORIA E LOGS: public.tmdb_sync_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tmdb_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('filme', 'pessoa')),
  internal_id UUID NOT NULL,
  tmdb_id INTEGER,
  operation TEXT NOT NULL, -- 'match_auto', 'match_manual', 'sync_metadata', 'sync_credits', 'import_new', 'unlink'
  source TEXT NOT NULL DEFAULT 'admin', -- 'admin_panel', 'migration_f9', 'batch_sync', etc.
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error', 'skipped')),
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta para histórico de sincronização
CREATE INDEX IF NOT EXISTS idx_tmdb_sync_logs_entity 
  ON public.tmdb_sync_logs(entity_type, internal_id);

CREATE INDEX IF NOT EXISTS idx_tmdb_sync_logs_tmdb_id 
  ON public.tmdb_sync_logs(tmdb_id) 
  WHERE tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tmdb_sync_logs_created_at 
  ON public.tmdb_sync_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) PARA AUDITORIA
-- ------------------------------------------------------------------------------
ALTER TABLE public.tmdb_sync_logs ENABLE ROW LEVEL SECURITY;

-- Apenas administradores autenticados podem visualizar logs de auditoria
DROP POLICY IF EXISTS "Admin read tmdb_sync_logs" ON public.tmdb_sync_logs;
CREATE POLICY "Admin read tmdb_sync_logs" ON public.tmdb_sync_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Apenas administradores autenticados podem registrar logs
DROP POLICY IF EXISTS "Admin insert tmdb_sync_logs" ON public.tmdb_sync_logs;
CREATE POLICY "Admin insert tmdb_sync_logs" ON public.tmdb_sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. PERMISSÕES E PRIVILÉGIOS (GRANTS RESTRITOS)
-- ------------------------------------------------------------------------------
REVOKE ALL ON TABLE public.tmdb_sync_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.tmdb_sync_logs FROM anon;
GRANT SELECT, INSERT ON TABLE public.tmdb_sync_logs TO authenticated;
