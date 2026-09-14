import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, User, Film, Sparkles, BookOpen } from 'lucide-react';
import { fetchEspecialBySlug } from '../services/repositories/especiaisRepository';
import { ArticleCard } from '../components/ArticleCard';
import { Especial, EspecialItem } from '../types';
import { EditorialContent, InlineMarkdown } from '../components/EditorialContent';

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
  const [especial, setEspecial] = useState<Especial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchEspecialBySlug(slug, { includeDrafts: false })
      .then(({ data, error: fetchErr }) => {
        if (!isMounted) return;
        if (fetchErr) {
          setError('Não foi possível carregar o especial solicitado.');
          setEspecial(null);
        } else {
          setEspecial(data);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Ocorreu um erro ao carregar o especial.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
        <p className="text-xs font-mono uppercase tracking-widest text-[#1A1A1A]/60">
          Carregando dossiê especial...
        </p>
      </div>
    );
  }

  if (error || !especial) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <h1 className="text-3xl font-serif-display">Especial não encontrado.</h1>
        <p className="text-sm font-serif-body text-[#1A1A1A]/70 max-w-md mx-auto">
          {error || 'O dossiê solicitado não está disponível ou foi arquivado.'}
        </p>
        <button
          onClick={onGoBack || (() => onNavigate('/especiais'))}
          className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors font-semibold"
        >
          Voltar para Especiais
        </button>
      </div>
    );
  }

  // Filtragem e ordenação dos itens do dossiê
  // Apenas exibe itens cujas entidades existam e respeitem regras públicas se forem publicações
  const visibleItems = (especial.items || []).filter((item: EspecialItem) => {
    if (item.itemType === 'ensaio') {
      const e = item.ensaio;
      if (!e) return false;
      if (e.status && e.status !== 'published') {
        const scheduledTime = (e as any).scheduled_at || e.scheduledAt;
        if (e.status === 'scheduled' && scheduledTime) {
          return new Date(scheduledTime).getTime() <= Date.now();
        }
        return false;
      }
      return true;
    }
    if (item.itemType === 'critica') {
      const c = item.critica;
      if (!c) return false;
      if (c.status && c.status !== 'published') {
        const scheduledTime = (c as any).scheduled_at || c.scheduledAt;
        if (c.status === 'scheduled' && scheduledTime) {
          return new Date(scheduledTime).getTime() <= Date.now();
        }
        return false;
      }
      return true;
    }
    if (item.itemType === 'uma_imagem') {
      const u = item.umaImagem;
      if (!u) return false;
      if (u.status && u.status !== 'published') {
        const scheduledTime = (u as any).scheduled_at || u.scheduledAt;
        if (u.status === 'scheduled' && scheduledTime) {
          return new Date(scheduledTime).getTime() <= Date.now();
        }
        return false;
      }
      return true;
    }
    if (item.itemType === 'lista') {
      const l = item.lista;
      if (!l) return false;
      if (l.status && l.status !== 'published') return false;
      return true;
    }
    if (item.itemType === 'filme') {
      return Boolean(item.filme || item.entity);
    }
    if (item.itemType === 'pessoa') {
      return Boolean(item.pessoa || item.entity);
    }
    return false;
  });

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <button
          onClick={onGoBack || (() => onNavigate('/especiais'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans-ui text-[#1A1A1A]/70 hover:text-[#D4AF37] transition-colors font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Especiais</span>
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
            {especial.subtitle && (
              <p className="text-base sm:text-lg font-serif-body text-[#F5F2ED]/80 max-w-3xl">
                {especial.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Curadores e Personalidade Homenageada */}
        {(especial.authorCredits && especial.authorCredits.length > 0 || especial.relatedPerson) && (
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-[#1A1A1A]/15 text-xs font-sans-ui">
            {/* Autoria/Curadoria */}
            {especial.authorCredits && especial.authorCredits.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/50">
                  Curadoria Editorial:
                </span>
                <div className="flex flex-wrap items-center gap-4">
                  {especial.authorCredits.map((auth) => (
                    <div key={auth.id} className="flex items-center gap-2">
                      {auth.member?.photoUrl ? (
                        <img
                          src={auth.member.photoUrl}
                          alt={auth.member.name}
                          className="w-6 h-6 rounded-full object-cover border border-[#1A1A1A]/20"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[10px] font-bold">
                          {auth.member?.name?.charAt(0) || 'A'}
                        </div>
                      )}
                      <span className="font-semibold text-[#1A1A1A]">
                        {auth.member?.name || 'Membro'}
                      </span>
                      {auth.roleName && (
                        <span className="text-[11px] text-[#1A1A1A]/60 italic">
                          ({auth.roleName})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personalidade Homenageada */}
            {especial.relatedPerson && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/50">
                  Homenagem:
                </span>
                <button
                  onClick={() => onNavigate(`/pessoas/${especial.relatedPerson?.slug}`)}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#1A1A1A] hover:text-[#D4AF37] transition-colors"
                >
                  {especial.relatedPerson.photo_url && (
                    <img
                      src={especial.relatedPerson.photo_url}
                      alt={especial.relatedPerson.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  )}
                  <span>{especial.relatedPerson.name}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Intro e Conteúdo */}
        {(especial.intro || especial.content) && (
          <div className="max-w-3xl mx-auto py-8 space-y-6 border-b border-[#1A1A1A]/15">
            {especial.intro && (
              <p className="font-serif-body font-semibold text-[#1A1A1A] text-lg sm:text-xl leading-relaxed">
                <InlineMarkdown text={especial.intro} />
              </p>
            )}
            {especial.content && (
              <EditorialContent content={especial.content} />
            )}
          </div>
        )}

        {/* Curated Contents Section */}
        <div className="space-y-12 pt-8">
          <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
            <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A]">
              Obras e Publicações do Dossiê
            </h2>
            {visibleItems.length > 0 && (
              <span className="text-xs font-sans-ui uppercase tracking-widest text-[#1A1A1A]/60">
                {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'itens'}
              </span>
            )}
          </div>

          {visibleItems.length === 0 ? (
            <div className="bg-white border border-[#1A1A1A]/15 p-8 text-center space-y-2">
              <p className="font-serif-body text-base text-[#1A1A1A]/70">
                Este dossiê ainda não possui publicações vinculadas no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleItems.map((item) => {
                // 1. Ensaio
                if (item.itemType === 'ensaio' && (item.ensaio || item.entity)) {
                  const ensaio = item.ensaio || item.entity;
                  return (
                    <div key={item.id} className="relative flex flex-col">
                      {item.customLabel && (
                        <div className="mb-2 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                          {item.customLabel}
                        </div>
                      )}
                      <ArticleCard
                        type="ensaio"
                        variant="medium"
                        title={ensaio.title}
                        subtitle={ensaio.subtitle}
                        image={ensaio.cover_image || ensaio.coverImage}
                        date={ensaio.published_at || ensaio.created_at}
                        onClick={() => onNavigate(`/ensaios/${ensaio.slug}`)}
                      />
                    </div>
                  );
                }

                // 2. Crítica
                if (item.itemType === 'critica' && (item.critica || item.entity)) {
                  const critica = item.critica || item.entity;
                  const critFilm = critica.film || (Array.isArray(critica.film) ? critica.film[0] : null);
                  return (
                    <div key={item.id} className="relative flex flex-col">
                      {item.customLabel && (
                        <div className="mb-2 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                          {item.customLabel}
                        </div>
                      )}
                      <ArticleCard
                        type="critica"
                        variant="medium"
                        title={critica.editorial_title || critica.title}
                        movieTitle={critFilm?.title}
                        director={critFilm ? undefined : undefined}
                        year={critFilm?.year}
                        country={critFilm?.country}
                        image={critica.cover_image || critica.coverImage || critFilm?.backdrop_url || critFilm?.poster_url}
                        starRating={critica.star_rating || critica.starRating}
                        onClick={() => onNavigate(`/criticas/${critica.slug}`)}
                      />
                    </div>
                  );
                }

                // 3. Uma Imagem, Uma Ideia
                if (item.itemType === 'uma_imagem' && (item.umaImagem || item.entity)) {
                  const umaImagem = item.umaImagem || item.entity;
                  return (
                    <div key={item.id} className="relative flex flex-col">
                      {item.customLabel && (
                        <div className="mb-2 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                          {item.customLabel}
                        </div>
                      )}
                      <ArticleCard
                        type="uma_imagem"
                        variant="medium"
                        title={umaImagem.title}
                        subtitle={item.customLabel || 'Uma imagem, uma ideia'}
                        image={umaImagem.image_url || umaImagem.coverImage || umaImagem.image}
                        onClick={() => onNavigate(`/uma-imagem/${umaImagem.slug}`)}
                      />
                    </div>
                  );
                }

                // 4. Lista
                if (item.itemType === 'lista' && (item.lista || item.entity)) {
                  const lista = item.lista || item.entity;
                  return (
                    <div key={item.id} className="relative flex flex-col">
                      {item.customLabel && (
                        <div className="mb-2 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                          {item.customLabel}
                        </div>
                      )}
                      <ArticleCard
                        type="lista"
                        variant="medium"
                        title={lista.title}
                        subtitle={lista.intro}
                        image={lista.cover_image || lista.coverImage}
                        onClick={() => onNavigate(`/listas/${lista.slug}`)}
                      />
                    </div>
                  );
                }

                // 5. Filme
                if (item.itemType === 'filme' && (item.filme || item.entity)) {
                  const filme = item.filme || item.entity;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onNavigate(`/filmes/${filme.slug}`)}
                      className="group cursor-pointer flex flex-col justify-between p-5 bg-white border border-[#1A1A1A]/12 hover:border-[#1A1A1A] transition-colors duration-300 space-y-3"
                    >
                      <div className="space-y-3">
                        <div className="w-full aspect-[16/10] overflow-hidden bg-neutral-900 border border-[#1A1A1A]/10">
                          <img
                            src={filme.backdrop_url || filme.poster_url || filme.coverImage || '/placeholder-film.jpg'}
                            alt={filme.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                            loading="lazy"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90">
                          <span>{item.customLabel || 'FILME NO ACERVO'}</span>
                          {filme.year && <span className="text-[#1A1A1A]/50 font-normal">{filme.year}</span>}
                        </div>

                        <h3 className="text-xl font-serif-display font-normal text-[#1A1A1A] transition-colors leading-tight group-hover:underline underline-offset-4 decoration-1">
                          {filme.title}
                        </h3>

                        {filme.country && (
                          <p className="text-xs font-sans-ui text-[#1A1A1A]/60">
                            {filme.country}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#1A1A1A]/10 flex items-center justify-between">
                        <span className="text-xs font-sans-ui font-semibold text-[#1A1A1A] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Ver ficha do filme →
                        </span>
                      </div>
                    </div>
                  );
                }

                // 6. Pessoa / Cineasta
                if (item.itemType === 'pessoa' && (item.pessoa || item.entity)) {
                  const pessoa = item.pessoa || item.entity;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onNavigate(`/pessoas/${pessoa.slug}`)}
                      className="group cursor-pointer flex flex-col justify-between p-5 bg-white border border-[#1A1A1A]/12 hover:border-[#1A1A1A] transition-colors duration-300 space-y-3"
                    >
                      <div className="space-y-3">
                        <div className="w-full aspect-[16/10] overflow-hidden bg-neutral-900 border border-[#1A1A1A]/10">
                          <img
                            src={pessoa.photo_url || pessoa.coverImage || '/placeholder-person.jpg'}
                            alt={pessoa.name || pessoa.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                            loading="lazy"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/90">
                          <span>{item.customLabel || 'PERFIL BIOGRÁFICO'}</span>
                        </div>

                        <h3 className="text-xl font-serif-display font-normal text-[#1A1A1A] transition-colors leading-tight group-hover:underline underline-offset-4 decoration-1">
                          {pessoa.name || pessoa.title}
                        </h3>
                      </div>

                      <div className="pt-3 border-t border-[#1A1A1A]/10 flex items-center justify-between">
                        <span className="text-xs font-sans-ui font-semibold text-[#1A1A1A] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Ver perfil completo →
                        </span>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>

      </div>
    </article>
  );
};
