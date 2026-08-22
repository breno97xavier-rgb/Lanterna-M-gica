import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchEspeciais } from '../services/repositories/especiaisRepository';
import { Especial } from '../types';

interface EspeciaisPageProps {
  onNavigate: (path: string) => void;
}

export const EspeciaisPage: React.FC<EspeciaisPageProps> = ({ onNavigate }) => {
  const [especiais, setEspeciais] = useState<Especial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchEspeciais({ allStatuses: false })
      .then(({ data, error: fetchErr }) => {
        if (!isMounted) return;
        if (fetchErr) {
          setError('Não foi possível carregar os especiais no momento.');
        } else {
          setEspeciais(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError('Ocorreu um erro ao carregar os especiais.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Projetos Especiais
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            ESPECIAIS EDITORIAIS
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Dossiês profundos, ciclos temáticos e análises transversais unindo ensaios, críticas e listas sobre grandes autores ou movimentos.
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-4 border border-[#1A1A1A]/15 bg-white flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
            <p className="text-xs font-mono uppercase tracking-widest text-[#1A1A1A]/60">
              Carregando especiais e dossiês...
            </p>
          </div>
        ) : error ? (
          <div className="py-20 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-6">
            <p className="text-base font-serif-body text-[#1A1A1A]/80">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-4 py-2 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : especiais.length === 0 ? (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white">
            <p className="text-lg font-serif-display text-[#1A1A1A]/60">
              Nenhum especial publicado no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {especiais.map((esp) => {
              const authorsText =
                esp.authorCredits && esp.authorCredits.length > 0
                  ? esp.authorCredits.map((c) => c.member?.name || 'Autor').join(', ')
                  : null;

              return (
                <div
                  key={esp.id}
                  onClick={() => onNavigate(`/especiais/${esp.slug}`)}
                  className="group cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 bg-white border border-[#1A1A1A]/15 hover:border-[#D4AF37] transition-all duration-300 shadow-xs hover:shadow-md"
                >
                  <div className="lg:col-span-5 overflow-hidden border border-[#1A1A1A]/15 bg-[#F5F2ED] aspect-[16/10] lg:aspect-auto">
                    <img
                      src={esp.coverImage}
                      alt={esp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                          CICLO TEMÁTICO
                        </span>
                        {authorsText && (
                          <span className="text-[11px] font-serif-body text-[#1A1A1A]/60 italic">
                            · Curadoria por {authorsText}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-tight">
                        {esp.title}
                      </h2>
                      {esp.subtitle && (
                        <p className="text-base font-serif-body text-[#1A1A1A]/80 leading-relaxed">
                          {esp.subtitle}
                        </p>
                      )}
                      {esp.intro && (
                        <p className="text-xs font-sans-ui text-[#1A1A1A]/60 leading-relaxed line-clamp-3">
                          {esp.intro}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#1A1A1A]/12 flex justify-end">
                      <span className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A] font-sans-ui font-bold group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all">
                        Acessar Dossiê Especial →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
