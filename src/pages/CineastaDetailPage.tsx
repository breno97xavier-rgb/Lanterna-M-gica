import React from 'react';
import { ArrowLeft, User, Globe, Calendar } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { ArticleCard } from '../components/ArticleCard';

interface CineastaDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const CineastaDetailPage: React.FC<CineastaDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const cineasta = cmsStore.getCineastaBySlug(slug);

  if (!cineasta) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <h1 className="text-3xl font-serif-display">Cineasta não encontrado.</h1>
        <button
          onClick={() => onNavigate('/cineastas')}
          className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors font-semibold"
        >
          Voltar para Cineastas
        </button>
      </div>
    );
  }

  // Related content auto-resolved
  const related = cmsStore.getFilmmakerRelatedContent(cineasta.name);

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <button
          onClick={onGoBack || (() => onNavigate('/cineastas'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans-ui text-[#1A1A1A]/70 hover:text-[#D4AF37] transition-colors font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
      </div>

      {/* Header section */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-[#1A1A1A]/15 pb-12">
          <div className="md:col-span-4 flex justify-center md:justify-start">
            <img
              src={cineasta.photo}
              alt={cineasta.name}
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-full object-cover border-2 border-[#1A1A1A]/20 filter grayscale hover:grayscale-0 transition-all duration-500 shadow-lg"
            />
          </div>

          <div className="md:col-span-8 space-y-4 text-center md:text-left">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
              PERFIL DE CINEASTA
            </span>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
              {cineasta.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-mono text-[#D4AF37]">
              <span className="flex items-center gap-1 font-sans font-bold uppercase tracking-wider">
                <Globe size={14} /> {cineasta.country}
              </span>
              {cineasta.birthYear && (
                <span className="flex items-center gap-1 font-sans font-bold uppercase tracking-wider">
                  <Calendar size={14} /> {cineasta.birthYear}–{cineasta.deathYear || 'Presente'}
                </span>
              )}
            </div>

            <div className="font-serif-body text-base sm:text-lg text-[#1A1A1A]/80 leading-relaxed pt-2 max-w-2xl">
              {cineasta.bio.split('\n\n').map((p, i) => (
                <p key={i} className="mb-2">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Published Index for this Filmmaker */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 space-y-16">
        <h2 className="text-3xl font-serif-display text-[#1A1A1A] border-b border-[#1A1A1A]/15 pb-4">
          Arquivo e Publicações sobre {cineasta.name}
        </h2>

        {/* Críticas */}
        {related.criticas.length > 0 && (
          <section className="space-y-6">
            <h3 className="text-xl font-serif-display text-[#1A1A1A]/80">
              Críticas Filmográficas ({related.criticas.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.criticas.map((c) => (
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
          </section>
        )}

        {/* Ensaios */}
        {related.ensaios.length > 0 && (
          <section className="space-y-6">
            <h3 className="text-xl font-serif-display text-[#1A1A1A]/80">
              Ensaios e Reflexões ({related.ensaios.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {related.ensaios.map((e) => (
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
            </div>
          </section>
        )}

        {/* Especiais & Listas */}
        {related.especiais.length > 0 && (
          <section className="space-y-6">
            <h3 className="text-xl font-serif-display text-[#1A1A1A]/80">
              Especiais Relacionados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {related.especiais.map((es) => (
                <ArticleCard
                  key={es.id}
                  type="especial"
                  variant="medium"
                  title={es.title}
                  subtitle={es.subtitle}
                  image={es.coverImage}
                  onClick={() => onNavigate(`/especiais/${es.slug}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </article>
  );
};
