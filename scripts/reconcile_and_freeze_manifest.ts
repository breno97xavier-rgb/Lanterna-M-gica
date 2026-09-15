import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const tmdbToken = process.env.TMDB_READ_ACCESS_TOKEN || '';
const tmdbApiKey = process.env.TMDB_API_KEY || '';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function tmdbGet(endpoint: string, params: Record<string, string> = {}): Promise<{ status: number; data: any }> {
  const urlObj = new URL(`https://api.themoviedb.org/3${endpoint}`);
  urlObj.searchParams.set('language', 'pt-BR');
  if (!tmdbToken && tmdbApiKey) {
    urlObj.searchParams.set('api_key', tmdbApiKey);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      urlObj.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (tmdbToken) {
    headers['Authorization'] = `Bearer ${tmdbToken}`;
  }

  await sleep(35); // rate limit protection

  try {
    const res = await fetch(urlObj.toString(), { headers });
    const data = await res.json();
    return { status: res.status, data };
  } catch (err: any) {
    return { status: 500, data: null };
  }
}

async function testConflict(id: number): Promise<any> {
  const res = await tmdbGet(`/person/${id}`);
  return {
    status: res.status,
    id: res.data?.id,
    name: res.data?.name,
    birthday: res.data?.birthday,
    deathday: res.data?.deathday,
    known_for_department: res.data?.known_for_department,
    popularity: res.data?.popularity,
  };
}

async function main() {
  console.log('=== F9.3E / F9.4B — RECONCILIAÇÃO E CONGELAMENTO DEFINITIVO DO MANIFESTO TMDB ===\n');

  // 1. Extrair 89 pessoas diretamente do Supabase ORDER BY id
  const { data: dbPessoas, error: pErr } = await supabase
    .from('pessoas')
    .select('id, name, birth_date, primary_roles, slug, country')
    .order('id');
  if (pErr) throw pErr;

  // 2. Extrair 11 filmes diretamente do Supabase ORDER BY id
  const { data: dbFilmes, error: fErr } = await supabase
    .from('filmes')
    .select('id, title, original_title, year, legacy_director_name, slug')
    .order('id');
  if (fErr) throw fErr;

  // 3. Extrair créditos para desambiguação
  const { data: dbCredits } = await supabase
    .from('film_credits')
    .select('person_id, film:filmes(id, title, original_title, year), role, character_name');

  console.log(`Supabase real: ${dbFilmes?.length} filmes, ${dbPessoas?.length} pessoas.`);

  // 4. Testar os casos de conflito conhecidos
  console.log('\n--- TESTE EXPLÍCITO DOS IDs CONFLITANTES CONHECIDOS ---');
  const conflictPairs = [
    { name: 'Bibi Andersson', idA: 34488, idB: 6657 },
    { name: 'Benedict Wong', idA: 31165, idB: 30082 },
    { name: 'Damien Chazelle', idA: 1302525, idB: 136495 },
    { name: 'Callum Turner', idA: 1294862, idB: 1371041 },
    { name: 'Corey Hawkins', idA: 1064273, idB: 1154054 },
    { name: 'Jon Bernthal', idA: 19492, idB: 19498 },
    { name: 'J.K. Simmons', idA: 18999, idB: 18999 },
    { name: 'Ewan Bremner', idA: 1125, idB: 1125 },
  ];

  for (const c of conflictPairs) {
    const resA = await testConflict(c.idA);
    const resB = c.idA === c.idB ? resA : await testConflict(c.idB);
    console.log(`\nEntidade: ${c.name}`);
    console.log(`  ID A (${c.idA}): HTTP ${resA.status} | ID: ${resA.id} | Name: ${resA.name} | Bday: ${resA.birthday} | Dept: ${resA.known_for_department} | Pop: ${resA.popularity}`);
    if (c.idA !== c.idB) {
      console.log(`  ID B (${c.idB}): HTTP ${resB.status} | ID: ${resB.id} | Name: ${resB.name} | Bday: ${resB.birthday} | Dept: ${resB.known_for_department} | Pop: ${resB.popularity}`);
    }
  }

  // 5. Mapeamento manual e busca canônica para filmes
  console.log('\n--- REVALIDAÇÃO COMPLETA DOS 11 FILMES ---');
  const movieSearchQueries: Record<string, { query: string; year?: number; original?: string; tmdb_id?: number }> = {
    'A Noviça Rebelde': { query: 'The Sound of Music', year: 1965, tmdb_id: 15121 },
    'A Odisseia': { query: 'The Odyssey', year: 2026, tmdb_id: 1368337 },
    'Homem-Aranha: Um Novo Dia': { query: 'Spider-Man: Brand New Day', year: 2026, tmdb_id: 969681 },
    'La La Land: Cantando Estações': { query: 'La La Land', year: 2016, tmdb_id: 313369 },
    'Miroirs No. 3': { query: 'Miroirs No. 3', year: 2025, tmdb_id: 1178602 },
    'O Convite': { query: 'The Invite', year: 2026, tmdb_id: 950028 },
    'O Fim da Rua': { query: 'The End of Oak Street', year: 2026, tmdb_id: 1101383 },
    'Obsessão': { query: 'Obsession', year: 2026, tmdb_id: 1339713 },
    'Persona': { query: 'Persona', year: 1966, tmdb_id: 797 },
    'Ponto Sem Retorno': { query: 'The Dog Stars', year: 2026, tmdb_id: 1384216 },
    'Só por Uma Noite': { query: 'One Night Only', year: 2026, tmdb_id: 1433367 },
  };

  const finalValidatedMovies = [];
  for (const f of dbFilmes!) {
    const config = movieSearchQueries[f.title];
    const targetId = config?.tmdb_id;
    if (!targetId) throw new Error(`Sem configuração para filme: ${f.title}`);

    const res = await tmdbGet(`/movie/${targetId}`);
    if (res.status !== 200 || !res.data?.id) {
      throw new Error(`Erro ao validar filme ${f.title} no TMDB ID ${targetId}: HTTP ${res.status}`);
    }

    finalValidatedMovies.push({
      internal_uuid: f.id,
      local_title: f.title,
      tmdb_id: res.data.id,
      returned_title: res.data.title || f.title,
      returned_original_title: res.data.original_title || f.original_title,
      returned_release_date: res.data.release_date || null,
      validation_status: 'VALID'
    });
  }

  // 6. Reconstrução completa das 89 pessoas
  console.log('\n--- REVALIDAÇÃO COMPLETA DAS 89 PESSOAS ---');
  // Lista de aliases de busca para grafias locais divergentes
  const personSearchAliases: Record<string, string> = {
    'Chirstopher Nolan': 'Christopher Nolan',
    'Seth Rogan': 'Seth Rogen',
    'Ewan Bremner': 'Ewen Bremner',
    'Ewan Mcgregor': 'Ewan McGregor',
  };

  const finalValidatedPeople = [];
  for (const p of dbPessoas!) {
    const searchTerm = personSearchAliases[p.name] || p.name;
    const searchRes = await tmdbGet('/search/person', { query: searchTerm });
    const results = searchRes.data?.results || [];
    if (results.length === 0) {
      throw new Error(`Nenhum resultado de busca no TMDB para pessoa: ${p.name} (Termo: ${searchTerm})`);
    }

    // Obter melhor candidato
    const bestCandidate = results[0];
    const candidateId = bestCandidate.id;

    // Confirmar obrigatoriamente via GET /3/person/{id}
    const detailRes = await tmdbGet(`/person/${candidateId}`);
    if (detailRes.status !== 200 || !detailRes.data?.id) {
      throw new Error(`Falha na confirmação direta da pessoa ${p.name} (TMDB ID ${candidateId}): HTTP ${detailRes.status}`);
    }

    finalValidatedPeople.push({
      internal_uuid: p.id,
      local_name: p.name,
      tmdb_id: detailRes.data.id,
      returned_name: detailRes.data.name,
      returned_birthday: detailRes.data.birthday || null,
      returned_known_for_department: detailRes.data.known_for_department || null,
      validation_status: 'VALID'
    });
  }

  // 7. Validação de Unicidade
  const movieIds = new Set(finalValidatedMovies.map(m => m.tmdb_id));
  const personIds = new Set(finalValidatedPeople.map(p => p.tmdb_id));

  console.log(`\nValidação de Unicidade:`);
  console.log(`Filmes: ${finalValidatedMovies.length} itens, ${movieIds.size} IDs únicos.`);
  console.log(`Pessoas: ${finalValidatedPeople.length} itens, ${personIds.size} IDs únicos.`);

  if (movieIds.size !== finalValidatedMovies.length) throw new Error('Colisão de IDs em filmes!');
  if (personIds.size !== finalValidatedPeople.length) {
    // Find duplicate
    const counts: Record<number, string[]> = {};
    for (const p of finalValidatedPeople) {
      if (!counts[p.tmdb_id]) counts[p.tmdb_id] = [];
      counts[p.tmdb_id].push(p.local_name);
    }
    for (const [id, names] of Object.entries(counts)) {
      if (names.length > 1) console.error(`DUPLICIDADE no TMDB ID ${id}: ${names.join(', ')}`);
    }
    throw new Error('Colisão de IDs em pessoas!');
  }

  // 8. Gerar acervo_tmdb_link_manifest_final.json
  const finalManifest = {
    metadata: {
      manifest_version: 'F9-FINAL-1',
      generated_at: new Date().toISOString(),
      source: 'SUPABASE_REAL_PLUS_DIRECT_TMDB_ENTITY_VALIDATION',
      movies_total: finalValidatedMovies.length,
      people_total: finalValidatedPeople.length,
      duplicate_movie_ids: 0,
      duplicate_person_ids: 0,
      invalid_movies: 0,
      invalid_people: 0,
      validation_method: 'DIRECT_GET_ENTITY_ENDPOINT_HTTP_200'
    },
    movies: finalValidatedMovies,
    people: finalValidatedPeople
  };

  const finalManifestContent = JSON.stringify(finalManifest, null, 2);
  const finalManifestPath = 'acervo_tmdb_link_manifest_final.json';
  fs.writeFileSync(finalManifestPath, finalManifestContent, 'utf-8');

  const finalManifestHash = crypto.createHash('sha256').update(finalManifestContent).digest('hex');
  const finalManifestStats = fs.statSync(finalManifestPath);

  console.log(`\n✓ ${finalManifestPath} criado com sucesso.`);
  console.log(`  - SHA-256: ${finalManifestHash}`);
  console.log(`  - Tamanho: ${finalManifestStats.size} bytes`);
  console.log(`  - Filmes: ${finalManifest.movies.length}`);
  console.log(`  - Pessoas: ${finalManifest.people.length}`);

  // 9. Gerar supabase_f9_4_link_tmdb_ids_final.sql
  const sqlLinkStatements: string[] = [];
  sqlLinkStatements.push(`-- ==============================================================================`);
  sqlLinkStatements.push(`-- LANTERNA MÁGICA — FASE 9: VINCULAÇÃO DEFINITIVA DO ACERVO AO TMDB`);
  sqlLinkStatements.push(`-- Arquivo: supabase_f9_4_link_tmdb_ids_final.sql`);
  sqlLinkStatements.push(`-- Manifesto de Origem: acervo_tmdb_link_manifest_final.json (SHA-256: ${finalManifestHash})`);
  sqlLinkStatements.push(`-- Regras Estritas:`);
  sqlLinkStatements.push(`--   1. Atualização estritamente por UUID interno (id).`);
  sqlLinkStatements.push(`--   2. tmdb_synced_at permanece ESTRITAMENTE NULL.`);
  sqlLinkStatements.push(`--   3. Validação defensiva transacional com ASSERTIONS.`);
  sqlLinkStatements.push(`-- ==============================================================================\n`);
  sqlLinkStatements.push(`BEGIN;\n`);

  sqlLinkStatements.push(`-- 1. VINCULAÇÃO DE FILMES (11 registros)`);
  for (const m of finalManifest.movies) {
    sqlLinkStatements.push(`UPDATE public.filmes`);
    sqlLinkStatements.push(`SET tmdb_id = ${m.tmdb_id}`);
    sqlLinkStatements.push(`WHERE id = '${m.internal_uuid}'::uuid;`);
    sqlLinkStatements.push(``);
  }

  sqlLinkStatements.push(`-- 2. VINCULAÇÃO DE PESSOAS (89 registros)`);
  for (const p of finalManifest.people) {
    sqlLinkStatements.push(`UPDATE public.pessoas`);
    sqlLinkStatements.push(`SET tmdb_id = ${p.tmdb_id}`);
    sqlLinkStatements.push(`WHERE id = '${p.internal_uuid}'::uuid;`);
    sqlLinkStatements.push(``);
  }

  sqlLinkStatements.push(`-- 3. REGISTRO DE AUDITORIA EM public.tmdb_sync_logs (100 registros)`);
  for (const m of finalManifest.movies) {
    const detailsJson = JSON.stringify({
      local_title: m.local_title,
      tmdb_title: m.returned_title,
      tmdb_original_title: m.returned_original_title,
      phase: 'F9.4_LINK_FINAL'
    }).replace(/'/g, "''");
    sqlLinkStatements.push(`INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '${m.internal_uuid}'::uuid, ${m.tmdb_id}, 'LINK', 'migration_f9_4_final', 'success', '${detailsJson}'::jsonb);`);
  }

  for (const p of finalManifest.people) {
    const detailsJson = JSON.stringify({
      local_name: p.local_name,
      tmdb_name: p.returned_name,
      tmdb_birthday: p.returned_birthday,
      tmdb_department: p.returned_known_for_department,
      phase: 'F9.4_LINK_FINAL'
    }).replace(/'/g, "''");
    sqlLinkStatements.push(`INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '${p.internal_uuid}'::uuid, ${p.tmdb_id}, 'LINK', 'migration_f9_4_final', 'success', '${detailsJson}'::jsonb);`);
  }

  sqlLinkStatements.push(`\n-- 4. VALIDAÇÃO DEFENSIVA PRÉ-COMMIT (DO BLOCK COM ASSERTIONS)`);
  sqlLinkStatements.push(`DO $$`);
  sqlLinkStatements.push(`DECLARE`);
  sqlLinkStatements.push(`  v_movies_linked INTEGER;`);
  sqlLinkStatements.push(`  v_people_linked INTEGER;`);
  sqlLinkStatements.push(`  v_movies_synced INTEGER;`);
  sqlLinkStatements.push(`  v_people_synced INTEGER;`);
  sqlLinkStatements.push(`  v_logs_count INTEGER;`);
  sqlLinkStatements.push(`BEGIN`);
  sqlLinkStatements.push(`  SELECT COUNT(*) INTO v_movies_linked FROM public.filmes WHERE tmdb_id IS NOT NULL;`);
  sqlLinkStatements.push(`  IF v_movies_linked <> 11 THEN`);
  sqlLinkStatements.push(`    RAISE EXCEPTION 'Falha na validação de filmes: esperado 11 vinculados, encontrado %', v_movies_linked;`);
  sqlLinkStatements.push(`  END IF;`);
  sqlLinkStatements.push(``);
  sqlLinkStatements.push(`  SELECT COUNT(*) INTO v_people_linked FROM public.pessoas WHERE tmdb_id IS NOT NULL;`);
  sqlLinkStatements.push(`  IF v_people_linked <> 89 THEN`);
  sqlLinkStatements.push(`    RAISE EXCEPTION 'Falha na validação de pessoas: esperado 89 vinculadas, encontrado %', v_people_linked;`);
  sqlLinkStatements.push(`  END IF;`);
  sqlLinkStatements.push(``);
  sqlLinkStatements.push(`  SELECT COUNT(*) INTO v_movies_synced FROM public.filmes WHERE tmdb_synced_at IS NOT NULL;`);
  sqlLinkStatements.push(`  IF v_movies_synced > 0 THEN`);
  sqlLinkStatements.push(`    RAISE EXCEPTION 'Violação de protocolo: % filmes possuem tmdb_synced_at preenchido!', v_movies_synced;`);
  sqlLinkStatements.push(`  END IF;`);
  sqlLinkStatements.push(``);
  sqlLinkStatements.push(`  SELECT COUNT(*) INTO v_people_synced FROM public.pessoas WHERE tmdb_synced_at IS NOT NULL;`);
  sqlLinkStatements.push(`  IF v_people_synced > 0 THEN`);
  sqlLinkStatements.push(`    RAISE EXCEPTION 'Violação de protocolo: % pessoas possuem tmdb_synced_at preenchido!', v_people_synced;`);
  sqlLinkStatements.push(`  END IF;`);
  sqlLinkStatements.push(``);
  sqlLinkStatements.push(`  SELECT COUNT(*) INTO v_logs_count FROM public.tmdb_sync_logs WHERE source = 'migration_f9_4_final' AND operation = 'LINK';`);
  sqlLinkStatements.push(`  IF v_logs_count <> 100 THEN`);
  sqlLinkStatements.push(`    RAISE EXCEPTION 'Falha nos logs de auditoria: esperado 100 registros, encontrado %', v_logs_count;`);
  sqlLinkStatements.push(`  END IF;`);
  sqlLinkStatements.push(``);
  sqlLinkStatements.push(`  RAISE NOTICE 'Validação defensiva F9.4 FINAL concluída com 100%% de sucesso!';`);
  sqlLinkStatements.push(`END $$;`);
  sqlLinkStatements.push(``);
  sqlLinkStatements.push(`COMMIT;`);

  const sqlLinkFinalContent = sqlLinkStatements.join('\n');
  const sqlLinkFinalPath = 'supabase_f9_4_link_tmdb_ids_final.sql';
  fs.writeFileSync(sqlLinkFinalPath, sqlLinkFinalContent, 'utf-8');

  const sqlLinkFinalHash = crypto.createHash('sha256').update(sqlLinkFinalContent).digest('hex');
  console.log(`\n✓ ${sqlLinkFinalPath} criado com sucesso.`);
  console.log(`  - SHA-256: ${sqlLinkFinalHash}`);

  // 10. Gerar supabase_f9_4_unlink_tmdb_ids_final_rollback.sql
  const sqlRollbackStatements: string[] = [];
  sqlRollbackStatements.push(`-- ==============================================================================`);
  sqlRollbackStatements.push(`-- LANTERNA MÁGICA — FASE 9: ROLLBACK DE VINCULAÇÃO DO ACERVO AO TMDB`);
  sqlRollbackStatements.push(`-- Arquivo: supabase_f9_4_unlink_tmdb_ids_final_rollback.sql`);
  sqlRollbackStatements.push(`-- Manifesto de Origem: acervo_tmdb_link_manifest_final.json (SHA-256: ${finalManifestHash})`);
  sqlRollbackStatements.push(`-- ==============================================================================\n`);
  sqlRollbackStatements.push(`BEGIN;\n`);

  const movieUuidsList = finalManifest.movies.map(m => `'${m.internal_uuid}'::uuid`).join(', ');
  sqlRollbackStatements.push(`-- 1. Desvincular filmes`);
  sqlRollbackStatements.push(`UPDATE public.filmes`);
  sqlRollbackStatements.push(`SET tmdb_id = NULL, tmdb_synced_at = NULL`);
  sqlRollbackStatements.push(`WHERE id IN (${movieUuidsList});\n`);

  const personUuidsList = finalManifest.people.map(p => `'${p.internal_uuid}'::uuid`).join(',\n    ');
  sqlRollbackStatements.push(`-- 2. Desvincular pessoas`);
  sqlRollbackStatements.push(`UPDATE public.pessoas`);
  sqlRollbackStatements.push(`SET tmdb_id = NULL, tmdb_synced_at = NULL`);
  sqlRollbackStatements.push(`WHERE id IN (\n    ${personUuidsList}\n);\n`);

  sqlRollbackStatements.push(`-- 3. Registrar logs de auditoria UNLINK`);
  for (const m of finalManifest.movies) {
    sqlRollbackStatements.push(`INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '${m.internal_uuid}'::uuid, ${m.tmdb_id}, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);`);
  }
  for (const p of finalManifest.people) {
    sqlRollbackStatements.push(`INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '${p.internal_uuid}'::uuid, ${p.tmdb_id}, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);`);
  }

  sqlRollbackStatements.push(`\nCOMMIT;`);

  const sqlRollbackFinalContent = sqlRollbackStatements.join('\n');
  const sqlRollbackFinalPath = 'supabase_f9_4_unlink_tmdb_ids_final_rollback.sql';
  fs.writeFileSync(sqlRollbackFinalPath, sqlRollbackFinalContent, 'utf-8');

  const sqlRollbackFinalHash = crypto.createHash('sha256').update(sqlRollbackFinalContent).digest('hex');
  console.log(`\n✓ ${sqlRollbackFinalPath} criado com sucesso.`);
  console.log(`  - SHA-256: ${sqlRollbackFinalHash}`);

  // 11. Comparação 1:1 entre Manifesto Final e SQL Final
  console.log('\n--- AUDITORIA PROGRAMÁTICA 1:1 ENTRE MANIFESTO FINAL E SQL FINAL ---');
  let sqlMovieMatches = 0;
  for (const m of finalManifest.movies) {
    const pattern = `UPDATE public.filmes\nSET tmdb_id = ${m.tmdb_id}\nWHERE id = '${m.internal_uuid}'::uuid;`;
    if (sqlLinkFinalContent.includes(pattern)) sqlMovieMatches++;
  }

  let sqlPersonMatches = 0;
  for (const p of finalManifest.people) {
    const pattern = `UPDATE public.pessoas\nSET tmdb_id = ${p.tmdb_id}\nWHERE id = '${p.internal_uuid}'::uuid;`;
    if (sqlLinkFinalContent.includes(pattern)) sqlPersonMatches++;
  }

  console.log(`Filmes: ${finalManifest.movies.length} no manifesto, ${sqlMovieMatches} correspondências exatas no SQL.`);
  console.log(`Pessoas: ${finalManifest.people.length} no manifesto, ${sqlPersonMatches} correspondências exatas no SQL.`);
}

main().catch(console.error);
