-- ==============================================================================
-- LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
-- Script de Rollback: RPC de Importação de Filmes TMDB (F10.3D)
-- Arquivo: supabase_rollback_fase10_import_tmdb_movie_rpc_final.sql
-- ==============================================================================

-- Remove a RPC transacional de importação atômica
DROP FUNCTION IF EXISTS public.import_tmdb_movie_atomic(
  INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB
);

-- Remove a função transliteradora auxiliar
DROP FUNCTION IF EXISTS public.transliterate_slug(TEXT);
