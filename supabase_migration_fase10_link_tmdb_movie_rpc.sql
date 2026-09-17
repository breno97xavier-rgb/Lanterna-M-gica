-- ==============================================================================
-- LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
-- RPC Transacional de Reconciliação / Vinculação Segura de Filme Local ao TMDB (F10.3H)
-- Arquivo: supabase_migration_fase10_link_tmdb_movie_rpc.sql
--
-- Regras de Segurança e Governança:
-- 1. Execução exclusiva por administradores autenticados (public.is_admin()).
-- 2. Bloqueio pessimista de linha (FOR UPDATE) evitando concorrência.
-- 3. Confirmação estrita de tmdb_id IS NULL no registro local de destino.
-- 4. Barreira anti-duplicação: impede vínculo se p_tmdb_id já estiver em uso.
-- 5. Preservação Absoluta: NENHUM metadado editorial é alterado.
-- 6. Semântica F9: tmdb_synced_at PERMANECE NULL (pois não é ingestão factual).
-- 7. Auditoria Transacional: Registro imutável em public.tmdb_sync_logs (operation='LINK').
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.link_tmdb_movie_existing(
  p_internal_film_id UUID,
  p_tmdb_id INTEGER,
  p_sync_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_film RECORD;
  v_conflict_film RECORD;
  v_is_adm BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := pg_catalog.timezone('utc'::text, pg_catalog.now());
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. VALIDAÇÃO DE AUTORIZAÇÃO ADMINISTRATIVA (SECURITY DEFINER + 42501)
  -- --------------------------------------------------------------------------
  SELECT public.is_admin() INTO v_is_adm;
  IF NOT v_is_adm THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores autenticados podem vincular registros ao TMDB.'
      USING ERRCODE = '42501';
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. VALIDAÇÃO DOS PARÂMETROS
  -- --------------------------------------------------------------------------
  IF p_internal_film_id IS NULL THEN
    RAISE EXCEPTION 'O identificador p_internal_film_id é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  IF p_tmdb_id IS NULL OR p_tmdb_id <= 0 THEN
    RAISE EXCEPTION 'O identificador p_tmdb_id deve ser um inteiro positivo.'
      USING ERRCODE = '22023';
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. SERIALIZAÇÃO DE CONCORRÊNCIA POR TMDB_ID (ADVISORY LOCK)
  -- Garante que duas transações tentando atribuir o mesmo tmdb_id a filmes
  -- distintos sejam estritamente serializadas no nível do banco.
  -- --------------------------------------------------------------------------
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('tmdb_movie_link')::bigint,
    p_tmdb_id::bigint
  );

  -- --------------------------------------------------------------------------
  -- 4. BLOQUEIO E VERIFICAÇÃO DO FILME LOCAL (FOR UPDATE)
  -- --------------------------------------------------------------------------
  SELECT id, title, original_title, year, slug, tmdb_id, tmdb_synced_at
  INTO v_film
  FROM public.filmes
  WHERE id = p_internal_film_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Filme local (ID %) não encontrado no acervo.', p_internal_film_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Se o filme já possui tmdb_id
  IF v_film.tmdb_id IS NOT NULL THEN
    IF v_film.tmdb_id = p_tmdb_id THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'alreadyLinked', true,
        'filmId', v_film.id,
        'tmdbId', v_film.tmdb_id,
        'message', 'Filme já vinculado a este TMDB ID.'
      );
    ELSE
      RAISE EXCEPTION 'O filme "%" (ID %) já está vinculado ao TMDB ID %. Não é permitida a alteração de vínculo existente.',
        v_film.title, v_film.id, v_film.tmdb_id
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. VERIFICAÇÃO DE CONFLITO DE TMDB_ID EM OUTROS FILMES
  -- --------------------------------------------------------------------------
  SELECT id, title
  INTO v_conflict_film
  FROM public.filmes
  WHERE tmdb_id = p_tmdb_id
    AND id <> p_internal_film_id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'O TMDB ID % já está em uso pelo filme "%" (ID %). Vínculo duplicado impedido.',
      p_tmdb_id, v_conflict_film.title, v_conflict_film.id
      USING ERRCODE = '23505';
  END IF;

  -- --------------------------------------------------------------------------
  -- 6. ATUALIZAÇÃO RESTRITA: SOMENTE tmdb_id
  -- Preservação absoluta de todos os metadados editoriais locais.
  -- tmdb_synced_at permanece NULL conforme diretrizes da Fase 9 e 10.3H.
  -- --------------------------------------------------------------------------
  UPDATE public.filmes
  SET tmdb_id = p_tmdb_id
  WHERE id = p_internal_film_id
    AND tmdb_id IS NULL;

  -- --------------------------------------------------------------------------
  -- 7. AUDITORIA TRANSACIONAL (public.tmdb_sync_logs)
  -- --------------------------------------------------------------------------
  INSERT INTO public.tmdb_sync_logs (
    entity_type,
    internal_id,
    tmdb_id,
    operation,
    source,
    status,
    details,
    error_message,
    created_at
  ) VALUES (
    'filme',
    p_internal_film_id,
    p_tmdb_id,
    'LINK',
    'admin',
    'success',
    p_sync_details,
    NULL,
    v_now
  );

  -- --------------------------------------------------------------------------
  -- 8. RETORNO ESTRUTURADO
  -- --------------------------------------------------------------------------
  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'alreadyLinked', false,
    'filmId', p_internal_film_id,
    'tmdbId', p_tmdb_id,
    'message', 'Filme vinculado com sucesso ao TMDB!'
  );
END;
$$;

-- Permissões de execução
REVOKE ALL ON FUNCTION public.link_tmdb_movie_existing(UUID, INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_tmdb_movie_existing(UUID, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_tmdb_movie_existing(UUID, INTEGER, JSONB) TO service_role;
