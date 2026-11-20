-- F10.5B: apply the slug policy already used by the credit preview.
-- Limit the change to the installed C3B slug block and retain the function's
-- identity, grants, security settings and all other reconciliation logic.
DO $migration$
DECLARE
  definition text := pg_catalog.replace(
    pg_catalog.pg_get_functiondef('public.sync_film_credits_from_tmdb(uuid,integer,jsonb,jsonb,jsonb,uuid)'::regprocedure),
    E'\r\n', E'\n'
  );
  previous_block text := $old$      -- Geração do slug canônico via helper determinístico public.transliterate_slug
      v_base_slug := pg_catalog.btrim(public.transliterate_slug(v_person_name), '-');
      IF v_base_slug IS NULL OR v_base_slug = '' THEN
        RAISE EXCEPTION 'Não foi possível gerar um slug canônico válido a partir do nome factual "%" da pessoa TMDB #%.',
          v_person_name, v_tmdb_person_id
          USING ERRCODE = '22023';
      END IF;

      v_new_slug := v_base_slug;$old$;
  replacement_block text := $new$      -- F10.5B: preserve the proposed slug if it belongs to this TMDB person.
      v_base_slug := COALESCE(NULLIF(pg_catalog.btrim(public.transliterate_slug(v_person_name), '-'), ''), 'pessoa')
        || '-tmdb-' || v_tmdb_person_id::text;
      v_new_slug := v_create_item->>'slug';
      IF v_new_slug IS NULL OR v_new_slug !~ (
        '^[a-z0-9]+(-[a-z0-9]+)*-tmdb-' || v_tmdb_person_id::text || '(-([2-9]|[1-9][0-9]+))?$'
      ) THEN
        v_new_slug := v_base_slug;
      ELSE
        v_base_slug := pg_catalog.regexp_replace(v_new_slug, '(-tmdb-' || v_tmdb_person_id::text || ')-[0-9]+$', '\1');
      END IF;$new$;
  block_start integer;
  block_end integer;
  installed_block text;
BEGIN
  IF pg_catalog.strpos(definition, pg_catalog.ltrim(replacement_block)) > 0 THEN
    RETURN;
  END IF;
  block_start := pg_catalog.strpos(definition, '-- Geração do slug canônico via helper determinístico public.transliterate_slug');
  block_end := pg_catalog.strpos(definition, 'v_new_slug := v_base_slug;');
  IF block_start = 0 OR block_end <= block_start THEN
    RAISE EXCEPTION 'Installed credit RPC differs from the expected C3B slug block';
  END IF;
  installed_block := pg_catalog.substr(definition, block_start, block_end - block_start + pg_catalog.length('v_new_slug := v_base_slug;'));
  IF pg_catalog.regexp_replace(installed_block, '[[:space:]]+', ' ', 'g')
      <> pg_catalog.regexp_replace(pg_catalog.ltrim(previous_block), '[[:space:]]+', ' ', 'g') THEN
    RAISE EXCEPTION 'Installed credit RPC differs from the expected C3B slug block';
  END IF;
  EXECUTE pg_catalog.replace(definition, installed_block, pg_catalog.ltrim(replacement_block));
END;
$migration$;
