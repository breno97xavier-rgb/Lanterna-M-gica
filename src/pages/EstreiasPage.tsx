import React, { useState, useMemo } from 'react';
import { Calendar, Film, ArrowRight, Clock, Globe, Clapperboard, ChevronRight } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { Estreia } from '../types';

interface EstreiasPageProps {
  onNavigate: (path: string) => void;
  selectedWeekDate?: string; // Optional e.g. "2026-08-13" from URL params
}

export const EstreiasPage: React.FC<EstreiasPageProps> = ({
  onNavigate,
  selectedWeekDate,
}) => {
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('todos');

  // Reference date: if passed from route, use it; otherwise default current date in simulated timeline
  const referenceDate = selectedWeekDate || '2026-08-13';

  // Current week data
  const currentWeek = cmsStore.getCurrentWeekEstreias(referenceDate);

  // All historical weeks
  const historicalWeeks = cmsStore.getHistoricalWeeksEstreias(referenceDate);

  // Extract unique years from releases for filter
  const allEstreias = cmsStore.getEstreias(true);
  const years = useMemo(() => {
    const set = new Set<number>();
    allEstreias.forEach((e) => {
      const y = parseInt(e.releaseDate.slice(0, 4), 10);
      if (!isNaN(y)) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [allEstreias]);

  // Filter historical weeks by selected year if needed
  const filteredHistoricalWeeks = useMemo(() => {
    return historicalWeeks.filter((group) => {
      if (selectedYearFilter !== 'todos') {
        const y = parseInt(group.thursdayDate.slice(0, 4), 10);
        if (y !== parseInt(selectedYearFilter, 10)) return false;
      }
      return true;
    });
  }, [historicalWeeks, selectedYearFilter]);

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Circuito Brasileiro de Cinema
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            ESTREIAS
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Guia semanal dos lançamentos nas salas de cinema brasileiras, com fichas completas, notas críticas e arquivo de estreias.
          </p>
        </div>

        {/* Highlight Section: NOS CINEMAS ESTA SEMANA */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#1A1A1A]/15 pb-4">
            <div>
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37] block">
                SEMANA CINEMATOGRÁFICA
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif-display text-[#1A1A1A]">
                Nos Cinemas Esta Semana
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
                Consulte as semanas anteriores no arquivo abaixo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentWeek.items.map((est) => (
                <div
                  key={est.id}
                  onClick={() => onNavigate(`/filmes/${est.filmSlug}`)}
                  className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all cursor-pointer group flex flex-col overflow-hidden shadow-sm hover:shadow-md"
                >
                  {/* Poster Image */}
                  <div className="aspect-[2/3] w-full overflow-hidden bg-[#1A1A1A]/10 relative">
                    {est.filmPoster ? (
                      <img
                        src={est.filmPoster}
                        alt={`Pôster de ${est.filmTitle}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                            <span key={g} className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10">
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
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs font-sans font-bold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                      <span>Ver Ficha Completa</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Historical Weeks Section */}
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
                <span className="font-bold uppercase tracking-wider text-[#1A1A1A]/60">Filtrar por Ano:</span>
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
            {filteredHistoricalWeeks.map((group) => (
              <div key={group.thursdayDate} className="space-y-4">
                {/* Week Header */}
                <div className="flex items-center justify-between bg-white border border-[#1A1A1A]/15 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-[#D4AF37]" />
                    <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
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
                      onClick={() => onNavigate(`/filmes/${est.filmSlug}`)}
                      className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] p-3 transition-colors cursor-pointer group flex items-start gap-3"
                    >
                      <div className="w-16 aspect-[2/3] bg-[#1A1A1A]/10 shrink-0 overflow-hidden border border-[#1A1A1A]/10">
                        {est.filmPoster ? (
                          <img
                            src={est.filmPoster}
                            alt={est.filmTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
