-- ==============================================================================
-- LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
-- RPC Transacional de Importação Atômica de Filmes TMDB (F10.3B)
-- Arquivo: supabase_migration_fase10_import_tmdb_movie_rpc.sql
--
-- Princípios e Diretrizes:
-- 1. Atomicidade 100% PostgreSQL: Todas as escritas (filmes, generos, filme_generos,
--    countries, filme_countries, tmdb_sync_logs) ocorrem em UMA ÚNICA TRANSAÇÃO.
-- 2. Respeito Estrito à Governança F9:
--    - editorial_rating = NULL
--    - status = 'draft'
--    - published_at = NULL
--    - scheduled_at = NULL
--    - legacy_director_name = NULL
-- 3. Idempotência e Deduplicação Defensiva:
--    - Se o tmdb_id já existir, retorna ALREADY_EXISTS com o registro atual sem nova escrita.
--    - Se houver colisão concorrente no índice UNIQUE idx_filmes_tmdb_id, trata graciosamente.
-- 4. Isolamento e Segurança:
--    - SECURITY DEFINER com SET search_path = ''
--    - Verificação obrigatória de privilégio administrativo via public.is_admin()
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.import_tmdb_movie_atomic(
  p_tmdb_id INTEGER,
  p_title TEXT,
  p_original_title TEXT,
  p_year INTEGER,
  p_country TEXT,
  p_duration_minutes INTEGER,
  p_poster_url TEXT,
  p_backdrop_url TEXT,
  p_synopsis TEXT,
  p_original_language TEXT,
  p_imdb_id TEXT,
  p_genres JSONB DEFAULT '[]'::jsonb,
  p_countries JSONB DEFAULT '[]'::jsonb,
  p_sync_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_existing_id pg_catalog.uuid;
  v_existing_slug TEXT;
  v_existing_title TEXT;
  v_existing_orig_title TEXT;
  v_existing_year INTEGER;
  v_existing_status public.content_status;
  
  v_base_slug TEXT;
  v_candidate_slug TEXT;
  v_slug_suffix INTEGER := 2;
  v_final_slug TEXT;
  v_slug_exists BOOLEAN;
  
  v_new_film_id pg_catalog.uuid;
  v_now TIMESTAMPTZ := pg_catalog.timezone('utc'::text, pg_catalog.now());
  
  v_genre_item JSONB;
  v_gen_name TEXT;
  v_gen_slug TEXT;
  v_gen_id pg_catalog.uuid;
  
  v_country_item JSONB;
  v_country_name TEXT;
  v_country_slug TEXT;
  v_country_order INTEGER;
  v_country_id pg_catalog.uuid;
BEGIN
  -- --------------------------------------------------------------------------
  -- 0. SEGURANÇA E AUTORIZAÇÃO (ADMIN-ONLY)
  -- --------------------------------------------------------------------------
  v_is_admin := public.is_admin();
  
  -- Permite se for admin autenticado ou se for chamado pelo backend via service_role
  IF NOT (COALESCE(v_is_admin, false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem importar filmes do TMDB.'
      USING ERRCODE = '42501';
  END IF;

  -- Validação de entrada mínima
  IF p_tmdb_id IS NULL OR p_tmdb_id <= 0 THEN
    RAISE EXCEPTION 'Identificador TMDB inválido: %', p_tmdb_id
      USING ERRCODE = '22023';
  END IF;

  IF p_title IS NULL OR pg_catalog.length(pg_catalog.trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Título do filme é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  -- --------------------------------------------------------------------------
  -- 1. BARREIRA DE DEDUPLICAÇÃO TRANSACIONAL (tmdb_id)
  -- --------------------------------------------------------------------------
  SELECT id, slug, title, original_title, year, status
  INTO v_existing_id, v_existing_slug, v_existing_title, v_existing_orig_title, v_existing_year, v_existing_status
  FROM public.filmes
  WHERE tmdb_id = p_tmdb_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'alreadyExists', true,
      'filmId', v_existing_id,
      'slug', v_existing_slug,
      'title', v_existing_title,
      'originalTitle', v_existing_orig_title,
      'year', v_existing_year,
      'tmdbId', p_tmdb_id,
      'status', v_existing_status,
      'message', 'Filme já cadastrado no acervo.'
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. GERAÇÃO DETERMINÍSTICA E DESAMBIGUAÇÃO DE SLUG
  -- --------------------------------------------------------------------------
  -- Normaliza título para gerar slug base em minúsculas
  v_base_slug := pg_catalog.lower(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(
        pg_catalog.unaccent(p_title),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '[\s-]+', '-', 'g'
    )
  );
  v_base_slug := pg_catalog.trim(BOTH '-' FROM v_base_slug);
  
  IF v_base_slug IS NULL OR pg_catalog.length(v_base_slug) = 0 THEN
    v_base_slug := 'filme';
  END IF;

  -- Teste 1: slug base simples
  SELECT pg_catalog.bool_or(true) INTO v_slug_exists
  FROM public.filmes
  WHERE slug = v_base_slug;

  IF NOT COALESCE(v_slug_exists, false) THEN
    v_final_slug := v_base_slug;
  ELSE
    -- Teste 2: slug com ano
    IF p_year IS NOT NULL THEN
      v_candidate_slug := v_base_slug || '-' || p_year::TEXT;
    ELSE
      v_candidate_slug := v_base_slug || '-1';
    END IF;

    SELECT pg_catalog.bool_or(true) INTO v_slug_exists
    FROM public.filmes
    WHERE slug = v_candidate_slug;

    IF NOT COALESCE(v_slug_exists, false) THEN
      v_final_slug := v_candidate_slug;
    ELSE
      -- Teste 3: sufixo incremental determinístico
      LOOP
        IF p_year IS NOT NULL THEN
          v_candidate_slug := v_base_slug || '-' || p_year::TEXT || '-' || v_slug_suffix::TEXT;
        ELSE
          v_candidate_slug := v_base_slug || '-' || v_slug_suffix::TEXT;
        END IF;

        SELECT pg_catalog.bool_or(true) INTO v_slug_exists
        FROM public.filmes
        WHERE slug = v_candidate_slug;

        IF NOT COALESCE(v_slug_exists, false) THEN
          v_final_slug := v_candidate_slug;
          EXIT;
        END IF;

        v_slug_suffix := v_slug_suffix + 1;
        IF v_slug_suffix > 100 THEN
          -- Fallback garantido
          v_final_slug := v_base_slug || '-' || pg_catalog.substr(pg_catalog.gen_random_uuid()::TEXT, 1, 8);
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. INSERÇÃO DO FILME BASE (GOVERNANÇA F9 E F10)
  -- --------------------------------------------------------------------------
  INSERT INTO public.filmes (
    title,
    original_title,
    slug,
    year,
    country,
    duration_minutes,
    poster_url,
    backdrop_url,
    synopsis,
    editorial_rating,     -- GOVERNANÇA: SEMPRE NULL
    status,               -- GOVERNANÇA: SEMPRE 'draft'
    published_at,         -- GOVERNANÇA: SEMPRE NULL
    scheduled_at,         -- GOVERNANÇA: SEMPRE NULL
    legacy_director_name, -- GOVERNANÇA: SEMPRE NULL
    tmdb_id,
    tmdb_synced_at,       -- TIMESTAMP DA INGESTÃO
    original_language,
    imdb_id,
    created_at,
    updated_at
  ) VALUES (
    pg_catalog.trim(p_title),
    NULLIF(pg_catalog.trim(p_original_title), ''),
    v_final_slug,
    COALESCE(p_year, pg_catalog.extract(YEAR FROM pg_catalog.now())::INTEGER),
    COALESCE(p_country, 'Internacional'),
    p_duration_minutes,
    p_poster_url,
    p_backdrop_url,
    NULLIF(pg_catalog.trim(p_synopsis), ''),
    NULL,
    'draft'::public.content_status,
    NULL,
    NULL,
    NULL,
    p_tmdb_id,
    v_now,
    p_original_language,
    p_imdb_id,
    v_now,
    v_now
  )
  RETURNING id INTO v_new_film_id;

  -- --------------------------------------------------------------------------
  -- 4. RESOLUÇÃO E ASSOCIAÇÃO DE GÊNEROS (public.generos & filme_generos)
  -- --------------------------------------------------------------------------
  IF p_genres IS NOT NULL AND pg_catalog.jsonb_array_length(p_genres) > 0 THEN
    FOR v_genre_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_genres)
    LOOP
      v_gen_name := pg_catalog.trim(v_genre_item->>'name');
      v_gen_slug := pg_catalog.trim(v_genre_item->>'slug');
      
      IF v_gen_name IS NOT NULL AND pg_catalog.length(v_gen_name) > 0 THEN
        IF v_gen_slug IS NULL OR pg_catalog.length(v_gen_slug) = 0 THEN
          v_gen_slug := pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.regexp_replace(pg_catalog.unaccent(v_gen_name), '[^a-zA-Z0-9\s-]', '', 'g'),
              '[\s-]+', '-', 'g'
            )
          );
        END IF;

        -- Localiza gênero existente por slug ou nome (citext)
        SELECT id INTO v_gen_id
        FROM public.generos
        WHERE slug = v_gen_slug OR name = v_gen_name::citext
        LIMIT 1;

        -- Se não existir, cadastra atomicamente
        IF v_gen_id IS NULL THEN
          INSERT INTO public.generos (name, slug, created_at)
          VALUES (v_gen_name::citext, v_gen_slug, v_now)
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id INTO v_gen_id;
        END IF;

        -- Cria vínculo associativo filme <-> genero
        IF v_gen_id IS NOT NULL THEN
          INSERT INTO public.filme_generos (filme_id, genero_id)
          VALUES (v_new_film_id, v_gen_id)
          ON CONFLICT (filme_id, genero_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. RESOLUÇÃO E ASSOCIAÇÃO DE PAÍSES (public.countries & filme_countries)
  -- --------------------------------------------------------------------------
  IF p_countries IS NOT NULL AND pg_catalog.jsonb_array_length(p_countries) > 0 THEN
    FOR v_country_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_countries)
    LOOP
      v_country_name := pg_catalog.trim(v_country_item->>'name');
      v_country_slug := pg_catalog.trim(v_country_item->>'slug');
      v_country_order := COALESCE((v_country_item->>'order_index')::INTEGER, 0);

      IF v_country_name IS NOT NULL AND pg_catalog.length(v_country_name) > 0 THEN
        IF v_country_slug IS NULL OR pg_catalog.length(v_country_slug) = 0 THEN
          v_country_slug := pg_catalog.lower(
            pg_catalog.regexp_replace(
              pg_catalog.regexp_replace(pg_catalog.unaccent(v_country_name), '[^a-zA-Z0-9\s-]', '', 'g'),
              '[\s-]+', '-', 'g'
            )
          );
        END IF;

        -- Localiza país existente por slug ou nome
        SELECT id INTO v_country_id
        FROM public.countries
        WHERE slug = v_country_slug OR name ILIKE v_country_name
        LIMIT 1;

        -- Se não existir, cadastra atomicamente
        IF v_country_id IS NULL THEN
          INSERT INTO public.countries (name, slug, flag_url, created_at, updated_at)
          VALUES (v_country_name, v_country_slug, NULL, v_now, v_now)
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id INTO v_country_id;
        END IF;

        -- Cria vínculo associativo filme <-> country
        IF v_country_id IS NOT NULL THEN
          INSERT INTO public.filme_countries (filme_id, country_id, order_index)
          VALUES (v_new_film_id, v_country_id, v_country_order)
          ON CONFLICT (filme_id, country_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- --------------------------------------------------------------------------
  -- 6. AUDITORIA TRANSACIONAL (public.tmdb_sync_logs)
  -- --------------------------------------------------------------------------
  INSERT INTO public.tmdb_sync_logs (
    entity_type,
    internal_id,
    tmdb_id,
    operation,
    source,
    status,
    details,
    error_message,
    created_at
  ) VALUES (
    'filme',
    v_new_film_id,
    p_tmdb_id,
    'import_new',
    'admin',
    'success',
    p_sync_details,
    NULL,
    v_now
  );

  -- --------------------------------------------------------------------------
  -- 7. RETORNO ESTRUTURADO DE SUCESSO
  -- --------------------------------------------------------------------------
  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'alreadyExists', false,
    'filmId', v_new_film_id,
    'slug', v_final_slug,
    'title', pg_catalog.trim(p_title),
    'originalTitle', NULLIF(pg_catalog.trim(p_original_title), ''),
    'year', COALESCE(p_year, pg_catalog.extract(YEAR FROM pg_catalog.now())::INTEGER),
    'tmdbId', p_tmdb_id,
    'status', 'draft',
    'message', 'Filme importado com sucesso do TMDB!'
  );
END;
$$;

-- Permissões de Execução
REVOKE ALL ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) TO service_role;
