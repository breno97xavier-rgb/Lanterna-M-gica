-- ==============================================================================
-- LANTERNA MÁGICA — FASE 9: FUNDAÇÃO TMDB E MIGRAÇÃO SEGURA
-- Script de Rollback Cirúrgico: Etapa F9.2
-- Arquivo: supabase_rollback_fase9_tmdb_foundation.sql
--
-- Objetivo:
-- Reverter estritamente as alterações adicionadas pela migração F9.2,
-- SEM tocar em nenhum dado editorial, IDs, slugs, foreign keys ou tabelas anteriores.
-- ==============================================================================

-- 1. Remoção da tabela de auditoria e logs
DROP TABLE IF EXISTS public.tmdb_sync_logs CASCADE;

-- 2. Remoção dos índices criados na F9.2
DROP INDEX IF EXISTS public.idx_filmes_tmdb_id;
DROP INDEX IF EXISTS public.idx_pessoas_tmdb_id;
DROP INDEX IF EXISTS public.idx_filmes_imdb_id;
DROP INDEX IF EXISTS public.idx_pessoas_imdb_id;

-- 3. Remoção cirúrgica das colunas auxiliares em public.filmes
ALTER TABLE public.filmes 
  DROP COLUMN IF EXISTS tmdb_id,
  DROP COLUMN IF EXISTS tmdb_synced_at,
  DROP COLUMN IF EXISTS original_language,
  DROP COLUMN IF EXISTS imdb_id;

-- 4. Remoção cirúrgica das colunas auxiliares em public.pessoas
ALTER TABLE public.pessoas 
  DROP COLUMN IF EXISTS tmdb_id,
  DROP COLUMN IF EXISTS tmdb_synced_at,
  DROP COLUMN IF EXISTS imdb_id;
