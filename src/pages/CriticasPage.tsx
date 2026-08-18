import React, { useState, useMemo, useEffect } from 'react';
import { Menu, X, SlidersHorizontal, Check, RotateCcw, ArrowUpDown, Film, Calendar, Globe, Tag, Loader2, AlertCircle } from 'lucide-react';
import { ArticleCard } from '../components/ArticleCard';
import { Critica } from '../types';
import { fetchCriticas, mapSupabaseCriticaToCritica } from '../services/repositories/criticasRepository';

interface CriticasPageProps {
  onNavigate: (path: string) => void;
}

type SortOption = 'todas' | 'mais_bem_avaliados' | 'mais_mal_avaliados';
type ReleaseFilter = 'todas' | 'lancamentos' | 'arquivo';

export const CriticasPage: React.FC<CriticasPageProps> = ({ onNavigate }) => {
  const [allCriticas, setAllCriticas] = useState<Critica[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await fetchCriticas({ allStatuses: false });
    if (error) {
      setErrorMsg(error.message || 'Erro ao carregar críticas.');
      setAllCriticas([]);
    } else {
      setAllCriticas((data || []).map(mapSupabaseCriticaToCritica));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  // Filter States
  const [isOpen, setIsOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('todas');
  const [releaseFilter, setReleaseFilter] = useState<ReleaseFilter>('todas');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Dynamically extract unique available years from published reviews
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allCriticas.forEach((c) => {
      if (c.year && typeof c.year === 'number') {
        years.add(c.year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allCriticas]);

  // Dynamically extract unique available countries from published reviews
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    allCriticas.forEach((c) => {
      if (c.country) {
        c.country
          .split(/[/,]/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
          .forEach((ctry) => countries.add(ctry));
      }
    });
    return Array.from(countries).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allCriticas]);

  // Dynamically extract unique available genres from published reviews
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    allCriticas.forEach((c) => {
      if (c.genres && c.genres.length > 0) {
        c.genres.forEach((g) => {
          if (g && g.trim()) genres.add(g.trim().toUpperCase());
        });
      } else if (c.genre) {
        c.genre
          .split(/[/,]/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
          .forEach((g) => genres.add(g));
      }
    });
    return Array.from(genres).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allCriticas]);

  // Helpers to toggle multi-select filters
  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const toggleCountry = (country: string) => {
    const normalized = country.toUpperCase();
    setSelectedCountries((prev) =>
      prev.includes(normalized)
        ? prev.filter((c) => c !== normalized)
        : [...prev, normalized]
    );
  };

  const toggleGenre = (genre: string) => {
    const normalized = genre.toUpperCase();
    setSelectedGenres((prev) =>
      prev.includes(normalized)
        ? prev.filter((g) => g !== normalized)
        : [...prev, normalized]
    );
  };

  // Reset all filters to default
  const handleClearAll = () => {
    setSortOption('todas');
    setReleaseFilter('todas');
    setSelectedYears([]);
    setSelectedCountries([]);
    setSelectedGenres([]);
  };

  // Count active filters (excluding default state)
  const activeFiltersCount =
    (sortOption !== 'todas' ? 1 : 0) +
    (releaseFilter !== 'todas' ? 1 : 0) +
    selectedYears.length +
    selectedCountries.length +
    selectedGenres.length;

  // Filter & Sort Logic
  const filteredAndSortedCriticas = useMemo(() => {
    let result = allCriticas.filter((c) => {
      // 1. Release Filter (Lançamentos / Arquivo)
      if (releaseFilter === 'lancamentos' && !c.isNewRelease) return false;
      if (releaseFilter === 'arquivo' && c.isNewRelease) return false;

      // 2. Year Filter
      if (selectedYears.length > 0) {
        if (!selectedYears.includes(c.year)) return false;
      }

      // 3. Country Filter
      if (selectedCountries.length > 0) {
        const itemCountries = (c.country || '')
          .split(/[/,]/)
          .map((s) => s.trim().toUpperCase());
        const hasMatch = selectedCountries.some((selected) =>
          itemCountries.some((ic) => ic.includes(selected) || selected.includes(ic))
        );
        if (!hasMatch) return false;
      }

      // 4. Genre Filter
      if (selectedGenres.length > 0) {
        const itemGenres: string[] = [];
        if (c.genres && c.genres.length > 0) {
          itemGenres.push(...c.genres.map((g) => g.trim().toUpperCase()));
        }
        if (c.genre) {
          itemGenres.push(
            ...c.genre
              .split(/[/,]/)
              .map((s) => s.trim().toUpperCase())
          );
        }
        const hasMatch = selectedGenres.some((selected) =>
          itemGenres.some((ig) => ig.includes(selected) || selected.includes(ig))
        );
        if (!hasMatch) return false;
      }

      return true;
    });

    // Sort order
    result = [...result].sort((a, b) => {
      if (sortOption === 'mais_bem_avaliados') {
        // Star rating descending
        if (b.starRating !== a.starRating) {
          return b.starRating - a.starRating;
        }
        // Tie-breaker: date descending
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;
        return a.movieTitle.localeCompare(b.movieTitle, 'pt-BR');
      }

      if (sortOption === 'mais_mal_avaliados') {
        // Star rating ascending
        if (a.starRating !== b.starRating) {
          return a.starRating - b.starRating;
        }
        // Tie-breaker: date descending
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;
        return a.movieTitle.localeCompare(b.movieTitle, 'pt-BR');
      }

      // Default: date descending (Todas as Críticas)
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return a.movieTitle.localeCompare(b.movieTitle, 'pt-BR');
    });

    return result;
  }, [allCriticas, sortOption, releaseFilter, selectedYears, selectedCountries, selectedGenres]);

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Avaliação & Análise
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            CRÍTICAS CINEMATOGRÁFICAS
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Apreciação rigorosa, contexto histórico e análise formal do cinema contemporâneo e do arquivo clássico.
          </p>
        </div>

        {/* Filter Bar with Hamburger / Filter Button */}
        <div className="bg-white border border-[#1A1A1A]/15 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger / Filter Trigger Button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center gap-2.5 px-4 py-2.5 uppercase font-sans font-bold text-xs tracking-[0.18em] transition-all border select-none cursor-pointer ${
                isOpen || activeFiltersCount > 0
                  ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] shadow-xs'
                  : 'bg-[#F5F2ED] text-[#1A1A1A] border-[#1A1A1A]/20 hover:border-[#1A1A1A] hover:bg-white'
              }`}
              title="Abrir Menu de Filtragem"
            >
              <Menu size={16} className={isOpen ? 'rotate-90 transition-transform duration-200' : 'transition-transform duration-200'} />
              <span>FILTROS</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#D4AF37] text-[#1A1A1A] text-[10px] font-mono font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Quick Status / Reset Button */}
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 text-[11px] font-sans font-bold uppercase tracking-[0.15em] text-red-600 hover:text-red-800 transition-colors px-2 py-1"
                title="Limpar todos os filtros ativos"
              >
                <RotateCcw size={12} />
                <span>LIMPAR FILTROS</span>
              </button>
            ) : (
              <span className="text-[11px] font-sans font-bold uppercase tracking-[0.15em] text-[#1A1A1A]/60 hidden sm:inline-block">
                TODAS AS CRÍTICAS (PADRÃO)
              </span>
            )}
          </div>

          {/* Results Count */}
          <div className="text-xs font-mono text-[#1A1A1A]/70 uppercase tracking-wider">
            {filteredAndSortedCriticas.length === 1
              ? '1 CRÍTICA ENCONTRADA'
              : `${filteredAndSortedCriticas.length} CRÍTICAS ENCONTRADAS`}
          </div>
        </div>

        {/* Expandable Hamburger Filter Panel / Menu */}
        {isOpen && (
          <div className="bg-white border-2 border-[#1A1A1A] p-6 sm:p-8 space-y-8 shadow-md transition-all animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
              <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                <SlidersHorizontal size={16} />
                <span>PAINEL DE FILTRAGEM & CLASSIFICAÇÃO</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
                title="Fechar Menu de Filtros"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Section 1: Visualização & Ordenação */}
              <div className="space-y-3">
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90 flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-2">
                  <ArrowUpDown size={14} />
                  <span>ORDENAÇÃO & AVALIAÇÃO</span>
                </h3>
                <div className="space-y-1.5">
                  {[
                    { id: 'todas', label: 'TODAS AS CRÍTICAS (PADRÃO)' },
                    { id: 'mais_bem_avaliados', label: 'FILMES MAIS BEM AVALIADOS' },
                    { id: 'mais_mal_avaliados', label: 'FILMES MAIS MAL AVALIADOS' },
                  ].map((opt) => {
                    const active = sortOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSortOption(opt.id as SortOption)}
                        className={`w-full text-left px-3 py-2 text-xs font-sans uppercase tracking-[0.12em] font-semibold border flex items-center justify-between transition-colors ${
                          active
                            ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                            : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {active && <Check size={14} className="text-[#D4AF37]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Tipo de Acervo */}
              <div className="space-y-3">
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90 flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-2">
                  <Film size={14} />
                  <span>STATUS DO FILME</span>
                </h3>
                <div className="space-y-1.5">
                  {[
                    { id: 'todas', label: 'TODOS OS FILMES' },
                    { id: 'lancamentos', label: 'LANÇAMENTOS' },
                    { id: 'arquivo', label: 'DO ARQUIVO' },
                  ].map((opt) => {
                    const active = releaseFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReleaseFilter(opt.id as ReleaseFilter)}
                        className={`w-full text-left px-3 py-2 text-xs font-sans uppercase tracking-[0.12em] font-semibold border flex items-center justify-between transition-colors ${
                          active
                            ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                            : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {active && <Check size={14} className="text-[#D4AF37]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Por Ano */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                  <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90 flex items-center gap-2">
                    <Calendar size={14} />
                    <span>POR ANO</span>
                  </h3>
                  {selectedYears.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedYears([])}
                      className="text-[10px] uppercase font-sans font-bold text-red-600 hover:underline"
                    >
                      LIMPAR
                    </button>
                  )}
                </div>
                {availableYears.length === 0 ? (
                  <p className="text-xs text-[#1A1A1A]/50 italic">Nenhum ano cadastrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                    {availableYears.map((year) => {
                      const isSelected = selectedYears.includes(year);
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => toggleYear(year)}
                          className={`px-3 py-1.5 text-xs font-mono uppercase font-bold border transition-colors ${
                            isSelected
                              ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                              : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 4: Por País */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                  <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90 flex items-center gap-2">
                    <Globe size={14} />
                    <span>POR PAÍS</span>
                  </h3>
                  {selectedCountries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCountries([])}
                      className="text-[10px] uppercase font-sans font-bold text-red-600 hover:underline"
                    >
                      LIMPAR
                    </button>
                  )}
                </div>
                {availableCountries.length === 0 ? (
                  <p className="text-xs text-[#1A1A1A]/50 italic">Nenhum país cadastrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                    {availableCountries.map((country) => {
                      const isSelected = selectedCountries.includes(country);
                      return (
                        <button
                          key={country}
                          type="button"
                          onClick={() => toggleCountry(country)}
                          className={`px-3 py-1.5 text-xs font-sans uppercase font-semibold border transition-colors ${
                            isSelected
                              ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                              : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                          }`}
                        >
                          {country}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 5: Por Gênero */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                  <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90 flex items-center gap-2">
                    <Tag size={14} />
                    <span>POR GÊNERO CINEMATOGRÁFICO</span>
                  </h3>
                  {selectedGenres.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedGenres([])}
                      className="text-[10px] uppercase font-sans font-bold text-red-600 hover:underline"
                    >
                      LIMPAR
                    </button>
                  )}
                </div>
                {availableGenres.length === 0 ? (
                  <p className="text-xs text-[#1A1A1A]/50 italic">Nenhum gênero cadastrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                    {availableGenres.map((genre) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleGenre(genre)}
                          className={`px-3 py-1.5 text-xs font-sans uppercase font-semibold border transition-colors ${
                            isSelected
                              ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                              : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                          }`}
                        >
                          {genre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#1A1A1A]/15">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-4 py-2 text-xs uppercase font-sans font-bold tracking-[0.15em] border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                >
                  LIMPAR TODOS OS FILTROS
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 text-xs uppercase font-sans font-bold tracking-[0.18em] bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
                >
                  APLICAR E VER {filteredAndSortedCriticas.length} RESULTADO(S)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-[#1A1A1A]/15">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mr-1">
              FILTROS ATIVOS:
            </span>

            {sortOption !== 'todas' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] text-[#F5F2ED] text-[11px] font-sans font-bold uppercase tracking-wider">
                {sortOption === 'mais_bem_avaliados' ? 'MAIS BEM AVALIADOS' : 'MAIS MAL AVALIADOS'}
                <button
                  type="button"
                  onClick={() => setSortOption('todas')}
                  className="hover:text-[#D4AF37] ml-0.5"
                  title="Remover ordenação"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {releaseFilter !== 'todas' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] text-[#F5F2ED] text-[11px] font-sans font-bold uppercase tracking-wider">
                {releaseFilter === 'lancamentos' ? 'LANÇAMENTOS' : 'DO ARQUIVO'}
                <button
                  type="button"
                  onClick={() => setReleaseFilter('todas')}
                  className="hover:text-[#D4AF37] ml-0.5"
                  title="Remover filtro de catálogo"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedYears.map((year) => (
              <span
                key={year}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] text-[#F5F2ED] text-[11px] font-mono font-bold uppercase tracking-wider"
              >
                ANO: {year}
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  className="hover:text-[#D4AF37] ml-0.5"
                  title={`Remover ano ${year}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {selectedCountries.map((country) => (
              <span
                key={country}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] text-[#F5F2ED] text-[11px] font-sans font-bold uppercase tracking-wider"
              >
                PAÍS: {country}
                <button
                  type="button"
                  onClick={() => toggleCountry(country)}
                  className="hover:text-[#D4AF37] ml-0.5"
                  title={`Remover país ${country}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {selectedGenres.map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] text-[#F5F2ED] text-[11px] font-sans font-bold uppercase tracking-wider"
              >
                GÊNERO: {genre}
                <button
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className="hover:text-[#D4AF37] ml-0.5"
                  title={`Remover gênero ${genre}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-red-600 hover:text-red-800 ml-auto px-2 py-1 underline"
            >
              LIMPAR TUDO
            </button>
          </div>
        )}

        {/* Grid of Reviews */}
        {loading ? (
          <div className="py-24 text-center space-y-4 border border-[#1A1A1A]/15 bg-white p-8">
            <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
            <p className="text-xs font-sans uppercase tracking-widest text-[#1A1A1A]/60">
              Carregando críticas cinematográficas...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="py-16 text-center space-y-4 border border-red-200 bg-red-50/50 p-8">
            <AlertCircle size={32} className="text-red-600 mx-auto" />
            <p className="text-lg font-serif-display text-red-900">
              Não foi possível carregar as críticas no momento.
            </p>
            <p className="text-xs font-mono text-red-700 max-w-md mx-auto">
              {errorMsg}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={loadReviews}
                className="px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-[0.18em] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
              >
                TENTAR NOVAMENTE
              </button>
            </div>
          </div>
        ) : filteredAndSortedCriticas.length === 0 ? (
          <div className="py-24 text-center space-y-4 border border-[#1A1A1A]/15 bg-white p-8">
            <p className="text-xl font-serif-display text-[#1A1A1A]">
              NENHUMA CRÍTICA ENCONTRADA COM ESTA COMBINAÇÃO DE FILTROS.
            </p>
            <p className="text-sm font-serif-body text-[#1A1A1A]/60 max-w-md mx-auto">
              Tente selecionar outros anos, países, gêneros ou redefinir todos os filtros para ver todas as publicações.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-[0.18em] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
              >
                REDEFINIR PARA TODAS AS CRÍTICAS
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCriticas.map((c) => (
              <ArticleCard
                key={c.id}
                type="critica"
                variant="medium"
                title={c.editorialTitle}
                movieTitle={c.movieTitle}
                director={c.director}
                year={c.year}
                country={c.country}
                genre={c.genre || (c.genres ? c.genres.join(', ') : undefined)}
                image={c.coverImage}
                date={c.date}
                starRating={c.starRating}
                onClick={() => onNavigate(`/criticas/${c.slug}`)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
