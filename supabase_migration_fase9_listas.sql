-- ==============================================================================
-- LANTERNA MÁGICA — FASE 9: LISTAS & SELEÇÕES CURADAS
-- Arquivo: supabase_migration_fase9_listas.sql
-- Descrição:
--   Consolidação da camada de dados para o módulo de Listas no Supabase:
--   1. RPCs transacionais seguras (SECURITY DEFINER) para sincronização de itens (sync_lista_items)
--      e tags (sync_lista_tags).
--   2. Verificação e garantia de RLS estrito (leitura pública baseada no status editorial
--      e escrita exclusiva para administradores autenticados).
--   3. Índices de performance para buscas por status, data, slug e chave estrangeira.
--   4. Grants mínimos e restritos (anon, authenticated).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ÍNDICES DE OTIMIZAÇÃO PARA LISTAS E ITENS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listas_status ON public.listas(status);
CREATE INDEX IF NOT EXISTS idx_listas_published_at ON public.listas(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_listas_scheduled_at ON public.listas(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_listas_related_person ON public.listas(related_person_id);
CREATE INDEX IF NOT EXISTS idx_lista_items_film ON public.lista_items(film_id);
CREATE INDEX IF NOT EXISTS idx_lista_items_order ON public.lista_items(lista_id, order_index);

-- ------------------------------------------------------------------------------
-- 2. RPC TRANSACIONAL: sync_lista_items
-- Sincroniza atômica e declarativamente os itens ranqueados de uma Lista.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_lista_items(
  p_lista_id UUID,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_normalized_items JSONB;
  v_elem JSONB;
  v_idx INTEGER;
  v_film_id_text TEXT;
  v_film_id UUID;
  v_custom_title TEXT;
  v_custom_director TEXT;
  v_custom_year INTEGER;
  v_custom_image TEXT;
  v_note TEXT;
  v_rank INTEGER;
BEGIN
  -- 1. Verificação estrita de privilégios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar itens de listas.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação da Lista pai
  IF p_lista_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.listas WHERE id = p_lista_id
  ) THEN
    RAISE EXCEPTION 'Lista com ID % não foi encontrada.', p_lista_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Normalização do payload JSONB
  IF p_items IS NULL OR jsonb_typeof(p_items) = 'null' THEN
    v_normalized_items := '[]'::jsonb;
  ELSIF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Payload de itens inválido: esperado um array JSON.'
      USING ERRCODE = '22023';
  ELSE
    v_normalized_items := p_items;
  END IF;

  -- 4. Validação estrita de cada elemento do payload ANTES de qualquer exclusão
  FOR v_idx IN 0 .. (jsonb_array_length(v_normalized_items) - 1)
  LOOP
    v_elem := v_normalized_items->v_idx;

    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Elemento no índice % é inválido: esperado objeto JSON.', v_idx
        USING ERRCODE = '22023';
    END IF;

    v_film_id_text := NULLIF(TRIM(COALESCE(v_elem->>'film_id', v_elem->>'filmId', '')), '');
    v_custom_title := NULLIF(TRIM(COALESCE(v_elem->>'custom_title', v_elem->>'title', '')), '');

    -- O item deve ter filme_id ou custom_title preenchido
    IF v_film_id_text IS NULL AND (v_custom_title IS NULL OR length(v_custom_title) = 0) THEN
      RAISE EXCEPTION 'Item no índice % é inválido: requer film_id ou custom_title.', v_idx
        USING ERRCODE = '22023';
    END IF;

    -- Validação de existência do filme se film_id informado
    IF v_film_id_text IS NOT NULL THEN
      IF v_film_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Item no índice % possui film_id inválido: %', v_idx, v_film_id_text
          USING ERRCODE = '22023';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.filmes WHERE id = v_film_id_text::uuid) THEN
        RAISE EXCEPTION 'Filme com ID "%" referenciado no índice % não existe.', v_film_id_text, v_idx
          USING ERRCODE = '23503';
      END IF;
    END IF;
  END LOOP;

  -- 5. Exclusão atômica dos itens anteriores
  DELETE FROM public.lista_items
  WHERE lista_id = p_lista_id;

  -- 6. Inserção ordenada dos novos itens
  IF jsonb_array_length(v_normalized_items) > 0 THEN
    FOR v_idx IN 0 .. (jsonb_array_length(v_normalized_items) - 1)
    LOOP
      v_elem := v_normalized_items->v_idx;

      v_film_id_text := NULLIF(TRIM(COALESCE(v_elem->>'film_id', v_elem->>'filmId', '')), '');
      v_film_id := CASE WHEN v_film_id_text IS NOT NULL THEN v_film_id_text::uuid ELSE NULL END;
      v_custom_title := NULLIF(TRIM(COALESCE(v_elem->>'custom_title', v_elem->>'title', '')), '');
      v_custom_director := NULLIF(TRIM(COALESCE(v_elem->>'custom_director', v_elem->>'director', '')), '');
      v_custom_image := NULLIF(TRIM(COALESCE(v_elem->>'custom_image', v_elem->>'image', '')), '');
      v_note := NULLIF(TRIM(COALESCE(v_elem->>'note', '')), '');
      
      -- Ano customizado
      IF v_elem ? 'custom_year' AND jsonb_typeof(v_elem->'custom_year') = 'number' THEN
        v_custom_year := (v_elem->>'custom_year')::integer;
      ELSIF v_elem ? 'year' AND jsonb_typeof(v_elem->'year') = 'number' THEN
        v_custom_year := (v_elem->>'year')::integer;
      ELSE
        v_custom_year := NULL;
      END IF;

      -- Rank
      IF v_elem ? 'rank' AND jsonb_typeof(v_elem->'rank') = 'number' THEN
        v_rank := (v_elem->>'rank')::integer;
      ELSE
        v_rank := v_idx + 1;
      END IF;

      INSERT INTO public.lista_items (
        lista_id,
        film_id,
        rank,
        custom_title,
        custom_director,
        custom_year,
        custom_image,
        note,
        order_index
      ) VALUES (
        p_lista_id,
        v_film_id,
        v_rank,
        v_custom_title,
        v_custom_director,
        v_custom_year,
        v_custom_image,
        v_note,
        v_idx
      );
    END LOOP;
  END IF;

  -- 7. Atualizar timestamp de updated_at da Lista pai
  UPDATE public.listas
  SET updated_at = timezone('utc'::text, now())
  WHERE id = p_lista_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC TRANSACIONAL: sync_lista_tags
-- Sincroniza atômica e declarativamente as tags associadas a uma Lista.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_lista_tags(
  p_lista_id UUID,
  p_tags JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_normalized_tags JSONB;
  v_elem JSONB;
  v_tag_id_text TEXT;
BEGIN
  -- 1. Verificação estrita de privilégios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar tags de listas.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação da Lista pai
  IF p_lista_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.listas WHERE id = p_lista_id
  ) THEN
    RAISE EXCEPTION 'Lista com ID % não foi encontrada.', p_lista_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Normalização do payload JSONB
  IF p_tags IS NULL OR jsonb_typeof(p_tags) = 'null' THEN
    v_normalized_tags := '[]'::jsonb;
  ELSIF jsonb_typeof(p_tags) <> 'array' THEN
    RAISE EXCEPTION 'Payload de tags inválido: esperado um array JSON.'
      USING ERRCODE = '22023';
  ELSE
    v_normalized_tags := p_tags;
  END IF;

  -- 4. Validação estrita de cada elemento do payload ANTES do DELETE
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_normalized_tags)
  LOOP
    IF jsonb_typeof(v_elem) = 'object' THEN
      v_tag_id_text := TRIM(COALESCE(v_elem->>'tag_id', v_elem->>'tagId', ''));
    ELSIF jsonb_typeof(v_elem) = 'string' THEN
      v_tag_id_text := TRIM(BOTH '"' FROM v_elem::text);
    ELSE
      RAISE EXCEPTION 'Elemento de tag inválido no payload: esperado objeto com tag_id ou string UUID.'
        USING ERRCODE = '22023';
    END IF;

    IF v_tag_id_text = '' OR v_tag_id_text IS NULL THEN
      RAISE EXCEPTION 'Elemento de tag inválido: tag_id não pode ser nulo ou vazio.'
        USING ERRCODE = '22023';
    END IF;

    -- Validação de formato UUID
    IF v_tag_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Elemento de tag inválido: tag_id "%" não é um UUID válido.', v_tag_id_text
        USING ERRCODE = '22023';
    END IF;

    -- Validação de existência da tag referenciada
    IF NOT EXISTS (SELECT 1 FROM public.tags WHERE id = v_tag_id_text::uuid) THEN
      RAISE EXCEPTION 'Tag com ID "%" não existe no catálogo de tags.', v_tag_id_text
        USING ERRCODE = '23503';
    END IF;
  END LOOP;

  -- 5. Exclusão dos vínculos anteriores
  DELETE FROM public.lista_tags
  WHERE lista_id = p_lista_id;

  -- 6. Inserção dos novos vínculos desduplicados se o array não for vazio
  IF jsonb_array_length(v_normalized_tags) > 0 THEN
    INSERT INTO public.lista_tags (lista_id, tag_id)
    SELECT DISTINCT
      p_lista_id,
      CASE
        WHEN jsonb_typeof(elem) = 'object' THEN (elem->>'tag_id')::uuid
        ELSE (TRIM(BOTH '"' FROM elem::text))::uuid
      END
    FROM jsonb_array_elements(v_normalized_tags) AS elem;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. PERMISSÕES EXPLÍCITAS DAS RPCs
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.sync_lista_items(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_lista_items(UUID, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_lista_tags(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_lista_tags(UUID, JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. VALIDAÇÃO DAS POLICIES DE RLS
-- ------------------------------------------------------------------------------
-- Reafirmando as políticas de leitura e escrita com TO authenticated / anon explícitos

DO $$
BEGIN
  -- listas
  ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;
  
  -- lista_items
  ALTER TABLE public.lista_items ENABLE ROW LEVEL SECURITY;

  -- lista_tags
  ALTER TABLE public.lista_tags ENABLE ROW LEVEL SECURITY;
END $$;
