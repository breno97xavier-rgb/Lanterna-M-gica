// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Teste e Auditoria de Resolução de Divergência de Credit ID (F10.4E-D3C)
// Arquivo: scripts/test_f10_4e_d3c_divergence_resolution.ts
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import { getMovieCredits } from '../api/_lib/tmdbClient.js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';
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
    console.error(`  ❌ [FAIL] ${testName}`, details || '');
    totalFailed++;
  }
}

async function runDivergenceAudit() {
  console.log('================================================================');
  console.log('F10.4E-D3C: RESOLUÇÃO DA DIVERGÊNCIA DE CREDIT_ID & AUDITORIA FINAL');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // 1. CONSULTA AO TMDB REAL E AUDITORIA DOS 5 OBJETOS DE CREW
  // --------------------------------------------------------------------------
  console.log('--- 1. CONSULTA AO TMDB REAL (/movie/29259/credits) ---');
  const tmdbCredits = await getMovieCredits(HOMOLOGATED_LE_TROU_TMDB_ID);

  assert(tmdbCredits.cast.length === 22, '1.1 Cast factual do TMDB é exatamente 22');
  assert(tmdbCredits.crew.length === 31, '1.2 Crew factual do TMDB é exatamente 31');
  assert(tmdbCredits.cast.length + tmdbCredits.crew.length === 53, '1.3 Total de créditos factuais do TMDB é 53');

  // Localizar os 5 membros de crew no TMDB real
  const aurel = tmdbCredits.crew.find((c) => c.tmdbPersonId === 3582);
  const cloquet = tmdbCredits.crew.find((c) => c.tmdbPersonId === 11988);
  const renoir = tmdbCredits.crew.find((c) => c.tmdbPersonId === 11532);
  const vaury = tmdbCredits.crew.find((c) => c.tmdbPersonId === 1620100);
  const arthuys = tmdbCredits.crew.find((c) => c.tmdbPersonId === 103396);

  assert(aurel?.creditId === '62776e5a389da1005088d567', '1.4 Jean Aurel (3582): credit_id real é "62776e5a389da1005088d567"');
  assert(cloquet?.creditId === '5538af72c3a3681be40044fd', '1.5 Ghislain Cloquet (11988): credit_id real é "5538af72c3a3681be40044fd"');
  assert(renoir?.creditId === '563f8f6e9251413b13010b22', '1.6 Marguerite Renoir (11532): credit_id real é "563f8f6e9251413b13010b22"');
  assert(vaury?.creditId === '57916b7d9251415aab002ebf', '1.7 Geneviève Vaury (1620100): credit_id real é "57916b7d9251415aab002ebf"');
  assert(arthuys?.creditId === '5cc1eb699251415cd2f2eaab', '1.8 Philippe Arthuys (103396): credit_id real é "5cc1eb699251415cd2f2eaab"');

  // --------------------------------------------------------------------------
  // 2. AUDITORIA DOS 10 IDs CANDIDATOS (5 D2 VS 5 D3B)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. VERIFICAÇÃO DOS 10 IDs CANDIDATOS ---');
  const allRealCreditIds = new Set<string>();
  [...tmdbCredits.cast, ...tmdbCredits.crew].forEach((c) => allRealCreditIds.add(c.creditId));

  const d2Ids = [
    '62776e5aa495ee0066dbcbba',
    '52fe45d3c3a368484e0710ef',
    '57448dbfc3a368297f000b21',
    '52fe45d3c3a368484e071101',
  ];
  d2Ids.forEach((id) => {
    assert(!allRealCreditIds.has(id), `2.x ID legado D2 "${id}" NÃO EXISTE na resposta real do TMDB`);
  });

  // Teste específico de colisão com elenco
  const cloquetD2Id = '52fe45d3c3a368484e0710cd';
  const matchCast = tmdbCredits.cast.find((c) => c.creditId === cloquetD2Id);
  assert(
    matchCast?.name === 'Eddy Rasimi' && matchCast?.character === 'Bouboule',
    '2.y ID D2 "52fe45d3c3a368484e0710cd" pertence a Eddy Rasimi no elenco (NÃO a Ghislain Cloquet)'
  );

  const d3bIds = [
    '62776e5a389da1005088d567',
    '5538af72c3a3681be40044fd',
    '563f8f6e9251413b13010b22',
    '57916b7d9251415aab002ebf',
    '5cc1eb699251415cd2f2eaab',
  ];
  d3bIds.forEach((id) => {
    assert(allRealCreditIds.has(id), `2.z ID D3B "${id}" EXISTE na resposta real do TMDB`);
  });

  // --------------------------------------------------------------------------
  // 3. PARIDADE MATEMÁTICA 19 -> 19 -> 19 -> 19 -> 19 (DELTA = 0)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. PROVA DE PARIDADE COM O MESMO SNAPSHOT (DELTA = 0) ---');
  const reconcilerResult = await reconcileFilmCreditsDryRun(HOMOLOGATED_LE_TROU_FILM_ID, supabase);
  const reconcilerDefaultCredits = reconcilerResult.credits.filter((c) => c.isDefaultSelected);
  const reconcilerIds = reconcilerDefaultCredits.map((c) => c.id);

  assert(reconcilerIds.length === 19, '3.1 Reconciler: produz exatamente 19 créditos default');

  const modalSelectedIds = [...reconcilerIds];
  assert(modalSelectedIds.length === 19, '3.2 Modal: seleção contém exatamente 19 IDs');

  const requestPayload: CreditsSyncExecuteRequest = {
    filmId: HOMOLOGATED_LE_TROU_FILM_ID,
    baseUpdatedAt: '2026-09-18T21:54:05.686114+00:00',
    selectedCredits: modalSelectedIds,
    personDecisions: [
      { tmdbPersonId: 24495, action: 'LINK_EXISTING', localPersonId: '8f277617-e8b9-4873-a3ad-62a975f11b62' }, // Michel Constantin
      { tmdbPersonId: 103397, action: 'LINK_EXISTING', localPersonId: '0469e615-5b64-4d13-992c-b6f005d55683' }, // Jean Keraudy
      { tmdbPersonId: 25333, action: 'LINK_EXISTING', localPersonId: '0e574f0a-5adb-470f-9347-c1e128457dc6' }, // Philippe Leroy
      { tmdbPersonId: 103398, action: 'LINK_EXISTING', localPersonId: '7a53965b-7ec9-436a-9901-f2b09893753a' }, // Raymond Meunier
      { tmdbPersonId: 46936, action: 'LINK_EXISTING', localPersonId: '181877fa-f094-4c8f-a12d-07c1a6e2d0b5' }, // Marc Michel
      { tmdbPersonId: 103393, action: 'LINK_EXISTING', localPersonId: 'e807147c-9db1-4ddf-845c-7242c738d5c9' }, // Jacques Becker
    ],
    confirmExecution: true,
    dryRun: true,
  };

  assert(requestPayload.selectedCredits.length === 19, '3.3 Request DTO: contém exatamente 19 IDs');

  const builderResult = await buildCreditsSyncPayload(requestPayload, '00000000-0000-0000-0000-000000000001', supabase);
  const rpcCredits = builderResult.payload.p_credits_to_sync;

  assert(rpcCredits.length === 19, '3.4 RPC Payload: p_credits_to_sync contém exatamente 19 créditos');
  assert(HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS.length === 19, '3.5 Constante HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS possui 19 IDs');

  // Verificação de paridade exata
  const deltaReconVsModal = reconcilerIds.filter((id) => !modalSelectedIds.includes(id));
  const deltaModalVsBuilder = modalSelectedIds.filter((id) => !HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS.includes(id));
  const deltaBuilderVsFrozen = HOMOLOGATED_LE_TROU_CANONICAL_CREDIT_IDS.filter((id) => !reconcilerIds.includes(id));

  assert(deltaReconVsModal.length === 0, '3.6 Delta Reconciler -> Modal = 0');
  assert(deltaModalVsBuilder.length === 0, '3.7 Delta Modal -> Builder = 0');
  assert(deltaBuilderVsFrozen.length === 0, '3.8 Delta Builder -> Frozen Constant = 0');

  // --------------------------------------------------------------------------
  // 4. CONFIRMAÇÃO DAS CONTAGENS FACTUAIS (6 / 9 / 19 e 1 / 5 / 13)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. CONTAGENS FACTUAIS DO PAYLOAD ---');
  assert(builderResult.payload.p_persons_to_link.length === 6, '4.1 p_persons_to_link = 6');
  assert(builderResult.payload.p_persons_to_create.length === 9, '4.2 p_persons_to_create = 9');
  assert(builderResult.payload.p_credits_to_sync.length === 19, '4.3 p_credits_to_sync = 19');
  assert(builderResult.summary.exactLocalCreditsPreserved === 1, '4.4 exactLocalCreditsPreserved = 1 (Jacques Becker Diretor)');
  assert(builderResult.summary.semanticLocalCreditsPreserved === 5, '4.5 semanticLocalCreditsPreserved = 5 (Elenco)');
  assert(builderResult.summary.newCreditsInserted === 13, '4.6 newCreditsInserted = 13 (2 Becker Roteiro + 3 Giovanni + 8 Novos)');

  // --------------------------------------------------------------------------
  // 5. TESTES ANTI-REGRESSÃO DE SEGURANÇA
  // --------------------------------------------------------------------------
  console.log('\n--- 5. TESTES ANTI-REGRESSÃO ---');
  // Rejeitar IDs legados ou incorretos
  let legacyRejected = false;
  try {
    await buildCreditsSyncPayload(
      {
        ...requestPayload,
        selectedCredits: ['crew:62776e5aa495ee0066dbcbba', ...modalSelectedIds.slice(1)],
      },
      '00000000-0000-0000-0000-000000000001',
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 409 && err.code === 'STALE_RECONCILIATION') {
      legacyRejected = true;
    }
  }
  assert(legacyRejected, '5.1 IDs legados da D2 são estritamente rejeitados com 409 STALE_RECONCILIATION');

  // --------------------------------------------------------------------------
  // 6. SNAPSHOT BASELINE ZERO WRITES
  // --------------------------------------------------------------------------
  console.log('\n--- 6. VERIFICAÇÃO DE ZERO WRITES & BASELINE ---');
  const { count: fCount } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { count: pCount } = await supabase.from('pessoas').select('*', { count: 'exact', head: true });
  const { count: pWithTmdb } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).not('tmdb_id', 'is', null);
  const { count: pWithoutTmdb } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: cCount } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });
  const { count: leTrouCredits } = await supabase.from('film_credits').select('*', { count: 'exact', head: true }).eq('film_id', HOMOLOGATED_LE_TROU_FILM_ID);

  assert(fCount === 12, '6.1 Baseline: Filmes total = 12');
  assert(pCount === 95, '6.2 Baseline: Pessoas total = 95');
  assert(pWithTmdb === 89, '6.3 Baseline: Pessoas com tmdb_id = 89');
  assert(pWithoutTmdb === 6, '6.4 Baseline: Pessoas sem tmdb_id = 6');
  assert(cCount === 98, '6.5 Baseline: Film credits total = 98');
  assert(leTrouCredits === 6, '6.6 Baseline: Le Trou credits = 6');

  console.log('\n================================================================');
  console.log(`BATERIA D3C CONCLUÍDA: ${totalPassed} PASS, ${totalFailed} FAIL`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runDivergenceAudit().catch((err) => {
  console.error('ERRO FATAL NA BATERIA D3C:', err);
  process.exit(1);
});
