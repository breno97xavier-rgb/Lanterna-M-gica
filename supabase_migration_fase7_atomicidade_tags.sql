-- ==============================================================================
-- LANTERNA MÁGICA — FASE 7 (ETAPA 5): ATOMICIDADE DE TAGS EM UMA IMAGEM
-- 
-- Arquivo: supabase_migration_fase7_atomicidade_tags.sql
-- Descrição:
--   RPC transacional e segura para sincronização atômica de tags associadas a
--   publicações de "Uma Imagem, Uma Ideia" (public.uma_imagem_tags).
--
-- Requisitos atendidos:
--   1. Operação atômica (transacional) via SECURITY DEFINER.
--   2. Verificação estrita de privilégios de administrador (public.is_admin()).
--   3. Validação prévia de existência da publicação e de cada tag antes de executar DELETE.
--   4. Validação estrita de formato UUID em cada elemento.
--   5. Suporte a payload vazio/null para desvincular todas as tags com segurança.
--   6. Desduplicação idempotente de tags no payload.
--   7. Rollback automático em caso de falha em qualquer validação ou inserção.
--   8. Permissões restritas: REVOKE de anon e PUBLIC, GRANT exclusivo para authenticated.
--   9. Confirmação de RLS com 'TO authenticated' para escrita administrativa.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RPC: sync_uma_imagem_tags
-- Sincroniza atômica e declarativamente as tags de uma publicação de Uma Imagem.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_uma_imagem_tags(
  p_uma_imagem_id UUID,
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
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar tags de Uma Imagem.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do registro pai
  IF p_uma_imagem_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.uma_imagem WHERE id = p_uma_imagem_id
  ) THEN
    RAISE EXCEPTION 'Registro de Uma Imagem com ID % não foi encontrado.', p_uma_imagem_id
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
      v_tag_id_text := TRIM(COALESCE(v_elem->>'tag_id', ''));
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

  -- 5. Exclusão dos vínculos anteriores (em transação atômica, somente após validação completa)
  DELETE FROM public.uma_imagem_tags
  WHERE uma_imagem_id = p_uma_imagem_id;

  -- 6. Inserção dos novos vínculos desduplicados se o array não for vazio
  IF jsonb_array_length(v_normalized_tags) > 0 THEN
    INSERT INTO public.uma_imagem_tags (
      uma_imagem_id,
      tag_id
    )
    SELECT DISTINCT
      p_uma_imagem_id,
      CASE 
        WHEN jsonb_typeof(elem) = 'object' THEN (elem->>'tag_id')::uuid
        ELSE TRIM(BOTH '"' FROM elem::text)::uuid
      END
    FROM jsonb_array_elements(v_normalized_tags) AS elem
    ON CONFLICT (uma_imagem_id, tag_id) DO NOTHING;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. CONTROLE DE ACESSO E PERMISSÕES DA RPC
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.sync_uma_imagem_tags(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_uma_imagem_tags(UUID, JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. AUDITORIA E REFORÇO DE RLS EM public.uma_imagem_tags (IDEMPOTENTE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.uma_imagem_tags ENABLE ROW LEVEL SECURITY;

-- Leitura pública segura (sem chamada a is_admin())
DROP POLICY IF EXISTS "Public read published or scheduled uma_imagem_tags" ON public.uma_imagem_tags;
CREATE POLICY "Public read published or scheduled uma_imagem_tags" ON public.uma_imagem_tags
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.uma_imagem u
      WHERE u.id = uma_imagem_tags.uma_imagem_id
        AND (
          (u.status = 'published' AND (u.published_at IS NULL OR u.published_at <= timezone('utc'::text, now()))) OR
          (u.status = 'scheduled' AND u.scheduled_at IS NOT NULL AND u.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

-- Leitura administrativa com restrição explícita TO authenticated
DROP POLICY IF EXISTS "Admin read all uma_imagem_tags" ON public.uma_imagem_tags;
CREATE POLICY "Admin read all uma_imagem_tags" ON public.uma_imagem_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Escrita administrativa com restrição explícita TO authenticated
DROP POLICY IF EXISTS "Admin only write uma_imagem_tags" ON public.uma_imagem_tags;
CREATE POLICY "Admin only write uma_imagem_tags" ON public.uma_imagem_tags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
