-- ==============================================================================
-- LANTERNA MÁGICA — FASE 10: ESTREIAS E LANÇAMENTOS
-- Arquivo: supabase_migration_fase10_estreias.sql
-- 
-- Conteúdo desta migration incremental e idempotente:
-- 1. Criação / reforço defensivo da tabela public.estreias
-- 2. Garantia de colunas de publicação temporal: published_at e scheduled_at
-- 3. Índices otimizados para consulta cronológica, por filme e status
-- 4. Triggers de atualização automática de updated_at
-- 5. Row Level Security (RLS) seguro com cláusula explícita 'TO authenticated'
-- 6. Concessão e revogação estrita de privilégios (GRANT / REVOKE)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA PRINCIPAL: public.estreias (DEFENSIVA / IDEMPOTENTE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estreias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id TEXT UNIQUE,
  film_id UUID NOT NULL REFERENCES public.filmes(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT 'Brasil',
  release_date DATE NOT NULL,
  release_type TEXT NOT NULL DEFAULT 'Cinema', -- 'Cinema', 'Streaming', 'Festival', 'Especial', 'Relançamento'
  distributor TEXT,
  notes TEXT,
  status content_status DEFAULT 'published' NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir existência de colunas temporais caso a tabela já existisse com schema simplificado
ALTER TABLE public.estreias ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.estreias ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.estreias ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Brasil';
ALTER TABLE public.estreias ADD COLUMN IF NOT EXISTS release_type TEXT NOT NULL DEFAULT 'Cinema';

-- ------------------------------------------------------------------------------
-- 2. ÍNDICES DE ALTA PERFORMANCE (IDEMPOTENTES)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_estreias_film_id ON public.estreias(film_id);
CREATE INDEX IF NOT EXISTS idx_estreias_date ON public.estreias(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_estreias_status ON public.estreias(status);
CREATE INDEX IF NOT EXISTS idx_estreias_status_dates ON public.estreias(status, published_at, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_estreias_release_type ON public.estreias(release_type);

-- ------------------------------------------------------------------------------
-- 3. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA (updated_at)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_estreias_updated_at ON public.estreias;
CREATE TRIGGER set_estreias_updated_at
  BEFORE UPDATE ON public.estreias
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.estreias ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Pública: apenas estreias publicadas ou agendadas cujo horário já passou
DROP POLICY IF EXISTS "Public read published estreias" ON public.estreias;
CREATE POLICY "Public read published estreias" ON public.estreias
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND (published_at IS NULL OR published_at <= timezone('utc'::text, now()))) OR
    (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= timezone('utc'::text, now()))
  );

-- Política de Leitura Administrativa: administradores leem todos os status
DROP POLICY IF EXISTS "Admin read all estreias" ON public.estreias;
CREATE POLICY "Admin read all estreias" ON public.estreias
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Política de Escrita Administrativa: apenas administradores autenticados podem criar/editar/excluir
DROP POLICY IF EXISTS "Admin only write estreias" ON public.estreias;
CREATE POLICY "Admin only write estreias" ON public.estreias
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. CONCESSÃO DE PRIVILÉGIOS (GRANTS MÍNIMOS E EXPLÍCITOS)
-- ------------------------------------------------------------------------------
GRANT SELECT ON TABLE public.estreias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.estreias TO authenticated;
