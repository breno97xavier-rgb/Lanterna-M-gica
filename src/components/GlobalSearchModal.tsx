import React, { useState, useEffect } from 'react';
import { Search, X, Film, BookOpen, User, Folder, List, Calendar, Clapperboard, Loader2 } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { SearchResult } from '../types';
import { fetchPessoas } from '../services/repositories/pessoasRepository';
import { fetchFilmes } from '../services/repositories/filmesRepository';
import { fetchCriticas, mapSupabaseCriticaToCritica } from '../services/repositories/criticasRepository';
import { fetchEnsaios, mapSupabaseEnsaioToEnsaio } from '../services/repositories/ensaiosRepository';

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
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const q = query.trim().toLowerCase();

    if (!q) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const [pessoasRes, filmesRes, criticasRes, ensaiosRes] = await Promise.all([
          fetchPessoas({ searchQuery: q, allStatuses: false }),
          fetchFilmes({ search: q, allStatuses: false }),
          fetchCriticas({ searchQuery: q, allStatuses: false }),
          fetchEnsaios({ searchQuery: q, allStatuses: false }),
        ]);

        if (isCancelled) return;

        const filmResults: SearchResult[] = (filmesRes.data || []).map((f) => ({
          id: f.id,
          type: 'filme',
          title: f.title,
          subtitle: `${f.legacy_director_name ? `Dir. ${f.legacy_director_name} · ` : ''}${f.year || ''}${f.country ? ` · ${f.country}` : ''}`,
          slug: f.slug,
          image: f.poster_url || undefined,
        }));

        const personResults: SearchResult[] = (pessoasRes.data || []).map((p) => ({
          id: p.id,
          type: 'pessoa',
          title: p.name,
          subtitle: `${p.primary_roles && p.primary_roles.length > 0 ? p.primary_roles.join(', ') : 'Cinema'}${p.country ? ` · ${p.country}` : ''}`,
          slug: p.slug,
          image: p.photo_url || undefined,
        }));

        const criticasResults: SearchResult[] = (criticasRes.data || []).map((c) => {
          const mapped = mapSupabaseCriticaToCritica(c);
          return {
            id: mapped.id,
            type: 'critica',
            title: `${mapped.movieTitle} — ${mapped.editorialTitle}`,
            subtitle: `Dir. ${mapped.director} (${mapped.year}) · ★ ${mapped.starRating.toFixed(1)}`,
            slug: mapped.slug,
            date: mapped.date,
            image: mapped.coverImage,
            tags: mapped.tags,
          };
        });

        const ensaiosResults: SearchResult[] = (ensaiosRes.data || []).map((e) => {
          const mapped = mapSupabaseEnsaioToEnsaio(e);
          return {
            id: mapped.id,
            type: 'ensaio',
            title: mapped.title,
            subtitle: mapped.subtitle,
            slug: mapped.slug,
            date: mapped.date,
            image: mapped.coverImage,
            tags: mapped.tags,
          };
        });

        // Unmigrated entities from cmsStore
        const otherResults: SearchResult[] = [];

        // Especiais
        cmsStore.getEspeciais(true).forEach((es) => {
          if (
            es.title.toLowerCase().includes(q) ||
            es.subtitle?.toLowerCase().includes(q) ||
            es.intro?.toLowerCase().includes(q)
          ) {
            otherResults.push({
              id: es.id,
              type: 'especial',
              title: es.title,
              subtitle: es.subtitle,
              slug: es.slug,
              image: es.coverImage,
            });
          }
        });

        // Listas
        cmsStore.getListas(true).forEach((l) => {
          if (
            l.title.toLowerCase().includes(q) ||
            l.intro?.toLowerCase().includes(q) ||
            l.tags.some((t) => t.toLowerCase().includes(q))
          ) {
            otherResults.push({
              id: l.id,
              type: 'lista',
              title: l.title,
              subtitle: l.intro,
              slug: l.slug,
              image: l.coverImage,
              tags: l.tags,
            });
          }
        });

        // Uma Imagem
        cmsStore.getUmaImagemList(true).forEach((u) => {
          if (
            u.title.toLowerCase().includes(q) ||
            u.content.toLowerCase().includes(q) ||
            u.tags.some((t) => t.toLowerCase().includes(q))
          ) {
            otherResults.push({
              id: u.id,
              type: 'uma_imagem',
              title: u.title,
              subtitle: u.relatedMovie ? `Filme: ${u.relatedMovie}` : 'Uma imagem, uma ideia',
              slug: u.slug,
              date: u.date,
              image: u.image,
              tags: u.tags,
            });
          }
        });

        // Estreias
        cmsStore.getEstreias(true).forEach((est) => {
          if (
            est.filmTitle?.toLowerCase().includes(q) ||
            est.filmDirector?.toLowerCase().includes(q) ||
            est.filmCountry?.toLowerCase().includes(q)
          ) {
            otherResults.push({
              id: est.id,
              type: 'estreia',
              title: est.filmTitle,
              subtitle: `Estreia em ${est.releaseDate} · Dir. ${est.filmDirector}`,
              slug: est.filmSlug,
              image: est.filmPoster,
            });
          }
        });

        setResults([...filmResults, ...personResults, ...ensaiosResults, ...criticasResults, ...otherResults]);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#1A1A1A]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#F5F2ED] border border-[#1A1A1A] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#1A1A1A]/15 flex items-center gap-3 bg-white">
          <Search size={18} className="text-[#1A1A1A]/60 flex-shrink-0" />
          <input
            type="text"
            placeholder="Pesquisar ensaios, críticas, filmes, diretores, temas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-none outline-none font-serif-body text-base text-[#1A1A1A] placeholder-[#1A1A1A]/40"
          />
          {isSearching && (
            <Loader2 size={16} className="animate-spin text-[#D4AF37] flex-shrink-0" />
          )}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] text-xs uppercase font-sans tracking-wider"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1A1A1A]/10 transition-colors text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 space-y-2 flex-1">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-xs font-sans-ui text-[#1A1A1A]/60 uppercase tracking-[0.15em] space-y-2">
              <p>Digite para buscar em todo o catálogo do Lanterna Mágica</p>
              <p className="text-[10px] text-[#1A1A1A]/40">Ensaios · Críticas · Filmes · Pessoas · Especiais</p>
            </div>
          ) : results.length === 0 && !isSearching ? (
            <div className="py-12 text-center text-xs font-sans-ui text-[#1A1A1A]/60 uppercase tracking-[0.15em]">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-[#1A1A1A]/50 uppercase tracking-widest px-2 block mb-2">
                Resultados ({results.length})
              </span>
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="w-full p-2.5 text-left bg-white hover:bg-[#1A1A1A] hover:text-[#F5F2ED] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] flex items-center gap-3 transition-colors group"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-10 h-10 object-cover border border-[#1A1A1A]/10 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#1A1A1A]/5 group-hover:bg-[#F5F2ED]/20 text-[#1A1A1A]/70 group-hover:text-[#F5F2ED] flex items-center gap-1">
                        {getTypeIcon(item.type)}
                        <span>{getTypeLabel(item.type)}</span>
                      </span>
                      <h4 className="text-sm font-serif-display font-bold truncate">
                        {item.title}
                      </h4>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs font-serif-body text-[#1A1A1A]/70 group-hover:text-[#F5F2ED]/80 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#1A1A1A]/15 bg-[#1A1A1A]/5 flex items-center justify-between text-[10px] font-mono text-[#1A1A1A]/60">
          <span>Pressione ESC para fechar</span>
          <span>Navegue usando o mouse ou teclado</span>
        </div>

      </div>
    </div>
  );
};
