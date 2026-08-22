import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Globe, Film as FilmIcon, User, Star, Clapperboard, Sparkles, Loader2 } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { ArticleCard } from '../components/ArticleCard';
import { fetchFilmeBySlug, SupabaseFilme } from '../services/repositories/filmesRepository';
import { fetchUmaImagem, mapSupabaseUmaImagemToDomain } from '../services/repositories/umaImagemRepository';
import { UmaImagemUmaIdeia } from '../types';

interface FilmDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const FilmDetailPage: React.FC<FilmDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const [film, setFilm] = useState<SupabaseFilme | null>(null);
  const [umaImagemList, setUmaImagemList] = useState<UmaImagemUmaIdeia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFilm() {
      setLoading(true);
      const { data } = await fetchFilmeBySlug(slug);
      if (isMounted) {
        if (data) {
          setFilm(data);
          const umaRes = await fetchUmaImagem({ filmId: data.id, allStatuses: false });
          if (isMounted && umaRes.data) {
            setUmaImagemList(umaRes.data.map(mapSupabaseUmaImagemToDomain));
          }
        } else {
          // Fallback para cmsStore se não encontrar no Supabase
          const localFilm = cmsStore.getFilmeBySlug(slug);
          if (localFilm) {
            setFilm({
              id: localFilm.id,
              legacy_id: localFilm.id,
              title: localFilm.title,
              original_title: localFilm.originalTitle || null,
              slug: localFilm.slug,
              year: localFilm.year,
              country: localFilm.country,
              duration_minutes: localFilm.durationMinutes || null,
              poster_url: localFilm.posterImage || null,
              backdrop_url: null,
              synopsis: localFilm.synopsis || null,
              editorial_rating: null,
              status: 'published',
              published_at: localFilm.createdAt,
              scheduled_at: null,
              created_at: localFilm.createdAt,
              updated_at: localFilm.updatedAt,
              legacy_director_name: localFilm.director,
              generos: localFilm.genres?.map((g) => ({ id: g, name: g, slug: g })) || [],
              countries: localFilm.country ? [{ id: 'c1', name: localFilm.country, slug: 'pais', flag_url: null, created_at: '', updated_at: '' }] : [],
              credits: (localFilm.credits || []).map((c, i) => ({
                id: c.id,
                film_id: localFilm.id,
                person_id: c.personId || null,
                fallback_person_name: c.personName,
                department: c.department,
                role: c.role || null,
                character_name: c.characterName || null,
                order_index: i,
                person: c.personSlug ? {
                  id: c.personId || 'p1',
                  legacy_id: null,
                  name: c.personName,
                  slug: c.personSlug,
                  photo_url: c.personPhoto || null,
                  birth_date: null,
                  death_date: null,
                  country_id: null,
                  country: null,
                  bio: null,
                  is_editorial_profile: false,
                  editorial_profile: null,
                  primary_roles: [],
                  highlight_home: false,
                  status: 'published',
                  published_at: null,
                  scheduled_at: null,
                  created_at: '',
                  updated_at: '',
                } : null,
              })),
            });
          } else {
            setFilm(null);
          }
        }
        setLoading(false);
      }
    }
    loadFilm();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
        <p className="text-xs font-sans uppercase tracking-widest text-[#1A1A1A]/60">
          Carregando registro canônico do filme...
        </p>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <h1 className="text-3xl font-serif-display text-[#1A1A1A]">Filme não encontrado no acervo.</h1>
        <p className="text-sm font-serif-body text-[#1A1A1A]/70">O filme solicitado não está registrado em nosso arquivo.</p>
        <button
          onClick={() => onNavigate('/arquivo')}
          className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors font-semibold"
        >
          Explorar Arquivo
        </button>
      </div>
    );
  }

  const related = cmsStore.getFilmRelatedContent(film.slug);

  // Group credits by department (ignoring entries with no person and no fallback name)
  const credits = (film.credits || []).filter(
    (c) => Boolean(c.person?.name?.trim() || c.fallback_person_name?.trim())
  );
  const castCredits = credits.filter(
    (c) =>
      c.department === 'Elenco' ||
      c.department.toLowerCase().includes('elenco') ||
      c.department.toLowerCase().includes('ator') ||
      c.department.toLowerCase().includes('atriz')
  );

  const directorCredits = credits.filter(
    (c) => c.department === 'Direção' || c.department.toLowerCase().includes('dire')
  );

  const crewCredits = credits.filter((c) => !castCredits.includes(c) && !directorCredits.includes(c));

  // Determine director display name
  const directorName =
    directorCredits.length > 0
      ? directorCredits.map((d) => d.person?.name || d.fallback_person_name).join(', ')
      : film.legacy_director_name || 'Desconhecido';

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <button
          onClick={onGoBack || (() => onNavigate('/arquivo'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans-ui text-[#1A1A1A]/70 hover:text-[#D4AF37] transition-colors font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
      </div>

      {/* Main Header / Film Overview */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start border-b border-[#1A1A1A]/15 pb-12">
          {/* Film Poster */}
          <div className="md:col-span-4 lg:col-span-4 flex justify-center">
            {film.poster_url ? (
              <img
                src={film.poster_url}
                alt={`Pôster de ${film.title}`}
                className="w-full max-w-[280px] md:max-w-full aspect-[2/3] object-cover shadow-2xl border border-[#1A1A1A]/20 bg-[#1A1A1A]/10"
              />
            ) : (
              <div className="w-full max-w-[280px] aspect-[2/3] bg-white border border-[#1A1A1A]/20 flex flex-col items-center justify-center text-[#1A1A1A]/40 gap-2">
                <FilmIcon size={40} />
                <span className="text-xs uppercase font-sans tracking-widest">Sem Pôster</span>
              </div>
            )}
          </div>

          {/* Film Metadata & Synopsis */}
          <div className="md:col-span-8 lg:col-span-8 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                REGISTRO DE FILME · ARQUIVO
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A] leading-tight">
                {film.title}
              </h1>
              {film.original_title && film.original_title !== film.title && (
                <p className="text-base sm:text-lg font-serif-body italic text-[#1A1A1A]/60">
                  Título original: {film.original_title}
                </p>
              )}
            </div>

            {/* Quick Specs Bar */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-sans font-medium text-[#1A1A1A]/80 border-y border-[#1A1A1A]/10 py-3">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#D4AF37]" />
                <span>{film.year}</span>
              </div>

              {/* Countries with flags */}
              <div className="flex items-center gap-1.5">
                <Globe size={14} className="text-[#D4AF37]" />
                {film.countries && film.countries.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    {film.countries.map((c, idx) => (
                      <span key={c.id} className="inline-flex items-center gap-1">
                        {c.flag_url && (
                          <img src={c.flag_url} alt="" className="w-3.5 h-2.5 object-cover border border-black/10" />
                        )}
                        <span>{c.name}{idx < (film.countries?.length || 1) - 1 ? ',' : ''}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span>{film.country || 'Internacional'}</span>
                )}
              </div>

              {film.duration_minutes && (
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#D4AF37]" />
                  <span>{film.duration_minutes} min</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clapperboard size={14} className="text-[#D4AF37]" />
                <span>Dir. {directorName}</span>
              </div>
            </div>

            {/* Genres */}
            {film.generos && film.generos.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/50">
                  GÊNEROS:
                </span>
                {film.generos.map((g) => (
                  <span
                    key={g.id}
                    className="text-[11px] font-sans font-semibold uppercase tracking-wider px-2.5 py-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A]"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {film.synopsis && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/70">
                  Sinopse
                </h3>
                <p className="font-serif-body text-base sm:text-lg text-[#1A1A1A]/90 leading-relaxed max-w-2xl">
                  {film.synopsis}
                </p>
              </div>
            )}

            {/* Release in Brazil notification if available */}
            {related.estreia && (
              <div className="bg-white border-l-4 border-[#D4AF37] border-y border-r border-[#1A1A1A]/10 p-4 space-y-1">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                  Estreia no Circuito Brasileiro
                </span>
                <p className="text-sm font-sans font-medium text-[#1A1A1A]">
                  Lançamento oficial em{' '}
                  {new Date(related.estreia.releaseDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {related.estreia.distributor ? ` · Distribuição: ${related.estreia.distributor}` : ''}
                </p>
                {related.estreia.notes && (
                  <p className="text-xs font-serif-body italic text-[#1A1A1A]/70">{related.estreia.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Credits / Cast & Crew Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 space-y-10">
        <div className="border-b border-[#1A1A1A]/15 pb-4 flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A]">
            Elenco & Equipe
          </h2>
          <span className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]/60">
            {credits.length > 0 ? `${credits.length} profissionais registrados` : `Direção: ${directorName}`}
          </span>
        </div>

        {credits.length === 0 ? (
          <div className="bg-white border border-[#1A1A1A]/15 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-[#F5F2ED] flex items-center justify-center font-serif-display text-lg shrink-0">
              {directorName.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37]">Direção</span>
              <h4 className="text-base font-serif-display font-medium text-[#1A1A1A]">{directorName}</h4>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cast Section */}
            {castCredits.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                  ELENCO PRINCIPAL
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {castCredits.map((c) => {
                    const personName = c.person?.name || c.fallback_person_name || 'Desconhecido';
                    const photo = c.person?.photo_url;
                    const slugTarget = c.person?.slug;

                    return (
                      <div
                        key={c.id}
                        onClick={() => slugTarget && onNavigate(`/pessoas/${slugTarget}`)}
                        className={`flex items-center gap-3 p-3 bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A] transition-colors ${
                          slugTarget ? 'cursor-pointer group' : ''
                        }`}
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt={personName}
                            className="w-12 h-12 rounded-full object-cover border border-[#1A1A1A]/20 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#1A1A1A]/10 border border-[#1A1A1A]/20 flex items-center justify-center text-[#1A1A1A]/60 font-sans font-bold shrink-0">
                            {personName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-sans font-bold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors truncate">
                            {personName}
                          </h4>
                          {c.character_name ? (
                            <p className="text-xs font-serif-body text-[#1A1A1A]/70 truncate">
                              como <span className="italic">{c.character_name}</span>
                            </p>
                          ) : (
                            <p className="text-xs font-serif-body text-[#1A1A1A]/60 truncate">
                              {c.role || 'Elenco'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direction & Crew Section */}
            {(directorCredits.length > 0 || crewCredits.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                  DIREÇÃO & EQUIPE TÉCNICA
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...directorCredits, ...crewCredits].map((c) => {
                    const personName = c.person?.name || c.fallback_person_name || 'Desconhecido';
                    const photo = c.person?.photo_url;
                    const slugTarget = c.person?.slug;

                    return (
                      <div
                        key={c.id}
                        onClick={() => slugTarget && onNavigate(`/pessoas/${slugTarget}`)}
                        className={`flex items-center gap-3 p-3 bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A] transition-colors ${
                          slugTarget ? 'cursor-pointer group' : ''
                        }`}
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt={personName}
                            className="w-12 h-12 rounded-full object-cover border border-[#1A1A1A]/20 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#1A1A1A]/10 border border-[#1A1A1A]/20 flex items-center justify-center text-[#1A1A1A]/60 font-sans font-bold shrink-0">
                            {personName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block truncate">
                            {c.department}
                          </span>
                          <h4 className="text-sm font-sans font-bold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors truncate">
                            {personName}
                          </h4>
                          {c.role && c.role !== c.department && (
                            <p className="text-xs font-serif-body text-[#1A1A1A]/60 truncate">{c.role}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Publications about this film on Lanterna Mágica */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 space-y-12">
        <div className="border-b border-[#1A1A1A]/15 pb-4">
          <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A]">
            Publicações no Lanterna Mágica sobre {film.title}
          </h2>
        </div>

        {/* Críticas */}
        {related.criticas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              CRÍTICAS FILMOGRÁFICAS ({related.criticas.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.criticas.map((c) => (
                <ArticleCard
                  key={c.id}
                  type="critica"
                  variant="medium"
                  title={c.editorialTitle}
                  movieTitle={c.movieTitle}
                  director={c.director}
                  year={c.year}
                  image={c.coverImage}
                  starRating={c.starRating}
                  onClick={() => onNavigate(`/criticas/${c.slug}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ensaios */}
        {related.ensaios.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              ENSAIOS & REFLEXÕES ({related.ensaios.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {related.ensaios.map((e) => (
                <ArticleCard
                  key={e.id}
                  type="ensaio"
                  variant="medium"
                  title={e.title}
                  subtitle={e.subtitle}
                  image={e.coverImage}
                  date={e.date}
                  onClick={() => onNavigate(`/ensaios/${e.slug}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Uma Imagem, Uma Ideia */}
        {umaImagemList.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              UMA IMAGEM, UMA IDEIA ({umaImagemList.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {umaImagemList.map((u) => (
                <ArticleCard
                  key={u.id}
                  type="uma_imagem"
                  variant="medium"
                  title={u.title}
                  subtitle={u.relatedMovie ? `Filme: ${u.relatedMovie}` : 'Uma imagem, uma ideia'}
                  image={u.image}
                  date={u.date}
                  onClick={() => onNavigate(`/uma-imagem/${u.slug}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Especiais & Listas */}
        {(related.especiais.length > 0 || related.listas.length > 0) && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              ESPECIAIS & LISTAS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {related.especiais.map((es) => (
                <ArticleCard
                  key={es.id}
                  type="especial"
                  variant="medium"
                  title={es.title}
                  subtitle={es.subtitle}
                  image={es.coverImage}
                  onClick={() => onNavigate(`/especiais/${es.slug}`)}
                />
              ))}
              {related.listas.map((l) => (
                <ArticleCard
                  key={l.id}
                  type="lista"
                  variant="medium"
                  title={l.title}
                  subtitle={l.intro}
                  image={l.coverImage}
                  onClick={() => onNavigate('/especiais')}
                />
              ))}
            </div>
          </div>
        )}

        {related.criticas.length === 0 &&
          related.ensaios.length === 0 &&
          related.umaImagem.length === 0 &&
          related.especiais.length === 0 &&
          related.listas.length === 0 && (
            <div className="bg-white border border-[#1A1A1A]/15 p-8 text-center space-y-2">
              <p className="font-serif-body text-base text-[#1A1A1A]/70">
                Ainda não há ensaios ou críticas longas dedicadas a este filme no arquivo.
              </p>
              <p className="text-xs font-sans text-[#1A1A1A]/50">
                O filme permanece catalogado no acervo permanente do Lanterna Mágica para consultas e referências cruzadas.
              </p>
            </div>
          )}
      </section>
    </article>
  );
};
