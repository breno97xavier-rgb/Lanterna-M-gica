// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Motor Server-Side de Reconciliação Read-Only (Dry-Run) de Créditos e Pessoas TMDB
// Arquivo: api/_lib/creditReconciler.ts
//
// Regras Fundamentais:
// 1. Estritamente READ-ONLY (Zero Writes, Zero Storage Uploads).
// 2. TMDB é consultado diretamente pelo servidor (Anti-Forgery).
// 3. Classificação determinística em 4 estados (EXACT, POSSIBLE, AMBIGUOUS, NEW).
// 4. Mapeamento de vocabulário e curadoria default transparentes.
// 5. Créditos locais existentes são integralmente preservados (LOCAL_ONLY_CREDITS).
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getMovieCredits } from './tmdbClient.js';
import { classifyTmdbPeople, LocalPersonRecord, LocalCreditRecord, TmdbPersonInput } from './personMatcher.js';
import { mapTmdbCastMember, mapTmdbCrewMember, normalizeCharacterNameForMatching } from './creditVocab.js';
import { AppError } from './errors.js';
import type {
  CreditsReconcileResponse,
  ReconciledCreditItem,
  LocalOnlyCreditItem,
  CreditsReconcileSummary,
  ReconciledPerson,
  LocalCreditComparisonStatus,
} from './types.js';

function getServerSupabaseClient(req: any): SupabaseClient {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const keyToUse = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();

  const authHeader = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!url || !keyToUse) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Credenciais do Supabase não configuradas no servidor.');
  }

  return createClient(url, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

/**
 * Interface auxiliar para resultado da comparação semântica de crédito
 */
interface LocalCreditMatchResult {
  matchedCredit: LocalCreditRecord | null;
  localCreditComparisonStatus: LocalCreditComparisonStatus;
  semanticEquivalenceReason: string | null;
}

/**
 * Motor de Equivalência Semântica de Créditos (F10.4E-C2B)
 *
 * Regras Canônicas:
 * 1. Para ELENCO:
 *    - Mesmo film_id;
 *    - Mesma pessoa local resolvida;
 *    - department = 'Elenco' (ou legado 'Acting');
 *    - Personagem correspondente via normalização conservadora (trim, case-insensitive, espaços e barras);
 *    - Roles locais 'Ator', 'Atriz' ou 'Elenco' são PRESERVADOS como legado editorial.
 *    - Se idêntico em tudo -> EXACT_LOCAL_CREDIT.
 *    - Se compatível mas com diferença de role (Ator vs Elenco) ou formatação -> SEMANTIC_LOCAL_CREDIT.
 *
 * 2. Para EQUIPE TÉCNICA:
 *    - Mesmo film_id;
 *    - Mesma pessoa local resolvida;
 *    - Mesmo departamento canônico;
 *    - Role compatível (Diretor vs Direção, Fotografia vs Diretor de Fotografia, etc.);
 *    - Não confunde mesma pessoa com mesmo crédito (uma pessoa pode ter créditos adicionais legítimos).
 */
export function matchLocalCreditSemantically(
  targetLocalPersonId: string | null,
  tmdbDepartment: string,
  tmdbRole: string | null,
  tmdbCharacterName: string | null,
  isCast: boolean,
  localCredits: LocalCreditRecord[],
  matchedLocalCreditIds: Set<string>
): LocalCreditMatchResult {
  if (!targetLocalPersonId) {
    return {
      matchedCredit: null,
      localCreditComparisonStatus: 'NEW_CREDIT',
      semanticEquivalenceReason: null,
    };
  }

  // Filtrar apenas créditos da pessoa ainda não mapeados para outro crédito TMDB
  const candidateCredits = localCredits.filter(
    (lc) => lc.person_id === targetLocalPersonId && !matchedLocalCreditIds.has(lc.id)
  );

  if (candidateCredits.length === 0) {
    return {
      matchedCredit: null,
      localCreditComparisonStatus: 'NEW_CREDIT',
      semanticEquivalenceReason: null,
    };
  }

  if (isCast) {
    const normTmdbChar = normalizeCharacterNameForMatching(tmdbCharacterName);

    for (const lc of candidateCredits) {
      const isCastDept =
        lc.department.toLowerCase().includes('elenco') ||
        lc.department.toLowerCase().includes('acting');

      if (!isCastDept) continue;

      const normLocalChar = normalizeCharacterNameForMatching(lc.character_name);

      // Correspondência de personagem (ou ambos sem personagem definido)
      if (normTmdbChar === normLocalChar) {
        const isExactDept = lc.department === tmdbDepartment;
        const isExactRole = (lc.role || '') === (tmdbRole || '');
        const isExactChar = (lc.character_name || '') === (tmdbCharacterName || '');

        if (isExactDept && isExactRole && isExactChar) {
          return {
            matchedCredit: lc,
            localCreditComparisonStatus: 'EXACT_LOCAL_CREDIT',
            semanticEquivalenceReason: `Crédito idêntico já cadastrado no acervo (${lc.department} / ${lc.role || 'Elenco'} / ${lc.character_name || 'Sem personagem'})`,
          };
        } else {
          return {
            matchedCredit: lc,
            localCreditComparisonStatus: 'SEMANTIC_LOCAL_CREDIT',
            semanticEquivalenceReason: `Já cadastrado no acervo como ${lc.role || 'Elenco'}${lc.character_name ? ` (${lc.character_name})` : ''} — identidade editorial local preservada`,
          };
        }
      }
    }

    return {
      matchedCredit: null,
      localCreditComparisonStatus: 'NEW_CREDIT',
      semanticEquivalenceReason: null,
    };
  } else {
    // Equipe Técnica
    const normTmdbDept = tmdbDepartment.toLowerCase().trim();
    const normTmdbRole = (tmdbRole || '').toLowerCase().trim();

    for (const lc of candidateCredits) {
      const normLocalDept = lc.department.toLowerCase().trim();
      const normLocalRole = (lc.role || '').toLowerCase().trim();

      // Direção
      if (normTmdbDept === 'direção' && normLocalDept === 'direção') {
        const isDirectingRole =
          normLocalRole === 'diretor' ||
          normLocalRole === 'direção' ||
          normLocalRole === normTmdbRole;
        if (isDirectingRole) {
          const isExact =
            lc.department === tmdbDepartment &&
            (lc.role || '') === (tmdbRole || '');
          return {
            matchedCredit: lc,
            localCreditComparisonStatus: isExact ? 'EXACT_LOCAL_CREDIT' : 'SEMANTIC_LOCAL_CREDIT',
            semanticEquivalenceReason: isExact
              ? `Crédito de Direção idêntico já existente (${lc.department} / ${lc.role})`
              : `Já cadastrado no acervo como ${lc.department} / ${lc.role} — preservado`,
          };
        }
      }

      // Outros departamentos técnicos (Fotografia, Roteiro, Montagem, Som, Arte, Produção, Trilha Sonora)
      if (normTmdbDept === normLocalDept) {
        const isRoleCompatible =
          normLocalRole === normTmdbRole ||
          normLocalRole === normTmdbDept ||
          (normTmdbRole === 'roteirista' && (normLocalRole === 'roteiro' || normLocalRole === 'autor' || normLocalRole === 'roteirista')) ||
          (normTmdbRole === 'diretor de fotografia' && (normLocalRole === 'fotografia' || normLocalRole === 'cinematógrafo' || normLocalRole === 'diretor de fotografia'));

        if (isRoleCompatible) {
          const isExact =
            lc.department === tmdbDepartment &&
            (lc.role || '') === (tmdbRole || '');
          return {
            matchedCredit: lc,
            localCreditComparisonStatus: isExact ? 'EXACT_LOCAL_CREDIT' : 'SEMANTIC_LOCAL_CREDIT',
            semanticEquivalenceReason: isExact
              ? `Crédito de ${lc.department} idêntico já existente`
              : `Já cadastrado no acervo como ${lc.department} / ${lc.role || lc.department} — preservado`,
          };
        }
      }
    }

    return {
      matchedCredit: null,
      localCreditComparisonStatus: 'NEW_CREDIT',
      semanticEquivalenceReason: null,
    };
  }
}

/**
 * Executa reconciliação completa em modo Dry-Run (Read-Only)
 */
export async function reconcileFilmCreditsDryRun(
  filmId: string,
  req: any
): Promise<CreditsReconcileResponse> {
  const cleanFilmId = (filmId || '').trim();
  if (!cleanFilmId) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador filmId é obrigatório.');
  }

  const supabase = getServerSupabaseClient(req);

  // 1. Carregar filme local pelo UUID
  const { data: localFilm, error: filmError } = await supabase
    .from('filmes')
    .select('id, title, original_title, year, slug, tmdb_id, status, updated_at, created_at')
    .eq('id', cleanFilmId)
    .maybeSingle();

  if (filmError) {
    console.error('[CreditReconciler] Erro ao buscar filme no banco:', filmError);
    throw new AppError(500, 'INTERNAL_ERROR', 'Erro ao consultar dados do filme no banco de dados.');
  }

  if (!localFilm) {
    throw new AppError(404, 'NOT_FOUND', `Filme com ID "${cleanFilmId}" não encontrado no acervo.`);
  }

  if (!localFilm.tmdb_id || localFilm.tmdb_id <= 0) {
    throw new AppError(
      400,
      'INVALID_PARAMS',
      `O filme "${localFilm.title}" (${localFilm.year}) não possui vínculo com TMDB (tmdb_id é nulo). Vincule o filme antes de reconciliar créditos.`
    );
  }

  // 2. Buscar créditos do TMDB diretamente server-side
  const tmdbCredits = await getMovieCredits(localFilm.tmdb_id);
  const tmdbCast = tmdbCredits.cast || [];
  const tmdbCrew = tmdbCredits.crew || [];

  // 3. Consultar base de pessoas locais
  const { data: localPeopleData, error: peopleError } = await supabase
    .from('pessoas')
    .select('id, name, slug, photo_url, birth_date, death_date, country, country_id, bio, is_editorial_profile, editorial_profile, primary_roles, status, tmdb_id, tmdb_synced_at, imdb_id');

  if (peopleError) {
    console.error('[CreditReconciler] Erro ao buscar pessoas locais:', peopleError);
    throw new AppError(500, 'INTERNAL_ERROR', 'Erro ao carregar catálogo de pessoas.');
  }

  const localPeople: LocalPersonRecord[] = (localPeopleData || []) as LocalPersonRecord[];

  // 4. Consultar créditos locais atuais deste filme
  const { data: localCreditsData, error: creditsError } = await supabase
    .from('film_credits')
    .select('id, film_id, person_id, fallback_person_name, department, role, character_name, order_index')
    .eq('film_id', cleanFilmId)
    .order('order_index');

  if (creditsError) {
    console.error('[CreditReconciler] Erro ao buscar créditos locais:', creditsError);
    throw new AppError(500, 'INTERNAL_ERROR', 'Erro ao carregar créditos locais do filme.');
  }

  const localCredits: LocalCreditRecord[] = (localCreditsData || []) as LocalCreditRecord[];

  // 5. Coletar todas as pessoas únicas do TMDB para classificação
  const tmdbPeopleInputs: TmdbPersonInput[] = [];

  tmdbCast.forEach((c) => {
    tmdbPeopleInputs.push({
      tmdbPersonId: c.tmdbPersonId,
      name: c.name,
      originalName: c.originalName,
      profilePath: c.profilePath,
      profileUrl: c.profileUrl,
      knownForDepartment: 'Acting',
    });
  });

  tmdbCrew.forEach((c) => {
    tmdbPeopleInputs.push({
      tmdbPersonId: c.tmdbPersonId,
      name: c.name,
      originalName: c.originalName,
      profilePath: c.profilePath,
      profileUrl: c.profileUrl,
      knownForDepartment: c.department,
    });
  });

  // 6. Executar classificação determinística de pessoas
  const reconciledPeople = classifyTmdbPeople(tmdbPeopleInputs, localPeople, localCredits);
  const personByTmdbId = new Map<number, ReconciledPerson>();
  reconciledPeople.forEach((p) => personByTmdbId.set(p.tmdbPersonId, p));

  // 7. Mapear pessoas locais para referência rápida
  const localPersonById = new Map<string, LocalPersonRecord>();
  localPeople.forEach((p) => localPersonById.set(p.id, p));

  // 8. Construir itens de créditos reconciliados (TMDB) com classificação semântica estrita
  const matchedLocalCreditIds = new Set<string>();
  const reconciledCreditItems: ReconciledCreditItem[] = [];

  // 8.A: Processar Elenco (Cast)
  tmdbCast.forEach((c, index) => {
    const personInfo = personByTmdbId.get(c.tmdbPersonId);
    const vocab = mapTmdbCastMember(c.order);

    const targetLocalPersonId =
      personInfo?.matchedLocalPersonId ||
      (personInfo?.suggestedCandidates && personInfo.suggestedCandidates.length === 1
        ? personInfo.suggestedCandidates[0].localPersonId
        : null);

    // Comparação semântica contra créditos locais existentes
    const matchResult = matchLocalCreditSemantically(
      targetLocalPersonId,
      vocab.department,
      vocab.role,
      c.character || null,
      true,
      localCredits,
      matchedLocalCreditIds
    );

    let legacyComparisonStatus: ReconciledCreditItem['creditComparisonStatus'] = 'NEW_CREDIT_NEW_PERSON';

    if (matchResult.matchedCredit) {
      matchedLocalCreditIds.add(matchResult.matchedCredit.id);
      legacyComparisonStatus =
        matchResult.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT'
          ? 'EXACT_LOCAL_MATCH'
          : 'SEMANTIC_LOCAL_MATCH';
    } else if (personInfo?.status === 'EXACT_TMDB_MATCH') {
      legacyComparisonStatus = 'NEW_CREDIT_EXISTING_PERSON';
    } else if (personInfo?.status === 'POSSIBLE_LOCAL_MATCH') {
      legacyComparisonStatus = 'NEW_CREDIT_POSSIBLE_PERSON';
    } else if (personInfo?.status === 'AMBIGUOUS') {
      legacyComparisonStatus = 'NEW_CREDIT_AMBIGUOUS_PERSON';
    } else {
      legacyComparisonStatus = 'NEW_CREDIT_NEW_PERSON';
    }

    reconciledCreditItems.push({
      id: c.creditId ? `cast:${c.creditId}` : `tmdb-cast-${c.tmdbPersonId}-${index}`,
      source: 'TMDB',
      tmdbPersonId: c.tmdbPersonId,
      personId: personInfo?.matchedLocalPersonId || null,
      personName: c.name,
      personPhotoUrl: c.profileUrl || null,
      personMatchStatus: personInfo?.status || 'NEW_PERSON',
      suggestedLocalPersonId: targetLocalPersonId,
      department: vocab.department,
      role: vocab.role,
      characterName: c.character || null,
      orderIndex: c.order,
      isDefaultSelected: vocab.isDefaultSelected,
      isCast: true,
      localCreditComparisonStatus: matchResult.localCreditComparisonStatus,
      localCreditId: matchResult.matchedCredit?.id || null,
      localDepartment: matchResult.matchedCredit?.department || null,
      localRole: matchResult.matchedCredit?.role || null,
      localCharacterName: matchResult.matchedCredit?.character_name || null,
      localOrderIndex: matchResult.matchedCredit !== null && matchResult.matchedCredit !== undefined ? matchResult.matchedCredit.order_index : null,
      semanticEquivalenceReason: matchResult.semanticEquivalenceReason,
      creditComparisonStatus: legacyComparisonStatus,
      existingLocalCreditId: matchResult.matchedCredit?.id || null,
    });
  });

  // 8.B: Processar Equipe Técnica (Crew)
  tmdbCrew.forEach((c, index) => {
    const personInfo = personByTmdbId.get(c.tmdbPersonId);
    const vocab = mapTmdbCrewMember(c.department, c.job);

    const targetLocalPersonId =
      personInfo?.matchedLocalPersonId ||
      (personInfo?.suggestedCandidates && personInfo.suggestedCandidates.length === 1
        ? personInfo.suggestedCandidates[0].localPersonId
        : null);

    // Comparação semântica contra créditos locais existentes
    const matchResult = matchLocalCreditSemantically(
      targetLocalPersonId,
      vocab.department,
      vocab.role,
      null,
      false,
      localCredits,
      matchedLocalCreditIds
    );

    let legacyComparisonStatus: ReconciledCreditItem['creditComparisonStatus'] = 'NEW_CREDIT_NEW_PERSON';

    if (matchResult.matchedCredit) {
      matchedLocalCreditIds.add(matchResult.matchedCredit.id);
      legacyComparisonStatus =
        matchResult.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT'
          ? 'EXACT_LOCAL_MATCH'
          : 'SEMANTIC_LOCAL_MATCH';
    } else if (personInfo?.status === 'EXACT_TMDB_MATCH') {
      legacyComparisonStatus = 'NEW_CREDIT_EXISTING_PERSON';
    } else if (personInfo?.status === 'POSSIBLE_LOCAL_MATCH') {
      legacyComparisonStatus = 'NEW_CREDIT_POSSIBLE_PERSON';
    } else if (personInfo?.status === 'AMBIGUOUS') {
      legacyComparisonStatus = 'NEW_CREDIT_AMBIGUOUS_PERSON';
    } else {
      legacyComparisonStatus = 'NEW_CREDIT_NEW_PERSON';
    }

    reconciledCreditItems.push({
      id: c.creditId ? `crew:${c.creditId}` : `tmdb-crew-${c.tmdbPersonId}-${index}`,
      source: 'TMDB',
      tmdbPersonId: c.tmdbPersonId,
      personId: personInfo?.matchedLocalPersonId || null,
      personName: c.name,
      personPhotoUrl: c.profileUrl || null,
      personMatchStatus: personInfo?.status || 'NEW_PERSON',
      suggestedLocalPersonId: targetLocalPersonId,
      department: vocab.department,
      role: vocab.role,
      characterName: null,
      orderIndex: vocab.priorityOrder,
      isDefaultSelected: vocab.isDefaultSelected,
      isCast: false,
      localCreditComparisonStatus: matchResult.localCreditComparisonStatus,
      localCreditId: matchResult.matchedCredit?.id || null,
      localDepartment: matchResult.matchedCredit?.department || null,
      localRole: matchResult.matchedCredit?.role || null,
      localCharacterName: matchResult.matchedCredit?.character_name || null,
      localOrderIndex: matchResult.matchedCredit !== null && matchResult.matchedCredit !== undefined ? matchResult.matchedCredit.order_index : null,
      semanticEquivalenceReason: matchResult.semanticEquivalenceReason,
      creditComparisonStatus: legacyComparisonStatus,
      existingLocalCreditId: matchResult.matchedCredit?.id || null,
    });
  });

  // 9. Identificar créditos estritamente locais não contemplados no TMDB (LOCAL_ONLY_CREDITS)
  const localOnlyCredits: LocalOnlyCreditItem[] = [];

  localCredits.forEach((lc) => {
    if (!matchedLocalCreditIds.has(lc.id)) {
      const p = lc.person_id ? localPersonById.get(lc.person_id) : null;
      localOnlyCredits.push({
        localCreditId: lc.id,
        personId: lc.person_id,
        personName: p ? p.name : lc.fallback_person_name || 'Profissional não identificado',
        personSlug: p ? p.slug : null,
        personPhotoUrl: p ? p.photo_url : null,
        department: lc.department,
        role: lc.role,
        characterName: lc.character_name,
        orderIndex: lc.order_index,
        statusText: 'PRESERVADO — crédito local sem equivalente selecionado no TMDB',
      });
    }
  });

  // 10. Computar sumário estatístico detalhado
  const exactCount = reconciledPeople.filter((p) => p.status === 'EXACT_TMDB_MATCH').length;
  const possibleCount = reconciledPeople.filter((p) => p.status === 'POSSIBLE_LOCAL_MATCH').length;
  const ambiguousCount = reconciledPeople.filter((p) => p.status === 'AMBIGUOUS').length;
  const newPeopleCount = reconciledPeople.filter((p) => p.status === 'NEW_PERSON').length;
  const defaultSelectedCount = reconciledCreditItems.filter((c) => c.isDefaultSelected).length;

  const exactLocalCreditsCount = reconciledCreditItems.filter(
    (c) => c.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT'
  ).length;
  const semanticLocalCreditsCount = reconciledCreditItems.filter(
    (c) => c.localCreditComparisonStatus === 'SEMANTIC_LOCAL_CREDIT'
  ).length;
  const newCreditsCount = reconciledCreditItems.filter(
    (c) => c.localCreditComparisonStatus === 'NEW_CREDIT'
  ).length;

  const summary: CreditsReconcileSummary = {
    totalTmdbCrew: tmdbCrew.length,
    totalTmdbCast: tmdbCast.length,
    totalTmdbUniquePeople: reconciledPeople.length,
    totalLocalCredits: localCredits.length,
    exactTmdbMatchesCount: exactCount,
    possibleLocalMatchesCount: possibleCount,
    ambiguousCount,
    newPeopleCount,
    defaultSelectedCount,
    localOnlyPreservedCount: localOnlyCredits.length,
    exactLocalCreditsCount,
    semanticLocalCreditsCount,
    newCreditsCount,
  };

  const baseUpdatedAt = (localFilm as any).updated_at || (localFilm as any).created_at || null;

  return {
    film: {
      id: localFilm.id,
      title: localFilm.title,
      originalTitle: localFilm.original_title,
      year: localFilm.year,
      slug: localFilm.slug,
      tmdbId: localFilm.tmdb_id,
      status: localFilm.status,
      updatedAt: baseUpdatedAt,
      updated_at: baseUpdatedAt,
    },
    baseUpdatedAt,
    summary,
    people: reconciledPeople,
    credits: reconciledCreditItems,
    localOnlyCredits,
  };
}
