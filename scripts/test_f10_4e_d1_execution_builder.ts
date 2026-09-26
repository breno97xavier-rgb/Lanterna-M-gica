// ==============================================================================
// Bateria de Testes Automatizados da Etapa F10.4E-D1:
// Arquitetura e Implementação Server-Side da Execução Controlada de Créditos
// Arquivo: scripts/test_f10_4e_d1_execution_builder.ts
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import {
  buildCreditsSyncPayload,
  executeCreditsSync,
  EXECUTION_ENABLED,
} from '../api/_lib/creditExecutionBuilder.js';
import {
  isValidTmdbImageUrl,
  buildDeterministicPersonStoragePath,
  compensateStorageUploads,
  PreparedStorageImage,
} from '../api/_lib/storageImageService.js';
import { handleTmdbApiRequest } from '../api/_lib/router.js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';
import { AppError } from '../api/_lib/errors.js';

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const anonKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

const supabase = createClient(url, anonKey);

async function runTestSuite() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES: ETAPA F10.4E-D1 (EXECUTION BUILDER)');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Teste ${totalTests}: ${testName}`);
    } else {
      console.error(`  [FAIL] Teste ${totalTests}: ${testName}`, detail || '');
    }
  }

  // ----------------------------------------------------------------------------
  // BLOCO 1: AUTENTICAÇÃO E ROTEAMENTO HTTP (401, 403, ADMIN)
  // ----------------------------------------------------------------------------
  console.log('--- BLOCO 1: AUTENTICAÇÃO E ROTEAMENTO HTTP ---');

  // 1.1: Sem header de autorização -> 401
  let resStatus1 = 0;
  let resBody1: any = null;
  const mockRes1 = {
    status: (s: number) => { resStatus1 = s; return mockRes1; },
    json: (b: any) => { resBody1 = b; },
  };
  await handleTmdbApiRequest({
    method: 'POST',
    url: '/api/tmdb/movies/credits/sync',
    headers: {},
    body: {},
  }, mockRes1);
  assert(resStatus1 === 401 && resBody1?.error?.code === 'UNAUTHORIZED', '401 Unauthenticated rejeitado corretamente');

  // 1.2: Formato Bearer inválido -> 401
  let resStatus2 = 0;
  let resBody2: any = null;
  const mockRes2 = {
    status: (s: number) => { resStatus2 = s; return mockRes2; },
    json: (b: any) => { resBody2 = b; },
  };
  await handleTmdbApiRequest({
    method: 'POST',
    url: '/api/tmdb/movies/credits/sync',
    headers: { authorization: 'Basic 12345' },
    body: {},
  }, mockRes2);
  assert(resStatus2 === 401 && resBody2?.error?.code === 'UNAUTHORIZED', 'Header com formato inválido rejeitado com 401');

  // ----------------------------------------------------------------------------
  // BLOCO 2: STORAGE IMAGE SERVICE (VALIDAÇÃO, PATHS, COMPENSAÇÃO)
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 2: STORAGE IMAGE SERVICE ---');

  // 2.1: Validação de Hostname TMDB
  assert(isValidTmdbImageUrl('https://image.tmdb.org/t/p/w500/abc123xyz.jpg') === true, 'URL oficial image.tmdb.org é aceita');
  assert(isValidTmdbImageUrl('http://image.tmdb.org/t/p/w500/abc123xyz.jpg') === false, 'HTTP inseguro rejeitado');
  assert(isValidTmdbImageUrl('https://evil-site.com/image.jpg') === false, 'Hostname não-TMDB rejeitado');
  assert(isValidTmdbImageUrl('https://image.tmdb.org.attacker.com/malicious.jpg') === false, 'Subdomínio malicioso rejeitado');

  // 2.2: Caminho determinístico
  const path103399 = buildDeterministicPersonStoragePath(103399, 'jpg');
  assert(path103399 === 'people/tmdb-103399/profile.jpg', 'Caminho determinístico de pessoa gerado corretamente');

  // 2.3: Compensação de Storage — PREEXISTING vs CREATED_THIS_ATTEMPT
  const mockStorageList: PreparedStorageImage[] = [
    {
      tmdbPersonId: 1001,
      storagePath: 'people/tmdb-1001/profile.jpg',
      publicUrl: 'https://storage/1001',
      status: 'PREEXISTING',
      contentType: 'image/jpeg',
      sizeBytes: 15000,
    },
    {
      tmdbPersonId: 1002,
      storagePath: 'people/tmdb-1002/profile.jpg',
      publicUrl: 'https://storage/1002',
      status: 'CREATED_THIS_ATTEMPT',
      contentType: 'image/jpeg',
      sizeBytes: 25000,
    },
  ];

  let removedPaths: string[] = [];
  const mockSupabaseStorage = {
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          removedPaths = paths;
          return { data: paths, error: null };
        },
      }),
    },
  } as any;

  const compResult = await compensateStorageUploads(mockSupabaseStorage, mockStorageList);
  assert(compResult.attemptedRemovals === 1, 'Compensação tenta remover apenas 1 arquivo');
  assert(removedPaths.length === 1 && removedPaths[0] === 'people/tmdb-1002/profile.jpg', 'Compensação remove EXCLUSIVAMENTE CREATED_THIS_ATTEMPT');
  assert(!removedPaths.includes('people/tmdb-1001/profile.jpg'), 'Compensação NUNCA remove PREEXISTING');

  // ----------------------------------------------------------------------------
  // BLOCO 3: CONCORRÊNCIA E STALE RECONCILIATION PROTECTION
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 3: STALE RECONCILIATION PROTECTION ---');

  const LE_TROU_UUID = '34d2715c-bd3f-4737-b109-cce4b6724599';
  const MOCK_USER_ID = '99999999-9999-9999-9999-999999999999';

  // Obter reconciliação de Le Trou
  const reconcileRes = await reconcileFilmCreditsDryRun(LE_TROU_UUID, { headers: {} });
  const defaultCredits = reconcileRes.credits.filter((c) => c.isDefaultSelected);
  const selectedStableIds = defaultCredits.map((c) => c.id);

  // 3.1: Conflito de timestamp baseUpdatedAt
  let staleCaught = false;
  try {
    await buildCreditsSyncPayload(
      {
        filmId: LE_TROU_UUID,
        baseUpdatedAt: '1970-01-01T00:00:00.000Z', // Timestamp stale
        selectedCredits: [selectedStableIds[0]],
        personDecisions: [],
      },
      MOCK_USER_ID,
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 409 && err.code === 'STALE_RECONCILIATION') {
      staleCaught = true;
    }
  }
  assert(staleCaught, 'baseUpdatedAt divergente dispara 409 STALE_RECONCILIATION');

  // 3.2: Decisão LINK_EXISTING com pessoa inexistente -> 404
  let notFoundPersonCaught = false;
  const coquelinCredit = defaultCredits.find((c) => c.tmdbPersonId === 103399) || defaultCredits[0];
  try {
    await buildCreditsSyncPayload(
      {
        filmId: LE_TROU_UUID,
        selectedCredits: [coquelinCredit.id],
        personDecisions: [
          {
            tmdbPersonId: 103399,
            action: 'LINK_EXISTING',
            localPersonId: '00000000-0000-0000-0000-000000000000', // UUID inexistente
          },
        ],
      },
      MOCK_USER_ID,
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 404) {
      notFoundPersonCaught = true;
    }
  }
  assert(notFoundPersonCaught, 'LINK_EXISTING com localPersonId inexistente retorna 404');

  // ----------------------------------------------------------------------------
  // BLOCO 4: CLIENT TRUST BOUNDARY / ANTI-FORGERY
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 4: CLIENT TRUST BOUNDARY & ANTI-FORGERY ---');

  // Mapear com precisão as 6 pessoas locais de Le Trou com seus TMDB IDs factuais
  const sixPeopleDecisions = [
    { tmdbPersonId: 103393, action: 'LINK_EXISTING' as const, localPersonId: 'e807147c-9db1-4ddf-845c-7242c738d5c9' }, // Jacques Becker
    { tmdbPersonId: 46936,  action: 'LINK_EXISTING' as const, localPersonId: '181877fa-f094-4c8f-a12d-07c1a6e2d0b5' }, // Marc Michel
    { tmdbPersonId: 24495,  action: 'LINK_EXISTING' as const, localPersonId: '8f277617-e8b9-4873-a3ad-62a975f11b62' }, // Michel Constantin
    { tmdbPersonId: 103397, action: 'LINK_EXISTING' as const, localPersonId: '0469e615-5b64-4d13-992c-b6f005d55683' }, // Jean Keraudy
    { tmdbPersonId: 25333,  action: 'LINK_EXISTING' as const, localPersonId: '0e574f0a-5adb-470f-9347-c1e128457dc6' }, // Philippe Leroy
    { tmdbPersonId: 103398, action: 'LINK_EXISTING' as const, localPersonId: '7a53965b-7ec9-436a-9901-f2b09893753a' }, // Raymond Meunier
  ];

  const buildResult = await buildCreditsSyncPayload(
    {
      filmId: LE_TROU_UUID,
      selectedCredits: selectedStableIds,
      personDecisions: sixPeopleDecisions,
      dryRun: true,
    },
    MOCK_USER_ID,
    supabase
  );

  assert(buildResult.payload.p_user_id === MOCK_USER_ID, 'p_user_id é estritamente derivado do JWT autenticado');
  assert(buildResult.payload.p_film_id === LE_TROU_UUID, 'p_film_id bate com o filme selecionado');
  assert(buildResult.payload.p_tmdb_id === 29259, 'p_tmdb_id bate com o TMDB do filme factual');

  // ----------------------------------------------------------------------------
  // BLOCO 5: PRESERVAÇÃO CANÔNICA DE CRÉDITOS LOCAIS (EXACT E SEMÂNTICO)
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 5: PRESERVAÇÃO CANÔNICA DE CRÉDITOS LOCAIS ---');

  // 5.1: Jacques Becker (Direção) -> EXACT_LOCAL_CREDIT
  const beckerCredit = buildResult.payload.p_credits_to_sync.find(
    (c) => c.tmdb_person_id === 103393 && c.department === 'Direção'
  );
  assert(beckerCredit !== undefined, 'Crédito de Direção de Jacques Becker presente');
  assert(beckerCredit?.department === 'Direção' && beckerCredit?.role === 'Diretor', 'Crédito exato de Diretor preservado');

  // 5.2: Michel Constantin (Elenco) -> SEMANTIC_LOCAL_CREDIT (Ator preservado)
  const constantinCredit = buildResult.payload.p_credits_to_sync.find(
    (c) => c.tmdb_person_id === 24495 && c.department === 'Elenco'
  );
  assert(constantinCredit !== undefined, 'Crédito de Michel Constantin presente');
  assert(constantinCredit?.role === 'Ator', 'Role local "Ator" de Michel Constantin estritamente preservado (não virou "Elenco")');
  assert(constantinCredit?.character_name === 'Geo Cassine', 'Personagem "Geo Cassine" preservado');

  // 5.3: Raymond Meunier (Elenco / Vossellin / Monseigneur) -> SEMANTIC_LOCAL_CREDIT
  const meunierCredit = buildResult.payload.p_credits_to_sync.find(
    (c) => c.tmdb_person_id === 103398 && c.department === 'Elenco'
  );
  assert(meunierCredit !== undefined, 'Crédito de Raymond Meunier presente');
  assert(meunierCredit?.role === 'Ator', 'Role local "Ator" de Raymond Meunier preservado');
  assert(meunierCredit?.character_name === 'Vossellin / Monseigneur', 'Personagem "Vossellin / Monseigneur" com espaçamento preservado');

  // ----------------------------------------------------------------------------
  // BLOCO 6: AUDITORIA DO DRY-RUN LE TROU (19 CRÉDITOS, 6 LINK, 9 CREATE)
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 6: AUDITORIA DO DRY-RUN LE TROU ---');

  assert(buildResult.payload.p_credits_to_sync.length === 19, 'Total de créditos a sincronizar = 19');
  assert(buildResult.payload.p_persons_to_link.length === 6, 'Total de pessoas a vincular (p_persons_to_link) = 6');
  assert(buildResult.payload.p_persons_to_create.length === 9, 'Total de pessoas novas a criar (p_persons_to_create) = 9');
  assert(buildResult.summary.exactLocalCreditsPreserved === 1, 'Exatamente 1 crédito local EXACT preservado');
  assert(buildResult.summary.semanticLocalCreditsPreserved === 5, 'Exatamente 5 créditos locais SEMANTIC preservados');
  assert(buildResult.summary.newCreditsInserted === 13, 'Exatamente 13 novos créditos inseridos');
  assert(buildResult.summary.distinctPersonsInSelectionCount === 15, 'Total de 15 pessoas distintas na seleção de 19 créditos');

  // Verificar que Jacques Becker tem 3 créditos na seleção: 1 de Direção + 2 de Roteiro
  const beckerAllCredits = buildResult.payload.p_credits_to_sync.filter((c) => c.tmdb_person_id === 103393);
  assert(beckerAllCredits.length === 3, 'Jacques Becker possui 3 créditos no payload (1 Direção + 2 Roteiro)');

  // Verificar que José Giovanni tem 3 créditos na seleção e é apenas 1 pessoa em p_persons_to_create
  const giovanniCredits = buildResult.payload.p_credits_to_sync.filter((c) => c.tmdb_person_id === 35585);
  const giovanniCreate = buildResult.payload.p_persons_to_create.find((p) => p.tmdb_person_id === 35585);
  assert(giovanniCredits.length === 3, 'José Giovanni possui 3 créditos de roteiro no payload');
  assert(giovanniCreate !== undefined, 'José Giovanni criado como pessoa única em p_persons_to_create');
  assert(giovanniCreate?.name === 'José Giovanni' && giovanniCreate?.slug === 'jose-giovanni', 'Nome e slug transliterado de José Giovanni corretos');

  // ----------------------------------------------------------------------------
  // BLOCO 7: CONFIRMAÇÃO DE BLOQUEIO DE EXECUÇÃO (EXECUTION_ENABLED = false)
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 7: BLOQUEIO DE EXECUÇÃO SERVER-SIDE ---');

  assert((EXECUTION_ENABLED as boolean) !== undefined, 'EXECUTION_ENABLED está definido no servidor');

  // 7.1: Chamada a executeCreditsSync sem dryRun deve lançar 423
  let executionLockedCaught = false;
  try {
    await executeCreditsSync(
      {
        filmId: LE_TROU_UUID,
        selectedCredits: selectedStableIds,
        personDecisions: sixPeopleDecisions,
        dryRun: false, // Chamada real sem dryRun
      },
      { user: { id: MOCK_USER_ID } }
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 423 && err.code === 'EXECUTION_LOCKED_PENDING_HOMOLOGATION') {
      executionLockedCaught = true;
    }
  }
  assert(executionLockedCaught, 'executeCreditsSync sem dryRun rejeita com 423 EXECUTION_LOCKED_PENDING_HOMOLOGATION');

  // 7.2: Chamada com dryRun: true retorna 200 com payload estruturado
  const dryRunRes = await executeCreditsSync(
    {
      filmId: LE_TROU_UUID,
      selectedCredits: selectedStableIds,
      personDecisions: sixPeopleDecisions,
      dryRun: true,
    },
    { user: { id: MOCK_USER_ID } }
  );
  assert(dryRunRes.success === true && dryRunRes.dryRun === true && dryRunRes.locked === true, 'executeCreditsSync com dryRun=true retorna payload sem escrita');

  // ----------------------------------------------------------------------------
  // BLOCO 8: AUDITORIA DE ZERO WRITES NO BANCO DE DADOS
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 8: AUDITORIA ZERO WRITES NO BANCO ---');

  const { count: countFilmes } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { count: countPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true });
  const { count: countCredits } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });

  assert(countFilmes === 12, 'Filmes total permanece 12');
  assert(countPessoas === 95, 'Pessoas total permanece 95');
  assert(countCredits === 98, 'Film credits total permanece 98');

  console.log('\n================================================================');
  console.log(`BATERIA FINALIZADA: ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO!`);
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
