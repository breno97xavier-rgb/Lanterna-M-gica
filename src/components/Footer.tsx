import React from 'react';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#1A1A1A] border-t border-[#1A1A1A] text-[#F5F2ED] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        
        {/* Left column: Brand & Tagline */}
        <div className="space-y-3 max-w-md">
          <button
            onClick={() => onNavigate('/')}
            className="text-left focus:outline-none hover:opacity-80 transition-opacity"
          >
            <BrandLogo size="sm" theme="dark" />
          </button>
          <p className="text-xs text-[#F5F2ED]/70 font-sans-ui leading-relaxed tracking-wide">
            Publicação independente sobre cinema, cultura e pensamento.
          </p>
        </div>

        {/* Center navigation links */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.2em] font-sans-ui text-[#F5F2ED]/80">
          <button onClick={() => onNavigate('/ensaios')} className="hover:text-white transition-colors">
            Ensaios
          </button>
          <button onClick={() => onNavigate('/criticas')} className="hover:text-white transition-colors">
            Críticas
          </button>
          <button onClick={() => onNavigate('/uma-imagem')} className="hover:text-white transition-colors">
            Uma Imagem
          </button>
          <button onClick={() => onNavigate('/especiais')} className="hover:text-white transition-colors">
            Especiais
          </button>
          <button onClick={() => onNavigate('/arquivo')} className="hover:text-white transition-colors">
            Arquivo
          </button>
          <button onClick={() => onNavigate('/sobre')} className="hover:text-white transition-colors">
            Sobre
          </button>
          <button onClick={() => onNavigate('/manifesto')} className="hover:text-white transition-colors">
            Manifesto
          </button>
        </div>

        {/* Right column: External links */}
        <div className="flex flex-col items-start md:items-end space-y-2 text-xs font-sans-ui">
          <div className="flex items-center space-x-3 text-[#F5F2ED]/90">
            <a
              href="https://instagram.com/lanternamagica.cinema"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors underline decoration-[#F5F2ED]/30 underline-offset-4"
            >
              Instagram
            </a>
            <span className="text-[#F5F2ED]/30">·</span>
            <a
              href="https://letterboxd.com/brenoxmatos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors underline decoration-[#F5F2ED]/30 underline-offset-4"
            >
              Letterboxd
            </a>
            <span className="text-[#F5F2ED]/30">·</span>
            <a
              href="mailto:lanternaamagica@gmail.com"
              className="hover:text-white transition-colors underline decoration-[#F5F2ED]/30 underline-offset-4"
            >
              E-mail
            </a>
          </div>

          <p className="text-[11px] text-[#F5F2ED]/40 font-mono pt-2 uppercase tracking-widest">
            © {new Date().getFullYear()} LANTERNA MÁGICA · EDITORIAL
          </p>
        </div>

      </div>
    </footer>
  );
};
