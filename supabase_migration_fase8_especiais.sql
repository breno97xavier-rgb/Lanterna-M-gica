-- ==============================================================================
-- LANTERNA MÁGICA — FASE 8: ESPECIAIS E DOSSIÊS
-- Arquivo: supabase_migration_fase8_especiais.sql
-- 
-- Conteúdo desta migration incremental e idempotente:
-- 1. Criação / reforço defensivo de public.especiais e public.especial_items
-- 2. Criação da tabela relacional de autoria/curadoria: public.especial_authors
-- 3. Índices de alta performance e ausência estrita de índices redundantes (slug)
-- 4. Triggers de atualização automática de updated_at
-- 5. Row Level Security (RLS) seguro com cláusula explícita 'TO authenticated'
-- 6. RPC transacional atômica public.sync_especial_items (com validação pré-DELETE)
-- 7. RPC transacional atômica public.sync_especial_authors (com validação pré-DELETE)
-- 8. Concessão e revogação estrita de privilégios (GRANT / REVOKE)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA PRINCIPAL: public.especiais (DEFENSIVA / IDEMPOTENTE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.especiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL,
  intro TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  related_person_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  highlight_home BOOLEAN DEFAULT false NOT NULL,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. TABELA ASSOCIATIVA POLIMÓRFICA: public.especial_items (DEFENSIVA / IDEMPOTENTE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.especial_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  especial_id UUID NOT NULL REFERENCES public.especiais(id) ON DELETE CASCADE,
  item_type special_item_type NOT NULL,
  ensaio_id UUID REFERENCES public.ensaios(id) ON DELETE CASCADE,
  critica_id UUID REFERENCES public.criticas(id) ON DELETE CASCADE,
  lista_id UUID REFERENCES public.listas(id) ON DELETE CASCADE,
  uma_imagem_id UUID REFERENCES public.uma_imagem(id) ON DELETE CASCADE,
  filme_id UUID REFERENCES public.filmes(id) ON DELETE CASCADE,
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE CASCADE,
  custom_label TEXT,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_special_item_single_fk CHECK (
    (item_type = 'ensaio' AND ensaio_id IS NOT NULL AND critica_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'critica' AND critica_id IS NOT NULL AND ensaio_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'lista' AND lista_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'uma_imagem' AND uma_imagem_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND lista_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'filme' AND filme_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'pessoa' AND pessoa_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL)
  )
);

-- ------------------------------------------------------------------------------
-- 3. TABELA DE AUTORIA / CURADORIA: public.especial_authors
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.especial_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  especial_id UUID NOT NULL REFERENCES public.especiais(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  role_name TEXT NOT NULL DEFAULT 'Curadoria',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_especial_author_member_role UNIQUE (especial_id, member_id, role_name)
);

-- ------------------------------------------------------------------------------
-- 4. ÍNDICES DE ALTA PERFORMANCE (SEM ÍNDICES REDUNDANTES EM SLUG)
-- ------------------------------------------------------------------------------
-- Especiais: status, ordenação cronológica e publicação
CREATE INDEX IF NOT EXISTS idx_especiais_status_published
  ON public.especiais (status, published_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_especiais_scheduled
  ON public.especiais (scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_especiais_highlight_home
  ON public.especiais (highlight_home)
  WHERE highlight_home = true;

CREATE INDEX IF NOT EXISTS idx_especiais_related_person
  ON public.especiais (related_person_id)
  WHERE related_person_id IS NOT NULL;

-- Itens do Especial: busca por especial e ordenação
CREATE INDEX IF NOT EXISTS idx_especial_items_especial_order
  ON public.especial_items (especial_id, order_index);

CREATE INDEX IF NOT EXISTS idx_especial_items_ensaio
  ON public.especial_items (ensaio_id)
  WHERE ensaio_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_especial_items_critica
  ON public.especial_items (critica_id)
  WHERE critica_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_especial_items_filme
  ON public.especial_items (filme_id)
  WHERE filme_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_especial_items_pessoa
  ON public.especial_items (pessoa_id)
  WHERE pessoa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_especial_items_uma_imagem
  ON public.especial_items (uma_imagem_id)
  WHERE uma_imagem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_especial_items_lista
  ON public.especial_items (lista_id)
  WHERE lista_id IS NOT NULL;

-- Autoria em Especiais
CREATE INDEX IF NOT EXISTS idx_especial_authors_especial
  ON public.especial_authors (especial_id, order_index);

CREATE INDEX IF NOT EXISTS idx_especial_authors_member
  ON public.especial_authors (member_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER DE updated_at EM public.especiais
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_especiais_updated_at') THEN
    CREATE TRIGGER trg_especiais_updated_at
      BEFORE UPDATE ON public.especiais
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.especiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especial_authors ENABLE ROW LEVEL SECURITY;

-- 6.1 POLICIES PARA public.especiais
DROP POLICY IF EXISTS "Public read published or scheduled especiais" ON public.especiais;
CREATE POLICY "Public read published or scheduled especiais" ON public.especiais
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

DROP POLICY IF EXISTS "Admin read all especiais" ON public.especiais;
CREATE POLICY "Admin read all especiais" ON public.especiais
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only write especiais" ON public.especiais;
CREATE POLICY "Admin only write especiais" ON public.especiais
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.2 POLICIES PARA public.especial_items
DROP POLICY IF EXISTS "Public read published or scheduled especial_items" ON public.especial_items;
CREATE POLICY "Public read published or scheduled especial_items" ON public.especial_items
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.especiais e
      WHERE e.id = especial_items.especial_id
        AND (
          (e.status = 'published' AND (e.published_at IS NULL OR e.published_at <= timezone('utc'::text, now()))) OR
          (e.status = 'scheduled' AND e.scheduled_at IS NOT NULL AND e.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

DROP POLICY IF EXISTS "Admin read all especial_items" ON public.especial_items;
CREATE POLICY "Admin read all especial_items" ON public.especial_items
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only write especial_items" ON public.especial_items;
CREATE POLICY "Admin only write especial_items" ON public.especial_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.3 POLICIES PARA public.especial_authors
DROP POLICY IF EXISTS "Public read published or scheduled especial_authors" ON public.especial_authors;
CREATE POLICY "Public read published or scheduled especial_authors" ON public.especial_authors
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.especiais e
      WHERE e.id = especial_authors.especial_id
        AND (
          (e.status = 'published' AND (e.published_at IS NULL OR e.published_at <= timezone('utc'::text, now()))) OR
          (e.status = 'scheduled' AND e.scheduled_at IS NOT NULL AND e.scheduled_at <= timezone('utc'::text, now()))
        )
    )
    AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = especial_authors.member_id
        AND tm.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admin read all especial_authors" ON public.especial_authors;
CREATE POLICY "Admin read all especial_authors" ON public.especial_authors
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only write especial_authors" ON public.especial_authors;
CREATE POLICY "Admin only write especial_authors" ON public.especial_authors
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. RPC: public.sync_especial_items (TRANSAÇÃO ATÔMICA E VALIDAÇÃO PRÉVIA)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_especial_items(
  p_especial_id UUID,
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
  v_item_type TEXT;
  v_target_id_text TEXT;
  v_target_id UUID;
  v_custom_label TEXT;
  v_order_index INTEGER;
  v_idx INTEGER := 0;
BEGIN
  -- 1. Verificação estrita de privilégios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerenciar itens de Especiais.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do registro pai
  IF p_especial_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.especiais WHERE id = p_especial_id
  ) THEN
    RAISE EXCEPTION 'Especial com ID % não foi encontrado.', p_especial_id
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

  -- 4. Validação estrita de cada elemento do payload ANTES de executar qualquer DELETE
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_normalized_items)
  LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Elemento de item inválido no payload: esperado um objeto JSON.'
        USING ERRCODE = '22023';
    END IF;

    -- Validar item_type
    v_item_type := TRIM(LOWER(COALESCE(v_elem->>'item_type', '')));
    IF v_item_type NOT IN ('ensaio', 'critica', 'lista', 'uma_imagem', 'filme', 'pessoa') THEN
      RAISE EXCEPTION 'Tipo de item inválido "%": deve ser ensaio, critica, lista, uma_imagem, filme ou pessoa.', v_item_type
        USING ERRCODE = '22023';
    END IF;

    -- Extrair o target_id de forma flexível (item_id, target_id ou chave específica correspondente)
    v_target_id_text := TRIM(COALESCE(
      v_elem->>'item_id',
      v_elem->>'target_id',
      v_elem->>(v_item_type || '_id'),
      ''
    ));

    IF v_target_id_text = '' OR v_target_id_text IS NULL THEN
      RAISE EXCEPTION 'Elemento de item inválido para "%": ID da entidade referenciada não pode ser nulo ou vazio.', v_item_type
        USING ERRCODE = '22023';
    END IF;

    -- Validação de formato UUID
    IF v_target_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Elemento de item inválido: ID "%" não é um UUID válido.', v_target_id_text
        USING ERRCODE = '22023';
    END IF;

    v_target_id := v_target_id_text::uuid;

    -- Validação de existência da entidade referenciada no banco
    IF v_item_type = 'ensaio' THEN
      IF NOT EXISTS (SELECT 1 FROM public.ensaios WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Ensaio referenciado com ID "%" não existe.', v_target_id_text
          USING ERRCODE = '23503';
      END IF;
    ELSIF v_item_type = 'critica' THEN
      IF NOT EXISTS (SELECT 1 FROM public.criticas WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Crítica referenciada com ID "%" não existe.', v_target_id_text
          USING ERRCODE = '23503';
      END IF;
    ELSIF v_item_type = 'lista' THEN
      IF NOT EXISTS (SELECT 1 FROM public.listas WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Lista referenciada com ID "%" não existe.', v_target_id_text
          USING ERRCODE = '23503';
      END IF;
    ELSIF v_item_type = 'uma_imagem' THEN
      IF NOT EXISTS (SELECT 1 FROM public.uma_imagem WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Publicação de Uma Imagem com ID "%" não existe.', v_target_id_text
          USING ERRCODE = '23503';
      END IF;
    ELSIF v_item_type = 'filme' THEN
      IF NOT EXISTS (SELECT 1 FROM public.filmes WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Filme referenciado com ID "%" não existe.', v_target_id_text
          USING ERRCODE = '23503';
      END IF;
    ELSIF v_item_type = 'pessoa' THEN
      IF NOT EXISTS (SELECT 1 FROM public.pessoas WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Pessoa referenciada com ID "%" não existe.', v_target_id_text
          USING ERRCODE = '23503';
      END IF;
    END IF;
  END LOOP;

  -- 5. Exclusão dos vínculos anteriores (em transação atômica, apenas após validação de todo o payload)
  DELETE FROM public.especial_items
  WHERE especial_id = p_especial_id;

  -- 6. Inserção dos novos vínculos se o array não for vazio
  IF jsonb_array_length(v_normalized_items) > 0 THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_normalized_items)
    LOOP
      v_item_type := TRIM(LOWER(v_elem->>'item_type'));
      v_target_id := (TRIM(COALESCE(
        v_elem->>'item_id',
        v_elem->>'target_id',
        v_elem->>(v_item_type || '_id')
      )))::uuid;
      
      v_custom_label := NULLIF(TRIM(COALESCE(v_elem->>'custom_label', '')), '');
      v_order_index := COALESCE((v_elem->>'order_index')::integer, v_idx);

      INSERT INTO public.especial_items (
        especial_id,
        item_type,
        ensaio_id,
        critica_id,
        lista_id,
        uma_imagem_id,
        filme_id,
        pessoa_id,
        custom_label,
        order_index
      ) VALUES (
        p_especial_id,
        v_item_type::special_item_type,
        CASE WHEN v_item_type = 'ensaio' THEN v_target_id ELSE NULL END,
        CASE WHEN v_item_type = 'critica' THEN v_target_id ELSE NULL END,
        CASE WHEN v_item_type = 'lista' THEN v_target_id ELSE NULL END,
        CASE WHEN v_item_type = 'uma_imagem' THEN v_target_id ELSE NULL END,
        CASE WHEN v_item_type = 'filme' THEN v_target_id ELSE NULL END,
        CASE WHEN v_item_type = 'pessoa' THEN v_target_id ELSE NULL END,
        v_custom_label,
        v_order_index
      );

      v_idx := v_idx + 1;
    END LOOP;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. RPC: public.sync_especial_authors (TRANSAÇÃO ATÔMICA E AUTORIA EDITORIAL)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_especial_authors(
  p_especial_id UUID,
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
  v_member_id UUID;
BEGIN
  -- 1. Verificação estrita de privilégios de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar a autoria/curadoria do Especial.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação do registro pai
  IF p_especial_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.especiais WHERE id = p_especial_id
  ) THEN
    RAISE EXCEPTION 'Especial com ID % não foi encontrado.', p_especial_id
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

  -- 4. Validação estrita de cada elemento do payload ANTES de executar qualquer DELETE
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

    v_member_id := v_member_id_text::uuid;

    -- Validação de existência do integrante da equipe
    IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE id = v_member_id) THEN
      RAISE EXCEPTION 'Integrante da equipe com ID "%" não existe.', v_member_id_text
        USING ERRCODE = '23503';
    END IF;
  END LOOP;

  -- 5. Exclusão dos créditos anteriores (em transação, apenas após validações completas)
  DELETE FROM public.especial_authors
  WHERE especial_id = p_especial_id;

  -- 6. Inserção dos novos créditos se o array não for vazio
  IF jsonb_array_length(v_normalized_authors) > 0 THEN
    INSERT INTO public.especial_authors (
      especial_id,
      member_id,
      role_name,
      order_index
    )
    SELECT
      p_especial_id,
      (elem->>'member_id')::uuid,
      COALESCE(NULLIF(TRIM(elem->>'role_name'), ''), 'Curadoria'),
      COALESCE((elem->>'order_index')::integer, ord - 1)
    FROM jsonb_array_elements(v_normalized_authors) WITH ORDINALITY AS t(elem, ord)
    ON CONFLICT (especial_id, member_id, role_name) DO UPDATE
      SET order_index = EXCLUDED.order_index;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. CONTROLE DE ACESSO E PERMISSÕES (GRANTS E REVOKES)
-- ------------------------------------------------------------------------------
-- Permissões de Leitura Pública para anon e authenticated
GRANT SELECT ON TABLE public.especiais TO anon, authenticated;
GRANT SELECT ON TABLE public.especial_items TO anon, authenticated;
GRANT SELECT ON TABLE public.especial_authors TO anon, authenticated;

-- Permissões de Gestão (CMS) para authenticated (filtradas por RLS / is_admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.especiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.especial_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.especial_authors TO authenticated;

-- Permissões das RPCs transacionais
REVOKE ALL ON FUNCTION public.sync_especial_items(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_especial_items(UUID, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_especial_authors(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_especial_authors(UUID, JSONB) TO authenticated;
