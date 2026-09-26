-- ==============================================================================
-- LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
-- ETAPA F10.4E-C3C: ROLLBACK AUTOCONTIDO DA RPC DE CRÉDITOS E PESSOAS (C3B -> C1)
-- Arquivo: supabase_migration_fase10_sync_film_credits_rpc_c3b_rollback.sql
--
-- Finalidade:
-- Restaura integralmente o estado do banco imediatamente anterior à instalação C3B.
-- 1. Remove a função auxiliar public.normalize_credit_character_for_matching(TEXT).
-- 2. Restaura a versão canônica C1 de public.sync_film_credits_from_tmdb(...)
-- 3. Restaura exatamente as permissões e grants anteriores.
-- 4. NÃO remove o índice uq_film_credits_logical.
-- 5. NÃO executa DELETE, UPDATE ou INSERT de dados de acervo.
-- 6. NÃO altera Storage.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REMOVER HELPER INTRODUZIDO NA C3B (SEM CASCADE)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.normalize_credit_character_for_matching(TEXT);


-- ------------------------------------------------------------------------------
-- 2. RESTAURAR FUNÇÃO RPC CANÔNICA C1: public.sync_film_credits_from_tmdb
-- Assinatura Canônica (6 argumentos):
-- (UUID, INTEGER, JSONB, JSONB, JSONB, UUID) -> JSONB
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
  
  -- Contadores semânticos
  v_created_people_count INTEGER := 0;
  v_linked_people_count INTEGER := 0;
  v_inserted_credits_count INTEGER := 0;
  v_updated_credits_count INTEGER := 0;
  v_unchanged_credits_count INTEGER := 0;

  -- Estruturas em memória para resolução e verificação anti-contradição
  v_person_map JSONB := '{}'::jsonb;         -- tmdb_id -> person_uuid
  v_link_tmdb_seen JSONB := '{}'::jsonb;     -- tmdb_id -> local_person_id
  v_link_local_seen JSONB := '{}'::jsonb;    -- local_person_id -> tmdb_id
  v_create_tmdb_seen JSONB := '{}'::jsonb;   -- tmdb_id -> true
BEGIN
  -- 1. Validar privilégio de administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem sincronizar créditos via TMDB.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Validar parâmetros de entrada básicos
  IF p_film_id IS NULL THEN
    RAISE EXCEPTION 'p_film_id não pode ser nulo.' USING ERRCODE = '22023';
  END IF;

  IF p_tmdb_id IS NULL OR p_tmdb_id <= 0 THEN
    RAISE EXCEPTION 'p_tmdb_id deve ser um inteiro positivo válido.' USING ERRCODE = '22023';
  END IF;

  -- 3. Validar tipo dos JSONs de entrada (devem ser arrays estritos)
  IF p_persons_to_link IS NOT NULL AND jsonb_typeof(p_persons_to_link) <> 'array' THEN
    RAISE EXCEPTION 'p_persons_to_link deve ser um array JSON.' USING ERRCODE = '22023';
  END IF;

  IF p_persons_to_create IS NOT NULL AND jsonb_typeof(p_persons_to_create) <> 'array' THEN
    RAISE EXCEPTION 'p_persons_to_create deve ser um array JSON.' USING ERRCODE = '22023';
  END IF;

  IF p_credits_to_sync IS NOT NULL AND jsonb_typeof(p_credits_to_sync) <> 'array' THEN
    RAISE EXCEPTION 'p_credits_to_sync deve ser um array JSON.' USING ERRCODE = '22023';
  END IF;

  -- 4. Bloqueio pessimista no filme pai para serializar concorrência (FOR UPDATE)
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
  -- 5. PROCESSAR VINCULAÇÃO DE PESSOAS EXISTENTES (LINK_EXISTING) COM HARDENING
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

      -- Validação anti-contradição no próprio payload:
      -- A. Mesmo tmdb_person_id apontando para múltiplos local_person_id
      IF v_link_tmdb_seen ? v_tmdb_person_id::text THEN
        IF (v_link_tmdb_seen->>v_tmdb_person_id::text)::UUID <> v_target_local_id THEN
          RAISE EXCEPTION 'Contradição no payload: o TMDB ID #% foi associado a múltiplos UUIDs locais em p_persons_to_link.',
            v_tmdb_person_id USING ERRCODE = '22023';
        END IF;
      ELSE
        v_link_tmdb_seen := jsonb_set(v_link_tmdb_seen, ARRAY[v_tmdb_person_id::text], to_jsonb(v_target_local_id::text));
      END IF;

      -- B. Mesmo local_person_id apontando para múltiplos tmdb_person_id
      IF v_link_local_seen ? v_target_local_id::text THEN
        IF (v_link_local_seen->>v_target_local_id::text)::INTEGER <> v_tmdb_person_id THEN
          RAISE EXCEPTION 'Contradição no payload: a pessoa local % foi associada a múltiplos TMDB IDs em p_persons_to_link.',
            v_target_local_id USING ERRCODE = '22023';
        END IF;
      ELSE
        v_link_local_seen := jsonb_set(v_link_local_seen, ARRAY[v_target_local_id::text], to_jsonb(v_tmdb_person_id));
      END IF;

      -- Bloquear linha da pessoa local no banco (FOR UPDATE)
      SELECT id, name, slug, tmdb_id
      INTO v_existing_person
      FROM public.pessoas
      WHERE id = v_target_local_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Pessoa local para vinculação não encontrada no banco (ID: %).', v_target_local_id
          USING ERRCODE = 'P0002';
      END IF;

      -- Se a pessoa já possui outro tmdb_id diferente no banco, abortar
      IF v_existing_person.tmdb_id IS NOT NULL AND v_existing_person.tmdb_id <> v_tmdb_person_id THEN
        RAISE EXCEPTION 'Pessoa "%" (ID: %) já possui tmdb_id diferente (#%) registrado. Conflito de identidade.',
          v_existing_person.name, v_target_local_id, v_existing_person.tmdb_id
          USING ERRCODE = '23505';
      END IF;

      -- Verificar se o tmdb_id de destino já está vinculado a OUTRA pessoa local no banco
      SELECT id INTO v_other_person_id
      FROM public.pessoas
      WHERE tmdb_id = v_tmdb_person_id AND id <> v_target_local_id;

      IF v_other_person_id IS NOT NULL THEN
        RAISE EXCEPTION 'O identificador TMDB #% já está vinculado a outra pessoa no acervo (ID: %).',
          v_tmdb_person_id, v_other_person_id
          USING ERRCODE = '23505';
      END IF;

      -- Se ainda não estiver vinculado, atualizar unicamente a âncora tmdb_id
      -- Preserva integralmente: bio, editorial_profile, is_editorial_profile, slug, status, published_at, scheduled_at
      -- Mantém tmdb_synced_at = NULL (vínculo de âncora não constitui sync factual destrutivo)
      IF v_existing_person.tmdb_id IS NULL THEN
        UPDATE public.pessoas
        SET
          tmdb_id = v_tmdb_person_id,
          updated_at = timezone('utc'::text, now())
        WHERE id = v_target_local_id;

        v_linked_people_count := v_linked_people_count + 1;

        -- Registrar log individual imutável de vinculação de pessoa
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
            'user_id', p_user_id,
            'name', v_existing_person.name,
            'action', 'LINK_EXISTING'
          ),
          NULL,
          timezone('utc'::text, now())
        );
      END IF;

      -- Registrar no mapa de resolução em memória para os créditos da transação
      v_person_map := jsonb_set(v_person_map, ARRAY[v_tmdb_person_id::text], to_jsonb(v_target_local_id::text));
    END LOOP;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 6. PROCESSAR CRIAÇÃO DE NOVAS PESSOAS (CREATE_NEW) COM HARDENING
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

      -- Rejeitar se estiver simultaneamente em p_persons_to_link
      IF v_link_tmdb_seen ? v_tmdb_person_id::text THEN
        RAISE EXCEPTION 'Contradição no payload: TMDB ID #% está simultaneamente em p_persons_to_link e p_persons_to_create.',
          v_tmdb_person_id USING ERRCODE = '22023';
      END IF;

      -- Rejeitar duplicidade dentro de p_persons_to_create
      IF v_create_tmdb_seen ? v_tmdb_person_id::text THEN
        RAISE EXCEPTION 'Contradição no payload: TMDB ID #% duplicado em p_persons_to_create.',
          v_tmdb_person_id USING ERRCODE = '22023';
      ELSE
        v_create_tmdb_seen := jsonb_set(v_create_tmdb_seen, ARRAY[v_tmdb_person_id::text], 'true'::jsonb);
      END IF;

      -- Se já existir pessoa com este tmdb_id no banco, NÃO converter silenciosamente:
      -- Abortar imediatamente com conflito de reconciliação (decisão stale)
      SELECT id, name INTO v_existing_person
      FROM public.pessoas
      WHERE tmdb_id = v_tmdb_person_id;

      IF FOUND THEN
        RAISE EXCEPTION 'Conflito de Reconciliação: a pessoa TMDB #% ("%") já existe no acervo (ID: %). A decisão CREATE_NEW tornou-se obsoleta. Reconciliação abortada para reavaliação.',
          v_tmdb_person_id, v_existing_person.name, v_existing_person.id
          USING ERRCODE = '23505';
      END IF;

      -- Gerar novo UUID
      v_resolved_person_id := extensions.uuid_generate_v4();

      -- Gerar slug determinístico anti-colisão
      v_base_slug := COALESCE(NULLIF(TRIM(v_create_item->>'slug'), ''), 'pessoa');
      v_new_slug := v_base_slug;
      v_slug_suffix := 1;

      WHILE EXISTS (SELECT 1 FROM public.pessoas WHERE slug = v_new_slug) LOOP
        v_slug_suffix := v_slug_suffix + 1;
        v_new_slug := v_base_slug || '-' || v_slug_suffix::text;
      END LOOP;

      -- Inserir nova pessoa:
      -- - status estritamente 'draft'
      -- - editorial_profile nulo, is_editorial_profile = false
      -- - primary_roles neutro em gênero ('Elenco' para Acting)
      -- - tmdb_synced_at preenchido porque CREATE_NEW constitui importação factual inicial
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
        COALESCE(NULLIF(TRIM(v_create_item->>'name'), ''), 'Profissional Sem Nome'),
        v_new_slug,
        NULLIF(TRIM(v_create_item->>'photo_url'), ''),
        NULLIF(TRIM(v_create_item->>'birth_date'), '')::DATE,
        NULLIF(TRIM(v_create_item->>'death_date'), '')::DATE,
        NULLIF(TRIM(v_create_item->>'imdb_id'), ''),
        NULLIF(TRIM(v_create_item->>'bio'), ''),
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

      -- Registrar log individual imutável de criação de nova pessoa
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
          'user_id', p_user_id,
          'name', v_create_item->>'name',
          'action', 'CREATE_NEW'
        ),
        NULL,
        timezone('utc'::text, now())
      );
    END LOOP;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 7. PROCESSAR CRÉDITOS (FILM_CREDITS) COM RESOLUÇÃO ESTREITA E ZERO FALLBACK
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

      -- Resolução de autoridade estrita da pessoa (apenas mapa da transação ou banco por tmdb_id)
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

      -- Department obrigatório sem fallback silencioso
      v_department := NULLIF(TRIM(v_credit_item->>'department'), '');
      IF v_department IS NULL THEN
        RAISE EXCEPTION 'department obrigatório e não pode ser vazio para o crédito da pessoa TMDB #%: %',
          v_tmdb_person_id, v_credit_item
          USING ERRCODE = '22023';
      END IF;

      v_role := NULLIF(TRIM(v_credit_item->>'role'), '');
      v_character_name := NULLIF(TRIM(v_credit_item->>'character_name'), '');

      -- Validação estrita de order_index (obrigatório, não-nulo, numérico inteiro >= 0, sem fallback silencioso)
      IF NOT (v_credit_item ? 'order_index')
         OR v_credit_item->>'order_index' IS NULL
         OR TRIM(v_credit_item->>'order_index') = ''
         OR NOT (v_credit_item->>'order_index' ~ '^[0-9]+$')
      THEN
        RAISE EXCEPTION 'order_index obrigatório e deve ser um número inteiro maior ou igual a zero no crédito da pessoa TMDB #%: %',
          v_tmdb_person_id, v_credit_item
          USING ERRCODE = '22023';
      END IF;

      v_order_index := (v_credit_item->>'order_index')::INTEGER;

      -- Consulta defensiva pelo crédito lógico sob o lock do filme
      SELECT id, order_index INTO v_existing_credit_id, v_existing_order_index
      FROM public.film_credits
      WHERE film_id = p_film_id
        AND person_id = v_resolved_person_id
        AND department = v_department
        AND (COALESCE(role, '')) = (COALESCE(v_role, ''))
        AND (COALESCE(character_name, '')) = (COALESCE(v_character_name, ''));

      IF v_existing_credit_id IS NOT NULL THEN
        -- Atualização idempotente apenas se order_index tiver mudado
        IF v_existing_order_index IS DISTINCT FROM v_order_index THEN
          UPDATE public.film_credits
          SET order_index = v_order_index
          WHERE id = v_existing_credit_id;
          
          v_updated_credits_count := v_updated_credits_count + 1;
        ELSE
          v_unchanged_credits_count := v_unchanged_credits_count + 1;
        END IF;
      ELSE
        -- Inserção de novo crédito estruturado com person_id verificado
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
  -- 8. REGISTRAR LOG DE AUDITORIA CONSOLIDADO DO FILME (TMDB_SYNC_LOGS)
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
      'total_processed_credits', (v_inserted_credits_count + v_updated_credits_count + v_unchanged_credits_count),
      'user_id', p_user_id
    ),
    NULL,
    timezone('utc'::text, now())
  );

  -- 9. Retorno Estruturado com Semântica Clara
  RETURN jsonb_build_object(
    'success', true,
    'filmId', p_film_id,
    'tmdbId', p_tmdb_id,
    'createdPeopleCount', v_created_people_count,
    'linkedPeopleCount', v_linked_people_count,
    'insertedCreditsCount', v_inserted_credits_count,
    'updatedCreditsCount', v_updated_credits_count,
    'unchangedCreditsCount', v_unchanged_credits_count,
    'syncedCreditsCount', (v_inserted_credits_count + v_updated_credits_count + v_unchanged_credits_count),
    'message', format('Créditos sincronizados com sucesso: %s pessoas criadas, %s vinculadas, %s créditos inseridos, %s atualizados, %s inalterados.',
      v_created_people_count, v_linked_people_count, v_inserted_credits_count, v_updated_credits_count, v_unchanged_credits_count)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PERMISSÕES E SEGURANÇA (LEAST PRIVILEGE)
-- Assinatura Canônica Única (6 argumentos): (UUID, INTEGER, JSONB, JSONB, JSONB, UUID)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) FROM anon;

GRANT EXECUTE ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_film_credits_from_tmdb(UUID, INTEGER, JSONB, JSONB, JSONB, UUID) TO service_role;
