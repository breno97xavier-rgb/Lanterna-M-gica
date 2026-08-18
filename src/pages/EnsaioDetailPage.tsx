import React from 'react';
import { ArrowLeft, Clock, Calendar, User, Share2 } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { ArticleCard } from '../components/ArticleCard';

interface EnsaioDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const EnsaioDetailPage: React.FC<EnsaioDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const ensaio = cmsStore.getEnsaioBySlug(slug);

  if (!ensaio) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <h1 className="text-3xl font-serif-display">Ensaio não encontrado.</h1>
        <button
          onClick={() => onNavigate('/ensaios')}
          className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
        >
          Voltar para Ensaios
        </button>
      </div>
    );
  }

  // Related ensaios
  const otherEnsaios = cmsStore
    .getEnsaios(true)
    .filter((e) => e.id !== ensaio.id)
    .slice(0, 2);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: ensaio.title,
        text: ensaio.subtitle,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      {/* Back button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
        <button
          onClick={onGoBack || (() => onNavigate('/ensaios'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors font-bold"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
      </div>

      {/* Header section */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 text-center">
        <div className="inline-block border-b border-[#1A1A1A]/15 pb-1 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90">
          ENSAIO · {ensaio.category || 'FILOSOFIA & CINEMA'}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A] leading-tight">
          {ensaio.title}
        </h1>

        <p className="text-lg sm:text-xl font-serif-body text-[#1A1A1A]/80 max-w-2xl mx-auto leading-relaxed">
          {ensaio.subtitle}
        </p>

        {/* Metadata bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans-ui text-[#1A1A1A]/70 pt-4 border-t border-b border-[#1A1A1A]/15 py-4">
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-[#1A1A1A]/80" />
            <span>Por <strong className="text-[#1A1A1A] font-medium">{ensaio.author}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-[#1A1A1A]/80" />
            <span>{formatDate(ensaio.date)}</span>
          </div>
          {ensaio.readTimeMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#1A1A1A]/80" />
              <span>{ensaio.readTimeMinutes} min de leitura</span>
            </div>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors ml-auto sm:ml-0 font-medium"
          >
            <Share2 size={14} />
            <span>Compartilhar</span>
          </button>
        </div>
      </header>

      {/* Cover Image */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 my-10">
        <div className="overflow-hidden border border-[#1A1A1A]/15 bg-white shadow-sm">
          <img
            src={ensaio.coverImage}
            alt={ensaio.title}
            className="w-full h-auto max-h-[600px] object-cover"
          />
        </div>
      </div>

      {/* Main Text Body — Constrained comfortable reading width */}
      <main className="max-w-[700px] mx-auto px-4 sm:px-6 space-y-6 font-serif-body text-base sm:text-lg text-[#1A1A1A]/90 leading-relaxed">
        {ensaio.content.split('\n\n').map((paragraph, idx) => {
          if (paragraph.startsWith('### ')) {
            return (
              <h3
                key={idx}
                className="text-2xl font-serif-display font-normal text-[#1A1A1A] pt-6 pb-2 border-b border-[#1A1A1A]/15 mt-8 mb-4"
              >
                {paragraph.replace('### ', '')}
              </h3>
            );
          }

          if (paragraph.startsWith('> ')) {
            return (
              <blockquote
                key={idx}
                className="my-8 pl-6 border-l-2 border-[#1A1A1A] italic font-serif-display text-xl text-[#1A1A1A] leading-snug"
              >
                {paragraph.replace('> ', '')}
              </blockquote>
            );
          }

          const isFirstParagraph = idx === 0 || (idx === 1 && ensaio.content.split('\n\n')[0].startsWith('### '));

          return (
            <p
              key={idx}
              className={
                isFirstParagraph
                  ? "first-letter:float-left first-letter:text-5xl first-letter:font-serif-display first-letter:mr-3 first-letter:leading-none first-letter:text-[#1A1A1A]"
                  : ""
              }
            >
              {paragraph}
            </p>
          );
        })}

        {/* Tags */}
        {ensaio.tags && ensaio.tags.length > 0 && (
          <div className="pt-10 border-t border-[#1A1A1A]/15 flex flex-wrap gap-2 text-xs font-mono text-[#1A1A1A]/70">
            <span className="text-[#1A1A1A] font-sans font-bold uppercase tracking-[0.2em] mr-2">TEMAS:</span>
            {ensaio.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A]">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </main>

      {/* Related articles */}
      {otherEnsaios.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 mt-20 border-t border-[#1A1A1A]/15 space-y-8">
          <h3 className="text-2xl font-serif-display text-[#1A1A1A]">
            Outros Ensaios Relacionados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {otherEnsaios.map((e) => (
              <ArticleCard
                key={e.id}
                type="ensaio"
                variant="medium"
                title={e.title}
                subtitle={e.subtitle}
                image={e.coverImage}
                date={e.date}
                readTimeMinutes={e.readTimeMinutes}
                onClick={() => onNavigate(`/ensaios/${e.slug}`)}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
