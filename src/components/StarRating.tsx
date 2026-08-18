import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number; // 0.5 to 5.0
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 'md',
  showNumber = true,
  theme = 'light',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 18;

  const stars = [];
  const normalizedRating = Math.max(0, Math.min(5, rating));

  const activeColor = theme === 'dark' ? 'fill-[#F5F2ED] text-[#F5F2ED]' : 'fill-[#1A1A1A] text-[#1A1A1A]';
  const inactiveColor = theme === 'dark' ? 'text-[#F5F2ED]/25 fill-transparent' : 'text-[#1A1A1A]/20 fill-transparent';
  const textColor = theme === 'dark' ? 'text-[#F5F2ED]/70' : 'text-[#1A1A1A]/70';

  for (let i = 1; i <= maxStars; i++) {
    const fillAmount = normalizedRating - (i - 1);

    if (fillAmount >= 1) {
      // Full star
      stars.push(
        <Star
          key={i}
          size={iconSize}
          className={activeColor}
        />
      );
    } else if (fillAmount >= 0.5) {
      // Half star
      stars.push(
        <div key={i} className="relative inline-block leading-none">
          {/* Base empty star */}
          <Star size={iconSize} className={inactiveColor} />
          {/* Half overlay */}
          <div className="absolute top-0 left-0 w-1/2 overflow-hidden leading-none">
            <Star size={iconSize} className={activeColor} />
          </div>
        </div>
      );
    } else {
      // Empty star
      stars.push(
        <Star
          key={i}
          size={iconSize}
          className={inactiveColor}
        />
      );
    }
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">{stars}</div>
      {showNumber && (
        <span className={`text-[11px] font-mono tracking-wider ${textColor}`}>
          {normalizedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};
