import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Film,
  ArrowRight,
  Clock,
  Globe,
  Clapperboard,
  ChevronRight,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Estreia } from '../types';
import {
  fetchEstreias,
  getReleaseWeekRange,
  groupEstreiasByWeek,
  getCurrentWeekEstreiasFromList,
} from '../services/repositories/estreiasRepository';
import { getTodayLocalDateString } from '../utils/dateUtils';

interface EstreiasPageProps {
  onNavigate: (path: string) => void;
  selectedWeekDate?: string; // Optional e.g. "2026-08-13" from URL params
}

export const EstreiasPage: React.FC<EstreiasPageProps> = ({
  onNavigate,
  selectedWeekDate,
}) => {
  const [estreias, setEstreias] = useState<Estreia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('todos');

  // Reference date: if passed from route, use it; otherwise today's local civil date
  const referenceDate = selectedWeekDate || getTodayLocalDateString();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Carrega exclusivamente registros publicamente visíveis do Supabase
      const { data, error: fetchErr } = await fetchEstreias({ allStatuses: false });
      if (fetchErr) {
        setError('Não foi possível carregar o guia de estreias no momento.');
        setEstreias([]);
      } else {
        setEstreias(data || []);
      }
    } catch (err: any) {
      setError('Erro ao carregar dados do circuito de estreias.');
      setEstreias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Dados da semana de referência
  const currentWeek = useMemo(() => {
    return getCurrentWeekEstreiasFromList(estreias, referenceDate);
  }, [estreias, referenceDate]);

  // Todos os agrupamentos semanais
  const allWeekGroups = useMemo(() => {
    return groupEstreiasByWeek(estreias, referenceDate);
  }, [estreias, referenceDate]);

  // Semanas do arquivo histórico (todas as semanas que não são a semana da referência)
  const historicalWeeks = useMemo(() => {
    return allWeekGroups.filter(
      (group) => group.thursdayDate !== currentWeek.weekRange.thursdayDate
    );
  }, [allWeekGroups, currentWeek.weekRange.thursdayDate]);

  // Anos únicos disponíveis para filtro
  const years = useMemo(() => {
    const set = new Set<number>();
    estreias.forEach((e) => {
      const y = parseInt(e.releaseDate.slice(0, 4), 10);
      if (!isNaN(y)) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [estreias]);

  // Semanas históricas filtradas por ano
  const filteredHistoricalWeeks = useMemo(() => {
    return historicalWeeks.filter((group) => {
      if (selectedYearFilter !== 'todos') {
        const y = parseInt(group.thursdayDate.slice(0, 4), 10);
        if (y !== parseInt(selectedYearFilter, 10)) return false;
      }
      return true;
    });
  }, [historicalWeeks, selectedYearFilter]);

  const isSpecificDateView = Boolean(selectedWeekDate);

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
              Circuito Brasileiro de Cinema
            </span>
            {isSpecificDateView && (
              <button
                onClick={() => onNavigate('/estreias')}
                className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#D4AF37] transition-colors bg-white border border-[#1A1A1A]/15 px-3 py-1"
              >
                <RotateCcw size={12} />
                <span>Ver Semana Atual</span>
              </button>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            ESTREIAS
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Guia semanal dos lançamentos nas salas de cinema brasileiras, com fichas completas, notas críticas e arquivo de estreias.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4">
            <Loader2 size={36} className="animate-spin text-[#D4AF37] mx-auto" />
            <p className="text-xs font-sans uppercase tracking-widest text-[#1A1A1A]/60">
              Consultando lançamentos no circuito brasileiro...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white border border-red-200 p-8 text-center space-y-4">
            <AlertCircle size={32} className="text-red-600 mx-auto" />
            <p className="text-base font-serif-display text-[#1A1A1A]">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Content loaded */}
        {!loading && !error && (
          <>
            {/* Highlight Section: NOS CINEMAS ESTA SEMANA (ou SEMANA SELECIONADA) */}
            <section className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#1A1A1A]/15 pb-4">
                <div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37] block">
                    SEMANA CINEMATOGRÁFICA
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif-display text-[#1A1A1A]">
                    {isSpecificDateView ? 'Lançamentos da Semana Selecionada' : 'Nos Cinemas Esta Semana'}
                  </h2>
                </div>
                <div className="text-xs sm:text-sm font-sans font-bold tracking-wider text-[#1A1A1A]/70 bg-white border border-[#1A1A1A]/15 px-3 py-1.5 self-start sm:self-auto">
                  {currentWeek.weekRange.rangeFormatted}
                </div>
              </div>

              {currentWeek.items.length === 0 ? (
                <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
                  <p className="text-lg font-serif-display text-[#1A1A1A]/60">
                    Nenhuma estreia cadastrada para esta semana.
                  </p>
                  <p className="text-xs font-sans text-[#1A1A1A]/50">
                    {historicalWeeks.length > 0
                      ? 'Consulte as outras semanas no arquivo cronológico abaixo.'
                      : 'Novos lançamentos cinematográficos serão listados assim que confirmados pela distribuição.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentWeek.items.map((est) => (
                    <div
                      key={est.id}
                      onClick={() => est.filmSlug && onNavigate(`/filmes/${est.filmSlug}`)}
                      className={`bg-white border border-[#1A1A1A]/15 transition-all flex flex-col overflow-hidden shadow-xs ${
                        est.filmSlug ? 'hover:border-[#1A1A1A] cursor-pointer group hover:shadow-md' : ''
                      }`}
                    >
                      {/* Poster Image */}
                      <div className="aspect-[2/3] w-full overflow-hidden bg-[#1A1A1A]/10 relative">
                        {est.filmPoster ? (
                          <img
                            src={est.filmPoster}
                            alt={`Pôster de ${est.filmTitle}`}
                            className={`w-full h-full object-cover ${
                              est.filmSlug ? 'group-hover:scale-105 transition-transform duration-500' : ''
                            }`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/30">
                            <Film size={40} />
                          </div>
                        )}
                        
                        {/* Release Badge */}
                        <div className="absolute top-3 left-3 bg-[#1A1A1A] text-[#F5F2ED] text-[10px] font-sans font-bold uppercase tracking-widest px-2.5 py-1">
                          {est.releaseType || 'Cinema'}
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                            {est.filmCountry} · {est.filmYear}
                          </span>
                          <h3 className="text-xl font-serif-display font-medium text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug">
                            {est.filmTitle}
                          </h3>
                          {est.filmOriginalTitle && est.filmOriginalTitle !== est.filmTitle && (
                            <p className="text-xs font-serif-body italic text-[#1A1A1A]/60">
                              {est.filmOriginalTitle}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3 pt-3 border-t border-[#1A1A1A]/10 text-xs font-sans text-[#1A1A1A]/80">
                          <div className="flex items-center gap-1.5">
                            <Clapperboard size={13} className="text-[#D4AF37] shrink-0" />
                            <span className="truncate">Dir. {est.filmDirector}</span>
                          </div>

                          {est.filmGenres && est.filmGenres.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {est.filmGenres.map((g) => (
                                <span
                                  key={g}
                                  className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}

                          {est.distributor && (
                            <div className="text-[11px] text-[#1A1A1A]/60">
                              Distribuição: <strong className="text-[#1A1A1A]/80">{est.distributor}</strong>
                            </div>
                          )}

                          {est.notes && (
                            <p className="text-[11px] font-serif-body italic text-[#1A1A1A]/70 line-clamp-2">
                              {est.notes}
                            </p>
                          )}
                        </div>

                        {est.filmSlug && (
                          <div className="pt-2 flex items-center justify-between text-xs font-sans font-bold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                            <span>Ver Ficha Completa</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Historical Weeks Section */}
            {historicalWeeks.length > 0 && (
              <section className="space-y-8 pt-8 border-t border-[#1A1A1A]/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37] block">
                      ARQUIVO CRONOLÓGICO
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A]">
                      Semanas Anteriores & Catálogo de Lançamentos
                    </h2>
                  </div>

                  {/* Year Selector */}
                  {years.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-sans">
                      <span className="font-bold uppercase tracking-wider text-[#1A1A1A]/60">
                        Filtrar por Ano:
                      </span>
                      <select
                        value={selectedYearFilter}
                        onChange={(e) => setSelectedYearFilter(e.target.value)}
                        className="bg-white border border-[#1A1A1A]/15 px-3 py-1.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="todos">Todos os Anos</option>
                        {years.map((y) => (
                          <option key={y} value={y.toString()}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-12">
                  {filteredHistoricalWeeks.map((group) => {
                    const [gY, gM, gD] = group.thursdayDate.split('-');
                    const dateLink = `/estreias/${gY}/${gM}/${gD}`;

                    return (
                      <div key={group.thursdayDate} className="space-y-4">
                        {/* Week Header */}
                        <div className="flex items-center justify-between bg-white border border-[#1A1A1A]/15 px-4 py-3">
                          <div
                            onClick={() => onNavigate(dateLink)}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <Calendar size={16} className="text-[#D4AF37]" />
                            <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                              {group.rangeFormatted}
                            </h3>
                          </div>
                          <span className="text-xs font-sans text-[#1A1A1A]/60 font-semibold">
                            {group.items.length} filme{group.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Week Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {group.items.map((est) => (
                            <div
                              key={est.id}
                              onClick={() => est.filmSlug && onNavigate(`/filmes/${est.filmSlug}`)}
                              className={`bg-white border border-[#1A1A1A]/15 p-3 transition-colors flex items-start gap-3 ${
                                est.filmSlug ? 'hover:border-[#1A1A1A] cursor-pointer group' : ''
                              }`}
                            >
                              <div className="w-16 aspect-[2/3] bg-[#1A1A1A]/10 shrink-0 overflow-hidden border border-[#1A1A1A]/10">
                                {est.filmPoster ? (
                                  <img
                                    src={est.filmPoster}
                                    alt={est.filmTitle}
                                    className={`w-full h-full object-cover ${
                                      est.filmSlug ? 'group-hover:scale-105 transition-transform duration-300' : ''
                                    }`}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/30">
                                    <Film size={20} />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                                  {est.filmCountry} · {est.filmYear}
                                </span>
                                <h4 className="text-sm font-serif-display font-medium text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug truncate">
                                  {est.filmTitle}
                                </h4>
                                <p className="text-xs font-serif-body text-[#1A1A1A]/70 truncate">
                                  Dir. {est.filmDirector}
                                </p>
                                {est.distributor && (
                                  <p className="text-[10px] font-sans text-[#1A1A1A]/50 truncate">
                                    {est.distributor}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </div>
  );
};
