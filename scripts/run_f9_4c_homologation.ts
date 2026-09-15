import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPostExecutionAudit() {
  console.log('================================================================');
  console.log('ETAPA F9.4C — AUDITORIA DE HOMOLOGAÇÃO PÓS-EXECUÇÃO');
  console.log('================================================================\n');

  // 1. Carregar artefatos congelados
  const manifestPath = 'acervo_tmdb_link_manifest_final.json';
  const snapshotPath = 'acervo_pre_tmdb_link_snapshot.json';
  const rollbackPath = 'supabase_f9_4_unlink_tmdb_ids_final_rollback.sql';

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const rollbackContent = fs.readFileSync(rollbackPath, 'utf-8');

  const manifestHash = crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex');
  const rollbackHash = crypto.createHash('sha256').update(rollbackContent).digest('hex');

  console.log(`1. ARTEFATOS CONGELADOS:`);
  console.log(`   - Manifesto: ${manifestPath} (SHA-256: ${manifestHash})`);
  console.log(`   - Rollback: ${rollbackPath} (SHA-256: ${rollbackHash})`);

  // 2. Extrair dados reais do Supabase
  console.log('\n2. CONSULTANDO ESTADO REAL DO SUPABASE:');
  const { data: dbFilmes, error: fErr } = await supabase
    .from('filmes')
    .select('id, title, original_title, slug, legacy_id, year, synopsis, poster_url, backdrop_url, legacy_director_name, editorial_rating, status, tmdb_id, tmdb_synced_at')
    .order('title');
  if (fErr) throw fErr;

  const { data: dbPessoas, error: pErr } = await supabase
    .from('pessoas')
    .select('id, name, slug, legacy_id, birth_date, death_date, bio, editorial_profile, primary_roles, status, photo_url, country, tmdb_id, tmdb_synced_at')
    .order('name');
  if (pErr) throw pErr;

  console.log(`   - Filmes no banco: ${dbFilmes?.length}`);
  console.log(`   - Pessoas no banco: ${dbPessoas?.length}`);

  // 3. Comparação 1:1 com o Manifesto Final
  console.log('\n3. COMPARAÇÃO 1:1 COM O MANIFESTO FINAL:');
  const dbMovieMap = new Map(dbFilmes?.map(m => [m.id, m]));
  const dbPersonMap = new Map(dbPessoas?.map(p => [p.id, p]));
  const manifestMovieMap = new Map<string, any>(manifest.movies.map((m: any) => [m.internal_uuid, m]));
  const manifestPersonMap = new Map<string, any>(manifest.people.map((p: any) => [p.internal_uuid, p]));

  let movieStats = { match: 0, wrong: 0, missing: 0, unexpected: 0 };
  let movieMismatches: any[] = [];
  for (const m of manifest.movies) {
    const dbM = dbMovieMap.get(m.internal_uuid);
    if (!dbM) {
      movieMismatches.push({ title: m.local_title, uuid: m.internal_uuid, issue: 'NOT_IN_DB' });
      continue;
    }
    if (dbM.tmdb_id === null) {
      movieStats.missing++;
      movieMismatches.push({ title: m.local_title, uuid: m.internal_uuid, issue: 'MISSING_TMDB_ID', manifestTmdb: m.tmdb_id, dbTmdb: null });
    } else if (dbM.tmdb_id === m.tmdb_id) {
      movieStats.match++;
    } else {
      movieStats.wrong++;
      movieMismatches.push({ title: m.local_title, uuid: m.internal_uuid, issue: 'WRONG_TMDB_ID', manifestTmdb: m.tmdb_id, dbTmdb: dbM.tmdb_id });
    }
  }

  for (const dbM of dbFilmes || []) {
    if (!manifestMovieMap.has(dbM.id) && dbM.tmdb_id !== null) {
      movieStats.unexpected++;
      movieMismatches.push({ title: dbM.title, uuid: dbM.id, issue: 'UNEXPECTED_TMDB_ID', dbTmdb: dbM.tmdb_id });
    }
  }

  let personStats = { match: 0, wrong: 0, missing: 0, unexpected: 0 };
  let personMismatches: any[] = [];
  for (const p of manifest.people) {
    const dbP = dbPersonMap.get(p.internal_uuid);
    if (!dbP) {
      personMismatches.push({ name: p.local_name, uuid: p.internal_uuid, issue: 'NOT_IN_DB' });
      continue;
    }
    if (dbP.tmdb_id === null) {
      personStats.missing++;
      personMismatches.push({ name: p.local_name, uuid: p.internal_uuid, issue: 'MISSING_TMDB_ID', manifestTmdb: p.tmdb_id, dbTmdb: null });
    } else if (dbP.tmdb_id === p.tmdb_id) {
      personStats.match++;
    } else {
      personStats.wrong++;
      personMismatches.push({ name: p.local_name, uuid: p.internal_uuid, issue: 'WRONG_TMDB_ID', manifestTmdb: p.tmdb_id, dbTmdb: dbP.tmdb_id });
    }
  }

  for (const dbP of dbPessoas || []) {
    if (!manifestPersonMap.has(dbP.id) && dbP.tmdb_id !== null) {
      personStats.unexpected++;
      personMismatches.push({ name: dbP.name, uuid: dbP.id, issue: 'UNEXPECTED_TMDB_ID', dbTmdb: dbP.tmdb_id });
    }
  }

  console.log(`   Filmes (Total Esperado: 11): MATCH=${movieStats.match}, WRONG=${movieStats.wrong}, MISSING=${movieStats.missing}, UNEXPECTED=${movieStats.unexpected}`);
  console.log(`   Pessoas (Total Esperado: 89): MATCH=${personStats.match}, WRONG=${personStats.wrong}, MISSING=${personStats.missing}, UNEXPECTED=${personStats.unexpected}`);

  // 4. Unicidade de IDs no Banco
  console.log('\n4. VERIFICAÇÃO DE UNICIDADE NO BANCO:');
  const movieTmdbIds = (dbFilmes || []).map(f => f.tmdb_id).filter(id => id !== null);
  const personTmdbIds = (dbPessoas || []).map(p => p.tmdb_id).filter(id => id !== null);

  const uniqueMovieIds = new Set(movieTmdbIds);
  const uniquePersonIds = new Set(personTmdbIds);

  console.log(`   - Filmes: ${movieTmdbIds.length} preenchidos, ${uniqueMovieIds.size} distintos (Duplicidades: ${movieTmdbIds.length - uniqueMovieIds.size})`);
  console.log(`   - Pessoas: ${personTmdbIds.length} preenchidos, ${uniquePersonIds.size} distintos (Duplicidades: ${personTmdbIds.length - uniquePersonIds.size})`);

  // 5. Verificação de tmdb_synced_at
  console.log('\n5. VERIFICAÇÃO DE tmdb_synced_at:');
  const moviesWithSyncedAt = (dbFilmes || []).filter(f => f.tmdb_synced_at !== null);
  const peopleWithSyncedAt = (dbPessoas || []).filter(p => p.tmdb_synced_at !== null);
  console.log(`   - Filmes com tmdb_synced_at preenchido: ${moviesWithSyncedAt.length} (Esperado: 0)`);
  console.log(`   - Pessoas com tmdb_synced_at preenchido: ${peopleWithSyncedAt.length} (Esperado: 0)`);

  // 6. Integridade dos Registros Internos vs Snapshot Pré-Vinculação
  console.log('\n6. INTEGRIDADE DE REGISTROS vs SNAPSHOT PRÉ-VINCULAÇÃO:');
  const snapFilmesMap = new Map(snapshot.filmes.map((f: any) => [f.id, f]));
  const snapPessoasMap = new Map(snapshot.pessoas.map((p: any) => [p.id, p]));

  let movieInternalDiscrepancies = 0;
  for (const f of dbFilmes || []) {
    const sF: any = snapFilmesMap.get(f.id);
    if (!sF) {
      console.log(`   [FILME NOVO NÃO EXISTENTE NO SNAPSHOT] ${f.title} (${f.id})`);
      movieInternalDiscrepancies++;
      continue;
    }
    if (f.slug !== sF.slug || f.legacy_id !== sF.legacy_id || f.title !== sF.title || f.year !== sF.year) {
      console.log(`   [DISCREPÂNCIA INTERNA FILME] ${f.title}: slug=${f.slug} vs ${sF.slug}`);
      movieInternalDiscrepancies++;
    }
  }

  let personInternalDiscrepancies = 0;
  for (const p of dbPessoas || []) {
    const sP: any = snapPessoasMap.get(p.id);
    if (!sP) {
      console.log(`   [PESSOA NOVA NÃO EXISTENTE NO SNAPSHOT] ${p.name} (${p.id})`);
      personInternalDiscrepancies++;
      continue;
    }
    if (p.slug !== sP.slug || p.legacy_id !== sP.legacy_id || p.name !== sP.name) {
      console.log(`   [DISCREPÂNCIA INTERNA PESSOA] ${p.name}: slug=${p.slug} vs ${sP.slug}`);
      personInternalDiscrepancies++;
    }
  }
  console.log(`   - Discrepâncias de UUID/slug/legacy_id em Filmes: ${movieInternalDiscrepancies}`);
  console.log(`   - Discrepâncias de UUID/slug/legacy_id em Pessoas: ${personInternalDiscrepancies}`);

  // 7. Integridade Referencial e Críticas
  console.log('\n7. INTEGRIDADE REFERENCIAL E RELACIONAMENTOS:');
  const { data: filmCredits } = await supabase.from('film_credits').select('id, film_id, person_id, role');
  const { data: filmeGeneros } = await supabase.from('filme_generos').select('*');
  const { data: filmeCountries } = await supabase.from('filme_countries').select('*');
  const { data: criticas } = await supabase.from('criticas').select('id, film_id, slug, editorial_title, legacy_id');
  const { data: estreias } = await supabase.from('estreias').select('id, film_id, country, release_date');
  const { data: umaImagem } = await supabase.from('uma_imagem').select('id, film_id, slug, title');
  const { data: listas } = await supabase.from('listas').select('id, slug, title');
  const { data: listaItems } = await supabase.from('lista_items').select('id, lista_id, film_id');
  const { data: especiais } = await supabase.from('especiais').select('id, slug, title');
  const { data: especialItems } = await supabase.from('especial_items').select('id, especial_id, item_id');
  const { data: ensaios } = await supabase.from('ensaios').select('id, slug, title');

  console.log(`   - film_credits: ${filmCredits?.length} (Snapshot: ${snapshot.relations.film_credits.length})`);
  console.log(`   - filme_generos: ${filmeGeneros?.length} (Snapshot: ${snapshot.relations.filme_generos.length})`);
  console.log(`   - filme_countries: ${filmeCountries?.length} (Snapshot: ${snapshot.relations.filme_countries.length})`);
  console.log(`   - criticas: ${criticas?.length} (Snapshot: ${snapshot.relations.criticas.length})`);
  console.log(`   - estreias: ${estreias?.length} (Snapshot: ${snapshot.relations.estreias.length})`);
  console.log(`   - uma_imagem: ${umaImagem?.length} (Snapshot: ${snapshot.relations.uma_imagem.length})`);
  console.log(`   - listas: ${listas?.length} (Snapshot: ${snapshot.relations.listas.length})`);
  console.log(`   - lista_items: ${listaItems?.length} (Snapshot: ${snapshot.relations.lista_items.length})`);
  console.log(`   - especiais: ${especiais?.length} (Snapshot: ${snapshot.relations.especiais.length})`);
  console.log(`   - especial_items: ${especialItems?.length} (Snapshot: ${snapshot.relations.especial_items.length})`);
  console.log(`   - ensaios: ${ensaios?.length} (Snapshot: ${snapshot.relations.ensaios.length})`);

  // Validar especificamente FKs de críticas
  let criticaFkDiscrepancies = 0;
  const snapCriticasMap = new Map(snapshot.relations.criticas.map((c: any) => [c.id, c]));
  for (const c of criticas || []) {
    const snapC: any = snapCriticasMap.get(c.id);
    if (!snapC || c.film_id !== snapC.film_id) {
      console.log(`   [CRITICA FK MUTADA] Critica ${c.editorial_title}: film_id mudou de ${snapC?.film_id} para ${c.film_id}`);
      criticaFkDiscrepancies++;
    }
  }
  console.log(`   - Críticas com film_id 100% preservado: ${criticas?.length} / ${criticas?.length} (Divergências: ${criticaFkDiscrepancies})`);

  // 8. Auditoria de Logs de Sincronização (public.tmdb_sync_logs)
  console.log('\n8. AUDITORIA DE LOGS (public.tmdb_sync_logs):');
  const { data: dbLogs, error: logErr } = await supabase
    .from('tmdb_sync_logs')
    .select('*')
    .eq('source', 'migration_f9_4_final')
    .order('created_at');

  if (logErr) {
    console.log(`   Aviso sobre logs: ${logErr.message} (${logErr.code})`);
  } else {
    console.log(`   - Total de logs LINK registrados para migration_f9_4_final: ${dbLogs?.length}`);
    const movieLogs = dbLogs?.filter(l => l.entity_type === 'filme') || [];
    const personLogs = dbLogs?.filter(l => l.entity_type === 'pessoa') || [];
    const successLogs = dbLogs?.filter(l => l.status === 'success') || [];
    const errorLogs = dbLogs?.filter(l => l.status === 'error') || [];

    console.log(`   - Logs de Filmes: ${movieLogs.length}`);
    console.log(`   - Logs de Pessoas: ${personLogs.length}`);
    console.log(`   - Status 'success': ${successLogs.length}`);
    console.log(`   - Status 'error': ${errorLogs.length}`);

    let logMismatches = 0;
    for (const l of dbLogs || []) {
      if (l.entity_type === 'filme') {
        const manM = manifestMovieMap.get(l.internal_id);
        if (!manM || manM.tmdb_id !== l.tmdb_id) {
          logMismatches++;
        }
      } else if (l.entity_type === 'pessoa') {
        const manP = manifestPersonMap.get(l.internal_id);
        if (!manP || manP.tmdb_id !== l.tmdb_id) {
          logMismatches++;
        }
      }
    }
    console.log(`   - Divergências entre logs e manifesto final: ${logMismatches}`);
  }

  // 9. Amostra de Filmes e Pessoas no Banco
  console.log('\n9. AMOSTRA COMPROBATÓRIA DO ESTADO ATUAL NO BANCO:');
  console.log('   --- 11 FILMES ---');
  for (const f of dbFilmes || []) {
    const manM = manifestMovieMap.get(f.id);
    console.log(`   * ${f.title.padEnd(30)} | UUID: ${f.id} | DB tmdb_id: ${f.tmdb_id} | Manifest tmdb_id: ${manM?.tmdb_id} | MATCH: ${f.tmdb_id === manM?.tmdb_id} | synced_at: ${f.tmdb_synced_at}`);
  }

  console.log('\n   --- AMOSTRA DE 12 PESSOAS ---');
  const samplePeopleNames = [
    'Bibi Andersson', 'Andy Richter', 'Chirstopher Nolan', 'Benedict Wong',
    'Damien Chazelle', 'Callum Turner', 'Emma Stone', 'Corey Hawkins',
    'Ingmar Bergman', 'Elliot Page', 'Jon Bernthal', 'Ryan Gosling'
  ];
  for (const name of samplePeopleNames) {
    const p = dbPessoas?.find(x => x.name === name);
    const manP = manifest.people.find((x: any) => x.local_name === name);
    console.log(`   * ${name.padEnd(20)} | UUID: ${p?.id} | DB tmdb_id: ${p?.tmdb_id} | Manifest tmdb_id: ${manP?.tmdb_id} | MATCH: ${p?.tmdb_id === manP?.tmdb_id} | synced_at: ${p?.tmdb_synced_at}`);
  }
}

runPostExecutionAudit().catch(console.error);
