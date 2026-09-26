-- ==============================================================================
-- LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
-- ETAPA F10.4E-C3B: HARDENING TRANSACIONAL FINAL DA RPC DE CRÉDITOS E PESSOAS
-- Arquivo: supabase_migration_fase10_sync_film_credits_rpc_c3b.sql
--
-- Lista de Proteções e Hardenings Integrados:
-- 1. Helper determinístico de normalização: public.normalize_credit_character_for_matching.
-- 2. Menor privilégio: helper sem acesso direto para authenticated/anon.
-- 3. Transações serializadas multi-filme via pg_advisory_xact_lock(7105, tmdb_person_id) ASC.
-- 4. Busca de créditos em duas fases (Exata Literal -> Semântica Defensiva de Elenco).
-- 5. Seleção determinística do candidato semântico (COUNT = 1 seguido de LIMIT 1).
-- 6. Aborto rigoroso em caso de ambiguidade semântica (COUNT > 1 -> ERRO 23505).
-- 7. Papéis nulos não tratados como Elenco; restrito a ('Ator', 'Atriz', 'Elenco') não-nulos.
-- 8. Geração canônica de slug via public.transliterate_slug(v_person_name) sem fallback 'pessoa'.
-- 9. Validação estrita de limites de caracteres para todos os campos textuais.
-- 10. Detecção e rejeição de duplicatas lógicas intra-payload.
-- 11. Validação anti-spoofing de p_user_id contra auth.uid().
-- 12. Contadores semânticos expandidos e registro de flag no_op em tmdb_sync_logs.
-- 13. Bloqueio pessimista do filme (FOR UPDATE) e zero DELETE geral.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER DETERMINÍSTICO DE NORMALIZAÇÃO CONSERVADORA DE PERSONAGEM
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_credit_character_for_matching(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_name IS NULL OR pg_catalog.btrim(p_name) = '' THEN ''
    ELSE pg_catalog.btrim(
      pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(p_name)),
          '\s*/\s*',
          ' / ',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  END;
$$;

-- Menor privilégio: fechado para anon e authenticated
REVOKE ALL ON FUNCTION public.normalize_credit_character_for_matching(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_credit_character_for_matching(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.normalize_credit_character_for_matching(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_credit_character_for_matching(TEXT) TO service_role;


-- ------------------------------------------------------------------------------
-- 2. FUNÇÃO RPC TRANSACIONAL PRINCIPAL: public.sync_film_credits_from_tmdb (C3B)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_film_credits_from_tmdb(
  p_film_id UUID,
  p_tmdb_id INTEGER,
  p_persons_to_link JSONB DEFAULT '[]'::jsonb,
  p_persons_to_create JSONB DEFAULT '[]'::jsonb,
  p_credits_to_sync JSONB DEFAULT '[]'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_film RECORD;
  v_link_item JSONB;
  v_create_item JSONB;
  v_credit_item JSONB;
  v_resolved_person_id UUID;
  v_existing_credit_id UUID;
  v_existing_order_index INTEGER;
  v_tmdb_person_id INTEGER;
  v_target_local_id UUID;
  v_other_person_id UUID;
  v_new_slug TEXT;
  v_base_slug TEXT;
  v_slug_suffix INTEGER;
  v_existing_person RECORD;
  v_department TEXT;
  v_role TEXT;
  v_character_name TEXT;
  v_order_index INTEGER;
  v_person_name TEXT;
  v_photo_url TEXT;
  v_imdb_id TEXT;
  v_bio TEXT;
  v_effective_user_id UUID;
  v_semantic_candidate_count INTEGER;
  v_is_semantic_reuse BOOLEAN;
  v_logical_credit_key TEXT;
  
  -- Variáveis de bloqueio de concorrência multi-filme
  v_all_tmdb_person_ids INTEGER[];
  v_lock_tmdb_id INTEGER;

  -- Contadores de operação
  v_created_people_count INTEGER := 0;
  v_linked_people_count INTEGER := 0;
  v_inserted_credits_count INTEGER := 0;
  v_updated_credits_count INTEGER := 0;
  v_unchanged_credits_count INTEGER := 0;
  v_semantic_reused_count INTEGER := 0;

  -- Mapas de integridade em memória
  v_person_map JSONB := '{}'::jsonb;                   -- tmdb_id -> person_uuid
  v_link_tmdb_seen JSONB := '{}'::jsonb;               -- tmdb_id -> local_person_id
  v_link_local_seen JSONB := '{}'::jsonb;              -- local_person_id -> tmdb_id
  v_create_tmdb_seen JSONB := '{}'::jsonb;             -- tmdb_id -> true
  v_seen_credit_ids JSONB := '{}'::jsonb;              -- credit_uuid -> true
  v_seen_incoming_logical_keys JSONB := '{}'::jsonb;   -- logical_key -> true
BEGIN
  -- 1. Validar privilégio de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem sincronizar créditos via TMDB.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validação anti-spoofing de p_user_id
  IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Inconsistência de autorização: p_user_id (%) não corresponde ao usuário autenticado (%).',
      p_user_id, auth.uid()
      USING ERRCODE = '42501';
  END IF;
  v_effective_user_id := COALESCE(auth.uid(), p_user_id);

  -- 3. Validar parâmetros de entrada básicos
  IF p_film_id IS NULL THEN
    RAISE EXCEPTION 'p_film_id não pode ser nulo.' USING ERRCODE = '22023';
  END IF;

  IF p_tmdb_id IS NULL OR p_tmdb_id <= 0 THEN
    RAISE EXCEPTION 'p_tmdb_id deve ser um inteiro positivo válido.' USING ERRCODE = '22023';
  END IF;

  -- 4. Validar formato dos arrays JSON
  IF p_persons_to_link IS NOT NULL AND jsonb_typeof(p_persons_to_link) <> 'array' THEN
    RAISE EXCEPTION 'p_persons_to_link deve ser um array JSON.' USING ERRCODE = '22023';
  END IF;

  IF p_persons_to_create IS NOT NULL AND jsonb_typeof(p_persons_to_create) <> 'array' THEN
    RAISE EXCEPTION 'p_persons_to_create deve ser um array JSON.' USING ERRCODE = '22023';
  END IF;

  IF p_credits_to_sync IS NOT NULL AND jsonb_typeof(p_credits_to_sync) <> 'array' THEN
    RAISE EXCEPTION 'p_credits_to_sync deve ser um array JSON.' USING ERRCODE = '22023';
  END IF;

  -- 5. TRAVAMENTO DETERMINÍSTICO DE CONCORRÊNCIA MULTI-FILME (ADVISORY LOCKS ORDENADOS ASC)
  SELECT ARRAY_AGG(DISTINCT tmdb_id_val ORDER BY tmdb_id_val ASC)
  INTO v_all_tmdb_person_ids
  FROM (
    SELECT (elem->>'tmdb_person_id')::INTEGER AS tmdb_id_val
    FROM jsonb_array_elements(COALESCE(p_persons_to_link, '[]'::jsonb)) AS elem
    WHERE (elem->>'tmdb_person_id') ~ '^[0-9]+$'
    UNION
    SELECT (elem->>'tmdb_person_id')::INTEGER AS tmdb_id_val
    FROM jsonb_array_elements(COALESCE(p_persons_to_create, '[]'::jsonb)) AS elem
    WHERE (elem->>'tmdb_person_id') ~ '^[0-9]+$'
    UNION
    SELECT (elem->>'tmdb_person_id')::INTEGER AS tmdb_id_val
    FROM jsonb_array_elements(COALESCE(p_credits_to_sync, '[]'::jsonb)) AS elem
    WHERE (elem->>'tmdb_person_id') ~ '^[0-9]+$'
  ) AS sub
  WHERE tmdb_id_val > 0;

  IF v_all_tmdb_person_ids IS NOT NULL THEN
    FOREACH v_lock_tmdb_id IN ARRAY v_all_tmdb_person_ids
    LOOP
      PERFORM pg_catalog.pg_advisory_xact_lock(7105, v_lock_tmdb_id);
    END LOOP;
  END IF;

  -- 6. Bloqueio pessimista no filme pai (FOR UPDATE)
  SELECT id, title, slug, tmdb_id, status
  INTO v_film
  FROM public.filmes
  WHERE id = p_film_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Filme com ID "%" não encontrado no banco de dados.', p_film_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_film.tmdb_id IS NULL OR v_film.tmdb_id <> p_tmdb_id THEN
    RAISE EXCEPTION 'Divergência de identificador TMDB do filme (banco: %, parâmetro: %). Reconciliação abortada.',
      v_film.tmdb_id, p_tmdb_id
      USING ERRCODE = '22000';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 7. PROCESSAR VINCULAÇÃO DE PESSOAS EXISTENTES (LINK_EXISTING)
  -- ----------------------------------------------------------------------------
  IF p_persons_to_link IS NOT NULL AND jsonb_array_length(p_persons_to_link) > 0 THEN
    FOR v_link_item IN SELECT * FROM jsonb_array_elements(p_persons_to_link)
    LOOP
      IF jsonb_typeof(v_link_item) <> 'object' THEN
        RAISE EXCEPTION 'Item inválido em p_persons_to_link: esperado objeto JSON.' USING ERRCODE = '22023';
      END IF;

      v_target_local_id := (v_link_item->>'local_person_id')::UUID;
      v_tmdb_person_id := (v_link_item->>'tmdb_person_id')::INTEGER;

      IF v_target_local_id IS NULL THEN
        RAISE EXCEPTION 'local_person_id obrigatório e não nulo em p_persons_to_link: %', v_link_item
          USING ERRCODE = '22023';
      END IF;

      IF v_tmdb_person_id IS NULL OR v_tmdb_person_id <= 0 THEN
        RAISE EXCEPTION 'tmdb_person_id deve ser inteiro positivo em p_persons_to_link: %', v_link_item
          USING ERRCODE = '22023';
      END IF;

      -- Validação anti-contradição 1:N no payload
      IF v_link_tmdb_seen ? v_tmdb_person_id::text THEN
        IF (v_link_tmdb_seen->>v_tmdb_person_id::text)::UUID <> v_target_local_id THEN
          RAISE EXCEPTION 'Contradição no payload: o TMDB ID #% foi associado a múltiplos UUIDs locais em p_persons_to_link.',
            v_tmdb_person_id USING ERRCODE = '22023';
        END IF;
      ELSE
        v_link_tmdb_seen := jsonb_set(v_link_tmdb_seen, ARRAY[v_tmdb_person_id::text], to_jsonb(v_target_local_id::text));
      END IF;

      -- Validação anti-contradição N:1 no payload
      IF v_link_local_seen ? v_target_local_id::text THEN
        IF (v_link_local_seen->>v_target_local_id::text)::INTEGER <> v_tmdb_person_id THEN
          RAISE EXCEPTION 'Contradição no payload: a pessoa local % foi associada a múltiplos TMDB IDs em p_persons_to_link.',
            v_target_local_id USING ERRCODE = '22023';
        END IF;
      ELSE
        v_link_local_seen := jsonb_set(v_link_local_seen, ARRAY[v_target_local_id::text], to_jsonb(v_tmdb_person_id));
      END IF;

      -- Bloquear registro local da pessoa (FOR UPDATE)
      SELECT id, name, slug, tmdb_id
      INTO v_existing_person
      FROM public.pessoas
      WHERE id = v_target_local_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Pessoa local para vinculação não encontrada no banco (ID: %).', v_target_local_id
          USING ERRCODE = 'P0002';
      END IF;

      -- Conflito: pessoa local já tem outro tmdb_id
      IF v_existing_person.tmdb_id IS NOT NULL AND v_existing_person.tmdb_id <> v_tmdb_person_id THEN
        RAISE EXCEPTION 'Pessoa "%" (ID: %) já possui tmdb_id diferente (#%) registrado. Conflito de identidade.',
          v_existing_person.name, v_target_local_id, v_existing_person.tmdb_id
          USING ERRCODE = '23505';
      END IF;

      -- Conflito: tmdb_id já está vinculado a outra pessoa no acervo
      SELECT id INTO v_other_person_id
      FROM public.pessoas
      WHERE tmdb_id = v_tmdb_person_id AND id <> v_target_local_id;

      IF v_other_person_id IS NOT NULL THEN
        RAISE EXCEPTION 'O identificador TMDB #% já está vinculado a outra pessoa no acervo (ID: %).',
          v_tmdb_person_id, v_other_person_id
          USING ERRCODE = '23505';
      END IF;

      -- Atualizar âncora tmdb_id se ainda não preenchida
      IF v_existing_person.tmdb_id IS NULL THEN
        UPDATE public.pessoas
        SET
          tmdb_id = v_tmdb_person_id,
          updated_at = timezone('utc'::text, now())
        WHERE id = v_target_local_id;

        v_linked_people_count := v_linked_people_count + 1;

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
          'pessoa',
          v_target_local_id,
          v_tmdb_person_id,
          'match_manual',
          'admin',
          'success',
          jsonb_build_object(
            'film_id', p_film_id,
            'user_id', v_effective_user_id,
            'name', v_existing_person.name,
            'action', 'LINK_EXISTING'
          ),
          NULL,
          timezone('utc'::text, now())
        );
      END IF;

      v_person_map := jsonb_set(v_person_map, ARRAY[v_tmdb_person_id::text], to_jsonb(v_target_local_id::text));
    END LOOP;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 8. PROCESSAR CRIAÇÃO DE NOVAS PESSOAS (CREATE_NEW)
  -- ----------------------------------------------------------------------------
  IF p_persons_to_create IS NOT NULL AND jsonb_array_length(p_persons_to_create) > 0 THEN
    FOR v_create_item IN SELECT * FROM jsonb_array_elements(p_persons_to_create)
    LOOP
      IF jsonb_typeof(v_create_item) <> 'object' THEN
        RAISE EXCEPTION 'Item inválido em p_persons_to_create: esperado objeto JSON.' USING ERRCODE = '22023';
      END IF;

      v_tmdb_person_id := (v_create_item->>'tmdb_person_id')::INTEGER;

      IF v_tmdb_person_id IS NULL OR v_tmdb_person_id <= 0 THEN
        RAISE EXCEPTION 'tmdb_person_id deve ser inteiro positivo em p_persons_to_create: %', v_create_item
          USING ERRCODE = '22023';
      END IF;

      -- Validação de tamanho e presença de campos textuais
      v_person_name := NULLIF(pg_catalog.btrim(v_create_item->>'name'), '');
      IF v_person_name IS NULL THEN
        RAISE EXCEPTION 'Nome factual obrigatório para criação de pessoa TMDB #% em p_persons_to_create.', v_tmdb_person_id
          USING ERRCODE = '22023';
      END IF;
      IF pg_catalog.length(v_person_name) > 255 THEN
        RAISE EXCEPTION 'Nome da pessoa TMDB #% excede o limite de 255 caracteres.', v_tmdb_person_id
          USING ERRCODE = '22023';
      END IF;

      v_photo_url := NULLIF(pg_catalog.btrim(v_create_item->>'photo_url'), '');
      IF v_photo_url IS NOT NULL AND pg_catalog.length(v_photo_url) > 1000 THEN
        RAISE EXCEPTION 'photo_url da pessoa TMDB #% excede o limite de 1000 caracteres.', v_tmdb_person_id
          USING ERRCODE = '22023';
      END IF;

      v_imdb_id := NULLIF(pg_catalog.btrim(v_create_item->>'imdb_id'), '');
      IF v_imdb_id IS NOT NULL AND pg_catalog.length(v_imdb_id) > 30 THEN
        RAISE EXCEPTION 'imdb_id da pessoa TMDB #% excede o limite de 30 caracteres.', v_tmdb_person_id
          USING ERRCODE = '22023';
      END IF;

      v_bio := NULLIF(pg_catalog.btrim(v_create_item->>'bio'), '');
      IF v_bio IS NOT NULL AND pg_catalog.length(v_bio) > 10000 THEN
        RAISE EXCEPTION 'bio da pessoa TMDB #% excede o limite de 10000 caracteres.', v_tmdb_person_id
          USING ERRCODE = '22023';
      END IF;

      -- Rejeição de conflito LINK x CREATE no mesmo payload
      IF v_link_tmdb_seen ? v_tmdb_person_id::text THEN
        RAISE EXCEPTION 'Contradição no payload: TMDB ID #% está simultaneamente em p_persons_to_link e p_persons_to_create.',
          v_tmdb_person_id USING ERRCODE = '22023';
      END IF;

      -- Rejeição de duplicidade dentro de p_persons_to_create
      IF v_create_tmdb_seen ? v_tmdb_person_id::text THEN
        RAISE EXCEPTION 'Contradição no payload: TMDB ID #% duplicado em p_persons_to_create.',
          v_tmdb_person_id USING ERRCODE = '22023';
      ELSE
        v_create_tmdb_seen := jsonb_set(v_create_tmdb_seen, ARRAY[v_tmdb_person_id::text], 'true'::jsonb);
      END IF;

      -- Rejeição de decisão stale: pessoa já existe no banco com esse tmdb_id
      SELECT id, name INTO v_existing_person
      FROM public.pessoas
      WHERE tmdb_id = v_tmdb_person_id;

      IF FOUND THEN
        RAISE EXCEPTION 'Conflito de Reconciliação: a pessoa TMDB #% ("%") já existe no acervo (ID: %). A decisão CREATE_NEW tornou-se obsoleta. Reconciliação abortada.',
          v_tmdb_person_id, v_existing_person.name, v_existing_person.id
          USING ERRCODE = '23505';
      END IF;

      -- Geração do slug canônico via helper determinístico public.transliterate_slug
      v_base_slug := pg_catalog.btrim(public.transliterate_slug(v_person_name), '-');
      IF v_base_slug IS NULL OR v_base_slug = '' THEN
        RAISE EXCEPTION 'Não foi possível gerar um slug canônico válido a partir do nome factual "%" da pessoa TMDB #%.',
          v_person_name, v_tmdb_person_id
          USING ERRCODE = '22023';
      END IF;

      v_new_slug := v_base_slug;
      v_slug_suffix := 1;

      WHILE EXISTS (SELECT 1 FROM public.pessoas WHERE slug = v_new_slug) LOOP
        v_slug_suffix := v_slug_suffix + 1;
        v_new_slug := v_base_slug || '-' || v_slug_suffix::text;
      END LOOP;

      v_resolved_person_id := extensions.uuid_generate_v4();

      INSERT INTO public.pessoas (
        id,
        name,
        slug,
        photo_url,
        birth_date,
        death_date,
        imdb_id,
        bio,
        editorial_profile,
        is_editorial_profile,
        primary_roles,
        status,
        highlight_home,
        tmdb_id,
        tmdb_synced_at,
        created_at,
        updated_at
      ) VALUES (
        v_resolved_person_id,
        v_person_name,
        v_new_slug,
        v_photo_url,
        NULLIF(pg_catalog.btrim(v_create_item->>'birth_date'), '')::DATE,
        NULLIF(pg_catalog.btrim(v_create_item->>'death_date'), '')::DATE,
        v_imdb_id,
        v_bio,
        NULL,
        false,
        CASE
          WHEN v_create_item->>'known_for_department' = 'Directing' THEN ARRAY['Direção']
          WHEN v_create_item->>'known_for_department' = 'Writing' THEN ARRAY['Roteiro']
          WHEN v_create_item->>'known_for_department' = 'Camera' THEN ARRAY['Fotografia']
          WHEN v_create_item->>'known_for_department' = 'Acting' THEN ARRAY['Elenco']
          ELSE ARRAY[]::text[]
        END,
        'draft'::public.content_status,
        false,
        v_tmdb_person_id,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
      );

      v_person_map := jsonb_set(v_person_map, ARRAY[v_tmdb_person_id::text], to_jsonb(v_resolved_person_id::text));
      v_created_people_count := v_created_people_count + 1;

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
        'pessoa',
        v_resolved_person_id,
        v_tmdb_person_id,
        'import_new',
        'admin',
        'success',
        jsonb_build_object(
          'film_id', p_film_id,
          'user_id', v_effective_user_id,
          'name', v_person_name,
          'action', 'CREATE_NEW'
        ),
        NULL,
        timezone('utc'::text, now())
      );
    END LOOP;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 9. PROCESSAR CRÉDITOS (FILM_CREDITS) COM DUAS FASES DETERMINÍSTICAS
  -- ----------------------------------------------------------------------------
  IF p_credits_to_sync IS NOT NULL AND jsonb_array_length(p_credits_to_sync) > 0 THEN
    FOR v_credit_item IN SELECT * FROM jsonb_array_elements(p_credits_to_sync)
    LOOP
      IF jsonb_typeof(v_credit_item) <> 'object' THEN
        RAISE EXCEPTION 'Item inválido em p_credits_to_sync: esperado objeto JSON.' USING ERRCODE = '22023';
      END IF;

      v_tmdb_person_id := (v_credit_item->>'tmdb_person_id')::INTEGER;

      IF v_tmdb_person_id IS NULL OR v_tmdb_person_id <= 0 THEN
        RAISE EXCEPTION 'tmdb_person_id obrigatório e deve ser inteiro positivo no crédito: %', v_credit_item
          USING ERRCODE = '22023';
      END IF;

      -- Resolução de autoridade da pessoa
      v_resolved_person_id := NULL;
      IF v_person_map ? v_tmdb_person_id::text THEN
        v_resolved_person_id := (v_person_map->>v_tmdb_person_id::text)::UUID;
      ELSE
        SELECT id INTO v_resolved_person_id
        FROM public.pessoas
        WHERE tmdb_id = v_tmdb_person_id;
      END IF;

      IF v_resolved_person_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível resolver a pessoa correspondente ao TMDB ID #% para o crédito: %',
          v_tmdb_person_id, v_credit_item
          USING ERRCODE = '22023';
      END IF;

      -- Department obrigatório e limites de caracteres
      v_department := NULLIF(pg_catalog.btrim(v_credit_item->>'department'), '');
      IF v_department IS NULL THEN
        RAISE EXCEPTION 'department obrigatório e não pode ser vazio para o crédito da pessoa TMDB #%: %',
          v_tmdb_person_id, v_credit_item
          USING ERRCODE = '22023';
      END IF;
      IF pg_catalog.length(v_department) > 100 THEN
        RAISE EXCEPTION 'department do crédito excede o limite de 100 caracteres: %', v_department
          USING ERRCODE = '22023';
      END IF;

      v_role := NULLIF(pg_catalog.btrim(v_credit_item->>'role'), '');
      IF v_role IS NOT NULL AND pg_catalog.length(v_role) > 100 THEN
        RAISE EXCEPTION 'role do crédito excede o limite de 100 caracteres: %', v_role
          USING ERRCODE = '22023';
      END IF;

      v_character_name := NULLIF(pg_catalog.btrim(v_credit_item->>'character_name'), '');
      IF v_character_name IS NOT NULL AND pg_catalog.length(v_character_name) > 255 THEN
        RAISE EXCEPTION 'character_name do crédito excede o limite de 255 caracteres: %', v_character_name
          USING ERRCODE = '22023';
      END IF;

      -- Validação estrita de order_index
      IF NOT (v_credit_item ? 'order_index')
         OR v_credit_item->>'order_index' IS NULL
         OR pg_catalog.btrim(v_credit_item->>'order_index') = ''
         OR NOT (v_credit_item->>'order_index' ~ '^[0-9]+$')
      THEN
        RAISE EXCEPTION 'order_index obrigatório e deve ser um número inteiro >= 0 no crédito da pessoa TMDB #%: %',
          v_tmdb_person_id, v_credit_item
          USING ERRCODE = '22023';
      END IF;

      v_order_index := (v_credit_item->>'order_index')::INTEGER;

      -- Validação de duplicata lógica intra-payload
      v_logical_credit_key := v_tmdb_person_id::text || ':' || v_department || ':' || COALESCE(v_role, '') || ':' || COALESCE(v_character_name, '');
      IF v_seen_incoming_logical_keys ? v_logical_credit_key THEN
        RAISE EXCEPTION 'Contradição no payload: crédito duplicado detectado no mesmo payload para pessoa TMDB #% (depto: "%", papel: "%", personagem: "%").',
          v_tmdb_person_id, v_department, COALESCE(v_role, ''), COALESCE(v_character_name, '')
          USING ERRCODE = '22023';
      END IF;
      v_seen_incoming_logical_keys := jsonb_set(v_seen_incoming_logical_keys, ARRAY[v_logical_credit_key], 'true'::jsonb);

      v_is_semantic_reuse := false;

      -- ========================================================================
      -- FASE 1: CORRESPONDÊNCIA LITERAL EXATA
      -- ========================================================================
      SELECT id, order_index INTO v_existing_credit_id, v_existing_order_index
      FROM public.film_credits
      WHERE film_id = p_film_id
        AND person_id = v_resolved_person_id
        AND department = v_department
        AND (COALESCE(role, '')) = (COALESCE(v_role, ''))
        AND (COALESCE(character_name, '')) = (COALESCE(v_character_name, ''));

      -- ========================================================================
      -- FASE 2: EQUIVALÊNCIA SEMÂNTICA DEFENSIVA (FALLBACK SOMENTE PARA ELENCO)
      -- ========================================================================
      IF v_existing_credit_id IS NULL
         AND v_department = 'Elenco'
         AND v_role IS NOT NULL
         AND v_role IN ('Ator', 'Atriz', 'Elenco')
      THEN
        -- Contar candidatos semânticos conservadores
        SELECT COUNT(*)
        INTO v_semantic_candidate_count
        FROM public.film_credits
        WHERE film_id = p_film_id
          AND person_id = v_resolved_person_id
          AND department = 'Elenco'
          AND role IS NOT NULL
          AND role IN ('Ator', 'Atriz', 'Elenco')
          AND public.normalize_credit_character_for_matching(character_name) = 
              public.normalize_credit_character_for_matching(v_character_name);

        IF v_semantic_candidate_count = 1 THEN
          -- Obter a linha única comprovada determinísticamente
          SELECT id, order_index
          INTO v_existing_credit_id, v_existing_order_index
          FROM public.film_credits
          WHERE film_id = p_film_id
            AND person_id = v_resolved_person_id
            AND department = 'Elenco'
            AND role IS NOT NULL
            AND role IN ('Ator', 'Atriz', 'Elenco')
            AND public.normalize_credit_character_for_matching(character_name) = 
                public.normalize_credit_character_for_matching(v_character_name)
          LIMIT 1;

          v_is_semantic_reuse := true;
          v_semantic_reused_count := v_semantic_reused_count + 1;

        ELSIF v_semantic_candidate_count > 1 THEN
          RAISE EXCEPTION 'Ambiguidade semântica de créditos: foram encontrados % créditos locais de elenco candidatos para a pessoa local % (TMDB #%) no filme %. Reconciliação abortada para evitar atribuição incorreta.',
            v_semantic_candidate_count, v_resolved_person_id, v_tmdb_person_id, p_film_id
            USING ERRCODE = '23505';
        ELSE
          v_existing_credit_id := NULL;
          v_existing_order_index := NULL;
        END IF;
      END IF;

      -- ========================================================================
      -- APLICAÇÃO ATÔMICA DA DECISÃO DO CRÉDITO
      -- ========================================================================
      IF v_existing_credit_id IS NOT NULL THEN
        -- Proteção anti-duplicação de crédito local referenciado
        IF v_seen_credit_ids ? v_existing_credit_id::text THEN
          RAISE EXCEPTION 'Contradição no payload: o crédito local % foi referenciado múltiplas vezes na mesma sincronização.',
            v_existing_credit_id USING ERRCODE = '22023';
        END IF;
        v_seen_credit_ids := jsonb_set(v_seen_credit_ids, ARRAY[v_existing_credit_id::text], 'true'::jsonb);

        -- Preserva 100% dos valores editoriais locais (department, role, character_name)
        IF v_existing_order_index IS DISTINCT FROM v_order_index THEN
          UPDATE public.film_credits
          SET order_index = v_order_index
          WHERE id = v_existing_credit_id;
          
          v_updated_credits_count := v_updated_credits_count + 1;
        ELSE
          v_unchanged_credits_count := v_unchanged_credits_count + 1;
        END IF;
      ELSE
        -- Inserção de novo crédito factual
        INSERT INTO public.film_credits (
          id,
          film_id,
          person_id,
          fallback_person_name,
          department,
          role,
          character_name,
          order_index,
          created_at
        ) VALUES (
          extensions.uuid_generate_v4(),
          p_film_id,
          v_resolved_person_id,
          NULL,
          v_department,
          v_role,
          v_character_name,
          v_order_index,
          timezone('utc'::text, now())
        );

        v_inserted_credits_count := v_inserted_credits_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 10. REGISTRAR LOG DE AUDITORIA CONSOLIDADO DO FILME (TMDB_SYNC_LOGS)
  -- ----------------------------------------------------------------------------
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
    p_film_id,
    p_tmdb_id,
    'sync_credits',
    'admin',
    'success',
    jsonb_build_object(
      'film_id', p_film_id,
      'tmdb_id', p_tmdb_id,
      'created_people_count', v_created_people_count,
      'linked_people_count', v_linked_people_count,
      'inserted_credits_count', v_inserted_credits_count,
      'updated_credits_count', v_updated_credits_count,
      'unchanged_credits_count', v_unchanged_credits_count,
      'semantic_credits_reused', v_semantic_reused_count,
      'total_processed_credits', (v_inserted_credits_count + v_updated_credits_count + v_unchanged_credits_count),
      'no_op', (v_created_people_count = 0 AND v_linked_people_count = 0 AND v_inserted_credits_count = 0 AND v_updated_credits_count = 0),
      'material_changes', (v_created_people_count > 0 OR v_linked_people_count > 0 OR v_inserted_credits_count > 0 OR v_updated_credits_count > 0),
      'user_id', v_effective_user_id
    ),
    NULL,
    timezone('utc'::text, now())
  );

  -- 11. Retorno Estruturado com Semântica Clara
  RETURN jsonb_build_object(
    'success', true,
    'filmId', p_film_id,
    'tmdbId', p_tmdb_id,
    'createdPeopleCount', v_created_people_count,
    'linkedPeopleCount', v_linked_people_count,
    'insertedCreditsCount', v_inserted_credits_count,
    'updatedCreditsCount', v_updated_credits_count,
    'unchangedCreditsCount', v_unchanged_credits_count,
    'semanticCreditsReusedCount', v_semantic_reused_count,
    'syncedCreditsCount', (v_inserted_credits_count + v_updated_credits_count + v_unchanged_credits_count),
    'isNoOp', (v_created_people_count = 0 AND v_linked_people_count = 0 AND v_inserted_credits_count = 0 AND v_updated_credits_count = 0),
    'message', format('Créditos sincronizados com sucesso: %s pessoas criadas, %s vinculadas, %s créditos inseridos, %s atualizados (%s semânticos reutilizados), %s inalterados.',
      v_created_people_count, v_linked_people_count, v_inserted_credits_count, v_updated_credits_count, v_semantic_reused_count, v_unchanged_credits_count)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PERMISSÕES E SEGURANÇA (LEAST PRIVILEGE)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) FROM anon;

GRANT EXECUTE ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) TO service_role;
