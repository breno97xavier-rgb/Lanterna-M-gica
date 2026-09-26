// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Auditoria do Contexto Autenticado e Testes Negativos de Segurança (F10.4E-D7B-R1)
// Arquivo: scripts/audit_f10_4e_d7b_r1_auth_context.ts
// ==============================================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { validateAdminAuth } from '../api/_lib/authMiddleware.js';
import { handleTmdbApiRequest } from '../api/_lib/router.js';
import { AppError } from '../api/_lib/errors.js';

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

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

// Helper mock req/res
function createMockReqRes(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: any) {
  let statusCode = 200;
  let responseData: any = null;

  const req = {
    url,
    method,
    headers,
    body,
  };

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
    },
    writeHead: (code: number) => {
      statusCode = code;
    },
    end: (data?: string) => {
      if (data) {
        try {
          responseData = JSON.parse(data);
        } catch {
          responseData = data;
        }
      }
    },
  };

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };
}

async function runAuthAudit() {
  console.log('='.repeat(80));
  console.log('F10.4E-D7B-R1: AUDITORIA DO CONTEXTO AUTENTICADO & TESTES NEGATIVOS');
  console.log('='.repeat(80) + '\n');

  // --------------------------------------------------------------------------
  // 1. TESTES NEGATIVOS DE AUTENTICAÇÃO NO MIDDLEWARE (READ-ONLY)
  // --------------------------------------------------------------------------
  console.log('--- 1. TESTES NEGATIVOS NO MIDDLEWARE (validateAdminAuth) ---');

  // 1.1: Sem header Authorization
  const authNoHeader = await validateAdminAuth({ headers: {} });
  assert(!authNoHeader.authorized && authNoHeader.statusCode === 401 && authNoHeader.errorCode === 'UNAUTHORIZED',
    'Requisição sem header Authorization rejeitada com 401 UNAUTHORIZED');

  // 1.2: Header com formato inválido
  const authBadFormat = await validateAdminAuth({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
  assert(!authBadFormat.authorized && authBadFormat.statusCode === 401,
    'Header Authorization não-Bearer rejeitado com 401 UNAUTHORIZED');

  // 1.3: Token JWT inválido/corrompido
  const authInvalidJwt = await validateAdminAuth({ headers: { authorization: 'Bearer invalid_token_xyz_123' } });
  assert(!authInvalidJwt.authorized && authInvalidJwt.statusCode === 401,
    'Token JWT inválido rejeitado com 401 UNAUTHORIZED');

  // --------------------------------------------------------------------------
  // 2. TESTES NEGATIVOS NO ROTEADOR /api/tmdb/*
  // --------------------------------------------------------------------------
  console.log('\n--- 2. TESTES NEGATIVOS NO ROTEADOR SERVER-SIDE (/api/tmdb/*) ---');

  // 2.1: GET /api/tmdb/movies/797/credits/reconcile sem token
  const mockGetNoAuth = createMockReqRes('/api/tmdb/movies/3ecb01f8-41d3-45ae-b0cd-be7c25d1048a/credits/reconcile', 'GET', {});
  await handleTmdbApiRequest(mockGetNoAuth.req, mockGetNoAuth.res);
  assert(mockGetNoAuth.getStatusCode() === 401 && mockGetNoAuth.getData()?.error?.code === 'UNAUTHORIZED',
    'GET reconciliação sem token rejeitado no router com 401 UNAUTHORIZED');

  // 2.2: POST /api/tmdb/movies/credits/sync sem token
  const mockPostNoAuth = createMockReqRes('/api/tmdb/movies/credits/sync', 'POST', {}, { filmId: '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a' });
  await handleTmdbApiRequest(mockPostNoAuth.req, mockPostNoAuth.res);
  assert(mockPostNoAuth.getStatusCode() === 401 && mockPostNoAuth.getData()?.error?.code === 'UNAUTHORIZED',
    'POST sincronização sem token rejeitado no router com 401 UNAUTHORIZED');

  // --------------------------------------------------------------------------
  // 3. VERIFICAÇÃO DE MENOR PRIVILÉGIO DO POSTGRESQL (ROLE ANON)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. VERIFICAÇÃO DE MENOR PRIVILÉGIO (ROLE ANON NO POSTGRESQL) ---');

  // 3.1: Chamada direta à RPC via client anon DEVE ser rejeitada com 42501
  let anonCallRejected = false;
  let anonErrorCode = '';
  try {
    const { error } = await supabaseAnon.rpc('sync_film_credits_from_tmdb', {
      p_film_id: '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a',
      p_tmdb_id: 797,
      p_persons_to_link: [],
      p_persons_to_create: [],
      p_credits_to_sync: [],
    });
    if (error) {
      anonCallRejected = true;
      anonErrorCode = error.code || '';
    }
  } catch (err: any) {
    anonCallRejected = true;
    anonErrorCode = err?.code || '';
  }

  assert(anonCallRejected && anonErrorCode === '42501',
    'PostgreSQL confirma: Role "anon" NÃO possui EXECUTE na RPC (Código 42501: permission denied)');

  // --------------------------------------------------------------------------
  // 4. AUDITORIA FINAL DE ZERO WRITES (BANCO FACTUAL PRESERVADO)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. AUDITORIA FINAL DE ZERO WRITES NO BANCO FACTUAL ---');
  const { count: filmsCount } = await supabaseAnon.from('filmes').select('*', { count: 'exact', head: true });
  const { count: creditsCount } = await supabaseAnon.from('film_credits').select('*', { count: 'exact', head: true });
  const { data: personaCredits } = await supabaseAnon.from('film_credits').select('id').eq('film_id', '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a');

  assert(filmsCount === 12, `Total de filmes intacto: ${filmsCount} (esperado 12)`);
  assert(creditsCount === 111, `Total de film_credits intacto: ${creditsCount} (esperado 111)`);
  assert(personaCredits?.length === 6, `Total de créditos de Persona intacto: ${personaCredits?.length} (esperado 6)`);

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL DE TESTES PASSADOS: ${totalPassed} | FALHADOS: ${totalFailed}`);
  console.log('='.repeat(80));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAuthAudit().catch(err => {
  console.error('Erro na auditoria de autenticação:', err);
  process.exit(1);
});
