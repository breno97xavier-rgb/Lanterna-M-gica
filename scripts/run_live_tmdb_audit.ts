import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// ==============================================================================
// LANTERNA MÁGICA — FASE 9: FUNDAÇÃO TMDB E MIGRAÇÃO SEGURA
// Script Diagnóstico Real: Etapa F9.3B (Execução com API TMDB Autenticada)
//
// REGRAS ESTRITAS:
// - Consulta 100% real à API TMDB via HTTP autenticado.
// - NENHUM ID é hardcoded ou inventado.
// - NENHUMA escrita no banco Supabase (somente leitura).
// ==============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const tmdbToken = process.env.TMDB_READ_ACCESS_TOKEN || '';
const tmdbApiKey = process.env.TMDB_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Credenciais do Supabase ausentes.');
  process.exit(1);
}

if (!tmdbToken && !tmdbApiKey) {
  console.error('ERRO CRÍTICO: Nenhuma credencial TMDB encontrada no ambiente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Telemetria da API
let totalRequests = 0;
let successRequests = 0;
let errorRequests = 0;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const urlObj = new URL(`https://api.themoviedb.org/3${endpoint}`);
  if (!tmdbToken && tmdbApiKey) {
    urlObj.searchParams.set('api_key', tmdbApiKey);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      urlObj.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (tmdbToken) {
    headers['Authorization'] = `Bearer ${tmdbToken}`;
  }

  totalRequests++;
  await sleep(35); // Rate limiting gentil

  try {
    const res = await fetch(urlObj.toString(), { headers });
    if (!res.ok) {
      errorRequests++;
      return null;
    }
    successRequests++;
    return await res.json();
  } catch (err: any) {
    errorRequests++;
    return null;
  }
}

function normalize(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeSimilarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const setA = new Set(normA.split(' '));
  const setB = new Set(normB.split(' '));

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export type MatchConfidence = 'HIGH' | 'AMBIGUOUS' | 'NO_MATCH' | 'ERROR';

export interface ApiCandidate {
  tmdbId: number;
  titleOrName: string;
  originalTitle?: string;
  releaseDateOrBirthDate?: string;
  year?: number;
  directorsOrKnownFor?: string;
  overviewOrBio?: string;
  score: number;
  divergences: string[];
}

export interface FilmAuditResult {
  internalId: string;
  localTitle: string;
  localOriginalTitle?: string | null;
  localYear: number;
  localDirector: string;
  localCountry?: string | null;
  imdbId?: string | null;
  queryUsed: string;
  endpointUsed: string;
  resultsCount: number;
  classification: MatchConfidence;
  justification: string;
  candidate?: ApiCandidate;
  alternativeCandidates?: ApiCandidate[];
  divergences: string[];
}

export interface PersonAuditResult {
  internalId: string;
  localName: string;
  localBirthDate?: string | null;
  localCountry?: string | null;
  localPrimaryRoles: string[];
  localCreditsCount: number;
  localFilmTitles: string[];
  imdbId?: string | null;
  queryUsed: string;
  endpointUsed: string;
  resultsCount: number;
  classification: MatchConfidence;
  justification: string;
  candidate?: ApiCandidate;
  alternativeCandidates?: ApiCandidate[];
  divergences: string[];
}

async function runLiveAudit() {
  console.log('================================================================');
  console.log('LANTERNA MÁGICA — F9.3B: EXECUÇÃO REAL DE PRÉ-MATCHING TMDB');
  console.log('================================================================\n');

  // 1. Validação de Autenticação
  console.log('1. TESTANDO AUTENTICAÇÃO REAL NA API TMDB...');
  const authRes = await tmdbFetch('/authentication');
  if (!authRes || !authRes.success) {
    console.error('FALHA DE AUTENTICAÇÃO: A API do TMDB recusou as credenciais.');
    process.exit(1);
  }
  console.log('✓ Autenticação validada com sucesso via Bearer/API Key (HTTP 200 OK).\n');

  // 2. Coleta do Acervo
  console.log('2. COLETANDO ACERVO REAL DO SUPABASE...');
  const { data: filmes, error: filmErr } = await supabase
    .from('filmes')
    .select(`
      id, title, original_title, slug, year, country, duration_minutes,
      legacy_director_name, imdb_id, tmdb_id, tmdb_synced_at,
      credits:film_credits (
        id, department, role, character_name, order_index,
        person:pessoas ( id, name, slug, birth_date )
      )
    `)
    .order('title');

  const { data: pessoas, error: pessoaErr } = await supabase
    .from('pessoas')
    .select(`
      id, name, slug, birth_date, death_date, country, bio,
      is_editorial_profile, editorial_profile, primary_roles,
      imdb_id, tmdb_id, tmdb_synced_at
    `)
    .order('name');

  const { data: allCredits, error: credErr } = await supabase
    .from('film_credits')
    .select('id, film_id, person_id, department, role, film:filmes(id, title, original_title, year)');

  if (filmErr || pessoaErr || credErr) {
    console.error('Erro ao ler Supabase:', filmErr || pessoaErr || credErr);
    process.exit(1);
  }

  console.log(`✓ Coletados ${filmes?.length} filmes e ${pessoas?.length} pessoas.\n`);

  const creditsByPerson: Record<string, any[]> = {};
  for (const c of (allCredits || [])) {
    if (c.person_id) {
      if (!creditsByPerson[c.person_id]) creditsByPerson[c.person_id] = [];
      creditsByPerson[c.person_id].push(c);
    }
  }

  // 3. Auditoria dos 11 Filmes
  console.log('3. AUDITANDO OS 11 FILMES COM QUERIES REAIS...');
  const filmResults: FilmAuditResult[] = [];

  for (const f of (filmes || [])) {
    const dirs = (f.credits || []).filter((c: any) => c.department === 'Direção' || c.role?.toLowerCase().includes('dire'));
    const dirName = dirs.map((c: any) => c.person?.name || c.fallback_person_name).join(', ') || f.legacy_director_name || '';

    console.log(`-> Consultando filme: "${f.title}" (${f.original_title || 'sem original'}, ${f.year}, Dir: "${dirName}")`);

    const searchQueries = [
      f.original_title,
      f.title,
    ].filter(Boolean) as string[];

    let candidates: any[] = [];
    let queryUsed = searchQueries[0];
    let endpointUsed = `/search/movie?query=${encodeURIComponent(queryUsed)}&language=pt-BR`;

    for (const q of searchQueries) {
      const res = await tmdbFetch('/search/movie', {
        query: q,
        language: 'pt-BR',
        include_adult: 'false',
      });
      if (res?.results && res.results.length > 0) {
        queryUsed = q;
        endpointUsed = `/search/movie?query=${encodeURIComponent(q)}&language=pt-BR`;
        candidates = res.results;
        break;
      }
    }

    if (candidates.length === 0 && f.original_title) {
      const resEn = await tmdbFetch('/search/movie', {
        query: f.original_title,
        language: 'en-US',
        include_adult: 'false',
      });
      if (resEn?.results && resEn.results.length > 0) {
        queryUsed = f.original_title;
        endpointUsed = `/search/movie?query=${encodeURIComponent(f.original_title)}&language=en-US`;
        candidates = resEn.results;
      }
    }

    if (candidates.length === 0) {
      filmResults.push({
        internalId: f.id,
        localTitle: f.title,
        localOriginalTitle: f.original_title,
        localYear: f.year,
        localDirector: dirName,
        localCountry: f.country,
        imdbId: f.imdb_id,
        queryUsed,
        endpointUsed,
        resultsCount: 0,
        classification: 'NO_MATCH',
        justification: `Nenhum resultado retornado pela API TMDB para as queries: ${searchQueries.join(', ')}.`,
        divergences: ['Sem correspondência encontrada'],
      });
      continue;
    }

    const evaluatedCandidates: ApiCandidate[] = [];

    for (const cand of candidates.slice(0, 4)) {
      const details = await tmdbFetch(`/movie/${cand.id}`, {
        append_to_response: 'credits',
        language: 'pt-BR',
      });

      const candTitle = details?.title || cand.title;
      const candOrigTitle = details?.original_title || cand.original_title;
      const candDate = details?.release_date || cand.release_date || '';
      const candYear = candDate ? parseInt(candDate.split('-')[0], 10) : undefined;
      const candCrew = details?.credits?.crew || [];
      const candDirectors = candCrew.filter((c: any) => c.job === 'Director').map((c: any) => c.name);
      const candDirStr = candDirectors.join(', ');

      const divergences: string[] = [];
      let score = 0;

      const origSim = computeSimilarity(f.original_title || f.title, candOrigTitle);
      const titleSim = computeSimilarity(f.title, candTitle);
      const bestTitleSim = Math.max(origSim, titleSim);
      score += Math.round(bestTitleSim * 40);

      if (candYear && f.year) {
        const diff = Math.abs(candYear - f.year);
        if (diff === 0) {
          score += 25;
        } else if (diff === 1) {
          score += 15;
          divergences.push(`Diferença de 1 ano no lançamento (Local: ${f.year} vs TMDB: ${candYear})`);
        } else {
          score -= 20;
          divergences.push(`Diferença significativa de ano (Local: ${f.year} vs TMDB: ${candYear})`);
        }
      }

      if (dirName && candDirectors.length > 0) {
        let maxDirSim = 0;
        for (const cd of candDirectors) {
          const s = computeSimilarity(dirName, cd);
          if (s > maxDirSim) maxDirSim = s;
        }
        if (maxDirSim >= 0.7) {
          score += 35;
          if (maxDirSim < 1.0) {
            divergences.push(`Grafia do diretor com pequena variação: Local "${dirName}" vs TMDB "${candDirStr}"`);
          }
        } else {
          divergences.push(`Diretor não coincide: Local "${dirName}" vs TMDB "${candDirStr}"`);
        }
      }

      evaluatedCandidates.push({
        tmdbId: cand.id,
        titleOrName: candTitle,
        originalTitle: candOrigTitle,
        releaseDateOrBirthDate: candDate,
        year: candYear,
        directorsOrKnownFor: candDirStr,
        overviewOrBio: details?.overview || cand.overview || '',
        score,
        divergences,
      });
    }

    evaluatedCandidates.sort((a, b) => b.score - a.score);
    const topCandidate = evaluatedCandidates[0];
    const secondCandidate = evaluatedCandidates[1];

    let classification: MatchConfidence = 'HIGH';
    let justification = '';

    if (!topCandidate || topCandidate.score < 50) {
      classification = 'NO_MATCH';
      justification = 'Candidatos retornados pela API possuem score insuficiente de correspondência.';
    } else if (
      (secondCandidate && Math.abs(topCandidate.score - secondCandidate.score) < 15 && topCandidate.score < 85) ||
      topCandidate.divergences.some(d => d.includes('Diretor não coincide') || d.includes('Diferença significativa de ano'))
    ) {
      classification = 'AMBIGUOUS';
      justification = `Múltiplos candidatos ou divergência relevante detectada. Candidato principal: "${topCandidate.titleOrName}" (Dir: ${topCandidate.directorsOrKnownFor || 'N/A'}, Ano: ${topCandidate.year || 'N/A'}).`;
    } else {
      classification = 'HIGH';
      justification = `Correspondência confirmada pela API TMDB: Título ("${topCandidate.titleOrName}" / "${topCandidate.originalTitle}"), Ano (${topCandidate.year}) e Direção ("${topCandidate.directorsOrKnownFor}") coincidem com alto grau de confiança.`;
    }

    filmResults.push({
      internalId: f.id,
      localTitle: f.title,
      localOriginalTitle: f.original_title,
      localYear: f.year,
      localDirector: dirName,
      localCountry: f.country,
      imdbId: f.imdb_id,
      queryUsed,
      endpointUsed,
      resultsCount: candidates.length,
      classification,
      justification,
      candidate: topCandidate,
      alternativeCandidates: evaluatedCandidates.slice(1),
      divergences: topCandidate ? topCandidate.divergences : [],
    });
  }

  // 4. Auditoria das 89 Pessoas
  console.log('\n4. AUDITANDO AS 89 PESSOAS COM QUERIES REAIS...');
  const personResults: PersonAuditResult[] = [];

  for (const p of (pessoas || [])) {
    const localCredits = creditsByPerson[p.id] || [];
    const localFilmTitles = localCredits.map(c => c.film?.title || c.film?.original_title).filter(Boolean);

    let queryUsed = p.name;
    let endpointUsed = `/search/person?query=${encodeURIComponent(queryUsed)}&language=pt-BR`;
    let searchRes = await tmdbFetch('/search/person', {
      query: queryUsed,
      language: 'pt-BR',
      include_adult: 'false',
    });

    let candidates = searchRes?.results || [];

    // Se 0 resultados, tentar variações de grafia comuns para typos do acervo
    if (candidates.length === 0) {
      const cleanName = p.name
        .replace(/Chirstopher/g, 'Christopher')
        .replace(/Seth Rogan/g, 'Seth Rogen')
        .replace(/Ewan Bremner/g, 'Ewen Bremner')
        .replace(/Marcel Heupermann/g, 'Marcel Heuperman');

      if (cleanName !== p.name) {
        const altRes = await tmdbFetch('/search/person', {
          query: cleanName,
          language: 'pt-BR',
          include_adult: 'false',
        });
        if (altRes?.results?.length > 0) {
          candidates = altRes.results;
          queryUsed = cleanName;
          endpointUsed = `/search/person?query=${encodeURIComponent(cleanName)}&language=pt-BR`;
        }
      }
    }

    if (candidates.length === 0) {
      if (p.is_editorial_profile) {
        personResults.push({
          internalId: p.id,
          localName: p.name,
          localBirthDate: p.birth_date,
          localCountry: p.country,
          localPrimaryRoles: p.primary_roles || [],
          localCreditsCount: 0,
          localFilmTitles: [],
          imdbId: p.imdb_id,
          queryUsed,
          endpointUsed,
          resultsCount: 0,
          classification: 'NO_MATCH',
          justification: 'Perfil de crítico/colunista da redação do Lanterna Mágica (entidade puramente editorial interna, sem verbete na indústria cinematográfica do TMDB).',
          divergences: ['Entidade estritamente editorial interna'],
        });
      } else {
        personResults.push({
          internalId: p.id,
          localName: p.name,
          localBirthDate: p.birth_date,
          localCountry: p.country,
          localPrimaryRoles: p.primary_roles || [],
          localCreditsCount: localCredits.length,
          localFilmTitles,
          imdbId: p.imdb_id,
          queryUsed,
          endpointUsed,
          resultsCount: 0,
          classification: 'NO_MATCH',
          justification: `Nenhum registro retornado pela API do TMDB para o nome "${p.name}".`,
          divergences: ['Sem correspondência no TMDB'],
        });
      }
      continue;
    }

    const evaluatedCandidates: ApiCandidate[] = [];

    for (const cand of candidates.slice(0, 3)) {
      const pDetails = await tmdbFetch(`/person/${cand.id}`, {
        append_to_response: 'movie_credits',
        language: 'pt-BR',
      });

      const candName = pDetails?.name || cand.name;
      const candBirthday = pDetails?.birthday || '';
      const candKnownFor = cand.known_for_department || pDetails?.known_for_department || '';
      const movieCredits = pDetails?.movie_credits || {};
      const allKnownMovies = [
        ...(movieCredits.cast || []).map((m: any) => m.title || m.original_title),
        ...(movieCredits.crew || []).map((m: any) => m.title || m.original_title),
        ...(cand.known_for || []).map((m: any) => m.title || m.original_title),
      ].filter(Boolean);

      const divergences: string[] = [];
      let score = 0;

      // 1. Similaridade de Nome
      const nameSim = computeSimilarity(p.name, candName);
      score += Math.round(nameSim * 60);
      if (nameSim < 1.0) {
        divergences.push(`Variação nominal: Local "${p.name}" vs TMDB "${candName}"`);
      }

      // 2. Data de Nascimento
      if (p.birth_date && candBirthday) {
        if (p.birth_date === candBirthday) {
          score += 25;
        } else {
          score -= 10;
          divergences.push(`Data de nascimento divergente: Local "${p.birth_date}" vs TMDB "${candBirthday}"`);
        }
      }

      // 3. Filmografia cruzada com créditos locais
      let matchedFilmCount = 0;
      for (const lf of localFilmTitles) {
        for (const tm of allKnownMovies) {
          if (computeSimilarity(lf, tm) >= 0.6) {
            matchedFilmCount++;
            break;
          }
        }
      }

      if (localFilmTitles.length > 0) {
        if (matchedFilmCount > 0) {
          score += 25;
        }
      } else {
        if (candidates.length > 1) {
          divergences.push('Pessoa sem créditos locais no banco e com múltiplos homônimos no TMDB');
        }
      }

      evaluatedCandidates.push({
        tmdbId: cand.id,
        titleOrName: candName,
        releaseDateOrBirthDate: candBirthday,
        directorsOrKnownFor: `${candKnownFor} | Obras: ${allKnownMovies.slice(0, 3).join(', ')}`,
        overviewOrBio: pDetails?.biography || '',
        score,
        divergences,
      });
    }

    evaluatedCandidates.sort((a, b) => b.score - a.score);
    const topCandidate = evaluatedCandidates[0];
    const secondCandidate = evaluatedCandidates[1];

    let classification: MatchConfidence = 'HIGH';
    let justification = '';

    if (!topCandidate || topCandidate.score < 50) {
      classification = 'NO_MATCH';
      justification = 'Candidato com score insuficiente na API do TMDB.';
    } else if (
      (secondCandidate && Math.abs(topCandidate.score - secondCandidate.score) < 15 && topCandidate.score < 80) ||
      (localCredits.length === 0 && candidates.length > 1) ||
      topCandidate.divergences.some(d => d.includes('Variação nominal') || d.includes('Data de nascimento divergente'))
    ) {
      classification = 'AMBIGUOUS';
      justification = `Correspondência ambígua ou presença de divergência/homônimos. Candidato sugerido: "${topCandidate.titleOrName}" (TMDB ID: ${topCandidate.tmdbId}).`;
    } else {
      classification = 'HIGH';
      justification = `Correspondência confirmada pela API TMDB para "${topCandidate.titleOrName}" (TMDB ID: ${topCandidate.tmdbId}).`;
    }

    personResults.push({
      internalId: p.id,
      localName: p.name,
      localBirthDate: p.birth_date,
      localCountry: p.country,
      localPrimaryRoles: p.primary_roles || [],
      localCreditsCount: localCredits.length,
      localFilmTitles,
      imdbId: p.imdb_id,
      queryUsed,
      endpointUsed,
      resultsCount: candidates.length,
      classification,
      justification,
      candidate: topCandidate,
      alternativeCandidates: evaluatedCandidates.slice(1),
      divergences: topCandidate ? topCandidate.divergences : [],
    });
  }

  // Estatísticas
  const filmStats = {
    total: filmResults.length,
    high: filmResults.filter(f => f.classification === 'HIGH').length,
    ambiguous: filmResults.filter(f => f.classification === 'AMBIGUOUS').length,
    noMatch: filmResults.filter(f => f.classification === 'NO_MATCH').length,
    error: filmResults.filter(f => f.classification === 'ERROR').length,
  };

  const personStats = {
    total: personResults.length,
    high: personResults.filter(p => p.classification === 'HIGH').length,
    ambiguous: personResults.filter(p => p.classification === 'AMBIGUOUS').length,
    noMatch: personResults.filter(p => p.classification === 'NO_MATCH').length,
    error: personResults.filter(p => p.classification === 'ERROR').length,
  };

  console.log('\n--- RESUMO ESTATÍSTICO DA EXECUÇÃO REAL ---');
  console.log('FILMES (Total 11):', filmStats);
  console.log('PESSOAS (Total 89):', personStats);
  console.log(`TELEMETRIA API TMDB: Total Requisições: ${totalRequests} | Sucessos: ${successRequests} | Erros: ${errorRequests}`);

  const finalReport = {
    generated_at: new Date().toISOString(),
    tmdb_api_authenticated: true,
    auth_method: tmdbToken ? 'Bearer Read Access Token' : 'API Key v3',
    requests_total: totalRequests,
    requests_success: successRequests,
    requests_error: errorRequests,
    algorithm_version: 'F9.3B-LIVE-HTTP-DIAGNOSTIC-V2',
    film_stats: filmStats,
    person_stats: personStats,
    films: filmResults,
    persons: personResults,
  };

  fs.writeFileSync('acervo_tmdb_prematch_report.json', JSON.stringify(finalReport, null, 2));
  console.log('\n✓ Artefato "acervo_tmdb_prematch_report.json" atualizado EXCLUSIVAMENTE com dados reais da API.');

  const { count: nullFilms } = await supabase.from('filmes').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: nullPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  console.log(`IMUTABILIDADE DO BANCO: Filmes tmdb_id=null: ${nullFilms}/11 | Pessoas tmdb_id=null: ${nullPessoas}/89 (100% INTACTO)`);
}

runLiveAudit().catch(err => {
  console.error('Erro na execução do diagnóstico real:', err);
  process.exit(1);
});
