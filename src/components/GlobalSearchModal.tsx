import React, { useState, useEffect } from 'react';
import { Search, X, Film, BookOpen, User, Folder, List, Calendar, Clapperboard } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { SearchResult } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (query.trim()) {
      setResults(cmsStore.searchAll(query));
    } else {
      setResults([]);
    }
  }, [query]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (result: SearchResult) => {
    let path = '/';
    switch (result.type) {
      case 'filme':
        path = `/filmes/${result.slug}`;
        break;
      case 'pessoa':
        path = `/pessoas/${result.slug}`;
        break;
      case 'estreia':
        path = `/filmes/${result.slug}`;
        break;
      case 'ensaio':
        path = `/ensaios/${result.slug}`;
        break;
      case 'critica':
        path = `/criticas/${result.slug}`;
        break;
      case 'cineasta':
        path = `/pessoas/${result.slug}`;
        break;
      case 'especial':
        path = `/especiais/${result.slug}`;
        break;
      case 'uma_imagem':
        path = `/ensaios`;
        break;
      case 'lista':
        path = `/especiais`;
        break;
    }
    onNavigate(path);
    onClose();
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'filme':
        return <Film size={13} className="text-[#D4AF37]" />;
      case 'pessoa':
        return <User size={13} className="text-[#D4AF37]" />;
      case 'estreia':
        return <Calendar size={13} className="text-[#D4AF37]" />;
      case 'ensaio':
        return <BookOpen size={13} className="text-[#1A1A1A]/70" />;
      case 'critica':
        return <Clapperboard size={13} className="text-[#1A1A1A]/70" />;
      case 'cineasta':
        return <User size={13} className="text-[#1A1A1A]/70" />;
      case 'especial':
        return <Folder size={13} className="text-[#1A1A1A]/70" />;
      case 'lista':
        return <List size={13} className="text-[#1A1A1A]/70" />;
      default:
        return <Search size={13} className="text-[#1A1A1A]/70" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'filme':
        return 'Filme';
      case 'pessoa':
        return 'Pessoa';
      case 'estreia':
        return 'Estreia';
      case 'ensaio':
        return 'Ensaio';
      case 'critica':
        return 'Crítica';
      case 'cineasta':
        return 'Cineasta';
      case 'especial':
        return 'Especial';
      case 'lista':
        return 'Lista';
      case 'uma_imagem':
        return 'Uma Imagem';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A]/85 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div className="bg-[#F5F2ED] border border-[#1A1A1A]/20 w-full max-w-2xl overflow-hidden shadow-2xl rounded-none">
        
        {/* Search Header Input */}
        <div className="flex items-center px-5 py-4 border-b border-[#1A1A1A]/15 bg-white">
          <Search size={18} className="text-[#1A1A1A]/80 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por filmes, pessoas, cineastas, ensaios, críticas..."
            className="w-full bg-transparent text-[#1A1A1A] placeholder-[#1A1A1A]/40 font-sans-ui text-base focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#1A1A1A]/50 hover:text-[#1A1A1A] mr-2"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60 hover:text-[#1A1A1A] px-2 py-1 border border-[#1A1A1A]/20"
          >
            ESC
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {query.trim().length === 0 ? (
            <div className="py-12 text-center text-[#1A1A1A]/60 font-serif-body italic text-sm">
              Digite para buscar filmes, pessoas, ensaios e críticas no arquivo do Lanterna Mágica...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-[#1A1A1A]/60 font-serif-body text-sm">
              Nenhum resultado encontrado para &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/70 px-2 py-1">
                {results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
              </div>
              {results.map((res) => (
                <div
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelect(res)}
                  className="flex items-start gap-3 p-3 bg-white hover:bg-[#1A1A1A] text-[#1A1A1A] hover:text-[#F5F2ED] border border-[#1A1A1A]/10 cursor-pointer transition-colors group"
                >
                  {res.image ? (
                    <img
                      src={res.image}
                      alt={res.title}
                      className="w-12 h-14 object-cover bg-[#F5F2ED] shrink-0 border border-[#1A1A1A]/10"
                    />
                  ) : (
                    <div className="w-12 h-14 bg-[#F5F2ED] group-hover:bg-[#1A1A1A] flex items-center justify-center shrink-0 border border-[#1A1A1A]/10">
                      {getTypeIcon(res.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/70 group-hover:text-[#F5F2ED]/70">
                      {getTypeIcon(res.type)}
                      <span>{getTypeLabel(res.type)}</span>
                      {res.date && <span className="opacity-60 font-normal">· {res.date}</span>}
                    </div>
                    <h4 className="text-sm font-serif-display font-normal text-[#1A1A1A] group-hover:text-[#F5F2ED] truncate mt-0.5">
                      {res.title}
                    </h4>
                    {res.subtitle && (
                      <p className="text-xs font-serif-body text-[#1A1A1A]/70 group-hover:text-[#F5F2ED]/80 truncate mt-0.5">
                        {res.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
