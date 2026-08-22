import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Film, Loader2 } from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { ArticleCard } from '../components/ArticleCard';
import { fetchPessoaBySlug, SupabasePessoa } from '../services/repositories/pessoasRepository';
import { fetchFilmes, SupabaseFilme } from '../services/repositories/filmesRepository';
import { fetchUmaImagem, mapSupabaseUmaImagemToDomain } from '../services/repositories/umaImagemRepository';
import { fetchEspeciais } from '../services/repositories/especiaisRepository';
import { Especial, Pessoa, UmaImagemUmaIdeia } from '../types';

import { calculatePersonAge } from '../utils/dateUtils';
export { calculatePersonAge };

interface PessoaDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
  onGoBack?: () => void;
}

export const PessoaDetailPage: React.FC<PessoaDetailPageProps> = ({
  slug,
  onNavigate,
  onGoBack,
}) => {
  const [supabasePessoa, setSupabasePessoa] = useState<SupabasePessoa | null>(null);
  const [supabaseFilmes, setSupabaseFilmes] = useState<SupabaseFilme[]>([]);
  const [umaImagemList, setUmaImagemList] = useState<UmaImagemUmaIdeia[]>([]);
  const [supabaseEspeciais, setSupabaseEspeciais] = useState<Especial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      fetchPessoaBySlug(slug),
      fetchFilmes({ allStatuses: false }),
    ]).then(async ([pesRes, filmRes]) => {
      if (!isMounted) return;
      setSupabasePessoa(pesRes.data);
      if (filmRes.data) {
        setSupabaseFilmes(filmRes.data);
      }
      if (pesRes.data?.id) {
        const [umaRes, espRes] = await Promise.all([
          fetchUmaImagem({ personId: pesRes.data.id, allStatuses: false }),
          fetchEspeciais({ relatedPersonId: pesRes.data.id, allStatuses: false }),
        ]);
        if (isMounted) {
          if (umaRes.data) {
            setUmaImagemList(umaRes.data.map(mapSupabaseUmaImagemToDomain));
          }
          if (espRes.data) {
            setSupabaseEspeciais(espRes.data);
          }
        }
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Fallback to cmsStore / legacy cineasta if Supabase does not have it
  const cineastaFallback = cmsStore.getCineastaBySlug(slug);
  const cmsPessoa = cmsStore.getPessoaBySlug(slug);

  const person: Pessoa | SupabasePessoa | undefined =
    supabasePessoa ||
    cmsPessoa ||
    (cineastaFallback
      ? {
          id: `pes-${slug}`,
          name: cineastaFallback.name,
          slug: slug,
          photo_url: cineastaFallback.photo,
          country: cineastaFallback.country,
          birth_date: cineastaFallback.birthYear ? String(cineastaFallback.birthYear) : undefined,
          death_date: cineastaFallback.deathYear ? String(cineastaFallback.deathYear) : undefined,
          bio: cineastaFallback.bio,
          editorial_profile: undefined,
          primary_roles: ['Diretor'],
          tags: cineastaFallback.tags,
          created_at: cineastaFallback.createdAt,
          updated_at: cineastaFallback.updatedAt,
        }
      : undefined);

  if (loading && !person) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#1A1A1A]/60" />
        <p className="text-xs font-mono text-[#1A1A1A]/60">Consultando acervo editorial...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-32 text-center space-y-4 px-4">
        <h1 className="text-3xl font-serif-display text-[#1A1A1A]">Pessoa não encontrada no arquivo.</h1>
        <p className="text-sm font-serif-body text-[#1A1A1A]/70">O profissional solicitado não consta no catálogo.</p>
        <button
          onClick={() => onNavigate('/pessoas')}
          className="text-xs uppercase tracking-[0.2em] px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors font-semibold"
        >
          Explorar Pessoas
        </button>
      </div>
    );
  }

  const related = cmsStore.getPersonRelatedContent(person.slug);

  // Normalize properties
  const photoUrl = 'photo_url' in person ? person.photo_url : (person as any).photo;
  const birthDateStr = 'birth_date' in person ? person.birth_date : (person as any).birthDate;
  const deathDateStr = 'death_date' in person ? person.death_date : (person as any).deathDate;
  const primaryRolesList = 'primary_roles' in person ? person.primary_roles : (person as any).primaryRoles;

  // Format roles
  const rolesDisplay = primaryRolesList && primaryRolesList.length > 0
    ? primaryRolesList.join(' · ').toUpperCase()
    : 'PROFISSIONAL DO CINEMA';

  // Format years and calculated age
  const birthYear = birthDateStr ? birthDateStr.slice(0, 4) : undefined;
  const deathYear = deathDateStr ? deathDateStr.slice(0, 4) : undefined;
  const calculatedAge = calculatePersonAge(birthDateStr, deathDateStr);

  // Country & Flag
  const countryName = ('country_data' in person && person.country_data?.name)
    ? person.country_data.name
    : (person.country || undefined);
  const flagUrl = ('country_data' in person && person.country_data?.flag_url)
    ? person.country_data.flag_url
    : undefined;

  return (
    <article className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <button
          onClick={onGoBack || (() => onNavigate('/pessoas'))}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans-ui text-[#1A1A1A]/70 hover:text-[#D4AF37] transition-colors font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Voltar</span>
        </button>
      </div>

      {/* Header / Person Biography */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start border-b border-[#1A1A1A]/15 pb-12">
          
          {/* Editorial Rectangular Photo */}
          <div className="md:col-span-4 lg:col-span-4 flex justify-center">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={person.name}
                className="w-full max-w-[280px] md:max-w-full aspect-[4/5] object-cover shadow-2xl border border-[#1A1A1A]/20 filter grayscale hover:grayscale-0 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full max-w-[280px] aspect-[4/5] bg-white border border-[#1A1A1A]/20 flex flex-col items-center justify-center text-[#1A1A1A]/40 gap-2">
                <span className="text-4xl font-serif-display">{person.name.charAt(0)}</span>
                <span className="text-xs uppercase font-sans tracking-widest">Sem Foto</span>
              </div>
            )}
          </div>

          {/* Bio & Details */}
          <div className="md:col-span-8 lg:col-span-8 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                {rolesDisplay}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A] leading-tight">
                {person.name}
              </h1>
            </div>

            {/* Quick Specs */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-sans font-medium text-[#1A1A1A]/80 border-y border-[#1A1A1A]/10 py-3">
              {countryName && (
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#1A1A1A]">
                  {flagUrl ? (
                    <img
                      src={flagUrl}
                      alt={countryName}
                      className="w-5 h-3.5 object-cover rounded-xs border border-[#1A1A1A]/20 shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <span>{countryName}</span>
                </div>
              )}
              {birthYear && (
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Calendar size={14} className="text-[#D4AF37]" />
                  <span>
                    {birthYear} – {deathYear || 'PRESENTE'}
                    {calculatedAge !== null ? ` · ${calculatedAge} ANOS` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Bio Text */}
            {person.bio && (
              <div className="font-serif-body text-base sm:text-lg text-[#1A1A1A]/85 leading-relaxed space-y-4 pt-1">
                {person.bio.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Filmography in Archive Section */}
      {(() => {
        // Collect films from Supabase where person is credited
        const matchingSupabaseFilms = supabaseFilmes.filter((f) =>
          f.credits?.some(
            (c) =>
              c.person_id === person.id ||
              c.person?.slug === person.slug ||
              (c.person?.name && c.person.name.toLowerCase().trim() === person.name.toLowerCase().trim()) ||
              (c.fallback_person_name && c.fallback_person_name.toLowerCase().trim() === person.name.toLowerCase().trim())
          )
        );

        // Fallback or merged films
        const filmMap = new Map<string, {
          id: string;
          slug: string;
          title: string;
          year: number;
          country: string;
          posterUrl?: string | null;
          credits: Array<{ id: string; department: string; role?: string | null; characterName?: string | null }>;
        }>();

        // Add matching Supabase films
        matchingSupabaseFilms.forEach((sf) => {
          const creditsForPerson = (sf.credits || [])
            .filter(
              (c) =>
                c.person_id === person.id ||
                c.person?.slug === person.slug ||
                (c.person?.name && c.person.name.toLowerCase().trim() === person.name.toLowerCase().trim()) ||
                (c.fallback_person_name && c.fallback_person_name.toLowerCase().trim() === person.name.toLowerCase().trim())
            )
            .map((c) => ({
              id: c.id,
              department: c.department,
              role: c.role,
              characterName: c.character_name,
            }));

          filmMap.set(sf.slug, {
            id: sf.id,
            slug: sf.slug,
            title: sf.title,
            year: sf.year,
            country: sf.countries && sf.countries.length > 0 ? sf.countries.map((c) => c.name).join(', ') : sf.country || 'Internacional',
            posterUrl: sf.poster_url,
            credits: creditsForPerson,
          });
        });

        // Add local/related films if not already present
        related.filmes.forEach((lf) => {
          if (!filmMap.has(lf.slug)) {
            const personCredits = (lf.credits || []).filter(
              (c) =>
                c.personId === person.id ||
                c.personSlug === person.slug ||
                c.personName.toLowerCase().trim() === person.name.toLowerCase().trim()
            );

            filmMap.set(lf.slug, {
              id: lf.id,
              slug: lf.slug,
              title: lf.title,
              year: lf.year,
              country: lf.country,
              posterUrl: lf.posterImage,
              credits: personCredits.map((c) => ({
                id: c.id,
                department: c.department,
                role: c.role,
                characterName: c.characterName,
              })),
            });
          }
        });

        const allPersonFilms = Array.from(filmMap.values());

        return (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
            <div className="border-b border-[#1A1A1A]/15 pb-4 flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A]">
                No Arquivo do Lanterna Mágica
              </h2>
              <span className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]/60">
                {allPersonFilms.length} filme{allPersonFilms.length !== 1 ? 's' : ''} registrado{allPersonFilms.length !== 1 ? 's' : ''}
              </span>
            </div>

            {allPersonFilms.length === 0 ? (
              <div className="bg-white border border-[#1A1A1A]/15 p-6 text-center text-sm font-serif-body text-[#1A1A1A]/70">
                Ainda não há filmes com créditos atribuídos a {person.name} no acervo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {allPersonFilms.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onNavigate(`/filmes/${f.slug}`)}
                    className="bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] transition-all cursor-pointer group flex flex-col overflow-hidden"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden bg-[#1A1A1A]/10 relative">
                      {f.posterUrl ? (
                        <img
                          src={f.posterUrl}
                          alt={f.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/30">
                          <Film size={32} />
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] block">
                          {f.year} · {f.country}
                        </span>
                        <h4 className="text-base font-serif-display font-medium text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-snug mt-1">
                          {f.title}
                        </h4>
                      </div>

                      <div className="pt-2 border-t border-[#1A1A1A]/10 text-xs font-sans text-[#1A1A1A]/70">
                        {f.credits.length > 0 ? (
                          f.credits.map((c) => (
                            <div key={c.id} className="truncate">
                              <span className="font-bold text-[#1A1A1A]">{c.department}: </span>
                              <span>{c.characterName ? `Personagem "${c.characterName}"` : (c.role || c.department)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="truncate text-[11px] text-[#1A1A1A]/50">
                            Crédito registrado no filme
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* Editorial Content / Publications Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 space-y-12">
        <div className="border-b border-[#1A1A1A]/15 pb-4">
          <h2 className="text-2xl sm:text-3xl font-serif-display text-[#1A1A1A]">
            Conteúdos Editoriais sobre {person.name}
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

        {/* Especiais & Listas */}
        {(supabaseEspeciais.length > 0 || related.especiais.length > 0 || related.listas.length > 0) && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              ESPECIAIS & LISTAS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supabaseEspeciais.map((es) => (
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
              {supabaseEspeciais.length === 0 && related.especiais.map((es) => (
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

        {/* Uma Imagem */}
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
      </section>
    </article>
  );
};
