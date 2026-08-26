import React from 'react';

interface BrandLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  theme = 'dark',
  size = 'md',
  className = '',
  showText = true,
}) => {
  // Official transparent symbol asset (local canonical file)
  const symbolUrl = '/simbolo-lanterna.png';

  const sizeDimensions = {
    sm: { img: 'h-7 w-auto', text: 'text-base leading-none' },
    md: { img: 'h-10 w-auto', text: 'text-xl leading-none' },
    lg: { img: 'h-14 w-auto', text: 'text-3xl leading-none' },
  };

  const { img, text } = sizeDimensions[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img
        src={symbolUrl}
        alt="Lanterna Mágica — Símbolo Oficial"
        className={`${img} object-contain transition-all duration-300 ${
          theme === 'dark' ? 'brightness-0 invert' : ''
        }`}
        loading="eager"
      />
      {showText && (
        <div className={`font-serif-display font-normal tracking-wide flex flex-col justify-center ${
          theme === 'dark' ? 'text-[#f4f3ef]' : 'text-[#0d0d0d]'
        } ${text}`}>
          <span className="block tracking-tight">Lanterna</span>
          <span className="block tracking-tight -mt-0.5">Mágica</span>
        </div>
      )}
    </div>
  );
};
