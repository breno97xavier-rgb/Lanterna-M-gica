import React, { useState, useEffect } from 'react';
import { Film, User, BookOpen, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { ArticleCard } from '../components/ArticleCard';
import { fetchPessoas, SupabasePessoa } from '../services/repositories/pessoasRepository';
import { fetchFilmes, SupabaseFilme } from '../services/repositories/filmesRepository';
import { fetchCriticas, mapSupabaseCriticaToCritica } from '../services/repositories/criticasRepository';
import { fetchEnsaios, mapSupabaseEnsaioToEnsaio } from '../services/repositories/ensaiosRepository';
import { fetchUmaImagem, mapSupabaseUmaImagemToDomain } from '../services/repositories/umaImagemRepository';
import { fetchEspeciais } from '../services/repositories/especiaisRepository';
import { fetchListas } from '../services/repositories/listasRepository';
import { Critica, Ensaio, Especial, UmaImagemUmaIdeia, Lista } from '../types';

interface ArquivoPageProps {
  onNavigate: (path: string) => void;
}

export const ArquivoPage: React.FC<ArquivoPageProps> = ({ onNavigate }) => {
  const [mainSection, setMainSection] = useState<'publicacoes' | 'filmes' | 'pessoas' | 'estreias'>('publicacoes');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedYear, setSelectedYear] = useState<string>('todos');

  const [pessoas, setPessoas] = useState<SupabasePessoa[]>([]);
  const [loadingPessoas, setLoadingPessoas] = useState(true);

  const [filmes, setFilmes] = useState<SupabaseFilme[]>([]);
  const [loadingFilmes, setLoadingFilmes] = useState(true);

  const [criticas, setCriticas] = useState<Critica[]>([]);
  const [loadingCriticas, setLoadingCriticas] = useState(true);

  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [loadingEnsaios, setLoadingEnsaios] = useState(true);

  const [umaImagemList, setUmaImagemList] = useState<UmaImagemUmaIdeia[]>([]);
  const [loadingUmaImagem, setLoadingUmaImagem] = useState(true);

  const [especiais, setEspeciais] = useState<Especial[]>([]);
  const [loadingEspeciais, setLoadingEspeciais] = useState(true);

  const [listas, setListas] = useState<Lista[]>([]);
  const [loadingListas, setLoadingListas] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingPessoas(true);
    fetchPessoas({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        setPessoas(data || []);
        setLoadingPessoas(false);
      }
    });

    setLoadingFilmes(true);
    fetchFilmes({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        if (data && data.length > 0) {
          setFilmes(data);
        } else {
          // Fallback to cmsStore films
          const localFilmes = cmsStore.getFilmes();
          setFilmes(
            localFilmes.map((lf) => ({
              id: lf.id,
              legacy_id: lf.id,
              title: lf.title,
              original_title: lf.originalTitle || null,
              slug: lf.slug,
              year: lf.year,
              country: lf.country,
              duration_minutes: lf.durationMinutes || null,
              poster_url: lf.posterImage || null,
              backdrop_url: null,
              synopsis: lf.synopsis || null,
              editorial_rating: null,
              status: 'published',
              published_at: lf.createdAt,
              scheduled_at: null,
              created_at: lf.createdAt,
              updated_at: lf.updatedAt,
              legacy_director_name: lf.director,
              generos: (lf.genres || []).map((g) => ({ id: g, name: g, slug: g })),
              countries: lf.country ? [{ id: 'c1', name: lf.country, slug: 'pais', flag_url: null, created_at: '', updated_at: '' }] : [],
              credits: [],
            }))
          );
        }
        setLoadingFilmes(false);
      }
    });

    setLoadingCriticas(true);
    fetchCriticas({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        if (data) {
          setCriticas(data.map(mapSupabaseCriticaToCritica));
        }
        setLoadingCriticas(false);
      }
    });

    setLoadingEnsaios(true);
    fetchEnsaios({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        if (data) {
          setEnsaios(data.map(mapSupabaseEnsaioToEnsaio));
        }
        setLoadingEnsaios(false);
      }
    });

    setLoadingUmaImagem(true);
    fetchUmaImagem({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        if (data) {
          setUmaImagemList(data.map(mapSupabaseUmaImagemToDomain));
        }
        setLoadingUmaImagem(false);
      }
    });

    setLoadingEspeciais(true);
    fetchEspeciais({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        if (data) {
          setEspeciais(data);
        }
        setLoadingEspeciais(false);
      }
    });

    setLoadingListas(true);
    fetchListas({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        if (data) {
          setListas(data);
        }
        setLoadingListas(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const estreias = cmsStore.getEstreias(true);

  // Combine all items into a unified archive list for editorial publications
  const allArchiveItems = [
    ...ensaios.map((e) => ({ ...e, archiveType: 'ensaio' as const, displayTitle: e.title, displaySub: e.subtitle, displayDate: e.date, displayImg: e.coverImage, yearNum: new Date(e.date).getFullYear() })),
    ...criticas.map((c) => ({ ...c, archiveType: 'critica' as const, displayTitle: `${c.movieTitle} — ${c.editorialTitle}`, displaySub: `Dir. ${c.director} (${c.year})`, displayDate: c.date, displayImg: c.coverImage, yearNum: c.year })),
    ...umaImagemList.map((u) => ({ ...u, archiveType: 'uma_imagem' as const, displayTitle: u.title, displaySub: u.relatedMovie ? `Filme: ${u.relatedMovie}` : 'Uma imagem', displayDate: u.date, displayImg: u.image, yearNum: new Date(u.date).getFullYear() })),
    ...especiais.map((es) => {
      const pubDate = es.publishedAt || es.createdAt;
      return {
        ...es,
        archiveType: 'especial' as const,
        displayTitle: es.title,
        displaySub: es.subtitle,
        displayDate: pubDate.slice(0, 10),
        displayImg: es.coverImage,
        yearNum: new Date(pubDate).getFullYear(),
      };
    }),
    ...listas.map((l) => {
      const pubDate = l.publishedAt || l.createdAt;
      return {
        ...l,
        archiveType: 'lista' as const,
        displayTitle: l.title,
        displaySub: l.intro || `${l.items?.length || 0} títulos catalogados`,
        displayDate: pubDate.slice(0, 10),
        displayImg: l.coverImage,
        yearNum: new Date(pubDate).getFullYear(),
      };
    }),
  ];

  // Unique years for publications
  const years = Array.from(new Set(allArchiveItems.map((item) => item.yearNum))).sort((a, b) => b - a);

  // Filter publications
  const filteredItems = allArchiveItems.filter((item) => {
    if (selectedType !== 'todos' && item.archiveType !== selectedType) return false;
    if (selectedYear !== 'todos' && item.yearNum !== parseInt(selectedYear, 10)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Índice Permanente
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            ARQUIVO
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Catálogo completo de ensaios, críticas, dossiês, acervo filmográfico de obras e registros biográficos do Lanterna Mágica.
          </p>
        </div>

        {/* Major Archive Section Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1A1A1A]/15 pb-4 text-xs font-sans">
          {[
            { id: 'publicacoes', label: `Publicações Editoriais (${allArchiveItems.length})`, icon: BookOpen },
            { id: 'filmes', label: `Acervo de Filmes (${loadingFilmes ? '...' : filmes.length})`, icon: Film },
            { id: 'pessoas', label: `Catálogo de Pessoas (${loadingPessoas ? '...' : pessoas.length})`, icon: User },
            { id: 'estreias', label: `Guia de Estreias (${estreias.length})`, icon: Calendar },
          ].map((sec) => {
            const Icon = sec.icon;
            const isActive = mainSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setMainSection(sec.id as any)}
                className={`flex items-center gap-2 px-4 py-2 uppercase tracking-wider text-xs font-semibold border transition-all ${
                  isActive
                    ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] shadow-xs'
                    : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#D4AF37]' : 'text-[#1A1A1A]/60'} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1. PUBLICAÇÕES SECTION */}
        {mainSection === 'publicacoes' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1A1A1A]/15 pb-6 text-xs font-sans-ui">
              {/* Content Type Filter */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <span className="text-[#D4AF37] font-sans font-bold uppercase tracking-[0.2em] mr-2">TIPO:</span>
                {['todos', 'ensaio', 'critica', 'uma_imagem', 'especial', 'lista'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-3 py-1.5 uppercase tracking-[0.15em] transition-colors border ${
                      selectedType === t
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-semibold'
                        : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {t === 'uma_imagem' ? 'Uma Imagem' : t === 'lista' ? 'Listas' : t}
                  </button>
                ))}
              </div>

              {/* Year Filter */}
              {years.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-sans font-bold uppercase tracking-[0.2em] mr-1">ANO:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-white text-[#1A1A1A] border border-[#1A1A1A]/15 px-3 py-1.5 focus:outline-none focus:border-[#D4AF37] font-sans-ui text-xs"
                  >
                    <option value="todos">Todos os Anos</option>
                    {years.map((y) => (
                      <option key={y} value={y.toString()}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Grid */}
            {filteredItems.length === 0 ? (
              <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white">
                <p className="text-lg font-serif-display text-[#1A1A1A]/60">
                  Nenhum registro editorial encontrado para este filtro.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <ArticleCard
                    key={`${item.archiveType}-${item.id}`}
                    type={item.archiveType}
                    variant="medium"
                    title={item.displayTitle}
                    subtitle={item.displaySub}
                    image={item.displayImg}
                    date={item.displayDate}
                    onClick={() => {
                      if (item.archiveType === 'ensaio') onNavigate(`/ensaios/${item.slug}`);
                      else if (item.archiveType === 'critica') onNavigate(`/criticas/${item.slug}`);
                      else if (item.archiveType === 'especial') onNavigate(`/especiais/${item.slug}`);
                      else if (item.archiveType === 'uma_imagem') onNavigate(`/uma-imagem/${item.slug}`);
                      else if (item.archiveType === 'lista') onNavigate(`/listas/${item.slug}`);
                      else onNavigate('/arquivo');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. FILMES SECTION */}
        {mainSection === 'filmes' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-sans text-[#1A1A1A]/70 uppercase tracking-widest font-semibold">
                Fichas de filmes catalogadas no Lanterna Mágica
              </p>
              <span className="text-xs font-sans text-[#1A1A1A]/60">
                {filmes.length} filme{filmes.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingFilmes ? (
              <div className="py-20 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-8 flex flex-col items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[#1A1A1A]/60" />
                <p className="text-xs font-mono text-[#1A1A1A]/60">Carregando acervo de filmes...</p>
              </div>
            ) : filmes.length === 0 ? (
              <div className="py-20 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-8">
                <p className="text-lg font-serif-display text-[#1A1A1A]/60">
                  Nenhum filme catalogado no arquivo no momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filmes.map((film) => {
                  const dirCredit = (film.credits || []).find(
                    (c) => c.department === 'Direção' || c.department.toLowerCase().includes('dire')
                  );
                  const director = dirCredit
                    ? dirCredit.person?.name || dirCredit.fallback_person_name
                    : film.legacy_director_name || 'Desconhecido';

                  const countryDisplay =
                    film.countries && film.countries.length > 0
                      ? film.countries.map((c) => c.name).join(', ')
                      : film.country || 'Internacional';

                  return (
                    <div
                      key={film.id}
                      onClick={() => onNavigate(`/filmes/${film.slug}`)}
                      className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all cursor-pointer group flex flex-col overflow-hidden shadow-xs hover:shadow-md"
                    >
                      <div className="aspect-[2/3] w-full overflow-hidden bg-[#1A1A1A]/10 relative">
                        {film.poster_url ? (
                          <img
                            src={film.poster_url}
                            alt={film.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/30">
                            <Film size={36} />
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                            {film.year} · {countryDisplay}
                          </span>
                          <h3 className="text-base font-serif-display font-medium text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug mt-1">
                            {film.title}
                          </h3>
                          <p className="text-xs font-serif-body text-[#1A1A1A]/70 truncate mt-0.5">
                            Dir. {director}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#1A1A1A]/10 flex items-center justify-between text-[11px] font-sans font-bold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                          <span>Ver Hub do Filme</span>
                          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. PESSOAS SECTION */}
        {mainSection === 'pessoas' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-sans text-[#1A1A1A]/70 uppercase tracking-widest font-semibold">
                Perfis biográficos, cineastas e elenco
              </p>
              <button
                onClick={() => onNavigate('/pessoas')}
                className="text-xs font-sans font-bold uppercase tracking-wider text-[#D4AF37] hover:underline"
              >
                Abrir Catálogo Completo &rarr;
              </button>
            </div>

            {loadingPessoas ? (
              <div className="py-20 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-8 flex flex-col items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[#1A1A1A]/60" />
                <p className="text-xs font-mono text-[#1A1A1A]/60">Carregando catálogo de pessoas...</p>
              </div>
            ) : pessoas.length === 0 ? (
              <div className="py-20 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-8">
                <p className="text-lg font-serif-display text-[#1A1A1A]/60">
                  Nenhuma pessoa cadastrada no arquivo no momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {pessoas.map((p) => {
                  const rolesStr = p.primary_roles && p.primary_roles.length > 0 ? p.primary_roles.join(' · ') : 'Cinema';
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
                            <User size={36} />
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block truncate">
                            {rolesStr}
                          </span>
                          <h3 className="text-base font-serif-display font-normal text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug mt-1">
                            {p.name}
                          </h3>
                        </div>

                        <div className="pt-2 border-t border-[#1A1A1A]/10 flex items-center justify-between text-[11px] font-sans text-[#1A1A1A]/60">
                          <span>{p.country || 'Internacional'}</span>
                          <span className="font-bold text-[#1A1A1A] group-hover:text-[#D4AF37]">&rarr;</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. ESTREIAS SECTION */}
        {mainSection === 'estreias' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-sans text-[#1A1A1A]/70 uppercase tracking-widest font-semibold">
                Lançamentos cadastrados no circuito de salas
              </p>
              <button
                onClick={() => onNavigate('/estreias')}
                className="text-xs font-sans font-bold uppercase tracking-wider text-[#D4AF37] hover:underline"
              >
                Abrir Guia de Estreias &rarr;
              </button>
            </div>

            {estreias.length === 0 ? (
              <div className="py-20 text-center space-y-3 border border-[#1A1A1A]/15 bg-white p-8">
                <p className="text-lg font-serif-display text-[#1A1A1A]/60">
                  Nenhuma estreia cadastrada no momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {estreias.map((est) => (
                  <div
                    key={est.id}
                    onClick={() => onNavigate(`/filmes/${est.filmSlug}`)}
                    className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] p-4 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                        {est.releaseDate} · {est.releaseType || 'Cinema'}
                      </span>
                      <h3 className="text-base font-serif-display font-medium text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug mt-1">
                        {est.filmTitle}
                      </h3>
                      <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-1">
                        Dir. {est.filmDirector} ({est.filmYear})
                      </p>
                    </div>

                    {est.distributor && (
                      <div className="pt-2 border-t border-[#1A1A1A]/10 text-[11px] font-sans text-[#1A1A1A]/60">
                        Distribuidora: <strong className="text-[#1A1A1A]">{est.distributor}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
