// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Teste e Auditoria Read-Only da Generalização do Gate de Execução (F10.4E-D6B)
// Arquivo: scripts/test_f10_4e_d6b_generalization.ts
// ==============================================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';
import { buildCreditsSyncPayload, executeCreditsSync } from '../api/_lib/creditExecutionBuilder.js';
import { AppError } from '../api/_lib/errors.js';

const PERSONA_UUID = '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a';
const PERSONA_TMDB_ID = 797;
const LE_TROU_UUID = '34d2715c-bd3f-4737-b109-cce4b6724599';

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

async function runGeneralizationTestSuite() {
  console.log('\n' + '='.repeat(80));
  console.log('F10.4E-D6B: BATERIA DE TESTES READ-ONLY DA GENERALIZAÇÃO DO GATE');
  console.log('='.repeat(80) + '\n');

  // --------------------------------------------------------------------------
  // PARTE 1: RECONCILIAÇÃO READ-ONLY DE FILME DIFERENTE (PERSONA)
  // --------------------------------------------------------------------------
  console.log('--- 1. RECONCILIAÇÃO DE "PERSONA" (TMDB #797) ---');
  const personaReconcile = await reconcileFilmCreditsDryRun(PERSONA_UUID, { headers: {} });
  assert(personaReconcile !== null && typeof personaReconcile === 'object', 'Reconciliação de Persona retornou objeto com sucesso');
  assert(personaReconcile.film.tmdbId === PERSONA_TMDB_ID, 'TMDB ID de Persona é 797');
  assert(personaReconcile.credits.length > 0, `Persona possui ${personaReconcile.credits.length} créditos reconciliados`);
  assert(personaReconcile.people.length > 0, `Persona possui ${personaReconcile.people.length} pessoas reconciliadas`);
  assert(typeof personaReconcile.baseUpdatedAt === 'string', `baseUpdatedAt presente: ${personaReconcile.baseUpdatedAt}`);

  const personaDefaultSelected = personaReconcile.credits.filter(c => c.isDefaultSelected);
  console.log(`  • Créditos selecionados por default em Persona: ${personaDefaultSelected.length}`);
  assert(personaDefaultSelected.length > 0, 'Curadoria default calculou créditos para Persona');

  // --------------------------------------------------------------------------
  // PARTE 2: CONSTRUÇÃO DE PAYLOAD SERVER-SIDE PARA PERSONA (DRY-RUN)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. CONSTRUÇÃO E VALIDAÇÃO DE PAYLOAD PARA PERSONA (DRY-RUN) ---');
  const selectedPersonaIds = personaDefaultSelected.map(c => c.id);
  const personaDecisions = personaReconcile.people.map(p => {
    if (p.status === 'EXACT_TMDB_MATCH' && p.matchedLocalPersonId) {
      return { tmdbPersonId: p.tmdbPersonId, action: 'LINK_EXISTING' as const, localPersonId: p.matchedLocalPersonId };
    }
    if (p.status === 'POSSIBLE_LOCAL_MATCH' && p.suggestedCandidates?.length === 1) {
      return { tmdbPersonId: p.tmdbPersonId, action: 'LINK_EXISTING' as const, localPersonId: p.suggestedCandidates[0].localPersonId };
    }
    return { tmdbPersonId: p.tmdbPersonId, action: 'CREATE_NEW' as const };
  });

  const personaPayloadResult = await buildCreditsSyncPayload(
    {
      filmId: PERSONA_UUID,
      baseUpdatedAt: personaReconcile.baseUpdatedAt,
      selectedCredits: selectedPersonaIds,
      personDecisions: personaDecisions,
      dryRun: true,
    },
    '00000000-0000-0000-0000-000000000001',
    supabase
  );

  assert(personaPayloadResult !== null, 'buildCreditsSyncPayload aceitou Persona com sucesso (sem gate artificial de Le Trou)');
  assert(personaPayloadResult.payload.p_film_id === PERSONA_UUID, 'Payload film_id correto para Persona');
  assert(personaPayloadResult.payload.p_tmdb_id === PERSONA_TMDB_ID, 'Payload tmdb_id correto para Persona (797)');
  assert(personaPayloadResult.payload.p_credits_to_sync.length === selectedPersonaIds.length, `Créditos no payload: ${personaPayloadResult.payload.p_credits_to_sync.length}`);

  // --------------------------------------------------------------------------
  // PARTE 3: ANTI-FORGERY E REJEIÇÃO DE CRÉDITO ADULTERADO
  // --------------------------------------------------------------------------
  console.log('\n--- 3. ANTI-FORGERY: REJEIÇÃO DE CRÉDITO ADULTERADO OU INEXISTENTE ---');
  let forgeryCaught = false;
  try {
    await buildCreditsSyncPayload(
      {
        filmId: PERSONA_UUID,
        baseUpdatedAt: personaReconcile.baseUpdatedAt,
        selectedCredits: [...selectedPersonaIds, 'cast:999999999999999999999999'],
        personDecisions: personaDecisions,
        dryRun: true,
      },
      '00000000-0000-0000-0000-000000000001',
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.code === 'STALE_RECONCILIATION') {
      forgeryCaught = true;
    }
  }
  assert(forgeryCaught, 'Crédito adulterado ("cast:99999999...") foi sumariamente rejeitado pelo backend com STALE_RECONCILIATION');

  // --------------------------------------------------------------------------
  // PARTE 4: ANTI-STALE VIA baseUpdatedAt EM PERSONA
  // --------------------------------------------------------------------------
  console.log('\n--- 4. ANTI-STALE: REJEIÇÃO DE baseUpdatedAt DESATUALIZADO ---');
  let staleCaught = false;
  try {
    await buildCreditsSyncPayload(
      {
        filmId: PERSONA_UUID,
        baseUpdatedAt: '1999-01-01T00:00:00.000000+00:00',
        selectedCredits: selectedPersonaIds,
        personDecisions: personaDecisions,
        dryRun: false,
        confirmExecution: true,
      },
      '00000000-0000-0000-0000-000000000001',
      supabase
    );
  } catch (err: any) {
    if (err instanceof AppError && err.code === 'STALE_RECONCILIATION') {
      staleCaught = true;
    }
  }
  assert(staleCaught, 'baseUpdatedAt desatualizado foi bloqueado com STALE_RECONCILIATION');

  // --------------------------------------------------------------------------
  // PARTE 5: REGRESSÃO DE LE TROU (IDEMPOTÊNCIA E COMPATIBILIDADE)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. REGRESSÃO DE LE TROU (IDEMPOTÊNCIA) ---');
  const leTrouReconcile = await reconcileFilmCreditsDryRun(LE_TROU_UUID, { headers: {} });
  assert(leTrouReconcile.film.tmdbId === 29259, 'TMDB ID de Le Trou é 29259');
  assert(leTrouReconcile.summary.totalLocalCredits === 19, 'Le Trou possui exatamente 19 créditos no acervo');

  const leTrouExactMatches = leTrouReconcile.people.filter(p => p.status === 'EXACT_TMDB_MATCH');
  assert(leTrouExactMatches.length >= 6, `Le Trou possui ${leTrouExactMatches.length} pessoas vinculadas com EXACT_TMDB_MATCH`);

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL DE TESTES PASSADOS: ${totalPassed} | FALHADOS: ${totalFailed}`);
  console.log('='.repeat(80));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runGeneralizationTestSuite().catch(err => {
  console.error('Erro na suíte de testes:', err);
  process.exit(1);
});
