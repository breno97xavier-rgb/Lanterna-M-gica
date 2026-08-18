import React from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { ArticleCard } from '../components/ArticleCard';

interface EspecialDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const EspecialDetailPage: React.FC<EspecialDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const especial = cmsStore.getEspecialBySlug(slug);

  if (!especial) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <h1 className="text-3xl font-serif-display">Especial não encontrado.</h1>
        <button
          onClick={() => onNavigate('/especiais')}
          className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors font-semibold"
        >
          Voltar para Especiais
        </button>
      </div>
    );
  }

  // Related items resolved from relatedItemIds
  const ensaios = cmsStore.getEnsaios(true).filter((e) => especial.relatedItemIds.includes(e.id));
  const criticas = cmsStore.getCriticas(true).filter((c) => especial.relatedItemIds.includes(c.id));
  const cineastas = cmsStore.getCineastas().filter((cin) => especial.relatedItemIds.includes(cin.id));

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <button
          onClick={onGoBack || (() => onNavigate('/especiais'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans-ui text-[#1A1A1A]/70 hover:text-[#D4AF37] transition-colors font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
      </div>

      {/* Hero Banner for Special */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="relative border border-[#1A1A1A]/20 bg-[#1A1A1A] overflow-hidden shadow-md">
          <img
            src={especial.coverImage}
            alt={especial.title}
            className="w-full h-[400px] object-cover opacity-60 filter grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 space-y-3">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
              DOSSIÊ EDITORIAL ESPECIAL
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-normal text-[#F5F2ED]">
              {especial.title}
            </h1>
            <p className="text-base sm:text-lg font-serif-body text-[#F5F2ED]/80 max-w-3xl">
              {especial.subtitle}
            </p>
          </div>
        </div>

        {/* Intro */}
        <div className="max-w-3xl mx-auto py-8 space-y-6 font-serif-body text-base sm:text-lg text-[#1A1A1A]/90 leading-relaxed border-b border-[#1A1A1A]/15">
          <p className="font-semibold text-[#1A1A1A]">{especial.intro}</p>
          {especial.content.split('\n\n').map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>

        {/* Curated Contents Section */}
        <div className="space-y-12 pt-8">
          <h2 className="text-3xl font-serif-display text-[#1A1A1A] border-b border-[#1A1A1A]/15 pb-4">
            Obras e Publicações do Dossiê
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ensaios.map((e) => (
              <ArticleCard
                key={e.id}
                type="ensaio"
                variant="medium"
                title={e.title}
                subtitle={e.subtitle}
                image={e.coverImage}
                date={e.date}
                onClick={() => onNavigate(`/ensaios/${e.slug}`)}
              />
            ))}

            {criticas.map((c) => (
              <ArticleCard
                key={c.id}
                type="critica"
                variant="medium"
                title={c.editorialTitle}
                movieTitle={c.movieTitle}
                director={c.director}
                year={c.year}
                image={c.coverImage}
                starRating={c.starRating}
                onClick={() => onNavigate(`/criticas/${c.slug}`)}
              />
            ))}
          </div>
        </div>

      </div>
    </article>
  );
};
