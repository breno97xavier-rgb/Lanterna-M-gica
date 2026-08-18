import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { HighlightItem } from '../types';
import { BrandLogo } from './BrandLogo';

interface HeroCarouselProps {
  highlights: HighlightItem[];
  onNavigate: (path: string) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  highlights,
  onNavigate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-slide every 7.5 seconds
  useEffect(() => {
    if (highlights.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
    }, 7500);
    return () => clearInterval(interval);
  }, [highlights.length]);

  // Handle empty state (Institutional Hero)
  if (highlights.length === 0) {
    return (
      <section className="relative min-h-[75vh] flex items-center justify-center border-b border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] overflow-hidden py-28 px-4 sm:px-6 lg:px-8">
        {/* Subtle geometric light beam motif in monochrome */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(135deg,rgba(255,255,255,0.2)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl text-center space-y-8">
          <div className="flex justify-center mb-6">
            <BrandLogo size="lg" theme="dark" />
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif-display text-[#F5F2ED] leading-snug tracking-tight font-normal max-w-2xl mx-auto">
            Publicação independente sobre cinema, cultura e pensamento.
          </h1>

          <p className="text-sm sm:text-base font-serif-body text-[#F5F2ED]/70 max-w-xl mx-auto leading-relaxed">
            O cinema como ponto de partida para refletir sobre estética, narrativa, memória e a experiência do nosso tempo.
          </p>

          <div className="pt-6 flex flex-wrap justify-center items-center gap-6">
            <button
              onClick={() => onNavigate('/sobre')}
              className="text-xs font-sans font-bold uppercase tracking-[0.2em] px-6 py-3 border border-[#F5F2ED]/30 text-[#F5F2ED] hover:border-[#F5F2ED] hover:bg-[#F5F2ED] hover:text-[#1A1A1A] transition-all"
            >
              Conhecer a Publicação
            </button>
            <button
              onClick={() => onNavigate('/manifesto')}
              className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-[#F5F2ED]/70 hover:text-[#F5F2ED] transition-colors flex items-center gap-1.5"
            >
              Nosso Manifesto <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const activeItem = highlights[currentIndex];

  const getItemUrl = (item: HighlightItem) => {
    switch (item.itemType) {
      case 'ensaio':
        return `/ensaios/${item.slug}`;
      case 'critica':
        return `/criticas/${item.slug}`;
      case 'especial':
        return `/especiais/${item.slug}`;
      case 'cineasta':
        return `/cineastas/${item.slug}`;
      case 'uma_imagem':
        return `/ensaios`;
      default:
        return '/';
    }
  };

  const getItemTypeBadge = (item: HighlightItem) => {
    switch (item.itemType) {
      case 'ensaio':
        return 'ENSAIO EDITORIAL';
      case 'critica':
        return 'CRÍTICA DE CINEMA';
      case 'especial':
        return 'PROJETO ESPECIAL';
      case 'cineasta':
        return 'PERFIL DE CINEASTA';
      case 'uma_imagem':
        return 'UMA IMAGEM, UMA IDEIA';
      default:
        return 'DESTAQUE';
    }
  };

  const getItemTitle = (item: HighlightItem) => {
    if (item.itemType === 'critica') {
      return item.editorialTitle;
    }
    if (item.itemType === 'cineasta') {
      return item.name;
    }
    return item.title;
  };

  const getItemSubtitle = (item: HighlightItem) => {
    if (item.itemType === 'critica') {
      return `${item.movieTitle} (${item.year}) · Dir. ${item.director}`;
    }
    if (item.itemType === 'ensaio' || item.itemType === 'especial') {
      return item.subtitle;
    }
    if (item.itemType === 'cineasta') {
      const dates = item.birthYear ? ` (${item.birthYear}${item.deathYear ? `–${item.deathYear}` : ''})` : '';
      return `${item.country}${dates} · Retrospectiva, filmografia e perfil crítico`;
    }
    if (item.itemType === 'uma_imagem') {
      return item.relatedMovie ? `Reflexão sobre ${item.relatedMovie}` : '';
    }
    return '';
  };

  const getItemImage = (item: HighlightItem) => {
    if (item.itemType === 'uma_imagem') return item.image;
    if (item.itemType === 'cineasta') return item.photo;
    return item.coverImage;
  };

  return (
    <section className="relative w-full min-h-[80vh] sm:min-h-[82vh] md:min-h-[85vh] lg:min-h-[88vh] bg-[#121212] border-b border-[#1A1A1A] overflow-hidden flex flex-col justify-end pt-24 sm:pt-28">
      {/* Background Image with subtle Fade and Scale Transition */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {highlights.map((item, idx) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Photographic Layer - preserving clarity, lighting, faces and framing */}
            <img
              src={getItemImage(item)}
              alt={getItemTitle(item)}
              className="w-full h-full object-cover object-[center_35%] md:object-[center_30%] filter brightness-[0.92] contrast-[1.04] transition-transform duration-10000 ease-out transform scale-105"
            />

            {/* Mobile Vertical Gradient: Clear top (15%), progressive mid (35%), grounded bottom (85%) */}
            <div className="md:hidden absolute inset-0 bg-gradient-to-b from-[#121212]/15 via-[#121212]/35 via-50% to-[#121212]/85 pointer-events-none" />

            {/* Desktop Vertical Gradient: Light top header protection (15%), breathing space in center (30%), grounded bottom (85%) */}
            <div className="hidden md:block absolute inset-0 bg-gradient-to-b from-[#121212]/15 via-[#121212]/30 via-50% to-[#121212]/85 pointer-events-none" />

            {/* Desktop Horizontal Gradient: Anchored contrast on left side (80% -> 40% -> 0%), right side clear and open */}
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#121212]/80 via-[#121212]/40 via-45% to-transparent pointer-events-none" />

            {/* Subtle localized soft vignette on the bottom-left text area */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(18,18,18,0.5)_0%,transparent_65%)] pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
        <div className="max-w-3xl space-y-4">
          
          {/* Category Tag */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#F5F2ED] text-[#1A1A1A] text-[10px] font-sans font-bold uppercase tracking-[0.22em]">
              {getItemTypeBadge(activeItem)}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-normal text-[#F5F2ED] leading-[1.08] tracking-tight">
            {getItemTitle(activeItem)}
          </h1>

          {/* Excerpt */}
          <p className="text-base sm:text-lg md:text-xl font-serif-body text-[#F5F2ED]/80 leading-relaxed max-w-2xl font-normal">
            {getItemSubtitle(activeItem)}
          </p>

          {/* Discreet Editorial CTA */}
          <div className="pt-3">
            <button
              onClick={() => onNavigate(getItemUrl(activeItem))}
              className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.22em] text-[#F5F2ED] hover:text-white group border-b border-[#F5F2ED]/40 pb-1 hover:border-[#F5F2ED] transition-all"
            >
              <span>Ler publicação</span>
              <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>

        </div>

        {/* Carousel Navigation Controls */}
        {highlights.length > 1 && (
          <div className="mt-10 flex items-center justify-between border-t border-[#F5F2ED]/15 pt-5">
            {/* Indicators */}
            <div className="flex items-center space-x-2">
              {highlights.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Ir para destaque ${idx + 1}`}
                  className={`h-0.5 transition-all duration-300 ${
                    idx === currentIndex
                      ? 'w-10 bg-[#F5F2ED]'
                      : 'w-3 bg-[#F5F2ED]/30 hover:bg-[#F5F2ED]/60'
                  }`}
                />
              ))}
            </div>

            {/* Arrows */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setCurrentIndex(
                    (prev) => (prev - 1 + highlights.length) % highlights.length
                  )
                }
                aria-label="Destaque anterior"
                className="p-2 border border-[#F5F2ED]/20 bg-[#1A1A1A]/70 hover:bg-[#1A1A1A] text-[#F5F2ED] transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  setCurrentIndex((prev) => (prev + 1) % highlights.length)
                }
                aria-label="Próximo destaque"
                className="p-2 border border-[#F5F2ED]/20 bg-[#1A1A1A]/70 hover:bg-[#1A1A1A] text-[#F5F2ED] transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
