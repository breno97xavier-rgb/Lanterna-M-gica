-- ==============================================================================
-- FASE 2B: MIGRATION — CATÁLOGO DE PAÍSES E AJUSTE DE DATAS
-- Execute este script no SQL Editor do Supabase para aplicar a Fase 2B
-- ==============================================================================

-- 1. CRIAR TABELA public.countries
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  flag_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR ROW LEVEL SECURITY EM public.countries
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- 3. ADICIONAR RELACIONAMENTO country_id E COLUNAS DE DATAS EM public.pessoas
ALTER TABLE public.pessoas 
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS death_date DATE,
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL;

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries(name);
CREATE INDEX IF NOT EXISTS idx_countries_slug ON public.countries(slug);
CREATE INDEX IF NOT EXISTS idx_pessoas_country_id ON public.pessoas(country_id);

-- 5. POLÍTICAS DE ACESSO (RLS) PARA public.countries
DROP POLICY IF EXISTS "Public read countries" ON public.countries;
CREATE POLICY "Public read countries" 
  ON public.countries 
  FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Admin only write countries" ON public.countries;
CREATE POLICY "Admin only write countries" 
  ON public.countries 
  FOR ALL 
  TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 6. PRIVILÉGIOS (GRANTS)
GRANT SELECT ON TABLE public.countries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.countries TO authenticated;
