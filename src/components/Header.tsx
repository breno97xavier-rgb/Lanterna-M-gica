import React, { useState, useEffect } from 'react';
import { Search, Menu, X, ArrowLeft } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  activePath: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePath,
  onNavigate,
  onGoBack,
  onOpenSearch,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsScrolled(currentScrollY > 30);
      
      if (currentScrollY > 150 && currentScrollY > lastScrollY && !mobileMenuOpen) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, mobileMenuOpen]);

  const navItems = [
    { label: 'Início', path: '/' },
    { label: 'Ensaios', path: '/ensaios' },
    { label: 'Críticas', path: '/criticas' },
    { label: 'Uma Imagem', path: '/uma-imagem' },
    { label: 'Estreias', path: '/estreias' },
    { label: 'Especiais', path: '/especiais' },
    { label: 'Arquivo', path: '/arquivo' },
    { label: 'Sobre', path: '/sobre' },
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out bg-[#F5F2ED]/95 backdrop-blur-md border-b ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${
        isScrolled
          ? 'py-3 border-[#1A1A1A]/15 shadow-xs'
          : 'py-5 border-[#1A1A1A]/10'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Back Button */}
        <div className="flex items-center gap-3">
          {activePath !== '/' && onGoBack && (
            <button
              onClick={onGoBack}
              title="Voltar para a página anterior"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#1A1A1A]/80 text-xs font-sans font-bold uppercase tracking-wider transition-all shadow-xs"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}

          <button
            onClick={() => handleNavClick('/')}
            className="text-left focus:outline-none group transition-opacity duration-200 hover:opacity-80"
          >
            <BrandLogo size={isScrolled ? 'sm' : 'md'} theme="light" />
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
          {navItems.map((item) => {
            const isActive =
              activePath === item.path ||
              (item.path !== '/' && activePath.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`text-xs font-sans-ui uppercase tracking-[0.16em] transition-colors duration-200 relative py-1 ${
                  isActive
                    ? 'text-[#1A1A1A] font-bold'
                    : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A1A1A]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Search & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Search Icon Button */}
          <button
            onClick={onOpenSearch}
            aria-label="Abrir busca"
            className="p-2 text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors duration-200 hover:bg-[#1A1A1A]/5"
          >
            <Search size={18} />
          </button>

          {/* Admin link button (discrete) */}
          <button
            onClick={() => handleNavClick('/admin')}
            title="Painel Administrativo"
            className="hidden lg:block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors px-2 py-1 border border-[#1A1A1A]/20 hover:border-[#1A1A1A]"
          >
            CMS
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menu"
            className="md:hidden p-2 text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors duration-200"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1A1A1A]/10 bg-[#F5F2ED] px-6 py-6 space-y-4">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => {
              const isActive = activePath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`text-left text-base font-sans-ui uppercase tracking-wider py-2 border-b border-[#1A1A1A]/10 transition-colors ${
                    isActive
                      ? 'text-[#1A1A1A] font-bold pl-2 border-l-2 border-l-[#1A1A1A]'
                      : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => handleNavClick('/admin')}
              className="text-left text-xs uppercase tracking-widest text-[#1A1A1A]/60 py-2 pt-2 font-mono"
            >
              Painel CMS
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
