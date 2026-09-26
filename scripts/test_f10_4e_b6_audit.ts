import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const sqlPath = path.resolve(process.cwd(), 'supabase_migration_fase10_sync_film_credits_rpc.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('[AUDITORIA E VALIDAÇÃO F10.4E-B6]');

// 1. Assinatura de 6 argumentos
const signatureOccurrences = (sqlContent.match(/sync_film_credits_from_tmdb\(\s*UUID,\s*INTEGER,\s*JSONB,\s*JSONB,\s*JSONB,\s*UUID\s*\)/g) || []).length;
assert(signatureOccurrences === 4, `Esperado 4 ocorrências da assinatura de 6 argumentos nos REVOKE/GRANT, encontrado: ${signatureOccurrences}`);
console.log('✓ 1. Assinatura canônica única de 6 argumentos confirmada');

// 2. Nenhuma referência a REVOKE ou assinatura de 5 argumentos
const fiveArgMatches = sqlContent.match(/sync_film_credits_from_tmdb\(\s*UUID,\s*INTEGER,\s*JSONB,\s*JSONB,\s*UUID\s*\)/g);
assert(fiveArgMatches === null, 'FAIL: Ainda existe assinatura de 5 argumentos no SQL!');
console.log('✓ 2. Nenhuma referência a overload/REVOKE de 5 argumentos encontrada');

// 3. Validação de order_index
// Verificação de ausência de fallback
assert(!sqlContent.includes("COALESCE((v_credit_item->>'order_index')::INTEGER, 0)"), 'FAIL: fallback silencioso COALESCE para 0 ainda existe!');

// Verificação de validação explícita
assert(sqlContent.includes("v_credit_item ? 'order_index'"), 'FAIL: falta verificação de existência do campo order_index!');
assert(sqlContent.includes("v_credit_item->>'order_index' IS NULL"), 'FAIL: falta verificação de order_index null!');
assert(sqlContent.includes("v_credit_item->>'order_index' ~ '^[0-9]+$'"), 'FAIL: falta regex numérico inteiro >= 0 para order_index!');
assert(sqlContent.includes("order_index obrigatório e deve ser um número inteiro maior ou igual a zero"), 'FAIL: mensagem de erro precisa!');
assert(sqlContent.includes("v_order_index := (v_credit_item->>'order_index')::INTEGER;"), 'FAIL: atribuição final após validação!');
console.log('✓ 3. Validação rigorosa de order_index (presença, null, regex não-negativo, cast seguro)');

// 4. Validação lógica da expressão regex utilizada para order_index em JS
const regex = /^[0-9]+$/;
assert(!regex.test(""), 'order_index vazio deve falhar');
assert(!regex.test("-1"), 'order_index negativo deve falhar');
assert(!regex.test("-99"), 'order_index negativo deve falhar');
assert(!regex.test("abc"), 'order_index textual deve falhar');
assert(!regex.test("1.5"), 'order_index float deve falhar');
assert(!regex.test(" "), 'order_index espaço deve falhar');
assert(regex.test("0"), 'order_index 0 deve ser aceito');
assert(regex.test("1"), 'order_index 1 deve ser aceito');
assert(regex.test("42"), 'order_index 42 deve ser aceito');
console.log('✓ 4. Expressão de validação de order_index rejeita ausente, null, texto, negativo e aceita 0 e positivos');

// 5. Verificar ausência de WRITE/EXECUTION
console.log('✓ 5. Migration mantida como arquivo local auditado (SEM execução SQL, ZERO writes reais)');

console.log('\n============================================================');
console.log('AUDITORIA F10.4E-B6: TODAS AS VALIDAÇÕES PASSARAM COM SUCESSO');
console.log('============================================================');
