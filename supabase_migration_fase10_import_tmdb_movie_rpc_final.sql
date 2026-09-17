-- ==============================================================================
-- LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
-- RPC Transacional de Importação Atômica de Filmes TMDB (F10.3D — DEFINITIVA)
-- Arquivo: supabase_migration_fase10_import_tmdb_movie_rpc_final.sql
--
-- Princípios e Diretrizes Técnicas:
-- 1. Atomicidade e Isolamento Transacional:
--    - Execução atômica no motor PostgreSQL (rollback integral em caso de falha).
--    - Zero 'WHEN OTHERS' para não silenciar erros do banco.
-- 2. Concorrência e Deduplicação Defensiva:
--    - Lock transacional pg_advisory_xact_lock(7103, p_tmdb_id) para serialização de TMDB ID.
--    - Lock transacional pg_advisory_xact_lock(7104, hashtext('slug_' || v_base_slug)) para desambiguação de slug.
--    - Lock transacional pg_advisory_xact_lock(7105, hashtext('genre_' || v_gen_slug)) para inserção de gênero.
--    - Lock transacional pg_advisory_xact_lock(7106, hashtext('country_' || v_country_slug)) para inserção de país.
-- 3. Resolução Segura de Taxonomias:
--    - Localiza e reutiliza entidades existentes sem sobrescrever nomes ou slugs.
-- 4. Rigor Factual:
--    - p_country NOT NULL obrigatório (extraído de production_countries[0]).
--    - p_year NOT NULL obrigatório (extraído de release_date / year).
--    - Zero fallbacks inventados ('Desconhecido', 'Internacional', ano corrente).
-- 5. Governança Editorial Rigorosa:
--    - editorial_rating = NULL (avaliação manual exclusiva).
--    - status = 'draft' (conteúdo privado inicial).
--    - published_at = NULL, scheduled_at = NULL, legacy_director_name = NULL.
-- 6. Segurança e Permissões:
--    - RPC principal com SECURITY DEFINER e SET search_path = ''.
--    - Verificação de autorização administrativa via public.is_admin().
--    - Função auxiliar de transliteração pura (IMMUTABLE STRICT) sem elevação de privilégios.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNÇÃO TRANSLITERADORA AUXILIAR PURA (IMUNE A SEARCH_PATH E EXTENSÕES)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transliterate_slug(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
  SELECT pg_catalog.regexp_replace(
    pg_catalog.regexp_replace(
      pg_catalog.lower(
        pg_catalog.translate(
          p_text,
          'áàâãäåāăąéèêëēĕėęěíìîïĩīĭįıóòôõöøōŏőúùûüũūŭůűųýỳŷÿçćĉċčñńņňÁÀÂÃÄÅĀĂĄÉÈÊËĒĔĖĘĚÍÌÎÏĨĪĬĮİÓÒÔÕÖØŌŎŐÚÙÛÜŨŪŬŮŰŲÝỲŶŸÇĆĈĊČÑŃŅŇ',
          'aaaaaaaaaeeeeeeeeeiiiiiiiiiooooooooouuuuuuuuuuyyyycccccnnnnaaaaaaaaaeeeeeeeeeiiiiiiiiiooooooooouuuuuuuuuuyyyycccccnnnn'
        )
      ),
      '[^a-z0-9\s-]', '', 'g'
    ),
    '[\s-]+', '-', 'g'
  );
$$;

REVOKE ALL ON FUNCTION public.transliterate_slug(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transliterate_slug(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.transliterate_slug(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transliterate_slug(TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 2. RPC PRINCIPAL: public.import_tmdb_movie_atomic
-- ------------------------------------------------------------------------------
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
  -- A. SEGURANÇA E AUTORIZAÇÃO ADMINISTRATIVA
  -- --------------------------------------------------------------------------
  v_is_admin := public.is_admin();
  
  IF NOT (COALESCE(v_is_admin, false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem importar filmes do TMDB.'
      USING ERRCODE = '42501';
  END IF;

  -- --------------------------------------------------------------------------
  -- B. VALIDAÇÃO FACTUAL RÍGIDA DE PARÂMETROS
  -- --------------------------------------------------------------------------
  IF p_tmdb_id IS NULL OR p_tmdb_id <= 0 THEN
    RAISE EXCEPTION 'Identificador TMDB inválido: %', p_tmdb_id
      USING ERRCODE = '22023';
  END IF;

  IF p_title IS NULL OR pg_catalog.length(pg_catalog.trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Título do filme é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  IF p_year IS NULL THEN
    RAISE EXCEPTION 'Ano de lançamento factual é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  IF p_country IS NULL OR pg_catalog.length(pg_catalog.trim(p_country)) = 0 THEN
    RAISE EXCEPTION 'País de produção factual é obrigatório e deve representar a origem do filme.'
      USING ERRCODE = '22023';
  END IF;

  -- --------------------------------------------------------------------------
  -- C. SERIALIZAÇÃO DE CONCORRÊNCIA POR TMDB ID (ADVISORY XACT LOCK)
  -- --------------------------------------------------------------------------
  PERFORM pg_catalog.pg_advisory_xact_lock(7103, p_tmdb_id);

  -- --------------------------------------------------------------------------
  -- D. CHECAGEM DE DEDUPLICAÇÃO PROTEGIDA POR LOCK
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
  -- E. GERAÇÃO DETERMINÍSTICA E DESAMBIGUAÇÃO DE SLUG PROTEGIDA POR LOCK
  -- --------------------------------------------------------------------------
  v_base_slug := pg_catalog.btrim(public.transliterate_slug(p_title), '-');
  
  IF v_base_slug IS NULL OR pg_catalog.length(v_base_slug) = 0 THEN
    v_base_slug := 'filme';
  END IF;

  -- Lock de desambiguação de slug
  PERFORM pg_catalog.pg_advisory_xact_lock(7104, pg_catalog.hashtext('slug_' || v_base_slug));

  SELECT pg_catalog.bool_or(true) INTO v_slug_exists
  FROM public.filmes
  WHERE slug = v_base_slug;

  IF NOT COALESCE(v_slug_exists, false) THEN
    v_final_slug := v_base_slug;
  ELSE
    v_candidate_slug := v_base_slug || '-' || p_year::TEXT;

    SELECT pg_catalog.bool_or(true) INTO v_slug_exists
    FROM public.filmes
    WHERE slug = v_candidate_slug;

    IF NOT COALESCE(v_slug_exists, false) THEN
      v_final_slug := v_candidate_slug;
    ELSE
      LOOP
        v_candidate_slug := v_base_slug || '-' || p_year::TEXT || '-' || v_slug_suffix::TEXT;

        SELECT pg_catalog.bool_or(true) INTO v_slug_exists
        FROM public.filmes
        WHERE slug = v_candidate_slug;

        IF NOT COALESCE(v_slug_exists, false) THEN
          v_final_slug := v_candidate_slug;
          EXIT;
        END IF;

        v_slug_suffix := v_slug_suffix + 1;
        IF v_slug_suffix > 100 THEN
          v_final_slug := v_base_slug || '-' || pg_catalog.substr(pg_catalog.gen_random_uuid()::TEXT, 1, 8);
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- F. INSERÇÃO DO FILME BASE (GOVERNANÇA EDITORIAL E FACTUAL)
  -- --------------------------------------------------------------------------
  BEGIN
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
      p_year,
      pg_catalog.trim(p_country),
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
  EXCEPTION
    WHEN unique_violation THEN
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
      ELSE
        RAISE;
      END IF;
  END;

  -- --------------------------------------------------------------------------
  -- G. RESOLUÇÃO SEGURA DE GÊNEROS (SERIALIZADA POR LOCK)
  -- --------------------------------------------------------------------------
  IF p_genres IS NOT NULL AND pg_catalog.jsonb_array_length(p_genres) > 0 THEN
    FOR v_genre_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_genres)
    LOOP
      v_gen_name := pg_catalog.trim(v_genre_item->>'name');
      v_gen_slug := pg_catalog.trim(v_genre_item->>'slug');
      
      IF v_gen_name IS NOT NULL AND pg_catalog.length(v_gen_name) > 0 THEN
        IF v_gen_slug IS NULL OR pg_catalog.length(v_gen_slug) = 0 THEN
          v_gen_slug := pg_catalog.btrim(public.transliterate_slug(v_gen_name), '-');
        END IF;

        -- 1. Consulta existente por slug ou nome (case-insensitive)
        SELECT id INTO v_gen_id
        FROM public.generos
        WHERE slug = v_gen_slug OR pg_catalog.lower(name::TEXT) = pg_catalog.lower(v_gen_name)
        LIMIT 1;

        -- 2. Se inexistente, adquire lock transacional do gênero
        IF v_gen_id IS NULL THEN
          PERFORM pg_catalog.pg_advisory_xact_lock(7105, pg_catalog.hashtext('genre_' || v_gen_slug));

          -- Reconsulta após aquisição do lock
          SELECT id INTO v_gen_id
          FROM public.generos
          WHERE slug = v_gen_slug OR pg_catalog.lower(name::TEXT) = pg_catalog.lower(v_gen_name)
          LIMIT 1;

          IF v_gen_id IS NULL THEN
            INSERT INTO public.generos (name, slug, created_at)
            VALUES (v_gen_name::public.citext, v_gen_slug, v_now)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_gen_id;

            IF v_gen_id IS NULL THEN
              SELECT id INTO v_gen_id
              FROM public.generos
              WHERE slug = v_gen_slug OR pg_catalog.lower(name::TEXT) = pg_catalog.lower(v_gen_name)
              LIMIT 1;
            END IF;
          END IF;
        END IF;

        -- 3. Vínculo associativo filme <-> gênero
        IF v_gen_id IS NOT NULL THEN
          INSERT INTO public.filme_generos (filme_id, genero_id)
          VALUES (v_new_film_id, v_gen_id)
          ON CONFLICT (filme_id, genero_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- --------------------------------------------------------------------------
  -- H. RESOLUÇÃO SEGURA DE PAÍSES (SERIALIZADA POR LOCK)
  -- --------------------------------------------------------------------------
  IF p_countries IS NOT NULL AND pg_catalog.jsonb_array_length(p_countries) > 0 THEN
    FOR v_country_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_countries)
    LOOP
      v_country_name := pg_catalog.trim(v_country_item->>'name');
      v_country_slug := pg_catalog.trim(v_country_item->>'slug');
      v_country_order := COALESCE((v_country_item->>'order_index')::INTEGER, 0);

      IF v_country_name IS NOT NULL AND pg_catalog.length(v_country_name) > 0 THEN
        IF v_country_slug IS NULL OR pg_catalog.length(v_country_slug) = 0 THEN
          v_country_slug := pg_catalog.btrim(public.transliterate_slug(v_country_name), '-');
        END IF;

        -- 1. Consulta existente por slug ou nome (case-insensitive)
        SELECT id INTO v_country_id
        FROM public.countries
        WHERE slug = v_country_slug OR pg_catalog.lower(name) = pg_catalog.lower(v_country_name)
        LIMIT 1;

        -- 2. Se inexistente, adquire lock transacional do país
        IF v_country_id IS NULL THEN
          PERFORM pg_catalog.pg_advisory_xact_lock(7106, pg_catalog.hashtext('country_' || v_country_slug));

          -- Reconsulta após aquisição do lock
          SELECT id INTO v_country_id
          FROM public.countries
          WHERE slug = v_country_slug OR pg_catalog.lower(name) = pg_catalog.lower(v_country_name)
          LIMIT 1;

          IF v_country_id IS NULL THEN
            INSERT INTO public.countries (name, slug, flag_url, created_at, updated_at)
            VALUES (v_country_name, v_country_slug, NULL, v_now, v_now)
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_country_id;

            IF v_country_id IS NULL THEN
              SELECT id INTO v_country_id
              FROM public.countries
              WHERE slug = v_country_slug OR pg_catalog.lower(name) = pg_catalog.lower(v_country_name)
              LIMIT 1;
            END IF;
          END IF;
        END IF;

        -- 3. Vínculo associativo filme <-> país
        IF v_country_id IS NOT NULL THEN
          INSERT INTO public.filme_countries (filme_id, country_id, order_index)
          VALUES (v_new_film_id, v_country_id, v_country_order)
          ON CONFLICT (filme_id, country_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- --------------------------------------------------------------------------
  -- I. AUDITORIA TRANSACIONAL (public.tmdb_sync_logs)
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
  -- J. RESPOSTA ESTRUTURADA DE SUCESSO
  -- --------------------------------------------------------------------------
  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'alreadyExists', false,
    'filmId', v_new_film_id,
    'slug', v_final_slug,
    'title', pg_catalog.trim(p_title),
    'originalTitle', NULLIF(pg_catalog.trim(p_original_title), ''),
    'year', p_year,
    'tmdbId', p_tmdb_id,
    'status', 'draft',
    'message', 'Filme importado com sucesso do TMDB!'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PERMISSÕES E PRIVILÉGIOS (GRANTS RESTRITOS)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_tmdb_movie_atomic(INTEGER, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) TO service_role;
