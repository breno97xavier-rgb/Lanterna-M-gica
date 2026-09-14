import React from 'react';
import { X, Calendar, User, Clock, Film } from 'lucide-react';
import { StarRating } from '../StarRating';
import { EditorialContent } from '../EditorialContent';

interface ArticlePreviewModalProps {
  item: any;
  itemType: 'ensaio' | 'critica' | 'uma_imagem' | 'especial' | 'lista';
  onClose: () => void;
}

export const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({
  item,
  itemType,
  onClose,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-[#F5F2ED] w-full max-w-4xl max-h-[92vh] border border-[#1A1A1A] overflow-y-auto shadow-2xl relative">
        
        {/* Top Control Bar */}
        <div className="sticky top-0 z-10 bg-[#1A1A1A] text-[#F5F2ED] px-4 py-3 flex items-center justify-between border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#F5F2ED] text-[#1A1A1A] text-[10px] font-mono font-bold uppercase tracking-widest">
              PRÉ-VISUALIZAÇÃO DE RASCUNHO
            </span>
            <span className="text-xs font-mono text-[#F5F2ED]/70 hidden sm:inline">
              Layout real do leitor público
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#F5F2ED] text-[#1A1A1A] hover:bg-white text-xs font-mono font-bold flex items-center gap-1 transition-colors"
          >
            <X size={14} />
            <span>Fechar Prévia</span>
          </button>
        </div>

        {/* Content Body Rendering */}
        <div className="p-4 sm:p-10 space-y-8">
          {itemType === 'ensaio' && (
            <article className="space-y-8">
              <header className="space-y-4 text-center max-w-3xl mx-auto">
                <div className="inline-block border-b border-[#1A1A1A]/15 pb-1 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]">
                  ENSAIO · {item.category || 'FILOSOFIA & CINEMA'}
                </div>
                <h1 className="text-3xl sm:text-5xl font-serif-display text-[#1A1A1A] leading-tight font-normal">
                  {item.title || 'Título do Ensaio'}
                </h1>
                {item.subtitle && (
                  <p className="text-base sm:text-xl font-serif-display text-[#1A1A1A]/80 italic max-w-2xl mx-auto leading-relaxed">
                    {item.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans text-[#1A1A1A]/70 pt-4 border-t border-b border-[#1A1A1A]/15 py-3">
                  <span className="flex items-center gap-1.5"><User size={14} /> Por <strong>{item.author || 'Breno Matos'}</strong></span>
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> {item.date || 'Hoje'}</span>
                  {item.readTimeMinutes && <span className="flex items-center gap-1.5"><Clock size={14} /> {item.readTimeMinutes} min de leitura</span>}
                </div>
              </header>

              {item.coverImage && (
                <div className="max-w-4xl mx-auto aspect-21/9 overflow-hidden border border-[#1A1A1A]/15 bg-black/5">
                  <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}

              <main className="max-w-[700px] mx-auto">
                <EditorialContent
                  content={item.content}
                  firstLetterDropCap={true}
                />
              </main>
            </article>
          )}

          {itemType === 'critica' && (
            <article className="space-y-8">
              <header className="space-y-4 text-center max-w-3xl mx-auto">
                <div className="inline-block border-b border-[#1A1A1A]/15 pb-1 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]">
                  CRÍTICA CINEMATOGRÁFICA
                </div>
                <h1 className="text-3xl sm:text-5xl font-serif-display text-[#1A1A1A] leading-tight font-normal">
                  {item.movieTitle || 'Título do Filme'}
                </h1>
                <p className="text-xs font-sans text-[#1A1A1A]/80 uppercase tracking-[0.2em] font-bold">
                  Dir. {item.director || 'Diretor'} · {item.year || 2026} {item.country ? `· ${item.country}` : ''} {item.genre || (item.genres && item.genres.length > 0) ? `· ${item.genre || item.genres.join(', ')}` : ''}
                </p>
                {item.editorialTitle && (
                  <h2 className="text-xl font-serif-display text-[#1A1A1A]/80 italic max-w-2xl mx-auto leading-snug font-normal">
                    &ldquo;{item.editorialTitle}&rdquo;
                  </h2>
                )}
                <div className="flex justify-center pt-2">
                  <StarRating rating={item.starRating || 4.5} size="lg" />
                </div>
              </header>

              {item.coverImage && (
                <div className="max-w-4xl mx-auto aspect-21/9 overflow-hidden border border-[#1A1A1A]/15 bg-black/5">
                  <img src={item.coverImage} alt={item.movieTitle} className="w-full h-full object-cover" />
                </div>
              )}

              <main className="max-w-[700px] mx-auto">
                <EditorialContent
                  content={item.content}
                  firstLetterDropCap={true}
                />
              </main>
            </article>
          )}

          {(itemType === 'uma_imagem' || itemType === 'especial' || itemType === 'lista') && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <h1 className="text-3xl font-serif-display text-[#1A1A1A]">{item.title}</h1>
              {item.image && <img src={item.image} alt={item.title} className="w-full border border-[#1A1A1A]/15" />}
              {item.coverImage && <img src={item.coverImage} alt={item.title} className="w-full border border-[#1A1A1A]/15" />}
              <EditorialContent
                content={item.content || item.intro}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
