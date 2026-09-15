import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ManifestMovie {
  internal_uuid: string;
  local_title: string;
  tmdb_id: number;
  tmdb_title: string;
  tmdb_original_title?: string;
  tmdb_release_date?: string;
  validation_status: string;
}

interface ManifestPerson {
  internal_uuid: string;
  local_name: string;
  tmdb_id: number;
  tmdb_name: string;
  tmdb_known_for_department?: string;
  tmdb_birthday?: string;
  tmdb_deathday?: string;
  validation_status: string;
}

interface Manifest {
  metadata: {
    generated_at: string;
    tmdb_api_authenticated: boolean;
    validation_method: string;
    movies_total: number;
    people_total: number;
    duplicate_movie_ids: number;
    duplicate_person_ids: number;
    invalid_movie_ids: number;
    invalid_person_ids: number;
  };
  movies: ManifestMovie[];
  people: ManifestPerson[];
}

async function main() {
  console.log('=== FASE F9.4: VINCULAÇÃO CONTROLADA DO ACERVO AO TMDB ===\n');

  // 1. CARREGAR E VALIDAR MANIFESTO CANÔNICO
  const manifestPath = path.resolve(process.cwd(), 'acervo_tmdb_link_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found at ${manifestPath}`);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log('1. Validando manifesto canônico:');
  console.log(`   - Filmes no manifesto: ${manifest.movies.length}`);
  console.log(`   - Pessoas no manifesto: ${manifest.people.length}`);

  if (manifest.movies.length !== 11) {
    throw new Error(`Esperado 11 filmes no manifesto, encontrado ${manifest.movies.length}`);
  }
  if (manifest.people.length !== 89) {
    throw new Error(`Esperado 89 pessoas no manifesto, encontrado ${manifest.people.length}`);
  }

  // Verificar se todos são VALID
  const invalidMovies = manifest.movies.filter(m => m.validation_status !== 'VALID' || !m.tmdb_id || m.tmdb_id <= 0);
  const invalidPeople = manifest.people.filter(p => p.validation_status !== 'VALID' || !p.tmdb_id || p.tmdb_id <= 0);

  if (invalidMovies.length > 0 || invalidPeople.length > 0) {
    throw new Error(`Encontrados itens inválidos no manifesto! Filmes: ${invalidMovies.length}, Pessoas: ${invalidPeople.length}`);
  }

  // Verificar duplicidades no manifesto
  const movieTmdbIds = new Set<number>();
  for (const m of manifest.movies) {
    if (movieTmdbIds.has(m.tmdb_id)) throw new Error(`TMDB Movie ID duplicado no manifesto: ${m.tmdb_id}`);
    movieTmdbIds.add(m.tmdb_id);
  }

  const personTmdbIds = new Set<number>();
  for (const p of manifest.people) {
    if (personTmdbIds.has(p.tmdb_id)) throw new Error(`TMDB Person ID duplicado no manifesto: ${p.tmdb_id} (${p.local_name})`);
    personTmdbIds.add(p.tmdb_id);
  }

  console.log('   ✓ 100% dos IDs TMDB são válidos, únicos e com status VALID.\n');

  // 2. PRÉ-VALIDAÇÃO NO SUPABASE
  console.log('2. Executando pré-validação no Supabase:');
  const { data: dbMovies, error: mErr } = await supabase.from('filmes').select('id, slug, legacy_id, title, original_title, year, duration_minutes, tmdb_id, tmdb_synced_at').order('title');
  if (mErr) throw mErr;

  const { data: dbPeople, error: pErr } = await supabase.from('pessoas').select('id, slug, legacy_id, name, birth_date, death_date, country, tmdb_id, tmdb_synced_at').order('name');
  if (pErr) throw pErr;

  console.log(`   - Filmes no banco: ${dbMovies.length}`);
  console.log(`   - Pessoas no banco: ${dbPeople.length}`);

  if (dbMovies.length !== 11) throw new Error(`Esperado 11 filmes no banco, encontrado ${dbMovies.length}`);
  if (dbPeople.length !== 89) throw new Error(`Esperado 89 pessoas no banco, encontrado ${dbPeople.length}`);

  // Verificar se cada UUID do manifesto existe no banco e tmdb_id é atualmente NULL
  const dbMoviesMap = new Map(dbMovies.map(m => [m.id, m]));
  for (const m of manifest.movies) {
    const dbM = dbMoviesMap.get(m.internal_uuid);
    if (!dbM) throw new Error(`Filme do manifesto UUID ${m.internal_uuid} (${m.local_title}) não encontrado no banco!`);
    if (dbM.tmdb_id !== null) console.log(`   * Nota: Filme ${m.local_title} já possui tmdb_id: ${dbM.tmdb_id}`);
  }

  const dbPeopleMap = new Map(dbPeople.map(p => [p.id, p]));
  for (const p of manifest.people) {
    const dbP = dbPeopleMap.get(p.internal_uuid);
    if (!dbP) throw new Error(`Pessoa do manifesto UUID ${p.internal_uuid} (${p.local_name}) não encontrada no banco!`);
    if (dbP.tmdb_id !== null) console.log(`   * Nota: Pessoa ${p.local_name} já possui tmdb_id: ${dbP.tmdb_id}`);
  }

  console.log('   ✓ Todos os 11 filmes e 89 pessoas conferem exatamente com os UUIDs do Supabase.\n');

  // 3. CONSULTAR DEMAIS TABELAS RELACIONADAS PARA O SNAPSHOT
  console.log('3. Coletando dados para acervo_pre_tmdb_link_snapshot.json:');
  const { data: filmCredits } = await supabase.from('film_credits').select('*').order('film_id');
  const { data: filmeGeneros } = await supabase.from('filme_generos').select('*');
  const { data: filmeCountries } = await supabase.from('filme_countries').select('*');
  const { data: criticas } = await supabase.from('criticas').select('id, film_id, slug, editorial_title, legacy_id');
  const { data: estreias } = await supabase.from('estreias').select('id, film_id, country, release_date, release_type');
  const { data: umaImagem } = await supabase.from('uma_imagem').select('id, film_id, slug, title');
  const { data: listas } = await supabase.from('listas').select('id, slug, title');
  const { data: listaItems } = await supabase.from('lista_items').select('id, lista_id, film_id, rank, order_index, note');
  const { data: especiais } = await supabase.from('especiais').select('id, slug, title');
  const { data: especialItems } = await supabase.from('especial_items').select('id, especial_id, item_type, item_id, position');
  const { data: ensaios } = await supabase.from('ensaios').select('id, slug, title');
  const { data: tags } = await supabase.from('tags').select('id, name, slug');
  const { data: generos } = await supabase.from('generos').select('id, name, slug');
  const { data: countries } = await supabase.from('countries').select('id, name, slug');

  const snapshot = {
    snapshot_metadata: {
      generated_at: new Date().toISOString(),
      protocol: 'F9.4_CONTROLLED_TMDB_LINK',
      environment: 'Supabase PostgreSQL Production',
      counts: {
        filmes: dbMovies.length,
        pessoas: dbPeople.length,
        film_credits: filmCredits?.length || 0,
        filme_generos: filmeGeneros?.length || 0,
        filme_countries: filmeCountries?.length || 0,
        criticas: criticas?.length || 0,
        estreias: estreias?.length || 0,
        uma_imagem: umaImagem?.length || 0,
        listas: listas?.length || 0,
        lista_items: listaItems?.length || 0,
        especiais: especiais?.length || 0,
        especial_items: especialItems?.length || 0,
        ensaios: ensaios?.length || 0,
        tags: tags?.length || 0,
        generos: generos?.length || 0,
        countries: countries?.length || 0
      }
    },
    filmes: dbMovies,
    pessoas: dbPeople,
    relations: {
      film_credits: filmCredits || [],
      filme_generos: filmeGeneros || [],
      filme_countries: filmeCountries || [],
      criticas: criticas || [],
      estreias: estreias || [],
      uma_imagem: umaImagem || [],
      listas: listas || [],
      lista_items: listaItems || [],
      especiais: especiais || [],
      especial_items: especialItems || [],
      ensaios: ensaios || []
    }
  };

  const snapshotPath = path.resolve(process.cwd(), 'acervo_pre_tmdb_link_snapshot.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`   ✓ Snapshot gravado com sucesso em: ${snapshotPath}\n`);

  // 4. GERAR SCRIPT SQL DE VINCULAÇÃO (supabase_f9_4_link_tmdb_ids.sql)
  console.log('4. Gerando supabase_f9_4_link_tmdb_ids.sql...');

  const sqlStatements: string[] = [];
  sqlStatements.push(`-- ==============================================================================`);
  sqlStatements.push(`-- LANTERNA MÁGICA — FASE 9.4: VINCULAÇÃO CONTROLADA DO ACERVO AO TMDB`);
  sqlStatements.push(`-- Arquivo: supabase_f9_4_link_tmdb_ids.sql`);
  sqlStatements.push(`-- Origem canônica: acervo_tmdb_link_manifest.json (Homologado F9.3D)`);
  sqlStatements.push(`-- Regras:`);
  sqlStatements.push(`--  1. Preenche EXCLUSIVAMENTE tmdb_id usando internal_uuid como chave de UPDATE.`);
  sqlStatements.push(`--  2. tmdb_synced_at permanece ESTRITAMENTE NULL (não é sincronização de metadados).`);
  sqlStatements.push(`--  3. Preserva 100% dos UUIDs, slugs, créditos, críticas, estreias e relacionamentos.`);
  sqlStatements.push(`--  4. Registra auditoria completa em public.tmdb_sync_logs.`);
  sqlStatements.push(`--  5. Execução atômica e transacional com validação defensiva pré-commit.`);
  sqlStatements.push(`-- ==============================================================================\n`);
  sqlStatements.push(`BEGIN;\n`);

  // Section A: Filmes UPDATEs
  sqlStatements.push(`-- ------------------------------------------------------------------------------`);
  sqlStatements.push(`-- 1. VINCULAÇÃO DE FILMES (11 registros)`);
  sqlStatements.push(`-- ------------------------------------------------------------------------------`);
  for (const m of manifest.movies) {
    const escapedTitle = m.local_title.replace(/'/g, "''");
    sqlStatements.push(`-- Filme: ${m.local_title} (TMDB ID: ${m.tmdb_id})`);
    sqlStatements.push(`UPDATE public.filmes`);
    sqlStatements.push(`SET tmdb_id = ${m.tmdb_id}`);
    sqlStatements.push(`WHERE id = '${m.internal_uuid}'::uuid;`);
    sqlStatements.push(``);
  }

  // Section B: Pessoas UPDATEs
  sqlStatements.push(`-- ------------------------------------------------------------------------------`);
  sqlStatements.push(`-- 2. VINCULAÇÃO DE PESSOAS (89 registros)`);
  sqlStatements.push(`-- ------------------------------------------------------------------------------`);
  for (const p of manifest.people) {
    const escapedName = p.local_name.replace(/'/g, "''");
    sqlStatements.push(`-- Pessoa: ${p.local_name} (TMDB ID: ${p.tmdb_id})`);
    sqlStatements.push(`UPDATE public.pessoas`);
    sqlStatements.push(`SET tmdb_id = ${p.tmdb_id}`);
    sqlStatements.push(`WHERE id = '${p.internal_uuid}'::uuid;`);
    sqlStatements.push(``);
  }

  // Section C: Logs de Auditoria
  sqlStatements.push(`-- ------------------------------------------------------------------------------`);
  sqlStatements.push(`-- 3. REGISTRO DE AUDITORIA EM public.tmdb_sync_logs (100 registros)`);
  sqlStatements.push(`-- ------------------------------------------------------------------------------`);
  for (const m of manifest.movies) {
    const escapedTitle = m.local_title.replace(/'/g, "''");
    const escapedTmdbTitle = m.tmdb_title.replace(/'/g, "''");
    const detailsJson = JSON.stringify({
      local_title: m.local_title,
      tmdb_title: m.tmdb_title,
      tmdb_original_title: m.tmdb_original_title,
      tmdb_release_date: m.tmdb_release_date,
      manifest_validation_status: m.validation_status,
      phase: 'F9.4_LINK'
    }).replace(/'/g, "''");

    sqlStatements.push(`INSERT INTO public.tmdb_sync_logs (`);
    sqlStatements.push(`  entity_type, internal_id, tmdb_id, operation, source, status, details`);
    sqlStatements.push(`) VALUES (`);
    sqlStatements.push(`  'filme', '${m.internal_uuid}'::uuid, ${m.tmdb_id}, 'LINK', 'migration_f9_4', 'success', '${detailsJson}'::jsonb`);
    sqlStatements.push(`);`);
  }

  for (const p of manifest.people) {
    const escapedName = p.local_name.replace(/'/g, "''");
    const escapedTmdbName = p.tmdb_name.replace(/'/g, "''");
    const detailsJson = JSON.stringify({
      local_name: p.local_name,
      tmdb_name: p.tmdb_name,
      tmdb_known_for_department: p.tmdb_known_for_department,
      tmdb_birthday: p.tmdb_birthday,
      manifest_validation_status: p.validation_status,
      phase: 'F9.4_LINK'
    }).replace(/'/g, "''");

    sqlStatements.push(`INSERT INTO public.tmdb_sync_logs (`);
    sqlStatements.push(`  entity_type, internal_id, tmdb_id, operation, source, status, details`);
    sqlStatements.push(`) VALUES (`);
    sqlStatements.push(`  'pessoa', '${p.internal_uuid}'::uuid, ${p.tmdb_id}, 'LINK', 'migration_f9_4', 'success', '${detailsJson}'::jsonb`);
    sqlStatements.push(`);`);
  }

  // Section D: Validação defensiva pré-commit
  sqlStatements.push(`\n-- ------------------------------------------------------------------------------`);
  sqlStatements.push(`-- 4. VALIDAÇÃO DEFENSIVA PRÉ-COMMIT (DO BLOCK COM ASSERTIONS)`);
  sqlStatements.push(`-- ------------------------------------------------------------------------------`);
  sqlStatements.push(`DO $$`);
  sqlStatements.push(`DECLARE`);
  sqlStatements.push(`  v_movies_linked INTEGER;`);
  sqlStatements.push(`  v_people_linked INTEGER;`);
  sqlStatements.push(`  v_movies_synced INTEGER;`);
  sqlStatements.push(`  v_people_synced INTEGER;`);
  sqlStatements.push(`  v_logs_count INTEGER;`);
  sqlStatements.push(`BEGIN`);
  sqlStatements.push(`  -- 1. Validar contagem de filmes com tmdb_id`);
  sqlStatements.push(`  SELECT COUNT(*) INTO v_movies_linked FROM public.filmes WHERE tmdb_id IS NOT NULL;`);
  sqlStatements.push(`  IF v_movies_linked <> 11 THEN`);
  sqlStatements.push(`    RAISE EXCEPTION 'Falha na validação de filmes: esperado 11 vinculados, encontrado %', v_movies_linked;`);
  sqlStatements.push(`  END IF;`);
  sqlStatements.push(``);
  sqlStatements.push(`  -- 2. Validar contagem de pessoas com tmdb_id`);
  sqlStatements.push(`  SELECT COUNT(*) INTO v_people_linked FROM public.pessoas WHERE tmdb_id IS NOT NULL;`);
  sqlStatements.push(`  IF v_people_linked <> 89 THEN`);
  sqlStatements.push(`    RAISE EXCEPTION 'Falha na validação de pessoas: esperado 89 vinculadas, encontrado %', v_people_linked;`);
  sqlStatements.push(`  END IF;`);
  sqlStatements.push(``);
  sqlStatements.push(`  -- 3. Garantir que tmdb_synced_at permanece ESTRITAMENTE NULL`);
  sqlStatements.push(`  SELECT COUNT(*) INTO v_movies_synced FROM public.filmes WHERE tmdb_synced_at IS NOT NULL;`);
  sqlStatements.push(`  IF v_movies_synced > 0 THEN`);
  sqlStatements.push(`    RAISE EXCEPTION 'Violação de protocolo: % filmes possuem tmdb_synced_at preenchido!', v_movies_synced;`);
  sqlStatements.push(`  END IF;`);
  sqlStatements.push(``);
  sqlStatements.push(`  SELECT COUNT(*) INTO v_people_synced FROM public.pessoas WHERE tmdb_synced_at IS NOT NULL;`);
  sqlStatements.push(`  IF v_people_synced > 0 THEN`);
  sqlStatements.push(`    RAISE EXCEPTION 'Violação de protocolo: % pessoas possuem tmdb_synced_at preenchido!', v_people_synced;`);
  sqlStatements.push(`  END IF;`);
  sqlStatements.push(``);
  sqlStatements.push(`  -- 4. Validar logs gerados na sessão`);
  sqlStatements.push(`  SELECT COUNT(*) INTO v_logs_count FROM public.tmdb_sync_logs WHERE source = 'migration_f9_4' AND operation = 'LINK';`);
  sqlStatements.push(`  IF v_logs_count <> 100 THEN`);
  sqlStatements.push(`    RAISE EXCEPTION 'Falha nos logs de auditoria: esperado 100 registros, encontrado %', v_logs_count;`);
  sqlStatements.push(`  END IF;`);
  sqlStatements.push(``);
  sqlStatements.push(`  RAISE NOTICE 'Validação defensiva F9.4 concluída com 100%% de sucesso! Filmes: %, Pessoas: %, Logs: %', v_movies_linked, v_people_linked, v_logs_count;`);
  sqlStatements.push(`END $$;`);
  sqlStatements.push(``);
  sqlStatements.push(`COMMIT;`);

  const sqlLinkContent = sqlStatements.join('\n');
  const sqlLinkPath = path.resolve(process.cwd(), 'supabase_f9_4_link_tmdb_ids.sql');
  fs.writeFileSync(sqlLinkPath, sqlLinkContent, 'utf-8');
  console.log(`   ✓ Script de vinculação SQL gerado: ${sqlLinkPath}`);

  // 5. GERAR SCRIPT DE ROLLBACK (supabase_f9_4_unlink_tmdb_ids_rollback.sql)
  console.log('5. Gerando supabase_f9_4_unlink_tmdb_ids_rollback.sql...');

  const rollbackStatements: string[] = [];
  rollbackStatements.push(`-- ==============================================================================`);
  rollbackStatements.push(`-- LANTERNA MÁGICA — FASE 9.4: SCRIPT DE ROLLBACK E DESVINCULAÇÃO`);
  rollbackStatements.push(`-- Arquivo: supabase_f9_4_unlink_tmdb_ids_rollback.sql`);
  rollbackStatements.push(`-- Regras:`);
  rollbackStatements.push(`--  1. Reverte tmdb_id para NULL EXCLUSIVAMENTE para os UUIDs do acervo existente.`);
  rollbackStatements.push(`--  2. Garante tmdb_synced_at = NULL.`);
  rollbackStatements.push(`--  3. Preserva integralmente todas as entidades, slugs, chaves e relacionamentos.`);
  rollbackStatements.push(`--  4. Registra operação de UNLINK em public.tmdb_sync_logs.`);
  rollbackStatements.push(`-- ==============================================================================\n`);
  rollbackStatements.push(`BEGIN;\n`);

  rollbackStatements.push(`-- 1. Desvincular filmes`);
  const movieUuidsList = manifest.movies.map(m => `'${m.internal_uuid}'::uuid`).join(', ');
  rollbackStatements.push(`UPDATE public.filmes`);
  rollbackStatements.push(`SET tmdb_id = NULL, tmdb_synced_at = NULL`);
  rollbackStatements.push(`WHERE id IN (${movieUuidsList});\n`);

  rollbackStatements.push(`-- 2. Desvincular pessoas`);
  const personUuidsList = manifest.people.map(p => `'${p.internal_uuid}'::uuid`).join(',\n    ');
  rollbackStatements.push(`UPDATE public.pessoas`);
  rollbackStatements.push(`SET tmdb_id = NULL, tmdb_synced_at = NULL`);
  rollbackStatements.push(`WHERE id IN (\n    ${personUuidsList}\n);\n`);

  rollbackStatements.push(`-- 3. Registrar auditoria de UNLINK`);
  for (const m of manifest.movies) {
    rollbackStatements.push(`INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '${m.internal_uuid}'::uuid, ${m.tmdb_id}, 'UNLINK', 'rollback_f9_4', 'success', '{"reason": "Rollback manual F9.4"}'::jsonb);`);
  }
  for (const p of manifest.people) {
    rollbackStatements.push(`INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '${p.internal_uuid}'::uuid, ${p.tmdb_id}, 'UNLINK', 'rollback_f9_4', 'success', '{"reason": "Rollback manual F9.4"}'::jsonb);`);
  }

  rollbackStatements.push(`\nCOMMIT;`);

  const sqlRollbackContent = rollbackStatements.join('\n');
  const sqlRollbackPath = path.resolve(process.cwd(), 'supabase_f9_4_unlink_tmdb_ids_rollback.sql');
  fs.writeFileSync(sqlRollbackPath, sqlRollbackContent, 'utf-8');
  console.log(`   ✓ Script de rollback SQL gerado: ${sqlRollbackPath}\n`);

  console.log('=== FASE F9.4: ARTEFATOS PRONTOS E HOMOLOGADOS COM SUCESSO ===');
}

main().catch(err => {
  console.error('Fatal error in F9.4 generation:', err);
  process.exit(1);
});
