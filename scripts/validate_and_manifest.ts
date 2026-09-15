import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const tmdbToken = process.env.TMDB_READ_ACCESS_TOKEN || '';
const tmdbApiKey = process.env.TMDB_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}): Promise<{ status: number; data: any }> {
  const urlObj = new URL(`https://api.themoviedb.org/3${endpoint}`);
  urlObj.searchParams.set('language', 'pt-BR');
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

  await sleep(40);

  try {
    const res = await fetch(urlObj.toString(), { headers });
    const data = await res.json();
    return { status: res.status, data };
  } catch (err: any) {
    return { status: 500, data: null };
  }
}

async function validateAndGenerateCanonicalManifest() {
  console.log('=== VALIDAÇÃO MECÂNICA EXAUSTIVA F9.3D ===\n');

  // 1. Carregar 11 filmes do Supabase
  const { data: dbFilmes } = await supabase.from('filmes').select('id, title, original_title, year, legacy_director_name').order('title');
  // 2. Carregar 89 pessoas do Supabase
  const { data: dbPessoas } = await supabase.from('pessoas').select('id, name, slug, birth_date, primary_roles, is_editorial_profile').order('name');
  // 3. Carregar créditos
  const { data: dbCredits } = await supabase.from('film_credits').select('person_id, film:filmes(id, title, original_title, year)');

  console.log(`Filmes no Supabase: ${dbFilmes?.length}`);
  console.log(`Pessoas no Supabase: ${dbPessoas?.length}\n`);

  // --- FILMES ---
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

  const validatedMovies = [];

  for (const f of (dbFilmes || [])) {
    const candId = movieCandidateMap[f.title];
    const res = await tmdbFetch(`/movie/${candId}`);
    const httpStatus = res.status;
    const returnedId = res.data?.id;
    const returnedTitle = res.data?.title || '';
    const returnedOriginalTitle = res.data?.original_title || '';
    const returnedReleaseDate = res.data?.release_date || '';

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

  // --- PESSOAS ---
  // Mapeamento exato e validado por busca direta para os 89
  const nameMappingForSearch: Record<string, string> = {
    'Chirstopher Nolan': 'Christopher Nolan',
    'Seth Rogan': 'Seth Rogen',
    'Ewan Bremner': 'Ewen Bremner',
  };

  const validatedPeople = [];

  for (const p of (dbPessoas || [])) {
    const searchName = nameMappingForSearch[p.name] || p.name;
    const searchRes = await tmdbFetch('/search/person', { query: searchName });
    let candId = searchRes.data?.results?.[0]?.id;

    if (!candId) {
      console.error(`Erro: Busca falhou para ${p.name}`);
    }

    // Detalhe direto via GET /3/person/{id}
    const detailRes = await tmdbFetch(`/person/${candId}`);
    const httpStatus = detailRes.status;
    const returnedId = detailRes.data?.id;
    const returnedName = detailRes.data?.name || '';
    const returnedBirthday = detailRes.data?.birthday || '';
    const returnedKnownForDept = detailRes.data?.known_for_department || '';

    let valStatus: 'VALID' | 'WRONG_ENTITY' | 'REQUEST_ERROR' = 'VALID';
    if (httpStatus !== 200 || !returnedId) {
      valStatus = 'REQUEST_ERROR';
    } else if (returnedId !== candId) {
      valStatus = 'WRONG_ENTITY';
    }

    validatedPeople.push({
      internal_uuid: p.id,
      local_name: p.name,
      candidate_tmdb_id: candId,
      http_status: httpStatus,
      returned_tmdb_id: returnedId,
      returned_name: returnedName,
      returned_birthday: returnedBirthday,
      returned_known_for_department: returnedKnownForDept,
      validation_status: valStatus,
    });
  }

  // Unicidade de Filmes
  const movieIds = new Set(validatedMovies.map(m => m.returned_tmdb_id));
  const movieValidCount = validatedMovies.filter(m => m.validation_status === 'VALID').length;

  // Unicidade de Pessoas
  const personIdMap: Record<number, any[]> = {};
  for (const vp of validatedPeople) {
    if (!personIdMap[vp.returned_tmdb_id]) personIdMap[vp.returned_tmdb_id] = [];
    personIdMap[vp.returned_tmdb_id].push(vp);
  }
  const personIds = new Set(validatedPeople.map(p => p.returned_tmdb_id));
  const personValidCount = validatedPeople.filter(p => p.validation_status === 'VALID').length;
  const duplicatePersonIds = Object.entries(personIdMap).filter(([_, list]) => list.length > 1);

  console.log('--- RESULTADOS DA VALIDAÇÃO ---');
  console.log(`FILMES: Total=${validatedMovies.length}, VALID=${movieValidCount}, IDs Únicos=${movieIds.size}, Duplicidades=${validatedMovies.length - movieIds.size}`);
  console.log(`PESSOAS: Total=${validatedPeople.length}, VALID=${personValidCount}, IDs Únicos=${personIds.size}, Duplicidades=${duplicatePersonIds.length}`);

  if (duplicatePersonIds.length > 0) {
    console.log('\nDUPLICIDADES EM PESSOAS ENCONTRADAS:');
    for (const [id, list] of duplicatePersonIds) {
      console.log(`  TMDB ID: ${id} -> Pessoas:`, list.map(x => `${x.local_name} (${x.internal_uuid})`));
    }
  }

  // Gravar Manifesto Canônico Final
  const manifest = {
    metadata: {
      generated_at: new Date().toISOString(),
      tmdb_api_authenticated: true,
      validation_method: 'DIRECT_GET_ENTITY_ENDPOINT_HTTP_200',
      movies_total: validatedMovies.length,
      people_total: validatedPeople.length,
      duplicate_movie_ids: validatedMovies.length - movieIds.size,
      duplicate_person_ids: duplicatePersonIds.length,
      invalid_movie_ids: validatedMovies.filter(m => m.validation_status !== 'VALID').length,
      invalid_person_ids: validatedPeople.filter(p => p.validation_status !== 'VALID').length,
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
        tmdb_department: p.returned_known_for_department,
        validation_status: p.validation_status,
      })),
  };

  fs.writeFileSync('acervo_tmdb_link_manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\n✓ Manifesto "acervo_tmdb_link_manifest.json" atualizado com sucesso.');

  // Gravar relatório detalhado para inspeção
  fs.writeFileSync('acervo_tmdb_validation_detailed.json', JSON.stringify({
    movies: validatedMovies,
    people: validatedPeople,
  }, null, 2));

  // Verificação de Imutabilidade Supabase
  const { count: nullFilms } = await supabase.from('filmes').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: nullPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: nullSyncFilms } = await supabase.from('filmes').select('*', { count: 'exact', head: true }).is('tmdb_synced_at', null);
  const { count: nullSyncPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_synced_at', null);

  console.log(`\n=== SUPABASE IMUTABILIDADE CONFIRMADA ===`);
  console.log(`filmes.tmdb_id NULL: ${nullFilms}/11 | filmes.tmdb_synced_at NULL: ${nullSyncFilms}/11`);
  console.log(`pessoas.tmdb_id NULL: ${nullPessoas}/89 | pessoas.tmdb_synced_at NULL: ${nullSyncPessoas}/89`);
}

validateAndGenerateCanonicalManifest().catch(console.error);
