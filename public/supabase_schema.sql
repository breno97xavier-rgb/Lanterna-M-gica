-- ==============================================================================
-- SCHEMA DO BANCO DE DADOS: LANTERNA MÁGICA (VERSÃO 2.0 NORMALIZADA)
-- PostgreSQL / Supabase
-- ==============================================================================

-- 0. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1. Enums Tipados
DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE special_item_type AS ENUM ('ensaio', 'critica', 'lista', 'uma_imagem', 'filme', 'pessoa');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'editor', 'author');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. SEGURANÇA ADMINISTRATIVA E CONTROLE DE ACESSO (RBAC)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, role)
);

-- Função auxiliar blindada e segura para verificar se o usuário autenticado atual é ADMIN
-- Boas práticas aplicadas:
-- 1. SECURITY DEFINER para executar com privilégios controlados
-- 2. SET search_path = '' (vazio) para prevenir ataques de hijacking de esquema
-- 3. Referências totalmente qualificadas para todos os tipos, tabelas e funções do catálogo
-- 4. REVOKE ALL FROM PUBLIC e GRANT EXECUTE TO authenticated apenas (visitantes anônimos não executam a função)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id pg_catalog.uuid;
  has_admin_role BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT pg_catalog.bool_or(true) INTO has_admin_role
  FROM public.user_roles
  WHERE user_id = current_user_id AND role = 'admin'::public.app_role;

  RETURN COALESCE(has_admin_role, false);
END;
$$;

-- Restringe execução da função exclusivamente para usuários autenticados
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ==============================================================================
-- 3. TABELAS DE TAXONOMIAS CANÔNICAS (Tags e Gêneros)
-- ==============================================================================

-- Tags com unicidade insensível a maiúsculas/minúsculas usando CITEXT
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name CITEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Gêneros cinematográficos canônicos
CREATE TABLE IF NOT EXISTS public.generos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name CITEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. MÍDIAS & ARQUIVOS (Metadados do Supabase Storage)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  alt_text TEXT,
  caption TEXT,
  credit TEXT,
  is_public BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. ENTIDADES PRINCIPAIS (Pessoas e Filmes)
-- ==============================================================================

-- PESSOAS (Canônica para Diretores, Atores, Equipe Técnica e Perfis Editoriais)
CREATE TABLE IF NOT EXISTS public.pessoas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  birth_date DATE,
  death_date DATE,
  country TEXT,
  bio TEXT,
  is_editorial_profile BOOLEAN DEFAULT false NOT NULL,
  editorial_profile TEXT,
  primary_roles TEXT[] DEFAULT '{}',
  highlight_home BOOLEAN DEFAULT false NOT NULL,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FILMES (Fonte canônica de dados de obras)
CREATE TABLE IF NOT EXISTS public.filmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  original_title TEXT,
  slug TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  country TEXT NOT NULL,
  duration_minutes INTEGER,
  poster_url TEXT,
  backdrop_url TEXT,
  synopsis TEXT,
  editorial_rating NUMERIC(2,1) CHECK (
    editorial_rating IS NULL OR (
      editorial_rating >= 0.5 AND editorial_rating <= 5.0 AND MOD((editorial_rating * 10)::numeric, 5) = 0
    )
  ),
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Campo opcional transitório de fallback para dados antigos durante a migração
  legacy_director_name TEXT
);

-- Tabela associativa: Filme <-> Gêneros
CREATE TABLE IF NOT EXISTS public.filme_generos (
  filme_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  genero_id UUID NOT NULL REFERENCES public.generos(id) ON DELETE CASCADE,
  PRIMARY KEY (filme_id, genero_id)
);

-- CRÉDITOS TÉCNICOS E ARTÍSTICOS DE FILMES
CREATE TABLE IF NOT EXISTS public.film_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  film_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  fallback_person_name TEXT, -- Fallback temporário para dados antigos
  department TEXT NOT NULL,  -- 'Direção', 'Fotografia', 'Roteiro', 'Elenco', 'Montagem', 'Música', etc.
  role TEXT,                 -- Ex: 'Diretor', 'Diretor de Fotografia', 'Roteirista'
  character_name TEXT,       -- Para atores (ex: 'Elisabeth Vogler')
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. PUBLICAÇÕES EDITORIAIS
-- ==============================================================================

-- ENSAIOS
CREATE TABLE IF NOT EXISTS public.ensaios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Redação Lanterna Mágica',
  read_time_minutes INTEGER DEFAULT 5 NOT NULL,
  highlight_home BOOLEAN DEFAULT false NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CRÍTICAS
CREATE TABLE IF NOT EXISTS public.criticas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  film_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE RESTRICT,
  editorial_title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  star_rating NUMERIC(2,1) NOT NULL CHECK (
    star_rating >= 0.5 AND star_rating <= 5.0 AND MOD((star_rating * 10)::numeric, 5) = 0
  ),
  is_new_release BOOLEAN DEFAULT false NOT NULL,
  highlight_home BOOLEAN DEFAULT false NOT NULL,
  cover_image TEXT, -- Imagem de capa customizada do artigo (se omitido, usa poster do filme)
  seo_title TEXT,
  seo_description TEXT,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Campos de fallback transitórios para dados antigos caso o filme seja recém-desacoplado
  legacy_movie_title TEXT,
  legacy_director TEXT,
  legacy_year INTEGER,
  legacy_country TEXT
);

-- UMA IMAGEM, UMA IDEIA
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

-- ESPECIAIS (Dossiês, Retrospectivas, Coberturas)
CREATE TABLE IF NOT EXISTS public.especiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  intro TEXT NOT NULL,
  content TEXT NOT NULL,
  related_person_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL, -- Cineasta/Pessoa homenageada (opcional)
  highlight_home BOOLEAN DEFAULT false NOT NULL,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- LISTAS CURATORIAIS
CREATE TABLE IF NOT EXISTS public.listas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  intro TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  related_person_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MANIFESTOS EDITORIAIS
CREATE TABLE IF NOT EXISTS public.manifestos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  edition TEXT,
  author TEXT DEFAULT 'Redação Lanterna Mágica',
  slug TEXT UNIQUE,
  summary TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  status content_status DEFAULT 'draft' NOT NULL,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ITENS RANQUEADOS OU ORDENADOS DE UMA LISTA
CREATE TABLE IF NOT EXISTS public.lista_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  film_id UUID REFERENCES public.filmes(id) ON DELETE RESTRICT,
  rank INTEGER,
  custom_title TEXT, -- Usado se o item for personalizado ou não tiver filme cadastrado
  custom_director TEXT,
  custom_year INTEGER,
  custom_image TEXT,
  note TEXT,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_lista_item_pos UNIQUE (lista_id, order_index),
  CONSTRAINT ck_lista_item_target CHECK (film_id IS NOT NULL OR (custom_title IS NOT NULL AND length(trim(custom_title)) > 0))
);

-- ITENS ESTRUTURADOS DE UM ESPECIAL (Relacionamento polimórfico tipado e com integridade)
-- Criado após ensaios, criticas, uma_imagem, especiais, listas, filmes e pessoas já existirem
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
  -- Garantir integridade relacional estrita: apenas a chave estrangeira correspondente ao item_type deve ser preenchida
  CONSTRAINT check_special_item_single_fk CHECK (
    (item_type = 'ensaio' AND ensaio_id IS NOT NULL AND critica_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'critica' AND critica_id IS NOT NULL AND ensaio_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'lista' AND lista_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'uma_imagem' AND uma_imagem_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND lista_id IS NULL AND filme_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'filme' AND filme_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND pessoa_id IS NULL) OR
    (item_type = 'pessoa' AND pessoa_id IS NOT NULL AND ensaio_id IS NULL AND critica_id IS NULL AND lista_id IS NULL AND uma_imagem_id IS NULL AND filme_id IS NULL)
  )
);

-- ESTREIAS / LANÇAMENTOS
CREATE TABLE IF NOT EXISTS public.estreias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  film_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  release_date DATE NOT NULL,
  release_type TEXT NOT NULL, -- 'Cinema', 'Streaming (MUBI)', 'Festival', etc.
  distributor TEXT,
  notes TEXT,
  status content_status DEFAULT 'published' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 7. TABELAS ASSOCIATIVAS DE TAGS (Normalização 100% Relacional)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ensaio_tags (
  ensaio_id UUID NOT NULL REFERENCES public.ensaios(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ensaio_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.critica_tags (
  critica_id UUID NOT NULL REFERENCES public.criticas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (critica_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.filme_tags (
  filme_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (filme_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.pessoa_tags (
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (pessoa_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.lista_tags (
  lista_id UUID NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lista_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.uma_imagem_tags (
  uma_imagem_id UUID NOT NULL REFERENCES public.uma_imagem(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (uma_imagem_id, tag_id)
);

-- ==============================================================================
-- 8. CONFIGURAÇÕES DO SITE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 9. ÍNDICES DE ALTA PERFORMANCE (Slugs, Chaves Estrangeiras, Agendamentos)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_ensaios_slug ON public.ensaios(slug);
CREATE INDEX IF NOT EXISTS idx_ensaios_status_pub ON public.ensaios(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ensaios_scheduled ON public.ensaios(scheduled_at) WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_criticas_slug ON public.criticas(slug);
CREATE INDEX IF NOT EXISTS idx_criticas_film_id ON public.criticas(film_id);
CREATE INDEX IF NOT EXISTS idx_criticas_rating ON public.criticas(star_rating);
CREATE INDEX IF NOT EXISTS idx_criticas_status_pub ON public.criticas(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_criticas_scheduled ON public.criticas(scheduled_at) WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_filmes_slug ON public.filmes(slug);
CREATE INDEX IF NOT EXISTS idx_filmes_year ON public.filmes(year);

CREATE INDEX IF NOT EXISTS idx_pessoas_slug ON public.pessoas(slug);
CREATE INDEX IF NOT EXISTS idx_pessoas_editorial ON public.pessoas(is_editorial_profile) WHERE is_editorial_profile = true;

CREATE INDEX IF NOT EXISTS idx_film_credits_film ON public.film_credits(film_id);
CREATE INDEX IF NOT EXISTS idx_film_credits_person ON public.film_credits(person_id);

CREATE INDEX IF NOT EXISTS idx_estreias_film_id ON public.estreias(film_id);
CREATE INDEX IF NOT EXISTS idx_estreias_date ON public.estreias(release_date);

CREATE INDEX IF NOT EXISTS idx_especial_items_especial ON public.especial_items(especial_id);
CREATE INDEX IF NOT EXISTS idx_lista_items_lista ON public.lista_items(lista_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lista_film ON public.lista_items(lista_id, film_id) WHERE film_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manifestos_slug ON public.manifestos(slug);
CREATE INDEX IF NOT EXISTS idx_manifestos_status_pub ON public.manifestos(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_manifestos_scheduled ON public.manifestos(scheduled_at) WHERE status = 'scheduled';

-- ==============================================================================
-- 10. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filme_generos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensaios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uma_imagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estreias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensaio_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critica_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filme_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoa_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uma_imagem_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Políticas de Leitura Pública
-- 1. Visitantes (anon e authenticated) leem conteúdos publicados ou agendados já vencidos
-- 2. Relações e itens auxiliares só são visíveis se a entidade-pai estiver publicada
-- 3. Administradores (authenticated com role admin) leem TODOS os conteúdos (incluindo rascunhos)
-- ------------------------------------------------------------------------------

-- ENSAIOS
CREATE POLICY "Public read published or scheduled ensaios" ON public.ensaios
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all ensaios" ON public.ensaios
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- CRÍTICAS
CREATE POLICY "Public read published or scheduled criticas" ON public.criticas
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all criticas" ON public.criticas
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- UMA IMAGEM, UMA IDEIA
CREATE POLICY "Public read published or scheduled uma_imagem" ON public.uma_imagem
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all uma_imagem" ON public.uma_imagem
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ESPECIAIS
CREATE POLICY "Public read published or scheduled especiais" ON public.especiais
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all especiais" ON public.especiais
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- LISTAS
CREATE POLICY "Public read published or scheduled listas" ON public.listas
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all listas" ON public.listas
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- MANIFESTOS
CREATE POLICY "Public read published or scheduled manifestos" ON public.manifestos
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all manifestos" ON public.manifestos
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- PESSOAS
CREATE POLICY "Public read published or scheduled pessoas" ON public.pessoas
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all pessoas" ON public.pessoas
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- FILMES
CREATE POLICY "Public read published or scheduled filmes" ON public.filmes
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

CREATE POLICY "Admin read all filmes" ON public.filmes
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ESTREIAS
CREATE POLICY "Public read published estreias" ON public.estreias
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admin read all estreias" ON public.estreias
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- TAXONOMIAS (Tags e Gêneros para filtros e navegação)
CREATE POLICY "Public read tags" ON public.tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read generos" ON public.generos FOR SELECT TO anon, authenticated USING (true);

-- MÍDIAS (Apenas mídias públicas)
CREATE POLICY "Public read published media_items" ON public.media_items
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Admin read all media_items" ON public.media_items
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- CONFIGURAÇÕES DO SITE (Apenas configurações marcadas como públicas)
CREATE POLICY "Public read public site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Admin read all site_settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- TABELAS AUXILIARES E RELAÇÕES (Proteção contra vazamento de metadados de rascunhos)
-- Filme Gêneros
CREATE POLICY "Public read published or scheduled filme_generos" ON public.filme_generos
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.filmes f
      WHERE f.id = filme_generos.filme_id
        AND (
          (f.status = 'published' AND (f.published_at IS NULL OR f.published_at <= timezone('utc'::text, now()))) OR
          (f.status = 'scheduled' AND f.scheduled_at IS NOT NULL AND f.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all filme_generos" ON public.filme_generos
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Créditos de Filmes
CREATE POLICY "Public read published or scheduled film_credits" ON public.film_credits
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.filmes f
      WHERE f.id = film_credits.film_id
        AND (
          (f.status = 'published' AND (f.published_at IS NULL OR f.published_at <= timezone('utc'::text, now()))) OR
          (f.status = 'scheduled' AND f.scheduled_at IS NOT NULL AND f.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all film_credits" ON public.film_credits
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Itens de Especiais
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

CREATE POLICY "Admin read all especial_items" ON public.especial_items
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Itens de Listas
CREATE POLICY "Public read published or scheduled lista_items" ON public.lista_items
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listas l
      WHERE l.id = lista_items.lista_id
        AND (
          (l.status = 'published' AND (l.published_at IS NULL OR l.published_at <= timezone('utc'::text, now()))) OR
          (l.status = 'scheduled' AND l.scheduled_at IS NOT NULL AND l.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all lista_items" ON public.lista_items
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Tags de Ensaios
CREATE POLICY "Public read published or scheduled ensaio_tags" ON public.ensaio_tags
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ensaios e
      WHERE e.id = ensaio_tags.ensaio_id
        AND (
          (e.status = 'published' AND (e.published_at IS NULL OR e.published_at <= timezone('utc'::text, now()))) OR
          (e.status = 'scheduled' AND e.scheduled_at IS NOT NULL AND e.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all ensaio_tags" ON public.ensaio_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Tags de Críticas
CREATE POLICY "Public read published or scheduled critica_tags" ON public.critica_tags
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.criticas c
      WHERE c.id = critica_tags.critica_id
        AND (
          (c.status = 'published' AND (c.published_at IS NULL OR c.published_at <= timezone('utc'::text, now()))) OR
          (c.status = 'scheduled' AND c.scheduled_at IS NOT NULL AND c.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all critica_tags" ON public.critica_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Tags de Filmes
CREATE POLICY "Public read published or scheduled filme_tags" ON public.filme_tags
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.filmes f
      WHERE f.id = filme_tags.filme_id
        AND (
          (f.status = 'published' AND (f.published_at IS NULL OR f.published_at <= timezone('utc'::text, now()))) OR
          (f.status = 'scheduled' AND f.scheduled_at IS NOT NULL AND f.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all filme_tags" ON public.filme_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Tags de Pessoas
CREATE POLICY "Public read published or scheduled pessoa_tags" ON public.pessoa_tags
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pessoas p
      WHERE p.id = pessoa_tags.pessoa_id
        AND (
          (p.status = 'published' AND (p.published_at IS NULL OR p.published_at <= timezone('utc'::text, now()))) OR
          (p.status = 'scheduled' AND p.scheduled_at IS NOT NULL AND p.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all pessoa_tags" ON public.pessoa_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Tags de Listas
CREATE POLICY "Public read published or scheduled lista_tags" ON public.lista_tags
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listas l
      WHERE l.id = lista_tags.lista_id
        AND (
          (l.status = 'published' AND (l.published_at IS NULL OR l.published_at <= timezone('utc'::text, now()))) OR
          (l.status = 'scheduled' AND l.scheduled_at IS NOT NULL AND l.scheduled_at <= timezone('utc'::text, now()))
        )
    )
  );

CREATE POLICY "Admin read all lista_tags" ON public.lista_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Tags de Uma Imagem, Uma Ideia
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

CREATE POLICY "Admin read all uma_imagem_tags" ON public.uma_imagem_tags
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- B. Políticas de Escrita (INSERT, UPDATE, DELETE)
-- EXCLUSIVAMENTE para Usuários Autenticados com role 'admin'
-- Usuários autenticados comuns NÃO possuem permissão de escrita
-- ------------------------------------------------------------------------------

CREATE POLICY "Admin only access user_roles" ON public.user_roles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write tags" ON public.tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write generos" ON public.generos FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write media_items" ON public.media_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write pessoas" ON public.pessoas FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write filmes" ON public.filmes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write filme_generos" ON public.filme_generos FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write film_credits" ON public.film_credits FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write ensaios" ON public.ensaios FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write criticas" ON public.criticas FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write uma_imagem" ON public.uma_imagem FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write especiais" ON public.especiais FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write especial_items" ON public.especial_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write listas" ON public.listas FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write lista_items" ON public.lista_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write manifestos" ON public.manifestos FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write estreias" ON public.estreias FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write ensaio_tags" ON public.ensaio_tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write critica_tags" ON public.critica_tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write filme_tags" ON public.filme_tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write pessoa_tags" ON public.pessoa_tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write lista_tags" ON public.lista_tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write uma_imagem_tags" ON public.uma_imagem_tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin only write site_settings" ON public.site_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- 11. CONCESSÃO DE PRIVILÉGIOS (GRANTS MÍNIMOS E EXPLÍCITOS)
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Privilégios para 'anon' (Somente leitura pública em tabelas de conteúdo)
GRANT SELECT ON TABLE public.tags TO anon;
GRANT SELECT ON TABLE public.generos TO anon;
GRANT SELECT ON TABLE public.media_items TO anon;
GRANT SELECT ON TABLE public.pessoas TO anon;
GRANT SELECT ON TABLE public.filmes TO anon;
GRANT SELECT ON TABLE public.filme_generos TO anon;
GRANT SELECT ON TABLE public.film_credits TO anon;
GRANT SELECT ON TABLE public.ensaios TO anon;
GRANT SELECT ON TABLE public.criticas TO anon;
GRANT SELECT ON TABLE public.uma_imagem TO anon;
GRANT SELECT ON TABLE public.especiais TO anon;
GRANT SELECT ON TABLE public.especial_items TO anon;
GRANT SELECT ON TABLE public.listas TO anon;
GRANT SELECT ON TABLE public.lista_items TO anon;
GRANT SELECT ON TABLE public.manifestos TO anon;
GRANT SELECT ON TABLE public.estreias TO anon;
GRANT SELECT ON TABLE public.ensaio_tags TO anon;
GRANT SELECT ON TABLE public.critica_tags TO anon;
GRANT SELECT ON TABLE public.filme_tags TO anon;
GRANT SELECT ON TABLE public.pessoa_tags TO anon;
GRANT SELECT ON TABLE public.lista_tags TO anon;
GRANT SELECT ON TABLE public.uma_imagem_tags TO anon;
GRANT SELECT ON TABLE public.site_settings TO anon;
-- Nota: 'anon' NÃO possui permissão na tabela 'user_roles'

-- Privilégios para 'authenticated' (Operações de CMS geridas por RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.generos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pessoas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.filmes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.filme_generos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.film_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ensaios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.criticas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.uma_imagem TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.especiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.especial_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lista_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.manifestos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.estreias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ensaio_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.critica_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.filme_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pessoa_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lista_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.uma_imagem_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_settings TO authenticated;

