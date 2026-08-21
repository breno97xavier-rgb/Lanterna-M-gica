-- ==============================================================================
-- FASE 6 — ETAPA 1: MIGRATION DO DOMÍNIO DE EQUIPE E AUTORIA EDITORIAL
-- Lanterna Mágica CMS - Script de Migração e Garantia de Estrutura (Idempotente)
-- ==============================================================================
-- Este script implementa:
-- 1. public.editorial_roles (Funções institucionais da equipe)
-- 2. public.team_members (Integrantes reais da equipe editorial)
-- 3. public.team_member_roles (Relação N:N integrante <-> funções institucionais)
-- 4. public.ensaio_authors (Autoria e responsabilidade editorial em Ensaios)
-- 5. public.critica_authors (Autoria e responsabilidade editorial em Críticas)
-- 6. Índices otimizados, Triggers de updated_at, Políticas RLS e Grants de permissão.
--
-- IMPORTANTE:
-- - Nenhum dado ou registro seed é inserido nesta etapa.
-- - A coluna legada public.ensaios.author é preservada intacta.
-- - Utiliza funções de segurança consolidadas (public.is_admin, public.update_updated_at_column).
-- ==============================================================================

-- 0. EXTENSÕES E TIPOS BASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    CREATE TYPE content_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. FUNÇÕES EDITORIAIS INSTITUCIONAIS (Taxonomia de Cargos/Papéis da Redação)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  group_category TEXT NOT NULL DEFAULT 'redacao',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas em caso de tabela pré-existente
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS group_category TEXT DEFAULT 'redacao';
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.editorial_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. INTEGRANTES DA EQUIPE EDITORIAL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  birth_date DATE,
  bio TEXT,
  short_bio TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_on_about BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas em caso de tabela pré-existente
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS legacy_id TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS short_bio TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS display_on_about BOOLEAN DEFAULT true;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'published';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. VÍNCULO N:N ENTRE INTEGRANTES E FUNÇÕES INSTITUCIONAIS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_member_roles (
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.editorial_roles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (member_id, role_id)
);

-- Garantir índice parcial exclusivo: no máximo UMA função primária (is_primary = true) por integrante
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_member_roles_single_primary
  ON public.team_member_roles (member_id)
  WHERE is_primary = true;

-- ------------------------------------------------------------------------------
-- 4. AUTORIA E CRÉDITOS EM ENSAIOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ensaio_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ensaio_id UUID NOT NULL REFERENCES public.ensaios(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  role_name TEXT NOT NULL DEFAULT 'Texto',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_ensaio_authors_member_role UNIQUE (ensaio_id, member_id, role_name)
);

-- ------------------------------------------------------------------------------
-- 5. AUTORIA E CRÉDITOS EM CRÍTICAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.critica_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  critica_id UUID NOT NULL REFERENCES public.criticas(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  role_name TEXT NOT NULL DEFAULT 'Crítica',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_critica_authors_member_role UNIQUE (critica_id, member_id, role_name)
);

-- ------------------------------------------------------------------------------
-- 6. ÍNDICES DE ALTA PERFORMANCE
-- (Obs: colunas com UNIQUE já possuem índices únicos criados automaticamente pelo PostgreSQL)
-- ------------------------------------------------------------------------------
-- Integrantes da Equipe
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_order ON public.team_members(order_index);
CREATE INDEX IF NOT EXISTS idx_team_members_about ON public.team_members(display_on_about, order_index) WHERE status = 'published';

-- Funções Editoriais
CREATE INDEX IF NOT EXISTS idx_editorial_roles_category ON public.editorial_roles(group_category);
CREATE INDEX IF NOT EXISTS idx_editorial_roles_order ON public.editorial_roles(order_index);

-- Vínculos de Funções de Integrantes
CREATE INDEX IF NOT EXISTS idx_team_member_roles_member ON public.team_member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_roles_role ON public.team_member_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_team_member_roles_primary ON public.team_member_roles(member_id, is_primary);

-- Autoria em Ensaios
CREATE INDEX IF NOT EXISTS idx_ensaio_authors_ensaio ON public.ensaio_authors(ensaio_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ensaio_authors_member ON public.ensaio_authors(member_id);

-- Autoria em Críticas
CREATE INDEX IF NOT EXISTS idx_critica_authors_critica ON public.critica_authors(critica_id, order_index);
CREATE INDEX IF NOT EXISTS idx_critica_authors_member ON public.critica_authors(member_id);

-- ------------------------------------------------------------------------------
-- 7. TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- Reutiliza a função canônica existente public.update_updated_at_column()
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_editorial_roles_updated_at') THEN
    CREATE TRIGGER trg_editorial_roles_updated_at
      BEFORE UPDATE ON public.editorial_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_team_members_updated_at') THEN
    CREATE TRIGGER trg_team_members_updated_at
      BEFORE UPDATE ON public.team_members
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.editorial_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensaio_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critica_authors ENABLE ROW LEVEL SECURITY;

-- 8.1 Políticas para editorial_roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'editorial_roles' AND policyname = 'Public read editorial_roles') THEN
    CREATE POLICY "Public read editorial_roles" ON public.editorial_roles
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'editorial_roles' AND policyname = 'Admin only write editorial_roles') THEN
    CREATE POLICY "Admin only write editorial_roles" ON public.editorial_roles
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 8.2 Políticas para team_members
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Public read published team_members') THEN
    CREATE POLICY "Public read published team_members" ON public.team_members
      FOR SELECT TO anon, authenticated
      USING (status = 'published');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Admin read all team_members') THEN
    CREATE POLICY "Admin read all team_members" ON public.team_members
      FOR SELECT TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Admin only write team_members') THEN
    CREATE POLICY "Admin only write team_members" ON public.team_members
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 8.3 Políticas para team_member_roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_member_roles' AND policyname = 'Public read published team_member_roles') THEN
    CREATE POLICY "Public read published team_member_roles" ON public.team_member_roles
      FOR SELECT TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.id = team_member_roles.member_id
            AND tm.status = 'published'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_member_roles' AND policyname = 'Admin read all team_member_roles') THEN
    CREATE POLICY "Admin read all team_member_roles" ON public.team_member_roles
      FOR SELECT TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_member_roles' AND policyname = 'Admin only write team_member_roles') THEN
    CREATE POLICY "Admin only write team_member_roles" ON public.team_member_roles
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 8.4 Políticas para ensaio_authors
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ensaio_authors' AND policyname = 'Public read visible ensaio_authors') THEN
    CREATE POLICY "Public read visible ensaio_authors" ON public.ensaio_authors
      FOR SELECT TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.id = ensaio_authors.member_id
            AND tm.status = 'published'
        )
        AND
        EXISTS (
          SELECT 1 FROM public.ensaios e
          WHERE e.id = ensaio_authors.ensaio_id
            AND (
              (e.status = 'published' AND (e.published_at IS NULL OR e.published_at <= timezone('utc'::text, now()))) OR
              (e.status = 'scheduled' AND e.scheduled_at IS NOT NULL AND e.scheduled_at <= timezone('utc'::text, now()))
            )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ensaio_authors' AND policyname = 'Admin read all ensaio_authors') THEN
    CREATE POLICY "Admin read all ensaio_authors" ON public.ensaio_authors
      FOR SELECT TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ensaio_authors' AND policyname = 'Admin only write ensaio_authors') THEN
    CREATE POLICY "Admin only write ensaio_authors" ON public.ensaio_authors
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 8.5 Políticas para critica_authors
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'critica_authors' AND policyname = 'Public read visible critica_authors') THEN
    CREATE POLICY "Public read visible critica_authors" ON public.critica_authors
      FOR SELECT TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.id = critica_authors.member_id
            AND tm.status = 'published'
        )
        AND
        EXISTS (
          SELECT 1 FROM public.criticas c
          WHERE c.id = critica_authors.critica_id
            AND (
              (c.status = 'published' AND (c.published_at IS NULL OR c.published_at <= timezone('utc'::text, now()))) OR
              (c.status = 'scheduled' AND c.scheduled_at IS NOT NULL AND c.scheduled_at <= timezone('utc'::text, now()))
            )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'critica_authors' AND policyname = 'Admin read all critica_authors') THEN
    CREATE POLICY "Admin read all critica_authors" ON public.critica_authors
      FOR SELECT TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'critica_authors' AND policyname = 'Admin only write critica_authors') THEN
    CREATE POLICY "Admin only write critica_authors" ON public.critica_authors
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. PERMISSÕES DE ACESSO (GRANTS EXPLÍCITOS)
-- ------------------------------------------------------------------------------
-- Permissões para visitantes anônimos e autenticados (Leitura pública filtrada via RLS)
GRANT SELECT ON TABLE public.editorial_roles TO anon, authenticated;
GRANT SELECT ON TABLE public.team_members TO anon, authenticated;
GRANT SELECT ON TABLE public.team_member_roles TO anon, authenticated;
GRANT SELECT ON TABLE public.ensaio_authors TO anon, authenticated;
GRANT SELECT ON TABLE public.critica_authors TO anon, authenticated;

-- Permissões completas para CMS autenticado (Validação de privilégios via RLS public.is_admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.editorial_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_member_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ensaio_authors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.critica_authors TO authenticated;
