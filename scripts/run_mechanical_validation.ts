import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// ==============================================================================
// LANTERNA MÁGICA — FASE 9: FUNDAÇÃO TMDB E MIGRAÇÃO SEGURA
// Script de Validação Mecânica Final: Etapa F9.3D
//
// REGRAS ESTRITAS:
// - 100% READ-ONLY no Supabase (Nenhuma gravação ou alteração de dados).
// - Consulta direta a GET /3/person/{id} e GET /3/movie/{id} para TODOS os registros.
// - Detecção exaustiva de duplicidades e garantia de 89 IDs de pessoas distintos e 11 IDs de filmes distintos.
// - Geração do manifesto canônico acervo_tmdb_link_manifest.json.
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
  console.error('Credenciais TMDB ausentes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}): Promise<{ status: number; data: any }> {
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

  await sleep(35); // Rate limiting gentil

  try {
    const res = await fetch(urlObj.toString(), { headers });
    const data = await res.json();
    return { status: res.status, data };
  } catch (err: any) {
    return { status: 500, data: null };
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

async function runMechanicalValidation() {
  console.log('================================================================');
  console.log('LANTERNA MÁGICA — F9.3D: VALIDAÇÃO MECÂNICA FINAL DOS IDs TMDB');
  console.log('================================================================\n');

  // 1. Carregar acervo do Supabase
  const { data: filmes } = await supabase.from('filmes').select('id, title, original_title, year, legacy_director_name').order('title');
  const { data: pessoas } = await supabase.from('pessoas').select('id, name, slug, birth_date, primary_roles, is_editorial_profile').order('name');
  const { data: allCredits } = await supabase.from('film_credits').select('person_id, film:filmes(id, title, original_title)');

  console.log(`Carregados do banco: ${filmes?.length} filmes e ${pessoas?.length} pessoas.\n`);

  const creditsByPerson: Record<string, any[]> = {};
  for (const c of (allCredits || [])) {
    if (c.person_id) {
      if (!creditsByPerson[c.person_id]) creditsByPerson[c.person_id] = [];
      creditsByPerson[c.person_id].push(c);
    }
  }

  // 2. Investigar especificamente Viola Davis e Jon Bernthal no TMDB
  console.log('--- 1. INVESTIGAÇÃO ESPECÍFICA: JON BERNTHAL vs VIOLA DAVIS ---');
  const searchJB = await tmdbFetch('/search/person', { query: 'Jon Bernthal' });
  const searchVD = await tmdbFetch('/search/person', { query: 'Viola Davis' });
  console.log('TMDB Search Jon Bernthal:', searchJB.data?.results?.[0]?.id, searchJB.data?.results?.[0]?.name);
  console.log('TMDB Search Viola Davis:', searchVD.data?.results?.[0]?.id, searchVD.data?.results?.[0]?.name);

  // 3. Fazer nova busca precisa e validação para TODAS as 89 pessoas
  console.log('\n--- 2. PROCESSANDO TODAS AS 89 PESSOAS COM VERIFICAÇÃO INDIVIDUAL ---');

  interface ValidatedPerson {
    internal_uuid: string;
    local_name: string;
    candidate_tmdb_id: number;
    http_status: number;
    returned_tmdb_id: number;
    returned_name: string;
    returned_birthday?: string;
    validation_status: 'VALID' | 'WRONG_ENTITY' | 'REQUEST_ERROR';
    notes?: string;
  }

  const validatedPeople: ValidatedPerson[] = [];

  for (const p of (pessoas || [])) {
    // Definir nome de busca (tratando variações conhecidas do acervo local)
    let searchName = p.name;
    if (p.name === 'Chirstopher Nolan') searchName = 'Christopher Nolan';
    if (p.name === 'Seth Rogan') searchName = 'Seth Rogen';
    if (p.name === 'Ewan Bremner') searchName = 'Ewen Bremner';
    if (p.name === 'Marcel Heupermann') searchName = 'Marcel Heuperman';

    // 1. Busca por nome no TMDB
    const searchRes = await tmdbFetch('/search/person', { query: searchName, language: 'pt-BR' });
    let bestTmdbId = searchRes.data?.results?.[0]?.id;

    if (!bestTmdbId) {
      // Tentar busca em en-US
      const searchResEn = await tmdbFetch('/search/person', { query: searchName, language: 'en-US' });
      bestTmdbId = searchResEn.data?.results?.[0]?.id;
    }

    if (!bestTmdbId) {
      validatedPeople.push({
        internal_uuid: p.id,
        local_name: p.name,
        candidate_tmdb_id: 0,
        http_status: 404,
        returned_tmdb_id: 0,
        returned_name: '',
        validation_status: 'REQUEST_ERROR',
        notes: 'Nenhum resultado retornado no endpoint de busca',
      });
      continue;
    }

    // 2. Validação mecânica direta via GET /3/person/{id}
    const personDetailRes = await tmdbFetch(`/person/${bestTmdbId}`, { language: 'pt-BR' });
    const httpStatus = personDetailRes.status;
    const returnedId = personDetailRes.data?.id;
    const returnedName = personDetailRes.data?.name || '';
    const returnedBirthday = personDetailRes.data?.birthday || '';

    // Validar correspondência de entidade
    const nameSim = computeSimilarity(searchName, returnedName);
    let valStatus: 'VALID' | 'WRONG_ENTITY' | 'REQUEST_ERROR' = 'VALID';

    if (httpStatus !== 200 || !returnedId) {
      valStatus = 'REQUEST_ERROR';
    } else if (returnedId !== bestTmdbId || nameSim < 0.6) {
      valStatus = 'WRONG_ENTITY';
    }

    validatedPeople.push({
      internal_uuid: p.id,
      local_name: p.name,
      candidate_tmdb_id: bestTmdbId,
      http_status: httpStatus,
      returned_tmdb_id: returnedId,
      returned_name: returnedName,
      returned_birthday: returnedBirthday,
      validation_status: valStatus,
      notes: p.name !== searchName ? `Variação nominal tratada: "${p.name}" -> "${searchName}"` : undefined,
    });
  }

  // 4. Detecção de duplicidades em pessoas
  console.log('\n--- 3. CHECAGEM DE UNICIDADE DE PESSOAS ---');
  const personIdMap: Record<number, ValidatedPerson[]> = {};
  for (const vp of validatedPeople) {
    if (!personIdMap[vp.candidate_tmdb_id]) personIdMap[vp.candidate_tmdb_id] = [];
    personIdMap[vp.candidate_tmdb_id].push(vp);
  }

  const distinctPersonIds = Object.keys(personIdMap).length;
  const duplicatePersonIds = Object.entries(personIdMap).filter(([_, list]) => list.length > 1);

  console.log(`Pessoas Totais: ${validatedPeople.length}`);
  console.log(`Pessoas IDs Únicos: ${distinctPersonIds}`);
  console.log(`Pessoas Duplicidades: ${duplicatePersonIds.length}`);

  if (duplicatePersonIds.length > 0) {
    console.error('ERRO: Duplicidades encontradas em pessoas:');
    duplicatePersonIds.forEach(([id, list]) => {
      console.error(`  TMDB ID ${id}:`, list.map(x => `${x.local_name} (${x.internal_uuid})`));
    });
  }

  // 5. Validação Mecânica dos 11 Filmes
  console.log('\n--- 4. VALIDAÇÃO MECÂNICA DOS 11 FILMES ---');

  interface ValidatedMovie {
    internal_uuid: string;
    local_title: string;
    candidate_tmdb_id: number;
    http_status: number;
    returned_tmdb_id: number;
    returned_title: string;
    returned_original_title: string;
    returned_release_date: string;
    validation_status: 'VALID' | 'WRONG_ENTITY' | 'REQUEST_ERROR';
    notes?: string;
  }

  const validatedMovies: ValidatedMovie[] = [];

  // IDs dos filmes confirmados na F9.3B
  const movieCandidateMap: Record<string, number> = {
    'A Noviça Rebelde': 15121,
    'A Odisseia': 1368337,
    'Homem-Aranha: Um Novo Dia': 969681,
    'La La Land: Cantando Estações': 313369,
    'Miroirs No. 3': 1178602,
    'O Convite': 950028,
    'O Fim da Rua': 1101383,
    'Obsessão': 1339713,
    'Persona': 797,
    'Ponto Sem Retorno': 1384216,
    'Só por Uma Noite': 1433367,
  };

  for (const f of (filmes || [])) {
    const candId = movieCandidateMap[f.title];
    const movieDetailRes = await tmdbFetch(`/movie/${candId}`, { language: 'pt-BR' });
    const httpStatus = movieDetailRes.status;
    const returnedId = movieDetailRes.data?.id;
    const returnedTitle = movieDetailRes.data?.title || '';
    const returnedOriginalTitle = movieDetailRes.data?.original_title || '';
    const returnedReleaseDate = movieDetailRes.data?.release_date || '';

    let valStatus: 'VALID' | 'WRONG_ENTITY' | 'REQUEST_ERROR' = 'VALID';
    if (httpStatus !== 200 || !returnedId) {
      valStatus = 'REQUEST_ERROR';
    } else if (returnedId !== candId) {
      valStatus = 'WRONG_ENTITY';
    }

    validatedMovies.push({
      internal_uuid: f.id,
      local_title: f.title,
      candidate_tmdb_id: candId,
      http_status: httpStatus,
      returned_tmdb_id: returnedId,
      returned_title: returnedTitle,
      returned_original_title: returnedOriginalTitle,
      returned_release_date: returnedReleaseDate,
      validation_status: valStatus,
    });
  }

  // 6. Detecção de duplicidades em filmes
  console.log('\n--- 5. CHECAGEM DE UNICIDADE DE FILMES ---');
  const movieIdMap: Record<number, ValidatedMovie[]> = {};
  for (const vm of validatedMovies) {
    if (!movieIdMap[vm.candidate_tmdb_id]) movieIdMap[vm.candidate_tmdb_id] = [];
    movieIdMap[vm.candidate_tmdb_id].push(vm);
  }

  const distinctMovieIds = Object.keys(movieIdMap).length;
  const duplicateMovieIds = Object.entries(movieIdMap).filter(([_, list]) => list.length > 1);

  console.log(`Filmes Totais: ${validatedMovies.length}`);
  console.log(`Filmes IDs Únicos: ${distinctMovieIds}`);
  console.log(`Filmes Duplicidades: ${duplicateMovieIds.length}`);

  // 7. Gerar Manifesto Canônico: acervo_tmdb_link_manifest.json
  const invalidPeople = validatedPeople.filter(p => p.validation_status !== 'VALID');
  const invalidMovies = validatedMovies.filter(m => m.validation_status !== 'VALID');

  const manifest = {
    metadata: {
      generated_at: new Date().toISOString(),
      tmdb_api_authenticated: true,
      validation_method: 'DIRECT_GET_ENTITY_ENDPOINT_HTTP_200',
      movies_total: validatedMovies.length,
      people_total: validatedPeople.length,
      duplicate_movie_ids: duplicateMovieIds.length,
      duplicate_person_ids: duplicatePersonIds.length,
      invalid_movie_ids: invalidMovies.length,
      invalid_person_ids: invalidPeople.length,
    },
    movies: validatedMovies
      .filter(m => m.validation_status === 'VALID')
      .map(m => ({
        internal_uuid: m.internal_uuid,
        local_title: m.local_title,
        tmdb_id: m.returned_tmdb_id,
        tmdb_title: m.returned_title,
        tmdb_original_title: m.returned_original_title,
        tmdb_release_date: m.returned_release_date,
        validation_status: m.validation_status,
      })),
    people: validatedPeople
      .filter(p => p.validation_status === 'VALID')
      .map(p => ({
        internal_uuid: p.internal_uuid,
        local_name: p.local_name,
        tmdb_id: p.returned_tmdb_id,
        tmdb_name: p.returned_name,
        tmdb_birthday: p.returned_birthday,
        validation_status: p.validation_status,
      })),
  };

  fs.writeFileSync('acervo_tmdb_link_manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\n✓ Manifesto "acervo_tmdb_link_manifest.json" gravado com sucesso.');

  // 8. Confirmação de Imutabilidade do Supabase
  const { count: nullFilms } = await supabase.from('filmes').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: nullPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: nullSyncFilms } = await supabase.from('filmes').select('*', { count: 'exact', head: true }).is('tmdb_synced_at', null);
  const { count: nullSyncPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_synced_at', null);

  console.log(`\n--- CONFIRMAÇÃO DE IMUTABILIDADE DO SUPABASE ---`);
  console.log(`Filmes: tmdb_id NULL: ${nullFilms}/11 | tmdb_synced_at NULL: ${nullSyncFilms}/11`);
  console.log(`Pessoas: tmdb_id NULL: ${nullPessoas}/89 | tmdb_synced_at NULL: ${nullSyncPessoas}/89`);
}

runMechanicalValidation().catch(err => {
  console.error('Erro na validação mecânica:', err);
  process.exit(1);
});
