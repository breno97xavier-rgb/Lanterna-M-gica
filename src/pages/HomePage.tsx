import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Sparkles, Film, Loader2 } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { HeroCarousel } from '../components/HeroCarousel';
import { ArticleCard } from '../components/ArticleCard';
import { BrandLogo } from '../components/BrandLogo';
import { fetchCriticas, mapSupabaseCriticaToCritica } from '../services/repositories/criticasRepository';
import { Critica, HighlightItem } from '../types';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [supabaseCriticas, setSupabaseCriticas] = useState<Critica[]>([]);
  const [loadingCriticas, setLoadingCriticas] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchCriticas({ allStatuses: false }).then(({ data }) => {
      if (isMounted) {
        if (data) {
          setSupabaseCriticas(data.map(mapSupabaseCriticaToCritica));
        }
        setLoadingCriticas(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load data from CMS store for unmigrated entities
  const currentWeekEstreias = cmsStore.getCurrentWeekEstreias();
  const ensaios = cmsStore.getEnsaios(true);
  const umaImagemList = cmsStore.getUmaImagemList(true);
  const especiais = cmsStore.getEspeciais(true);
  const cineastas = cmsStore.getCineastas();

  // Combine highlights: Supabase highlighted critiques + cmsStore highlights
  const highlights: HighlightItem[] = useMemo(() => {
    const list: HighlightItem[] = [];

    // Add highlighted critiques from Supabase
    supabaseCriticas
      .filter((c) => c.highlightHome)
      .forEach((c) => list.push({ ...c, itemType: 'critica' }));

    // Add highlights from other unmigrated entities
    ensaios
      .filter((e) => e.highlightHome)
      .forEach((e) => list.push({ ...e, itemType: 'ensaio' }));

    especiais
      .filter((es) => es.highlightHome)
      .forEach((es) => list.push({ ...es, itemType: 'especial' }));

    cineastas
      .filter((cin) => cin.highlightHome)
      .forEach((cin) => list.push({ ...cin, itemType: 'cineasta' }));

    umaImagemList
      .filter((u) => u.highlightHome)
      .forEach((u) => list.push({ ...u, itemType: 'uma_imagem' }));

    return list.slice(0, 4);
  }, [supabaseCriticas, ensaios, especiais, cineastas, umaImagemList]);

  // Current year for Críticas section
  const currentYear = new Date().getFullYear();
  const currentYearCriticas = supabaseCriticas.filter((c) => c.year === currentYear || c.isNewRelease);
  const archiveCriticas = supabaseCriticas.filter((c) => c.year < currentYear && !c.isNewRelease);

  const mainEnsaio = ensaios[0];
  const secondaryEnsaios = ensaios.slice(1, 3);

  const mainUmaImagem = umaImagemList[0];
  const mainEspecial = especiais[0];

  const isDatabaseEmpty =
    !loadingCriticas &&
    ensaios.length === 0 &&
    supabaseCriticas.length === 0 &&
    umaImagemList.length === 0 &&
    especiais.length === 0 &&
    cineastas.length === 0;

  if (loadingCriticas) {
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentWeekEstreias.items.map((est) => (
                <div
                  key={est.id}
                  onClick={() => onNavigate(`/filmes/${est.filmSlug}`)}
                  className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all cursor-pointer group flex flex-col overflow-hidden shadow-sm hover:shadow-md"
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
          </section>
        )}

        {/* 2. ENSAIOS SECTION (1 Main + 2 Secondary) - Only if Ensaios exist */}
        {ensaios.length > 0 && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#1A1A1A]/15 pb-4 gap-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90 block mb-1">
                  Publicação
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#1A1A1A]">
                  ENSAIOS
                </h2>
                <p className="text-sm font-serif-body text-[#1A1A1A]/70 mt-1 max-w-xl">
                  Cinema como ponto de partida para pensar aquilo que existe para além da tela.
                </p>
              </div>
              <button
                onClick={() => onNavigate('/ensaios')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors group"
              >
                <span>Ver todos os ensaios</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Main Ensaio (Large) */}
              {mainEnsaio && (
                <div className="lg:col-span-7">
                  <ArticleCard
                    type="ensaio"
                    variant="large"
                    title={mainEnsaio.title}
                    subtitle={mainEnsaio.subtitle}
                    image={mainEnsaio.coverImage}
                    date={mainEnsaio.date}
                    author={mainEnsaio.author}
                    readTimeMinutes={mainEnsaio.readTimeMinutes}
                    onClick={() => onNavigate(`/ensaios/${mainEnsaio.slug}`)}
                  />
                </div>
              )}

              {/* Secondary Ensaios */}
              {secondaryEnsaios.length > 0 && (
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                  {secondaryEnsaios.map((e) => (
                    <ArticleCard
                      key={e.id}
                      type="ensaio"
                      variant="horizontal"
                      title={e.title}
                      subtitle={e.subtitle}
                      image={e.coverImage}
                      date={e.date}
                      readTimeMinutes={e.readTimeMinutes}
                      onClick={() => onNavigate(`/ensaios/${e.slug}`)}
                    />
                  ))}
                </div>
              )}
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
              {currentYearCriticas.map((c) => (
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
              <div className="lg:col-span-6 overflow-hidden border border-[#1A1A1A]/12">
                <img
                  src={mainUmaImagem.image}
                  alt={mainUmaImagem.title}
                  className="w-full h-auto max-h-[450px] object-cover hover:scale-[1.02] transition-transform duration-700"
                />
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90">
                  <Sparkles size={13} className="text-[#1A1A1A]" />
                  <span>Uma Imagem, Uma Ideia</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-serif-display font-normal text-[#1A1A1A] leading-tight">
                  {mainUmaImagem.title}
                </h3>

                <p className="text-sm sm:text-base font-serif-body text-[#1A1A1A]/80 leading-relaxed whitespace-pre-line">
                  {mainUmaImagem.content}
                </p>

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
          <section className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90 block mb-1">
                  Memória Cinematográfica
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#1A1A1A]">
                  DO ARQUIVO
                </h2>
              </div>
              <button
                onClick={() => onNavigate('/arquivo')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors group"
              >
                <span>Explorar Arquivo</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archiveCriticas.map((c) => (
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

        {/* 6. ESPECIAIS (Only if Especiais exist) */}
        {mainEspecial && (
          <section className="relative overflow-hidden bg-[#121212] text-[#F5F2ED] border border-[#1A1A1A] p-8 sm:p-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
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

        {/* 7. CINEASTAS (Only if Cineastas exist) */}
        {cineastas.length > 0 && (
          <section className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/90 block mb-1">
                  Índice de Autores
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif-display font-normal text-[#1A1A1A]">
                  CINEASTAS
                </h2>
              </div>
              <button
                onClick={() => onNavigate('/cineastas')}
                className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors group"
              >
                <span>Ver todos</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cineastas.slice(0, 3).map((cin) => (
                <div
                  key={cin.id}
                  onClick={() => onNavigate(`/cineastas/${cin.slug}`)}
                  className="group cursor-pointer p-6 bg-white border border-[#1A1A1A]/12 hover:border-[#1A1A1A] transition-all duration-300 flex items-start gap-4"
                >
                  <img
                    src={cin.photo}
                    alt={cin.name}
                    className="w-16 h-16 rounded-full object-cover border border-[#1A1A1A]/15 shrink-0 filter grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="space-y-1">
                    <h3 className="text-xl font-serif-display text-[#1A1A1A] group-hover:underline underline-offset-2 transition-colors">
                      {cin.name}
                    </h3>
                    <p className="text-xs font-mono text-[#1A1A1A]/70">
                      {cin.country} {cin.birthYear ? `· (${cin.birthYear}–${cin.deathYear || ''})` : ''}
                    </p>
                    <p className="text-xs font-serif-body text-[#1A1A1A]/70 line-clamp-2 pt-1">
                      {cin.bio}
                    </p>
                  </div>
                </div>
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
