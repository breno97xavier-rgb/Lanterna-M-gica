// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Modal Controlado de Reconciliação Read-Only de Elenco e Equipe TMDB (F10.4E-C2)
// Arquivo: src/components/admin/TmdbCreditsReconcileModal.tsx
//
// Regras Fundamentais:
// 1. Estritamente READ-ONLY (Zero DB Writes, Zero Storage Writes, Zero Chamadas à RPC).
// 2. Consulta exclusivamente o endpoint seguro /api/tmdb/movies/credits/reconcile.
// 3. Suporta 4 estados de matching: EXACT_TMDB_MATCH, POSSIBLE_LOCAL_MATCH, AMBIGUOUS, NEW_PERSON.
// 4. Curadoria editorial com defaults (Elenco: primeiros 8; Equipe: Direção, Roteiro, Fotografia, Montagem, Música).
// 5. Decisão de identidade é compartilhada por tmdb_person_id entre múltiplos cargos.
// 6. Step 2 "Revisar Seleção" é uma prévia completa sem botão de escrita ativo nesta etapa.
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Users,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle2,
  Link as LinkIcon,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Film,
  Clapperboard,
  Info,
  AlertTriangle,
  UserCheck,
  Layers,
} from 'lucide-react';
import {
  reconcileTmdbMovieCredits,
  syncTmdbMovieCredits,
  CreditsReconcileResponse,
  ReconciledPerson,
  ReconciledCreditItem,
  LocalOnlyCreditItem,
  PersonMatchStatus,
  TmdbApiError,
  CreditsSyncExecuteResult,
} from '../../services/tmdbApiClient';

export interface TmdbCreditsReconcileModalProps {
  isOpen: boolean;
  filmId: string | null;
  filmTitle?: string;
  tmdbId?: number | null;
  onClose: () => void;
  onNotify: (msg: string) => void;
  onSyncSuccess?: () => void;
}

type ModalStep = 'SELECTION_AND_RECONCILIATION' | 'REVIEW_ONLY';
type ActiveTab = 'cast' | 'crew' | 'local_preserved';

interface PersonDecisionState {
  action: 'LINK_EXISTING' | 'CREATE_NEW' | 'REUSE_EXACT';
  localPersonId?: string;
  localPersonName?: string;
}

const PRIMARY_CREW_DEPARTMENTS = [
  'Direção',
  'Roteiro',
  'Fotografia',
  'Montagem',
  'Música',
];

export const TmdbCreditsReconcileModal: React.FC<TmdbCreditsReconcileModalProps> = ({
  isOpen,
  filmId,
  filmTitle,
  tmdbId,
  onClose,
  onNotify,
  onSyncSuccess,
}) => {
  // Navigation & View State
  const [step, setStep] = useState<ModalStep>('SELECTION_AND_RECONCILIATION');
  const [activeTab, setActiveTab] = useState<ActiveTab>('cast');
  const [expandedCast, setExpandedCast] = useState(false);
  const [expandedCrew, setExpandedCrew] = useState(false);

  // Data & Async State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [reconcileData, setReconcileData] = useState<CreditsReconcileResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessResult, setSyncSuccessResult] = useState<CreditsSyncExecuteResult | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  // User Selection & Decision State
  const [selectedCreditIds, setSelectedCreditIds] = useState<Set<string>>(new Set());
  const [personDecisions, setPersonDecisions] = useState<Map<number, PersonDecisionState>>(new Map());

  // Reset and load data when modal opens
  const loadReconciliation = useCallback(async (targetFilmId: string) => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setSyncError(null);
    setSyncSuccessResult(null);
    setConfirmChecked(false);
    setIsSubmitting(false);
    setStep('SELECTION_AND_RECONCILIATION');
    setActiveTab('cast');
    setExpandedCast(false);
    setExpandedCrew(false);

    try {
      const response = await reconcileTmdbMovieCredits(targetFilmId);
      setReconcileData(response);

      // 1. Inicializar seleção de créditos com os defaults recomendados
      const defaultSelected = new Set<string>();
      response.credits.forEach((c) => {
        if (c.isDefaultSelected) {
          defaultSelected.add(c.id);
        }
      });
      setSelectedCreditIds(defaultSelected);

      // 2. Inicializar decisões de identidade
      const initialDecisions = new Map<number, PersonDecisionState>();
      response.people.forEach((p) => {
        if (p.status === 'EXACT_TMDB_MATCH' && p.matchedLocalPersonId) {
          initialDecisions.set(p.tmdbPersonId, {
            action: 'REUSE_EXACT',
            localPersonId: p.matchedLocalPersonId,
            localPersonName: p.matchedLocalPerson?.name,
          });
        } else if (p.status === 'NEW_PERSON') {
          initialDecisions.set(p.tmdbPersonId, {
            action: 'CREATE_NEW',
          });
        } else if (p.status === 'POSSIBLE_LOCAL_MATCH' && p.suggestedCandidates?.length === 1) {
          // Pré-seleção segura recomendada: visível na UI com opção explícita de alterar para CREATE_NEW
          initialDecisions.set(p.tmdbPersonId, {
            action: 'LINK_EXISTING',
            localPersonId: p.suggestedCandidates[0].localPersonId,
            localPersonName: p.suggestedCandidates[0].name,
          });
        }
        // AMBIGUOUS permanece sem decisão inicial automática (exige escolha explícita do operador)
      });
      setPersonDecisions(initialDecisions);
    } catch (err: any) {
      console.error('[TmdbCreditsReconcileModal] Erro ao carregar reconciliação:', err);
      const message = err.message || 'Erro ao consultar e reconciliar créditos do TMDB.';
      setError(message);
      setErrorCode(err.code || 'UNKNOWN_ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && filmId) {
      loadReconciliation(filmId);
    } else {
      // Limpar estado completo ao fechar
      setReconcileData(null);
      setSelectedCreditIds(new Set());
      setPersonDecisions(new Map());
      setError(null);
      setErrorCode(null);
      setStep('SELECTION_AND_RECONCILIATION');
    }
  }, [isOpen, filmId, loadReconciliation]);

  // Mapa rápido de pessoas TMDB
  const peopleMap = useMemo(() => {
    const map = new Map<number, ReconciledPerson>();
    if (reconcileData?.people) {
      reconcileData.people.forEach((p) => map.set(p.tmdbPersonId, p));
    }
    return map;
  }, [reconcileData]);

  // Créditos separados por elenco e equipe
  const castCredits = useMemo(() => {
    return (reconcileData?.credits || []).filter((c) => c.isCast);
  }, [reconcileData]);

  const crewCredits = useMemo(() => {
    return (reconcileData?.credits || []).filter((c) => !c.isCast);
  }, [reconcileData]);

  // Equipe agrupada por departamento
  const crewByDepartment = useMemo(() => {
    const map = new Map<string, ReconciledCreditItem[]>();
    crewCredits.forEach((c) => {
      const dept = c.department || 'Outro';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(c);
    });
    return map;
  }, [crewCredits]);

  // Lista de departamentos ordenados (Prioritários primeiro, depois alfabético)
  const orderedDepartments = useMemo(() => {
    const depts: string[] = Array.from(crewByDepartment.keys());
    return depts.sort((a: string, b: string) => {
      const idxA = PRIMARY_CREW_DEPARTMENTS.indexOf(a);
      const idxB = PRIMARY_CREW_DEPARTMENTS.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [crewByDepartment]);

  // Alternar seleção de crédito individual
  const toggleCreditSelection = (creditId: string) => {
    setSelectedCreditIds((prev) => {
      const next = new Set(prev);
      if (next.has(creditId)) {
        next.delete(creditId);
      } else {
        next.add(creditId);
      }
      return next;
    });
  };

  // Selecionar / desselecionar todos os itens de uma lista
  const toggleAllInList = (creditsList: ReconciledCreditItem[]) => {
    const allSelected = creditsList.every((c) => selectedCreditIds.has(c.id));
    setSelectedCreditIds((prev) => {
      const next = new Set(prev);
      creditsList.forEach((c) => {
        if (allSelected) {
          next.delete(c.id);
        } else {
          next.add(c.id);
        }
      });
      return next;
    });
  };

  // Definir decisão de identidade para um TMDB ID (compartilhada por todos os créditos daquela pessoa)
  const setPersonDecision = (
    tmdbPersonId: number,
    action: 'LINK_EXISTING' | 'CREATE_NEW',
    localPersonId?: string,
    localPersonName?: string
  ) => {
    setPersonDecisions((prev) => {
      const next = new Map(prev);
      next.set(tmdbPersonId, {
        action,
        localPersonId,
        localPersonName,
      });
      return next;
    });
  };

  // Identificar pessoas de créditos selecionados que ainda não tiveram decisão tomada
  const undecidedSelectedPeople = useMemo(() => {
    if (!reconcileData) return [];
    const selectedPeopleIds = new Set<number>();
    reconcileData.credits.forEach((c) => {
      if (selectedCreditIds.has(c.id) && c.tmdbPersonId) {
        selectedPeopleIds.add(c.tmdbPersonId);
      }
    });

    const pending: ReconciledPerson[] = [];
    selectedPeopleIds.forEach((tmdbPersonId) => {
      const person = peopleMap.get(tmdbPersonId);
      if (person) {
        const decision = personDecisions.get(tmdbPersonId);
        // Se for POSSIBLE_LOCAL_MATCH ou AMBIGUOUS e não tiver decisão explícita
        if (
          (person.status === 'POSSIBLE_LOCAL_MATCH' || person.status === 'AMBIGUOUS') &&
          !decision
        ) {
          pending.push(person);
        }
      }
    });
    return pending;
  }, [reconcileData, selectedCreditIds, peopleMap, personDecisions]);

  // Contagem de créditos selecionados
  const selectedCastCount = useMemo(() => {
    return castCredits.filter((c) => selectedCreditIds.has(c.id)).length;
  }, [castCredits, selectedCreditIds]);

  const selectedCrewCount = useMemo(() => {
    return crewCredits.filter((c) => selectedCreditIds.has(c.id)).length;
  }, [crewCredits, selectedCreditIds]);

  const totalSelectedCount = selectedCreditIds.size;

  // Construção do Payload Planejado (Apenas para Revisão em Memória — Sem Envio)
  const plannedPayload = useMemo(() => {
    if (!reconcileData) {
      return {
        personsToLink: [],
        personsToCreate: [],
        creditsToSync: [],
        creditsUpdatedCount: 0,
        creditsInsertedCount: 0,
      };
    }

    const selectedCredits = reconcileData.credits.filter((c) => selectedCreditIds.has(c.id));
    const involvedTmdbPersonIds = new Set<number>();
    selectedCredits.forEach((c) => {
      if (c.tmdbPersonId) involvedTmdbPersonIds.add(c.tmdbPersonId);
    });

    const personsToLink: Array<{
      tmdbPersonId: number;
      tmdbName: string;
      localPersonId: string;
      localPersonName: string;
    }> = [];

    const personsToCreate: Array<{
      tmdbPersonId: number;
      name: string;
      knownForDepartment: string;
      photoUrl: string | null;
    }> = [];

    involvedTmdbPersonIds.forEach((tmdbPersonId) => {
      const person = peopleMap.get(tmdbPersonId);
      const decision = personDecisions.get(tmdbPersonId);
      if (!person) return;

      if (decision?.action === 'LINK_EXISTING' && decision.localPersonId) {
        personsToLink.push({
          tmdbPersonId,
          tmdbName: person.name,
          localPersonId: decision.localPersonId,
          localPersonName: decision.localPersonName || 'Pessoa Local',
        });
      } else if (decision?.action === 'CREATE_NEW' || person.status === 'NEW_PERSON') {
        personsToCreate.push({
          tmdbPersonId,
          name: person.name,
          knownForDepartment: person.knownForDepartment,
          photoUrl: person.profileUrl,
        });
      }
    });

    // Créditos que seriam sincronizados
    const creditsToSync = selectedCredits.map((c) => ({
      id: c.id,
      tmdbPersonId: c.tmdbPersonId,
      personName: c.personName,
      department: c.department,
      role: c.role,
      characterName: c.characterName,
      orderIndex: c.orderIndex,
      isCast: c.isCast,
      comparisonStatus: c.creditComparisonStatus,
      localCreditComparisonStatus: c.localCreditComparisonStatus,
      localCreditId: c.localCreditId,
      localDepartment: c.localDepartment,
      localRole: c.localRole,
      localCharacterName: c.localCharacterName,
      localOrderIndex: c.localOrderIndex,
      semanticEquivalenceReason: c.semanticEquivalenceReason,
      existingLocalCreditId: c.existingLocalCreditId,
    }));

    const creditsInsertedCount = creditsToSync.filter(
      (c) => c.localCreditComparisonStatus === 'NEW_CREDIT'
    ).length;

    const creditsSemanticPreservedCount = creditsToSync.filter(
      (c) => c.localCreditComparisonStatus === 'SEMANTIC_LOCAL_CREDIT'
    ).length;

    const creditsExactCount = creditsToSync.filter(
      (c) => c.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT'
    ).length;

    const creditsUpdatedCount = creditsSemanticPreservedCount + creditsExactCount;

    return {
      personsToLink,
      personsToCreate,
      creditsToSync,
      creditsUpdatedCount,
      creditsInsertedCount,
      creditsSemanticPreservedCount,
      creditsExactCount,
    };
  }, [reconcileData, selectedCreditIds, peopleMap, personDecisions]);

  // Restauração determinística da seleção editorial padrão do filme
  const handleRestoreDefaultSelection = () => {
    if (!reconcileData) return;
    const defaultIds = new Set<string>();
    reconcileData.credits.forEach((c) => {
      if (c.isDefaultSelected) {
        defaultIds.add(c.id);
      }
    });
    setSelectedCreditIds(defaultIds);
    setPersonDecisions((prev) => {
      const next = new Map(prev);
      reconcileData.people.forEach((p) => {
        if (p.status === 'POSSIBLE_LOCAL_MATCH' && p.suggestedCandidates?.length === 1) {
          next.set(p.tmdbPersonId, {
            action: 'LINK_EXISTING',
            localPersonId: p.suggestedCandidates[0].localPersonId,
            localPersonName: p.suggestedCandidates[0].name,
          });
        } else if (p.status === 'NEW_PERSON') {
          next.set(p.tmdbPersonId, {
            action: 'CREATE_NEW',
          });
        } else if (p.status === 'EXACT_TMDB_MATCH' && p.matchedLocalPersonId) {
          next.set(p.tmdbPersonId, {
            action: 'REUSE_EXACT',
            localPersonId: p.matchedLocalPersonId,
            localPersonName: p.matchedLocalPerson?.name,
          });
        }
      });
      return next;
    });
  };

  const handleConfirmSync = async () => {
    if (!filmId || !reconcileData || isSubmitting || syncSuccessResult) return;

    setIsSubmitting(true);
    setSyncError(null);

    try {
      const formattedDecisions = Array.from(personDecisions.entries())
        .map(([tmdbPersonId, decision]) => ({
          tmdbPersonId,
          action: (decision.action === 'REUSE_EXACT' ? 'LINK_EXISTING' : decision.action) as 'LINK_EXISTING' | 'CREATE_NEW',
          localPersonId: decision.localPersonId,
        }));

      const baseUpdatedAt =
        reconcileData.baseUpdatedAt ||
        reconcileData.film?.updatedAt ||
        (reconcileData.film as any)?.updated_at ||
        undefined;

      const result = await syncTmdbMovieCredits({
        filmId,
        baseUpdatedAt,
        selectedCredits: Array.from(selectedCreditIds),
        personDecisions: formattedDecisions,
        dryRun: false,
        confirmExecution: true,
      });

      // Canonical refresh: re-fetch reconciliation and notify external listeners
      setSyncSuccessResult(result);
      if (onSyncSuccess) {
        onSyncSuccess();
      }
      onNotify(`Sincronização de ${selectedCreditIds.size} crédito(s) realizada com sucesso no banco de dados!`);
    } catch (err: any) {
      setSyncError(err?.message || 'Ocorreu um erro ao sincronizar os créditos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-[#FBF9F5] text-[#1A1A1A] w-full max-w-5xl my-auto border border-[#1A1A1A]/20 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================================== */}
        {/* MODAL HEADER                                                        */}
        {/* ==================================================================== */}
        <div className="p-4 sm:p-5 bg-[#1A1A1A] text-[#F5F2ED] flex items-center justify-between border-b border-[#D4AF37]/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-display text-lg font-bold tracking-tight text-[#F5F2ED]">
                  Atualizar Elenco e Equipe via TMDB
                </h2>
                <span className="px-2 py-0.5 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-mono uppercase font-bold tracking-wider">
                  Reconciliação e Curadoria TMDB
                </span>
              </div>
              <p className="text-xs text-[#F5F2ED]/70 font-serif-body mt-0.5 flex items-center gap-2">
                <span>Obra: <strong className="text-[#F5F2ED]">{filmTitle || reconcileData?.film?.title || 'Filme selecionado'}</strong></span>
                {reconcileData?.film?.year && <span>({reconcileData.film.year})</span>}
                {tmdbId && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#D4AF37]">
                    <Sparkles size={10} /> TMDB #{tmdbId}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#F5F2ED]/60 hover:text-[#F5F2ED] hover:bg-white/10 rounded-xs transition-colors"
            title="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ==================================================================== */}
        {/* MODAL BODY                                                          */}
        {/* ==================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* LOADING STATE */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
              <div className="font-serif-display text-base font-semibold text-[#1A1A1A]">
                Consultando TMDB e Reconciliando Acervo...
              </div>
              <p className="text-xs text-[#1A1A1A]/60 font-serif-body max-w-md">
                Verificando vínculos de pessoas, comparando créditos existentes com o acervo e gerando sugestões determinísticas de curadoria.
              </p>
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div className="p-6 bg-red-50 border border-red-200 text-red-900 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm font-sans uppercase tracking-wider">
                    Não foi possível carregar a reconciliação
                  </h3>
                  <p className="text-xs font-serif-body text-red-800">{error}</p>
                  {errorCode && (
                    <span className="inline-block font-mono text-[10px] text-red-600 bg-red-100 px-2 py-0.5 mt-1 border border-red-200">
                      Código: {errorCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-red-200">
                {filmId && (
                  <button
                    onClick={() => loadReconciliation(filmId)}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
                  >
                    Tentar Novamente
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-white border border-red-300 text-red-800 text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS CONTENT */}
          {!loading && !error && reconcileData && (
            <>
              {/* STEP 1: SELEÇÃO E RECONCILIAÇÃO */}
              {step === 'SELECTION_AND_RECONCILIATION' && (
                <div className="space-y-6">
                  {/* RESUMO DE ENTRADA & MÉTRICAS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white border border-[#1A1A1A]/15 p-3.5 space-y-1">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/60 block">
                        TMDB Encontrou
                      </span>
                      <div className="font-serif-display text-xl font-bold text-[#1A1A1A]">
                        {reconcileData.summary.totalTmdbCast + reconcileData.summary.totalTmdbCrew}
                        <span className="text-xs font-sans font-normal text-[#1A1A1A]/60 ml-1">créditos</span>
                      </div>
                      <p className="text-[11px] font-serif-body text-[#1A1A1A]/70">
                        {reconcileData.summary.totalTmdbUniquePeople} profissionais únicos ({reconcileData.summary.totalTmdbCast} elenco, {reconcileData.summary.totalTmdbCrew} equipe)
                      </p>
                    </div>

                    <div className="bg-white border border-[#1A1A1A]/15 p-3.5 space-y-1">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/60 block">
                        Acervo Lanterna
                      </span>
                      <div className="font-serif-display text-xl font-bold text-[#1A1A1A]">
                        {reconcileData.summary.totalLocalCredits}
                        <span className="text-xs font-sans font-normal text-[#1A1A1A]/60 ml-1">atuais</span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                        {reconcileData.summary.semanticLocalCreditsCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-teal-50 text-teal-900 border border-teal-300 text-[9px] font-mono font-bold">
                            {reconcileData.summary.semanticLocalCreditsCount} semânticos
                          </span>
                        )}
                        {reconcileData.summary.exactLocalCreditsCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-mono font-bold">
                            {reconcileData.summary.exactLocalCreditsCount} idênticos
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-serif-body text-emerald-700 font-medium">
                        ✓ Preservados integralmente (Zero Delete)
                      </p>
                    </div>

                    <div className="bg-white border border-[#1A1A1A]/15 p-3.5 space-y-1">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/60 block">
                        Correspondências
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {reconcileData.summary.possibleLocalMatchesCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold">
                            {reconcileData.summary.possibleLocalMatchesCount} sugeridas
                          </span>
                        )}
                        {reconcileData.summary.exactTmdbMatchesCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                            {reconcileData.summary.exactTmdbMatchesCount} vinculadas
                          </span>
                        )}
                        {reconcileData.summary.newPeopleCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-mono font-bold">
                            {reconcileData.summary.newPeopleCount} novas
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-serif-body text-[#1A1A1A]/60">
                        {reconcileData.summary.ambiguousCount > 0 ? `${reconcileData.summary.ambiguousCount} ambígua(s)` : 'Sem ambiguidades'}
                      </p>
                    </div>

                    <div className="bg-white border border-[#D4AF37]/50 bg-[#D4AF37]/5 p-3.5 space-y-1">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                        Seleção Curada
                      </span>
                      <div className="font-serif-display text-xl font-bold text-[#1A1A1A]">
                        {totalSelectedCount}
                        <span className="text-xs font-sans font-normal text-[#1A1A1A]/60 ml-1">selecionados</span>
                      </div>
                      <p className="text-[11px] font-serif-body text-[#1A1A1A]/70">
                        {selectedCastCount} no elenco, {selectedCrewCount} na equipe
                      </p>
                    </div>
                  </div>

                  {/* ALERTA DE DECISÕES PENDENTES SE HOUVER */}
                  {undecidedSelectedPeople.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-sans font-bold uppercase tracking-wider">
                          {undecidedSelectedPeople.length} correspondência(s) pendente(s) de decisão
                        </h4>
                        <p className="text-xs font-serif-body text-amber-900">
                          Você selecionou créditos de profissionais que possuem possíveis correspondências no acervo local (ex: {undecidedSelectedPeople.map((p) => p.name).join(', ')}). 
                          Defina se deseja <strong>vincular à pessoa existente</strong> ou <strong>criar como nova pessoa</strong> antes de avançar para a revisão.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TABS DE SELEÇÃO */}
                  <div className="border-b border-[#1A1A1A]/20 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('cast')}
                      className={`px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'cast'
                          ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white'
                          : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                      }`}
                    >
                      <Film size={14} />
                      <span>Elenco</span>
                      <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold ${activeTab === 'cast' ? 'bg-[#1A1A1A] text-white' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]'}`}>
                        {selectedCastCount}/{castCredits.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('crew')}
                      className={`px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'crew'
                          ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white'
                          : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                      }`}
                    >
                      <Clapperboard size={14} />
                      <span>Equipe Técnica</span>
                      <span className={`px-1.5 py-0.2 text-[10px] font-mono font-bold ${activeTab === 'crew' ? 'bg-[#1A1A1A] text-white' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]'}`}>
                        {selectedCrewCount}/{crewCredits.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('local_preserved')}
                      className={`px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'local_preserved'
                          ? 'border-[#1A1A1A] text-[#1A1A1A] bg-white'
                          : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                      }`}
                    >
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Créditos Locais Preservados</span>
                      <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                        {reconcileData.summary.totalLocalCredits}
                      </span>
                    </button>

                    <div className="ml-auto pr-2">
                      <button
                        type="button"
                        onClick={handleRestoreDefaultSelection}
                        className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 px-2.5 py-1 border border-[#1A1A1A]/15 rounded-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Restaurar a curadoria editorial recomendada para este filme"
                      >
                        <Sparkles size={12} className="text-[#D4AF37]" />
                        <span>Restaurar Seleção Padrão</span>
                      </button>
                    </div>
                  </div>

                  {/* ========================================================== */}
                  {/* TAB 1: ELENCO                                              */}
                  {/* ========================================================== */}
                  {activeTab === 'cast' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 border border-[#1A1A1A]/10">
                        <div>
                          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                            Curadoria do Elenco ({castCredits.length} integrantes no TMDB)
                          </h3>
                          <p className="text-[11px] font-serif-body text-[#1A1A1A]/70 mt-0.5">
                            Por padrão editorial, os 8 primeiros integrantes da ordem TMDB são pré-selecionados. Você pode marcar ou desmarcar livremente.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleAllInList(castCredits)}
                            className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] hover:text-[#D4AF37] px-2 py-1 bg-[#F5F2ED] border border-[#1A1A1A]/15"
                          >
                            {castCredits.every((c) => selectedCreditIds.has(c.id)) ? 'Desmarcar Todos' : 'Marcar Todos'}
                          </button>
                        </div>
                      </div>

                      {/* LISTA DE ELENCO */}
                      <div className="space-y-2.5">
                        {(expandedCast ? castCredits : castCredits.slice(0, 8)).map((credit) => {
                          const isSelected = selectedCreditIds.has(credit.id);
                          const person = credit.tmdbPersonId ? peopleMap.get(credit.tmdbPersonId) : null;
                          const decision = credit.tmdbPersonId ? personDecisions.get(credit.tmdbPersonId) : undefined;
                          const isUndecided = isSelected && (person?.status === 'POSSIBLE_LOCAL_MATCH' || person?.status === 'AMBIGUOUS') && !decision;

                          return (
                            <div
                              key={credit.id}
                              className={`p-3.5 bg-white border transition-all ${
                                isUndecided
                                  ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400'
                                  : isSelected
                                  ? 'border-[#1A1A1A] shadow-xs'
                                  : 'border-[#1A1A1A]/15 opacity-75 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-start gap-3.5">
                                {/* Checkbox */}
                                <button
                                  type="button"
                                  onClick={() => toggleCreditSelection(credit.id)}
                                  className={`mt-1 w-5 h-5 border flex items-center justify-center transition-colors shrink-0 ${
                                    isSelected
                                      ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#D4AF37]'
                                      : 'bg-white border-[#1A1A1A]/30 hover:border-[#1A1A1A]'
                                  }`}
                                  aria-label={isSelected ? 'Desmarcar crédito' : 'Marcar crédito'}
                                >
                                  {isSelected && <Check size={14} strokeWidth={3} />}
                                </button>

                                {/* Foto do TMDB */}
                                {credit.personPhotoUrl ? (
                                  <img
                                    src={credit.personPhotoUrl}
                                    alt={credit.personName}
                                    className="w-11 h-14 object-cover border border-[#1A1A1A]/20 shrink-0 bg-stone-100"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-11 h-14 bg-[#1A1A1A]/5 border border-[#1A1A1A]/15 flex items-center justify-center shrink-0">
                                    <Users size={16} className="text-[#1A1A1A]/30" />
                                  </div>
                                )}

                                {/* Informações do Crédito */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-serif-display text-sm font-bold text-[#1A1A1A]">
                                        {credit.personName}
                                      </span>
                                      <span className="text-[10px] font-mono text-[#1A1A1A]/50 bg-[#F5F2ED] px-1.5 py-0.2 border border-[#1A1A1A]/10">
                                        Ordem #{credit.orderIndex + 1}
                                      </span>
                                    </div>

                                    {/* Badge de Status de Reconciliação */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {person?.status === 'EXACT_TMDB_MATCH' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                                          <LinkIcon size={10} /> JÁ VINCULADO
                                        </span>
                                      )}
                                      {person?.status === 'POSSIBLE_LOCAL_MATCH' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold">
                                          <HelpCircle size={10} /> POSSÍVEL CORRESPONDÊNCIA
                                        </span>
                                      )}
                                      {person?.status === 'AMBIGUOUS' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-mono font-bold">
                                          <AlertCircle size={10} /> CORRESPONDÊNCIA AMBÍGUA
                                        </span>
                                      )}
                                      {person?.status === 'NEW_PERSON' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-mono font-bold">
                                          <UserPlus size={10} /> NOVA PESSOA (Rascunho)
                                        </span>
                                      )}

                                      {/* Status Semântico de Crédito */}
                                      {credit.localCreditComparisonStatus === 'SEMANTIC_LOCAL_CREDIT' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-950 border border-teal-300 text-[10px] font-mono font-bold">
                                          <ShieldCheck size={10} className="text-teal-700" /> CRÉDITO LOCAL PRESERVADO
                                        </span>
                                      )}
                                      {credit.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-mono font-bold">
                                          <ShieldCheck size={10} className="text-emerald-700" /> JÁ NO ACERVO (IDÊNTICO)
                                        </span>
                                      )}
                                      {credit.localCreditComparisonStatus === 'NEW_CREDIT' && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-mono">
                                          + NOVO CRÉDITO
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-xs text-[#1A1A1A]/80 font-serif-body mt-0.5">
                                    <span>Papel: </span>
                                    <strong className="text-[#1A1A1A]">{credit.characterName || 'Elenco'}</strong>
                                    <span className="text-[#1A1A1A]/40 mx-1.5">•</span>
                                    <span className="text-[#1A1A1A]/60">Departamento: {credit.department} (role: {credit.role || 'Elenco'})</span>
                                  </div>

                                  {/* EXPLICAÇÃO DE PRESERVAÇÃO SEMÂNTICA */}
                                  {credit.semanticEquivalenceReason && (
                                    <div className="mt-1.5 px-2.5 py-1 bg-teal-50/70 border border-teal-200 text-[11px] text-teal-950 font-serif-body flex items-center gap-1.5">
                                      <ShieldCheck size={12} className="text-teal-700 shrink-0" />
                                      <span><strong>Preservação Canônica:</strong> {credit.semanticEquivalenceReason}</span>
                                    </div>
                                  )}

                                  {/* PAINEL DE DECISÃO DE IDENTIDADE (LADO A LADO) PARA POSSIBLE_LOCAL_MATCH */}
                                  {person?.status === 'POSSIBLE_LOCAL_MATCH' && isSelected && (
                                    <div className="mt-3 p-3 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-2.5">
                                      <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center justify-between">
                                        <span>Confirmar Identidade do Profissional:</span>
                                        {decision?.action === 'LINK_EXISTING' && (
                                          <span className="text-emerald-800 font-bold font-mono text-[10px] flex items-center gap-1">
                                            ✓ Vinculado a {decision.localPersonName}
                                          </span>
                                        )}
                                        {decision?.action === 'CREATE_NEW' && (
                                          <span className="text-blue-800 font-bold font-mono text-[10px] flex items-center gap-1">
                                            ✓ Criar como nova pessoa
                                          </span>
                                        )}
                                      </div>

                                      {/* Comparativo lado a lado */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {/* Card TMDB */}
                                        <div className="p-2.5 bg-white border border-[#1A1A1A]/10 space-y-1">
                                          <span className="text-[9px] font-mono font-bold uppercase text-[#1A1A1A]/50 block">
                                            Origem TMDB
                                          </span>
                                          <div className="font-serif-display font-semibold text-[#1A1A1A]">
                                            {person.name}
                                          </div>
                                          <div className="text-[10px] font-mono text-[#1A1A1A]/60">
                                            TMDB ID #{person.tmdbPersonId} • {person.knownForDepartment}
                                          </div>
                                        </div>

                                        {/* Card Acervo Local Sugerido */}
                                        {person.suggestedCandidates[0] && (
                                          <div className="p-2.5 bg-white border border-[#1A1A1A]/10 space-y-1">
                                            <span className="text-[9px] font-mono font-bold uppercase text-amber-800 block">
                                              Registro Local Sugerido
                                            </span>
                                            <div className="font-serif-display font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                                              <span>{person.suggestedCandidates[0].name}</span>
                                              <span className="text-[9px] font-mono text-stone-500">
                                                ({person.suggestedCandidates[0].status})
                                              </span>
                                            </div>
                                            <div className="text-[10px] font-serif-body text-[#1A1A1A]/70">
                                              Cargos locais: {person.suggestedCandidates[0].existingRolesInFilm?.join(', ') || 'Sem créditos prévios'}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Botões de Ação de Identidade */}
                                      <div className="flex items-center gap-2 pt-1">
                                        {person.suggestedCandidates[0] && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setPersonDecision(
                                                person.tmdbPersonId,
                                                'LINK_EXISTING',
                                                person.suggestedCandidates[0].localPersonId,
                                                person.suggestedCandidates[0].name
                                              )
                                            }
                                            className={`px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                              decision?.action === 'LINK_EXISTING'
                                                ? 'bg-[#1A1A1A] text-[#F5F2ED] shadow-xs'
                                                : 'bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-[#1A1A1A]'
                                            }`}
                                          >
                                            <LinkIcon size={12} className="text-[#D4AF37]" />
                                            <span>Vincular à Pessoa Existente</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPersonDecision(person.tmdbPersonId, 'CREATE_NEW')
                                          }
                                          className={`px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                            decision?.action === 'CREATE_NEW'
                                              ? 'bg-blue-900 text-white shadow-xs'
                                              : 'bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-[#1A1A1A]'
                                          }`}
                                        >
                                          <UserPlus size={12} />
                                          <span>Não é a Mesma Pessoa (Criar Nova)</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* PAINEL DE DECISÃO PARA AMBIGUOUS */}
                                  {person?.status === 'AMBIGUOUS' && isSelected && (
                                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 space-y-2.5">
                                      <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-purple-950">
                                        Múltiplos candidatos locais encontrados. Escolha uma opção:
                                      </div>
                                      <div className="space-y-1.5">
                                        {person.suggestedCandidates.map((candidate) => (
                                          <button
                                            key={candidate.localPersonId}
                                            type="button"
                                            onClick={() =>
                                              setPersonDecision(
                                                person.tmdbPersonId,
                                                'LINK_EXISTING',
                                                candidate.localPersonId,
                                                candidate.name
                                              )
                                            }
                                            className={`w-full text-left p-2 border text-xs flex items-center justify-between transition-all ${
                                              decision?.localPersonId === candidate.localPersonId
                                                ? 'bg-purple-900 text-white border-purple-900'
                                                : 'bg-white border-purple-200 hover:border-purple-400 text-purple-950'
                                            }`}
                                          >
                                            <div>
                                              <strong className="block">{candidate.name}</strong>
                                              <span className="text-[10px] opacity-80">
                                                Cargos: {candidate.existingRolesInFilm?.join(', ') || 'Sem créditos prévios'} • {candidate.status}
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-mono font-bold uppercase">
                                              {decision?.localPersonId === candidate.localPersonId ? '✓ Selecionado' : 'Vincular'}
                                            </span>
                                          </button>
                                        ))}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPersonDecision(person.tmdbPersonId, 'CREATE_NEW')
                                          }
                                          className={`w-full text-left p-2 border text-xs flex items-center justify-between transition-all ${
                                            decision?.action === 'CREATE_NEW'
                                              ? 'bg-blue-900 text-white border-blue-900'
                                              : 'bg-white border-purple-200 hover:border-blue-400 text-purple-950'
                                          }`}
                                        >
                                          <span>Nenhuma destas — Criar como nova pessoa (draft)</span>
                                          <span className="text-[10px] font-mono font-bold uppercase">
                                            {decision?.action === 'CREATE_NEW' ? '✓ Selecionado' : 'Criar Nova'}
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* EXPANSÃO DO ELENCO */}
                      {castCredits.length > 8 && (
                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedCast(!expandedCast)}
                            className="px-4 py-2 bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] inline-flex items-center gap-1.5 transition-colors"
                          >
                            {expandedCast ? (
                              <>
                                <ChevronUp size={14} /> Recolher Elenco Principal
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} /> Ver Elenco Completo ({castCredits.length} integrantes)
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ========================================================== */}
                  {/* TAB 2: EQUIPE TÉCNICA                                      */}
                  {/* ========================================================== */}
                  {activeTab === 'crew' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 border border-[#1A1A1A]/10">
                        <div>
                          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                            Curadoria da Equipe Técnica ({crewCredits.length} créditos no TMDB)
                          </h3>
                          <p className="text-[11px] font-serif-body text-[#1A1A1A]/70 mt-0.5">
                            Organizada por departamento. Por padrão, Direção, Roteiro, Fotografia, Montagem e Música são pré-selecionados.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleAllInList(crewCredits)}
                            className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] hover:text-[#D4AF37] px-2 py-1 bg-[#F5F2ED] border border-[#1A1A1A]/15"
                          >
                            {crewCredits.every((c) => selectedCreditIds.has(c.id)) ? 'Desmarcar Todos' : 'Marcar Todos'}
                          </button>
                        </div>
                      </div>

                      {/* SEÇÕES POR DEPARTAMENTO */}
                      {orderedDepartments
                        .filter((dept) => expandedCrew || PRIMARY_CREW_DEPARTMENTS.includes(dept))
                        .map((department) => {
                          const deptCredits = crewByDepartment.get(department) || [];
                          const isPrimary = PRIMARY_CREW_DEPARTMENTS.includes(department);

                          return (
                            <div key={department} className="space-y-2.5">
                              <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-1.5">
                                <h4 className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-[#D4AF37] flex items-center gap-2">
                                  <span>{department}</span>
                                  <span className="text-[10px] font-mono text-[#1A1A1A]/50 bg-white px-1.5 py-0.2 border border-[#1A1A1A]/10">
                                    {deptCredits.filter((c) => selectedCreditIds.has(c.id)).length}/{deptCredits.length}
                                  </span>
                                  {isPrimary && (
                                    <span className="text-[9px] font-mono text-[#1A1A1A]/40 uppercase tracking-normal">
                                      (Principal)
                                    </span>
                                  )}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => toggleAllInList(deptCredits)}
                                  className="text-[10px] font-sans font-medium uppercase text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                                >
                                  {deptCredits.every((c) => selectedCreditIds.has(c.id)) ? 'Desmarcar dept.' : 'Marcar dept.'}
                                </button>
                              </div>

                              <div className="space-y-2">
                                {deptCredits.map((credit) => {
                                  const isSelected = selectedCreditIds.has(credit.id);
                                  const person = credit.tmdbPersonId ? peopleMap.get(credit.tmdbPersonId) : null;
                                  const decision = credit.tmdbPersonId ? personDecisions.get(credit.tmdbPersonId) : undefined;
                                  const isUndecided = isSelected && (person?.status === 'POSSIBLE_LOCAL_MATCH' || person?.status === 'AMBIGUOUS') && !decision;

                                  return (
                                    <div
                                      key={credit.id}
                                      className={`p-3 bg-white border transition-all ${
                                        isUndecided
                                          ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400'
                                          : isSelected
                                          ? 'border-[#1A1A1A] shadow-xs'
                                          : 'border-[#1A1A1A]/15 opacity-75 hover:opacity-100'
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <button
                                          type="button"
                                          onClick={() => toggleCreditSelection(credit.id)}
                                          className={`mt-1 w-5 h-5 border flex items-center justify-center transition-colors shrink-0 ${
                                            isSelected
                                              ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#D4AF37]'
                                              : 'bg-white border-[#1A1A1A]/30 hover:border-[#1A1A1A]'
                                          }`}
                                          aria-label={isSelected ? 'Desmarcar crédito' : 'Marcar crédito'}
                                        >
                                          {isSelected && <Check size={14} strokeWidth={3} />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-serif-display text-sm font-bold text-[#1A1A1A]">
                                                {credit.personName}
                                              </span>
                                              <span className="text-xs text-[#1A1A1A]/60 font-serif-body">
                                                — {credit.role || 'Equipe'}
                                              </span>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              {person?.status === 'EXACT_TMDB_MATCH' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                                                  <LinkIcon size={10} /> JÁ VINCULADO
                                                </span>
                                              )}
                                              {person?.status === 'POSSIBLE_LOCAL_MATCH' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold">
                                                  <HelpCircle size={10} /> POSSÍVEL CORRESPONDÊNCIA
                                                </span>
                                              )}
                                              {person?.status === 'AMBIGUOUS' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-mono font-bold">
                                                  <AlertCircle size={10} /> CORRESPONDÊNCIA AMBÍGUA
                                                </span>
                                              )}
                                              {person?.status === 'NEW_PERSON' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-mono font-bold">
                                                  <UserPlus size={10} /> NOVA PESSOA
                                                </span>
                                              )}

                                              {/* Status Semântico de Crédito */}
                                              {credit.localCreditComparisonStatus === 'SEMANTIC_LOCAL_CREDIT' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-950 border border-teal-300 text-[10px] font-mono font-bold">
                                                  <ShieldCheck size={10} className="text-teal-700" /> CRÉDITO LOCAL PRESERVADO
                                                </span>
                                              )}
                                              {credit.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-mono font-bold">
                                                  <ShieldCheck size={10} className="text-emerald-700" /> JÁ NO ACERVO (IDÊNTICO)
                                                </span>
                                              )}
                                              {credit.localCreditComparisonStatus === 'NEW_CREDIT' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-mono">
                                                  + NOVO CRÉDITO
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* EXPLICAÇÃO DE PRESERVAÇÃO SEMÂNTICA */}
                                          {credit.semanticEquivalenceReason && (
                                            <div className="mt-1.5 px-2.5 py-1 bg-teal-50/70 border border-teal-200 text-[11px] text-teal-950 font-serif-body flex items-center gap-1.5">
                                              <ShieldCheck size={12} className="text-teal-700 shrink-0" />
                                              <span><strong>Preservação Canônica:</strong> {credit.semanticEquivalenceReason}</span>
                                            </div>
                                          )}

                                          {/* DECISÃO COMPARTILHADA DE IDENTIDADE */}
                                          {person?.status === 'POSSIBLE_LOCAL_MATCH' && isSelected && (
                                            <div className="mt-2.5 p-2.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-2">
                                              <div className="flex items-center justify-between text-[10px] font-sans font-bold uppercase text-[#1A1A1A]">
                                                <span>Identidade compartilhada (TMDB #{person.tmdbPersonId}):</span>
                                                {decision?.action === 'LINK_EXISTING' ? (
                                                  <span className="text-emerald-800 font-mono">
                                                    ✓ Vinculado a {decision.localPersonName}
                                                  </span>
                                                ) : decision?.action === 'CREATE_NEW' ? (
                                                  <span className="text-blue-800 font-mono">
                                                    ✓ Criar nova pessoa
                                                  </span>
                                                ) : (
                                                  <span className="text-amber-800 font-mono">
                                                    Pendente de decisão
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-2">
                                                {person.suggestedCandidates[0] && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setPersonDecision(
                                                        person.tmdbPersonId,
                                                        'LINK_EXISTING',
                                                        person.suggestedCandidates[0].localPersonId,
                                                        person.suggestedCandidates[0].name
                                                      )
                                                    }
                                                    className={`px-2.5 py-1 text-[11px] font-sans font-bold uppercase flex items-center gap-1 transition-all ${
                                                      decision?.action === 'LINK_EXISTING'
                                                        ? 'bg-[#1A1A1A] text-[#F5F2ED]'
                                                        : 'bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-[#1A1A1A]'
                                                    }`}
                                                  >
                                                    <LinkIcon size={11} className="text-[#D4AF37]" />
                                                    <span>Vincular a "{person.suggestedCandidates[0].name}"</span>
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setPersonDecision(person.tmdbPersonId, 'CREATE_NEW')
                                                  }
                                                  className={`px-2.5 py-1 text-[11px] font-sans font-bold uppercase flex items-center gap-1 transition-all ${
                                                    decision?.action === 'CREATE_NEW'
                                                      ? 'bg-blue-900 text-white'
                                                      : 'bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-[#1A1A1A]'
                                                  }`}
                                                >
                                                  <UserPlus size={11} />
                                                  <span>Criar como Nova Pessoa</span>
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                      {/* TOGGLE EXPANDIR TODA A EQUIPE */}
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setExpandedCrew(!expandedCrew)}
                          className="px-4 py-2 bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] inline-flex items-center gap-1.5 transition-colors"
                        >
                          {expandedCrew ? (
                            <>
                              <ChevronUp size={14} /> Mostrar Apenas Departamentos Principais
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} /> Ver Equipe Completa (Todos os Departamentos TMDB)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ========================================================== */}
                  {/* TAB 3: CRÉDITOS LOCAIS PRESERVADOS                         */}
                  {/* ========================================================== */}
                  {activeTab === 'local_preserved' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
                        <div className="flex items-center gap-2 font-sans font-bold text-xs uppercase tracking-wider text-emerald-900">
                          <ShieldCheck size={16} /> Garantia Arquitetural de Preservação (Zero Delete)
                        </div>
                        <p className="text-xs font-serif-body text-emerald-900">
                          Estes créditos já pertencem ao acervo Lanterna Mágica e não serão removidos por esta atualização. 
                          Mesmo que algum deles não esteja selecionado no TMDB, o acervo local mantém intactas todas as atribuições históricas.
                        </p>
                      </div>

                      <div className="space-y-2">
                        {reconcileData.localOnlyCredits.length === 0 ? (
                          <div className="p-6 bg-white border border-[#1A1A1A]/10 text-center text-xs text-[#1A1A1A]/60 font-serif-body">
                            Nenhum crédito local prévio exclusivo necessita de preservação isolada.
                          </div>
                        ) : (
                          reconcileData.localOnlyCredits.map((localCredit) => (
                            <div
                              key={localCredit.localCreditId}
                              className="p-3 bg-white border border-[#1A1A1A]/15 flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="font-serif-display text-sm font-bold text-[#1A1A1A]">
                                  {localCredit.personName}
                                </div>
                                <div className="text-xs text-[#1A1A1A]/70 font-serif-body">
                                  {localCredit.department} — {localCredit.role || localCredit.characterName || 'Crédito canônico'}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-mono font-bold uppercase border border-emerald-300">
                                Preservado no Acervo
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* STEP 2: REVISÃO DA SELEÇÃO (READ-ONLY)                        */}
              {/* ============================================================== */}
              {step === 'REVIEW_ONLY' && (
                <div className="space-y-6">
                  {/* CABEÇALHO DA REVISÃO */}
                  <div className="border-b border-[#1A1A1A]/15 pb-3">
                    <h3 className="font-serif-display text-base font-bold text-[#1A1A1A]">
                      Revisão da Reconciliação de Elenco e Equipe
                    </h3>
                    <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-1">
                      Confira o resumo das decisões de identidade e créditos antes da futura confirmação. 
                      Nenhuma alteração foi realizada no banco de dados.
                    </p>
                  </div>

                  {/* CARDS DE IMPACTO */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 bg-white border border-[#1A1A1A]/15">
                      <span className="text-[9px] font-sans font-bold uppercase text-[#1A1A1A]/60 block">
                        Pessoas a Vincular
                      </span>
                      <div className="font-serif-display text-lg font-bold text-emerald-800">
                        {plannedPayload.personsToLink.length}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-[#1A1A1A]/15">
                      <span className="text-[9px] font-sans font-bold uppercase text-[#1A1A1A]/60 block">
                        Novas Pessoas (Draft)
                      </span>
                      <div className="font-serif-display text-lg font-bold text-blue-800">
                        {plannedPayload.personsToCreate.length}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-[#1A1A1A]/15">
                      <span className="text-[9px] font-sans font-bold uppercase text-[#1A1A1A]/60 block">
                        Novos Créditos
                      </span>
                      <div className="font-serif-display text-lg font-bold text-[#1A1A1A]">
                        {plannedPayload.creditsInsertedCount}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-[#1A1A1A]/15">
                      <span className="text-[9px] font-sans font-bold uppercase text-[#1A1A1A]/60 block">
                        Locais Preservados
                      </span>
                      <div className="font-serif-display text-lg font-bold text-teal-800">
                        {plannedPayload.creditsUpdatedCount}
                        <span className="text-[10px] font-sans font-normal text-[#1A1A1A]/60 ml-1">
                          ({plannedPayload.creditsSemanticPreservedCount} semânt. + {plannedPayload.creditsExactCount} idênt.)
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-[#1A1A1A]/15">
                      <span className="text-[9px] font-sans font-bold uppercase text-[#1A1A1A]/60 block">
                        Total Acervo Local
                      </span>
                      <div className="font-serif-display text-lg font-bold text-emerald-700">
                        {reconcileData.summary.totalLocalCredits}
                      </div>
                    </div>
                  </div>

                  {/* 1. VINCULAÇÕES DE IDENTIDADE */}
                  <div className="space-y-2">
                    <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                      <LinkIcon size={13} /> 1. Vinculações de Identidade ({plannedPayload.personsToLink.length})
                    </h4>
                    {plannedPayload.personsToLink.length === 0 ? (
                      <p className="text-xs text-[#1A1A1A]/50 italic font-serif-body bg-white p-3 border border-[#1A1A1A]/10">
                        Nenhuma pessoa local será vinculada nesta operação.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {plannedPayload.personsToLink.map((link) => (
                          <div
                            key={link.tmdbPersonId}
                            className="p-2.5 bg-white border border-[#1A1A1A]/15 text-xs flex items-center justify-between"
                          >
                            <div>
                              <strong className="text-[#1A1A1A]">{link.tmdbName}</strong>
                              <span className="text-[10px] font-mono text-[#1A1A1A]/50 ml-1.5">
                                (TMDB #{link.tmdbPersonId})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-800 font-medium">
                              <ArrowRight size={12} />
                              <span>{link.localPersonName}</span>
                              <span className="text-[9px] font-mono text-stone-500">({link.localPersonId.slice(0, 8)}...)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. NOVAS PESSOAS A CRIAR COMO RASCUNHO */}
                  <div className="space-y-2">
                    <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <UserPlus size={13} /> 2. Novas Pessoas a Criar como Rascunho ({plannedPayload.personsToCreate.length})
                    </h4>
                    {plannedPayload.personsToCreate.length === 0 ? (
                      <p className="text-xs text-[#1A1A1A]/50 italic font-serif-body bg-white p-3 border border-[#1A1A1A]/10">
                        Nenhuma nova pessoa será criada no acervo.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {plannedPayload.personsToCreate.map((p) => (
                          <div
                            key={p.tmdbPersonId}
                            className="p-2.5 bg-white border border-[#1A1A1A]/15 text-xs flex items-center justify-between"
                          >
                            <div>
                              <strong className="text-[#1A1A1A]">{p.name}</strong>
                              <span className="text-[10px] font-mono text-[#1A1A1A]/50 block">
                                TMDB #{p.tmdbPersonId} • {p.knownForDepartment}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-mono uppercase font-bold">
                              Rascunho
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. CRÉDITOS SELECIONADOS PARA SINCRONIZAÇÃO */}
                  <div className="space-y-2">
                    <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                      <Layers size={13} /> 3. Créditos Selecionados para Sincronização ({plannedPayload.creditsToSync.length})
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {plannedPayload.creditsToSync.map((credit) => (
                        <div
                          key={credit.id}
                          className="p-2.5 bg-white border border-[#1A1A1A]/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-serif-display font-semibold text-[#1A1A1A]">
                                {credit.personName}
                              </span>
                              <span className="text-[11px] text-[#1A1A1A]/70 font-serif-body">
                                — {credit.department} ({credit.characterName || credit.role || 'Crédito'})
                              </span>
                            </div>
                            {credit.semanticEquivalenceReason && (
                              <div className="text-[10px] text-teal-900 font-serif-body mt-0.5">
                                ↳ {credit.semanticEquivalenceReason}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {credit.localCreditComparisonStatus === 'SEMANTIC_LOCAL_CREDIT' && (
                              <span className="px-1.5 py-0.2 bg-teal-50 text-teal-950 border border-teal-300 text-[9px] font-mono font-bold">
                                PRESERVADO CANÔNICO
                              </span>
                            )}
                            {credit.localCreditComparisonStatus === 'EXACT_LOCAL_CREDIT' && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-950 border border-emerald-300 text-[9px] font-mono font-bold">
                                JÁ NO ACERVO
                              </span>
                            )}
                            {credit.localCreditComparisonStatus === 'NEW_CREDIT' && (
                              <span className="px-1.5 py-0.2 bg-stone-100 text-stone-700 border border-stone-200 text-[9px] font-mono">
                                NOVO CRÉDITO
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                              Ordem #{credit.orderIndex + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ALERTA DE ERRO DE SINCRONIZAÇÃO */}
                  {syncError && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                      <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="font-bold uppercase tracking-wider block">Falha na Sincronização</strong>
                        <p className="font-serif-body">{syncError}</p>
                      </div>
                    </div>
                  )}

                  {/* RESULTADO DE SUCESSO */}
                  {syncSuccessResult && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-emerald-900">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        Sincronização Realizada com Sucesso!
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                        <div className="p-2 bg-white border border-emerald-200">
                          <span className="text-emerald-700 block">Pessoas Criadas:</span>
                          <strong className="text-sm">{syncSuccessResult.createdPeopleCount ?? 0}</strong>
                        </div>
                        <div className="p-2 bg-white border border-emerald-200">
                          <span className="text-emerald-700 block">Pessoas Vinculadas:</span>
                          <strong className="text-sm">{syncSuccessResult.linkedPeopleCount ?? 0}</strong>
                        </div>
                        <div className="p-2 bg-white border border-emerald-200">
                          <span className="text-emerald-700 block">Novos Créditos:</span>
                          <strong className="text-sm">{syncSuccessResult.insertedCreditsCount ?? 0}</strong>
                        </div>
                        <div className="p-2 bg-white border border-emerald-200">
                          <span className="text-emerald-700 block">Total no Filme:</span>
                          <strong className="text-sm">
                            {(reconcileData?.summary?.totalLocalCredits ?? 0) + (syncSuccessResult.insertedCreditsCount ?? 0)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAINEL DE CONFIRMAÇÃO CONSCIENTE */}
                  {!syncSuccessResult && (
                    <div className="p-4 bg-amber-50/90 border border-amber-300 text-xs space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 text-amber-950 font-bold font-sans uppercase tracking-wider text-[11px]">
                        <ShieldCheck size={16} className="text-amber-700 shrink-0" />
                        <span>Confirmação Explícita de Sincronização</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-serif-body text-[#1A1A1A]">
                        <div className="flex items-center gap-1.5 bg-white/90 p-2 border border-amber-200">
                          <Check size={14} className="text-emerald-700 shrink-0" />
                          <span><strong>{plannedPayload.personsToLink.length} pessoas existentes</strong> serão vinculadas ao TMDB</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/90 p-2 border border-amber-200">
                          <Check size={14} className="text-emerald-700 shrink-0" />
                          <span><strong>{plannedPayload.personsToCreate.length} novas pessoas</strong> serão cadastradas no acervo</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/90 p-2 border border-amber-200">
                          <Check size={14} className="text-emerald-700 shrink-0" />
                          <span><strong>{plannedPayload.creditsInsertedCount} novos créditos</strong> serão adicionados ao filme</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/90 p-2 border border-amber-200">
                          <Check size={14} className="text-emerald-700 shrink-0" />
                          <span><strong>{plannedPayload.creditsSemanticPreservedCount + plannedPayload.creditsExactCount} créditos locais</strong> existentes serão preservados</span>
                        </div>
                      </div>

                      <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={confirmChecked}
                          onChange={(e) => setConfirmChecked(e.target.checked)}
                          disabled={isSubmitting}
                          className="mt-0.5 rounded-xs border-amber-400 text-[#1A1A1A] focus:ring-amber-500 w-4 h-4"
                        />
                        <span className="text-[#1A1A1A] font-serif-body text-xs leading-relaxed">
                          Estou ciente e confirmo a execução da sincronização real de <strong>{totalSelectedCount} créditos</strong> para o filme <em>{filmTitle || reconcileData?.film?.title || 'selecionado'}</em>.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ==================================================================== */}
        {/* MODAL FOOTER                                                        */}
        {/* ==================================================================== */}
        <div className="p-4 bg-[#F5F2ED] border-t border-[#1A1A1A]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#1A1A1A]/70 font-serif-body">
            {step === 'SELECTION_AND_RECONCILIATION' && (
              <span>
                <strong>{totalSelectedCount}</strong> crédito(s) selecionado(s) para sincronização.
              </span>
            )}
            {step === 'REVIEW_ONLY' && (
              <span className="text-blue-900 font-medium">
                {syncSuccessResult
                  ? 'Sincronização concluída com sucesso no banco de dados.'
                  : 'Pronto para sincronização: revise as alterações acima e confirme a execução.'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            {step === 'SELECTION_AND_RECONCILIATION' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    totalSelectedCount === 0 ||
                    undecidedSelectedPeople.length > 0 ||
                    loading ||
                    !!error
                  }
                  onClick={() => setStep('REVIEW_ONLY')}
                  className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <span>Revisar Seleção</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}

            {step === 'REVIEW_ONLY' && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('SELECTION_AND_RECONCILIATION')}
                  className="px-4 py-2 bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft size={14} />
                  <span>Voltar e Ajustar</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSync}
                  disabled={!confirmChecked || isSubmitting || !!syncSuccessResult || totalSelectedCount === 0}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  title={
                    !confirmChecked
                      ? 'Marque a confirmação consciente acima para habilitar'
                      : `Executar sincronização real de ${totalSelectedCount} créditos no Supabase`
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sincronizando {totalSelectedCount} créditos...</span>
                    </>
                  ) : syncSuccessResult ? (
                    <>
                      <Check size={14} />
                      <span>Sincronizado com Sucesso ({totalSelectedCount} créditos)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Sincronizar {totalSelectedCount} créditos</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
