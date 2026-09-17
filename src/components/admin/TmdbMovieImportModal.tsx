// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Componente de Pesquisa, Preview e Importação Controlada de Filmes via TMDB (F10.3)
// Arquivo: src/components/admin/TmdbMovieImportModal.tsx
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Film,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Clock,
  Globe,
  Tag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  PlusCircle,
  Check,
} from 'lucide-react';
import {
  searchTmdbMovies,
  getTmdbMovieDetails,
  importTmdbMovie,
  linkTmdbMovie,
  TmdbMovieSummary,
  TmdbMovieDetails,
  TmdbMovieImportResult,
  TmdbMovieLinkResult,
} from '../../services/tmdbApiClient';
import { SupabaseFilme } from '../../services/repositories/filmesRepository';
import { Link as LinkIcon, HelpCircle, ShieldCheck } from 'lucide-react';

function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Localiza possível correspondência entre filmes locais sem TMDB ID e o resultado da busca
 * Ordem de Prioridade Segura (F10.3H):
 * A. original_title normalizado + ano
 * B. title normalizado + ano
 * C. Cruzamento seguro com ano: TMDB original_title <-> local title / TMDB title <-> local original_title
 */
export function findLocalCandidateMatch(
  tmdbItem: TmdbMovieSummary,
  existingFilmes: SupabaseFilme[]
): SupabaseFilme | null {
  if (!existingFilmes || existingFilmes.length === 0) return null;

  // Filtrar estritamente filmes locais SEM tmdb_id
  const candidates = existingFilmes.filter((f) => !f.tmdb_id);
  if (candidates.length === 0) return null;

  const tmdbTitleNorm = normalizeText(tmdbItem.title);
  const tmdbOrigTitleNorm = normalizeText(tmdbItem.originalTitle);
  const tmdbYear = tmdbItem.year;

  // Prioridade A: original_title normalizado + year
  if (tmdbOrigTitleNorm && tmdbYear) {
    const matchA = candidates.find((f) => {
      const localOrigNorm = normalizeText(f.original_title);
      return localOrigNorm && localOrigNorm === tmdbOrigTitleNorm && f.year === tmdbYear;
    });
    if (matchA) return matchA;
  }

  // Prioridade B: title normalizado + year
  if (tmdbTitleNorm && tmdbYear) {
    const matchB = candidates.find((f) => {
      const localTitleNorm = normalizeText(f.title);
      return localTitleNorm && localTitleNorm === tmdbTitleNorm && f.year === tmdbYear;
    });
    if (matchB) return matchB;
  }

  // Prioridade C: Cruzamentos seguros com year
  if (tmdbYear) {
    // TMDB original_title <-> Local title
    if (tmdbOrigTitleNorm) {
      const matchC1 = candidates.find((f) => {
        const localTitleNorm = normalizeText(f.title);
        return localTitleNorm && localTitleNorm === tmdbOrigTitleNorm && f.year === tmdbYear;
      });
      if (matchC1) return matchC1;
    }

    // TMDB title <-> Local original_title
    if (tmdbTitleNorm) {
      const matchC2 = candidates.find((f) => {
        const localOrigNorm = normalizeText(f.original_title);
        return localOrigNorm && localOrigNorm === tmdbTitleNorm && f.year === tmdbYear;
      });
      if (matchC2) return matchC2;
    }
  }

  return null;
}

interface TmdbMovieImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingFilmes: SupabaseFilme[];
  onImportSuccess: (importedFilmId: string) => void;
  onOpenExistingFilm: (film: SupabaseFilme) => void;
  onManualCreate: () => void;
  onNotify: (msg: string) => void;
}

export const TmdbMovieImportModal: React.FC<TmdbMovieImportModalProps> = ({
  isOpen,
  onClose,
  existingFilmes,
  onImportSuccess,
  onOpenExistingFilm,
  onManualCreate,
  onNotify,
}) => {
  // Search state
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbMovieSummary[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Preview state
  const [previewMovieId, setPreviewMovieId] = useState<number | null>(null);
  const [previewDetails, setPreviewDetails] = useState<TmdbMovieDetails | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Reconciliação / Vínculo de candidatos locais sem TMDB ID (F10.3H)
  const [dismissedCandidateTmdbIds, setDismissedCandidateTmdbIds] = useState<Set<number>>(new Set());
  const [linkingCandidate, setLinkingCandidate] = useState<{
    tmdbItem: TmdbMovieSummary;
    localFilm: SupabaseFilme;
  } | null>(null);
  const [linkingInProgress, setLinkingInProgress] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus search input on open
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when closing
      setQuery('');
      setYear('');
      setSearchResults([]);
      setSearchError(null);
      setHasSearched(false);
      setPreviewMovieId(null);
      setPreviewDetails(null);
      setLoadingPreview(false);
      setPreviewError(null);
      setImporting(false);
      setImportError(null);
      setDismissedCandidateTmdbIds(new Set());
      setLinkingCandidate(null);
      setLinkingInProgress(false);
      setLinkError(null);
    }
  }, [isOpen]);

  // Debounced search trigger
  const executeSearch = useCallback(async (searchQuery: string, searchYearStr: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setHasSearched(true);

    let parsedYear: number | undefined = undefined;
    if (searchYearStr.trim()) {
      const y = parseInt(searchYearStr.trim(), 10);
      if (!isNaN(y) && y >= 1880 && y <= 2100) {
        parsedYear = y;
      }
    }

    try {
      const res = await searchTmdbMovies({
        query: trimmedQuery,
        year: parsedYear,
      });
      setSearchResults(res.results || []);
    } catch (err: any) {
      console.error('[TmdbMovieImportModal] Erro na busca TMDB:', err);
      setSearchError(err.message || 'Erro ao conectar à API do TMDB.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Handle Query change with 350ms debounce
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      executeSearch(val, year);
    }, 350);
  };

  // Handle Year change
  const handleYearChange = (val: string) => {
    setYear(val);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      executeSearch(query, val);
    }, 350);
  };

  // Check if a TMDB Movie is already in database
  const getExistingFilm = (tmdbId: number): SupabaseFilme | undefined => {
    return existingFilmes.find((f) => f.tmdb_id === tmdbId);
  };

  // Open Preview Modal for a candidate
  const handleOpenPreview = async (summary: TmdbMovieSummary) => {
    setPreviewMovieId(summary.tmdbId);
    setLoadingPreview(true);
    setPreviewError(null);
    setImportError(null);

    try {
      const details = await getTmdbMovieDetails(summary.tmdbId);
      setPreviewDetails(details);
    } catch (err: any) {
      console.error('[TmdbMovieImportModal] Erro ao carregar preview do filme:', err);
      setPreviewError(err.message || 'Não foi possível carregar os detalhes do filme no TMDB.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Close Preview and return to Search
  const handleClosePreview = () => {
    setPreviewMovieId(null);
    setPreviewDetails(null);
    setLoadingPreview(false);
    setPreviewError(null);
    setImportError(null);
  };

  // Execute Controlled Import
  const handleConfirmImport = async () => {
    if (!previewMovieId) return;

    setImporting(true);
    setImportError(null);

    try {
      const result: TmdbMovieImportResult = await importTmdbMovie(previewMovieId);
      if (result.success) {
        onNotify(result.alreadyExists ? 'Filme já existente no acervo aberto com sucesso!' : 'Filme importado com sucesso do TMDB para o acervo!');
        onClose();
        onImportSuccess(result.filmId);
      } else {
        setImportError(result.message || 'Falha ao importar o filme.');
      }
    } catch (err: any) {
      console.error('[TmdbMovieImportModal] Falha na importação:', err);
      setImportError(err.message || 'Erro inesperado durante a importação.');
    } finally {
      setImporting(false);
    }
  };

  // Dismiss candidate for current search (F10.3H)
  const handleDismissCandidate = (tmdbId: number) => {
    setDismissedCandidateTmdbIds((prev) => {
      const next = new Set(prev);
      next.add(tmdbId);
      return next;
    });
  };

  // Open confirmation for linking (F10.3H)
  const handleInitiateLink = (tmdbItem: TmdbMovieSummary, localFilm: SupabaseFilme) => {
    setLinkingCandidate({ tmdbItem, localFilm });
    setLinkError(null);
  };

  // Cancel linking confirmation
  const handleCancelLink = () => {
    setLinkingCandidate(null);
    setLinkError(null);
    setLinkingInProgress(false);
  };

  // Execute Link confirmed (F10.3H)
  const handleConfirmLink = async () => {
    if (!linkingCandidate) return;

    setLinkingInProgress(true);
    setLinkError(null);

    try {
      const result: TmdbMovieLinkResult = await linkTmdbMovie(
        linkingCandidate.localFilm.id,
        linkingCandidate.tmdbItem.tmdbId
      );

      if (result.success) {
        onNotify(`Filme "${linkingCandidate.localFilm.title}" vinculado com sucesso ao TMDB ID ${linkingCandidate.tmdbItem.tmdbId}!`);
        setLinkingCandidate(null);
        onClose();
        onImportSuccess(linkingCandidate.localFilm.id);
      } else {
        setLinkError(result.message || 'Falha ao vincular o filme.');
      }
    } catch (err: any) {
      console.error('[TmdbMovieImportModal] Falha na vinculação:', err);
      setLinkError(err.message || 'Erro inesperado ao vincular o filme.');
    } finally {
      setLinkingInProgress(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/80 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-[#FBF9F5] border border-[#1A1A1A]/20 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-[#1A1A1A] text-[#F5F2ED] px-6 py-4 flex items-center justify-between shrink-0 border-b border-[#D4AF37]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]">
              <Film size={18} />
            </div>
            <div>
              <h2 className="font-serif-display text-lg tracking-wide text-[#F5F2ED]">
                {previewMovieId ? 'Revisão e Confirmação de Importação' : 'Adicionar Filme via TMDB'}
              </h2>
              <p className="text-[11px] font-mono text-[#F5F2ED]/70">
                {previewMovieId
                  ? 'Verifique os metadados canônicos antes de registrar no acervo'
                  : 'Pesquisa oficial na base de dados global The Movie Database'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#F5F2ED]/60 hover:text-[#F5F2ED] hover:bg-[#F5F2ED]/10 transition-colors"
            title="Fechar janela"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Search View OR Preview View */}
        {!previewMovieId ? (
          /* ==================================================================== */
          /* VIEW 1: SEARCH & DEDUPLICATION RESULTS                                */
          /* ==================================================================== */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search Controls */}
            <div className="p-5 bg-white border-b border-[#1A1A1A]/10 shrink-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search Query Input */}
                <div className="sm:col-span-9 relative">
                  <Search size={15} className="absolute left-3.5 top-3.5 text-[#1A1A1A]/40" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Digite o título do filme (ex: Persona, O Sétimo Selo, Bacurau)..."
                    className="w-full pl-10 pr-9 py-2.5 bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 text-sm text-[#1A1A1A] font-serif-body focus:bg-white focus:border-[#1A1A1A] outline-none transition-colors"
                  />
                  {query && (
                    <button
                      onClick={() => handleQueryChange('')}
                      className="absolute right-3 top-3 text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Optional Year Input */}
                <div className="sm:col-span-3 relative">
                  <Calendar size={15} className="absolute left-3 top-3.5 text-[#1A1A1A]/40" />
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => handleYearChange(e.target.value)}
                    placeholder="Ano (opcional)"
                    min={1880}
                    max={2100}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 text-sm text-[#1A1A1A] font-mono focus:bg-white focus:border-[#1A1A1A] outline-none"
                  />
                </div>
              </div>

              {/* Status bar & Manual option */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-serif-body text-[#1A1A1A]/70 pt-1">
                <div className="flex items-center gap-2">
                  {searching && (
                    <span className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
                      <Loader2 size={13} className="animate-spin" /> Buscando no TMDB...
                    </span>
                  )}
                  {!searching && hasSearched && (
                    <span>
                      {searchResults.length === 1
                        ? '1 obra encontrada'
                        : `${searchResults.length} obras encontradas`}
                    </span>
                  )}
                  {!searching && !hasSearched && (
                    <span>Insira o título da obra cinematográfica para localizar no catálogo global.</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManualCreate();
                  }}
                  className="text-xs text-[#1A1A1A] font-sans font-bold uppercase tracking-wider hover:text-[#D4AF37] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <PlusCircle size={13} /> Criar manualmente sem TMDB
                </button>
              </div>
            </div>

            {/* Results Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto min-h-0 space-y-3">
              {searchError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <strong className="font-bold">Falha na consulta:</strong> {searchError}
                  </div>
                </div>
              )}

              {!searching && hasSearched && searchResults.length === 0 && !searchError && (
                <div className="text-center py-12 bg-white border border-[#1A1A1A]/10 p-8 space-y-3">
                  <Film size={32} className="mx-auto text-[#1A1A1A]/20" />
                  <p className="font-serif-display text-base text-[#1A1A1A]">
                    Nenhum filme encontrado para &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs font-serif-body text-[#1A1A1A]/60 max-w-md mx-auto">
                    Verifique a grafia do título, tente o título original ou registre manualmente sem vínculo direto.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onManualCreate();
                    }}
                    className="mt-2 px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
                  >
                    Cadastrar Manualmente
                  </button>
                </div>
              )}

              {searchResults.map((item) => {
                const existing = getExistingFilm(item.tmdbId);
                const isAlreadyInAcervo = !!existing;
                const isCandidateDismissed = dismissedCandidateTmdbIds.has(item.tmdbId);
                const candidateMatch = !isAlreadyInAcervo && !isCandidateDismissed
                  ? findLocalCandidateMatch(item, existingFilmes)
                  : null;

                // CASO 1: Já no Acervo com este TMDB ID
                if (isAlreadyInAcervo) {
                  return (
                    <div
                      key={item.tmdbId}
                      className="border p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#F5F2ED]/60 border-[#1A1A1A]/20"
                    >
                      {/* Movie Info & Poster */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-14 h-20 shrink-0 bg-[#1A1A1A]/5 border border-[#1A1A1A]/15 overflow-hidden flex items-center justify-center">
                          {item.posterUrl ? (
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Film size={20} className="text-[#1A1A1A]/30" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-serif-display text-base font-bold text-[#1A1A1A] truncate">
                              {item.title}
                            </h3>
                            {item.year && (
                              <span className="text-xs font-mono px-1.5 py-0.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 text-[#1A1A1A]/80">
                                {item.year}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                              TMDB #{item.tmdbId}
                            </span>
                          </div>

                          {item.originalTitle && item.originalTitle !== item.title && (
                            <p className="text-xs font-serif-body italic text-[#1A1A1A]/70 truncate">
                              {item.originalTitle}
                            </p>
                          )}

                          {item.overview && (
                            <p className="text-xs font-serif-body text-[#1A1A1A]/80 line-clamp-2 leading-relaxed">
                              {item.overview}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-sans font-bold uppercase tracking-wider">
                          <Check size={12} className="text-emerald-700" /> Já no Acervo
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenExistingFilm(existing);
                          }}
                          className="px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-1"
                        >
                          Abrir Ficha <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                }

                // CASO 2: Possível Correspondência com Filme Local sem TMDB ID (F10.3H)
                if (candidateMatch) {
                  return (
                    <div
                      key={item.tmdbId}
                      className="border-2 border-[#D4AF37] bg-[#FFFDF5] p-4.5 space-y-4 shadow-sm transition-all"
                    >
                      {/* Cabeçalho de Alerta de Correspondência */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D4AF37]/30 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#1A1A1A] text-[11px] font-sans font-bold uppercase tracking-wider">
                            <ShieldCheck size={13} className="text-[#997A15]" />
                            Possível Correspondência no Acervo
                          </span>
                        </div>
                        <p className="text-xs font-serif-body text-[#1A1A1A]/80 italic">
                          Detectamos um filme no acervo sem TMDB ID com título e ano correspondentes.
                        </p>
                      </div>

                      {/* Grade Comparativa: TMDB vs Acervo Local */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-[#1A1A1A]/10 p-3.5">
                        {/* Coluna 1: Dados TMDB */}
                        <div className="flex items-start gap-3 border-b md:border-b-0 md:border-r border-[#1A1A1A]/10 pb-3 md:pb-0 md:pr-3">
                          <div className="w-12 h-16 shrink-0 bg-[#1A1A1A]/5 border border-[#1A1A1A]/15 overflow-hidden flex items-center justify-center">
                            {item.posterUrl ? (
                              <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <Film size={18} className="text-[#1A1A1A]/30" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                              Resultado no TMDB
                            </span>
                            <h4 className="font-serif-display text-sm font-bold text-[#1A1A1A] truncate">
                              {item.title}
                            </h4>
                            {item.originalTitle && item.originalTitle !== item.title && (
                              <p className="text-[11px] font-serif-body italic text-[#1A1A1A]/70 truncate">
                                {item.originalTitle}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] font-mono text-[#1A1A1A]/60 pt-0.5">
                              <span>Ano: {item.year || '—'}</span>
                              <span>•</span>
                              <span>TMDB #{item.tmdbId}</span>
                            </div>
                          </div>
                        </div>

                        {/* Coluna 2: Dados do Candidato Local */}
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-16 shrink-0 bg-[#1A1A1A]/5 border border-[#1A1A1A]/15 overflow-hidden flex items-center justify-center">
                            {candidateMatch.poster_url ? (
                              <img src={candidateMatch.poster_url} alt={candidateMatch.title} className="w-full h-full object-cover" />
                            ) : (
                              <Film size={18} className="text-[#1A1A1A]/30" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold">
                              Candidato no Acervo Local
                            </span>
                            <h4 className="font-serif-display text-sm font-bold text-[#1A1A1A] truncate">
                              {candidateMatch.title}
                            </h4>
                            {candidateMatch.original_title && (
                              <p className="text-[11px] font-serif-body italic text-[#1A1A1A]/70 truncate">
                                {candidateMatch.original_title}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] font-mono text-[#1A1A1A]/60 pt-0.5">
                              <span>Ano: {candidateMatch.year}</span>
                              <span>•</span>
                              <span className="truncate max-w-[130px]">UUID: {candidateMatch.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ações de Reconciliação */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDismissCandidate(item.tmdbId)}
                          className="px-3.5 py-2 border border-[#1A1A1A]/20 bg-white text-[#1A1A1A]/80 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 text-xs font-sans font-bold uppercase tracking-wider transition-colors text-center"
                        >
                          Não é o mesmo filme
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInitiateLink(item, candidateMatch)}
                          className="px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-2 shadow-xs"
                        >
                          <LinkIcon size={14} className="text-[#D4AF37]" />
                          <span>Vincular ao Filme Existente</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // CASO 3: Obra Não Cadastrada (ou candidato dispensado)
                return (
                  <div
                    key={item.tmdbId}
                    className="border p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:shadow-xs"
                  >
                    {/* Movie Info & Poster */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="w-14 h-20 shrink-0 bg-[#1A1A1A]/5 border border-[#1A1A1A]/15 overflow-hidden flex items-center justify-center">
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Film size={20} className="text-[#1A1A1A]/30" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif-display text-base font-bold text-[#1A1A1A] truncate">
                            {item.title}
                          </h3>
                          {item.year && (
                            <span className="text-xs font-mono px-1.5 py-0.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 text-[#1A1A1A]/80">
                              {item.year}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                            TMDB #{item.tmdbId}
                          </span>
                        </div>

                        {item.originalTitle && item.originalTitle !== item.title && (
                          <p className="text-xs font-serif-body italic text-[#1A1A1A]/70 truncate">
                            {item.originalTitle}
                          </p>
                        )}

                        {item.overview && (
                          <p className="text-xs font-serif-body text-[#1A1A1A]/80 line-clamp-2 leading-relaxed">
                            {item.overview}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(item)}
                        className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Sparkles size={13} className="text-[#D4AF37]" />
                        <span>Ver Detalhes e Importar</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {!hasSearched && (
                <div className="text-center py-12 bg-white border border-dashed border-[#1A1A1A]/20 p-8 space-y-2">
                  <Search size={28} className="mx-auto text-[#1A1A1A]/30" />
                  <p className="font-serif-display text-sm text-[#1A1A1A]">
                    Busca Direta no Catálogo do TMDB
                  </p>
                  <p className="text-xs font-serif-body text-[#1A1A1A]/60 max-w-sm mx-auto">
                    Digite o nome de uma obra para importar sinopse canônica, pôster em alta resolução, duração, ano, gêneros e países de coprodução.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* VIEW 2: FULL PREVIEW & CONFIRMATION BEFORE WRITING TO DATABASE         */
          /* ==================================================================== */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
              {loadingPreview ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
                  <p className="font-serif-body text-sm text-[#1A1A1A]">
                    Carregando ficha canônica completa do TMDB...
                  </p>
                </div>
              ) : previewError ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <strong>Erro ao carregar detalhes:</strong> {previewError}
                  </div>
                  <button
                    onClick={handleClosePreview}
                    className="px-3 py-1.5 bg-red-800 text-white text-xs font-bold uppercase"
                  >
                    Voltar para a pesquisa
                  </button>
                </div>
              ) : previewDetails ? (
                <div className="space-y-6">
                  {/* Backdrop banner if exists */}
                  {previewDetails.backdropUrl && (
                    <div className="relative h-44 w-full bg-[#1A1A1A] overflow-hidden border border-[#1A1A1A]/20">
                      <img
                        src={previewDetails.backdropUrl}
                        alt={previewDetails.title}
                        className="w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 text-[#F5F2ED]">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37]">
                          Backdrop Canônico
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Main Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Poster column */}
                    <div className="md:col-span-4 space-y-3">
                      <div className="aspect-2/3 w-full bg-[#1A1A1A]/5 border border-[#1A1A1A]/20 overflow-hidden flex items-center justify-center shadow-md">
                        {previewDetails.posterUrl ? (
                          <img
                            src={previewDetails.posterUrl}
                            alt={previewDetails.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film size={48} className="text-[#1A1A1A]/20" />
                        )}
                      </div>

                      <div className="bg-white border border-[#1A1A1A]/10 p-3 space-y-2 text-xs font-mono text-[#1A1A1A]/80">
                        <div className="flex justify-between border-b border-[#1A1A1A]/5 pb-1">
                          <span className="text-[#1A1A1A]/50">TMDB ID:</span>
                          <strong>{previewDetails.tmdbId}</strong>
                        </div>
                        {previewDetails.imdbId && (
                          <div className="flex justify-between border-b border-[#1A1A1A]/5 pb-1">
                            <span className="text-[#1A1A1A]/50">IMDb ID:</span>
                            <strong>{previewDetails.imdbId}</strong>
                          </div>
                        )}
                        <div className="flex justify-between border-b border-[#1A1A1A]/5 pb-1">
                          <span className="text-[#1A1A1A]/50">Idioma Original:</span>
                          <strong className="uppercase">{previewDetails.originalLanguage}</strong>
                        </div>
                        {previewDetails.runtime && (
                          <div className="flex justify-between">
                            <span className="text-[#1A1A1A]/50">Duração:</span>
                            <strong>{previewDetails.runtime} min</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata column */}
                    <div className="md:col-span-8 space-y-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#1A1A1A] text-[10px] font-mono uppercase font-bold">
                            {previewDetails.year || 'Ano Indefinido'}
                          </span>
                          {previewDetails.runtime && (
                            <span className="px-2 py-0.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 text-[#1A1A1A]/70 text-[10px] font-mono">
                              {previewDetails.runtime} min
                            </span>
                          )}
                        </div>
                        <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A] mt-1">
                          {previewDetails.title}
                        </h2>
                        {previewDetails.originalTitle && previewDetails.originalTitle !== previewDetails.title && (
                          <p className="font-serif-body text-sm italic text-[#1A1A1A]/70 mt-0.5">
                            Título Original: {previewDetails.originalTitle}
                          </p>
                        )}
                      </div>

                      {/* Genres */}
                      {previewDetails.genres && previewDetails.genres.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 flex items-center gap-1.5">
                            <Tag size={12} /> Gêneros Fatuais
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {previewDetails.genres.map((g) => (
                              <span
                                key={g.id}
                                className="px-2.5 py-1 bg-white border border-[#1A1A1A]/15 text-xs font-serif-body text-[#1A1A1A]"
                              >
                                {g.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Production Countries */}
                      {previewDetails.productionCountries && previewDetails.productionCountries.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 flex items-center gap-1.5">
                            <Globe size={12} /> Países de Produção
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {previewDetails.productionCountries.map((c) => (
                              <span
                                key={c.iso_3166_1}
                                className="px-2.5 py-1 bg-white border border-[#1A1A1A]/15 text-xs font-serif-body text-[#1A1A1A]"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Synopsis */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70">
                          Sinopse Canônica
                        </label>
                        <div className="bg-white border border-[#1A1A1A]/15 p-4 text-xs font-serif-body text-[#1A1A1A] leading-relaxed max-h-40 overflow-y-auto">
                          {previewDetails.overview || (
                            <span className="italic text-[#1A1A1A]/40">Nenhuma sinopse disponível no TMDB.</span>
                          )}
                        </div>
                      </div>

                      {/* Governance Guarantee Box */}
                      <div className="p-4 bg-[#F5F2ED] border border-[#D4AF37]/40 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase text-[#1A1A1A] tracking-wider">
                          <Sparkles size={14} className="text-[#D4AF37]" />
                          Governança Editorial Lanterna Mágica
                        </div>
                        <ul className="text-[11px] font-serif-body text-[#1A1A1A]/80 space-y-1 list-disc list-inside">
                          <li>O filme será criado como <strong>Rascunho</strong> (não é publicado automaticamente).</li>
                          <li>A <strong>Avaliação Editorial</strong> permanecerá vazia para preenchimento manual da crítica.</li>
                          <li><strong>Créditos e Pessoas não são importados</strong> nesta etapa (F10.3).</li>
                          <li>Gêneros e países serão associados ou cadastrados automaticamente de forma atômica.</li>
                        </ul>
                      </div>

                      {importError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                          <AlertCircle size={15} />
                          <span>{importError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Preview Footer Actions */}
            <div className="p-4 bg-white border-t border-[#1A1A1A]/15 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleClosePreview}
                disabled={importing}
                className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/5 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Voltar à Busca
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || loadingPreview || !previewDetails}
                className="px-6 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
              >
                {importing ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-[#D4AF37]" />
                    <span>Importando Obra...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-[#D4AF37]" />
                    <span>Confirmar e Importar Filme</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* OVERLAY: CONFIRMAÇÃO EXPLÍCITA DE VINCULAÇÃO DE FILME (F10.3H)        */}
        {/* ==================================================================== */}
        {linkingCandidate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#1A1A1A]/85 backdrop-blur-xs animate-fadeIn">
            <div
              className="bg-[#FAF8F5] border border-[#1A1A1A]/30 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 text-[#1A1A1A]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Header */}
              <div className="flex items-start justify-between border-b border-[#1A1A1A]/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37]">
                    <LinkIcon size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif-display text-base font-bold text-[#1A1A1A]">
                      Confirmar Vinculação ao TMDB
                    </h3>
                    <p className="text-[11px] font-mono text-[#1A1A1A]/60">
                      Reconciliação segura sem criar duplicatas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelLink}
                  disabled={linkingInProgress}
                  className="text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Notice Box */}
              <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 text-xs font-serif-body leading-relaxed space-y-1">
                <strong className="block font-bold">
                  Esta ação vinculará o registro existente ao TMDB sem criar um novo filme.
                </strong>
                <p className="text-[11px] text-amber-900/90">
                  Todos os metadados editoriais locais (título, críticas, ensaios, notas, slugs, duração e créditos) serão integralmente preservados. Apenas o identificador externo <code className="font-mono font-bold bg-amber-100 px-1 py-0.5">tmdb_id</code> será gravado.
                </p>
              </div>

              {/* Comparison Details */}
              <div className="bg-white border border-[#1A1A1A]/15 p-4 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 pb-2">
                  <span className="text-[#1A1A1A]/60 font-sans">Filme no Acervo:</span>
                  <strong className="text-[#1A1A1A] text-right font-serif-display text-sm font-bold">
                    {linkingCandidate.localFilm.title} ({linkingCandidate.localFilm.year})
                  </strong>
                </div>

                <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 pb-2">
                  <span className="text-[#1A1A1A]/60 font-sans">UUID Interno:</span>
                  <span className="text-[11px] text-[#1A1A1A]/80 font-mono">
                    {linkingCandidate.localFilm.id}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 pb-2">
                  <span className="text-[#1A1A1A]/60 font-sans">Obra TMDB:</span>
                  <strong className="text-[#1A1A1A] text-right font-serif-display text-sm font-bold">
                    {linkingCandidate.tmdbItem.title} ({linkingCandidate.tmdbItem.year || '—'})
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#1A1A1A]/60 font-sans">TMDB ID:</span>
                  <span className="font-bold text-[#D4AF37] text-sm">
                    #{linkingCandidate.tmdbItem.tmdbId}
                  </span>
                </div>
              </div>

              {linkError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-600" />
                  <span>{linkError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1A1A1A]/10">
                <button
                  type="button"
                  onClick={handleCancelLink}
                  disabled={linkingInProgress}
                  className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  disabled={linkingInProgress}
                  className="px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {linkingInProgress ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                      <span>Vinculando...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon size={14} className="text-[#D4AF37]" />
                      <span>Confirmar Vinculação</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
