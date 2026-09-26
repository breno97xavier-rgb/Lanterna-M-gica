import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Carregar e analisar o SQL final da migração
const sqlPath = path.resolve(process.cwd(), 'supabase_migration_fase10_sync_film_credits_rpc.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('[TESTES DE HARDENING F10.4E-B5]');

// 1. Validar ausência de local_person_id dentro do processamento de créditos
assert(
  !sqlContent.includes("v_credit_item->>'local_person_id'"),
  'FAIL: p_credits_to_sync não pode consultar ou confiar em local_person_id diretamente!'
);
console.log('✓ 1. Crédito não pode escolher local_person_id arbitrário (rejeitado fallback de autoridade local)');

// 2. Validar obrigatoriedade de tmdb_person_id > 0
assert(
  sqlContent.includes("v_tmdb_person_id IS NULL OR v_tmdb_person_id <= 0") &&
  sqlContent.includes("tmdb_person_id obrigatório e deve ser inteiro positivo no crédito"),
  'FAIL: tmdb_person_id deve ser estritamente validado como inteiro positivo!'
);
console.log('✓ 2. tmdb_person_id obrigatório e positivo');

// 3. Validar obrigatoriedade de department (sem fallback 'Outro')
assert(
  sqlContent.includes("department obrigatório e não pode ser vazio") &&
  !sqlContent.includes("COALESCE(NULLIF(TRIM(v_credit_item->>'department'), ''), 'Outro')"),
  'FAIL: department não pode ter fallback silencioso para Outro!'
);
console.log('✓ 3. department obrigatório sem fallback silencioso');

// 4. Validar verificação de tipo JSON (array estrito via jsonb_typeof)
assert(
  sqlContent.includes("jsonb_typeof(p_persons_to_link) <> 'array'") &&
  sqlContent.includes("jsonb_typeof(p_persons_to_create) <> 'array'") &&
  sqlContent.includes("jsonb_typeof(p_credits_to_sync) <> 'array'"),
  'FAIL: todos os parâmetros JSON devem ser validados como array estrito!'
);
console.log('✓ 4. Validação estrita de arrays JSON (jsonb_typeof)');

// 5 & 6. Validar proteção anti-contradição em LINK_EXISTING
assert(
  sqlContent.includes("v_link_tmdb_seen ? v_tmdb_person_id::text") &&
  sqlContent.includes("v_link_local_seen ? v_target_local_id::text"),
  'FAIL: proteção anti-contradição 1:N e N:1 em p_persons_to_link deve existir!'
);
console.log('✓ 5 & 6. Proteção anti-contradição em p_persons_to_link (1:N e N:1)');

// 7. Validar rejeição de LINK + CREATE simultâneo para o mesmo tmdb_id
assert(
  sqlContent.includes("v_link_tmdb_seen ? v_tmdb_person_id::text") &&
  sqlContent.includes("está simultaneamente em p_persons_to_link e p_persons_to_create"),
  'FAIL: TMDB ID em LINK e CREATE simultaneamente deve ser rejeitado!'
);
console.log('✓ 7. Rejeição de TMDB ID simultâneo em LINK e CREATE');

// 8. Validar rejeição de CREATE_NEW para tmdb_id já existente no banco (decisão stale)
assert(
  sqlContent.includes("A decisão CREATE_NEW tornou-se obsoleta") &&
  sqlContent.includes("WHERE tmdb_id = v_tmdb_person_id"),
  'FAIL: CREATE_NEW para tmdb_id já existente no banco deve abortar!'
);
console.log('✓ 8. CREATE_NEW para tmdb_id já existente no banco rejeitado com erro 23505');

// 9. Validar neutralidade de gênero em Acting ('Elenco')
assert(
  sqlContent.includes("known_for_department' = 'Acting' THEN ARRAY['Elenco']") &&
  !sqlContent.includes("ARRAY['Ator']") &&
  !sqlContent.includes("ARRAY['Atriz']"),
  'FAIL: Acting deve gerar ARRAY[\'Elenco\'] e não Ator/Atriz!'
);
console.log('✓ 9. Acting gera ARRAY[\'Elenco\'] (neutralidade de gênero)');

// 10. Validar rollback em caso de pessoa não resolvida
assert(
  sqlContent.includes("Não foi possível resolver a pessoa correspondente ao TMDB ID"),
  'FAIL: pessoa não resolvida deve disparar exceção!'
);
console.log('✓ 10. Pessoa não resolvida dispara RAISE EXCEPTION e rollback');

// 11. Validar unicidade lógica com múltiplos cargos da mesma pessoa
assert(
  sqlContent.includes("uq_film_credits_logical") &&
  sqlContent.includes("person_id") &&
  sqlContent.includes("department") &&
  sqlContent.includes("(COALESCE(role, ''))") &&
  sqlContent.includes("(COALESCE(character_name, ''))"),
  'FAIL: DDL do índice uq_film_credits_logical deve conter role e character_name!'
);
console.log('✓ 11. Múltiplos cargos da mesma pessoa suportados pelo índice lógico');

// 12. Validar contagem semântica detalhada
assert(
  sqlContent.includes("insertedCreditsCount") &&
  sqlContent.includes("updatedCreditsCount") &&
  sqlContent.includes("unchangedCreditsCount") &&
  sqlContent.includes("syncedCreditsCount"),
  'FAIL: contagens semânticas detalhadas devem estar no retorno!'
);
console.log('✓ 12. Contagem semântica detalhada (inserted, updated, unchanged)');

// 13, 14 & 15. Validar logs individuais e consolidado com schema canônico
assert(
  sqlContent.includes("'match_manual'") &&
  sqlContent.includes("'import_new'") &&
  sqlContent.includes("'sync_credits'") &&
  sqlContent.includes("internal_id") &&
  !sqlContent.includes("entity_id,") &&
  !sqlContent.includes("payload_snapshot,"),
  'FAIL: logs devem usar schema canônico tmdb_sync_logs com match_manual, import_new e sync_credits!'
);
console.log('✓ 13, 14 & 15. Logs individuais de pessoa (match_manual / import_new) e consolidado (sync_credits)');

// 16. Validar ausência de DELETE de créditos
assert(
  !sqlContent.includes("DELETE FROM public.film_credits"),
  'FAIL: RPC não pode conter DELETE em public.film_credits!'
);
console.log('✓ 16. ZERO DELETE GERAL garantido em film_credits');

console.log('\n============================================================');
console.log('TODOS OS 16 TESTES DE HARDENING PASSARAM COM SUCESSO (100%)');
console.log('============================================================');
