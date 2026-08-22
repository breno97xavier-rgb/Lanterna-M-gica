import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Film, User, Share2, Check, Loader2, Calendar, Tag } from 'lucide-react';
import {
  fetchUmaImagemBySlug,
  fetchUmaImagem,
  mapSupabaseUmaImagemToDomain,
  SupabaseUmaImagem,
} from '../services/repositories/umaImagemRepository';
import { ArticleCard } from '../components/ArticleCard';
import { UmaImagemUmaIdeia } from '../types';
import { formatEditorialDate } from '../utils/dateUtils';

interface UmaImagemDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const UmaImagemDetailPage: React.FC<UmaImagemDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const [item, setItem] = useState<UmaImagemUmaIdeia | null>(null);
  const [relatedItems, setRelatedItems] = useState<UmaImagemUmaIdeia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadData() {
      const { data, error: fetchErr } = await fetchUmaImagemBySlug(slug, { allStatuses: false });
      if (!isMounted) return;

      if (fetchErr || !data) {
        setError(fetchErr?.message || 'Publicação não encontrada ou indisponível.');
        setItem(null);
        setLoading(false);
        return;
      }

      const domainItem = mapSupabaseUmaImagemToDomain(data);
      setItem(domainItem);

      // Atualiza o título da aba
      document.title = `${domainItem.title} — Uma Imagem, Uma Ideia | Lanterna Mágica`;

      // Carregar outras publicações públicas de Uma Imagem
      const { data: allItems } = await fetchUmaImagem({ limit: 4, allStatuses: false });
      if (isMounted && allItems) {
        const others = allItems
          .filter((i) => i.id !== data.id)
          .map(mapSupabaseUmaImagemToDomain)
          .slice(0, 2);
        setRelatedItems(others);
      }

      setLoading(false);
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = () => {
    if (!item) return;
    if (navigator.share) {
      navigator
        .share({
          title: item.title,
          text: `Uma Imagem, Uma Ideia: ${item.title}`,
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
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-36 pb-24 text-center space-y-4 px-4">
        <Loader2 size={36} className="animate-spin text-[#D4AF37] mx-auto" />
        <p className="text-xs font-mono text-[#1A1A1A]/60 uppercase tracking-widest">
          Carregando publicação...
        </p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 pb-24 text-center space-y-4 px-4 max-w-lg mx-auto">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#D4AF37] block">
          Lanterna Mágica · Uma Imagem, Uma Ideia
        </span>
        <h1 className="text-3xl font-serif-display text-[#1A1A1A]">
          Publicação não encontrada.
        </h1>
        <p className="text-sm font-serif-body text-[#1A1A1A]/70 leading-relaxed">
          A publicação solicitada não está disponível, foi despublicada ou o link está incorreto.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('/arquivo')}
            className="text-xs uppercase tracking-[0.2em] px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors font-bold"
          >
            Explorar Arquivo
          </button>
        </div>
      </div>
    );
  }

  const paragraphs = item.content.split('\n\n').filter((p) => p.trim() !== '');

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      {/* Back button & Action Bar */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8 flex items-center justify-between">
        <button
          onClick={onGoBack || (() => onNavigate('/arquivo'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors font-bold"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>

        <button
          onClick={handleShare}
          className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-sans transition-colors ${
            copied ? 'text-emerald-700 font-bold' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
          }`}
          title="Compartilhar publicação"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          <span>{copied ? 'Link Copiado!' : 'Compartilhar'}</span>
        </button>
      </div>

      {/* Header */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-2 text-[11px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90">
          <Sparkles size={14} className="text-[#D4AF37]" />
          <span>UMA IMAGEM, UMA IDEIA</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif-display font-normal text-[#1A1A1A] leading-tight tracking-tight">
          {item.title}
        </h1>

        {/* Metadados Editoriais */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#1A1A1A]/70 border-b border-[#1A1A1A]/15 pb-6">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-[#1A1A1A]/60" />
            <span>{formatEditorialDate(item.date, 'long')}</span>
          </div>

          {item.authors && item.authors.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#1A1A1A]/40">·</span>
              <span className="text-[#1A1A1A]/60 uppercase font-sans font-bold text-[10px] tracking-wider">
                Por
              </span>
              {item.authors.map((auth, idx) => (
                <span key={auth.id || idx} className="inline-flex items-center gap-1">
                  {auth.member ? (
                    <button
                      onClick={() => onNavigate(`/equipe/${auth.member!.slug}`)}
                      className="font-semibold text-[#1A1A1A] hover:text-[#D4AF37] transition-colors underline decoration-[#1A1A1A]/30 underline-offset-2"
                    >
                      {auth.member.name}
                    </button>
                  ) : (
                    <span className="font-semibold text-[#1A1A1A]">Lanterna Mágica</span>
                  )}
                  {auth.roleName && auth.roleName !== 'Texto' && (
                    <span className="text-[10px] text-[#1A1A1A]/50">({auth.roleName})</span>
                  )}
                  {idx < item.authors!.length - 1 && <span>,</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Imagem Principal em Grande Destaque Fotográfico */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 my-10">
        <div className="overflow-hidden bg-[#121212] border border-[#1A1A1A]/15 shadow-sm">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-auto max-h-[640px] object-cover mx-auto select-none"
          />
        </div>
      </div>

      {/* Conteúdo / Reflexão */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="space-y-6">
          {paragraphs.map((p, index) => (
            <p
              key={index}
              className={`font-serif-body text-[#1A1A1A]/90 leading-relaxed ${
                index === 0
                  ? 'text-lg sm:text-xl font-normal leading-relaxed first-letter:text-4xl first-letter:font-serif-display first-letter:mr-2 first-letter:float-left first-letter:text-[#1A1A1A]'
                  : 'text-base sm:text-lg'
              }`}
            >
              {p}
            </p>
          ))}
        </div>

        {/* Tags / Temas */}
        {item.tags && item.tags.length > 0 && (
          <div className="pt-8 border-t border-[#1A1A1A]/15 flex flex-wrap items-center gap-2 text-xs font-mono text-[#1A1A1A]/70">
            <span className="text-[#1A1A1A] font-sans font-bold uppercase tracking-[0.2em] mr-2 flex items-center gap-1">
              <Tag size={12} className="text-[#D4AF37]" /> TEMAS:
            </span>
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A] font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Vínculos Relacionais: Filme e Pessoa */}
        {(item.film || item.person) && (
          <div className="pt-8 border-t border-[#1A1A1A]/15 space-y-4">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/60 block">
              Vínculos do Acervo
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {item.film && (
                <div
                  onClick={() => onNavigate(`/filmes/${item.film!.slug}`)}
                  className="p-4 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] cursor-pointer transition-all flex items-center gap-4 group"
                >
                  {item.film.posterUrl ? (
                    <img
                      src={item.film.posterUrl}
                      alt={item.film.title}
                      className="w-14 h-20 object-cover border border-[#1A1A1A]/15 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-20 bg-[#1A1A1A]/5 border border-[#1A1A1A]/15 flex items-center justify-center flex-shrink-0 text-[#1A1A1A]/40">
                      <Film size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                      FILME RELACIONADO
                    </span>
                    <h4 className="font-serif-display text-base text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors truncate font-bold">
                      {item.film.title}
                    </h4>
                    {item.film.year && (
                      <p className="text-xs font-mono text-[#1A1A1A]/60">({item.film.year})</p>
                    )}
                    <span className="text-[10px] font-sans font-semibold uppercase text-[#1A1A1A]/60 group-hover:text-[#1A1A1A] transition-colors inline-flex items-center gap-1 mt-1">
                      Ver ficha do filme →
                    </span>
                  </div>
                </div>
              )}

              {item.person && (
                <div
                  onClick={() => onNavigate(`/pessoas/${item.person!.slug}`)}
                  className="p-4 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] cursor-pointer transition-all flex items-center gap-4 group"
                >
                  {item.person.photoUrl ? (
                    <img
                      src={item.person.photoUrl}
                      alt={item.person.name}
                      className="w-16 h-16 rounded-full object-cover border border-[#1A1A1A]/15 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#1A1A1A]/10 border border-[#1A1A1A]/15 flex items-center justify-center flex-shrink-0 text-[#1A1A1A] font-serif-display font-bold text-lg">
                      {item.person.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                      CINEASTA / ARTISTA
                    </span>
                    <h4 className="font-serif-display text-base text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors truncate font-bold">
                      {item.person.name}
                    </h4>
                    <span className="text-[10px] font-sans font-semibold uppercase text-[#1A1A1A]/60 group-hover:text-[#1A1A1A] transition-colors inline-flex items-center gap-1 mt-1">
                      Ver catálogo →
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bloco de Autoria / Equipe Editorial */}
        {item.authors && item.authors.filter((a) => !!a.member).length > 0 && (
          <div className="pt-10 mt-10 border-t border-[#1A1A1A]/15 space-y-4">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/60 block">
              Sobre quem assina esta reflexão
            </span>
            <div className="space-y-3">
              {item.authors
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
                              {auth.roleName || 'Texto'}
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

      {/* Outras Publicações de "Uma Imagem, Uma Ideia" */}
      {relatedItems.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 mt-16 border-t border-[#1A1A1A]/15 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-serif-display text-[#1A1A1A]">
              Mais Reflexões Visuais
            </h3>
            <button
              onClick={() => onNavigate('/arquivo')}
              className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors"
            >
              Ver Arquivo →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedItems.map((rel) => (
              <ArticleCard
                key={rel.id}
                type="uma_imagem"
                variant="medium"
                title={rel.title}
                subtitle={rel.relatedMovie ? `Filme: ${rel.relatedMovie}` : 'Uma imagem, uma ideia'}
                image={rel.image}
                date={rel.date}
                onClick={() => onNavigate(`/uma-imagem/${rel.slug}`)}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
