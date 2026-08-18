-- ==============================================================================
-- FASE 3: MIGRAÇÃO DE FILMES, GÊNEROS, PAÍSES E CRÉDITOS PARA O SUPABASE
-- Lanterna Mágica CMS - Script de Migração e Garantia de Estrutura (Idempotente)
-- Compatível tanto com banco limpo quanto com banco com tabelas já existentes.
-- ==============================================================================

-- 0. EXTENSÕES E TIPOS BASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    CREATE TYPE content_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
  END IF;
END $$;

-- 1. TABELA DE GÊNEROS (Taxonomia canônica)
CREATE TABLE IF NOT EXISTS public.generos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name CITEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas individuais em caso de tabela pré-existente
ALTER TABLE public.generos ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.generos ADD COLUMN IF NOT EXISTS name CITEXT;
ALTER TABLE public.generos ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.generos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Garantir PK e Unique de gêneros se não existirem
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.generos'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.generos ADD PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.generos'::regclass AND contype = 'u' AND conname = 'generos_slug_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_index i 
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'public.generos'::regclass AND i.indisunique AND a.attname = 'slug'
  ) THEN
    ALTER TABLE public.generos ADD CONSTRAINT generos_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Inserir gêneros cinematográficos padrão caso não existam (preservando os já existentes)
INSERT INTO public.generos (name, slug)
VALUES
  ('Drama', 'drama'),
  ('Comédia', 'comedia'),
  ('Suspense', 'suspense'),
  ('Terror', 'terror'),
  ('Ficção Científica', 'ficcao-cientifica'),
  ('Documentário', 'documentario'),
  ('Romance', 'romance'),
  ('Animação', 'animacao'),
  ('Aventura', 'aventura'),
  ('Ação', 'acao'),
  ('Fantasia', 'fantasia'),
  ('Policial', 'policial'),
  ('Mistério', 'misterio'),
  ('Guerra', 'guerra'),
  ('Musical', 'musical'),
  ('Faroeste', 'faroeste'),
  ('Histórico', 'historico'),
  ('Experimental', 'experimental'),
  ('Ensaio Fílmico', 'ensaio-filmico')
ON CONFLICT (slug) DO NOTHING;

-- 2. TABELA CANÔNICA DE FILMES
CREATE TABLE IF NOT EXISTS public.filmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  title TEXT NOT NULL,
  original_title TEXT,
  slug TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL,
  country TEXT,
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
  legacy_director_name TEXT
);

-- Garantir todas as colunas individuais de filmes para banco pré-existente
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS legacy_id TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS original_title TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS backdrop_url TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS editorial_rating NUMERIC(2,1);
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'published';
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.filmes ADD COLUMN IF NOT EXISTS legacy_director_name TEXT;

-- Compatibilização de valores nulos em colunas essenciais pré-existentes
UPDATE public.filmes SET status = 'published' WHERE status IS NULL;
UPDATE public.filmes SET updated_at = timezone('utc'::text, now()) WHERE updated_at IS NULL;
UPDATE public.filmes SET created_at = timezone('utc'::text, now()) WHERE created_at IS NULL;

-- Garantir que a coluna country não seja NOT NULL caso a tabela já existisse com restrição antiga
ALTER TABLE public.filmes ALTER COLUMN country DROP NOT NULL;

-- Garantir PK e Unique de filmes se não existirem
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.filmes'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.filmes ADD PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.filmes'::regclass AND contype = 'u' AND conname = 'filmes_slug_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_index i 
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'public.filmes'::regclass AND i.indisunique AND a.attname = 'slug'
  ) THEN
    ALTER TABLE public.filmes ADD CONSTRAINT filmes_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Garantir constraint de editorial_rating em tabela pré-existente caso não exista
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.filmes'::regclass 
      AND conname = 'chk_filmes_editorial_rating'
  ) THEN
    ALTER TABLE public.filmes
      ADD CONSTRAINT chk_filmes_editorial_rating
      CHECK (
        editorial_rating IS NULL OR (
          editorial_rating >= 0.5 AND editorial_rating <= 5.0 AND MOD((editorial_rating * 10)::numeric, 5) = 0
        )
      );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. TABELAS ASSOCIATIVAS E CRÉDITOS

-- A. Filme <-> Gêneros
CREATE TABLE IF NOT EXISTS public.filme_generos (
  filme_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  genero_id UUID NOT NULL REFERENCES public.generos(id) ON DELETE CASCADE,
  PRIMARY KEY (filme_id, genero_id)
);

ALTER TABLE public.filme_generos ADD COLUMN IF NOT EXISTS filme_id UUID;
ALTER TABLE public.filme_generos ADD COLUMN IF NOT EXISTS genero_id UUID;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.filme_generos'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.filme_generos ADD PRIMARY KEY (filme_id, genero_id);
  END IF;
END $$;

-- B. Filme <-> Países de Produção / Coprodução (M:N com public.countries)
CREATE TABLE IF NOT EXISTS public.filme_countries (
  filme_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (filme_id, country_id)
);

ALTER TABLE public.filme_countries ADD COLUMN IF NOT EXISTS filme_id UUID;
ALTER TABLE public.filme_countries ADD COLUMN IF NOT EXISTS country_id UUID;
ALTER TABLE public.filme_countries ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.filme_countries'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.filme_countries ADD PRIMARY KEY (filme_id, country_id);
  END IF;
END $$;

-- C. Créditos Técnicos e Artísticos de Filmes (film_credits)
CREATE TABLE IF NOT EXISTS public.film_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  film_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  fallback_person_name TEXT,
  department TEXT NOT NULL DEFAULT 'Outro',
  role TEXT,
  character_name TEXT,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS film_id UUID;
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS person_id UUID;
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS fallback_person_name TEXT;
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Outro';
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS character_name TEXT;
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.film_credits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Tratar registros nulos de department e order_index caso já existissem antes de constraints
UPDATE public.film_credits SET department = 'Outro' WHERE department IS NULL;
UPDATE public.film_credits SET order_index = 0 WHERE order_index IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.film_credits'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.film_credits ADD PRIMARY KEY (id);
  END IF;
END $$;

-- 4. VALIDAÇÃO ESTRUTURAL PRECISA DE FOREIGN KEYS
-- Valida coluna local, coluna referenciada, tabela de destino e regra ON DELETE
DO $$
DECLARE
  v_fk_record RECORD;
BEGIN
  -- 1. film_credits.film_id -> public.filmes(id) ON DELETE CASCADE
  SELECT c.conname, c.confdeltype INTO v_fk_record
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
  WHERE c.conrelid = 'public.film_credits'::regclass
    AND c.confrelid = 'public.filmes'::regclass
    AND c.contype = 'f'
    AND a.attname = 'film_id'
    AND fa.attname = 'id'
  LIMIT 1;

  IF NOT FOUND THEN
    ALTER TABLE public.film_credits
      ADD CONSTRAINT fk_film_credits_film
      FOREIGN KEY (film_id) REFERENCES public.filmes(id) ON DELETE CASCADE;
    RAISE NOTICE 'Criada constraint fk_film_credits_film (ON DELETE CASCADE)';
  ELSE
    IF v_fk_record.confdeltype = 'c' THEN
      RAISE NOTICE 'Foreign key film_credits.film_id -> filmes.id já existe com ON DELETE CASCADE (constraint: %)', v_fk_record.conname;
    ELSE
      RAISE NOTICE 'Foreign key film_credits.film_id -> filmes.id já existe com regra diferente (%) na constraint %. Preservando sem duplicar.', v_fk_record.confdeltype, v_fk_record.conname;
    END IF;
  END IF;

  -- 2. film_credits.person_id -> public.pessoas(id) ON DELETE SET NULL
  SELECT c.conname, c.confdeltype INTO v_fk_record
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
  WHERE c.conrelid = 'public.film_credits'::regclass
    AND c.confrelid = 'public.pessoas'::regclass
    AND c.contype = 'f'
    AND a.attname = 'person_id'
    AND fa.attname = 'id'
  LIMIT 1;

  IF NOT FOUND THEN
    ALTER TABLE public.film_credits
      ADD CONSTRAINT fk_film_credits_person
      FOREIGN KEY (person_id) REFERENCES public.pessoas(id) ON DELETE SET NULL;
    RAISE NOTICE 'Criada constraint fk_film_credits_person (ON DELETE SET NULL)';
  ELSE
    IF v_fk_record.confdeltype = 'n' THEN
      RAISE NOTICE 'Foreign key film_credits.person_id -> pessoas.id já existe com ON DELETE SET NULL (constraint: %)', v_fk_record.conname;
    ELSE
      RAISE NOTICE 'Foreign key film_credits.person_id -> pessoas.id já existe com regra diferente (%) na constraint %. Preservando sem duplicar.', v_fk_record.confdeltype, v_fk_record.conname;
    END IF;
  END IF;

  -- 3. filme_generos.filme_id -> public.filmes(id) ON DELETE CASCADE
  SELECT c.conname, c.confdeltype INTO v_fk_record
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
  WHERE c.conrelid = 'public.filme_generos'::regclass
    AND c.confrelid = 'public.filmes'::regclass
    AND c.contype = 'f'
    AND a.attname = 'filme_id'
    AND fa.attname = 'id'
  LIMIT 1;

  IF NOT FOUND THEN
    ALTER TABLE public.filme_generos
      ADD CONSTRAINT fk_filme_generos_filme
      FOREIGN KEY (filme_id) REFERENCES public.filmes(id) ON DELETE CASCADE;
    RAISE NOTICE 'Criada constraint fk_filme_generos_filme (ON DELETE CASCADE)';
  ELSE
    IF v_fk_record.confdeltype = 'c' THEN
      RAISE NOTICE 'Foreign key filme_generos.filme_id -> filmes.id já existe com ON DELETE CASCADE (constraint: %)', v_fk_record.conname;
    ELSE
      RAISE NOTICE 'Foreign key filme_generos.filme_id -> filmes.id já existe com regra diferente (%) na constraint %. Preservando sem duplicar.', v_fk_record.confdeltype, v_fk_record.conname;
    END IF;
  END IF;

  -- 4. filme_generos.genero_id -> public.generos(id) ON DELETE CASCADE
  SELECT c.conname, c.confdeltype INTO v_fk_record
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
  WHERE c.conrelid = 'public.filme_generos'::regclass
    AND c.confrelid = 'public.generos'::regclass
    AND c.contype = 'f'
    AND a.attname = 'genero_id'
    AND fa.attname = 'id'
  LIMIT 1;

  IF NOT FOUND THEN
    ALTER TABLE public.filme_generos
      ADD CONSTRAINT fk_filme_generos_genero
      FOREIGN KEY (genero_id) REFERENCES public.generos(id) ON DELETE CASCADE;
    RAISE NOTICE 'Criada constraint fk_filme_generos_genero (ON DELETE CASCADE)';
  ELSE
    IF v_fk_record.confdeltype = 'c' THEN
      RAISE NOTICE 'Foreign key filme_generos.genero_id -> generos.id já existe com ON DELETE CASCADE (constraint: %)', v_fk_record.conname;
    ELSE
      RAISE NOTICE 'Foreign key filme_generos.genero_id -> generos.id já existe com regra diferente (%) na constraint %. Preservando sem duplicar.', v_fk_record.confdeltype, v_fk_record.conname;
    END IF;
  END IF;

  -- 5. filme_countries.filme_id -> public.filmes(id) ON DELETE CASCADE
  SELECT c.conname, c.confdeltype INTO v_fk_record
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
  WHERE c.conrelid = 'public.filme_countries'::regclass
    AND c.confrelid = 'public.filmes'::regclass
    AND c.contype = 'f'
    AND a.attname = 'filme_id'
    AND fa.attname = 'id'
  LIMIT 1;

  IF NOT FOUND THEN
    ALTER TABLE public.filme_countries
      ADD CONSTRAINT fk_filme_countries_filme
      FOREIGN KEY (filme_id) REFERENCES public.filmes(id) ON DELETE CASCADE;
    RAISE NOTICE 'Criada constraint fk_filme_countries_filme (ON DELETE CASCADE)';
  ELSE
    IF v_fk_record.confdeltype = 'c' THEN
      RAISE NOTICE 'Foreign key filme_countries.filme_id -> filmes.id já existe com ON DELETE CASCADE (constraint: %)', v_fk_record.conname;
    ELSE
      RAISE NOTICE 'Foreign key filme_countries.filme_id -> filmes.id já existe com regra diferente (%) na constraint %. Preservando sem duplicar.', v_fk_record.confdeltype, v_fk_record.conname;
    END IF;
  END IF;

  -- 6. filme_countries.country_id -> public.countries(id) ON DELETE CASCADE
  SELECT c.conname, c.confdeltype INTO v_fk_record
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
  WHERE c.conrelid = 'public.filme_countries'::regclass
    AND c.confrelid = 'public.countries'::regclass
    AND c.contype = 'f'
    AND a.attname = 'country_id'
    AND fa.attname = 'id'
  LIMIT 1;

  IF NOT FOUND THEN
    ALTER TABLE public.filme_countries
      ADD CONSTRAINT fk_filme_countries_country
      FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;
    RAISE NOTICE 'Criada constraint fk_filme_countries_country (ON DELETE CASCADE)';
  ELSE
    IF v_fk_record.confdeltype = 'c' THEN
      RAISE NOTICE 'Foreign key filme_countries.country_id -> countries.id já existe com ON DELETE CASCADE (constraint: %)', v_fk_record.conname;
    ELSE
      RAISE NOTICE 'Foreign key filme_countries.country_id -> countries.id já existe com regra diferente (%) na constraint %. Preservando sem duplicar.', v_fk_record.confdeltype, v_fk_record.conname;
    END IF;
  END IF;
END $$;

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_filmes_slug ON public.filmes(slug);
CREATE INDEX IF NOT EXISTS idx_filmes_year ON public.filmes(year);
CREATE INDEX IF NOT EXISTS idx_filmes_status_pub ON public.filmes(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_filme_generos_genero ON public.filme_generos(genero_id);
CREATE INDEX IF NOT EXISTS idx_filme_countries_country ON public.filme_countries(country_id);
CREATE INDEX IF NOT EXISTS idx_film_credits_film ON public.film_credits(film_id);
CREATE INDEX IF NOT EXISTS idx_film_credits_person ON public.film_credits(person_id);
CREATE INDEX IF NOT EXISTS idx_generos_slug ON public.generos(slug);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.generos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filme_generos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filme_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_credits ENABLE ROW LEVEL SECURITY;

-- Políticas para generos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'generos' AND policyname = 'Public read generos') THEN
    CREATE POLICY "Public read generos" ON public.generos FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'generos' AND policyname = 'Admin only write generos') THEN
    CREATE POLICY "Admin only write generos" ON public.generos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Políticas para filmes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filmes' AND policyname = 'Public read published or scheduled filmes') THEN
    CREATE POLICY "Public read published or scheduled filmes" ON public.filmes
      FOR SELECT TO anon, authenticated
      USING (
        (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
        (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filmes' AND policyname = 'Admin read all filmes') THEN
    CREATE POLICY "Admin read all filmes" ON public.filmes FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filmes' AND policyname = 'Admin only write filmes') THEN
    CREATE POLICY "Admin only write filmes" ON public.filmes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Políticas para filme_generos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filme_generos' AND policyname = 'Public read published or scheduled filme_generos') THEN
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
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filme_generos' AND policyname = 'Admin read all filme_generos') THEN
    CREATE POLICY "Admin read all filme_generos" ON public.filme_generos FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filme_generos' AND policyname = 'Admin only write filme_generos') THEN
    CREATE POLICY "Admin only write filme_generos" ON public.filme_generos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Políticas para filme_countries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filme_countries' AND policyname = 'Public read published or scheduled filme_countries') THEN
    CREATE POLICY "Public read published or scheduled filme_countries" ON public.filme_countries
      FOR SELECT TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.filmes f
          WHERE f.id = filme_countries.filme_id
            AND (
              (f.status = 'published' AND (f.published_at IS NULL OR f.published_at <= timezone('utc'::text, now()))) OR
              (f.status = 'scheduled' AND f.scheduled_at IS NOT NULL AND f.scheduled_at <= timezone('utc'::text, now()))
            )
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filme_countries' AND policyname = 'Admin read all filme_countries') THEN
    CREATE POLICY "Admin read all filme_countries" ON public.filme_countries FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'filme_countries' AND policyname = 'Admin only write filme_countries') THEN
    CREATE POLICY "Admin only write filme_countries" ON public.filme_countries FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Políticas para film_credits
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'film_credits' AND policyname = 'Public read published or scheduled film_credits') THEN
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
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'film_credits' AND policyname = 'Admin read all film_credits') THEN
    CREATE POLICY "Admin read all film_credits" ON public.film_credits FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'film_credits' AND policyname = 'Admin only write film_credits') THEN
    CREATE POLICY "Admin only write film_credits" ON public.film_credits FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 7. FUNÇÕES AUXILIARES E TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_filmes_updated_at') THEN
    CREATE TRIGGER trg_filmes_updated_at
      BEFORE UPDATE ON public.filmes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 8. PERMISSÕES DE ACESSO (GRANTS)
GRANT SELECT ON TABLE public.generos TO anon, authenticated;
GRANT SELECT ON TABLE public.filmes TO anon, authenticated;
GRANT SELECT ON TABLE public.filme_generos TO anon, authenticated;
GRANT SELECT ON TABLE public.filme_countries TO anon, authenticated;
GRANT SELECT ON TABLE public.film_credits TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.generos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.filmes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.filme_generos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.filme_countries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.film_credits TO authenticated;
