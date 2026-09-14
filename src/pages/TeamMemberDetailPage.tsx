import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Mail,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Film,
  Loader2,
  ExternalLink,
  BookOpen,
  Star,
} from 'lucide-react';
import { TeamMember, TeamMemberSocialLinks } from '../types';
import { fetchTeamMemberBySlug } from '../services/repositories/teamMembersRepository';
import {
  fetchMemberPublications,
  MemberPublicationItem,
} from '../services/repositories/editorialAuthorsRepository';
import { calculatePersonAge, formatEditorialDate } from '../utils/dateUtils';
import { StarRating } from '../components/StarRating';
import { EditorialContent, InlineMarkdown } from '../components/EditorialContent';

interface TeamMemberDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const TeamMemberDetailPage: React.FC<TeamMemberDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [publications, setPublications] = useState<{
    ensaios: MemberPublicationItem[];
    criticas: MemberPublicationItem[];
    umaImagem: MemberPublicationItem[];
    especiais: MemberPublicationItem[];
    all: MemberPublicationItem[];
  }>({
    ensaios: [],
    criticas: [],
    umaImagem: [],
    especiais: [],
    all: [],
  });
  const [loadingPubs, setLoadingPubs] = useState(false);
  const [pubFilter, setPubFilter] = useState<'all' | 'ensaio' | 'critica' | 'uma_imagem' | 'especial'>('all');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    fetchTeamMemberBySlug(slug, { allowUnpublished: false })
      .then(async ({ data, error }) => {
        if (!isMounted) return;
        if (error || !data) {
          setNotFound(true);
          setMember(null);
          setLoading(false);
        } else {
          setMember(data);
          // SEO básico
          const primaryRoleName = data.roles?.find((r) => r.isPrimary)?.role?.name;
          const pageTitle = primaryRoleName
            ? `${data.name} (${primaryRoleName}) — Equipe | Lanterna Mágica`
            : `${data.name} — Equipe | Lanterna Mágica`;
          document.title = pageTitle;
          setLoading(false);

          // Carregar publicações do integrante
          setLoadingPubs(true);
          const pubsRes = await fetchMemberPublications(data.id);
          if (isMounted) {
            setPublications({
              ensaios: pubsRes.ensaios,
              criticas: pubsRes.criticas,
              umaImagem: pubsRes.umaImagem || [],
              especiais: pubsRes.especiais || [],
              all: pubsRes.all,
            });
            setLoadingPubs(false);
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setNotFound(true);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 pb-24 flex flex-col items-center justify-center space-y-4 px-4">
        <Loader2 size={32} className="animate-spin text-[#1A1A1A]/60" />
        <p className="text-xs font-mono text-[#1A1A1A]/60 uppercase tracking-widest">
          Carregando perfil editorial...
        </p>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 pb-24 text-center space-y-6 px-4 max-w-xl mx-auto">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#D4AF37] block">
          Lanterna Mágica · Equipe
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif-display text-[#1A1A1A]">
          Integrante não encontrado.
        </h1>
        <p className="text-sm sm:text-base font-serif-body text-[#1A1A1A]/70 leading-relaxed">
          O perfil solicitado não consta no quadro ativo de integrantes da publicação ou não está disponível publicamente.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => (onGoBack ? onGoBack() : onNavigate('/sobre'))}
            className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Sobre</span>
          </button>
        </div>
      </div>
    );
  }

  // Papéis editoriais
  const primaryRole = member.roles?.find((r) => r.isPrimary)?.role?.name || member.roles?.[0]?.role?.name;
  const secondaryRoles = (member.roles || [])
    .filter((r) => !r.isPrimary && r.role?.name && r.role.name !== primaryRole)
    .map((r) => r.role?.name);

  // Idade e data
  const age = calculatePersonAge(member.birthDate);
  const formattedBirthDate = member.birthDate ? formatEditorialDate(member.birthDate, 'long') : null;

  // Social Links
  const links: TeamMemberSocialLinks = (member.socialLinks as TeamMemberSocialLinks) || {};
  const hasSocialLinks = Boolean(
    links.instagram ||
    links.letterboxd ||
    links.twitter ||
    links.bluesky ||
    links.linkedin ||
    links.website ||
    links.email
  );

  // Normalização de URLs sociais
  const formatSocialUrl = (type: string, value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '#';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

    switch (type) {
      case 'instagram':
        return `https://instagram.com/${trimmed.replace(/^@/, '')}`;
      case 'letterboxd':
        return `https://letterboxd.com/${trimmed.replace(/^\/+/, '')}`;
      case 'twitter':
        return `https://twitter.com/${trimmed.replace(/^@/, '')}`;
      case 'bluesky':
        return trimmed.includes('.')
          ? `https://bsky.app/profile/${trimmed.replace(/^@/, '')}`
          : `https://bsky.app/profile/${trimmed.replace(/^@/, '')}.bsky.social`;
      case 'linkedin':
        return trimmed.startsWith('in/')
          ? `https://linkedin.com/${trimmed}`
          : `https://linkedin.com/in/${trimmed}`;
      case 'website':
        return `https://${trimmed}`;
      default:
        return trimmed;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
          <button
            onClick={() => (onGoBack ? onGoBack() : onNavigate('/sobre'))}
            className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Voltar à Página Sobre</span>
          </button>

          <span className="text-[10px] font-mono uppercase tracking-widest text-[#1A1A1A]/50">
            EQUIPE EDITORIAL
          </span>
        </div>

        {/* Profile Header Box */}
        <header className="bg-white border border-[#1A1A1A]/15 p-6 sm:p-10 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left">
            {/* Avatar Circular */}
            <div className="shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-[#1A1A1A] bg-[#F5F2ED] flex items-center justify-center shadow-sm">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="font-serif-display text-4xl sm:text-5xl text-[#1A1A1A]/40 font-bold">
                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
            </div>

            {/* Main Info */}
            <div className="flex-1 space-y-3">
              {/* Funções */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {primaryRole && (
                  <span className="px-3 py-1 bg-[#1A1A1A] text-[#F5F2ED] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
                    {primaryRole}
                  </span>
                )}
                {secondaryRoles.map((roleName) => (
                  <span
                    key={roleName}
                    className="px-2.5 py-1 bg-[#F5F2ED] border border-[#1A1A1A]/15 text-[#1A1A1A]/80 text-[10px] font-sans font-semibold uppercase tracking-[0.15em]"
                  >
                    {roleName}
                  </span>
                ))}
              </div>

              {/* Nome */}
              <h1 className="text-3xl sm:text-4xl font-serif-display text-[#1A1A1A] leading-tight">
                {member.name}
              </h1>

              {/* Data de Nascimento & Idade Dinâmica */}
              {(formattedBirthDate || age !== null) && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-serif-body text-[#1A1A1A]/70 pt-1">
                  <Calendar size={13} className="text-[#D4AF37]" />
                  <span>
                    {formattedBirthDate && `Nascido(a) em ${formattedBirthDate}`}
                    {age !== null && (
                      <span className="ml-1 text-[#1A1A1A]/60">({age} anos)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Short Bio */}
              {member.shortBio && (
                <p className="text-base font-serif-body italic text-[#1A1A1A]/85 pt-2 border-t border-[#1A1A1A]/10">
                  “<InlineMarkdown text={member.shortBio} />”
                </p>
              )}

              {/* Links Sociais e Contato */}
              {hasSocialLinks && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-3">
                  {links.instagram && (
                    <a
                      href={formatSocialUrl('instagram', links.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-xs font-mono text-[#1A1A1A] transition-colors"
                      title="Instagram"
                    >
                      <Instagram size={13} />
                      <span>Instagram</span>
                    </a>
                  )}

                  {links.letterboxd && (
                    <a
                      href={formatSocialUrl('letterboxd', links.letterboxd)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-xs font-mono text-[#1A1A1A] transition-colors"
                      title="Letterboxd"
                    >
                      <Film size={13} />
                      <span>Letterboxd</span>
                    </a>
                  )}

                  {links.twitter && (
                    <a
                      href={formatSocialUrl('twitter', links.twitter)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-xs font-mono text-[#1A1A1A] transition-colors"
                      title="X / Twitter"
                    >
                      <Twitter size={13} />
                      <span>X / Twitter</span>
                    </a>
                  )}

                  {links.bluesky && (
                    <a
                      href={formatSocialUrl('bluesky', links.bluesky)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-xs font-mono text-[#1A1A1A] transition-colors"
                      title="Bluesky"
                    >
                      <Globe size={13} />
                      <span>Bluesky</span>
                    </a>
                  )}

                  {links.linkedin && (
                    <a
                      href={formatSocialUrl('linkedin', links.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-xs font-mono text-[#1A1A1A] transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin size={13} />
                      <span>LinkedIn</span>
                    </a>
                  )}

                  {links.website && (
                    <a
                      href={formatSocialUrl('website', links.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-xs font-mono text-[#1A1A1A] transition-colors"
                      title="Website Pessoal"
                    >
                      <Globe size={13} />
                      <span>Website</span>
                      <ExternalLink size={11} className="opacity-70" />
                    </a>
                  )}

                  {links.email && (
                    <a
                      href={`mailto:${links.email.trim()}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-xs font-mono text-[#1A1A1A] transition-colors"
                      title="E-mail de Contato Editorial"
                    >
                      <Mail size={13} />
                      <span>{links.email.trim()}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Biografia Completa */}
        {member.bio && (
          <section className="max-w-[720px] mx-auto space-y-6">
            <h2 className="text-xl sm:text-2xl font-serif-display text-[#1A1A1A] border-b border-[#1A1A1A]/15 pb-3 flex items-center justify-between">
              <span>Biografia & Trajetória</span>
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                Perfil Editorial
              </span>
            </h2>

            <EditorialContent content={member.bio} />
          </section>
        )}

        {/* Publicações do Integrante */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1A1A1A]/15 pb-4 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif-display text-[#1A1A1A]">
                Publicações & Contribuições
              </h2>
              <p className="text-xs font-serif-body text-[#1A1A1A]/60 mt-0.5">
                Ensaios e críticas cinematográficas assinadas por {member.name}
              </p>
            </div>

            {/* Filter Tabs */}
            {publications.all.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 bg-white border border-[#1A1A1A]/15 p-1 self-start sm:self-auto text-xs font-mono">
                <button
                  onClick={() => setPubFilter('all')}
                  className={`px-3 py-1 transition-colors ${
                    pubFilter === 'all'
                      ? 'bg-[#1A1A1A] text-[#F5F2ED] font-bold'
                      : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  Todas ({publications.all.length})
                </button>
                {publications.ensaios.length > 0 && (
                  <button
                    onClick={() => setPubFilter('ensaio')}
                    className={`px-3 py-1 transition-colors ${
                      pubFilter === 'ensaio'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] font-bold'
                        : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                    }`}
                  >
                    Ensaios ({publications.ensaios.length})
                  </button>
                )}
                {publications.criticas.length > 0 && (
                  <button
                    onClick={() => setPubFilter('critica')}
                    className={`px-3 py-1 transition-colors ${
                      pubFilter === 'critica'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] font-bold'
                        : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                    }`}
                  >
                    Críticas ({publications.criticas.length})
                  </button>
                )}
                {publications.umaImagem.length > 0 && (
                  <button
                    onClick={() => setPubFilter('uma_imagem')}
                    className={`px-3 py-1 transition-colors ${
                      pubFilter === 'uma_imagem'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] font-bold'
                        : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                    }`}
                  >
                    Uma Imagem ({publications.umaImagem.length})
                  </button>
                )}
                {publications.especiais.length > 0 && (
                  <button
                    onClick={() => setPubFilter('especial')}
                    className={`px-3 py-1 transition-colors ${
                      pubFilter === 'especial'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] font-bold'
                        : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                    }`}
                  >
                    Especiais ({publications.especiais.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {loadingPubs ? (
            <div className="p-8 text-center bg-white border border-[#1A1A1A]/15 space-y-2">
              <Loader2 size={24} className="animate-spin text-[#1A1A1A]/60 mx-auto" />
              <p className="text-xs font-mono text-[#1A1A1A]/60 uppercase tracking-wider">
                Carregando publicações do autor...
              </p>
            </div>
          ) : (
            (() => {
              const displayedPubs =
                pubFilter === 'ensaio'
                  ? publications.ensaios
                  : pubFilter === 'critica'
                  ? publications.criticas
                  : pubFilter === 'uma_imagem'
                  ? publications.umaImagem
                  : pubFilter === 'especial'
                  ? publications.especiais
                  : publications.all;

              if (displayedPubs.length === 0) {
                return (
                  <div className="p-8 text-center bg-white border border-[#1A1A1A]/15 space-y-2">
                    <p className="text-sm font-serif-body text-[#1A1A1A]/60">
                      Nenhuma publicação atribuída a este autor até o momento.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {displayedPubs.map((pub) => {
                    const targetUrl =
                      pub.type === 'ensaio'
                        ? `/ensaios/${pub.slug}`
                        : pub.type === 'critica'
                        ? `/criticas/${pub.slug}`
                        : pub.type === 'uma_imagem'
                        ? `/uma-imagem/${pub.slug}`
                        : `/especiais/${pub.slug}`;

                    const typeBadgeLabel =
                      pub.type === 'ensaio'
                        ? 'Ensaio'
                        : pub.type === 'critica'
                        ? 'Crítica'
                        : pub.type === 'uma_imagem'
                        ? 'Uma Imagem'
                        : 'Especial';

                    return (
                      <div
                        key={`${pub.type}-${pub.id}`}
                        onClick={() => onNavigate(targetUrl)}
                        className="group cursor-pointer bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all overflow-hidden flex flex-col justify-between"
                      >
                        {pub.coverImage && (
                          <div className="w-full h-44 overflow-hidden bg-[#1A1A1A]/5 relative">
                            <img
                              src={pub.coverImage}
                              alt={pub.title}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-[#1A1A1A] text-[#F5F2ED] text-[9px] font-mono font-bold uppercase tracking-wider">
                                {typeBadgeLabel}
                              </span>
                              {pub.roleName && (
                                <span className="px-2 py-0.5 bg-[#F5F2ED]/95 border border-[#1A1A1A]/20 text-[#1A1A1A] text-[9px] font-mono font-semibold uppercase">
                                  {pub.roleName}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            {!pub.coverImage && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="px-2 py-0.5 bg-[#1A1A1A] text-[#F5F2ED] text-[9px] font-mono font-bold uppercase tracking-wider">
                                  {typeBadgeLabel}
                                </span>
                                {pub.roleName && (
                                  <span className="px-2 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/20 text-[#1A1A1A] text-[9px] font-mono font-semibold uppercase">
                                    {pub.roleName}
                                  </span>
                                )}
                              </div>
                            )}

                            {pub.type === 'critica' && pub.movieTitle && (
                              <div className="text-[11px] font-sans-ui text-[#1A1A1A]/80 uppercase tracking-wider font-bold mb-1">
                                {pub.movieTitle} {pub.year ? `(${pub.year})` : ''}{' '}
                                {pub.director ? `· Dir. ${pub.director}` : ''}
                              </div>
                            )}

                            {pub.type === 'uma_imagem' && pub.movieTitle && (
                              <div className="text-[11px] font-sans-ui text-[#1A1A1A]/80 uppercase tracking-wider font-bold mb-1">
                                Filme: {pub.movieTitle} {pub.director ? `· Dir. ${pub.director}` : ''}
                              </div>
                            )}

                            <h3 className="font-serif-display text-lg text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug">
                              {pub.title}
                            </h3>

                            {pub.subtitle && (
                              <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-1 line-clamp-2 leading-relaxed">
                                {pub.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 border-t border-[#1A1A1A]/10 flex items-center justify-between text-[11px] font-mono text-[#1A1A1A]/60">
                            <span>{formatEditorialDate(pub.date, 'short')}</span>
                            {pub.starRating !== undefined && (
                              <span className="text-amber-700 font-sans font-bold flex items-center gap-1">
                                ★ {pub.starRating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </section>
      </div>
    </div>
  );
};
