-- ==============================================================================
-- FASE 7 — ETAPA 1: MIGRATION DO DOMÍNIO "UMA IMAGEM, UMA IDEIA" E AUTORIA
-- Lanterna Mágica CMS - Script de Migração Incremental e Segurança (Idempotente)
-- ==============================================================================
-- Este script realiza de forma estritamente incremental e não-destrutiva:
-- 1. Verificação e garantia de colunas em public.uma_imagem (sem recriação de tabela)
-- 2. Verificação e garantia de estrutura em public.uma_imagem_tags
-- 3. Criação da tabela de autoria editorial public.uma_imagem_authors (com member_id ON DELETE RESTRICT)
-- 4. Criação de índices de alta performance (slug, film_id, person_id, status/datas, destaques)
-- 5. Trigger de atualização de updated_at reutilizando public.update_updated_at_column()
-- 6. Configuração estrita de Row Level Security (RLS):
--    - Leitura pública para anon e authenticated sem chamada a is_admin()
--    - Operações administrativas com chamada a is_admin() restritas explicitamente a authenticated
-- 7. RPC transacional public.sync_uma_imagem_authors com atomicidade, validação prévia e SECURITY DEFINER
-- 8. Concessão de privilégios mínimos e revogação de acessos anônimos a funções restritas
--
-- IMPORTANTE:
-- - NÃO contém dados de teste (seeds) ou importação automática de mocks.
-- - NÃO destrói dados nem recria tabelas pré-existentes.
-- - NÃO altera nem redefine a função global public.is_admin() nem public.update_updated_at_column().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSÕES E TIPOS BASE
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    CREATE TYPE content_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. TABELA PRINCIPAL: public.uma_imagem (Garantia Incremental)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.uma_imagem (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  content TEXT NOT NULL,
  film_id UUID REFERENCES public.filmes(id) ON DELETE SET NULL,
  person_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  highlight_home BOOLEAN DEFAULT false NOT NULL,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir existência de todas as colunas de forma incremental e segura
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS legacy_id TEXT;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS film_id UUID REFERENCES public.filmes(id) ON DELETE SET NULL;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS highlight_home BOOLEAN DEFAULT false;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'published';
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.uma_imagem ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. TABELA ASSOCIATIVA DE TAXONOMIAS: public.uma_imagem_tags
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.uma_imagem_tags (
  uma_imagem_id UUID NOT NULL REFERENCES public.uma_imagem(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (uma_imagem_id, tag_id)
);

-- ------------------------------------------------------------------------------
-- 3. TABELA DE AUTORIA EDITORIAL: public.uma_imagem_authors
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.uma_imagem_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uma_imagem_id UUID NOT NULL REFERENCES public.uma_imagem(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  role_name TEXT NOT NULL DEFAULT 'Texto',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_uma_imagem_authors_member_role UNIQUE (uma_imagem_id, member_id, role_name)
);

-- ------------------------------------------------------------------------------
-- 4. ÍNDICES DE ALTA PERFORMANCE
-- ------------------------------------------------------------------------------
-- Índices para public.uma_imagem
CREATE INDEX IF NOT EXISTS idx_uma_imagem_slug ON public.uma_imagem(slug);
CREATE INDEX IF NOT EXISTS idx_uma_imagem_film_id ON public.uma_imagem(film_id);
CREATE INDEX IF NOT EXISTS idx_uma_imagem_person_id ON public.uma_imagem(person_id);
CREATE INDEX IF NOT EXISTS idx_uma_imagem_status_pub ON public.uma_imagem(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_uma_imagem_scheduled ON public.uma_imagem(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_uma_imagem_highlight ON public.uma_imagem(highlight_home) WHERE highlight_home = true;

-- Índices para public.uma_imagem_tags
CREATE INDEX IF NOT EXISTS idx_uma_imagem_tags_tag ON public.uma_imagem_tags(tag_id);

-- Índices para public.uma_imagem_authors
CREATE INDEX IF NOT EXISTS idx_uma_imagem_authors_item ON public.uma_imagem_authors(uma_imagem_id, order_index);
CREATE INDEX IF NOT EXISTS idx_uma_imagem_authors_member ON public.uma_imagem_authors(member_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- Reutiliza a função global existente public.update_updated_at_column()
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_uma_imagem_updated_at') THEN
    CREATE TRIGGER trg_uma_imagem_updated_at
      BEFORE UPDATE ON public.uma_imagem
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.uma_imagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uma_imagem_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uma_imagem_authors ENABLE ROW LEVEL SECURITY;

-- 6.1 Políticas para public.uma_imagem
DROP POLICY IF EXISTS "Public read published or scheduled uma_imagem" ON public.uma_imagem;
CREATE POLICY "Public read published or scheduled uma_imagem" ON public.uma_imagem
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

DROP POLICY IF EXISTS "Admin read all uma_imagem" ON public.uma_imagem;
CREATE POLICY "Admin read all uma_imagem" ON public.uma_imagem
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only write uma_imagem" ON public.uma_imagem;
CREATE POLICY "Admin only write uma_imagem" ON public.uma_imagem
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.2 Políticas para public.uma_imagem_tags
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

DROP POLICY IF EXISTS "Admin read all uma_imagem_tags" ON public.uma_imagem_tags;
CREATE POLICY "Admin read all uma_imagem_tags" ON public.uma_imagem_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only write uma_imagem_tags" ON public.uma_imagem_tags;
CREATE POLICY "Admin only write uma_imagem_tags" ON public.uma_imagem_tags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.3 Políticas para public.uma_imagem_authors
DROP POLICY IF EXISTS "Public read visible uma_imagem_authors" ON public.uma_imagem_authors;
CREATE POLICY "Public read visible uma_imagem_authors" ON public.uma_imagem_authors
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = uma_imagem_authors.member_id
        AND tm.status = 'published'
    )
    AND
    EXISTS (
      SELECT 1 FROM public.uma_imagem u
      WHERE u.id = uma_imagem_authors.uma_imagem_id
        AND (
          (u.status = 'published' AND (u.published_at IS NULL OR u.published_at <= timezone('utc'::text, now()))) OR
          (u.status = 'scheduled' AND u.scheduled_at IS NOT NULL AND u.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

DROP POLICY IF EXISTS "Admin read all uma_imagem_authors" ON public.uma_imagem_authors;
CREATE POLICY "Admin read all uma_imagem_authors" ON public.uma_imagem_authors
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only write uma_imagem_authors" ON public.uma_imagem_authors;
CREATE POLICY "Admin only write uma_imagem_authors" ON public.uma_imagem_authors
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. RPC TRANSACIONAL DE SINCRONIZAÇÃO DE AUTORIA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_uma_imagem_authors(
  p_uma_imagem_id UUID,
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
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar a autoria de Uma Imagem.'
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

  -- 5. Exclusão dos créditos anteriores (em transação, apenas após validações completas)
  DELETE FROM public.uma_imagem_authors
  WHERE uma_imagem_id = p_uma_imagem_id;

  -- 6. Inserção dos novos créditos se o array não for vazio
  IF jsonb_array_length(v_normalized_authors) > 0 THEN
    INSERT INTO public.uma_imagem_authors (
      uma_imagem_id,
      member_id,
      role_name,
      order_index
    )
    SELECT
      p_uma_imagem_id,
      (elem->>'member_id')::uuid,
      COALESCE(NULLIF(TRIM(elem->>'role_name'), ''), 'Texto'),
      COALESCE((elem->>'order_index')::integer, ord - 1)
    FROM jsonb_array_elements(v_normalized_authors) WITH ORDINALITY AS t(elem, ord);
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. CONTROLE DE ACESSO E PERMISSÕES (GRANTS E REVOKES)
-- ------------------------------------------------------------------------------
-- Permissões de Leitura Pública para anon e authenticated
GRANT SELECT ON TABLE public.uma_imagem TO anon, authenticated;
GRANT SELECT ON TABLE public.uma_imagem_tags TO anon, authenticated;
GRANT SELECT ON TABLE public.uma_imagem_authors TO anon, authenticated;

-- Permissões de Gestão (CMS) para authenticated (filtradas por RLS / is_admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.uma_imagem TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.uma_imagem_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.uma_imagem_authors TO authenticated;

-- Permissões da RPC transacional
REVOKE ALL ON FUNCTION public.sync_uma_imagem_authors(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_uma_imagem_authors(UUID, JSONB) TO authenticated;
