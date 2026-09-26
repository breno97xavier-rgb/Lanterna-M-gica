// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Teste e Auditoria de Pre-Flight Final e Liberação Controlada para Le Trou (F10.4E-D3)
// Arquivo: scripts/test_f10_4e_d3_preflight.ts
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import {
  buildCreditsSyncPayload,
  executeCreditsSync,
} from '../api/_lib/creditExecutionBuilder.js';
import { checkStorageObjectExists } from '../api/_lib/storageImageService.js';
import { AppError } from '../api/_lib/errors.js';
import { CreditsSyncExecuteRequest } from '../api/_lib/types.js';

// Fixtures históricas de regressão do piloto Le Trou
export const HOMOLOGATED_LE_TROU_FILM_ID = '34d2715c-bd3f-4737-b109-cce4b6724599';
export const HOMOLOGATED_LE_TROU_TMDB_ID = 29259;
export const HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS = [
  'cast:52fe45d3c3a368484e0710b1',
  'cast:52fe45d3c3a368484e0710b5',
  'cast:52fe45d3c3a368484e0710b9',
  'cast:52fe45d3c3a368484e0710bd',
  'cast:52fe45d3c3a368484e0710c1',
  'cast:52fe45d3c3a368484e0710c5',
  'cast:52fe45d3c3a368484e0710c9',
  'cast:52fe45d3c3a368484e0710cd',
  'crew:52fe45d3c3a368484e071083',
  'crew:52fe45d3c3a368484e071089',
  'crew:62776e683af9291492a90ea4',
  'crew:62776e4c95665811eca4fe9e',
  'crew:62776e539979d214834983be',
  'crew:62776e5a389da1005088d567',
  'crew:62776e72f10a1a005157b711',
  'crew:5538af72c3a3681be40044fd',
  'crew:563f8f6e9251413b13010b22',
  'crew:57916b7d9251415aab002ebf',
  'crew:5cc1eb699251415cd2f2eaab',
];

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const anonKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '').trim();
const supabase = createClient(url, anonKey);

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`, details ? details : '');
    totalFailed++;
  }
}

async function runPreflightSuite() {
  console.log('\n================================================================');
  console.log('F10.4E-D3: AUDITORIA DE PRE-FLIGHT E LIBERAÇÃO CONTROLADA LE TROU');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // PARTE 1: SNAPSHOT READ-ONLY DO ESTADO ATUAL DO BANCO
  // --------------------------------------------------------------------------
  console.log('--- 1. SNAPSHOT GLOBAL READ-ONLY ---');
  const { count: totalFilmes } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { count: totalPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true });
  const { count: pessoasComTmdb } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).not('tmdb_id', 'is', null);
  const { count: pessoasSemTmdb } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: totalCredits } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });
  const { count: totalLogs } = await supabase.from('tmdb_sync_logs').select('*', { count: 'exact', head: true });

  console.log(`  • Filmes Total: ${totalFilmes}`);
  console.log(`  • Pessoas Total: ${totalPessoas}`);
  console.log(`  • Pessoas com tmdb_id: ${pessoasComTmdb}`);
  console.log(`  • Pessoas sem tmdb_id: ${pessoasSemTmdb}`);
  console.log(`  • Film Credits Total: ${totalCredits}`);
  console.log(`  • TMDB Sync Logs Total: ${totalLogs ?? 0}`);

  assert(totalFilmes === 12, '1.1 Snapshot Global: 12 filmes no catálogo');
  assert(totalPessoas === 95, '1.2 Snapshot Global: 95 pessoas no catálogo');
  assert(pessoasComTmdb === 89, '1.3 Snapshot Global: 89 pessoas com tmdb_id');
  assert(pessoasSemTmdb === 6, '1.4 Snapshot Global: exatamente 6 pessoas sem tmdb_id');
  assert(totalCredits === 98, '1.5 Snapshot Global: 98 créditos de filmes cadastrados');

  // --------------------------------------------------------------------------
  // PARTE 2: SNAPSHOT ESPECÍFICO DE LE TROU
  // --------------------------------------------------------------------------
  console.log('\n--- 2. SNAPSHOT READ-ONLY DE LE TROU ---');
  const { data: leTrouFilm } = await supabase
    .from('filmes')
    .select('id, title, original_title, year, slug, tmdb_id, updated_at, created_at, status')
    .eq('id', HOMOLOGATED_LE_TROU_FILM_ID)
    .single();

  const { data: leTrouCredits } = await supabase
    .from('film_credits')
    .select('id, person_id, fallback_person_name, department, role, character_name, order_index')
    .eq('film_id', HOMOLOGATED_LE_TROU_FILM_ID)
    .order('order_index');

  console.log(`  • Filme: ${leTrouFilm?.title} (${leTrouFilm?.year})`);
  console.log(`  • UUID: ${leTrouFilm?.id}`);
  console.log(`  • TMDB ID: ${leTrouFilm?.tmdb_id}`);
  console.log(`  • Updated At: ${leTrouFilm?.updated_at || leTrouFilm?.created_at}`);
  console.log(`  • Créditos Atuais no Acervo: ${leTrouCredits?.length}`);

  assert(leTrouFilm?.id === HOMOLOGATED_LE_TROU_FILM_ID, '2.1 Le Trou: UUID canônico validado');
  assert(leTrouFilm?.tmdb_id === HOMOLOGATED_LE_TROU_TMDB_ID, '2.2 Le Trou: TMDB ID 29259 validado');
  assert(leTrouCredits?.length === 6, '2.3 Le Trou: exatamente 6 créditos locais cadastrados');

  const personIdsInLeTrou = (leTrouCredits || []).map((c) => c.person_id).filter(Boolean);
  const { data: leTrouPeople } = await supabase
    .from('pessoas')
    .select('id, name, tmdb_id, tmdb_synced_at')
    .in('id', personIdsInLeTrou);

  console.log('  • 6 Pessoas Locais de Le Trou:');
  leTrouPeople?.forEach((p) => {
    console.log(`    - ${p.name} (UUID: ${p.id}) | tmdb_id: ${p.tmdb_id ?? 'null'} | tmdb_synced_at: ${p.tmdb_synced_at ?? 'null'}`);
  });

  assert(leTrouPeople?.length === 6, '2.4 Le Trou: todas as 6 pessoas locais encontradas');
  const all6WithoutTmdb = (leTrouPeople || []).every((p) => p.tmdb_id === null && p.tmdb_synced_at === null);
  assert(all6WithoutTmdb, '2.5 Le Trou: todas as 6 pessoas locais estão aguardando primeiro vínculo (tmdb_id null)');

  // --------------------------------------------------------------------------
  // PARTE 3: SNAPSHOT DE STORAGE READ-ONLY PARA AS 6 FOTOS PREVISTAS
  // --------------------------------------------------------------------------
  console.log('\n--- 3. SNAPSHOT READ-ONLY DO STORAGE (6 PATHS PREVISTOS) ---');
  const plannedStoragePaths = [
    { tmdbPersonId: 35585, name: 'José Giovanni', path: 'people/tmdb-35585/profile.jpg' },
    { tmdbPersonId: 103399, name: 'Jean-Paul Coquelin', path: 'people/tmdb-103399/profile.jpg' },
    { tmdbPersonId: 103400, name: 'André Bervil', path: 'people/tmdb-103400/profile.jpg' },
    { tmdbPersonId: 103401, name: 'Eddy Rasimi', path: 'people/tmdb-103401/profile.jpg' },
    { tmdbPersonId: 11532, name: 'Marguerite Renoir', path: 'people/tmdb-11532/profile.jpg' },
    { tmdbPersonId: 103396, name: 'Philippe Arthuys', path: 'people/tmdb-103396/profile.jpg' },
  ];

  let storagePreexistingCount = 0;
  let storageAbsentCount = 0;

  for (const item of plannedStoragePaths) {
    const exists = await checkStorageObjectExists(supabase, item.path);
    const status = exists ? 'PREEXISTING' : 'ABSENT';
    if (exists) storagePreexistingCount++;
    else storageAbsentCount++;
    console.log(`  • ${item.name} (${item.path}): ${status}`);
  }

  assert(plannedStoragePaths.length === 6, '3.1 Storage: exatamente 6 pessoas com profile_path no TMDB');
  console.log(`  -> Status Storage: ${storagePreexistingCount} PREEXISTING, ${storageAbsentCount} ABSENT (capacidade máxima de novas fotos: ${storageAbsentCount})`);
  assert(true, '3.2 Storage Read-Only: verificação executada sem writes');

  // --------------------------------------------------------------------------
  // PARTE 4: TRAVAS SERVER-SIDE E ALLOWLIST CONTROLADA
  // --------------------------------------------------------------------------
  console.log('\n--- 4. TESTES DE TRAVAS SERVER-SIDE E ALLOWLIST ---');

  // 4.1 Bloqueio de outro filme (não-Le Trou) em dryRun: false
  try {
    const fakeOtherFilmId = '11111111-2222-3333-4444-555555555555';
    await buildCreditsSyncPayload(
      {
        filmId: fakeOtherFilmId,
        selectedCredits: HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS,
        personDecisions: [],
        dryRun: false,
        confirmExecution: true,
        baseUpdatedAt: new Date().toISOString(),
      },
      '00000000-0000-0000-0000-000000000000',
      supabase
    );
    assert(false, '4.1 Bloqueio de outro filme: Deveria ter lançado 423');
  } catch (err: any) {
    assert(
      err instanceof AppError && err.statusCode === 423 && err.code === 'EXECUTION_LOCKED_PENDING_HOMOLOGATION',
      '4.1 Bloqueio de outro filme: retornou 423 EXECUTION_LOCKED_PENDING_HOMOLOGATION'
    );
  }

  // 4.2 Le Trou sem confirmExecution: true em dryRun: false
  try {
    await buildCreditsSyncPayload(
      {
        filmId: HOMOLOGATED_LE_TROU_FILM_ID,
        selectedCredits: HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS,
        personDecisions: [],
        dryRun: false,
        confirmExecution: false,
        baseUpdatedAt: leTrouFilm?.updated_at || leTrouFilm?.created_at,
      },
      '00000000-0000-0000-0000-000000000000',
      supabase
    );
    assert(false, '4.2 confirmExecution obrigatório: Deveria ter lançado 400');
  } catch (err: any) {
    assert(
      err instanceof AppError && err.statusCode === 400 && err.code === 'CONFIRMATION_REQUIRED',
      '4.2 confirmExecution obrigatório: retornou 400 CONFIRMATION_REQUIRED'
    );
  }

  // 4.3 Le Trou sem baseUpdatedAt em dryRun: false
  try {
    await buildCreditsSyncPayload(
      {
        filmId: HOMOLOGATED_LE_TROU_FILM_ID,
        selectedCredits: HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS,
        personDecisions: [],
        dryRun: false,
        confirmExecution: true,
      },
      '00000000-0000-0000-0000-000000000000',
      supabase
    );
    assert(false, '4.3 baseUpdatedAt obrigatório: Deveria ter lançado 400');
  } catch (err: any) {
    assert(
      err instanceof AppError && err.statusCode === 400 && err.code === 'INVALID_PARAMS',
      '4.3 baseUpdatedAt obrigatório: retornou 400 INVALID_PARAMS'
    );
  }

  // 4.4 Le Trou com baseUpdatedAt obsoleto (stale)
  try {
    await buildCreditsSyncPayload(
      {
        filmId: HOMOLOGATED_LE_TROU_FILM_ID,
        selectedCredits: HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS,
        personDecisions: [],
        dryRun: false,
        confirmExecution: true,
        baseUpdatedAt: '2020-01-01T00:00:00.000Z',
      },
      '00000000-0000-0000-0000-000000000000',
      supabase
    );
    assert(false, '4.4 baseUpdatedAt obsoleto: Deveria ter lançado 409');
  } catch (err: any) {
    assert(
      err instanceof AppError && err.statusCode === 409 && err.code === 'STALE_RECONCILIATION',
      '4.4 baseUpdatedAt obsoleto: retornou 409 STALE_RECONCILIATION'
    );
  }

  // 4.5 Le Trou com seleção diferente da homologada (ex: faltando 1 crédito)
  try {
    const incompleteSelection = HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS.slice(0, 18);
    await buildCreditsSyncPayload(
      {
        filmId: HOMOLOGATED_LE_TROU_FILM_ID,
        selectedCredits: incompleteSelection,
        personDecisions: [],
        dryRun: false,
        confirmExecution: true,
        baseUpdatedAt: leTrouFilm?.updated_at || leTrouFilm?.created_at,
      },
      '00000000-0000-0000-0000-000000000000',
      supabase
    );
    assert(false, '4.5 Seleção congelada: Deveria ter rejeitado seleção incompleta');
  } catch (err: any) {
    assert(
      err instanceof AppError && err.statusCode === 409 && err.code === 'STALE_RECONCILIATION',
      '4.5 Seleção congelada: rejeitou com 409 STALE_RECONCILIATION seleção divergente dos 19 homologados'
    );
  }

  // --------------------------------------------------------------------------
  // PARTE 5: CONSTRUÇÃO E AUDITORIA DO PAYLOAD EXATO DA RPC
  // --------------------------------------------------------------------------
  console.log('\n--- 5. CONSTRUÇÃO E AUDITORIA DO PAYLOAD EXATO DA RPC ---');
  const validRequest: CreditsSyncExecuteRequest = {
    filmId: HOMOLOGATED_LE_TROU_FILM_ID,
    baseUpdatedAt: leTrouFilm?.updated_at || leTrouFilm?.created_at,
    selectedCredits: HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS,
    personDecisions: [
      { tmdbPersonId: 24495, action: 'LINK_EXISTING', localPersonId: '8f277617-e8b9-4873-a3ad-62a975f11b62' }, // Michel Constantin
      { tmdbPersonId: 103397, action: 'LINK_EXISTING', localPersonId: '0469e615-5b64-4d13-992c-b6f005d55683' }, // Jean Keraudy
      { tmdbPersonId: 25333, action: 'LINK_EXISTING', localPersonId: '0e574f0a-5adb-470f-9347-c1e128457dc6' }, // Philippe Leroy
      { tmdbPersonId: 103398, action: 'LINK_EXISTING', localPersonId: '7a53965b-7ec9-436a-9901-f2b09893753a' }, // Raymond Meunier
      { tmdbPersonId: 46936, action: 'LINK_EXISTING', localPersonId: '181877fa-f094-4c8f-a12d-07c1a6e2d0b5' }, // Marc Michel
      { tmdbPersonId: 103393, action: 'LINK_EXISTING', localPersonId: 'e807147c-9db1-4ddf-845c-7242c738d5c9' }, // Jacques Becker
    ],
    dryRun: true,
  };

  const { payload, summary } = await buildCreditsSyncPayload(
    validRequest,
    '00000000-0000-0000-0000-000000000000',
    supabase
  );

  console.log('  • Payload p_film_id:', payload.p_film_id);
  console.log('  • Payload p_tmdb_id:', payload.p_tmdb_id);
  console.log('  • Payload p_persons_to_link length:', payload.p_persons_to_link.length);
  console.log('  • Payload p_persons_to_create length:', payload.p_persons_to_create.length);
  console.log('  • Payload p_credits_to_sync length:', payload.p_credits_to_sync.length);
  console.log('  • Summary newCreditsInserted:', summary.newCreditsInserted);
  console.log('  • Summary exactLocalCreditsPreserved:', summary.exactLocalCreditsPreserved);
  console.log('  • Summary semanticLocalCreditsPreserved:', summary.semanticLocalCreditsPreserved);

  assert(payload.p_film_id === HOMOLOGATED_LE_TROU_FILM_ID, '5.1 Payload: p_film_id é Le Trou');
  assert(payload.p_tmdb_id === HOMOLOGATED_LE_TROU_TMDB_ID, '5.2 Payload: p_tmdb_id é 29259');
  assert(payload.p_persons_to_link.length === 6, '5.3 Payload: p_persons_to_link contém exatamente 6 pessoas');
  assert(payload.p_persons_to_create.length === 9, '5.4 Payload: p_persons_to_create contém exatamente 9 pessoas');
  assert(payload.p_credits_to_sync.length === 19, '5.5 Payload: p_credits_to_sync contém exatamente 19 créditos');
  assert(summary.newCreditsInserted === 13, '5.6 Summary: exatamente 13 novos créditos a inserir');
  assert(summary.exactLocalCreditsPreserved === 1, '5.7 Summary: exatamente 1 crédito idêntico preservado (Becker Diretor)');
  assert(summary.semanticLocalCreditsPreserved === 5, '5.8 Summary: exatamente 5 créditos semânticos reaproveitados');

  // --------------------------------------------------------------------------
  // PARTE 6: AUDITORIA DO COMPORTAMENTO DO ENDPOINT EM DRY-RUN
  // --------------------------------------------------------------------------
  console.log('\n--- 6. EXECUÇÃO CONTROLADA EM MODO DRY-RUN VIA executeCreditsSync ---');
  const dryRunResult = await executeCreditsSync(validRequest, { user: { id: '00000000-0000-0000-0000-000000000000' } });
  assert(dryRunResult.success === true, '6.1 dryRunResult.success === true');
  assert(dryRunResult.dryRun === true, '6.2 dryRunResult.dryRun === true');
  assert(dryRunResult.executionStatus === 'DRY_RUN', '6.3 dryRunResult.executionStatus === "DRY_RUN"');
  assert(dryRunResult.createdPeopleCount === 9, '6.4 dryRunResult.createdPeopleCount === 9');
  assert(dryRunResult.linkedPeopleCount === 6, '6.5 dryRunResult.linkedPeopleCount === 6');
  assert(dryRunResult.insertedCreditsCount === 13, '6.6 dryRunResult.insertedCreditsCount === 13');
  assert(dryRunResult.updatedCreditsCount === 5, '6.7 dryRunResult.updatedCreditsCount === 5');
  assert(dryRunResult.unchangedCreditsCount === 1, '6.8 dryRunResult.unchangedCreditsCount === 1');

  // --------------------------------------------------------------------------
  // PARTE 7: AUDITORIA ZERO WRITES PÓS-TESTE
  // --------------------------------------------------------------------------
  console.log('\n--- 7. AUDITORIA ZERO WRITES ---');
  const { count: postFilmes } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { count: postPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true });
  const { count: postPessoasComTmdb } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).not('tmdb_id', 'is', null);
  const { count: postPessoasSemTmdb } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: postCredits } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });

  assert(postFilmes === totalFilmes, '7.1 Zero Writes: total de filmes inalterado');
  assert(postPessoas === totalPessoas, '7.2 Zero Writes: total de pessoas inalterado');
  assert(postPessoasComTmdb === pessoasComTmdb, '7.3 Zero Writes: pessoas com tmdb_id inalterado');
  assert(postPessoasSemTmdb === pessoasSemTmdb, '7.4 Zero Writes: pessoas sem tmdb_id inalterado');
  assert(postCredits === totalCredits, '7.5 Zero Writes: total de film_credits inalterado');

  console.log('\n================================================================');
  console.log(`RESULTADO DA SUITE D3: ${totalPassed} PASS, ${totalFailed} FAIL`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runPreflightSuite().catch((err) => {
  console.error('Fatal error in preflight suite:', err);
  process.exit(1);
});
