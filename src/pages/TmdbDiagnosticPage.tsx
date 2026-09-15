// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Página Diagnóstica Temporária de Homologação Autenticada TMDB (F10.2E)
// Arquivo: src/pages/TmdbDiagnosticPage.tsx
//
// NOTA: Este componente é temporário e de uso exclusivo para homologação da F10.2
// no ambiente publicado da Vercel. Não contém segredos e opera 100% em leitura.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Lock,
  Database,
  Film,
  User,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  searchTmdbMovies,
  getTmdbMovieDetails,
  getTmdbMovieCredits,
  searchTmdbPeople,
  getTmdbPersonDetails,
  getTmdbPersonCredits,
  TmdbApiError,
} from '../services/tmdbApiClient.js';

interface TmdbDiagnosticPageProps {
  onNavigate?: (path: string) => void;
  onGoBack?: () => void;
}

type TestStatus = 'IDLE' | 'RUNNING' | 'PASS' | 'FAIL';

interface DiagnosticTestItem {
  id: string;
  category: 'A. FILMES' | 'B. PESSOAS' | 'C. CONTRATO DE ERROS';
  title: string;
  description: string;
  expected: string;
  actual?: string;
  status: TestStatus;
  details?: any;
  error?: string;
  durationMs?: number;
}

export const TmdbDiagnosticPage: React.FC<TmdbDiagnosticPageProps> = ({
  onNavigate,
  onGoBack,
}) => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Lista dos 10 testes diagnósticos padronizados
  const [tests, setTests] = useState<DiagnosticTestItem[]>([
    {
      id: 'test_a',
      category: 'A. FILMES',
      title: 'TESTE A: Busca de Filme (searchMovies)',
      description: 'searchMovies("Persona", 1966)',
      expected: 'HTTP 200, TMDB ID 797 presente no resultado',
      status: 'IDLE',
    },
    {
      id: 'test_b',
      category: 'A. FILMES',
      title: 'TESTE B: Detalhes de Filme (getMovieDetails)',
      description: 'getMovieDetails(797)',
      expected: 'HTTP 200, tmdb_id=797, ano=1966, runtime=85, imdb_id=tt0060827',
      status: 'IDLE',
    },
    {
      id: 'test_c',
      category: 'A. FILMES',
      title: 'TESTE C: Créditos de Filme (getMovieCredits)',
      description: 'getMovieCredits(797)',
      expected: 'HTTP 200, elenco e equipe técnica válidos, Ingmar Bergman na Direção',
      status: 'IDLE',
    },
    {
      id: 'test_d',
      category: 'B. PESSOAS',
      title: 'TESTE D: Busca de Pessoa (searchPeople)',
      description: 'searchPeople("Ingmar Bergman")',
      expected: 'HTTP 200, TMDB ID 6648 presente no resultado',
      status: 'IDLE',
    },
    {
      id: 'test_e',
      category: 'B. PESSOAS',
      title: 'TESTE E: Detalhes de Pessoa (getPersonDetails)',
      description: 'getPersonDetails(6648)',
      expected: 'HTTP 200, nome="Ingmar Bergman", nasc=1918-07-14, falec=2007-07-30, imdb_id=nm0000005',
      status: 'IDLE',
    },
    {
      id: 'test_f',
      category: 'B. PESSOAS',
      title: 'TESTE F: Créditos de Pessoa (getPersonCredits)',
      description: 'getPersonCredits(6648)',
      expected: 'HTTP 200, filmografia normalizada com créditos de direção presentes',
      status: 'IDLE',
    },
    {
      id: 'test_g1',
      category: 'C. CONTRATO DE ERROS',
      title: 'TESTE G.1: Validação de Parâmetro Obrigatório (Busca Vazia)',
      description: 'searchMovies("")',
      expected: 'HTTP 400 INVALID_PARAMS',
      status: 'IDLE',
    },
    {
      id: 'test_g2',
      category: 'C. CONTRATO DE ERROS',
      title: 'TESTE G.2: Validação de ID de Filme Inválido',
      description: 'getMovieDetails(0)',
      expected: 'HTTP 400 INVALID_PARAMS',
      status: 'IDLE',
    },
    {
      id: 'test_g3',
      category: 'C. CONTRATO DE ERROS',
      title: 'TESTE G.3: Validação de ID de Pessoa Inválido',
      description: 'getPersonDetails(-5)',
      expected: 'HTTP 400 INVALID_PARAMS',
      status: 'IDLE',
    },
    {
      id: 'test_g4',
      category: 'C. CONTRATO DE ERROS',
      title: 'TESTE G.4: Entidade Inexistente no Catálogo',
      description: 'getMovieDetails(999999999)',
      expected: 'HTTP 404 NOT_FOUND',
      status: 'IDLE',
    },
  ]);

  // Checagem estrita de autenticação e papel de administrador
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      setIsCheckingAuth(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session || !session.user) {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setUserEmail(null);
            setIsCheckingAuth(false);
          }
          return;
        }

        const { data: adminStatus, error: rpcError } = await supabase.rpc('is_admin');
        if (isMounted) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || null);
          setIsAdmin(!rpcError && adminStatus === true);
          setIsCheckingAuth(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsCheckingAuth(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateTestState = (id: string, updates: Partial<DiagnosticTestItem>) => {
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Execução da bateria completa
  const runAllTests = async () => {
    if (!isAuthenticated || !isAdmin) return;
    setIsRunningAll(true);

    // Reset status
    setTests((prev) =>
      prev.map((t) => ({
        ...t,
        status: 'IDLE',
        actual: undefined,
        error: undefined,
        durationMs: undefined,
      }))
    );

    // TESTE A
    await runSingleTest('test_a', async () => {
      const res = await searchTmdbMovies({ query: 'Persona', year: 1966 });
      const found = res.results.find((m) => m.tmdbId === 797);
      if (!found) {
        throw new Error(`Filme ID 797 não encontrado na busca (${res.results.length} resultados retornados).`);
      }
      return {
        actual: `200 OK — Encontrado: "${found.title}" (Original: "${found.originalTitle}", ID: ${found.tmdbId}, Ano: ${found.year})`,
        details: { totalResults: res.totalResults, match: found },
      };
    });

    // TESTE B
    await runSingleTest('test_b', async () => {
      const res = await getTmdbMovieDetails(797);
      const isMatch =
        res.tmdbId === 797 &&
        res.year === 1966 &&
        res.runtime === 85 &&
        res.imdbId === 'tt0060827';
      if (!isMatch) {
        throw new Error(
          `Dados divergentes: ID=${res.tmdbId}, Ano=${res.year}, Runtime=${res.runtime}, IMDb=${res.imdbId}`
        );
      }
      return {
        actual: `200 OK — "${res.title}" | Ano: ${res.year} | Duração: ${res.runtime} min | IMDb: ${res.imdbId}`,
        details: res,
      };
    });

    // TESTE C
    await runSingleTest('test_c', async () => {
      const res = await getTmdbMovieCredits(797);
      const director = res.crew.find(
        (c) => c.job === 'Director' || c.department === 'Directing'
      );
      if (!director || !director.name.toLowerCase().includes('bergman')) {
        throw new Error(
          `Diretor Ingmar Bergman não localizado na equipe (${res.crew.length} membros na equipe).`
        );
      }
      return {
        actual: `200 OK — Elenco: ${res.cast.length} atores | Equipe: ${res.crew.length} membros | Direção: "${director.name}"`,
        details: { castCount: res.cast.length, crewCount: res.crew.length, director },
      };
    });

    // TESTE D
    await runSingleTest('test_d', async () => {
      const res = await searchTmdbPeople({ query: 'Ingmar Bergman' });
      const found = res.results.find((p) => p.tmdbId === 6648);
      if (!found) {
        throw new Error(`Pessoa ID 6648 não encontrada na busca (${res.results.length} resultados).`);
      }
      return {
        actual: `200 OK — Encontrado: "${found.name}" (ID: ${found.tmdbId}, Dept: "${found.knownForDepartment}")`,
        details: found,
      };
    });

    // TESTE E
    await runSingleTest('test_e', async () => {
      const res = await getTmdbPersonDetails(6648);
      const isMatch =
        res.tmdbId === 6648 &&
        res.name === 'Ingmar Bergman' &&
        res.birthday === '1918-07-14' &&
        res.deathday === '2007-07-30' &&
        res.imdbId === 'nm0000005';
      if (!isMatch) {
        throw new Error(
          `Dados divergentes: ID=${res.tmdbId}, Nome=${res.name}, Nasc=${res.birthday}, Falec=${res.deathday}, IMDb=${res.imdbId}`
        );
      }
      return {
        actual: `200 OK — "${res.name}" | Nasc: ${res.birthday} | Falec: ${res.deathday} | IMDb: ${res.imdbId}`,
        details: res,
      };
    });

    // TESTE F
    await runSingleTest('test_f', async () => {
      const res = await getTmdbPersonCredits(6648);
      const directCredits = res.crew.filter((c) => c.job === 'Director');
      if (directCredits.length === 0) {
        throw new Error('Nenhum crédito de direção encontrado na filmografia.');
      }
      return {
        actual: `200 OK — Total Créditos: ${res.cast.length + res.crew.length} | Direção: ${directCredits.length} obras`,
        details: { totalCast: res.cast.length, totalCrew: res.crew.length, directorCount: directCredits.length },
      };
    });

    // TESTE G.1
    await runSingleTest('test_g1', async () => {
      try {
        await searchTmdbMovies({ query: '' });
        throw new Error('Esperava erro 400 mas a requisição obteve sucesso.');
      } catch (err: any) {
        if (err instanceof TmdbApiError && err.status === 400 && err.code === 'INVALID_PARAMS') {
          return {
            actual: `400 INVALID_PARAMS (Esperado) — "${err.message}"`,
          };
        }
        throw err;
      }
    });

    // TESTE G.2
    await runSingleTest('test_g2', async () => {
      try {
        await getTmdbMovieDetails(0);
        throw new Error('Esperava erro 400 mas a requisição obteve sucesso.');
      } catch (err: any) {
        if (err instanceof TmdbApiError && err.status === 400 && err.code === 'INVALID_PARAMS') {
          return {
            actual: `400 INVALID_PARAMS (Esperado) — "${err.message}"`,
          };
        }
        throw err;
      }
    });

    // TESTE G.3
    await runSingleTest('test_g3', async () => {
      try {
        await getTmdbPersonDetails(-5);
        throw new Error('Esperava erro 400 mas a requisição obteve sucesso.');
      } catch (err: any) {
        if (err instanceof TmdbApiError && err.status === 400 && err.code === 'INVALID_PARAMS') {
          return {
            actual: `400 INVALID_PARAMS (Esperado) — "${err.message}"`,
          };
        }
        throw err;
      }
    });

    // TESTE G.4
    await runSingleTest('test_g4', async () => {
      try {
        await getTmdbMovieDetails(999999999);
        throw new Error('Esperava erro 404 mas a requisição obteve sucesso.');
      } catch (err: any) {
        if (err instanceof TmdbApiError && err.status === 404 && err.code === 'NOT_FOUND') {
          return {
            actual: `404 NOT_FOUND (Esperado) — "${err.message}"`,
          };
        }
        throw err;
      }
    });

    setIsRunningAll(false);
  };

  const runSingleTest = async (
    id: string,
    action: () => Promise<{ actual: string; details?: any }>
  ) => {
    updateTestState(id, { status: 'RUNNING', error: undefined, actual: undefined });
    const startTime = performance.now();

    try {
      const result = await action();
      const durationMs = Math.round(performance.now() - startTime);
      updateTestState(id, {
        status: 'PASS',
        actual: result.actual,
        details: result.details,
        durationMs,
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      updateTestState(id, {
        status: 'FAIL',
        error: err.message || String(err),
        durationMs,
      });
    }
  };

  const totalPass = tests.filter((t) => t.status === 'PASS').length;
  const totalFail = tests.filter((t) => t.status === 'FAIL').length;
  const totalIdle = tests.filter((t) => t.status === 'IDLE').length;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0E1116] text-[#E6EDF3] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin text-[#D4AF37]" />
          <span>Verificando credenciais administrativas...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0E1116] text-[#E6EDF3] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#161B22] border border-[#30363D] rounded-xl p-8 text-center space-y-6">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">Acesso Administrativo Restrito</h1>
            <p className="text-sm text-gray-400 mt-2">
              Esta ferramenta diagnóstica da Etapa F10.2E exige autenticação com sessão ativa de Administrador no CMS.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onNavigate && onNavigate('/admin')}
              className="w-full px-5 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              Fazer Login no CMS (/admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#E6EDF3] font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-[#30363D] bg-[#161B22]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => (onGoBack ? onGoBack() : onNavigate && onNavigate('/admin'))}
              className="p-2 text-gray-400 hover:text-white bg-[#21262D] hover:bg-[#30363D] rounded-lg transition-colors cursor-pointer"
              title="Voltar ao Painel Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-full">
                  Fase 10 • Etapa F10.2E
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  [TEMPORÁRIO]
                </span>
              </div>
              <h1 className="text-lg font-bold mt-1 text-white">
                Diagnóstico de Homologação Autenticada TMDB
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runAllTests}
              disabled={isRunningAll}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                isRunningAll
                  ? 'bg-[#30363D] text-gray-400 cursor-not-allowed'
                  : 'bg-[#D4AF37] hover:bg-[#C5A028] text-black shadow-lg shadow-[#D4AF37]/10'
              }`}
            >
              {isRunningAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executando Testes...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Executar Bateria Completa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Banner de Informações da Sessão & Segurança */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Status da Sessão</span>
            </div>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
              AUTHENTICATED
            </div>
            <div className="text-xs text-gray-400 truncate">
              Usuário: <span className="text-gray-300 font-mono">{userEmail || 'Admin'}</span>
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Autorização CMS</span>
            </div>
            <div className="text-base font-bold text-[#D4AF37]">
              ADMIN (is_admin = true)
            </div>
            <div className="text-xs text-gray-400">
              Token JWT anexa automaticamente em /api/tmdb/*
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Integridade do Banco</span>
            </div>
            <div className="text-base font-bold text-blue-400">
              100% READ-ONLY
            </div>
            <div className="text-xs text-gray-400">
              Zero escritas • Zero mutações no Supabase
            </div>
          </div>
        </section>

        {/* Resumo dos Resultados */}
        <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Resultados dos Testes de Homologação</h2>
              <p className="text-xs text-gray-400 mt-1">
                Validação end-to-end: Navegador Autenticado → tmdbApiClient → Vercel Serverless Function → TMDB
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">
                PASS: {totalPass}
              </div>
              <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold">
                FAIL: {totalFail}
              </div>
              <div className="px-3 py-1 bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-lg text-xs font-bold">
                PENDING: {totalIdle}
              </div>
            </div>
          </div>
        </section>

        {/* Lista de Testes */}
        <div className="space-y-4">
          {tests.map((test, index) => (
            <div
              key={test.id}
              className={`bg-[#161B22] border rounded-xl p-5 transition-all ${
                test.status === 'PASS'
                  ? 'border-emerald-500/30'
                  : test.status === 'FAIL'
                  ? 'border-red-500/40 bg-red-950/10'
                  : test.status === 'RUNNING'
                  ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5'
                  : 'border-[#30363D]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-[#21262D] px-2 py-0.5 rounded">
                      {test.category}
                    </span>
                    <h3 className="text-sm font-bold text-white">{test.title}</h3>
                  </div>
                  <div className="text-xs font-mono text-gray-300 bg-[#0E1116] px-3 py-1.5 rounded border border-[#30363D] inline-block">
                    {test.description}
                  </div>
                  <div className="text-xs text-gray-400 pt-1">
                    <span className="text-gray-500">Esperado:</span> {test.expected}
                  </div>

                  {test.actual && (
                    <div className="text-xs text-emerald-400 pt-1 flex items-start gap-1.5">
                      <span className="text-gray-500">Obtido:</span>
                      <span className="font-mono text-emerald-300">{test.actual}</span>
                    </div>
                  )}

                  {test.error && (
                    <div className="text-xs text-red-400 pt-1 flex items-start gap-1.5">
                      <span className="text-gray-500">Erro:</span>
                      <span className="font-mono text-red-300">{test.error}</span>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {test.status === 'PASS' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PASS
                      </span>
                    )}
                    {test.status === 'FAIL' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        <XCircle className="w-3.5 h-3.5" />
                        FAIL
                      </span>
                    )}
                    {test.status === 'RUNNING' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        TESTANDO
                      </span>
                    )}
                    {test.status === 'IDLE' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        <Clock className="w-3.5 h-3.5" />
                        AGUARDANDO
                      </span>
                    )}
                  </div>
                  {test.durationMs !== undefined && (
                    <span className="text-[11px] text-gray-500 font-mono">
                      {test.durationMs}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Informações de Segurança e Próximos Passos */}
        <section className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#D4AF37]">
            <ShieldCheck className="w-5 h-5" />
            <span>Garantias de Segurança Verificadas</span>
          </div>
          <ul className="text-xs text-gray-400 space-y-2 list-disc list-inside">
            <li>Nenhum segredo TMDB (API Key ou Read Token) trafega para o navegador ou aparece em respostas de rede.</li>
            <li>O token JWT da sessão Supabase é transmitido estritamente no cabeçalho <code className="text-gray-300 font-mono">Authorization: Bearer &lt;token&gt;</code>.</li>
            <li>A função Serverless Vercel valida a assinatura do token e a função RPC <code className="text-gray-300 font-mono">is_admin()</code> antes de despachar para o TMDB.</li>
            <li>Esta rota diagnóstica é temporária e será removida antes ou no início da Etapa F10.3.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};
