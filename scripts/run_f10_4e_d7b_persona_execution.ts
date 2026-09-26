// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Execução e Auditoria do Segundo Piloto Real Controlado: Persona (TMDB #797)
// Arquivo: scripts/run_f10_4e_d7b_persona_execution.ts
// ==============================================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { reconcileFilmCreditsDryRun } from '../api/_lib/creditReconciler.js';
import { executeCreditsSync, buildCreditsSyncPayload } from '../api/_lib/creditExecutionBuilder.js';
import { checkStorageObjectExists } from '../api/_lib/storageImageService.js';

const PERSONA_UUID = '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a';
const PERSONA_TMDB_ID = 797;

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runPersonaExecution() {
  console.log('='.repeat(80));
  console.log('F10.4E-D7B: EXECUÇÃO DO SEGUNDO PILOTO REAL CONTROLADO — PERSONA');
  console.log('='.repeat(80) + '\n');

  // --------------------------------------------------------------------------
  // 1. REVALIDAÇÃO PRÉ-WRITE
  // --------------------------------------------------------------------------
  console.log('--- 1. REVALIDAÇÃO IMEDIATA PRÉ-WRITE ---');
  const { data: personaFilm, error: filmErr } = await supabase
    .from('filmes')
    .select('*')
    .eq('id', PERSONA_UUID)
    .single();

  if (filmErr || !personaFilm) {
    throw new Error(`Filme Persona não encontrado: ${filmErr?.message}`);
  }

  console.log(`  • Filme: ${personaFilm.title} (${personaFilm.year})`);
  console.log(`  • UUID: ${personaFilm.id}`);
  console.log(`  • TMDB ID: ${personaFilm.tmdb_id}`);
  console.log(`  • Updated At: ${personaFilm.updated_at}`);

  if (personaFilm.tmdb_id !== PERSONA_TMDB_ID) {
    throw new Error(`TMDB ID divergente: esperado ${PERSONA_TMDB_ID}, encontrado ${personaFilm.tmdb_id}`);
  }

  // Snapshot global ANTES
  const { count: filmsBefore } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { data: peopleBeforeList } = await supabase.from('pessoas').select('id, tmdb_id');
  const peopleBefore = peopleBeforeList?.length || 0;
  const peopleWithTmdbBefore = peopleBeforeList?.filter(p => p.tmdb_id && p.tmdb_id > 0).length || 0;
  const { count: creditsBefore } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });
  const { count: logsBefore } = await supabase.from('tmdb_sync_logs').select('*', { count: 'exact', head: true });
  const { data: personaCreditsBeforeList } = await supabase.from('film_credits').select('id').eq('film_id', PERSONA_UUID);
  const personaCreditsBefore = personaCreditsBeforeList?.length || 0;

  console.log('\n  Snapshot ANTES do Write:');
  console.log(`    - Filmes: ${filmsBefore}`);
  console.log(`    - Pessoas: ${peopleBefore} (com TMDB ID: ${peopleWithTmdbBefore})`);
  console.log(`    - Film Credits Total: ${creditsBefore}`);
  console.log(`    - Film Credits Persona: ${personaCreditsBefore}`);
  console.log(`    - TMDB Sync Logs: ${logsBefore}`);

  // Reconciliação fresca
  const reconcileRes = await reconcileFilmCreditsDryRun(PERSONA_UUID, { headers: {} });
  const baseUpdatedAt = reconcileRes.baseUpdatedAt;

  const defaultSelectedCredits = reconcileRes.credits.filter(c => c.isDefaultSelected);
  console.log(`\n  • Créditos selecionados para sincronização: ${defaultSelectedCredits.length}`);

  const selectedPersonIds = new Set(defaultSelectedCredits.map(c => c.tmdbPersonId).filter(Boolean));
  const involvedPeople = reconcileRes.people.filter(p => selectedPersonIds.has(p.tmdbPersonId));

  const personDecisions = involvedPeople.map(p => {
    if (p.status === 'EXACT_TMDB_MATCH' && p.matchedLocalPersonId) {
      return {
        tmdbPersonId: p.tmdbPersonId,
        action: 'LINK_EXISTING' as const,
        localPersonId: p.matchedLocalPersonId,
      };
    }
    if (p.status === 'POSSIBLE_LOCAL_MATCH' && p.suggestedCandidates?.length === 1) {
      return {
        tmdbPersonId: p.tmdbPersonId,
        action: 'LINK_EXISTING' as const,
        localPersonId: p.suggestedCandidates[0].localPersonId,
      };
    }
    return {
      tmdbPersonId: p.tmdbPersonId,
      action: 'CREATE_NEW' as const,
    };
  });

  console.log(`  • Decisões de pessoas formatadas: ${personDecisions.length}`);

  // --------------------------------------------------------------------------
  // 2. EXECUÇÃO REAL CONTROLADA
  // --------------------------------------------------------------------------
  console.log('\n--- 2. EXECUTANDO SINCRONIZAÇÃO REAL VIA executeCreditsSync (dryRun: false) ---');

  // Mock de request com autenticação administrativa
  const mockReq = {
    user: { id: '00000000-0000-0000-0000-000000000001' },
    headers: {},
  };

  const syncResult = await executeCreditsSync(
    {
      filmId: PERSONA_UUID,
      baseUpdatedAt,
      selectedCredits: defaultSelectedCredits.map(c => c.id),
      personDecisions,
      dryRun: false,
      confirmExecution: true,
    },
    mockReq
  );

  console.log('\n  Resultado da Execução:');
  console.log(JSON.stringify(syncResult, null, 2));

  if (!syncResult.success) {
    throw new Error(`Falha na execução: ${syncResult.message || 'Erro desconhecido'}`);
  }

  // --------------------------------------------------------------------------
  // 3. AUDITORIA IMEDIATA PÓS-WRITE
  // --------------------------------------------------------------------------
  console.log('\n--- 3. AUDITORIA IMEDIATA PÓS-WRITE ---');
  const { count: filmsAfter } = await supabase.from('filmes').select('*', { count: 'exact', head: true });
  const { data: peopleAfterList } = await supabase.from('pessoas').select('id, tmdb_id, name, slug, status, is_editorial_profile, primary_roles, photo_url');
  const peopleAfter = peopleAfterList?.length || 0;
  const peopleWithTmdbAfter = peopleAfterList?.filter(p => p.tmdb_id && p.tmdb_id > 0).length || 0;
  const { count: creditsAfter } = await supabase.from('film_credits').select('*', { count: 'exact', head: true });
  const { count: logsAfter } = await supabase.from('tmdb_sync_logs').select('*', { count: 'exact', head: true });
  const { data: personaCreditsAfterList } = await supabase
    .from('film_credits')
    .select('id, film_id, person_id, fallback_person_name, department, role, character_name, order_index, pessoas:person_id(id, name, slug, tmdb_id)')
    .eq('film_id', PERSONA_UUID)
    .order('order_index');
  const personaCreditsAfter = personaCreditsAfterList?.length || 0;

  console.log('\n  Snapshot DEPOIS do Write:');
  console.log(`    - Filmes: ${filmsAfter} (Delta: ${Number(filmsAfter) - Number(filmsBefore)})`);
  console.log(`    - Pessoas: ${peopleAfter} (Delta: ${peopleAfter - peopleBefore})`);
  console.log(`    - Pessoas com TMDB ID: ${peopleWithTmdbAfter} (Delta: ${peopleWithTmdbAfter - peopleWithTmdbBefore})`);
  console.log(`    - Film Credits Total: ${creditsAfter} (Delta: ${Number(creditsAfter) - Number(creditsBefore)})`);
  console.log(`    - Film Credits Persona: ${personaCreditsAfter} (Delta: ${personaCreditsAfter - personaCreditsBefore})`);
  console.log(`    - TMDB Sync Logs: ${logsAfter} (Delta: ${Number(logsAfter) - Number(logsBefore)})`);

  // --------------------------------------------------------------------------
  // 4. AUDITORIA DAS 4 NOVAS PESSOAS
  // --------------------------------------------------------------------------
  console.log('\n--- 4. AUDITORIA DAS 4 NOVAS PESSOAS CRIADAS ---');
  const newTmdbIds = [6340224, 11904, 11905, 11906];
  for (const tid of newTmdbIds) {
    const person = peopleAfterList?.find(p => p.tmdb_id === tid);
    if (!person) {
      console.error(`  ❌ Pessoa TMDB #${tid} não encontrada no banco!`);
    } else {
      console.log(`  ✅ [NEW_PERSON] ${person.name} (UUID: ${person.id})`);
      console.log(`     - TMDB ID: ${person.tmdb_id}`);
      console.log(`     - Slug: ${person.slug}`);
      console.log(`     - Status: ${person.status} (is_editorial_profile: ${person.is_editorial_profile})`);
      console.log(`     - Primary Roles: ${JSON.stringify(person.primary_roles)}`);
      console.log(`     - Photo URL: ${person.photo_url || 'null'}`);
    }
  }

  // --------------------------------------------------------------------------
  // 5. AUDITORIA DO STORAGE
  // --------------------------------------------------------------------------
  console.log('\n--- 5. AUDITORIA DO STORAGE PARA FOTOS ---');
  const svenStorage = await checkStorageObjectExists(supabase, 'people/tmdb-11905/profile.webp');
  const ullaStorage = await checkStorageObjectExists(supabase, 'people/tmdb-11906/profile.webp');
  console.log(`  • Sven Nykvist (tmdb-11905): ${svenStorage ? '✅ PRESENT' : '⚠️ NOT_PRESENT (ou RLS proxy/null)'}`);
  console.log(`  • Ulla Ryghe (tmdb-11906): ${ullaStorage ? '✅ PRESENT' : '⚠️ NOT_PRESENT (ou RLS proxy/null)'}`);

  // --------------------------------------------------------------------------
  // 6. AUDITORIA DOS 14 CRÉDITOS DE PERSONA
  // --------------------------------------------------------------------------
  console.log('\n--- 6. LISTA DOS 14 CRÉDITOS FINAIS DE PERSONA ---');
  personaCreditsAfterList?.forEach((c: any, idx: number) => {
    console.log(`  [${idx + 1}] ID: ${c.id}`);
    console.log(`      Pessoa: ${c.pessoas?.name || c.fallback_person_name} (UUID: ${c.person_id}, TMDB ID: ${c.pessoas?.tmdb_id})`);
    console.log(`      Depto: ${c.department} | Função: ${c.role} | Personagem: ${c.character_name || '-'}`);
  });

  // --------------------------------------------------------------------------
  // 7. AUDITORIA DOS RECENTES TMDB SYNC LOGS
  // --------------------------------------------------------------------------
  console.log('\n--- 7. LOGS DE SINCRONIZAÇÃO GERADOS (ÚLTIMOS 5) ---');
  const { data: recentLogs } = await supabase
    .from('tmdb_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  recentLogs?.slice(0, 5).forEach((l, idx) => {
    console.log(`  [Log ${idx + 1}] ID: ${l.id} | Type: ${l.sync_type} | Action: ${l.action} | Entity: ${l.entity_type} (ID: ${l.entity_id}, TMDB: ${l.tmdb_id}) | Success: ${l.success} | Created: ${l.created_at}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('F10.4E-D7B: PILOTO REAL DE PERSONA EXECUTADO E AUDITADO COM SUCESSO');
  console.log('='.repeat(80));
}

runPersonaExecution().catch(err => {
  console.error('ERRO FATAL NA EXECUÇÃO DE PERSONA:', err);
  process.exit(1);
});
