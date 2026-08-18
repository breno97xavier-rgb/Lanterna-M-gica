import React from 'react';
import { cmsStore } from '../services/cmsStore';

interface CineastasPageProps {
  onNavigate: (path: string) => void;
}

export const CineastasPage: React.FC<CineastasPageProps> = ({ onNavigate }) => {
  const cineastas = cmsStore.getCineastas();

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Índice de Autores
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            CINEASTAS
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Perfis biográficos e índice analítico das obras, ensaios e reflexões publicadas sobre grandes realizadores do cinema.
          </p>
        </div>

        {cineastas.length === 0 ? (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white">
            <p className="text-lg font-serif-display text-[#1A1A1A]/60">
              Nenhum perfil de cineasta cadastrado no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cineastas.map((cin) => (
              <div
                key={cin.id}
                onClick={() => onNavigate(`/cineastas/${cin.slug}`)}
                className="group cursor-pointer p-6 bg-white border border-[#1A1A1A]/12 hover:border-[#D4AF37] transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={cin.photo}
                      alt={cin.name}
                      className="w-20 h-20 rounded-full object-cover border border-[#1A1A1A]/15 filter grayscale group-hover:grayscale-0 transition-all duration-500 shrink-0"
                    />
                    <div>
                      <h2 className="text-2xl font-serif-display text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                        {cin.name}
                      </h2>
                      <p className="text-xs font-mono text-[#D4AF37] pt-0.5">
                        {cin.country} {cin.birthYear ? `(${cin.birthYear}–${cin.deathYear || ''})` : ''}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-serif-body text-[#1A1A1A]/80 line-clamp-4 leading-relaxed">
                    {cin.bio}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1A1A1A]/12 flex justify-between items-center text-xs font-sans-ui text-[#1A1A1A]/70 font-semibold uppercase tracking-[0.15em]">
                  <span className="group-hover:text-[#D4AF37] transition-colors">Ver Índice de Conteúdos</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
