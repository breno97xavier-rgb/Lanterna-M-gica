import React from 'react';
import { StarRating } from './StarRating';
import { ArrowRight } from 'lucide-react';
import { formatEditorialDate } from '../utils/dateUtils';

interface ArticleCardProps {
  type: 'ensaio' | 'critica' | 'uma_imagem' | 'especial' | 'cineasta' | 'lista';
  title: string;
  subtitle?: string;
  image?: string;
  date?: string;
  author?: string;
  readTimeMinutes?: number;
  starRating?: number;
  movieTitle?: string;
  director?: string;
  year?: number;
  country?: string;
  genre?: string;
  variant?: 'large' | 'medium' | 'compact' | 'horizontal';
  theme?: 'light' | 'dark';
  onClick: () => void;
  className?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  type,
  title,
  subtitle,
  image,
  date,
  author,
  readTimeMinutes,
  starRating,
  movieTitle,
  director,
  year,
  country,
  genre,
  variant = 'medium',
  theme = 'light',
  onClick,
  className = '',
}) => {
  const getTypeBadge = () => {
    switch (type) {
      case 'ensaio':
        return 'ENSAIO';
      case 'critica':
        return 'CRÍTICA';
      case 'uma_imagem':
        return 'UMA IMAGEM, UMA IDEIA';
      case 'especial':
        return 'ESPECIAL';
      case 'cineasta':
        return 'CINEASTA';
      case 'lista':
        return 'LISTA';
    }
  };

  const formatDate = (dateStr?: string) => {
    return formatEditorialDate(dateStr, 'short');
  };

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-[#121212]' : 'bg-white';
  const borderClass = isDark ? 'border-[#F5F2ED]/15 hover:border-[#F5F2ED]/40' : 'border-[#1A1A1A]/12 hover:border-[#1A1A1A]';
  const textPrimary = isDark ? 'text-[#F5F2ED]' : 'text-[#1A1A1A]';
  const textSecondary = isDark ? 'text-[#F5F2ED]/70' : 'text-[#1A1A1A]/70';
  const textMuted = isDark ? 'text-[#F5F2ED]/50' : 'text-[#1A1A1A]/50';
  const metaCategory = isDark ? 'text-[#F5F2ED]/90' : 'text-[#1A1A1A]/90';
  const dividerClass = isDark ? 'border-[#F5F2ED]/10' : 'border-[#1A1A1A]/10';

  // Horizontal layout variant
  if (variant === 'horizontal') {
    return (
      <article
        onClick={onClick}
        className={`group cursor-pointer grid grid-cols-1 sm:grid-cols-12 gap-6 p-5 ${bgClass} border ${borderClass} transition-colors duration-300 ${className}`}
      >
        {image && (
          <div className="sm:col-span-4 aspect-[16/10] overflow-hidden bg-neutral-900 border border-[#1A1A1A]/10">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              loading="lazy"
            />
          </div>
        )}
        <div className={`${image ? 'sm:col-span-8' : 'sm:col-span-12'} flex flex-col justify-between space-y-3`}>
          <div>
            <div className={`flex items-center gap-2 mb-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.2em] ${metaCategory}`}>
              <span>{getTypeBadge()}</span>
              {date && <span className={`${textMuted} font-normal`}>· {formatDate(date)}</span>}
            </div>

            <h3 className={`text-xl sm:text-2xl font-serif-display font-normal ${textPrimary} transition-colors leading-tight group-hover:underline underline-offset-4 decoration-1`}>
              {title}
            </h3>

            {subtitle && (
              <p className={`mt-2 text-sm font-serif-body ${textSecondary} line-clamp-2 leading-relaxed`}>
                {subtitle}
              </p>
            )}

            {director && (
              <p className={`mt-1 text-xs font-sans-ui ${textMuted}`}>
                {movieTitle ? `${movieTitle} (${year})` : ''} · Dir. {director} {country ? `· ${country}` : ''}
              </p>
            )}
          </div>

          <div className={`flex items-center justify-between pt-2 border-t ${dividerClass}`}>
            {starRating !== undefined ? (
              <StarRating rating={starRating} size="sm" theme={theme} />
            ) : (
              <span className={`text-xs font-sans-ui font-semibold ${textPrimary} flex items-center gap-1 group-hover:translate-x-1 transition-transform`}>
                Ler <ArrowRight size={13} />
              </span>
            )}
            {readTimeMinutes && (
              <span className={`text-[11px] font-sans-ui ${textMuted}`}>
                {readTimeMinutes} min de leitura
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  // Large hero/main card variant
  if (variant === 'large') {
    return (
      <article
        onClick={onClick}
        className={`group cursor-pointer flex flex-col space-y-4 p-6 sm:p-8 ${bgClass} border ${borderClass} transition-colors duration-300 ${className}`}
      >
        {image && (
          <div className="w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden bg-neutral-900 border border-[#1A1A1A]/10">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              loading="lazy"
            />
          </div>
        )}

        <div className="space-y-2 pt-2">
          <div className={`flex items-center gap-3 text-[10px] font-sans font-bold uppercase tracking-[0.25em] ${metaCategory}`}>
            <span>{getTypeBadge()}</span>
            {date && <span className={`${textMuted} font-normal`}>· {formatDate(date)}</span>}
            {readTimeMinutes && <span className={`${textMuted} font-normal`}>· {readTimeMinutes} min</span>}
          </div>

          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-serif-display font-normal ${textPrimary} transition-colors leading-tight group-hover:underline underline-offset-4 decoration-1`}>
            {title}
          </h2>

          {subtitle && (
            <p className={`text-base sm:text-lg font-serif-body ${textSecondary} leading-relaxed max-w-3xl`}>
              {subtitle}
            </p>
          )}

          {starRating !== undefined && (
            <div className="pt-2">
              <StarRating rating={starRating} size="md" theme={theme} />
            </div>
          )}

          <div className="pt-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-[0.18em] ${textPrimary} group-hover:translate-x-1.5 transition-transform duration-200`}>
              Ler ensaio <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </article>
    );
  }

  // Compact card
  if (variant === 'compact') {
    return (
      <article
        onClick={onClick}
        className={`group cursor-pointer py-4 border-b ${dividerClass} transition-colors ${className}`}
      >
        <div className={`flex items-center justify-between text-[10px] font-sans font-bold uppercase tracking-[0.2em] ${metaCategory} mb-1`}>
          <span>{getTypeBadge()}</span>
          {date && <span className={`${textMuted} font-normal`}>{formatDate(date)}</span>}
        </div>
        <h4 className={`text-base font-serif-display font-normal ${textPrimary} group-hover:underline underline-offset-2 transition-colors leading-snug`}>
          {title}
        </h4>
        {subtitle && (
          <p className={`text-xs font-serif-body ${textMuted} mt-1 line-clamp-1`}>
            {subtitle}
          </p>
        )}
      </article>
    );
  }

  // Standard Medium Card (Default)
  return (
    <article
      onClick={onClick}
      className={`group cursor-pointer flex flex-col justify-between space-y-3 p-5 ${bgClass} border ${borderClass} transition-colors duration-300 ${className}`}
    >
      <div className="space-y-3">
        {image && (
          <div className="w-full aspect-[16/10] overflow-hidden bg-neutral-900 border border-[#1A1A1A]/10">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              loading="lazy"
            />
          </div>
        )}

        <div className={`flex items-center justify-between text-[10px] font-sans font-bold uppercase tracking-[0.2em] ${metaCategory}`}>
          <span>{getTypeBadge()}</span>
          {date && <span className={`${textMuted} font-normal`}>{formatDate(date)}</span>}
        </div>

        <h3 className={`text-xl font-serif-display font-normal ${textPrimary} transition-colors leading-tight group-hover:underline underline-offset-4 decoration-1`}>
          {title}
        </h3>

        {subtitle && (
          <p className={`text-xs sm:text-sm font-serif-body ${textSecondary} line-clamp-3 leading-relaxed`}>
            {subtitle}
          </p>
        )}

        {director && (
          <p className={`text-xs font-sans-ui ${textMuted}`}>
            {movieTitle ? `${movieTitle} (${year})` : ''} · Dir. {director} {country ? `· ${country}` : ''} {genre ? `· ${genre}` : ''}
          </p>
        )}
      </div>

      <div className={`pt-3 border-t ${dividerClass} flex items-center justify-between`}>
        {starRating !== undefined ? (
          <StarRating rating={starRating} size="sm" theme={theme} />
        ) : (
          <span className={`text-xs font-sans-ui font-semibold ${textPrimary} flex items-center gap-1 group-hover:translate-x-1 transition-transform`}>
            Ler <ArrowRight size={13} />
          </span>
        )}
        {readTimeMinutes && (
          <span className={`text-[11px] font-sans-ui ${textMuted}`}>
            {readTimeMinutes} min
          </span>
        )}
      </div>
    </article>
  );
};
