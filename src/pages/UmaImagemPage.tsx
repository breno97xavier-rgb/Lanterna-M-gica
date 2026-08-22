import React, { useState, useEffect } from 'react';
import { Sparkles, Film, User, Tag, ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchUmaImagem, mapSupabaseUmaImagemToDomain } from '../services/repositories/umaImagemRepository';
import { UmaImagemUmaIdeia } from '../types';

interface UmaImagemPageProps {
  onNavigate: (path: string) => void;
}

export const UmaImagemPage: React.FC<UmaImagemPageProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<UmaImagemUmaIdeia[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await fetchUmaImagem({ allStatuses: false });
      if (fetchErr) {
        setError(fetchErr.message || 'Erro ao carregar publicações de Uma Imagem.');
        setItems([]);
      } else {
        setItems((data || []).map(mapSupabaseUmaImagemToDomain));
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao consultar o catálogo.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    document.title = 'Uma Imagem, Uma Ideia — Lanterna Mágica';
  }, []);

  // Extrair tags únicas das publicações disponíveis
  const allTags = Array.from(
    new Set(
      items
        .flatMap((i) => i.tags || [])
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );

  const filteredItems =
    selectedTag === 'todas'
      ? items
      : items.filter((i) => (i.tags || []).includes(selectedTag));

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            <Sparkles size={14} className="text-[#D4AF37]" />
            <span>Seção Editorial · Lanterna Mágica</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A] tracking-tight">
            UMA IMAGEM, UMA IDEIA
          </h1>

          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Fotogramas, enquadramentos e a potência do instante cinematográfico. Reflexões críticas e ensaísticas que partem de uma única imagem para investigar estética, encenação e linguagem.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 bg-white border border-[#1A1A1A]/15">
            <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
            <p className="text-xs font-mono text-[#1A1A1A]/60 uppercase tracking-wider">
              Carregando reflexões visuais do Lanterna Mágica...
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
              className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:bg-[#1A1A1A]/80 transition-colors"
            >
              <RefreshCw size={14} /> Tentar Novamente
            </button>
          </div>
        )}

        {/* Tag Filters (if available) */}
        {!loading && !error && allTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs font-sans-ui">
            <button
              onClick={() => setSelectedTag('todas')}
              className={`px-4 py-2 uppercase tracking-[0.15em] transition-colors border ${
                selectedTag === 'todas'
                  ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-semibold'
                  : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:text-[#1A1A1A]'
              }`}
            >
              Todas ({items.length})
            </button>
            {allTags.map((tag) => {
              const count = items.filter((i) => (i.tags || []).includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-2 uppercase tracking-[0.15em] transition-colors border whitespace-nowrap ${
                    selectedTag === tag
                      ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-semibold'
                      : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:text-[#1A1A1A]'
                  }`}
                >
                  {tag} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-8">
            <Sparkles size={36} className="text-[#1A1A1A]/30 mx-auto mb-2" />
            <p className="text-xl font-serif-display text-[#1A1A1A]/80">
              Nenhuma publicação de &ldquo;Uma Imagem, Uma Ideia&rdquo; disponível no momento.
            </p>
            <p className="text-xs font-serif-body text-[#1A1A1A]/50 max-w-md mx-auto leading-relaxed">
              Novos estudos de fotogramas e reflexões visuais serão publicados em breve no acervo editorial.
            </p>
          </div>
        )}

        {/* Grid of Uma Imagem Publications */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => {
              const authors = item.authors || [];
              const primaryAuthor = authors[0]?.member?.name;

              return (
                <article
                  key={item.id}
                  onClick={() => onNavigate(`/uma-imagem/${item.slug}`)}
                  className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all duration-300 flex flex-col cursor-pointer group shadow-xs hover:shadow-md overflow-hidden"
                >
                  {/* Visual Image Header */}
                  <div className="aspect-[16/10] w-full overflow-hidden bg-[#1A1A1A] relative border-b border-[#1A1A1A]/10">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-3 left-3 bg-[#1A1A1A]/90 backdrop-blur-xs text-[#F5F2ED] text-[9px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 flex items-center gap-1.5 border border-white/10">
                      <Sparkles size={11} className="text-[#D4AF37]" />
                      <span>Uma Imagem</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Meta information */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#1A1A1A]/60">
                        <span>{item.date}</span>
                        {item.highlightHome && (
                          <span className="text-[#D4AF37] font-bold uppercase text-[9px] tracking-wider">
                            ★ Destaque
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-serif-display font-medium text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug">
                        {item.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm font-serif-body text-[#1A1A1A]/75 line-clamp-3 leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* Footer Relations & Author */}
                    <div className="pt-4 border-t border-[#1A1A1A]/10 space-y-2">
                      {item.relatedMovie && (
                        <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]/80 font-serif-body">
                          <Film size={13} className="text-[#D4AF37] shrink-0" />
                          <span className="truncate italic">Filme: {item.relatedMovie}</span>
                        </div>
                      )}

                      {item.relatedFilmmaker && !item.relatedMovie && (
                        <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]/80 font-serif-body">
                          <User size={13} className="text-[#D4AF37] shrink-0" />
                          <span className="truncate">Direção: {item.relatedFilmmaker}</span>
                        </div>
                      )}

                      {primaryAuthor && (
                        <div className="text-[11px] font-sans-ui text-[#1A1A1A]/60">
                          Por <span className="font-semibold text-[#1A1A1A]">{primaryAuthor}</span>
                        </div>
                      )}

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-[#F5F2ED] text-[#1A1A1A]/70 border border-[#1A1A1A]/10"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between text-xs font-sans font-bold uppercase tracking-[0.15em] text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                        <span>Ver reflexão</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
