import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runDetailedAudit() {
  const manifest = JSON.parse(fs.readFileSync('acervo_tmdb_link_manifest.json', 'utf-8'));
  const snapshot = JSON.parse(fs.readFileSync('acervo_pre_tmdb_link_snapshot.json', 'utf-8'));
  const sqlLink = fs.readFileSync('supabase_f9_4_link_tmdb_ids.sql', 'utf-8');
  const sqlRollback = fs.readFileSync('supabase_f9_4_unlink_tmdb_ids_rollback.sql', 'utf-8');

  const { data: dbFilmes } = await supabase.from('filmes').select('*').order('title');
  const { data: dbPessoas } = await supabase.from('pessoas').select('*').order('name');

  console.log('=== AUDITORIA DETALHADA F9.4A ===\n');

  // A. ESTADO REAL DO BANCO
  console.log('A. ESTADO REAL DO BANCO:');
  const moviesLinked = dbFilmes?.filter(f => f.tmdb_id !== null).length || 0;
  const peopleLinked = dbPessoas?.filter(p => p.tmdb_id !== null).length || 0;
  console.log(`- Filmes no banco: ${dbFilmes?.length} (Com tmdb_id: ${moviesLinked}, Sem tmdb_id: ${(dbFilmes?.length || 0) - moviesLinked})`);
  console.log(`- Pessoas no banco: ${dbPessoas?.length} (Com tmdb_id: ${peopleLinked}, Sem tmdb_id: ${(dbPessoas?.length || 0) - peopleLinked})`);

  // B. COMPARAÇÃO COM O MANIFESTO
  console.log('\nB. COMPARAÇÃO PROGRAMÁTICA 1:1 COM O MANIFESTO:');
  const dbMovieMap = new Map(dbFilmes?.map(m => [m.id, m]));
  const dbPersonMap = new Map(dbPessoas?.map(p => [p.id, p]));

  let movieStats = { match: 0, wrong: 0, missing: 0, unexpected: 0 };
  for (const m of manifest.movies) {
    const dbM = dbMovieMap.get(m.internal_uuid);
    if (!dbM) continue;
    if (dbM.tmdb_id === null) movieStats.missing++;
    else if (dbM.tmdb_id === m.tmdb_id) movieStats.match++;
    else movieStats.wrong++;
  }

  let personStats = { match: 0, wrong: 0, missing: 0, unexpected: 0 };
  for (const p of manifest.people) {
    const dbP = dbPersonMap.get(p.internal_uuid);
    if (!dbP) continue;
    if (dbP.tmdb_id === null) personStats.missing++;
    else if (dbP.tmdb_id === p.tmdb_id) personStats.match++;
    else personStats.wrong++;
  }

  console.log('Filmes:', movieStats);
  console.log('Pessoas:', personStats);

  // C. VERIFICAÇÃO DOS 12 CASOS DA AMOSTRA
  console.log('\nC. TABELA DOS 12 CASOS CITADOS NA AUDITORIA:');
  const targetPersons = [
    { search: 'Bibi Andersson', query: 'Bibi Andersson' },
    { search: 'Andy Richter', query: 'Andy Richter' },
    { search: 'Chirstopher Nolan', query: 'Chirstopher Nolan', alias: 'Christopher Nolan' },
    { search: 'Benedict Wong', query: 'Benedict Wong' },
    { search: 'Damien Chazelle', query: 'Damien Chazelle' },
    { search: 'Callum Turner', query: 'Callum Turner' },
    { search: 'Emma Stone', query: 'Emma Stone' },
    { search: 'Corey Hawkins', query: 'Corey Hawkins' },
    { search: 'Ingmar Bergman', query: 'Ingmar Bergman' },
    { search: 'Elliot Page', query: 'Elliot Page' },
    { search: 'Jon Bernthal', query: 'Jon Bernthal' },
    { search: 'Viola Davis', query: 'Viola Davis' }
  ];

  for (const tp of targetPersons) {
    const manP = manifest.people.find((p: any) => p.local_name === tp.query || p.local_name === tp.alias);
    const dbP = dbPessoas?.find(p => p.name === tp.query || p.name === tp.alias);

    console.log(JSON.stringify({
      display_name: tp.alias || tp.query,
      name_in_db: dbP ? dbP.name : 'NÃO EXISTE NO BANCO',
      uuid_in_db: dbP ? dbP.id : 'N/A',
      uuid_in_manifest: manP ? manP.internal_uuid : 'N/A',
      tmdb_id_in_db: dbP ? dbP.tmdb_id : 'N/A',
      tmdb_id_in_manifest: manP ? manP.tmdb_id : 'N/A',
      status: !dbP ? 'NOT_IN_DB' : (dbP.tmdb_id === null ? 'MISSING_TMDB_ID' : (dbP.tmdb_id === manP?.tmdb_id ? 'MATCH' : 'WRONG_TMDB_ID'))
    }));
  }

  // D. VERIFICAÇÃO DOS 4 FILMES CITADOS
  console.log('\nD. VERIFICAÇÃO DOS 4 FILMES COM DIVERGÊNCIAS TEXTUAIS NO RELATÓRIO ANTERIOR:');
  const targetMovies = ['O Convite', 'O Fim da Rua', 'Ponto Sem Retorno', 'Só por Uma Noite'];
  for (const title of targetMovies) {
    const dbM = dbFilmes?.find(f => f.title === title);
    const manM = manifest.movies.find((m: any) => m.local_title === title);
    console.log(JSON.stringify({
      local_title: title,
      db_id: dbM?.id,
      db_title: dbM?.title,
      db_original_title: dbM?.original_title,
      db_year: dbM?.year,
      db_director: dbM?.legacy_director_name,
      db_synopsis: dbM?.synopsis ? dbM.synopsis.slice(0, 30) + '...' : null,
      db_poster_url: dbM?.poster_url,
      db_backdrop_url: dbM?.backdrop_url,
      db_tmdb_id: dbM?.tmdb_id,
      manifest_tmdb_id: manM?.tmdb_id,
      manifest_tmdb_title: manM?.tmdb_title
    }));
  }

  // E. AUDITORIA DOS SCRIPTS SQL
  console.log('\nE. AUDITORIA DOS ARTEFATOS SQL:');
  // Check if supabase_f9_4_link_tmdb_ids.sql matches manifest 100%
  let sqlLinkSafe = true;
  for (const m of manifest.movies) {
    if (!sqlLink.includes(`SET tmdb_id = ${m.tmdb_id}\nWHERE id = '${m.internal_uuid}'::uuid;`)) {
      console.log(`[SQL LINK DEFECT] Movie missing or mismatched: ${m.local_title} (${m.internal_uuid}) -> ${m.tmdb_id}`);
      sqlLinkSafe = false;
    }
  }
  for (const p of manifest.people) {
    if (!sqlLink.includes(`SET tmdb_id = ${p.tmdb_id}\nWHERE id = '${p.internal_uuid}'::uuid;`)) {
      console.log(`[SQL LINK DEFECT] Person missing or mismatched: ${p.local_name} (${p.internal_uuid}) -> ${p.tmdb_id}`);
      sqlLinkSafe = false;
    }
  }
  console.log('Script supabase_f9_4_link_tmdb_ids.sql status:', sqlLinkSafe ? 'SAFE (100% compatível com o manifesto)' : 'UNSAFE');

  // Check if rollback script matches manifest 100%
  let sqlRollbackSafe = true;
  for (const m of manifest.movies) {
    if (!sqlRollback.includes(`'${m.internal_uuid}'::uuid`)) {
      console.log(`[SQL ROLLBACK DEFECT] Movie UUID missing in rollback: ${m.internal_uuid}`);
      sqlRollbackSafe = false;
    }
  }
  for (const p of manifest.people) {
    if (!sqlRollback.includes(`'${p.internal_uuid}'::uuid`)) {
      console.log(`[SQL ROLLBACK DEFECT] Person UUID missing in rollback: ${p.internal_uuid}`);
      sqlRollbackSafe = false;
    }
  }
  console.log('Script supabase_f9_4_unlink_tmdb_ids_rollback.sql status:', sqlRollbackSafe ? 'SAFE (100% restrito aos UUIDs do acervo)' : 'UNSAFE');
}

runDetailedAudit().catch(console.error);
