-- ==============================================================================
-- FASE 6 — ETAPA 2 (COMPLEMENTO): RPCs TRANSACIONAIS DE SINCRONIZAÇÃO
-- Lanterna Mágica CMS - Script de Funções Atômicas no PostgreSQL
-- ==============================================================================
-- Este script define as funções RPC responsáveis pela sincronização atômica de:
-- 1. Funções institucionais de integrantes (public.team_member_roles)
-- 2. Autoria e créditos editoriais de Ensaios (public.ensaio_authors)
-- 3. Autoria e créditos editoriais de Críticas (public.critica_authors)
--
-- SEGURANÇA & INTEGRIDADE:
-- - Execução em SECURITY DEFINER com search_path = pg_catalog, public, pg_temp.
-- - Todas as referências a tabelas e funções são explicitamente qualificadas com schema.
-- - Verificação estrita de privilégios de administrador via public.is_admin().
-- - Validação completa de cada elemento do array JSON ANTES de qualquer DELETE.
-- - Se qualquer item for inválido/nulo ou violar tipagem/constraints, a RPC falha
--   imediatamente e toda a operação sofre ROLLBACK.
-- - Array vazio ('[]'::jsonb) ou NULL é tratado como remoção intencional de vínculos.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RPC: sync_team_member_roles
-- Sincroniza atômica e declarativamente as funções de um integrante da equipe.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_team_member_roles(
  p_member_id UUID,
  p_roles JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_normalized_roles JSONB;
  v_primary_count INTEGER;
  v_elem JSONB;
  v_role_id_text TEXT;
BEGIN
  -- 1. Verificação estrita de privilégios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar funções da equipe.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do registro pai
  IF p_member_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.team_members WHERE id = p_member_id
  ) THEN
    RAISE EXCEPTION 'Integrante da equipe com ID % não foi encontrado.', p_member_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Normalização do payload JSONB
  IF p_roles IS NULL OR jsonb_typeof(p_roles) = 'null' THEN
    v_normalized_roles := '[]'::jsonb;
  ELSIF jsonb_typeof(p_roles) <> 'array' THEN
    RAISE EXCEPTION 'Payload de funções inválido: esperado um array JSON.'
      USING ERRCODE = '22023';
  ELSE
    v_normalized_roles := p_roles;
  END IF;

  -- 4. Validação estrita de cada elemento do payload ANTES do DELETE
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_normalized_roles)
  LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Elemento de função inválido no payload: esperado um objeto JSON.'
        USING ERRCODE = '22023';
    END IF;

    v_role_id_text := TRIM(COALESCE(v_elem->>'role_id', ''));
    IF v_role_id_text = '' OR v_role_id_text IS NULL THEN
      RAISE EXCEPTION 'Elemento de função inválido: role_id não pode ser nulo ou vazio.'
        USING ERRCODE = '22023';
    END IF;

    -- Validação de formato UUID
    IF v_role_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Elemento de função inválido: role_id "%" não é um UUID válido.', v_role_id_text
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- 5. Validação de unicidade de função primária no payload
  SELECT COUNT(*)
  INTO v_primary_count
  FROM jsonb_array_elements(v_normalized_roles) AS elem
  WHERE COALESCE((elem->>'is_primary')::boolean, false) = true;

  IF v_primary_count > 1 THEN
    RAISE EXCEPTION 'Um integrante da equipe pode ter no máximo uma função principal (is_primary).'
      USING ERRCODE = '23514';
  END IF;

  -- 6. Exclusão dos vínculos anteriores (em transação, apenas após todas as validações)
  DELETE FROM public.team_member_roles
  WHERE member_id = p_member_id;

  -- 7. Inserção dos novos vínculos se o array não for vazio
  IF jsonb_array_length(v_normalized_roles) > 0 THEN
    INSERT INTO public.team_member_roles (
      member_id,
      role_id,
      is_primary,
      order_index
    )
    SELECT
      p_member_id,
      (elem->>'role_id')::uuid,
      COALESCE((elem->>'is_primary')::boolean, false),
      COALESCE((elem->>'order_index')::integer, ord - 1)
    FROM jsonb_array_elements(v_normalized_roles) WITH ORDINALITY AS t(elem, ord);
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. RPC: sync_ensaio_authors
-- Sincroniza atômica e declarativamente os créditos de autoria de um Ensaio.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_ensaio_authors(
  p_ensaio_id UUID,
  p_authors JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_normalized_authors JSONB;
  v_elem JSONB;
  v_member_id_text TEXT;
BEGIN
  -- 1. Verificação estrita de privilégios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar a autoria de ensaios.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do registro pai
  IF p_ensaio_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.ensaios WHERE id = p_ensaio_id
  ) THEN
    RAISE EXCEPTION 'Ensaio com ID % não foi encontrado.', p_ensaio_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Normalização do payload JSONB
  IF p_authors IS NULL OR jsonb_typeof(p_authors) = 'null' THEN
    v_normalized_authors := '[]'::jsonb;
  ELSIF jsonb_typeof(p_authors) <> 'array' THEN
    RAISE EXCEPTION 'Payload de autores inválido: esperado um array JSON.'
      USING ERRCODE = '22023';
  ELSE
    v_normalized_authors := p_authors;
  END IF;

  -- 4. Validação estrita de cada elemento do payload ANTES do DELETE
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_normalized_authors)
  LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Elemento de autor inválido no payload: esperado um objeto JSON.'
        USING ERRCODE = '22023';
    END IF;

    v_member_id_text := TRIM(COALESCE(v_elem->>'member_id', ''));
    IF v_member_id_text = '' OR v_member_id_text IS NULL THEN
      RAISE EXCEPTION 'Elemento de autor inválido: member_id não pode ser nulo ou vazio.'
        USING ERRCODE = '22023';
    END IF;

    -- Validação de formato UUID
    IF v_member_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Elemento de autor inválido: member_id "%" não é um UUID válido.', v_member_id_text
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- 5. Exclusão dos créditos anteriores do ensaio (em transação, apenas após validação)
  DELETE FROM public.ensaio_authors
  WHERE ensaio_id = p_ensaio_id;

  -- 6. Inserção dos novos créditos se o array não for vazio
  IF jsonb_array_length(v_normalized_authors) > 0 THEN
    INSERT INTO public.ensaio_authors (
      ensaio_id,
      member_id,
      role_name,
      order_index
    )
    SELECT
      p_ensaio_id,
      (elem->>'member_id')::uuid,
      COALESCE(NULLIF(TRIM(elem->>'role_name'), ''), 'Texto'),
      COALESCE((elem->>'order_index')::integer, ord - 1)
    FROM jsonb_array_elements(v_normalized_authors) WITH ORDINALITY AS t(elem, ord);
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC: sync_critica_authors
-- Sincroniza atômica e declarativamente os créditos de autoria de uma Crítica.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_critica_authors(
  p_critica_id UUID,
  p_authors JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_normalized_authors JSONB;
  v_elem JSONB;
  v_member_id_text TEXT;
BEGIN
  -- 1. Verificação estrita de privilégios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar a autoria de críticas.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do registro pai
  IF p_critica_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.criticas WHERE id = p_critica_id
  ) THEN
    RAISE EXCEPTION 'Crítica com ID % não foi encontrada.', p_critica_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Normalização do payload JSONB
  IF p_authors IS NULL OR jsonb_typeof(p_authors) = 'null' THEN
    v_normalized_authors := '[]'::jsonb;
  ELSIF jsonb_typeof(p_authors) <> 'array' THEN
    RAISE EXCEPTION 'Payload de autores inválido: esperado um array JSON.'
      USING ERRCODE = '22023';
  ELSE
    v_normalized_authors := p_authors;
  END IF;

  -- 4. Validação estrita de cada elemento do payload ANTES do DELETE
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_normalized_authors)
  LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Elemento de autor inválido no payload: esperado um objeto JSON.'
        USING ERRCODE = '22023';
    END IF;

    v_member_id_text := TRIM(COALESCE(v_elem->>'member_id', ''));
    IF v_member_id_text = '' OR v_member_id_text IS NULL THEN
      RAISE EXCEPTION 'Elemento de autor inválido: member_id não pode ser nulo ou vazio.'
        USING ERRCODE = '22023';
    END IF;

    -- Validação de formato UUID
    IF v_member_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Elemento de autor inválido: member_id "%" não é um UUID válido.', v_member_id_text
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- 5. Exclusão dos créditos anteriores da crítica (em transação, apenas após validação)
  DELETE FROM public.critica_authors
  WHERE critica_id = p_critica_id;

  -- 6. Inserção dos novos créditos se o array não for vazio
  IF jsonb_array_length(v_normalized_authors) > 0 THEN
    INSERT INTO public.critica_authors (
      critica_id,
      member_id,
      role_name,
      order_index
    )
    SELECT
      p_critica_id,
      (elem->>'member_id')::uuid,
      COALESCE(NULLIF(TRIM(elem->>'role_name'), ''), 'Crítica'),
      COALESCE((elem->>'order_index')::integer, ord - 1)
    FROM jsonb_array_elements(v_normalized_authors) WITH ORDINALITY AS t(elem, ord);
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. CONTROLE DE ACESSO E PERMISSÕES (GRANTS E REVOKES)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.sync_team_member_roles(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_team_member_roles(UUID, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_ensaio_authors(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_ensaio_authors(UUID, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_critica_authors(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_critica_authors(UUID, JSONB) TO authenticated;
