import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  Film,
  User,
  Share2,
  Check,
  Calendar,
  Tag as TagIcon,
  Sparkles,
  ExternalLink,
  Award,
} from 'lucide-react';
import { fetchListaBySlug } from '../services/repositories/listasRepository';
import { Lista, ListaItem } from '../types';
import { formatEditorialDate } from '../utils/dateUtils';
import { EditorialContent, InlineMarkdown } from '../components/EditorialContent';

interface ListaDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const ListaDetailPage: React.FC<ListaDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const [lista, setLista] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadData() {
      try {
        const { data, error: fetchErr } = await fetchListaBySlug(slug, { includeDrafts: false });
        if (!isMounted) return;

        if (fetchErr || !data) {
          setError(fetchErr?.message || 'Lista editorial não encontrada ou não disponível.');
          setLista(null);
        } else {
          setLista(data);
          document.title = `${data.title} — Listas | Lanterna Mágica`;
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Erro ao carregar a lista solicitada.');
        setLista(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = () => {
    if (!lista) return;
    if (navigator.share) {
      navigator
        .share({
          title: lista.title,
          text: `Lista editorial: ${lista.title}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-36 pb-24 text-center space-y-4 px-4 flex flex-col items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[#D4AF37] mx-auto" />
        <p className="text-xs font-mono text-[#1A1A1A]/60 uppercase tracking-widest">
          Carregando lista editorial...
        </p>
      </div>
    );
  }

  if (error || !lista) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 pb-24 text-center space-y-4 px-4 max-w-lg mx-auto">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#D4AF37] block">
          Lanterna Mágica · Seleções Curatoriais
        </span>
        <h1 className="text-3xl font-serif-display text-[#1A1A1A]">
          Lista não encontrada.
        </h1>
        <p className="text-sm font-serif-body text-[#1A1A1A]/70 leading-relaxed">
          {error || 'A lista solicitada não está disponível, foi despublicada ou o link está incorreto.'}
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('/listas')}
            className="text-xs uppercase tracking-[0.2em] px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors font-bold"
          >
            Ver Todas as Listas
          </button>
          <button
            onClick={() => onNavigate('/arquivo')}
            className="text-xs uppercase tracking-[0.2em] px-5 py-2.5 border border-[#1A1A1A]/30 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors font-bold"
          >
            Explorar Arquivo
          </button>
        </div>
      </div>
    );
  }

  const items = lista.items || [];
  const pubDate = lista.publishedAt || lista.createdAt;

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      {/* Back button & Action Bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 flex items-center justify-between">
        <button
          onClick={onGoBack || (() => onNavigate('/listas'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors font-bold"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Listas</span>
        </button>

        <button
          onClick={handleShare}
          className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-sans transition-colors ${
            copied ? 'text-green-700 font-bold' : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
          }`}
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Link copiado!</span>
            </>
          ) : (
            <>
              <Share2 size={14} />
              <span>Compartilhar</span>
            </>
          )}
        </button>
      </div>

      {/* Header / Hero Section */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 border-b border-[#1A1A1A]/15 pb-12">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
              SELEÇÃO CURATORIAL · LISTA EDITORIAL
            </span>
            {pubDate && (
              <span className="text-xs font-mono text-[#1A1A1A]/50">
                · {formatEditorialDate(pubDate, 'long')}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A] leading-tight">
            {lista.title}
          </h1>

          {lista.intro && (
            <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/85 leading-relaxed max-w-4xl pt-2">
              <InlineMarkdown text={lista.intro} />
            </p>
          )}
        </div>

        {/* Capa Principal (se houver) */}
        {lista.coverImage && (
          <div className="relative border border-[#1A1A1A]/20 bg-[#1A1A1A] overflow-hidden shadow-md aspect-[21/9] max-h-[440px]">
            <img
              src={lista.coverImage}
              alt={lista.title}
              className="w-full h-full object-cover opacity-90"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Metadata & Homenageado */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs font-sans-ui">
          {/* Pessoa Homenageada / Relacionada */}
          {lista.relatedPerson ? (
            <div
              onClick={() => onNavigate(`/pessoas/${lista.relatedPerson!.slug}`)}
              className="group cursor-pointer flex items-center gap-3 p-2.5 bg-white border border-[#1A1A1A]/15 hover:border-[#D4AF37] transition-all shadow-2xs"
            >
              {lista.relatedPerson.photoUrl ? (
                <img
                  src={lista.relatedPerson.photoUrl}
                  alt={lista.relatedPerson.name}
                  className="w-10 h-10 object-cover rounded-full border border-[#1A1A1A]/20 grayscale group-hover:grayscale-0 transition-all"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A]/50">
                  <User size={18} />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
                  Cineasta / Personalidade
                </span>
                <span className="font-serif-display text-sm text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors font-medium">
                  {lista.relatedPerson.name} →
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-[#1A1A1A]/60">
              <Award size={14} className="text-[#D4AF37]" />
              <span>{items.length} obras selecionadas no cânone</span>
            </div>
          )}

          {/* Tags */}
          {lista.tags && lista.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <TagIcon size={12} className="text-[#1A1A1A]/40 mr-1" />
              {lista.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 bg-white text-[#1A1A1A]/70 border border-[#1A1A1A]/15"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Lista de Itens */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 space-y-12">
        {items.length === 0 ? (
          <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
            <p className="font-serif-body text-base text-[#1A1A1A]/70">
              Esta lista ainda não possui itens catalogados no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {items.map((item: ListaItem, index: number) => {
              const displayRank = item.rank ?? index + 1;
              const hasCanonicalFilm = Boolean(item.filmId && item.film);
              const filmSlug = item.film?.slug;
              const itemTitle = item.film?.title || item.title || 'Sem título';
              const itemDirector = item.director || item.film?.director || null;
              const itemYear = item.film?.year || item.year || null;
              const itemCountry = item.film?.country || null;
              const itemImage = item.film?.posterUrl || item.image || item.film?.backdropUrl || null;

              return (
                <section
                  key={item.id || index}
                  id={`item-${displayRank}`}
                  className="bg-white border border-[#1A1A1A]/15 p-6 sm:p-8 transition-all hover:border-[#1A1A1A]/40 shadow-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
                    
                    {/* Imagem / Pôster & Ranking Badge */}
                    <div className="md:col-span-4 lg:col-span-3 flex flex-col space-y-3">
                      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1A1A1A] border border-[#1A1A1A]/20 shadow-xs">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={itemTitle}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-[#F5F2ED]/40 text-center gap-2">
                            <Film size={28} />
                            <span className="text-[10px] font-sans uppercase tracking-widest">Sem Imagem</span>
                          </div>
                        )}

                        {/* Rank Badge */}
                        <div className="absolute top-0 left-0 bg-[#1A1A1A] text-[#D4AF37] px-3 py-1.5 font-serif-display text-base sm:text-lg font-bold border-b border-r border-[#D4AF37]/30 shadow-md">
                          #{displayRank}
                        </div>
                      </div>

                      {hasCanonicalFilm && filmSlug && (
                        <button
                          onClick={() => onNavigate(`/filmes/${filmSlug}`)}
                          className="w-full py-2 px-3 text-[10px] font-sans font-bold uppercase tracking-[0.15em] border border-[#1A1A1A]/20 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Ficha no Acervo</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>

                    {/* Dados Editoriais do Item */}
                    <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-xs font-mono font-bold text-[#D4AF37]">
                            POSIÇÃO #{displayRank}
                          </span>
                          {(itemYear || itemCountry) && (
                            <span className="text-xs font-mono text-[#1A1A1A]/60">
                              {itemYear ? itemYear : ''}
                              {itemYear && itemCountry ? ' · ' : ''}
                              {itemCountry ? itemCountry : ''}
                            </span>
                          )}
                        </div>

                        {/* Título */}
                        <h2 className="text-2xl sm:text-3xl font-serif-display font-normal text-[#1A1A1A] leading-tight">
                          {hasCanonicalFilm && filmSlug ? (
                            <button
                              onClick={() => onNavigate(`/filmes/${filmSlug}`)}
                              className="text-left hover:text-[#D4AF37] transition-colors underline-offset-4 hover:underline"
                            >
                              {itemTitle}
                            </button>
                          ) : (
                            <span>{itemTitle}</span>
                          )}
                        </h2>

                        {/* Diretor */}
                        {itemDirector && (
                          <p className="text-sm font-sans font-medium text-[#1A1A1A]/75">
                            Direção: <span className="font-semibold text-[#1A1A1A]">{itemDirector}</span>
                          </p>
                        )}

                        {/* Nota Crítica / Texto Editorial do Item */}
                        {item.note && (
                          <div className="pt-3">
                            <div className="p-4 bg-[#F5F2ED]/70 border-l-2 border-[#D4AF37] text-sm sm:text-base font-serif-body text-[#1A1A1A]/85 leading-relaxed">
                              <InlineMarkdown text={item.note} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-12 border-t border-[#1A1A1A]/15 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('/listas')}
            className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-5 py-3 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            <span>Voltar para Listas</span>
          </button>
          <button
            onClick={() => onNavigate('/arquivo')}
            className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-5 py-3 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors"
          >
            Explorar Catálogo do Arquivo →
          </button>
        </div>
      </main>
    </article>
  );
};
