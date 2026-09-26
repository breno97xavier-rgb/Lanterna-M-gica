import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const tmdbToken = (process.env.TMDB_READ_ACCESS_TOKEN || '').trim();
const tmdbApiKey = (process.env.TMDB_API_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function fetchTmdbCredits(tmdbId: number) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}/credits`);
  url.searchParams.set('language', 'pt-BR');
  if (!tmdbToken && tmdbApiKey) {
    url.searchParams.set('api_key', tmdbApiKey);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (tmdbToken) {
    headers['Authorization'] = `Bearer ${tmdbToken}`;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`TMDB credits error: HTTP ${res.status}`);
  }
  return await res.json();
}

async function main() {
  console.log('=== AUDITORIA F10.4E-A: PESSOAS E CRÉDITOS ===\n');

  // 1. AUDITAR PESSOAS
  console.log('--- 1. AUDITORIA DE PESSOAS (READ-ONLY) ---');
  const { data: pessoas, error: pessoasError } = await supabase
    .from('pessoas')
    .select('*')
    .order('name');

  if (pessoasError) {
    console.error('Erro ao buscar pessoas:', pessoasError);
    return;
  }

  const totalPessoas = pessoas.length;
  const withTmdbId = pessoas.filter(p => p.tmdb_id !== null && p.tmdb_id !== undefined);
  const withoutTmdbId = pessoas.filter(p => p.tmdb_id === null || p.tmdb_id === undefined);
  const withImdbId = pessoas.filter(p => p.imdb_id && p.imdb_id.trim() !== '');
  const withTmdbSyncedAt = pessoas.filter(p => p.tmdb_synced_at !== null && p.tmdb_synced_at !== undefined);

  console.log(`Total de pessoas cadastradas: ${totalPessoas}`);
  console.log(`Pessoas com tmdb_id: ${withTmdbId.length}`);
  console.log(`Pessoas sem tmdb_id: ${withoutTmdbId.length}`);
  console.log(`Pessoas com imdb_id: ${withImdbId.length}`);
  console.log(`Pessoas com tmdb_synced_at: ${withTmdbSyncedAt.length}`);

  console.log('\nPessoas com tmdb_id preenchido:');
  withTmdbId.forEach(p => {
    console.log(`  - [${p.id}] ${p.name} (slug: ${p.slug}) -> tmdb_id: ${p.tmdb_id}, synced_at: ${p.tmdb_synced_at || 'NULL'}, imdb: ${p.imdb_id || 'NULL'}`);
  });

  // Duplicidades por nome exato e normalizado
  const exactNameMap = new Map<string, typeof pessoas>();
  const normNameMap = new Map<string, typeof pessoas>();
  const slugMap = new Map<string, typeof pessoas>();

  pessoas.forEach(p => {
    const exact = p.name.trim();
    const norm = normalizeName(p.name);
    const slug = p.slug.trim();

    if (!exactNameMap.has(exact)) exactNameMap.set(exact, []);
    exactNameMap.get(exact)!.push(p);

    if (!normNameMap.has(norm)) normNameMap.set(norm, []);
    normNameMap.get(norm)!.push(p);

    if (!slugMap.has(slug)) slugMap.set(slug, []);
    slugMap.get(slug)!.push(p);
  });

  const duplicateExact = Array.from(exactNameMap.entries()).filter(([_, list]) => list.length > 1);
  const duplicateNorm = Array.from(normNameMap.entries()).filter(([_, list]) => list.length > 1);
  const duplicateSlugs = Array.from(slugMap.entries()).filter(([_, list]) => list.length > 1);

  console.log(`\nDuplicidades exatas de name: ${duplicateExact.length}`);
  duplicateExact.forEach(([name, list]) => {
    console.log(`  - "${name}": ${list.map(p => p.id).join(', ')}`);
  });

  console.log(`Duplicidades por nome normalizado: ${duplicateNorm.length}`);
  duplicateNorm.forEach(([norm, list]) => {
    console.log(`  - "${norm}": ${list.map(p => `"${p.name}" (${p.id})`).join(', ')}`);
  });

  console.log(`Slugs conflitantes: ${duplicateSlugs.length}`);
  duplicateSlugs.forEach(([slug, list]) => {
    console.log(`  - "${slug}": ${list.map(p => p.id).join(', ')}`);
  });

  // 2. AUDITAR FILM_CREDITS
  console.log('\n--- 2. AUDITORIA DE FILM_CREDITS (READ-ONLY) ---');
  const { data: credits, error: creditsError } = await supabase
    .from('film_credits')
    .select('*')
    .order('created_at');

  if (creditsError) {
    console.error('Erro ao buscar film_credits:', creditsError);
    return;
  }

  const totalCredits = credits.length;
  const withPersonId = credits.filter(c => c.person_id !== null && c.person_id !== undefined);
  const withFallbackName = credits.filter(c => c.fallback_person_name && c.fallback_person_name.trim() !== '');
  const withBoth = credits.filter(c => c.person_id && c.fallback_person_name);
  const withNeither = credits.filter(c => !c.person_id && !c.fallback_person_name);

  console.log(`Total de film_credits: ${totalCredits}`);
  console.log(`Créditos com person_id: ${withPersonId.length}`);
  console.log(`Créditos com fallback_person_name: ${withFallbackName.length}`);
  console.log(`Créditos com ambos preenchidos: ${withBoth.length}`);
  console.log(`Créditos sem nenhum preenchido: ${withNeither.length}`);

  // Departamentos e roles
  const deptCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const deptRolePairs = new Map<string, number>();

  credits.forEach(c => {
    const dept = c.department || '(vazio)';
    const role = c.role || '(vazio)';
    deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    const pair = `${dept} -> ${role}`;
    deptRolePairs.set(pair, (deptRolePairs.get(pair) || 0) + 1);
  });

  console.log('\nDepartamentos utilizados:');
  Array.from(deptCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => {
      console.log(`  - ${dept}: ${count}`);
    });

  console.log('\nPares Departamento -> Função (Role) utilizados:');
  Array.from(deptRolePairs.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([pair, count]) => {
      console.log(`  - ${pair}: ${count}`);
    });

  // Duplicações em film_credits
  const creditKeyMap = new Map<string, typeof credits>();
  credits.forEach(c => {
    const key = `${c.film_id}|${c.person_id || ''}|${c.fallback_person_name || ''}|${c.department}|${c.role || ''}|${c.character_name || ''}`;
    if (!creditKeyMap.has(key)) creditKeyMap.set(key, []);
    creditKeyMap.get(key)!.push(c);
  });

  const duplicateCredits = Array.from(creditKeyMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`\nCréditos duplicados exatos (mesmo film_id + person/fallback + dept + role + character): ${duplicateCredits.length}`);
  duplicateCredits.forEach(([key, list]) => {
    console.log(`  - Key "${key}": ${list.length} ocorrências (IDs: ${list.map(c => c.id).join(', ')})`);
  });

  // Pessoas com maior número de créditos
  const personCreditCounts = new Map<string, { name: string; count: number }>();
  const pessoaById = new Map(pessoas.map(p => [p.id, p]));

  credits.forEach(c => {
    if (c.person_id) {
      const p = pessoaById.get(c.person_id);
      const name = p ? p.name : `Unknown UUID ${c.person_id}`;
      const entry = personCreditCounts.get(c.person_id) || { name, count: 0 };
      entry.count++;
      personCreditCounts.set(c.person_id, entry);
    } else if (c.fallback_person_name) {
      const fbKey = `fb:${c.fallback_person_name}`;
      const entry = personCreditCounts.get(fbKey) || { name: `(Fallback) ${c.fallback_person_name}`, count: 0 };
      entry.count++;
      personCreditCounts.set(fbKey, entry);
    }
  });

  console.log('\nPessoas com mais créditos no acervo:');
  Array.from(personCreditCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([id, { name, count }]) => {
      console.log(`  - ${name} (${id}): ${count} crédito(s)`);
    });

  // Filmes com mais créditos
  const filmCreditCounts = new Map<string, number>();
  credits.forEach(c => {
    filmCreditCounts.set(c.film_id, (filmCreditCounts.get(c.film_id) || 0) + 1);
  });

  const { data: filmes } = await supabase.from('filmes').select('id, title, year, slug, tmdb_id');
  const filmeById = new Map((filmes || []).map(f => [f.id, f]));

  console.log('\nFilmes com mais créditos no acervo:');
  Array.from(filmCreditCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([filmId, count]) => {
      const f = filmeById.get(filmId);
      const title = f ? `${f.title} (${f.year}) [${f.slug}]` : `UUID ${filmId}`;
      console.log(`  - ${title}: ${count} crédito(s)`);
    });

  // 3. AUDITORIA ESPECÍFICA LE TROU
  console.log('\n--- 3. AUDITORIA ESPECÍFICA: LE TROU ---');
  const leTrouId = '34d2715c-bd3f-4737-b109-cce4b6724599';
  const leTrouFilm = filmeById.get(leTrouId);
  console.log(`Filme local:`, leTrouFilm);

  const { data: leTrouCredits } = await supabase
    .from('film_credits')
    .select('*')
    .eq('film_id', leTrouId)
    .order('order_index');

  console.log(`\nCréditos locais atuais de Le Trou (${(leTrouCredits || []).length}):`);
  (leTrouCredits || []).forEach(c => {
    const p = c.person_id ? pessoaById.get(c.person_id) : null;
    const personDisplay = p ? `${p.name} (UUID: ${p.id}, tmdb_id: ${p.tmdb_id || 'NULL'})` : `FALLBACK: "${c.fallback_person_name}"`;
    console.log(`  - [order: ${c.order_index}] [${c.department} / ${c.role || '-'}] ${personDisplay} ${c.character_name ? `(Personagem: ${c.character_name})` : ''}`);
  });

  // Consultar TMDB #29259
  console.log('\nConsultando TMDB #29259 (Le Trou)...');
  const tmdbCredits = await fetchTmdbCredits(29259);
  const cast = tmdbCredits.cast || [];
  const crew = tmdbCredits.crew || [];

  console.log(`TMDB Retornou: ${cast.length} membros no Elenco (cast) e ${crew.length} membros na Equipe Técnica (crew). Total: ${cast.length + crew.length}`);

  console.log('\nElenco TMDB (primeiros 10 de ' + cast.length + '):');
  cast.slice(0, 10).forEach((c: any) => {
    console.log(`  - [order: ${c.order}] ${c.name} (TMDB ID: ${c.id}) as "${c.character}"`);
  });

  console.log('\nEquipe Técnica TMDB (todos os ' + crew.length + '):');
  crew.forEach((c: any) => {
    console.log(`  - [${c.department} / ${c.job}] ${c.name} (TMDB ID: ${c.id})`);
  });

  // Classificação dos membros do TMDB contra pessoas locais
  console.log('\n--- CLASSIFICAÇÃO DOS CRÉDITOS TMDB CONTRA PESSOAS LOCAIS ---');

  const allTmdbPeople = new Map<number, { name: string; roles: string[]; jobs: string[]; original: any }>();
  cast.forEach((c: any) => {
    if (!allTmdbPeople.has(c.id)) {
      allTmdbPeople.set(c.id, { name: c.name, roles: [`Elenco (${c.character || 'Ator'})`], jobs: ['Cast'], original: c });
    } else {
      allTmdbPeople.get(c.id)!.roles.push(`Elenco (${c.character || 'Ator'})`);
    }
  });

  crew.forEach((c: any) => {
    if (!allTmdbPeople.has(c.id)) {
      allTmdbPeople.set(c.id, { name: c.name, roles: [`${c.department}: ${c.job}`], jobs: [c.job], original: c });
    } else {
      allTmdbPeople.get(c.id)!.roles.push(`${c.department}: ${c.job}`);
      allTmdbPeople.get(c.id)!.jobs.push(c.job);
    }
  });

  const tmdbIdToPessoa = new Map<number, any>();
  pessoas.forEach(p => {
    if (p.tmdb_id) tmdbIdToPessoa.set(p.tmdb_id, p);
  });

  const normNameToPessoas = new Map<string, any[]>();
  pessoas.forEach(p => {
    const n = normalizeName(p.name);
    if (!normNameToPessoas.has(n)) normNameToPessoas.set(n, []);
    normNameToPessoas.get(n)!.push(p);
  });

  const classification = {
    exactMatch: [] as any[],
    localCandidateNoTmdbId: [] as any[],
    noLocalCandidate: [] as any[],
    ambiguous: [] as any[],
  };

  allTmdbPeople.forEach((info, tmdbPersonId) => {
    const exactPessoa = tmdbIdToPessoa.get(tmdbPersonId);
    if (exactPessoa) {
      classification.exactMatch.push({
        tmdbPersonId,
        name: info.name,
        roles: info.roles,
        localPessoa: exactPessoa,
      });
      return;
    }

    const norm = normalizeName(info.name);
    const candidateList = normNameToPessoas.get(norm) || [];

    if (candidateList.length === 1) {
      const cand = candidateList[0];
      if (cand.tmdb_id === null || cand.tmdb_id === undefined) {
        classification.localCandidateNoTmdbId.push({
          tmdbPersonId,
          name: info.name,
          roles: info.roles,
          localPessoa: cand,
        });
      } else {
        // Possui outro tmdb_id! Ambíguo/Homônimo com TMDB ID divergente
        classification.ambiguous.push({
          tmdbPersonId,
          name: info.name,
          roles: info.roles,
          reason: `Pessoa local '${cand.name}' (${cand.id}) possui tmdb_id diferente (${cand.tmdb_id})`,
          localPessoa: cand,
        });
      }
    } else if (candidateList.length > 1) {
      classification.ambiguous.push({
        tmdbPersonId,
        name: info.name,
        roles: info.roles,
        reason: `Múltiplos candidatos locais encontrados (${candidateList.length})`,
        candidates: candidateList,
      });
    } else {
      classification.noLocalCandidate.push({
        tmdbPersonId,
        name: info.name,
        roles: info.roles,
      });
    }
  });

  console.log(`\n[A] MATCH EXATO POR tmdb_id (${classification.exactMatch.length}):`);
  classification.exactMatch.forEach(m => {
    console.log(`  ✓ TMDB #${m.tmdbPersonId} "${m.name}" -> Local: "${m.localPessoa.name}" (UUID: ${m.localPessoa.id}, slug: ${m.localPessoa.slug}) [${m.roles.join(', ')}]`);
  });

  console.log(`\n[B] CANDIDATO LOCAL SEM tmdb_id (${classification.localCandidateNoTmdbId.length}):`);
  classification.localCandidateNoTmdbId.forEach(m => {
    console.log(`  ? TMDB #${m.tmdbPersonId} "${m.name}" -> Candidato local: "${m.localPessoa.name}" (UUID: ${m.localPessoa.id}, slug: ${m.localPessoa.slug}, tmdb_id: NULL) [${m.roles.join(', ')}]`);
  });

  console.log(`\n[C] NENHUM CANDIDATO LOCAL (${classification.noLocalCandidate.length}):`);
  classification.noLocalCandidate.forEach(m => {
    console.log(`  + TMDB #${m.tmdbPersonId} "${m.name}" [${m.roles.join(', ')}]`);
  });

  console.log(`\n[D] AMBÍGUO (${classification.ambiguous.length}):`);
  classification.ambiguous.forEach(m => {
    console.log(`  ! TMDB #${m.tmdbPersonId} "${m.name}" -> Motivo: ${m.reason}`);
  });
}

main().catch(console.error);
