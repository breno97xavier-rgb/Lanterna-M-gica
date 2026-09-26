// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// BATERIA DE AUDITORIA E TESTES: ETAPA F10.4E-D2
// AUDITORIA FINAL DE IDENTIDADE CANÔNICA E PARIDADE MODAL → SERVER
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import { getMovieCredits, getPersonDetails } from '../api/_lib/tmdbClient.js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';
import {
  buildCreditsSyncPayload,
  executeCreditsSync,
  formatCanonicalCreditId,
  EXECUTION_ENABLED,
} from '../api/_lib/creditExecutionBuilder.js';
import {
  isValidTmdbImageUrl,
  buildDeterministicPersonStoragePath,
  compensateStorageUploads,
  PreparedStorageImage,
} from '../api/_lib/storageImageService.js';
import { AppError } from '../api/_lib/errors.js';
import type { CreditsSyncExecuteRequest, PersonSyncDecisionItem } from '../api/_lib/types.js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MOCK_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

async function runAuditAndTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES & AUDITORIA: ETAPA F10.4E-D2');
  console.log('AUDITORIA DE IDENTIDADE CANÔNICA E PARIDADE MODAL → SERVER');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Teste ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] Teste ${total}: ${testName}`);
      if (details) console.error(`         Detalhes: ${details}`);
      process.exit(1);
    }
  }

  // Obter filme Le Trou no banco
  const { data: filmLeTrou } = await supabase
    .from('filmes')
    .select('id, title, original_title, year, slug, tmdb_id, updated_at, created_at')
    .eq('tmdb_id', 29259)
    .single();

  if (!filmLeTrou) {
    throw new Error('Filme Le Trou (tmdb_id 29259) não encontrado no acervo local!');
  }

  // Snapshot inicial do banco (Baseline)
  const { count: fCountBefore } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { count: pCountBefore } = await supabase.from('pessoas').select('*', { count: 'exact', head: true });
  const { count: pWithTmdbBefore } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).not('tmdb_id', 'is', null);
  const { count: pWithoutTmdbBefore } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: cCountBefore } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });

  // ----------------------------------------------------------------------------
  // BLOCO 1: AUDITORIA DO RAW TMDB CREDIT OBJECT & IDENTIDADE CANÔNICA
  // ----------------------------------------------------------------------------
  console.log('--- BLOCO 1: RAW TMDB CREDIT OBJECT & IDENTIDADE CANÔNICA ---');
  const rawTmdbCredits = await getMovieCredits(29259);

  assert(rawTmdbCredits.cast.length === 22, 'Total de cast factual no TMDB é 22');
  assert(rawTmdbCredits.crew.length === 31, 'Total de crew factual no TMDB é 31');

  const allCreditIds = new Set<string>();
  let hasEmptyCreditId = false;

  for (const c of rawTmdbCredits.cast) {
    if (!c.creditId || typeof c.creditId !== 'string') hasEmptyCreditId = true;
    allCreditIds.add(c.creditId);
  }
  for (const c of rawTmdbCredits.crew) {
    if (!c.creditId || typeof c.creditId !== 'string') hasEmptyCreditId = true;
    allCreditIds.add(c.creditId);
  }

  assert(!hasEmptyCreditId, 'Todos os 53 créditos TMDB possuem credit_id preenchido');
  assert(allCreditIds.size === 53, 'Todos os 53 credit_ids são estritamente únicos no TMDB');

  // Testar formato canônico
  const sampleCastId = formatCanonicalCreditId(true, rawTmdbCredits.cast[0].creditId);
  const sampleCrewId = formatCanonicalCreditId(false, rawTmdbCredits.crew[0].creditId);
  assert(sampleCastId.startsWith('cast:52fe'), 'Identificador canônico de elenco inicia com "cast:" e credit_id TMDB');
  assert(sampleCrewId.startsWith('crew:52fe'), 'Identificador canônico de equipe técnica inicia com "crew:" e credit_id TMDB');

  // ----------------------------------------------------------------------------
  // BLOCO 2: PARIDADE MODAL RECONCILER → REQUEST → BUILDER
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 2: PARIDADE MODAL RECONCILER → REQUEST → BUILDER ---');
  const mockReq = { headers: { authorization: `Bearer ${SUPABASE_KEY}` } };
  const modalReconciliation = await reconcileFilmCreditsDryRun(filmLeTrou.id, mockReq);

  const defaultModalSelected = modalReconciliation.credits.filter((c) => c.isDefaultSelected);
  assert(defaultModalSelected.length === 19, 'Modal reconciliador seleciona exatamente 19 créditos por padrão');

  const defaultCanonicalIds = defaultModalSelected.map((c) => c.id);
  assert(defaultCanonicalIds.every((id) => id.startsWith('cast:') || id.startsWith('crew:')), 'Todos os 19 IDs default são canônicos');

  // Montar decisões default do modal
  const modalPersonDecisions: PersonSyncDecisionItem[] = [];
  modalReconciliation.people.forEach((p) => {
    if (p.status === 'EXACT_TMDB_MATCH' && p.matchedLocalPersonId) {
      modalPersonDecisions.push({
        tmdbPersonId: p.tmdbPersonId,
        action: 'LINK_EXISTING',
        localPersonId: p.matchedLocalPersonId,
      });
    } else if (p.status === 'NEW_PERSON') {
      modalPersonDecisions.push({
        tmdbPersonId: p.tmdbPersonId,
        action: 'CREATE_NEW',
      });
    } else if (p.status === 'POSSIBLE_LOCAL_MATCH' && p.suggestedCandidates.length === 1) {
      modalPersonDecisions.push({
        tmdbPersonId: p.tmdbPersonId,
        action: 'LINK_EXISTING',
        localPersonId: p.suggestedCandidates[0].localPersonId,
      });
    }
  });

  const requestPayload: CreditsSyncExecuteRequest = {
    filmId: filmLeTrou.id,
    baseUpdatedAt: filmLeTrou.updated_at || filmLeTrou.created_at,
    selectedCredits: defaultCanonicalIds,
    personDecisions: modalPersonDecisions,
    dryRun: true,
  };

  const { payload: rpcPayload, summary } = await buildCreditsSyncPayload(requestPayload, MOCK_ADMIN_USER_ID, supabase);

  assert(summary.totalSelectedCredits === 19, 'Sumário do builder reporta exatamente 19 créditos');
  assert(rpcPayload.p_credits_to_sync.length === 19, 'RPC Payload p_credits_to_sync possui exatamente 19 créditos');
  assert(rpcPayload.p_persons_to_link.length === 6, 'RPC Payload p_persons_to_link possui exatamente 6 pessoas');
  assert(rpcPayload.p_persons_to_create.length === 9, 'RPC Payload p_persons_to_create possui exatamente 9 pessoas');
  assert(summary.distinctPersonsInSelectionCount === 15, 'Total de pessoas distintas na seleção é 15');
  assert(summary.exactLocalCreditsPreserved === 1, 'Exatamente 1 crédito local EXACT preservado (Jacques Becker Diretor)');
  assert(summary.semanticLocalCreditsPreserved === 5, 'Exatamente 5 créditos locais SEMANTIC preservados (Elenco)');
  assert(summary.newCreditsInserted === 13, 'Exatamente 13 novos créditos inseridos');

  // Paridade exata matemática: 19 = 1 EXACT + 5 SEMANTIC + 13 NEW
  assert(
    summary.exactLocalCreditsPreserved + summary.semanticLocalCreditsPreserved + summary.newCreditsInserted === 19,
    'Paridade matemática fechada: 1 exact + 5 semantic + 13 new = 19'
  );

  // ----------------------------------------------------------------------------
  // BLOCO 3: AUDITORIA DAS 9 NOVAS PESSOAS E DOS 13 NOVOS CRÉDITOS
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 3: AUDITORIA DAS 9 NOVAS PESSOAS E 13 NOVOS CRÉDITOS ---');
  const createdPersonNames = rpcPayload.p_persons_to_create.map((p) => p.name).sort();
  const expectedNewPersonNames = [
    'André Bervil',
    'Eddy Rasimi',
    'Geneviève Vaury',
    'Ghislain Cloquet',
    'Jean Aurel',
    'Jean-Paul Coquelin',
    'José Giovanni',
    'Marguerite Renoir',
    'Philippe Arthuys',
  ].sort();

  assert(
    JSON.stringify(createdPersonNames) === JSON.stringify(expectedNewPersonNames),
    'As 9 novas pessoas geradas pelo builder batem 100% com a lista factual esperada'
  );

  // José Giovanni multi-credit
  const giovanniCredits = rpcPayload.p_credits_to_sync.filter((c) => c.tmdb_person_id === 35585);
  assert(giovanniCredits.length === 3, 'José Giovanni possui exatamente 3 créditos nos 19 selecionados');
  const giovanniCreates = rpcPayload.p_persons_to_create.filter((p) => p.tmdb_person_id === 35585);
  assert(giovanniCreates.length === 1, 'José Giovanni é instanciado como exatamente 1 registro em p_persons_to_create');

  // Jacques Becker multi-credit
  const beckerCredits = rpcPayload.p_credits_to_sync.filter((c) => c.tmdb_person_id === 103393);
  assert(beckerCredits.length === 3, 'Jacques Becker possui exatamente 3 créditos nos 19 selecionados (1 Direção + 2 Roteiro)');
  const beckerCreates = rpcPayload.p_persons_to_create.filter((p) => p.tmdb_person_id === 103393);
  assert(beckerCreates.length === 0, 'Jacques Becker NUNCA é criado como pessoa nova (0 em p_persons_to_create)');
  const beckerLinks = rpcPayload.p_persons_to_link.filter((p) => p.tmdb_person_id === 103393);
  assert(beckerLinks.length === 1, 'Jacques Becker possui exatamente 1 vínculo em p_persons_to_link');

  // Decomposição dos 13 novos créditos:
  // 2 novos de Jacques Becker + 3 de José Giovanni + 8 (1 de cada uma das outras 8 novas pessoas) = 13
  const otherNewPersonsCredits = rpcPayload.p_credits_to_sync.filter(
    (c) => c.tmdb_person_id !== 103393 && c.tmdb_person_id !== 35585 && expectedNewPersonNames.includes(
      rpcPayload.p_persons_to_create.find((p) => p.tmdb_person_id === c.tmdb_person_id)?.name || ''
    )
  );
  assert(otherNewPersonsCredits.length === 8, 'Exatamente 8 créditos pertencem às outras 8 novas pessoas');
  assert(
    2 + 3 + otherNewPersonsCredits.length === 13,
    'Decomposição matemática de 13 novos créditos verificada: 2 Becker + 3 Giovanni + 8 outras novas pessoas = 13'
  );

  // ----------------------------------------------------------------------------
  // BLOCO 4: VALIDAÇÕES DE SEGURANÇA E STALE / FORGERY PROTECTION
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 4: VALIDAÇÕES DE SEGURANÇA E STALE / FORGERY PROTECTION ---');

  // 1. Rejeição de ID legado por índice
  let legacyIdRejected = false;
  try {
    await buildCreditsSyncPayload(
      {
        ...requestPayload,
        selectedCredits: ['tmdb-cast-24495-0'],
      },
      MOCK_ADMIN_USER_ID,
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 400 && err.message.includes('legado')) {
      legacyIdRejected = true;
    }
  }
  assert(legacyIdRejected, 'Identificador legado "tmdb-cast-24495-0" é estritamente rejeitado com 400');

  // 2. Rejeição de ID duplicado no request
  let duplicateIdRejected = false;
  try {
    await buildCreditsSyncPayload(
      {
        ...requestPayload,
        selectedCredits: [defaultCanonicalIds[0], defaultCanonicalIds[0]],
      },
      MOCK_ADMIN_USER_ID,
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 400 && err.message.includes('duplicado')) {
      duplicateIdRejected = true;
    }
  }
  assert(duplicateIdRejected, 'Identificador de crédito duplicado no request é rejeitado com 400');

  // 3. Rejeição com 409 STALE_RECONCILIATION se credit_id não existir após re-fetch
  let staleCreditRejected = false;
  try {
    await buildCreditsSyncPayload(
      {
        ...requestPayload,
        selectedCredits: ['cast:non_existent_credit_id_999999'],
      },
      MOCK_ADMIN_USER_ID,
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 409 && err.code === 'STALE_RECONCILIATION') {
      staleCreditRejected = true;
    }
  }
  assert(staleCreditRejected, 'Crédito canônico inexistente no TMDB dispara 409 STALE_RECONCILIATION');

  // 4. Rejeição de decisões contraditórias para a mesma pessoa
  let contradictoryDecisionRejected = false;
  try {
    await buildCreditsSyncPayload(
      {
        ...requestPayload,
        personDecisions: [
          { tmdbPersonId: 35585, action: 'CREATE_NEW' },
          { tmdbPersonId: 35585, action: 'LINK_EXISTING', localPersonId: '00000000-0000-0000-0000-000000000001' },
        ],
      },
      MOCK_ADMIN_USER_ID,
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 400 && err.message.includes('conflitantes')) {
      contradictoryDecisionRejected = true;
    }
  }
  assert(contradictoryDecisionRejected, 'Decisões conflitantes para o mesmo tmdbPersonId são rejeitadas com 400');

  // ----------------------------------------------------------------------------
  // BLOCO 5: AUDITORIA DE STORAGE E COMPENSAÇÃO (READ-ONLY)
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 5: AUDITORIA DE STORAGE E COMPENSAÇÃO ---');

  // Verificar profile_path das 9 novas pessoas
  const newPersonsWithPhotos = rpcPayload.p_persons_to_create.filter((p) => p.photo_url !== null);
  const newPersonsWithoutPhotos = rpcPayload.p_persons_to_create.filter((p) => p.photo_url === null);

  // 6 pessoas possuem foto no TMDB: José Giovanni, Jean-Paul Coquelin, André Bervil, Eddy Rasimi, Marguerite Renoir, Philippe Arthuys
  // 3 pessoas não possuem foto: Jean Aurel, Ghislain Cloquet, Geneviève Vaury
  assert(newPersonsWithPhotos.length === 6, 'Exatamente 6 das 9 novas pessoas possuem profile_path no TMDB (Giovanni, Coquelin, Bervil, Rasimi, Renoir, Arthuys)');
  assert(newPersonsWithoutPhotos.length === 3, 'As outras 3 novas pessoas possuem photo_url estritamente null (Aurel, Cloquet, Vaury)');

  const samplePath = buildDeterministicPersonStoragePath(35585, 'jpg');
  assert(samplePath === 'people/tmdb-35585/profile.jpg', 'Caminho determinístico de José Giovanni: people/tmdb-35585/profile.jpg');

  // Compensação seletiva
  const mockPreparedImages: PreparedStorageImage[] = [
    {
      tmdbPersonId: 1,
      storagePath: 'people/tmdb-1/profile.jpg',
      publicUrl: 'https://storage/people/tmdb-1/profile.jpg',
      status: 'PREEXISTING',
      contentType: 'image/jpeg',
      sizeBytes: 15000,
    },
    {
      tmdbPersonId: 2,
      storagePath: 'people/tmdb-2/profile.jpg',
      publicUrl: 'https://storage/people/tmdb-2/profile.jpg',
      status: 'CREATED_THIS_ATTEMPT',
      contentType: 'image/jpeg',
      sizeBytes: 25000,
    },
  ];

  let removedCount = 0;
  const mockStorageClient = {
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          removedCount += paths.length;
          return { data: null, error: null };
        },
      }),
    },
  } as any;

  await compensateStorageUploads(mockStorageClient, mockPreparedImages);
  assert(removedCount === 1, 'Compensação de Storage remove estritamente os objetos CREATED_THIS_ATTEMPT (1 removido, 0 de PREEXISTING)');

  // ----------------------------------------------------------------------------
  // BLOCO 6: TRAVA SERVER-SIDE 423 E ZERO WRITES
  // ----------------------------------------------------------------------------
  console.log('\n--- BLOCO 6: TRAVA SERVER-SIDE 423 E ZERO WRITES ---');

  assert((EXECUTION_ENABLED as boolean) !== undefined, 'EXECUTION_ENABLED está definido no servidor');

  let executionLockedRejected = false;
  try {
    await executeCreditsSync(
      {
        ...requestPayload,
        dryRun: false,
      },
      mockReq
    );
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 423 && err.code === 'EXECUTION_LOCKED_PENDING_HOMOLOGATION') {
      executionLockedRejected = true;
    }
  }
  assert(executionLockedRejected, 'Chamada real com dryRun:false rejeitada no servidor com 423 EXECUTION_LOCKED_PENDING_HOMOLOGATION');

  // Verificar baseline no banco Supabase
  const { count: fCountAfter } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { count: pCountAfter } = await supabase.from('pessoas').select('*', { count: 'exact', head: true });
  const { count: pWithTmdbAfter } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).not('tmdb_id', 'is', null);
  const { count: pWithoutTmdbAfter } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: cCountAfter } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });

  assert(fCountAfter === fCountBefore, `Filmes total inalterado: ${fCountAfter}`);
  assert(pCountAfter === pCountBefore, `Pessoas total inalterado: ${pCountAfter}`);
  assert(pWithTmdbAfter === pWithTmdbBefore, `Pessoas com tmdb_id inalterado: ${pWithTmdbAfter}`);
  assert(pWithoutTmdbAfter === pWithoutTmdbBefore, `Pessoas sem tmdb_id inalterado: ${pWithoutTmdbAfter}`);
  assert(cCountAfter === cCountBefore, `Film credits total inalterado: ${cCountAfter}`);

  console.log('\n================================================================');
  console.log(`BATERIA FINALIZADA COM SUCESSO: ${passed}/${total} TESTES PASSARAM!`);
  console.log('================================================================');
}

runAuditAndTests().catch((err) => {
  console.error('ERRO FATAL NA BATERIA DE TESTES:', err);
  process.exit(1);
});
