import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('================================================================');
  console.log('F9.4A - AUDITORIA COMPLETA DE INTEGRIDADE, BANCO E ARTEFATOS');
  console.log('================================================================\n');

  // 1. Carregar o manifesto
  const manifest = JSON.parse(fs.readFileSync('acervo_tmdb_link_manifest.json', 'utf-8'));
  console.log('1. MANIFESTO (acervo_tmdb_link_manifest.json):');
  console.log(`   - Filmes no manifesto: ${manifest.movies.length}`);
  console.log(`   - Pessoas no manifesto: ${manifest.people.length}`);

  // 2. Extrair dados reais do Supabase
  console.log('\n2. BANCO DE DADOS SUPABASE (ESTADO REAL):');
  const { data: dbFilmes, error: fErr } = await supabase
    .from('filmes')
    .select('id, title, original_title, year, legacy_director_name, synopsis, poster_url, backdrop_url, tmdb_id, tmdb_synced_at')
    .order('title');
  if (fErr) throw fErr;

  const { data: dbPessoas, error: pErr } = await supabase
    .from('pessoas')
    .select('id, name, slug, birth_date, death_date, country, tmdb_id, tmdb_synced_at')
    .order('name');
  if (pErr) throw pErr;

  console.log(`   - Filmes no banco: ${dbFilmes.length}`);
  console.log(`   - Pessoas no banco: ${dbPessoas.length}`);

  // 3. Comparação 1:1 de Filmes
  console.log('\n3. COMPARAÇÃO 1:1 - FILMES (BANCO vs MANIFESTO):');
  const manifestMovieMap = new Map(manifest.movies.map((m: any) => [m.internal_uuid, m]));
  const dbMovieMap = new Map(dbFilmes.map((m: any) => [m.id, m]));

  let moviesMatch = 0;
  let moviesWrong = 0;
  let moviesMissing = 0;
  let moviesUnexpected = 0;

  for (const m of manifest.movies) {
    const dbM: any = dbMovieMap.get(m.internal_uuid);
    if (!dbM) {
      console.log(`   [UUID INEXISTENTE NO BANCO] ${m.local_title} (${m.internal_uuid})`);
      continue;
    }
    let status = '';
    if (dbM.tmdb_id === null) {
      status = 'MISSING_TMDB_ID';
      moviesMissing++;
    } else if (dbM.tmdb_id === m.tmdb_id) {
      status = 'MATCH';
      moviesMatch++;
    } else {
      status = 'WRONG_TMDB_ID';
      moviesWrong++;
    }
    console.log(`   - [${status}] ${m.local_title} | UUID: ${m.internal_uuid} | Manifest TMDB: ${m.tmdb_id} | DB TMDB: ${dbM.tmdb_id}`);
  }

  for (const dbM of dbFilmes) {
    if (!manifestMovieMap.has(dbM.id) && dbM.tmdb_id !== null) {
      moviesUnexpected++;
      console.log(`   - [UNEXPECTED_TMDB_ID] ${dbM.title} | UUID: ${dbM.id} | DB TMDB: ${dbM.tmdb_id}`);
    }
  }

  // 4. Comparação 1:1 de Pessoas
  console.log('\n4. COMPARAÇÃO 1:1 - PESSOAS (BANCO vs MANIFESTO):');
  const manifestPersonMap = new Map(manifest.people.map((p: any) => [p.internal_uuid, p]));
  const dbPersonMap = new Map(dbPessoas.map((p: any) => [p.id, p]));

  let peopleMatch = 0;
  let peopleWrong = 0;
  let peopleMissing = 0;
  let peopleUnexpected = 0;

  for (const p of manifest.people) {
    const dbP: any = dbPersonMap.get(p.internal_uuid);
    if (!dbP) {
      console.log(`   [UUID INEXISTENTE NO BANCO] ${p.local_name} (${p.internal_uuid})`);
      continue;
    }
    let status = '';
    if (dbP.tmdb_id === null) {
      status = 'MISSING_TMDB_ID';
      peopleMissing++;
    } else if (dbP.tmdb_id === p.tmdb_id) {
      status = 'MATCH';
      peopleMatch++;
    } else {
      status = 'WRONG_TMDB_ID';
      peopleWrong++;
    }
    // Only log if not missing or sample
  }

  for (const p of manifest.people) {
    const dbP: any = dbPersonMap.get(p.internal_uuid);
    if (dbP && dbP.tmdb_id !== null) {
      console.log(`   - [${dbP.tmdb_id === p.tmdb_id ? 'MATCH' : 'WRONG_TMDB_ID'}] ${p.local_name} | UUID: ${p.internal_uuid} | Manifest TMDB: ${p.tmdb_id} | DB TMDB: ${dbP.tmdb_id}`);
    }
  }

  for (const dbP of dbPessoas) {
    if (!manifestPersonMap.has(dbP.id) && dbP.tmdb_id !== null) {
      peopleUnexpected++;
      console.log(`   - [UNEXPECTED_TMDB_ID] ${dbP.name} | UUID: ${dbP.id} | DB TMDB: ${dbP.tmdb_id}`);
    }
  }

  console.log(`\n   Contagens Pessoas:`);
  console.log(`   - Total no manifesto: ${manifest.people.length}`);
  console.log(`   - MATCH: ${peopleMatch}`);
  console.log(`   - WRONG_TMDB_ID: ${peopleWrong}`);
  console.log(`   - MISSING_TMDB_ID: ${peopleMissing}`);
  console.log(`   - UNEXPECTED_TMDB_ID: ${peopleUnexpected}`);

  // 5. Verificar a amostra do relatório F9.4
  console.log('\n5. VERIFICAÇÃO DA AMOSTRA ESPECÍFICA CITADA PELO USUÁRIO:');
  const sampleNames = [
    'Bibi Andersson', 'Andy Richter', 'Christopher Nolan', 'Benedict Wong',
    'Damien Chazelle', 'Callum Turner', 'Emma Stone', 'Corey Hawkins',
    'Ingmar Bergman', 'Elliot Page', 'Jon Bernthal', 'Viola Davis'
  ];

  for (const name of sampleNames) {
    const pMan = manifest.people.find((x: any) => x.local_name === name);
    const dbP = dbPessoas.find((x: any) => x.name === name);
    console.log(`   * ${name.padEnd(20)} | DB UUID: ${dbP?.id} | Manifest UUID: ${pMan?.internal_uuid} | DB TMDB: ${dbP?.tmdb_id} | Manifest TMDB: ${pMan?.tmdb_id} | Name Match: ${dbP?.name === name}`);
  }

  // 6. Verificar integridade dos campos editoriais dos filmes no Supabase
  console.log('\n6. VERIFICAÇÃO DE CAMPOS EDITORIAIS DOS 11 FILMES NO BANCO:');
  for (const f of dbFilmes) {
    console.log(`   * ${f.title.padEnd(32)} | Original: ${(f.original_title || 'N/A').padEnd(25)} | Year: ${f.year} | Director: ${(f.legacy_director_name || 'N/A').padEnd(20)} | tmdb_id: ${f.tmdb_id} | tmdb_synced_at: ${f.tmdb_synced_at}`);
  }

  // 7. Auditar os scripts gerados (supabase_f9_4_link_tmdb_ids.sql e rollback)
  console.log('\n7. AUDITORIA DO SCRIPT SQL GERADO (supabase_f9_4_link_tmdb_ids.sql):');
  const sqlLink = fs.readFileSync('supabase_f9_4_link_tmdb_ids.sql', 'utf-8');
  const sqlRollback = fs.readFileSync('supabase_f9_4_unlink_tmdb_ids_rollback.sql', 'utf-8');

  // Parse UPDATE statements in supabase_f9_4_link_tmdb_ids.sql
  // UPDATE public.filmes SET tmdb_id = X WHERE id = 'UUID'::uuid;
  // UPDATE public.pessoas SET tmdb_id = X WHERE id = 'UUID'::uuid;
  const movieUpdateRegex = /UPDATE public\.filmes\s+SET tmdb_id = (\d+)\s+WHERE id = '([a-f0-9\-]+)'::uuid;/g;
  const personUpdateRegex = /UPDATE public\.pessoas\s+SET tmdb_id = (\d+)\s+WHERE id = '([a-f0-9\-]+)'::uuid;/g;

  let mMatch;
  let sqlMovieUpdates: { tmdb_id: number; uuid: string }[] = [];
  while ((mMatch = movieUpdateRegex.exec(sqlLink)) !== null) {
    sqlMovieUpdates.push({ tmdb_id: parseInt(mMatch[1]), uuid: mMatch[2] });
  }

  let pMatch;
  let sqlPersonUpdates: { tmdb_id: number; uuid: string }[] = [];
  while ((pMatch = personUpdateRegex.exec(sqlLink)) !== null) {
    sqlPersonUpdates.push({ tmdb_id: parseInt(pMatch[1]), uuid: pMatch[2] });
  }

  console.log(`   - Updates de filmes no SQL: ${sqlMovieUpdates.length}`);
  console.log(`   - Updates de pessoas no SQL: ${sqlPersonUpdates.length}`);

  let sqlMovieMismatches = 0;
  for (const upd of sqlMovieUpdates) {
    const manM: any = manifestMovieMap.get(upd.uuid);
    if (!manM) {
      console.log(`   [SQL ERROR] Movie UUID no SQL não existe no manifesto: ${upd.uuid}`);
      sqlMovieMismatches++;
    } else if (manM.tmdb_id !== upd.tmdb_id) {
      console.log(`   [SQL MISMATCH] Movie ${manM.local_title} UUID ${upd.uuid} SQL tmdb_id=${upd.tmdb_id} vs Manifest=${manM.tmdb_id}`);
      sqlMovieMismatches++;
    }
  }

  let sqlPersonMismatches = 0;
  for (const upd of sqlPersonUpdates) {
    const manP: any = manifestPersonMap.get(upd.uuid);
    if (!manP) {
      console.log(`   [SQL ERROR] Person UUID no SQL não existe no manifesto: ${upd.uuid}`);
      sqlPersonMismatches++;
    } else if (manP.tmdb_id !== upd.tmdb_id) {
      console.log(`   [SQL MISMATCH] Person ${manP.local_name} UUID ${upd.uuid} SQL tmdb_id=${upd.tmdb_id} vs Manifest=${manP.tmdb_id}`);
      sqlPersonMismatches++;
    }
  }

  console.log(`   - Discrepâncias Filme no SQL vs Manifesto: ${sqlMovieMismatches}`);
  console.log(`   - Discrepâncias Pessoa no SQL vs Manifesto: ${sqlPersonMismatches}`);

  // 8. Auditar tabela public.tmdb_sync_logs se acessível
  console.log('\n8. AUDITORIA DA TABELA public.tmdb_sync_logs:');
  const { data: dbLogs, error: logErr } = await supabase.from('tmdb_sync_logs').select('*');
  if (logErr) {
    console.log(`   - Consulta a tmdb_sync_logs: ${logErr.message} (Código ${logErr.code})`);
    console.log('   (Nota: Acesso direto anon a tmdb_sync_logs requer privilégios ou a tabela está vazia)');
  } else {
    console.log(`   - Logs no banco: ${dbLogs?.length || 0}`);
  }
}

runAudit().catch(console.error);
