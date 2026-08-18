import React, { useState, useMemo, useEffect } from 'react';
import { Search, User, Globe, ArrowUpDown, Loader2 } from 'lucide-react';
import { fetchPessoas, SupabasePessoa } from '../services/repositories/pessoasRepository';

interface PessoasPageProps {
  onNavigate: (path: string) => void;
}

export const PessoasPage: React.FC<PessoasPageProps> = ({ onNavigate }) => {
  const [pessoas, setPessoas] = useState<SupabasePessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [countryFilter, setCountryFilter] = useState<string>('todos');
  const [sortOrder, setSortOrder] = useState<'az' | 'za' | 'recents'>('az');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPessoas({ allStatuses: false }).then(({ data, error: fetchErr }) => {
      if (!isMounted) return;
      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setPessoas(data || []);
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract unique countries
  const countries = useMemo(() => {
    const set = new Set<string>();
    pessoas.forEach((p) => {
      if (p.country) set.add(p.country);
    });
    return Array.from(set).sort();
  }, [pessoas]);

  // Filtered & Sorted Pessoas
  const filteredPessoas = useMemo(() => {
    return pessoas
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchBio = p.bio?.toLowerCase().includes(q);
          const matchCountry = p.country?.toLowerCase().includes(q);
          if (!matchName && !matchBio && !matchCountry) return false;
        }

        // Role filter
        if (roleFilter !== 'todos') {
          const roles = p.primary_roles || [];
          if (roleFilter === 'direcao') {
            const has = roles.some((r) => r.toLowerCase().includes('diret') || r.toLowerCase().includes('cineasta'));
            if (!has) return false;
          } else if (roleFilter === 'elenco') {
            const has = roles.some((r) => r.toLowerCase().includes('atriz') || r.toLowerCase().includes('ator') || r.toLowerCase().includes('elenco'));
            if (!has) return false;
          } else if (roleFilter === 'fotografia') {
            const has = roles.some((r) => r.toLowerCase().includes('foto'));
            if (!has) return false;
          } else if (roleFilter === 'roteiro') {
            const has = roles.some((r) => r.toLowerCase().includes('roteir'));
            if (!has) return false;
          }
        }

        // Country filter
        if (countryFilter !== 'todos' && p.country !== countryFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'az') return a.name.localeCompare(b.name);
        if (sortOrder === 'za') return b.name.localeCompare(a.name);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [pessoas, searchQuery, roleFilter, countryFilter, sortOrder]);

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="border-b border-[#1A1A1A]/15 pb-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-[#1A1A1A]/60">
            <span>Catálogo Editorial</span>
            <span>·</span>
            <span>Profissionais & Cineastas</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif-display font-normal text-[#1A1A1A]">
            Pessoas do Cinema
          </h1>
          <p className="text-base font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Perfis biobibliográficos, filmografias, diretores, elenco e técnicos registrados no acervo da Lanterna Mágica.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, bio, país..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 pl-10 pr-4 py-2.5 text-xs font-sans text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Selects */}
            <div className="md:col-span-6 flex flex-wrap sm:flex-nowrap items-center gap-3">
              {/* Role Filter */}
              <div className="w-full sm:w-1/2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="todos">Todas as Funções</option>
                  <option value="direcao">Direção / Cineastas</option>
                  <option value="elenco">Elenco (Atrizes & Atores)</option>
                  <option value="fotografia">Direção de Fotografia</option>
                  <option value="roteiro">Roteiro</option>
                </select>
              </div>

              {/* Country Filter */}
              <div className="w-full sm:w-1/2">
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="todos">Todos os Países</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/60">
                  ORDEM:
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2.5 py-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="az">A–Z</option>
                  <option value="za">Z–A</option>
                  <option value="recents">Mais Recentes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs font-sans text-[#1A1A1A]/60 px-1">
          <span>
            Exibindo <strong className="text-[#1A1A1A]">{filteredPessoas.length}</strong> registro{filteredPessoas.length !== 1 ? 's' : ''}
          </span>
          {(searchQuery || roleFilter !== 'todos' || countryFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('todos');
                setCountryFilter('todos');
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] hover:underline"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white flex flex-col items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#1A1A1A]/60" />
            <p className="text-xs font-mono text-[#1A1A1A]/60">Carregando pessoas do Supabase...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-2 border border-red-200 bg-red-50 text-red-700">
            <p className="text-sm font-sans font-bold">Erro ao carregar pessoas:</p>
            <p className="text-xs font-mono">{error}</p>
          </div>
        ) : filteredPessoas.length === 0 ? (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white">
            <p className="text-lg font-serif-display text-[#1A1A1A]/60">
              Nenhuma pessoa encontrada com os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPessoas.map((p) => {
              const rolesStr = p.primary_roles && p.primary_roles.length > 0 ? p.primary_roles.join(' · ') : 'Cinema';
              const birthYear = p.birth_date ? p.birth_date.slice(0, 4) : undefined;
              const deathYear = p.death_date ? p.death_date.slice(0, 4) : undefined;

              return (
                <div
                  key={p.id}
                  onClick={() => onNavigate(`/pessoas/${p.slug}`)}
                  className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all cursor-pointer group flex flex-col overflow-hidden shadow-xs"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-[#1A1A1A]/10 relative">
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.name}
                        className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/30">
                        <User size={40} />
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block truncate">
                        {rolesStr}
                      </span>
                      <h3 className="text-lg font-serif-display font-normal text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug mt-1">
                        {p.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-[#1A1A1A]/10 flex items-center justify-between text-[11px] font-sans text-[#1A1A1A]/60">
                      <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                        {p.country_data?.flag_url && (
                          <img
                            src={p.country_data.flag_url}
                            alt={p.country_data.name}
                            className="w-3.5 h-2.5 object-cover rounded-xs border border-[#1A1A1A]/15 shadow-2xs shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span className="truncate">{p.country_data?.name || p.country || 'Internacional'}</span>
                      </div>
                      {birthYear && <span className="font-mono text-[10px] shrink-0">{birthYear}–{deathYear || 'Pres.'}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
