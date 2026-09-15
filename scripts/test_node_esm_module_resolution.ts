// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Teste de Resolução de Módulos e Execução Direta no Runtime Node.js ESM
// Arquivo: scripts/test_node_esm_module_resolution.ts
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const FUNCTION_FILES = [
  'api/tmdb/movies/search.ts',
  'api/tmdb/movies/[id].ts',
  'api/tmdb/movies/[id]/index.ts',
  'api/tmdb/movies/[id]/credits.ts',
  'api/tmdb/people/search.ts',
  'api/tmdb/people/[id].ts',
  'api/tmdb/people/[id]/index.ts',
  'api/tmdb/people/[id]/credits.ts',
];

const LIB_FILES = [
  'api/_lib/types.ts',
  'api/_lib/errors.ts',
  'api/_lib/tmdbClient.ts',
  'api/_lib/authMiddleware.ts',
  'api/_lib/router.ts',
];

console.log('================================================================');
console.log('TESTE DE MODULE RESOLUTION NO RUNTIME NATIVO NODE.JS (ESM)');
console.log('================================================================\n');

// 1. Verificar se todos os imports relativos possuem extensão .js
console.log('1. AUDITORIA DE EXTENSÕES EM IMPORTS RELATIVOS:');
let extensionErrors = 0;

const allApiFiles = [...FUNCTION_FILES, ...LIB_FILES];
for (const relPath of allApiFiles) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const importLines = content.split('\n').filter(line => /^\s*import\s+.*from\s+['"]\./.test(line));
  
  let fileHasError = false;
  for (const line of importLines) {
    const match = line.match(/from\s+['"](\.[^'"]+)['"]/);
    if (match) {
      const importSpecifier = match[1];
      if (!importSpecifier.endsWith('.js') && !importSpecifier.endsWith('.json')) {
        console.error(`  [FALHA] ${relPath}: import relativo sem extensão .js -> "${importSpecifier}"`);
        extensionErrors++;
        fileHasError = true;
      }
    }
  }
  if (!fileHasError) {
    console.log(`  [OK] ${relPath} (todos os imports relativos possuem .js)`);
  }
}

if (extensionErrors > 0) {
  console.error(`\nTotal de erros de extensão encontrados: ${extensionErrors}`);
  process.exit(1);
}

// 2. Compilar arquivos de api/ para uma pasta temporária .test_node_dist e executar via node puro
console.log('\n2. COMPILANDO API TS -> JS ESM VIA ESBUILD PARA TESTE COM NODE NATIVO:');
const tempDist = path.join(process.cwd(), '.test_node_dist');
if (fs.existsSync(tempDist)) {
  fs.rmSync(tempDist, { recursive: true, force: true });
}
fs.mkdirSync(tempDist, { recursive: true });

// Compilar com preservação de estrutura de diretórios e formato ESM
execSync(
  `npx esbuild "api/**/*.ts" --outbase=. --format=esm --outdir=.test_node_dist --platform=node --target=node20`,
  { stdio: 'inherit' }
);

// Criar package.json na pasta temp com "type": "module"
fs.writeFileSync(
  path.join(tempDist, 'package.json'),
  JSON.stringify({ type: 'module' }, null, 2)
);

console.log('\n3. EXECUTANDO HANDLERS COMPILADOS DIRETAMENTE COM NODE.JS:');
const testRunnerScript = `
import movieSearchHandler from './api/tmdb/movies/search.js';
import movieDetailsHandler from './api/tmdb/movies/[id].js';
import movieCreditsHandler from './api/tmdb/movies/[id]/credits.js';
import peopleSearchHandler from './api/tmdb/people/search.js';
import peopleDetailsHandler from './api/tmdb/people/[id].js';
import peopleCreditsHandler from './api/tmdb/people/[id]/credits.js';

console.log('  [OK] Todos os módulos JS ESM foram carregados pelo runtime Node.js com sucesso!');

function mockReqRes(url, method = 'GET') {
  let statusCode = 200;
  let jsonBody = null;
  const headers = {};
  
  const req = {
    url,
    method,
    headers: {},
    query: {}
  };
  
  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(body) {
      jsonBody = body;
    },
    writeHead(code, h) {
      statusCode = code;
      Object.assign(headers, h);
    },
    end(data) {
      if (data && !jsonBody) {
        try { jsonBody = JSON.parse(data); } catch { jsonBody = data; }
      }
    },
    getStatusCode: () => statusCode,
    getBody: () => jsonBody
  };
  
  return { req, res };
}

async function runTests() {
  const tests = [
    { name: 'GET /api/tmdb/movies/search?query=Persona', handler: movieSearchHandler, url: '/api/tmdb/movies/search?query=Persona' },
    { name: 'GET /api/tmdb/movies/797', handler: movieDetailsHandler, url: '/api/tmdb/movies/797' },
    { name: 'GET /api/tmdb/movies/797/credits', handler: movieCreditsHandler, url: '/api/tmdb/movies/797/credits' },
    { name: 'GET /api/tmdb/people/search?query=Bergman', handler: peopleSearchHandler, url: '/api/tmdb/people/search?query=Bergman' },
    { name: 'GET /api/tmdb/people/6648', handler: peopleDetailsHandler, url: '/api/tmdb/people/6648' },
    { name: 'GET /api/tmdb/people/6648/credits', handler: peopleCreditsHandler, url: '/api/tmdb/people/6648/credits' }
  ];

  let failed = 0;
  for (const t of tests) {
    const { req, res } = mockReqRes(t.url);
    await t.handler(req, res);
    const status = res.getStatusCode();
    const body = res.getBody();
    
    if (status === 401 && body && body.error && body.error.code === 'UNAUTHORIZED') {
      console.log('  [PASS] ' + t.name + ' -> HTTP ' + status + ' UNAUTHORIZED (Payload: ' + JSON.stringify(body) + ')');
    } else {
      console.error('  [FAIL] ' + t.name + ' -> Esperado HTTP 401 UNAUTHORIZED, recebido HTTP ' + status + ': ' + JSON.stringify(body));
      failed++;
    }
  }

  if (failed > 0) {
    console.error('\\nTotal de falhas nos handlers Node: ' + failed);
    process.exit(1);
  } else {
    console.log('\\n[SUCESSO] Todas as 6 Serverless Functions responderam 401 UNAUTHORIZED em JSON puro sob Node.js ESM nativo!');
  }
}

runTests().catch(err => {
  console.error('[ERRO CRÍTICO NO RUNNER]:', err);
  process.exit(1);
});
`;

fs.writeFileSync(path.join(tempDist, 'run_native_node_test.js'), testRunnerScript);

try {
  execSync(`node .test_node_dist/run_native_node_test.js`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://tnjcromtaacjbzueqdpl.supabase.co',
      SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'dummy_anon_key'
    }
  });
} finally {
  // Limpar diretório temporário
  if (fs.existsSync(tempDist)) {
    fs.rmSync(tempDist, { recursive: true, force: true });
  }
}
