import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabaseAnonKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log('='.repeat(80));
  console.log('LANTERNA MÁGICA — AUDITORIA COMPLETA F10.4E-D5 PÓS-EXECUÇÃO REAL');
  console.log('='.repeat(80));

  // 1. SNAPSHOT GLOBAL PÓS-EXECUÇÃO (ADMIN CONTEXT)
  console.log('\n[1. SNAPSHOT GLOBAL PÓS-EXECUÇÃO]');
  const { data: allFilms, error: filmsErr } = await supabaseAdmin.from('filmes').select('*').order('title');
  const { data: allPeople, error: peopleErr } = await supabaseAdmin.from('pessoas').select('*').order('name');
  const { data: allCredits, error: creditsErr } = await supabaseAdmin.from('film_credits').select('*');
  const { data: allLogs, error: logsErr } = await supabaseAdmin.from('tmdb_sync_logs').select('*').order('created_at', { ascending: true });

  if (filmsErr) console.error('filmsErr:', filmsErr);
  if (peopleErr) console.error('peopleErr:', peopleErr);
  if (creditsErr) console.error('creditsErr:', creditsErr);
  if (logsErr) console.error('logsErr:', logsErr);

  const totalFilms = allFilms?.length || 0;
  const totalPeople = allPeople?.length || 0;
  const peopleWithTmdb = allPeople?.filter(p => p.tmdb_id !== null).length || 0;
  const peopleWithoutTmdb = allPeople?.filter(p => p.tmdb_id === null).length || 0;
  const totalCredits = allCredits?.length || 0;
  const totalLogs = allLogs?.length || 0;

  console.log(`• Filmes Total: ${totalFilms} (Esperado: 12) -> ${totalFilms === 12 ? 'OK' : 'DIVERGÊNCIA'}`);
  console.log(`• Pessoas Total: ${totalPeople} (Esperado: 104) -> ${totalPeople === 104 ? 'OK' : 'DIVERGÊNCIA'}`);
  console.log(`• Pessoas com tmdb_id: ${peopleWithTmdb} (Esperado: 104) -> ${peopleWithTmdb === 104 ? 'OK' : 'DIVERGÊNCIA'}`);
  console.log(`• Pessoas sem tmdb_id: ${peopleWithoutTmdb} (Esperado: 0) -> ${peopleWithoutTmdb === 0 ? 'OK' : 'DIVERGÊNCIA'}`);
  console.log(`• Film Credits Total: ${totalCredits} (Esperado: 111) -> ${totalCredits === 111 ? 'OK' : 'DIVERGÊNCIA'}`);
  console.log(`• tmdb_sync_logs Total: ${totalLogs} (Esperado: 116) -> ${totalLogs === 116 ? 'OK' : 'DIVERGÊNCIA'}`);

  // 2. LE TROU — ESTADO FINAL
  console.log('\n[2. LE TROU — ESTADO FINAL]');
  const LE_TROU_ID = '34d2715c-bd3f-4737-b109-cce4b6724599';
  const leTrou = allFilms?.find(f => f.id === LE_TROU_ID);
  console.log(`• Filme: "${leTrou?.title}" (Slug: ${leTrou?.slug}, TMDB ID: ${leTrou?.tmdb_id})`);
  console.log(`• Filmes updated_at: ${leTrou?.updated_at}`);

  const leTrouCredits = allCredits?.filter(c => c.film_id === LE_TROU_ID) || [];
  console.log(`• Total de créditos em Le Trou: ${leTrouCredits.length} (Esperado: 19) -> ${leTrouCredits.length === 19 ? 'OK' : 'DIVERGÊNCIA'}`);

  const peopleMap = new Map((allPeople || []).map(p => [p.id, p]));

  // Previous 6 local credit IDs
  const previousLocalCreditIds = [
    'aadc8c94-8bcd-4a4d-8a60-653600683684', // Michel Constantin (Ator)
    '98d0ee96-19ba-497c-aad1-2e9d58668992', // Jean Keraudy (Ator)
    'b4b48d85-b0d6-493f-8606-ee0e5018fa35', // Philippe Leroy (Ator)
    '5cbc6738-b44d-439b-af01-f27eab6d9c2b', // Raymond Meunier (Ator)
    'b635d5a0-593d-4622-8e07-77c5a9812bfc', // Marc Michel (Ator)
    '899f236e-1c87-4249-b875-dd5950abe402', // Jacques Becker (Diretor)
  ];

  const sortedCredits = [...leTrouCredits].sort((a, b) => {
    if (a.department === b.department) {
      return (a.order_index ?? 999) - (b.order_index ?? 999);
    }
    return a.department === 'Elenco' ? -1 : 1;
  });

  console.log('\nLista Detalhada dos 19 Créditos de Le Trou:');
  sortedCredits.forEach((c, idx) => {
    const person = peopleMap.get(c.person_id);
    const isLocalPrevious = previousLocalCreditIds.includes(c.id);
    let classification = 'NEW_CREDIT';
    if (isLocalPrevious) {
      if (c.role === 'Diretor' && person?.name === 'Jacques Becker') {
        classification = 'EXACT_LOCAL_CREDIT (preservado)';
      } else {
        classification = 'SEMANTIC_LOCAL_CREDIT (preservado)';
      }
    } else {
      classification = 'NEW_CREDIT (inserido via RPC)';
    }

    console.log(`[${(idx + 1).toString().padStart(2, ' ')}] Credit ID: ${c.id}`);
    console.log(`     Person: "${person?.name}" | UUID: ${c.person_id} | TMDB Person ID: ${person?.tmdb_id}`);
    console.log(`     Dept: ${c.department} | Role: ${c.role} | Character: ${c.character_name || '-'} | Order: ${c.order_index}`);
    console.log(`     Classificação: ${classification}`);
  });

  // 3. PRESERVAÇÃO DOS 6 UUIDs LOCAIS
  console.log('\n[3. PRESERVAÇÃO DOS 6 UUIDs LOCAIS]');
  const expected6 = [
    { name: 'Jacques Becker', uuid: 'e807147c-9db1-4ddf-845c-7242c738d5c9', tmdbId: 103393 },
    { name: 'Michel Constantin', uuid: '8f277617-e8b9-4873-a3ad-62a975f11b62', tmdbId: 24495 },
    { name: 'Jean Keraudy', uuid: '0469e615-5b64-4d13-992c-b6f005d55683', tmdbId: 103397 },
    { name: 'Philippe Leroy', uuid: '0e574f0a-5adb-470f-9347-c1e128457dc6', tmdbId: 25333 },
    { name: 'Raymond Meunier', uuid: '7a53965b-7ec9-436a-9901-f2b09893753a', tmdbId: 103398 },
    { name: 'Marc Michel', uuid: '181877fa-f094-4c8f-a12d-07c1a6e2d0b5', tmdbId: 46936 },
  ];

  expected6.forEach(exp => {
    const p = peopleMap.get(exp.uuid);
    console.log(`• ${exp.name}:`);
    console.log(`  - UUID Preservado: ${p?.id === exp.uuid ? 'SIM (' + p?.id + ')' : 'NÃO'}`);
    console.log(`  - tmdb_id Atualizado: ${p?.tmdb_id === exp.tmdbId ? 'SIM (' + p?.tmdb_id + ')' : 'NÃO'}`);
    console.log(`  - tmdb_synced_at permanece NULL: ${p?.tmdb_synced_at === null ? 'SIM (null)' : 'NÃO (' + p?.tmdb_synced_at + ')'}`);
    console.log(`  - status inalterado: ${p?.status}`);
    console.log(`  - bio/editorial preservado: ${!!p?.bio} | editorial_profile: ${p?.editorial_profile || 'null'} | is_editorial_profile: ${p?.is_editorial_profile}`);
  });

  // 4. AUDITAR AS 9 PESSOAS NOVAS
  console.log('\n[4. AUDITAR AS 9 PESSOAS NOVAS]');
  const expected9Tmdb = [
    { tmdbId: 103399, expectedName: 'André Bervil' },
    { tmdbId: 103400, expectedName: 'Jean-Paul Coquelin' },
    { tmdbId: 103401, expectedName: 'Eddy Rasimi' },
    { tmdbId: 35585, expectedName: 'José Giovanni' },
    { tmdbId: 3582, expectedName: 'Jean Aurel' },
    { tmdbId: 11988, expectedName: 'Ghislain Cloquet' },
    { tmdbId: 11532, expectedName: 'Marguerite Renoir' },
    { tmdbId: 1620100, expectedName: 'Geneviève Vaury' },
    { tmdbId: 103396, expectedName: 'Philippe Arthuys' },
  ];

  expected9Tmdb.forEach(exp => {
    const p = allPeople?.find(person => person.tmdb_id === exp.tmdbId);
    console.log(`• TMDB ${exp.tmdbId} ("${exp.expectedName}"):`);
    console.log(`  - Encontrado no banco: ${p ? 'SIM' : 'NÃO'}`);
    console.log(`  - UUID: ${p?.id}`);
    console.log(`  - Nome: ${p?.name}`);
    console.log(`  - Slug: ${p?.slug}`);
    console.log(`  - Status: ${p?.status} (Esperado: draft)`);
    console.log(`  - Photo URL: ${p?.photo_url || p?.photo || 'null'}`);
    console.log(`  - Birth: ${p?.birth_date || 'null'} | Death: ${p?.death_date || 'null'} | IMDB: ${p?.imdb_id || 'null'}`);
    console.log(`  - is_editorial_profile: ${p?.is_editorial_profile} (Esperado: false)`);
    console.log(`  - primary_roles: ${JSON.stringify(p?.primary_roles)}`);
    console.log(`  - tmdb_synced_at: ${p?.tmdb_synced_at}`);
  });

  // 5. STORAGE PÓS-SUCESSO
  console.log('\n[5. STORAGE PÓS-SUCESSO]');
  const storagePaths = [
    'people/tmdb-35585/profile.jpg',
    'people/tmdb-103399/profile.jpg',
    'people/tmdb-103400/profile.jpg',
    'people/tmdb-103401/profile.jpg',
    'people/tmdb-11532/profile.jpg',
    'people/tmdb-103396/profile.jpg'
  ];

  for (const path of storagePaths) {
    const parts = path.split('/');
    const folder = parts.slice(0, -1).join('/');
    const file = parts[parts.length - 1];
    const { data: listData, error: listErr } = await supabaseAdmin.storage.from('lanterna-media').list(folder);
    const item = listData?.find(f => f.name === file);
    const { data: publicUrlData } = supabaseAdmin.storage.from('lanterna-media').getPublicUrl(path);

    console.log(`• Path: ${path}`);
    console.log(`  - Status: ${item ? 'PRESENT' : 'ABSENT'}`);
    if (item) {
      console.log(`  - Tamanho: ${item.metadata?.size || (item as any).size} bytes`);
      console.log(`  - MIME: ${item.metadata?.mimetype || 'image/jpeg'}`);
      console.log(`  - Public URL: ${publicUrlData.publicUrl}`);
    }
  }

  // 6. LOGS DA EXECUÇÃO
  console.log('\n[6. LOGS DA EXECUÇÃO]');
  console.log(`• Total Histórico de Logs: ${allLogs?.length}`);
  const executionLogs = (allLogs || []).filter(l => {
    const createdAt = new Date(l.created_at).getTime();
    return Date.now() - createdAt < 1000 * 60 * 180; // last 3 hours
  });
  console.log(`• Logs desta Execução Real: ${executionLogs.length}`);
  executionLogs.forEach((l, i) => {
    console.log(`  [${i + 1}] ID: ${l.id} | Op: ${l.operation} | Entity: ${l.entity_type} | Internal ID: ${l.internal_id} | TMDB ID: ${l.tmdb_id} | Status: ${l.status} | Source: ${l.source} | Time: ${l.created_at}`);
  });

  // 7. DUPLICATAS E INTEGRIDADE
  console.log('\n[7. DUPLICATAS E INTEGRIDADE REFERENCIAL]');
  const tmdbMap = new Map<number, any[]>();
  const slugMap = new Map<string, any[]>();

  allPeople?.forEach(p => {
    if (p.tmdb_id) {
      if (!tmdbMap.has(p.tmdb_id)) tmdbMap.set(p.tmdb_id, []);
      tmdbMap.get(p.tmdb_id)!.push(p);
    }
    if (p.slug) {
      if (!slugMap.has(p.slug)) slugMap.set(p.slug, []);
      slugMap.get(p.slug)!.push(p);
    }
  });

  const dupTmdbPeople = Array.from(tmdbMap.entries()).filter(([_, list]) => list.length > 1);
  const dupSlugPeople = Array.from(slugMap.entries()).filter(([_, list]) => list.length > 1);

  console.log(`• Pessoas duplicadas por tmdb_id: ${dupTmdbPeople.length} (Esperado: 0)`);
  console.log(`• Pessoas duplicadas por slug: ${dupSlugPeople.length} (Esperado: 0)`);

  const creditMap = new Map<string, any[]>();
  leTrouCredits.forEach(c => {
    const key = `${c.film_id}:${c.person_id}:${c.department}:${c.role}:${c.character_name || ''}`;
    if (!creditMap.has(key)) creditMap.set(key, []);
    creditMap.get(key)!.push(c);
  });
  const dupCredits = Array.from(creditMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`• Créditos logicamente duplicados em Le Trou: ${dupCredits.length} (Esperado: 0)`);

  const orphanCredits = allCredits?.filter(c => !peopleMap.has(c.person_id)) || [];
  console.log(`• Créditos órfãos (sem pessoa correspondente no banco): ${orphanCredits.length} (Esperado: 0)`);

  // 9. TESTE PÚBLICO READ-ONLY DO FILMEDETAIL
  console.log('\n[9. TESTE PÚBLICO READ-ONLY DO FILMEDETAIL (ANON CLIENT)]');
  const { data: publicLeTrouCredits, error: pubCredErr } = await supabaseAnon
    .from('film_credits')
    .select('id, film_id, person_id, department, role, character_name, order_index, fallback_person_name, pessoas (id, name, slug, photo_url, is_editorial_profile, status)')
    .eq('film_id', LE_TROU_ID)
    .order('order_index', { ascending: true });

  console.log(`• Créditos retornados para cliente público/anônimo: ${publicLeTrouCredits?.length} (Esperado: 19)`);
  if (pubCredErr) console.error('Erro query pública:', pubCredErr);
  const castCount = publicLeTrouCredits?.filter(c => c.department === 'Elenco').length || 0;
  const crewCount = publicLeTrouCredits?.filter(c => c.department !== 'Elenco').length || 0;
  console.log(`  - Elenco público: ${castCount} (Esperado: 8)`);
  console.log(`  - Equipe técnica pública: ${crewCount} (Esperado: 11)`);
  console.log(`  - Total visível: ${castCount + crewCount} (Esperado: 19)`);

  // 10. DRY-RUN DE IDEMPOTÊNCIA PÓS-EXECUÇÃO
  console.log('\n[10. DRY-RUN DE IDEMPOTÊNCIA PÓS-EXECUÇÃO]');
  const dryRunResult = await reconcileFilmCreditsDryRun(LE_TROU_ID, { headers: {} });
  console.log(`• Reconciliação pós-execução executada:`);
  console.log(`  - Total de pessoas remotas processadas: ${dryRunResult.people.length}`);
  console.log(`  - EXACT_TMDB_MATCH: ${dryRunResult.people.filter(p => p.status === 'EXACT_TMDB_MATCH').length}`);
  console.log(`  - POSSIBLE_LOCAL_MATCH: ${dryRunResult.people.filter(p => p.status === 'POSSIBLE_LOCAL_MATCH').length}`);
  console.log(`  - NEW_PERSON: ${dryRunResult.people.filter(p => p.status === 'NEW_PERSON').length}`);
  console.log(`  - Total de créditos remotos: ${dryRunResult.credits.length}`);
  console.log(`  - EXACT_LOCAL_CREDIT: ${dryRunResult.credits.filter(c => c.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT').length}`);
  console.log(`  - SEMANTIC_LOCAL_CREDIT: ${dryRunResult.credits.filter(c => c.localCreditComparisonStatus === 'SEMANTIC_LOCAL_CREDIT').length}`);
  console.log(`  - NEW_CREDIT: ${dryRunResult.credits.filter(c => c.localCreditComparisonStatus === 'NEW_CREDIT').length}`);
  console.log(`  - Summary:`, JSON.stringify(dryRunResult.summary, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('FIM DA AUDITORIA F10.4E-D5');
  console.log('='.repeat(80));
}

runAudit().catch(err => {
  console.error('Erro na auditoria:', err);
  process.exit(1);
});
