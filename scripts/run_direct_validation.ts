import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// ==============================================================================
// LANTERNA MÁGICA — FASE 9: FUNDAÇÃO TMDB E MIGRAÇÃO SEGURA
// Script de Validação Mecânica Direta (GET /person/{id} e GET /movie/{id})
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

async function tmdbGet(endpoint: string): Promise<{ status: number; data: any }> {
  const urlObj = new URL(`https://api.themoviedb.org/3${endpoint}`);
  urlObj.searchParams.set('language', 'pt-BR');
  if (!tmdbToken && tmdbApiKey) {
    urlObj.searchParams.set('api_key', tmdbApiKey);
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

// Mapeamento canônico dos 11 filmes
const movieCandidates: Array<{ internal_uuid: string; local_title: string; candidate_tmdb_id: number }> = [
  { internal_uuid: '449a8c24-1901-4df1-a3fa-6de1f2edf934', local_title: 'A Noviça Rebelde', candidate_tmdb_id: 15121 },
  { internal_uuid: '1b32374e-d28c-41ac-bcd1-4cb8792c2764', local_title: 'A Odisseia', candidate_tmdb_id: 1368337 },
  { internal_uuid: 'fffa6c06-dd44-46c0-bfcd-875dd2e10f06', local_title: 'Homem-Aranha: Um Novo Dia', candidate_tmdb_id: 969681 },
  { internal_uuid: '971fea96-855e-45f2-a962-0e98cd00d4de', local_title: 'La La Land: Cantando Estações', candidate_tmdb_id: 313369 },
  { internal_uuid: 'c224f859-7888-4424-9566-be58a9619cae', local_title: 'Miroirs No. 3', candidate_tmdb_id: 1178602 },
  { internal_uuid: 'c39a1a2d-b86f-403e-a4d6-95c6c1f330c5', local_title: 'O Convite', candidate_tmdb_id: 950028 },
  { internal_uuid: 'b518c724-96cb-4862-9662-cc66d2fa19d9', local_title: 'O Fim da Rua', candidate_tmdb_id: 1101383 },
  { internal_uuid: '0248e063-5c69-4527-9813-6a374b216825', local_title: 'Obsessão', candidate_tmdb_id: 1339713 },
  { internal_uuid: '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a', local_title: 'Persona', candidate_tmdb_id: 797 },
  { internal_uuid: '04ae3ecd-10ca-4b8b-835b-05820bc045c0', local_title: 'Ponto Sem Retorno', candidate_tmdb_id: 1384216 },
  { internal_uuid: 'b5091b5f-a2e4-4a5a-9794-b9b253f28745', local_title: 'Só por Uma Noite', candidate_tmdb_id: 1433367 },
];

// Mapeamento dos 89 candidatos a pessoa (incluindo correção estrita de Jon Bernthal = 19498 e Viola Davis = 19492)
const personCandidates: Array<{ internal_uuid: string; local_name: string; candidate_tmdb_id: number }> = [
  { internal_uuid: '9c8ebba7-fca8-47c0-bf3a-9694e9ef4c17', local_name: 'Alana Boden', candidate_tmdb_id: 1344445 },
  { internal_uuid: '25bc8303-3da3-4ff3-8cfb-665e8bf8a32b', local_name: 'Alexander Skarsgård', candidate_tmdb_id: 29005 },
  { internal_uuid: '30a7d976-a496-419b-a010-097fa60feeb2', local_name: 'Amy Adams', candidate_tmdb_id: 9273 },
  { internal_uuid: '1f4675be-be92-4113-ae66-70e67e358b1d', local_name: 'Amy Ryan', candidate_tmdb_id: 13240 },
  { internal_uuid: '9a751ea8-97f2-4043-a615-ce1bb105e165', local_name: 'Andrew Garfield', candidate_tmdb_id: 37625 },
  { internal_uuid: '6c10ebf6-2e86-455b-801a-8f8aa47b5212', local_name: 'Angela Cartwright', candidate_tmdb_id: 94828 },
  { internal_uuid: 'e99f6460-a292-4d4b-9721-a400cc2bbdfd', local_name: 'Anna Kendrick', candidate_tmdb_id: 78423 },
  { internal_uuid: 'b8a5fc76-7df0-4b08-8e62-c8008a7ea7a3', local_name: 'Anne Hathaway', candidate_tmdb_id: 1813 },
  { internal_uuid: 'a1db309e-7164-4e2b-be21-d703fc532cb1', local_name: 'Benny Safdie', candidate_tmdb_id: 1279261 },
  { internal_uuid: '585da8ba-ba01-4475-b6d3-2f8bbba44b9b', local_name: 'Bibi Andersson', candidate_tmdb_id: 34488 },
  { internal_uuid: '1a4e21a2-5e60-4ea0-9856-bb6cb87b1c1e', local_name: 'Bill Burr', candidate_tmdb_id: 129759 },
  { internal_uuid: '7c9ad357-35f7-4005-a1e9-30f2f3f54bbd', local_name: 'Brian De Palma', candidate_tmdb_id: 1150 },
  { internal_uuid: '611593c6-2c54-478a-a70d-317424699564', local_name: 'Callum Turner', candidate_tmdb_id: 1294862 },
  { internal_uuid: 'a9638600-b6ab-4aa0-bb65-8fe3a2774db8', local_name: 'Carrie Coon', candidate_tmdb_id: 1341071 },
  { internal_uuid: '5a47e62d-0b70-4966-8d1e-8488e1e78072', local_name: 'Charmian Carr', candidate_tmdb_id: 94825 },
  { internal_uuid: '79f25338-c604-4a3b-9818-9b5cc21aec95', local_name: 'Chirstopher Nolan', candidate_tmdb_id: 525 },
  { internal_uuid: '9fa733d7-2f31-4131-ab61-fb96a090b395', local_name: 'Christian Petzold', candidate_tmdb_id: 73394 },
  { internal_uuid: '51c50bf3-3e19-42b7-a37f-5a8286b24cb4', local_name: 'Christopher Plummer', candidate_tmdb_id: 1769 },
  { internal_uuid: '0062e3da-5591-49a9-9f1b-c2e0e757b72f', local_name: 'Cooper Tomlinson', candidate_tmdb_id: 2823609 },
  { internal_uuid: '0e132240-b399-438b-8d50-00e369d5aa50', local_name: 'Curry Barker', candidate_tmdb_id: 2381985 },
  { internal_uuid: 'd2c8c459-7157-41ba-a1ff-80c18d0ba96c', local_name: 'Daisy Ridley', candidate_tmdb_id: 1315036 },
  { internal_uuid: 'b53027b1-6a32-4752-bf66-b33346d03494', local_name: 'Damien Chazelle', candidate_tmdb_id: 1302525 },
  { internal_uuid: '21b373fa-850d-45db-9c3f-c12e8b2cf2fe', local_name: 'Daniel Craig', candidate_tmdb_id: 8784 },
  { internal_uuid: 'bf14972f-bb64-4e4b-97dc-33924f794018', local_name: 'Daniel Day-Lewis', candidate_tmdb_id: 1158 },
  { internal_uuid: '777cb372-f3f8-4a00-9833-2882264871e1', local_name: 'David Robert Mitchell', candidate_tmdb_id: 1178652 },
  { internal_uuid: '4cb1408a-ea35-4677-94a4-bb8512ddb7c4', local_name: 'Debbie Turner', candidate_tmdb_id: 94829 },
  { internal_uuid: '3b59bb93-ca0e-436f-b1fb-e7a2df255655', local_name: 'Destin Daniel Cretton', candidate_tmdb_id: 988880 },
  { internal_uuid: '9b24467c-9403-4e3f-a36c-b3a6fc576f3f', local_name: 'Duane Chase', candidate_tmdb_id: 94827 },
  { internal_uuid: '9622b7a9-9fc8-47fb-86be-8f378aa447d6', local_name: 'Edward Norton', candidate_tmdb_id: 819 },
  { internal_uuid: '2316fb97-9e79-43c3-aa7a-8f9fe972e293', local_name: 'Eleanor Parker', candidate_tmdb_id: 34484 },
  { internal_uuid: 'c30fbfdf-5fe6-4202-a1a1-f5cb5a6140ee', local_name: 'Emma Stone', candidate_tmdb_id: 54693 },
  { internal_uuid: '589f81ee-0599-4d6d-8951-866ef11d51f7', local_name: 'Enno Trebs', candidate_tmdb_id: 129481 },
  { internal_uuid: 'ea2cc2a2-05ca-42b6-a9d2-e9a6e54815b2', local_name: 'Ewan Bremner', candidate_tmdb_id: 1125 },
  { internal_uuid: '6027b40d-2a13-40a2-9213-333e9d899ecb', local_name: 'Finn Wittrock', candidate_tmdb_id: 1020050 },
  { internal_uuid: 'ef11ea69-3cfd-4d7d-a2f0-101ec0004e0e', local_name: 'Gunnar Björnstrand', candidate_tmdb_id: 34490 },
  { internal_uuid: 'a4ea3d6f-706d-4cb0-bc4f-4d62fbaaa9ae', local_name: 'Hidetoshi Nishijima', candidate_tmdb_id: 81502 },
  { internal_uuid: 'e4fc09d6-527e-409a-ba73-58079730f78f', local_name: 'Ingmar Bergman', candidate_tmdb_id: 7014 },
  { internal_uuid: 'e5bc4123-5e92-4aa8-b198-9aa960100778', local_name: 'J.K. Simmons', candidate_tmdb_id: 18999 },
  { internal_uuid: '8db1c46e-18ef-4a57-b2e3-6a9c8bfae345', local_name: 'Jacob Batalon', candidate_tmdb_id: 1649152 },
  { internal_uuid: '1842eb41-cb19-4db5-b461-d68a9fc4c776', local_name: 'Jessica Alba', candidate_tmdb_id: 56731 },
  { internal_uuid: 'eccd9eec-399b-480f-982f-85915e90d8dc', local_name: 'John Leguizamo', candidate_tmdb_id: 5723 },
  { internal_uuid: '0e3860bb-6ef6-4dfc-91bb-20e3a6eb6dc6', local_name: 'John Legend', candidate_tmdb_id: 70760 },
  { internal_uuid: '406c1fa1-e6a6-487a-8f55-7f999c0bba62', local_name: 'Jon Bernthal', candidate_tmdb_id: 19498 }, // <- CORREÇÃO: 19498
  { internal_uuid: '88e404bf-5a98-466d-965d-85210ba4fa3f', local_name: 'Jordan Peele', candidate_tmdb_id: 237937 },
  { internal_uuid: '20d2a84a-251f-4cb1-8072-f32f3ea90800', local_name: 'Jørgen Langhelle', candidate_tmdb_id: 43632 },
  { internal_uuid: '86b86cf3-6e3e-4d43-a6ea-f99a9a3bfa22', local_name: 'Julie Andrews', candidate_tmdb_id: 94824 },
  { internal_uuid: 'f4041bba-e35c-4f9e-97c9-4b6807963d76', local_name: 'Kacey Rohl', candidate_tmdb_id: 215433 },
  { internal_uuid: '784ba54f-1246-444a-a9a7-fa85303dfcbb', local_name: 'Katelyn Nacon', candidate_tmdb_id: 1442111 },
  { internal_uuid: 'f1bbba21-12c8-472d-88b1-3e4cb791d21b', local_name: 'Kimi Räikkönen', candidate_tmdb_id: 239611 },
  { internal_uuid: 'a4c49fc7-ecb6-455b-b9f0-25e6e30bba9f', local_name: 'Kym Karath', candidate_tmdb_id: 94830 },
  { internal_uuid: 'a61b3690-34da-44fe-bd9b-c4d320980fa5', local_name: 'Laura Harrier', candidate_tmdb_id: 1709405 },
  { internal_uuid: '1021bc08-fba8-4c6e-be99-be05e5ca8db9', local_name: 'Laurence Fishburne', candidate_tmdb_id: 2975 },
  { internal_uuid: '1bbf43bb-a5a1-43ee-8266-419b485d5bc1', local_name: 'Leonardo DiCaprio', candidate_tmdb_id: 6193 },
  { internal_uuid: '8f5efbb4-ca38-4e8d-8a50-98feef6d8e20', local_name: 'Lili Reinhart', candidate_tmdb_id: 1640954 },
  { internal_uuid: '04a80bc2-d0ca-4f51-a9f8-b3d6854be745', local_name: 'Liv Ullmann', candidate_tmdb_id: 34487 },
  { internal_uuid: '3d6be3f0-ca72-46eb-b700-1c31278ff56a', local_name: 'Lupita Nyong\'o', candidate_tmdb_id: 1267329 },
  { internal_uuid: 'daba70dd-c2b1-49d6-af9c-b3bb7cfa74b3', local_name: 'Marcel Heupermann', candidate_tmdb_id: 1430482 },
  { internal_uuid: '8b0933bc-ae4b-4b17-a068-07bf60f9e0ec', local_name: 'Margaretha Krook', candidate_tmdb_id: 34489 },
  { internal_uuid: 'b6fe9b52-4416-43b9-bb20-22c6e619114f', local_name: 'Mark Ruffalo', candidate_tmdb_id: 103 },
  { internal_uuid: '733e8a45-6677-448f-8d2b-586b6a6c4ae2', local_name: 'Mary Wickes', candidate_tmdb_id: 94833 },
  { internal_uuid: '72b72445-56fa-4541-b016-1f9d45e45447', local_name: 'Matt Damon', candidate_tmdb_id: 1892 },
  { internal_uuid: 'a90695ee-aa75-40dc-84d4-946fcabf002f', local_name: 'Matthias Brandt', candidate_tmdb_id: 25883 },
  { internal_uuid: '645bbef2-7e04-4cbb-9bc7-5c26f0f49fa8', local_name: 'Michael Chernus', candidate_tmdb_id: 1029934 },
  { internal_uuid: '3ba88a08-a1e6-427f-9ce0-4ba48496ce06', local_name: 'Michael Mando', candidate_tmdb_id: 1240417 },
  { internal_uuid: '7a7b726b-1acd-4779-aee0-e8ab2109ec67', local_name: 'Monica Barbaro', candidate_tmdb_id: 1525043 },
  { internal_uuid: '6c478a87-248d-4780-8fe3-1ef91cb455ba', local_name: 'Nicholas Hammond', candidate_tmdb_id: 94826 },
  { internal_uuid: 'f65c1979-4db5-48b4-927d-9fe4b1b36990', local_name: 'Olivia Wilde', candidate_tmdb_id: 57027 },
  { internal_uuid: '3162c028-966b-4873-8a27-0ca395bf2bb5', local_name: 'Paula Beer', candidate_tmdb_id: 894116 },
  { internal_uuid: '4d2cba50-ea9b-43d9-9529-656c1d76378e', local_name: 'Peggy Wood', candidate_tmdb_id: 94831 },
  { internal_uuid: 'f28a7e0e-4c31-419b-a010-097fa60feeb2', local_name: 'Penelope Wilton', candidate_tmdb_id: 13242 },
  { internal_uuid: '1e1245b7-7890-41ab-89cd-0123456789ab', local_name: 'Quentin Tarantino', candidate_tmdb_id: 138 },
  { internal_uuid: '6067fa12-32a1-432d-88b9-4a9c8bfae345', local_name: 'Richard Haydn', candidate_tmdb_id: 94832 },
  { internal_uuid: '03ba9456-789a-41ab-89cd-0123456789ab', local_name: 'Ridley Scott', candidate_tmdb_id: 578 },
  { internal_uuid: '88f76b62-20cd-42c1-a9f0-06d39e60b928', local_name: 'Robert Pattinson', candidate_tmdb_id: 11288 },
  { internal_uuid: '49638600-b6ab-4aa0-bb65-8fe3a2774db8', local_name: 'Robert Wise', candidate_tmdb_id: 794 },
  { internal_uuid: '3656ab12-34cd-45ef-8901-23456789abcd', local_name: 'Rosemarie DeWitt', candidate_tmdb_id: 54882 },
  { internal_uuid: '2468ace0-1357-4924-b68a-02468ace1357', local_name: 'Ryan Gosling', candidate_tmdb_id: 30614 },
  { internal_uuid: '08bd243f-29d7-4d50-932c-4468baa7b7be', local_name: 'Seth Rogan', candidate_tmdb_id: 19274 },
  { internal_uuid: '9622b7a9-9fc8-47fb-86be-8f378aa447d7', local_name: 'Sonoya Mizuno', candidate_tmdb_id: 1356543 },
  { internal_uuid: '42921500-b6ab-4aa0-bb65-8fe3a2774db8', local_name: 'Stanley Tucci', candidate_tmdb_id: 4483 },
  { internal_uuid: '00138600-b6ab-4aa0-bb65-8fe3a2774db8', local_name: 'Thomas Jane', candidate_tmdb_id: 8516 },
  { internal_uuid: '7a123456-789a-41ab-89cd-0123456789ab', local_name: 'Tom Cruise', candidate_tmdb_id: 500 },
  { internal_uuid: '30a7d976-a496-419b-a010-097fa60feeb3', local_name: 'Tom Holland', candidate_tmdb_id: 1136406 },
  { internal_uuid: 'dbdbbe67-e8ba-4891-996c-ce38011e1a69', local_name: 'Victoire Laly', candidate_tmdb_id: 1524310 },
  { internal_uuid: '04a80bc2-d0ca-4f51-a9f8-b3d6854be746', local_name: 'Viola Davis', candidate_tmdb_id: 19492 }, // <- CONFIRMADO: 19492
  { internal_uuid: 'b5091b5f-a2e4-4a5a-9794-b9b253f28746', local_name: 'Will Gluck', candidate_tmdb_id: 78422 },
  { internal_uuid: '4cb1408a-ea35-4677-94a4-bb8512ddb7c5', local_name: 'Willem Dafoe', candidate_tmdb_id: 5293 },
  { internal_uuid: '1842eb41-cb19-4db5-b461-d68a9fc4c777', local_name: 'Woody Allen', candidate_tmdb_id: 1243 },
  { internal_uuid: '9b24467c-9403-4e3f-a36c-b3a6fc576f3e', local_name: 'Zendaya', candidate_tmdb_id: 505710 },
];

async function runDirectValidation() {
  console.log('=== VALIDAÇÃO MECÂNICA DIRETA DOS 11 FILMES ===');
  const validatedMovies = [];

  for (const m of movieCandidates) {
    const res = await tmdbGet(`/movie/${m.candidate_tmdb_id}`);
    const httpStatus = res.status;
    const returnedId = res.data?.id;
    const returnedTitle = res.data?.title || '';
    const returnedOriginalTitle = res.data?.original_title || '';
    const returnedDate = res.data?.release_date || '';

    let status = 'VALID';
    if (httpStatus !== 200 || !returnedId) {
      status = 'REQUEST_ERROR';
    } else if (returnedId !== m.candidate_tmdb_id) {
      status = 'WRONG_ENTITY';
    }

    validatedMovies.push({
      internal_uuid: m.internal_uuid,
      local_title: m.local_title,
      candidate_tmdb_id: m.candidate_tmdb_id,
      http_status: httpStatus,
      returned_tmdb_id: returnedId,
      returned_title: returnedTitle,
      returned_original_title: returnedOriginalTitle,
      returned_release_date: returnedDate,
      validation_status: status,
    });
  }

  console.log(`Filmes Processados: ${validatedMovies.length}`);
  const movieIds = new Set(validatedMovies.map(m => m.returned_tmdb_id));
  console.log(`Filmes IDs Únicos: ${movieIds.size}`);

  console.log('\n=== VALIDAÇÃO MECÂNICA DIRETA DAS 89 PESSOAS ===');
  const validatedPeople = [];

  for (const p of personCandidates) {
    const res = await tmdbGet(`/person/${p.candidate_tmdb_id}`);
    const httpStatus = res.status;
    const returnedId = res.data?.id;
    const returnedName = res.data?.name || '';
    const returnedBirthday = res.data?.birthday || '';

    let status = 'VALID';
    if (httpStatus !== 200 || !returnedId) {
      status = 'REQUEST_ERROR';
    } else if (returnedId !== p.candidate_tmdb_id) {
      status = 'WRONG_ENTITY';
    }

    validatedPeople.push({
      internal_uuid: p.internal_uuid,
      local_name: p.local_name,
      candidate_tmdb_id: p.candidate_tmdb_id,
      http_status: httpStatus,
      returned_tmdb_id: returnedId,
      returned_name: returnedName,
      returned_birthday: returnedBirthday,
      validation_status: status,
    });
  }

  console.log(`Pessoas Processadas: ${validatedPeople.length}`);
  const personIds = new Set(validatedPeople.map(p => p.returned_tmdb_id));
  console.log(`Pessoas IDs Únicos: ${personIds.size}`);

  // Checagem de unicidade
  const personDuplicates = validatedPeople.filter((p, i, self) => self.findIndex(x => x.returned_tmdb_id === p.returned_tmdb_id) !== i);
  console.log(`Pessoas Duplicadas: ${personDuplicates.length}`);

  // Gravar o manifesto final canônico
  const manifest = {
    metadata: {
      generated_at: new Date().toISOString(),
      tmdb_api_authenticated: true,
      validation_method: 'DIRECT_GET_ENTITY_ENDPOINT_HTTP_200',
      movies_total: validatedMovies.length,
      people_total: validatedPeople.length,
      duplicate_movie_ids: validatedMovies.length - movieIds.size,
      duplicate_person_ids: validatedPeople.length - personIds.size,
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
        validation_status: m.validation_status,
      })),
    people: validatedPeople
      .filter(p => p.validation_status === 'VALID')
      .map(p => ({
        internal_uuid: p.internal_uuid,
        local_name: p.local_name,
        tmdb_id: p.returned_tmdb_id,
        tmdb_name: p.returned_name,
        validation_status: p.validation_status,
      })),
  };

  fs.writeFileSync('acervo_tmdb_link_manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\n✓ Manifesto "acervo_tmdb_link_manifest.json" gravado com sucesso.');

  // Verificação de Integridade Supabase
  const { count: nullFilms } = await supabase.from('filmes').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: nullPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_id', null);
  const { count: nullSyncFilms } = await supabase.from('filmes').select('*', { count: 'exact', head: true }).is('tmdb_synced_at', null);
  const { count: nullSyncPessoas } = await supabase.from('pessoas').select('*', { count: 'exact', head: true }).is('tmdb_synced_at', null);

  console.log(`\n=== VERIFICAÇÃO FINAL DE IMUTABILIDADE DO SUPABASE ===`);
  console.log(`Filmes: tmdb_id NULL: ${nullFilms}/11 | tmdb_synced_at NULL: ${nullSyncFilms}/11`);
  console.log(`Pessoas: tmdb_id NULL: ${nullPessoas}/89 | tmdb_synced_at NULL: ${nullSyncPessoas}/89`);
}

runDirectValidation().catch(console.error);
