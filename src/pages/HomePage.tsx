import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Film, Loader2 } from 'lucide-react';
import { HeroCarousel } from '../components/HeroCarousel';
import { ArticleCard } from '../components/ArticleCard';
import { BrandLogo } from '../components/BrandLogo';
import { fetchCriticas, mapSupabaseCriticaToCritica } from '../services/repositories/criticasRepository';
import { fetchEnsaios, mapSupabaseEnsaioToEnsaio } from '../services/repositories/ensaiosRepository';
import { fetchUmaImagem, mapSupabaseUmaImagemToDomain } from '../services/repositories/umaImagemRepository';
import { fetchEspeciais } from '../services/repositories/especiaisRepository';
import { fetchListas } from '../services/repositories/listasRepository';
import { fetchEstreias, getCurrentWeekEstreiasFromList } from '../services/repositories/estreiasRepository';
import { fetchPessoas, SupabasePessoa } from '../services/repositories/pessoasRepository';
import { getTodayLocalDateString } from '../utils/dateUtils';
import { Critica, Ensaio, Especial, HighlightItem, Lista, UmaImagemUmaIdeia, Estreia } from '../types';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [supabaseCriticas, setSupabaseCriticas] = useState<Critica[]>([]);
  const [supabaseEnsaios, setSupabaseEnsaios] = useState<Ensaio[]>([]);
  const [supabaseUmaImagem, setSupabaseUmaImagem] = useState<UmaImagemUmaIdeia[]>([]);
  const [supabaseEspeciais, setSupabaseEspeciais] = useState<Especial[]>([]);
  const [supabaseListas, setSupabaseListas] = useState<Lista[]>([]);
  const [supabaseEstreias, setSupabaseEstreias] = useState<Estreia[]>([]);
  const [supabasePessoas, setSupabasePessoas] = useState<SupabasePessoa[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [releaseStart, setReleaseStart] = useState(0);
  const [releasePaused, setReleasePaused] = useState(false);
  const [releaseDirection, setReleaseDirection] = useState<'next' | 'prev'>('next');
  const [releaseAnimating, setReleaseAnimating] = useState(false);
  const [ensaioIndex, setEnsaioIndex] = useState(0);
  const [especialIndex, setEspecialIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchCriticas({ allStatuses: false }),
      fetchEnsaios({ allStatuses: false }),
      fetchUmaImagem({ allStatuses: false }),
      fetchEspeciais({ allStatuses: false }),
      fetchListas({ allStatuses: false }),
      fetchEstreias({ allStatuses: false }),
      fetchPessoas({ allStatuses: false }),
    ]).then(([critRes, ensRes, umaRes, espRes, listRes, estRes, pesRes]) => {
      if (isMounted) {
        if (critRes.data) {
          setSupabaseCriticas(critRes.data.map(mapSupabaseCriticaToCritica));
        }
        if (ensRes.data) {
          setSupabaseEnsaios(ensRes.data.map(mapSupabaseEnsaioToEnsaio));
        }
        if (umaRes.data) {
          setSupabaseUmaImagem(umaRes.data.map(mapSupabaseUmaImagemToDomain));
        }
        if (espRes.data) {
          setSupabaseEspeciais(espRes.data);
        }
        if (listRes.data) {
          setSupabaseListas(listRes.data);
        }
        if (estRes.data) {
          setSupabaseEstreias(estRes.data);
        }
        if (pesRes.data) {
          setSupabasePessoas(pesRes.data);
        }
        setLoadingContent(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute current week releases from Supabase
  const currentWeekEstreias = useMemo(() => {
    return getCurrentWeekEstreiasFromList(supabaseEstreias, getTodayLocalDateString());
  }, [supabaseEstreias]);

  const releasesVisible = 4;
  const releaseCount = currentWeekEstreias.items.length;
  const releaseStripStart =
    releaseDirection === 'prev' && releaseAnimating
      ? (releaseStart - 1 + releaseCount) % releaseCount
      : releaseStart;
  const releaseStripLength = Math.min(releasesVisible + 1, releaseCount);
  const visibleReleases = Array.from(
    { length: releaseStripLength },
    (_, offset) => currentWeekEstreias.items[(releaseStripStart + offset) % releaseCount]
  );

  useEffect(() => {
    if (releaseStart >= Math.max(1, releaseCount)) setReleaseStart(0);
  }, [releaseStart, releaseCount]);

  const stepRelease = (direction: 'next' | 'prev') => {
    if (releaseAnimating || releaseCount <= releasesVisible) return;
    setReleaseDirection(direction);
    setReleaseAnimating(true);
  };

  const finishReleaseSlide = () => {
    if (!releaseAnimating) return;
    setReleaseStart((start) =>
      releaseDirection === 'next'
        ? (start + 1) % releaseCount
        : (start - 1 + releaseCount) % releaseCount
    );
    setReleaseAnimating(false);
  };

  useEffect(() => {
    if (releasePaused || releaseAnimating || releaseCount <= releasesVisible) return;
    const timer = window.setInterval(() => stepRelease('next'), 5500);
    return () => window.clearInterval(timer);
  }, [releasePaused, releaseAnimating, releaseCount]);

  const ensaios = supabaseEnsaios;
  const umaImagemList = supabaseUmaImagem;
  const especiais = supabaseEspeciais;

  // Helper para obter timestamp de ordenação editorial/cronológica
  const getItemTimestamp = (item: HighlightItem): number => {
    const rawDate =
      ('publishedAt' in item && item.publishedAt) ||
      ('scheduledAt' in item && item.scheduledAt) ||
      ('createdAt' in item && item.createdAt) ||
      ('date' in item && item.date);
    if (rawDate) {
      const time = new Date(rawDate).getTime();
      if (!isNaN(time)) return time;
    }
    return 0;
  };

  // Combine highlights: Supabase highlighted critiques + Supabase highlighted ensaios + Supabase Uma Imagem + Supabase Especiais
  const highlights: HighlightItem[] = useMemo(() => {
    const list: HighlightItem[] = [];

    // Add highlighted critiques from Supabase
    supabaseCriticas
      .filter((c) => Boolean(c.highlightHome))
      .forEach((c) => list.push({ ...c, itemType: 'critica' }));

    // Add highlighted ensaios from Supabase
    supabaseEnsaios
      .filter((e) => Boolean(e.highlightHome))
      .forEach((e) => list.push({ ...e, itemType: 'ensaio' }));

    // Add highlights from Supabase Uma Imagem
    supabaseUmaImagem
      .filter((u) => Boolean(u.highlightHome))
      .forEach((u) => list.push({ ...u, itemType: 'uma_imagem' }));

    // Add highlights from Supabase Especiais
    especiais
      .filter((es) => Boolean(es.highlightHome))
      .forEach((es) => list.push({ ...es, itemType: 'especial' }));

    // Ordenação editorial unificada: as publicações mais recentes marcadas com destaque na Home
    list.sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));

    return list.slice(0, 4);
  }, [supabaseCriticas, supabaseEnsaios, supabaseUmaImagem, especiais]);

  // Current year for Críticas section
  const currentYear = new Date().getFullYear();
  const currentYearCriticas = supabaseCriticas.filter((c) => c.year === currentYear || c.isNewRelease);
  const archiveCriticas = supabaseCriticas.filter((c) => c.year < currentYear && !c.isNewRelease);

  const featuredEnsaios = ensaios.slice(0, 4);
  const mainEnsaio = featuredEnsaios[ensaioIndex] || featuredEnsaios[0];

  const mainUmaImagem = umaImagemList[0];
  const featuredEspeciais = especiais.slice(0, 4);
  const mainEspecial = featuredEspeciais[especialIndex] || featuredEspeciais[0];

  useEffect(() => {
    if (featuredEnsaios.length <= 1) return;
    const timer = window.setInterval(() => {
      setEnsaioIndex((index) => (index + 1) % featuredEnsaios.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [featuredEnsaios.length]);

  useEffect(() => {
    if (featuredEspeciais.length <= 1) return;
    const timer = window.setInterval(() => {
      setEspecialIndex((index) => (index + 1) % featuredEspeciais.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [featuredEspeciais.length]);

  const isDatabaseEmpty =
    !loadingContent &&
    ensaios.length === 0 &&
    supabaseCriticas.length === 0 &&
    umaImagemList.length === 0 &&
    especiais.length === 0 &&
    supabaseListas.length === 0 &&
    supabasePessoas.length === 0;

  if (loadingContent) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] flex flex-col justify-center items-center p-8 text-center space-y-4">
        <BrandLogo size="md" theme="light" />
        <div className="flex items-center gap-2 text-xs font-mono text-[#1A1A1A]/70">
          <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
          <span>Carregando acervo do Lanterna Mágica...</span>
        </div>
      </div>
    );
  }

  if (isDatabaseEmpty) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] flex flex-col justify-center items-center p-8 text-center space-y-6">
        <BrandLogo size="lg" theme="light" />
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-serif-display text-[#1A1A1A]">Acervo em Estado Inicial</h1>
          <p className="text-sm font-serif-body text-[#1A1A1A]/80 leading-relaxed">
            Nenhuma publicação está visível no momento. Você pode acessar o painel administrativo para criar novas publicações.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate('/admin')}
            className="px-6 py-3 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors"
          >
            Acessar Painel / Publicar Conteúdo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A]">
      {/* 1. Dynamic Hero */}
      <HeroCarousel highlights={highlights} onNavigate={onNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        
        {/* NOS CINEMAS ESTA SEMANA (Releases this week in Brazilian theaters) */}
        {currentWeekEstreias.items.length > 0 && (
          <section className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#1A1A1A]/15 pb-4 gap-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37] block mb-1">
                  Circuito Brasileiro · {currentWeekEstreias.weekRange.rangeFormatted}
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#1A1A1A]">
                  NOS CINEMAS ESTA SEMANA
                </h2>
                <p className="text-sm font-serif-body text-[#1A1A1A]/70 mt-1 max-w-xl">
                  As principais estreias nas salas de cinema brasileiras com fichas completas e notas críticas.
                </p>
              </div>
              <button
                onClick={() => onNavigate('/estreias')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors group"
              >
                <span>Ver todas as estreias</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div
              className="space-y-4"
              onMouseEnter={() => setReleasePaused(true)}
              onMouseLeave={() => setReleasePaused(false)}
            >
              <div className="overflow-hidden">
              <div
                onTransitionEnd={finishReleaseSlide}
                className={`flex gap-6 ${releaseAnimating ? 'transition-transform duration-700 ease-in-out' : ''}`}
                style={{
                  transform:
                    releaseAnimating && releaseDirection === 'next'
                      ? 'translateX(calc(-25% - 18px))'
                      : releaseAnimating && releaseDirection === 'prev'
                        ? 'translateX(0)'
                        : releaseDirection === 'prev'
                          ? 'translateX(calc(-25% - 18px))'
                          : 'translateX(0)',
                }}
              >
              {visibleReleases.map((est) => (
                <div
                  key={est.id}
                  onClick={() => onNavigate(`/filmes/${est.filmSlug}`)}
                  className="shrink-0 w-[calc(100%-0px)] sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all cursor-pointer group flex flex-col overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden bg-[#1A1A1A]/10 relative">
                    {est.filmPoster ? (
                      <img
                        src={est.filmPoster}
                        alt={`Pôster de ${est.filmTitle}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/30">
                        <Film size={32} />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-[#1A1A1A] text-[#F5F2ED] text-[9px] font-sans font-bold uppercase tracking-widest px-2 py-0.5">
                      {est.releaseType || 'Cinema'}
                    </div>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                        {est.filmCountry} · {est.filmYear}
                      </span>
                      <h3 className="text-base font-serif-display font-medium text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug mt-1">
                        {est.filmTitle}
                      </h3>
                      <p className="text-xs font-serif-body text-[#1A1A1A]/70 truncate mt-0.5">
                        Dir. {est.filmDirector}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#1A1A1A]/10 flex items-center justify-between text-[11px] font-sans font-bold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors">
                      <span>Ver Ficha</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
              </div>
              </div>
              {releaseCount > releasesVisible && (
                <div className="flex items-center justify-end pt-1">
                  <div className="flex gap-2">
                    <button type="button" aria-label="Filme anterior" onClick={() => stepRelease('prev')} className="p-2 border border-[#1A1A1A]/20 hover:border-[#1A1A1A] transition-colors"><ArrowLeft size={14} /></button>
                    <button type="button" aria-label="Próximo filme" onClick={() => stepRelease('next')} className="p-2 border border-[#1A1A1A]/20 hover:border-[#1A1A1A] transition-colors"><ArrowRight size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 2. ENSAIOS — destaque editorial em largura ampla */}
        {mainEnsaio && (
          <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen animate-in fade-in duration-500">
            <div
              onClick={() => onNavigate(`/ensaios/${mainEnsaio.slug}`)}
              className="relative min-h-[500px] sm:min-h-[620px] lg:min-h-[680px] overflow-hidden cursor-pointer group bg-[#121212]"
            >
              <img src={mainEnsaio.coverImage} alt={mainEnsaio.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
              <div className="relative min-h-[500px] sm:min-h-[620px] lg:min-h-[680px] p-7 sm:p-10 lg:p-16 flex flex-col justify-end text-[#F5F2ED]">
                <div key={mainEnsaio.id} className="max-w-3xl space-y-3 animate-in fade-in duration-700">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Ensaio · Publicação</span>
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif-display font-normal leading-[1.02]">{mainEnsaio.title}</h2>
                  {mainEnsaio.subtitle && <p className="max-w-2xl text-sm sm:text-base font-serif-body text-[#F5F2ED]/80">{mainEnsaio.subtitle}</p>}
                  <div className="flex flex-wrap items-center gap-5 pt-2 text-[10px] font-sans uppercase tracking-[0.16em] text-[#F5F2ED]/70">
                    <span>{mainEnsaio.date}</span>
                    {mainEnsaio.readTimeMinutes && <span>{mainEnsaio.readTimeMinutes} min de leitura</span>}
                    <button type="button" onClick={(event) => { event.stopPropagation(); onNavigate('/ensaios'); }} className="ml-auto inline-flex items-center gap-2 text-[#F5F2ED] hover:text-[#D4AF37] transition-colors">Ver todos os ensaios <ArrowRight size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. CRÍTICAS DO ANO (Only if Criticas exist) */}
        {currentYearCriticas.length > 0 && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#1A1A1A]/15 pb-4 gap-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90 block mb-1">
                  Avaliação & Análise
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#1A1A1A]">
                  CRÍTICAS — {currentYear}
                </h2>
              </div>
              <button
                onClick={() => onNavigate('/criticas')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors group"
              >
                <span>Ver arquivo de críticas</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentYearCriticas.slice(0, 3).map((c) => (
                <ArticleCard
                  key={c.id}
                  type="critica"
                  variant="medium"
                  title={c.editorialTitle}
                  movieTitle={c.movieTitle}
                  director={c.director}
                  year={c.year}
                  country={c.country}
                  image={c.coverImage}
                  date={c.date}
                  starRating={c.starRating}
                  onClick={() => onNavigate(`/criticas/${c.slug}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 4. UMA IMAGEM, UMA IDEIA (Only if item exists) */}
        {mainUmaImagem && (
          <section className="bg-white border border-[#1A1A1A]/15 p-6 sm:p-10 lg:p-12 animate-in fade-in duration-500">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div
                onClick={() => onNavigate(`/uma-imagem/${mainUmaImagem.slug}`)}
                className="lg:col-span-6 overflow-hidden border border-[#1A1A1A]/12 cursor-pointer group"
              >
                <img
                  src={mainUmaImagem.image}
                  alt={mainUmaImagem.title}
                  className="w-full h-auto max-h-[450px] object-cover group-hover:scale-[1.02] transition-transform duration-700"
                />
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => onNavigate('/uma-imagem')}
                    className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90 hover:text-[#D4AF37] cursor-pointer transition-colors"
                  >
                    <Sparkles size={13} className="text-[#D4AF37]" />
                    <span>Uma Imagem, Uma Ideia</span>
                  </div>
                  <button
                    onClick={() => onNavigate('/uma-imagem')}
                    className="text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
                  >
                    Ver todas
                  </button>
                </div>

                <h3
                  onClick={() => onNavigate(`/uma-imagem/${mainUmaImagem.slug}`)}
                  className="text-2xl sm:text-3xl font-serif-display font-normal text-[#1A1A1A] leading-tight hover:text-[#D4AF37] cursor-pointer transition-colors"
                >
                  {mainUmaImagem.title}
                </h3>

                <p className="text-sm sm:text-base font-serif-body text-[#1A1A1A]/80 leading-relaxed whitespace-pre-line line-clamp-6">
                  {mainUmaImagem.content}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => onNavigate(`/uma-imagem/${mainUmaImagem.slug}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-[0.15em] text-[#1A1A1A] hover:text-[#D4AF37] transition-colors"
                  >
                    <span>Ler reflexão completa</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={() => onNavigate('/uma-imagem')}
                    className="inline-flex items-center gap-1 text-xs font-sans font-bold uppercase tracking-[0.15em] text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
                  >
                    <span>Explorar catálogo</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                {mainUmaImagem.relatedMovie && (
                  <p className="text-xs font-sans-ui text-[#1A1A1A]/60 pt-3 border-t border-[#1A1A1A]/10">
                    Filme relacionado: <span className="text-[#1A1A1A] italic font-serif-body">{mainUmaImagem.relatedMovie}</span>
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 5. DO ARQUIVO (Classic Movies / Previous Years) - Only if items exist */}
        {archiveCriticas.length > 0 && (
          <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#121212] text-[#F5F2ED] py-14 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex items-center justify-between border-b border-[#F5F2ED]/20 pb-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#F5F2ED]/70 block mb-1">
                  Memória Cinematográfica
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#F5F2ED]">
                  DO ARQUIVO
                </h2>
              </div>
              <button
                onClick={() => onNavigate('/arquivo')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#F5F2ED]/80 hover:text-[#D4AF37] transition-colors group"
              >
                <span>Explorar Arquivo</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archiveCriticas.slice(0, 3).map((c) => (
                <ArticleCard
                  key={c.id}
                  type="critica"
                  variant="medium"
                  title={c.editorialTitle}
                  movieTitle={c.movieTitle}
                  director={c.director}
                  year={c.year}
                  country={c.country}
                  image={c.coverImage}
                  date={c.date}
                  starRating={c.starRating}
                  onClick={() => onNavigate(`/criticas/${c.slug}`)}
                />
              ))}
            </div>
            </div>
          </section>
        )}

        {/* 6. ESPECIAIS (Only if Especiais exist) */}
        {mainEspecial && (
          <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[#121212] text-[#F5F2ED] py-20 sm:py-24 lg:py-28 animate-in fade-in duration-500">
            <div key={mainEspecial.id} className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-700">
              <div className="lg:col-span-7 space-y-4">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#F5F2ED]/90">
                  PROJETO ESPECIAL EDITORIAL
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#F5F2ED] leading-tight">
                  {mainEspecial.title}
                </h2>
                <p className="text-base font-serif-body text-[#F5F2ED]/80 leading-relaxed">
                  {mainEspecial.subtitle}
                </p>
                <p className="text-xs font-sans-ui text-[#F5F2ED]/60 leading-relaxed">
                  {mainEspecial.intro}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate(`/especiais/${mainEspecial.slug}`)}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-[#F5F2ED] text-[#F5F2ED] hover:bg-[#F5F2ED] hover:text-[#1A1A1A] font-sans text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                  >
                    <span>Explorar Especial</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <img
                  src={mainEspecial.coverImage}
                  alt={mainEspecial.title}
                  className="w-full h-auto aspect-[4/3] object-cover border border-[#F5F2ED]/20"
                />
              </div>
            </div>
          </section>
        )}

        {/* 7. PESSOAS DO CINEMA (Only if Pessoas exist) */}
        {supabasePessoas.length > 0 && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90 block mb-1">
                  Índice de Autores & Elenco
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#1A1A1A]">
                  PESSOAS DO CINEMA
                </h2>
              </div>
              <button
                onClick={() => onNavigate('/pessoas')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors group"
              >
                <span>Ver todos</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {supabasePessoas.slice(0, 3).map((pes) => (
                <div
                  key={pes.id}
                  onClick={() => onNavigate(`/pessoas/${pes.slug}`)}
                  className="group cursor-pointer p-6 bg-white border border-[#1A1A1A]/12 hover:border-[#1A1A1A] transition-all duration-300 flex items-start gap-4"
                >
                  {pes.photo_url ? (
                    <img
                      src={pes.photo_url}
                      alt={pes.name}
                      className="w-16 h-16 rounded-full object-cover border border-[#1A1A1A]/15 shrink-0 filter grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#1A1A1A]/10 border border-[#1A1A1A]/15 shrink-0 flex items-center justify-center text-xs font-mono font-bold">
                      {pes.name.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-xl font-serif-display text-[#1A1A1A] group-hover:underline underline-offset-2 transition-colors truncate">
                      {pes.name}
                    </h3>
                    <p className="text-xs font-mono text-[#1A1A1A]/70 truncate">
                      {pes.country?.name || pes.primary_roles?.join(' · ') || 'Cinema'}
                    </p>
                    {pes.bio && (
                      <p className="text-xs font-serif-body text-[#1A1A1A]/70 line-clamp-2 pt-1">
                        {pes.bio}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 8. LISTAS & CURADORIAS (Only if Listas exist) */}
        {supabaseListas.length > 0 && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90 block mb-1">
                  Filmografias & Curadorias
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#1A1A1A]">
                  LISTAS
                </h2>
              </div>
              <button
                onClick={() => onNavigate('/listas')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors group"
              >
                <span>Ver todas as listas</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {supabaseListas.slice(0, 3).map((l) => (
                <ArticleCard
                  key={l.id}
                  type="lista"
                  variant="medium"
                  title={l.title}
                  subtitle={l.intro || `${l.items?.length || 0} títulos catalogados`}
                  image={l.coverImage}
                  date={l.publishedAt ? l.publishedAt.slice(0, 10) : l.createdAt.slice(0, 10)}
                  onClick={() => onNavigate(`/listas/${l.slug}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 8. APRESENTAÇÃO INSTITUCIONAL DO LANTERNA MÁGICA */}
        <section className="py-16 border-t border-b border-[#1A1A1A]/15 my-16 bg-white shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <div className="flex justify-center">
              <BrandLogo size="md" theme="light" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-serif-display font-normal text-[#1A1A1A]">
              Uma Publicação Cultural sobre Cinema e Pensamento
            </h3>

            <p className="text-sm sm:text-base font-serif-body text-[#1A1A1A]/80 leading-relaxed max-w-2xl mx-auto">
              O Lanterna Mágica nasce da necessidade de desacelerar o olhar. Num ambiente saturado pela urgência comercial e por avaliações superficiais, propomos o cinema como um arquivo vivo de inquietações éticas, estéticas e humanas.
            </p>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('/sobre')}
                className="text-xs uppercase tracking-[0.2em] px-6 py-3 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-[#1A1A1A] transition-colors font-sans-ui font-semibold"
              >
                Ler Carta Editorial
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};
