import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Film, Calendar, Clock, Globe, Loader2, AlertCircle, User } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { StarRating } from '../components/StarRating';
import { ArticleCard } from '../components/ArticleCard';
import { fetchCriticaBySlug, fetchCriticas, mapSupabaseCriticaToCritica } from '../services/repositories/criticasRepository';
import { Critica } from '../types';
import { formatEditorialDate } from '../utils/dateUtils';

interface CriticaDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const CriticaDetailPage: React.FC<CriticaDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const [critica, setCritica] = useState<Critica | null>(null);
  const [otherCriticas, setOtherCriticas] = useState<Critica[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await fetchCriticaBySlug(slug);
      if (!isMounted) return;

      if (error) {
        setErrorMessage(error.message || 'Erro ao carregar a crítica solicitada.');
        setCritica(null);
      } else if (data) {
        const mapped = mapSupabaseCriticaToCritica(data);
        setCritica(mapped);

        // Fetch other reviews to find related content by director/year
        const { data: allSupabaseCriticas } = await fetchCriticas({ allStatuses: false });
        if (isMounted && allSupabaseCriticas) {
          setOtherCriticas(allSupabaseCriticas.map(mapSupabaseCriticaToCritica));
        }
      } else {
        setCritica(null);
      }
      setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
        <p className="text-xs font-sans uppercase tracking-widest text-[#1A1A1A]/60">
          Carregando crítica...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4 max-w-md mx-auto">
        <AlertCircle size={36} className="text-red-600 mx-auto" />
        <h1 className="text-2xl font-serif-display text-red-900">Erro ao carregar crítica</h1>
        <p className="text-xs font-mono text-[#1A1A1A]/70">{errorMessage}</p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('/criticas')}
            className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
          >
            Voltar para Críticas
          </button>
        </div>
      </div>
    );
  }

  if (!critica) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <h1 className="text-3xl font-serif-display">Crítica não encontrada.</h1>
        <button
          onClick={() => onNavigate('/criticas')}
          className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
        >
          Voltar para Críticas
        </button>
      </div>
    );
  }

  // Related content for director (Essays from cmsStore until Phase 5, Criticas from Supabase)
  const essayRelated = cmsStore.getFilmmakerRelatedContent(critica.director);
  const relatedCriticas = otherCriticas.filter(
    (c) => c.id !== critica.id && (c.director.toLowerCase() === critica.director.toLowerCase() || c.movieTitle.toLowerCase() === critica.movieTitle.toLowerCase())
  );

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${critica.movieTitle} — ${critica.editorialTitle}`,
        text: `Crítica de ${critica.movieTitle} no Lanterna Mágica`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      {/* Back button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
        <button
          onClick={onGoBack || (() => onNavigate('/criticas'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors font-bold"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
      </div>

      {/* Header section */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 text-center">
        <div className="inline-block border-b border-[#1A1A1A]/15 pb-1 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90">
          CRÍTICA CINEMATOGRÁFICA
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A] leading-tight">
            {critica.movieTitle}
          </h1>
          <p className="text-xs font-sans-ui text-[#1A1A1A]/80 uppercase tracking-[0.2em] font-bold pt-1">
            Dir. {critica.director} · {critica.year} {critica.country ? `· ${critica.country}` : ''} {critica.genre || (critica.genres && critica.genres.length > 0) ? `· ${critica.genre || critica.genres?.join(', ')}` : ''}
          </p>
        </div>

        <h2 className="text-xl sm:text-2xl font-serif-display text-[#1A1A1A]/80 italic max-w-2xl mx-auto leading-snug pt-2 font-normal">
          &ldquo;{critica.editorialTitle}&rdquo;
        </h2>

        {/* Rating, Author, Date & Share */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-b border-[#1A1A1A]/15 py-4 text-xs font-sans-ui text-[#1A1A1A]/70">
          <StarRating rating={critica.starRating} size="lg" />

          {/* Autoria */}
          {critica.authors && critica.authors.length > 0 ? (
            <div className="flex items-center gap-2">
              <User size={14} className="text-[#1A1A1A]/80 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                {critica.authors.map((auth, idx) => (
                  <span key={auth.id || idx} className="inline-flex items-center gap-1.5">
                    {auth.member ? (
                      <button
                        onClick={() => onNavigate(`/equipe/${auth.member!.slug}`)}
                        className="font-medium text-[#1A1A1A] hover:text-[#D4AF37] transition-colors underline underline-offset-2"
                      >
                        {auth.member.name}
                      </button>
                    ) : (
                      <strong className="text-[#1A1A1A] font-medium">{critica.author || 'Redação'}</strong>
                    )}
                    {auth.roleName && auth.roleName !== 'Crítica' && (
                      <span className="text-[10px] font-mono text-[#1A1A1A]/60 bg-[#1A1A1A]/5 px-1.5 py-0.5 rounded">
                        {auth.roleName}
                      </span>
                    )}
                    {idx < critica.authors!.length - 1 && <span className="text-[#1A1A1A]/40">·</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : critica.author ? (
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-[#1A1A1A]/80" />
              <span>Por <strong className="text-[#1A1A1A] font-medium">{critica.author}</strong></span>
            </div>
          ) : null}

          {critica.date && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#1A1A1A]/80" />
              <span>{formatEditorialDate(critica.date, 'long')}</span>
            </div>
          )}

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-sans text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors font-semibold ml-auto sm:ml-0"
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
            src={critica.coverImage}
            alt={critica.movieTitle}
            className="w-full h-auto max-h-[600px] object-cover"
          />
        </div>
      </div>

      {/* Tech Spec Sheet (Ficha Resumida) */}
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 mb-10">
        <div className="p-6 bg-white border border-[#1A1A1A]/15 space-y-3 font-sans-ui text-xs text-[#1A1A1A]/80">
          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90 border-b border-[#1A1A1A]/15 pb-2 flex items-center gap-2">
            <Film size={14} />
            <span>Ficha Técnica Resumida</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div><strong className="text-[#1A1A1A] font-semibold">Direção:</strong> {critica.director}</div>
            {critica.screenplay && <div><strong className="text-[#1A1A1A] font-semibold">Roteiro:</strong> {critica.screenplay}</div>}
            {critica.cinematography && <div><strong className="text-[#1A1A1A] font-semibold">Fotografia:</strong> {critica.cinematography}</div>}
            <div><strong className="text-[#1A1A1A] font-semibold">País:</strong> {critica.country}</div>
            <div><strong className="text-[#1A1A1A] font-semibold">Ano:</strong> {critica.year}</div>
            {(critica.genre || (critica.genres && critica.genres.length > 0)) && (
              <div><strong className="text-[#1A1A1A] font-semibold">Gênero:</strong> {critica.genre || critica.genres?.join(', ')}</div>
            )}
            {critica.durationMinutes && <div><strong className="text-[#1A1A1A] font-semibold">Duração:</strong> {critica.durationMinutes} min</div>}
          </div>
        </div>
      </div>

      {/* Main Review Body — Constrained comfortable reading width */}
      <main className="max-w-[700px] mx-auto px-4 sm:px-6 space-y-6 font-serif-body text-base sm:text-lg text-[#1A1A1A]/90 leading-relaxed">
        {critica.content.split('\n\n').map((paragraph, idx) => {
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
          return (
            <p
              key={idx}
              className={
                idx === 0
                  ? "first-letter:float-left first-letter:text-5xl first-letter:font-serif-display first-letter:mr-3 first-letter:leading-none first-letter:text-[#1A1A1A]"
                  : ""
              }
            >
              {paragraph}
            </p>
          );
        })}

        {/* Tags */}
        {critica.tags && critica.tags.length > 0 && (
          <div className="pt-10 border-t border-[#1A1A1A]/15 flex flex-wrap gap-2 text-xs font-mono text-[#1A1A1A]/70">
            <span className="text-[#1A1A1A] font-sans font-bold uppercase tracking-[0.2em] mr-2">TAGS:</span>
            {critica.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A]">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Bloco de Autoria / Equipe Editorial */}
        {critica.authors && critica.authors.filter((a) => !!a.member).length > 0 && (
          <div className="pt-10 mt-10 border-t border-[#1A1A1A]/15 space-y-4">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/60 block">
              Sobre quem assina esta crítica
            </span>
            <div className="space-y-3">
              {critica.authors
                .filter((a) => !!a.member)
                .map((auth) => {
                  const member = auth.member!;
                  return (
                    <div
                      key={auth.id || member.id}
                      className="p-5 bg-white border border-[#1A1A1A]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                            className="w-14 h-14 rounded-full object-cover border border-[#1A1A1A]/15 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A] font-serif-display font-bold text-lg flex items-center justify-center flex-shrink-0">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => onNavigate(`/equipe/${member.slug}`)}
                              className="font-serif-display text-lg text-[#1A1A1A] hover:text-[#D4AF37] transition-colors font-bold text-left"
                            >
                              {member.name}
                            </button>
                            <span className="text-[10px] font-mono uppercase bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2 py-0.5 text-[#1A1A1A]/80 font-semibold">
                              {auth.roleName || 'Crítica'}
                            </span>
                          </div>
                          {member.shortBio && (
                            <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-1 max-w-xl leading-relaxed">
                              {member.shortBio}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate(`/equipe/${member.slug}`)}
                        className="text-xs uppercase tracking-wider font-sans font-bold text-[#1A1A1A] hover:text-[#D4AF37] flex-shrink-0 flex items-center gap-1 self-end sm:self-center"
                      >
                        Ver perfil →
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* Related content for this director */}
      {(relatedCriticas.length > 0 || essayRelated.ensaios.length > 0) && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 mt-20 border-t border-[#1A1A1A]/15 space-y-8">
          <h3 className="text-2xl font-serif-display text-[#1A1A1A]">
            Mais sobre {critica.director} e Obras Relacionadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedCriticas.map((c) => (
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
            {essayRelated.ensaios.map((e) => (
              <ArticleCard
                key={e.id}
                type="ensaio"
                variant="medium"
                title={e.title}
                subtitle={e.subtitle}
                image={e.coverImage}
                onClick={() => onNavigate(`/ensaios/${e.slug}`)}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
