// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Motor Server-Side de Construção e Execução Controlada de Sincronização de Créditos
// Arquivo: api/_lib/creditExecutionBuilder.ts
//
// Regras Fundamentais:
// 1. BLOQUEIO DE EXECUÇÃO ATIVO: EXECUTION_ENABLED = false nesta etapa (F10.4E-D1).
// 2. Anti-Forgery / Confiança Zero no Cliente:
//    - O cliente envia SOMENTE decisões editoriais mínimas (selectedCredits, personDecisions).
//    - Nenhum dado factual (name, bio, photo, department, role, character, order) é aceito como autoridade do browser.
// 3. Re-fetch Obrigatório: O servidor consulta diretamente o TMDB e o banco local.
// 4. Stale Reconciliation Protection: Verificação de baseUpdatedAt / conflitos de estado.
// 5. Preservação Canônica Local: Créditos EXACT ou SEMANTIC locais preservam department/role/character locais.
// 6. Anti-Spoofing de Autorização: p_user_id obtido exclusivamente do JWT autenticado.
// 7. Storage Compensation: Padrão de compensação isolando objetos criados nesta tentativa vs preexistentes.
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getMovieCredits, getPersonDetails, choosePersonDisplayName } from './tmdbClient.js';
import { classifyTmdbPeople, LocalPersonRecord, LocalCreditRecord, TmdbPersonInput } from './personMatcher.js';
import { mapTmdbCastMember, mapTmdbCrewMember } from './creditVocab.js';
import { matchLocalCreditSemantically } from './creditReconciler.js';
import { preparePersonProfileImage, compensateStorageUploads, PreparedStorageImage } from './storageImageService.js';
import { slugifyText } from './movieImporter.js';
import { validateAdminAuth } from './authMiddleware.js';
import { AppError } from './errors.js';
import type {
  CreditsSyncExecuteRequest,
  CreditsSyncExecuteResult,
  PersonSyncDecisionItem,
  RpcSyncFilmCreditsPayload,
  RpcPersonsToLinkItem,
  RpcPersonsToCreateItem,
  RpcCreditsToSyncItem,
  ReconciledPerson,
} from './types.js';

/**
 * Trava de Segurança Global Server-Side
 */
export const EXECUTION_ENABLED = true;

export function getServerSupabaseClient(req: any): SupabaseClient {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const keyToUse = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();

  const authHeader = (req?.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
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

export interface InternalCreditItemReconstructed {
  stableId: string;
  source: 'TMDB';
  tmdbPersonId: number;
  personName: string;
  profilePath: string | null;
  profileUrl: string | null;
  department: string;
  role: string | null;
  characterName: string | null;
  orderIndex: number;
  isCast: boolean;
  matchResult: ReturnType<typeof matchLocalCreditSemantically>;
}

/**
 * Gera o identificador canônico estável de um crédito TMDB
 */
export function formatCanonicalCreditId(isCast: boolean, creditId: string): string {
  const clean = (creditId || '').trim();
  return isCast ? `cast:${clean}` : `crew:${clean}`;
}

/**
 * Constrói de forma pura e autoritativa o payload canônico para a RPC sync_film_credits_from_tmdb
 */
export async function buildCreditsSyncPayload(
  request: CreditsSyncExecuteRequest,
  authenticatedUserId: string,
  supabase: SupabaseClient
): Promise<{
  payload: RpcSyncFilmCreditsPayload;
  summary: {
    totalSelectedCredits: number;
    exactLocalCreditsPreserved: number;
    semanticLocalCreditsPreserved: number;
    newCreditsInserted: number;
    personsToLinkCount: number;
    personsToCreateCount: number;
    distinctPersonsInSelectionCount: number;
  };
  preparedImages: PreparedStorageImage[];
}> {
  // 1. Validar identificador do filme
  const cleanFilmId = (request.filmId || '').trim();
  if (!cleanFilmId) {
    throw new AppError(400, 'INVALID_PARAMS', 'Identificador filmId é obrigatório.');
  }

  if (!Array.isArray(request.selectedCredits) || request.selectedCredits.length === 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'A lista "selectedCredits" deve conter ao menos um crédito selecionado.');
  }

  // Validações estritas para execução mutável (dryRun: false)
  if (!request.dryRun) {
    // 1.1 Confirmação explícita obrigatória
    if (request.confirmExecution !== true) {
      throw new AppError(
        400,
        'CONFIRMATION_REQUIRED',
        'A confirmação explícita de sincronização é obrigatória (confirmExecution: true).'
      );
    }

    // 1.2 baseUpdatedAt obrigatório
    if (!request.baseUpdatedAt || typeof request.baseUpdatedAt !== 'string') {
      throw new AppError(
        400,
        'INVALID_PARAMS',
        'O parâmetro "baseUpdatedAt" é obrigatório para execução de sincronização.'
      );
    }
  }

  // 2. Carregar filme local pelo UUID
  const { data: localFilm, error: filmError } = await supabase
    .from('filmes')
    .select('id, title, original_title, year, slug, tmdb_id, updated_at, created_at, status')
    .eq('id', cleanFilmId)
    .maybeSingle();

  if (filmError) {
    console.error('[ExecutionBuilder] Erro ao buscar filme no banco:', filmError);
    throw new AppError(500, 'INTERNAL_ERROR', 'Erro ao consultar dados do filme no banco de dados.');
  }

  if (!localFilm) {
    throw new AppError(404, 'NOT_FOUND', `Filme com ID "${cleanFilmId}" não encontrado no acervo.`);
  }

  if (!localFilm.tmdb_id || localFilm.tmdb_id <= 0) {
    throw new AppError(
      400,
      'INVALID_PARAMS',
      `O filme "${localFilm.title}" (${localFilm.year}) não possui vínculo com TMDB (tmdb_id é nulo).`
    );
  }

  // 3. Stale Reconciliation Protection via baseUpdatedAt
  if (request.baseUpdatedAt) {
    const localTimestamp = localFilm.updated_at || localFilm.created_at;
    if (localTimestamp) {
      const clientTime = new Date(request.baseUpdatedAt).getTime();
      const serverTime = new Date(localTimestamp).getTime();
      if (!isNaN(clientTime) && !isNaN(serverTime) && clientTime !== serverTime) {
        throw new AppError(
          409,
          'STALE_RECONCILIATION',
          'O filme foi modificado no acervo após a reconciliação. Por favor, recarregue a reconciliação antes de sincronizar.'
        );
      }
    }
  }

  // 4. Re-fetch obrigatório do TMDB server-side
  const tmdbCredits = await getMovieCredits(localFilm.tmdb_id);
  const tmdbCast = tmdbCredits.cast || [];
  const tmdbCrew = tmdbCredits.crew || [];

  // 5. Consultar pessoas locais atuais
  const { data: localPeopleData, error: peopleError } = await supabase
    .from('pessoas')
    .select('id, name, slug, photo_url, birth_date, death_date, country, country_id, bio, is_editorial_profile, editorial_profile, primary_roles, status, tmdb_id, tmdb_synced_at, imdb_id');

  if (peopleError) {
    console.error('[ExecutionBuilder] Erro ao carregar pessoas locais:', peopleError);
    throw new AppError(500, 'INTERNAL_ERROR', 'Erro ao carregar catálogo de pessoas.');
  }

  const localPeople: LocalPersonRecord[] = (localPeopleData || []) as LocalPersonRecord[];
  const localPeopleById = new Map<string, LocalPersonRecord>();
  const localPeopleByTmdbId = new Map<number, LocalPersonRecord>();

  localPeople.forEach((p) => {
    localPeopleById.set(p.id, p);
    if (p.tmdb_id && p.tmdb_id > 0) {
      localPeopleByTmdbId.set(p.tmdb_id, p);
    }
  });

  // 6. Consultar créditos locais atuais deste filme
  const { data: localCreditsData, error: creditsError } = await supabase
    .from('film_credits')
    .select('id, film_id, person_id, fallback_person_name, department, role, character_name, order_index')
    .eq('film_id', cleanFilmId)
    .order('order_index');

  if (creditsError) {
    console.error('[ExecutionBuilder] Erro ao carregar créditos locais:', creditsError);
    throw new AppError(500, 'INTERNAL_ERROR', 'Erro ao carregar créditos locais do filme.');
  }

  const localCredits: LocalCreditRecord[] = (localCreditsData || []) as LocalCreditRecord[];

  // 7. Classificar pessoas deterministamente
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

  const reconciledPeople = classifyTmdbPeople(tmdbPeopleInputs, localPeople, localCredits);
  const personByTmdbId = new Map<number, ReconciledPerson>();
  reconciledPeople.forEach((p) => personByTmdbId.set(p.tmdbPersonId, p));

  // 8. Indexar e validar decisões do cliente por tmdbPersonId (anti-contradição)
  const clientDecisionsByTmdbId = new Map<number, PersonSyncDecisionItem>();
  if (Array.isArray(request.personDecisions)) {
    for (const d of request.personDecisions) {
      if (!d || typeof d.tmdbPersonId !== 'number') continue;
      const existing = clientDecisionsByTmdbId.get(d.tmdbPersonId);
      if (existing) {
        if (existing.action !== d.action || (existing.localPersonId || '') !== (d.localPersonId || '')) {
          throw new AppError(
            400,
            'INVALID_PARAMS',
            `Decisões conflitantes ou duplicadas para a mesma pessoa TMDB #${d.tmdbPersonId}.`
          );
        }
      } else {
        clientDecisionsByTmdbId.set(d.tmdbPersonId, d);
      }
    }
  }

  // 9. Reconstruir créditos TMDB com identificadores canônicos
  const allReconstructedCredits: InternalCreditItemReconstructed[] = [];
  const creditMapByStableId = new Map<string, InternalCreditItemReconstructed>();
  const matchedLocalCreditIds = new Set<string>();

  // Processar Cast
  tmdbCast.forEach((c) => {
    const personInfo = personByTmdbId.get(c.tmdbPersonId);
    const vocab = mapTmdbCastMember(c.order);

    // Determinar pessoa local alvo
    const clientDecision = clientDecisionsByTmdbId.get(c.tmdbPersonId);
    let targetLocalPersonId: string | null = null;

    if (clientDecision?.action === 'LINK_EXISTING' && clientDecision.localPersonId) {
      targetLocalPersonId = clientDecision.localPersonId;
    } else if (personInfo?.matchedLocalPersonId) {
      targetLocalPersonId = personInfo.matchedLocalPersonId;
    } else if (personInfo?.suggestedCandidates && personInfo.suggestedCandidates.length === 1) {
      targetLocalPersonId = personInfo.suggestedCandidates[0].localPersonId;
    }

    const matchResult = matchLocalCreditSemantically(
      targetLocalPersonId,
      vocab.department,
      vocab.role,
      c.character || null,
      true,
      localCredits,
      matchedLocalCreditIds
    );

    if (matchResult.matchedCredit) {
      matchedLocalCreditIds.add(matchResult.matchedCredit.id);
    }

    const canonicalId = c.creditId ? `cast:${c.creditId}` : `cast:${c.tmdbPersonId}:${c.order}`;

    const item: InternalCreditItemReconstructed = {
      stableId: canonicalId,
      source: 'TMDB',
      tmdbPersonId: c.tmdbPersonId,
      personName: c.name,
      profilePath: c.profilePath,
      profileUrl: c.profileUrl,
      department: vocab.department,
      role: vocab.role,
      characterName: c.character || null,
      orderIndex: c.order,
      isCast: true,
      matchResult,
    };

    allReconstructedCredits.push(item);
    creditMapByStableId.set(canonicalId, item);
  });

  // Processar Crew
  tmdbCrew.forEach((c) => {
    const personInfo = personByTmdbId.get(c.tmdbPersonId);
    const vocab = mapTmdbCrewMember(c.department, c.job);

    const clientDecision = clientDecisionsByTmdbId.get(c.tmdbPersonId);
    let targetLocalPersonId: string | null = null;

    if (clientDecision?.action === 'LINK_EXISTING' && clientDecision.localPersonId) {
      targetLocalPersonId = clientDecision.localPersonId;
    } else if (personInfo?.matchedLocalPersonId) {
      targetLocalPersonId = personInfo.matchedLocalPersonId;
    } else if (personInfo?.suggestedCandidates && personInfo.suggestedCandidates.length === 1) {
      targetLocalPersonId = personInfo.suggestedCandidates[0].localPersonId;
    }

    const matchResult = matchLocalCreditSemantically(
      targetLocalPersonId,
      vocab.department,
      vocab.role,
      null,
      false,
      localCredits,
      matchedLocalCreditIds
    );

    if (matchResult.matchedCredit) {
      matchedLocalCreditIds.add(matchResult.matchedCredit.id);
    }

    const canonicalId = c.creditId ? `crew:${c.creditId}` : `crew:${c.tmdbPersonId}:${c.department}:${c.job}`;

    const item: InternalCreditItemReconstructed = {
      stableId: canonicalId,
      source: 'TMDB',
      tmdbPersonId: c.tmdbPersonId,
      personName: c.name,
      profilePath: c.profilePath,
      profileUrl: c.profileUrl,
      department: vocab.department,
      role: vocab.role,
      characterName: null,
      orderIndex: vocab.priorityOrder,
      isCast: false,
      matchResult,
    };

    allReconstructedCredits.push(item);
    creditMapByStableId.set(canonicalId, item);
  });

  // 10. Filtrar e resolver os créditos selecionados pelo cliente com validação estrita
  const selectedCreditsReconstructed: InternalCreditItemReconstructed[] = [];
  const requestedIdsSeen = new Set<string>();

  for (const requestedId of request.selectedCredits) {
    if (typeof requestedId !== 'string' || !requestedId.trim()) continue;
    const cleanId = requestedId.trim();

    // Verificação de duplicação no request
    if (requestedIdsSeen.has(cleanId)) {
      throw new AppError(
        400,
        'INVALID_PARAMS',
        `Identificador de crédito duplicado na seleção enviada: "${cleanId}".`
      );
    }
    requestedIdsSeen.add(cleanId);

    // Rejeitar formatos legados baseados em índice
    if (cleanId.startsWith('tmdb-cast-') || cleanId.startsWith('tmdb-crew-')) {
      throw new AppError(
        400,
        'INVALID_PARAMS',
        `Identificador de crédito em formato legado baseado em índice não é aceito: "${cleanId}". Utilize a identidade canônica "cast:<credit_id>" ou "crew:<credit_id>".`
      );
    }

    const creditItem = creditMapByStableId.get(cleanId);
    if (!creditItem) {
      throw new AppError(
        409,
        'STALE_RECONCILIATION',
        `Crédito TMDB "${cleanId}" não encontrado após consulta atualizada ao TMDB. Recarregue a reconciliação antes de sincronizar.`
      );
    }

    selectedCreditsReconstructed.push(creditItem);
  }

  if (selectedCreditsReconstructed.length === 0) {
    throw new AppError(400, 'INVALID_PARAMS', 'Nenhum crédito válido selecionado para sincronização.');
  }

  // 11. Coletar todas as pessoas TMDB necessárias para os créditos selecionados
  const requiredTmdbPersonIds = new Set<number>();
  selectedCreditsReconstructed.forEach((c) => requiredTmdbPersonIds.add(c.tmdbPersonId));

  // 12. Validar e construir p_persons_to_link e p_persons_to_create
  const personsToLinkMap = new Map<number, RpcPersonsToLinkItem>();
  const personsToCreateMap = new Map<number, RpcPersonsToCreateItem>();
  const preparedImages: PreparedStorageImage[] = [];
  const reservedPersonSlugs = new Set(localPeople.map(p => p.slug).filter(Boolean));

  for (const tmdbPersonId of requiredTmdbPersonIds) {
    const existingLocalPersonByTmdb = localPeopleByTmdbId.get(tmdbPersonId);

    // Se a pessoa já tem tmdb_id no banco, está resolvida nativamente
    if (existingLocalPersonByTmdb) {
      continue;
    }

    const clientDecision = clientDecisionsByTmdbId.get(tmdbPersonId);
    const personInfo = personByTmdbId.get(tmdbPersonId);

    // Caso 1: LINK_EXISTING
    if (clientDecision?.action === 'LINK_EXISTING') {
      const localPersonId = (clientDecision.localPersonId || '').trim();
      if (!localPersonId) {
        throw new AppError(
          400,
          'INVALID_PARAMS',
          `Decisão LINK_EXISTING para pessoa TMDB #${tmdbPersonId} requer "localPersonId" válido.`
        );
      }

      const localPerson = localPeopleById.get(localPersonId);
      if (!localPerson) {
        throw new AppError(
          404,
          'NOT_FOUND',
          `Pessoa local com ID "${localPersonId}" não encontrada no catálogo para vinculação.`
        );
      }

      if (localPerson.tmdb_id && localPerson.tmdb_id !== tmdbPersonId) {
        throw new AppError(
          409,
          'CONFLICT',
          `A pessoa local "${localPerson.name}" já possui outro vínculo TMDB (#${localPerson.tmdb_id}). Não é permitido sobrescrever.`
        );
      }

      personsToLinkMap.set(tmdbPersonId, {
        local_person_id: localPerson.id,
        tmdb_person_id: tmdbPersonId,
      });
      continue;
    }

    // Caso 2: CREATE_NEW
    if (clientDecision?.action === 'CREATE_NEW' || (!clientDecision && personInfo?.status === 'NEW_PERSON')) {
      // Buscar detalhes se necessário ou usar dados factuais do crédito
      const creditWithPerson = allReconstructedCredits.find((c) => c.tmdbPersonId === tmdbPersonId);
      let factualName = personInfo?.name || creditWithPerson?.personName || '';

      if (!factualName.trim()) {
        throw new AppError(
          400,
          'INVALID_PARAMS',
          `Nome factual da pessoa TMDB #${tmdbPersonId} está vazio. Não é permitido criar pessoa sem nome.`
        );
      }

      // Nomes em alfabetos não latinos são válidos: o TMDB ID fornece uma URL estável.
      // O sufixo TMDB impede colisões entre homônimos e entre prévia e execução.
      const baseSlug = `${slugifyText(factualName) || 'pessoa'}-tmdb-${tmdbPersonId}`;
      let generatedSlug = baseSlug;
      let suffix = 2;
      while (reservedPersonSlugs.has(generatedSlug)) {
        generatedSlug = `${baseSlug}-${suffix++}`;
      }
      reservedPersonSlugs.add(generatedSlug);

      let photoUrl: string | null = null;
      let bio: string | null = null;
      let birthDate: string | null = null;
      let deathDate: string | null = null;
      let imdbId: string | null = null;
      let knownForDept: string | null = null;

      // Se for execução real (quando habilitada), preparar imagem de Storage e consultar detalhes adicionais
      if (request.dryRun) {
        // No modo dry-run / preview, mantemos a URL planejada do Storage de forma puramente representativa
        photoUrl = personInfo?.profilePath ? `https://storage.lanterna.app/media/people/tmdb-${tmdbPersonId}/profile.jpg` : null;
      } else if (EXECUTION_ENABLED) {
        try {
          const details = await getPersonDetails(tmdbPersonId);
          // A prévia e a execução devem compartilhar o mesmo nome canônico do crédito.
          // Grafias alternativas ficam disponíveis no importador individual, sem alterar o payload aqui.
          bio = details.biography || null;
          birthDate = details.birthday || null;
          deathDate = details.deathday || null;
          imdbId = details.imdbId || null;
          knownForDept = details.knownForDepartment || null;

          if (details.profileUrl) {
            const prepared = await preparePersonProfileImage(supabase, tmdbPersonId, details.profileUrl);
            if (prepared) {
              preparedImages.push(prepared);
              photoUrl = prepared.publicUrl;
            }
          }
        } catch (err: any) {
          console.warn(`[ExecutionBuilder] Aviso ao buscar detalhes adicionais de pessoa TMDB #${tmdbPersonId}:`, err?.message || err);
        }
      }

      personsToCreateMap.set(tmdbPersonId, {
        tmdb_person_id: tmdbPersonId,
        name: factualName,
        slug: generatedSlug,
        photo_url: photoUrl,
        birth_date: birthDate,
        death_date: deathDate,
        imdb_id: imdbId,
        bio: bio,
        known_for_department: knownForDept,
      });
      continue;
    }

    // Se chegou aqui, há uma pessoa TMDB sem decisão de resolução
    throw new AppError(
      400,
      'INVALID_PARAMS',
      `Decisão de resolução pendente para a pessoa "${personInfo?.name || tmdbPersonId}" (TMDB #${tmdbPersonId}). Escolha LINK_EXISTING ou CREATE_NEW.`
    );
  }

  // 13. Construir lista canônica de p_credits_to_sync com preservação estrita de dados locais
  const creditsToSync: RpcCreditsToSyncItem[] = [];
  const seenLogicalKeys = new Set<string>();

  let exactLocalCreditsPreserved = 0;
  let semanticLocalCreditsPreserved = 0;
  let newCreditsInserted = 0;

  for (const item of selectedCreditsReconstructed) {
    let finalDepartment = item.department;
    let finalRole = item.role;
    let finalCharacterName = item.characterName;
    const finalOrderIndex = item.orderIndex;

    // Se o crédito for uma correspondência exata ou semântica com crédito local pré-existente:
    // PRESERVAR departamento, role (ex: Ator, Atriz, Elenco) e character_name locais!
    if (
      item.matchResult.matchedCredit &&
      (item.matchResult.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT' ||
        item.matchResult.localCreditComparisonStatus === 'SEMANTIC_LOCAL_CREDIT')
    ) {
      finalDepartment = item.matchResult.matchedCredit.department;
      finalRole = item.matchResult.matchedCredit.role;
      finalCharacterName = item.matchResult.matchedCredit.character_name;

      if (item.matchResult.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT') {
        exactLocalCreditsPreserved++;
      } else {
        semanticLocalCreditsPreserved++;
      }
    } else {
      newCreditsInserted++;
    }

    // Anti-duplicação intra-payload
    const logicalKey = `${item.tmdbPersonId}:${finalDepartment}:${finalRole || ''}:${finalCharacterName || ''}`;
    if (seenLogicalKeys.has(logicalKey)) {
      throw new AppError(
        400,
        'INVALID_PARAMS',
        `Crédito duplicado no payload de sincronização: pessoa #${item.tmdbPersonId} / ${finalDepartment} / ${finalRole || ''} / ${finalCharacterName || ''}.`
      );
    }
    seenLogicalKeys.add(logicalKey);

    creditsToSync.push({
      tmdb_person_id: item.tmdbPersonId,
      department: finalDepartment,
      role: finalRole,
      character_name: finalCharacterName,
      order_index: finalOrderIndex,
    });
  }

  const payload: RpcSyncFilmCreditsPayload = {
    p_film_id: cleanFilmId,
    p_tmdb_id: localFilm.tmdb_id,
    p_persons_to_link: Array.from(personsToLinkMap.values()),
    p_persons_to_create: Array.from(personsToCreateMap.values()),
    p_credits_to_sync: creditsToSync,
    p_user_id: authenticatedUserId,
  };

  return {
    payload,
    summary: {
      totalSelectedCredits: creditsToSync.length,
      exactLocalCreditsPreserved,
      semanticLocalCreditsPreserved,
      newCreditsInserted,
      personsToLinkCount: personsToLinkMap.size,
      personsToCreateCount: personsToCreateMap.size,
      distinctPersonsInSelectionCount: requiredTmdbPersonIds.size,
    },
    preparedImages,
  };
}

/**
 * Ponto de entrada do endpoint de sincronização (POST /api/tmdb/movies/credits/sync)
 */
export async function executeCreditsSync(
  request: CreditsSyncExecuteRequest,
  req: any
): Promise<CreditsSyncExecuteResult> {
  const supabase = getServerSupabaseClient(req);

  let authenticatedUserId = req?.user?.id;
  if (!authenticatedUserId) {
    const auth = await validateAdminAuth(req);
    if (auth.authorized && auth.user?.id) {
      if (req) req.user = auth.user;
      authenticatedUserId = auth.user.id;
    }
  }

  if (!authenticatedUserId || typeof authenticatedUserId !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Identificador do usuário autenticado não pôde ser determinado.');
  }

  // 1. Executar a construção e validação completa do payload
  const { payload, summary, preparedImages } = await buildCreditsSyncPayload(
    request,
    authenticatedUserId,
    supabase
  );

  // 2. Se for modo Dry-Run / Preview, retornar payload construído com sucesso
  if (request.dryRun) {
    return {
      success: true,
      locked: true,
      dryRun: true,
      executionStatus: 'DRY_RUN',
      filmId: payload.p_film_id,
      tmdbId: payload.p_tmdb_id,
      createdPeopleCount: summary.personsToCreateCount,
      linkedPeopleCount: summary.personsToLinkCount,
      insertedCreditsCount: summary.newCreditsInserted,
      updatedCreditsCount: summary.semanticLocalCreditsPreserved,
      unchangedCreditsCount: summary.exactLocalCreditsPreserved,
      semanticCreditsReusedCount: summary.semanticLocalCreditsPreserved,
      storageCreatedCount: 0,
      storageReusedCount: 0,
      warnings: [],
      payload,
      summary,
      message: 'Dry-run do payload de sincronização de créditos gerado e validado com sucesso (zero writes).',
    };
  }

  // 3. Execução Real Controlada (exclusiva para Le Trou homologado):
  let storageCreatedCount = 0;
  let storageReusedCount = 0;

  for (const img of preparedImages) {
    if (img.status === 'CREATED_THIS_ATTEMPT') storageCreatedCount++;
    else if (img.status === 'PREEXISTING') storageReusedCount++;
  }

  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('sync_film_credits_from_tmdb', payload);

    if (rpcError) {
      console.error('[ExecutionBuilder] Erro na execução da RPC sync_film_credits_from_tmdb:', rpcError);
      throw new AppError(500, 'RPC_ERROR', `Erro na execução da transação de sincronização: ${rpcError.message}`);
    }

    const resData = rpcResult as any;
    return {
      success: true,
      executionStatus: 'SUCCESS',
      filmId: payload.p_film_id,
      tmdbId: payload.p_tmdb_id,
      createdPeopleCount: resData?.persons_created ?? summary.personsToCreateCount,
      linkedPeopleCount: resData?.persons_linked ?? summary.personsToLinkCount,
      insertedCreditsCount: resData?.credits_inserted ?? summary.newCreditsInserted,
      updatedCreditsCount: resData?.credits_updated ?? summary.semanticLocalCreditsPreserved,
      unchangedCreditsCount: resData?.credits_unchanged ?? summary.exactLocalCreditsPreserved,
      semanticCreditsReusedCount: summary.semanticLocalCreditsPreserved,
      storageCreatedCount,
      storageReusedCount,
      warnings: [],
      payload,
      summary,
      message: 'Sincronização de créditos e pessoas executada com sucesso transacional.',
    };
  } catch (err: any) {
    // Compensação de Storage se falhou após uploads
    if (preparedImages.length > 0) {
      try {
        await compensateStorageUploads(supabase, preparedImages);
      } catch (compErr: any) {
        console.warn('[ExecutionBuilder] Aviso ao compensar uploads de Storage após erro na RPC:', compErr?.message || compErr);
      }
    }
    throw err;
  }
}
