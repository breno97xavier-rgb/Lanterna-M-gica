import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw, List, Film, User, Tag as TagIcon, ArrowRight } from 'lucide-react';
import { fetchListas } from '../services/repositories/listasRepository';
import { Lista } from '../types';
import { formatEditorialDate } from '../utils/dateUtils';

interface ListasPageProps {
  onNavigate: (path: string) => void;
}

export const ListasPage: React.FC<ListasPageProps> = ({ onNavigate }) => {
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await fetchListas({ allStatuses: false });
      if (fetchErr) {
        setError(fetchErr.message || 'Erro ao carregar listas do catálogo editorial.');
        setListas([]);
      } else {
        setListas(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha na conexão com o servidor.');
      setListas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extrair tags únicas das listas públicas
  const tagsSet = new Set<string>();
  listas.forEach((l) => {
    if (Array.isArray(l.tags)) {
      l.tags.forEach((t) => {
        if (t && t.trim()) tagsSet.add(t.trim());
      });
    }
  });
  const tagsList = Array.from(tagsSet);

  const filteredListas =
    selectedTag === 'todos'
      ? listas
      : listas.filter((l) => Array.isArray(l.tags) && l.tags.includes(selectedTag));

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Seleções Curatoriais & Filmografias
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            LISTAS
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Rankings essenciais, filmografias comentadas e seleções temáticas de obras e autores reunidos pela equipe editorial do Lanterna Mágica.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 bg-white border border-[#1A1A1A]/15 flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
            <p className="text-xs font-mono text-[#1A1A1A]/60 uppercase tracking-widest">
              Carregando listas editoriais...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-16 px-6 text-center space-y-4 bg-red-50 border border-red-200">
            <AlertTriangle size={32} className="text-red-600 mx-auto" />
            <p className="text-sm font-sans font-bold text-red-800">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
            >
              <RefreshCw size={14} /> Tentar Novamente
            </button>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && tagsList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs font-sans-ui">
            <button
              onClick={() => setSelectedTag('todos')}
              className={`px-4 py-2 uppercase tracking-[0.15em] transition-colors border ${
                selectedTag === 'todos'
                  ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-semibold'
                  : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:text-[#1A1A1A]'
              }`}
            >
              Todas as Listas ({listas.length})
            </button>
            {tagsList.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 uppercase tracking-[0.15em] transition-colors border whitespace-nowrap ${
                  selectedTag === tag
                    ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-semibold'
                    : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:text-[#1A1A1A]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredListas.length === 0 && (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-8">
            <List size={36} className="text-[#1A1A1A]/30 mx-auto" />
            <p className="text-lg font-serif-display text-[#1A1A1A]/70">
              Nenhuma lista encontrada para a seleção atual.
            </p>
            <p className="text-xs font-sans text-[#1A1A1A]/50">
              Novas seleções curatoriais serão publicadas periodicamente.
            </p>
          </div>
        )}

        {/* List of Listas Grid */}
        {!loading && !error && filteredListas.length > 0 && (
          <div className="space-y-8">
            {filteredListas.map((lista) => {
              const itemCount = lista.items?.length || 0;
              const pubDate = lista.publishedAt || lista.createdAt;

              return (
                <div
                  key={lista.id}
                  onClick={() => onNavigate(`/listas/${lista.slug}`)}
                  className="group cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 bg-white border border-[#1A1A1A]/15 hover:border-[#D4AF37] transition-all duration-300 shadow-xs hover:shadow-md"
                >
                  {/* Capa */}
                  <div className="lg:col-span-5 overflow-hidden border border-[#1A1A1A]/15 bg-[#1A1A1A] aspect-[16/10] lg:aspect-auto relative min-h-[220px]">
                    {lista.coverImage ? (
                      <img
                        src={lista.coverImage}
                        alt={lista.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-[#F5F2ED]/40 gap-2">
                        <List size={32} />
                        <span className="text-xs font-sans uppercase tracking-widest">Lanterna Mágica</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-[#1A1A1A]/85 backdrop-blur-xs text-[#D4AF37] px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-[0.2em] border border-[#D4AF37]/30">
                      {itemCount} {itemCount === 1 ? 'Título' : 'Títulos'}
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                          LISTA EDITORIAL
                        </span>
                        {pubDate && (
                          <span className="text-[11px] font-mono text-[#1A1A1A]/50">
                            · {formatEditorialDate(pubDate, 'short')}
                          </span>
                        )}
                        {lista.relatedPerson && (
                          <span className="text-[11px] font-serif-body text-[#1A1A1A]/70 italic">
                            · Homenageando {lista.relatedPerson.name}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-tight">
                        {lista.title}
                      </h2>

                      {lista.intro && (
                        <p className="text-sm sm:text-base font-serif-body text-[#1A1A1A]/80 leading-relaxed line-clamp-3">
                          {lista.intro}
                        </p>
                      )}

                      {/* Tags */}
                      {lista.tags && lista.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {lista.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 bg-[#F5F2ED] text-[#1A1A1A]/70 border border-[#1A1A1A]/10"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#1A1A1A]/12 flex items-center justify-between">
                      <span className="text-xs font-mono text-[#1A1A1A]/60">
                        {itemCount} obras ranqueadas & comentadas
                      </span>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A] font-sans-ui font-bold group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all inline-flex items-center gap-1.5">
                        Ver Lista Completa <ArrowRight size={13} />
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
