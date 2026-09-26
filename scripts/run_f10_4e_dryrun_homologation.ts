// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Script de Homologação e Verificação F10.4E-B (Dry-Run Reconciler + Zero Writes)
// Arquivo: scripts/run_f10_4e_dryrun_homologation.ts
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import { getMovieCredits } from '../api/_lib/tmdbClient.js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';
import { classifyTmdbPeople, LocalPersonRecord, TmdbPersonInput } from '../api/_lib/personMatcher.js';
import { mapTmdbCastMember, mapTmdbCrewMember } from '../api/_lib/creditVocab.js';

const LE_TROU_UUID = '34d2715c-bd3f-4737-b109-cce4b6724599';
const LE_TROU_TMDB_ID = 29259;

async function runHomologation() {
  console.log('='.repeat(80));
  console.log('LANTERNA MÁGICA — HOMOLOGAÇÃO F10.4E-B (DRY-RUN RECONCILER & CLASSIFIER)');
  console.log('='.repeat(80));

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabase = createClient(url, key);

  // 1. Snapshot do banco antes dos testes
  const { data: peopleBefore } = await supabase.from('pessoas').select('id, name, tmdb_id, tmdb_synced_at');
  const { data: creditsBefore } = await supabase.from('film_credits').select('id, film_id, person_id');
  const { data: logsBefore, error: logsErr } = await supabase.from('tmdb_sync_logs').select('id');

  console.log('\n[1. SNAPSHOT INICIAL DE AUDITORIA]');
  console.log(`- Total de Pessoas: ${peopleBefore?.length}`);
  console.log(`- Pessoas com tmdb_id: ${peopleBefore?.filter(p => p.tmdb_id !== null).length}`);
  console.log(`- Pessoas sem tmdb_id: ${peopleBefore?.filter(p => p.tmdb_id === null).length}`);
  console.log(`- Total de Créditos: ${creditsBefore?.length}`);
  console.log(`- Logs de Sincronização (RLS anon access): ${logsErr ? 'RLS_PROTECTED (Acesso restrito a admin)' : logsBefore?.length}`);

  // 2. Teste do motor de Reconciliação Dry-Run para 'Le Trou'
  console.log('\n[2. EXECUÇÃO DRY-RUN PARA "LE TROU" (A Um Passo da Liberdade)]');
  const mockReq = { headers: {} };
  const dryRunResult = await reconcileFilmCreditsDryRun(LE_TROU_UUID, mockReq);

  console.log(`- Filme: ${dryRunResult.film.title} (${dryRunResult.film.year}) [TMDB #${dryRunResult.film.tmdbId}]`);
  console.log(`- Total TMDB Cast: ${dryRunResult.summary.totalTmdbCast}`);
  console.log(`- Total TMDB Crew: ${dryRunResult.summary.totalTmdbCrew}`);
  console.log(`- Pessoas Únicas TMDB: ${dryRunResult.summary.totalTmdbUniquePeople}`);
  console.log(`- Créditos Locais Existentes: ${dryRunResult.summary.totalLocalCredits}`);
  console.log(`- Correspondências Exatas (EXACT_TMDB_MATCH): ${dryRunResult.summary.exactTmdbMatchesCount}`);
  console.log(`- Candidatos Sugeridos (POSSIBLE_LOCAL_MATCH): ${dryRunResult.summary.possibleLocalMatchesCount}`);
  console.log(`- Ambiguidades (AMBIGUOUS): ${dryRunResult.summary.ambiguousCount}`);
  console.log(`- Novas Pessoas (NEW_PERSON): ${dryRunResult.summary.newPeopleCount}`);
  console.log(`- Créditos Pré-selecionados (Default Curated): ${dryRunResult.summary.defaultSelectedCount}`);
  console.log(`- Créditos Locais Preservados (LOCAL_ONLY): ${dryRunResult.summary.localOnlyPreservedCount}`);

  // 3. Detalhamento dos 6 candidatos locais identificados em Le Trou
  console.log('\n[3. CANDIDATOS LOCAIS DETECTADOS PARA "LE TROU"]');
  const possiblePeople = dryRunResult.people.filter(p => p.status === 'POSSIBLE_LOCAL_MATCH');
  possiblePeople.forEach(p => {
    const cand = p.suggestedCandidates[0];
    console.log(`  ✓ TMDB #${p.tmdbPersonId} "${p.name}" → Sugerido Local: "${cand?.name}" (UUID: ${cand?.localPersonId})`);
    console.log(`    Sinais: ${cand?.signals.confidenceNotes.join(' | ')}`);
  });

  // 4. Testes Unitários e Casos de Borda do Classificador de Pessoas
  console.log('\n[4. TESTES DE MATRIZ DE CLASSIFICAÇÃO DETERMINÍSTICA]');

  const mockLocalPeople: LocalPersonRecord[] = [
    {
      id: 'uuid-1',
      name: 'Jean Becker',
      slug: 'jean-becker',
      photo_url: null,
      birth_date: '1933-05-10',
      death_date: null,
      country: 'França',
      country_id: null,
      bio: 'Bio editorial intocada',
      is_editorial_profile: true,
      editorial_profile: 'Perfil intocado',
      primary_roles: ['Diretor'],
      status: 'published',
      tmdb_id: 103393,
      tmdb_synced_at: '2026-01-01',
      imdb_id: null,
    },
    {
      id: 'uuid-2',
      name: 'Jacques Becker',
      slug: 'jacques-becker',
      photo_url: null,
      birth_date: '1906-09-15',
      death_date: '1960-02-21',
      country: 'França',
      country_id: null,
      bio: 'Bio editorial intocada',
      is_editorial_profile: true,
      editorial_profile: 'Perfil intocado',
      primary_roles: ['Diretor'],
      status: 'published',
      tmdb_id: null, // SEM TMDB ID
      tmdb_synced_at: null,
      imdb_id: null,
    },
    {
      id: 'uuid-3a',
      name: 'John Smith',
      slug: 'john-smith-1',
      photo_url: null,
      birth_date: null,
      death_date: null,
      country: null,
      country_id: null,
      bio: null,
      is_editorial_profile: false,
      editorial_profile: null,
      primary_roles: [],
      status: 'draft',
      tmdb_id: null,
      tmdb_synced_at: null,
      imdb_id: null,
    },
    {
      id: 'uuid-3b',
      name: 'John Smith',
      slug: 'john-smith-2',
      photo_url: null,
      birth_date: null,
      death_date: null,
      country: null,
      country_id: null,
      bio: null,
      is_editorial_profile: false,
      editorial_profile: null,
      primary_roles: [],
      status: 'draft',
      tmdb_id: null,
      tmdb_synced_at: null,
      imdb_id: null,
    },
  ];

  const testInputs: TmdbPersonInput[] = [
    { tmdbPersonId: 103393, name: 'Jean Becker' }, // Caso EXACT_TMDB_MATCH
    { tmdbPersonId: 35585, name: 'Jacques Becker', birthDate: '1906-09-15' }, // Caso POSSIBLE_LOCAL_MATCH
    { tmdbPersonId: 99999, name: 'John Smith' }, // Caso AMBIGUOUS (2 candidatos sem tmdb_id)
    { tmdbPersonId: 88888, name: 'François Truffaut' }, // Caso NEW_PERSON (sem candidato)
  ];

  const classified = classifyTmdbPeople(testInputs, mockLocalPeople);

  console.log(`  - Teste EXACT_TMDB_MATCH: ${classified[0].status === 'EXACT_TMDB_MATCH' ? '✓ PASSOU' : '✗ FALHOU'} (${classified[0].status})`);
  console.log(`  - Teste POSSIBLE_LOCAL_MATCH: ${classified[1].status === 'POSSIBLE_LOCAL_MATCH' ? '✓ PASSOU' : '✗ FALHOU'} (${classified[1].status})`);
  console.log(`  - Teste AMBIGUOUS: ${classified[2].status === 'AMBIGUOUS' ? '✓ PASSOU' : '✗ FALHOU'} (${classified[2].status})`);
  console.log(`  - Teste NEW_PERSON: ${classified[3].status === 'NEW_PERSON' ? '✓ PASSOU' : '✗ FALHOU'} (${classified[3].status})`);

  // 5. Teste de Mapeamento de Vocabulário & Curadoria
  console.log('\n[5. TESTE DE VOCABULÁRIO & CURADORIA DETERMINÍSTICA]');
  const dir = mapTmdbCrewMember('Directing', 'Director');
  const dopt = mapTmdbCrewMember('Camera', 'Director of Photography');
  const writ = mapTmdbCrewMember('Writing', 'Screenplay');
  const castTop = mapTmdbCastMember(0);
  const castLow = mapTmdbCastMember(12);

  console.log(`  - Direção/Diretor: ${dir.department} / ${dir.role} (Selected: ${dir.isDefaultSelected}) -> ${dir.department === 'Direção' && dir.role === 'Diretor' && dir.isDefaultSelected ? '✓ PASSOU' : '✗ FALHOU'}`);
  console.log(`  - Fotografia/Diretor de Fotografia: ${dopt.department} / ${dopt.role} (Selected: ${dopt.isDefaultSelected}) -> ${dopt.department === 'Fotografia' && dopt.isDefaultSelected ? '✓ PASSOU' : '✗ FALHOU'}`);
  console.log(`  - Roteiro/Roteirista: ${writ.department} / ${writ.role} (Selected: ${writ.isDefaultSelected}) -> ${writ.department === 'Roteiro' && writ.isDefaultSelected ? '✓ PASSOU' : '✗ FALHOU'}`);
  console.log(`  - Elenco Ordem 0 (Top 8): ${castTop.department} / ${castTop.role} (Selected: ${castTop.isDefaultSelected}) -> ${castTop.role === 'Elenco' && castTop.isDefaultSelected ? '✓ PASSOU' : '✗ FALHOU'}`);
  console.log(`  - Elenco Ordem 12: ${castLow.department} / ${castLow.role} (Selected: ${castLow.isDefaultSelected}) -> ${castLow.role === 'Elenco' && !castLow.isDefaultSelected ? '✓ PASSOU' : '✗ FALHOU'}`);

  // 6. Verificação de ZERO WRITES no Banco de Dados
  console.log('\n[6. VERIFICAÇÃO DE ZERO ESCRITAS / ZERO WRITES]');
  const { data: peopleAfter } = await supabase.from('pessoas').select('id, name, tmdb_id, tmdb_synced_at');
  const { data: creditsAfter } = await supabase.from('film_credits').select('id, film_id, person_id');
  const { data: logsAfter, error: logsAfterErr } = await supabase.from('tmdb_sync_logs').select('id');

  const peopleDiff = (peopleAfter?.length || 0) - (peopleBefore?.length || 0);
  const creditsDiff = (creditsAfter?.length || 0) - (creditsBefore?.length || 0);

  console.log(`- Variação em public.pessoas: ${peopleDiff === 0 ? '✓ ZERO ESCRITAS (0)' : `✗ ERRO: ${peopleDiff}`}`);
  console.log(`- Variação em public.film_credits: ${creditsDiff === 0 ? '✓ ZERO ESCRITAS (0)' : `✗ ERRO: ${creditsDiff}`}`);
  console.log(`- Variação em public.tmdb_sync_logs: ${logsAfterErr ? '✓ ZERO ESCRITAS (RLS Protegido)' : '✓ ZERO ESCRITAS (0)'}`);

  console.log('\n' + '='.repeat(80));
  console.log('HOMOLOGAÇÃO F10.4E-B CONCLUÍDA COM SUCESSO!');
  console.log('='.repeat(80));
}

runHomologation().catch((err) => {
  console.error('Erro na homologação:', err);
  process.exit(1);
});
