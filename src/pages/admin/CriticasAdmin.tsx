import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  Eye,
  ArrowLeft,
  Film,
  Sparkles,
  Search,
  Loader2,
  Calendar,
  Star,
  Tag as TagIcon,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  X,
  Info
} from 'lucide-react';
import { ContentStatus, Critica } from '../../types';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { StarRatingPicker } from '../../components/admin/StarRatingPicker';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import {
  fetchCriticas,
  fetchCriticaById,
  createCritica,
  updateCritica,
  deleteCritica,
  slugifyCritica,
  mapSupabaseCriticaToCritica,
  SupabaseCritica
} from '../../services/repositories/criticasRepository';
import { fetchFilmes, SupabaseFilme } from '../../services/repositories/filmesRepository';

interface CriticasAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

interface FormState {
  id?: string;
  film_id: string;
  movieTitle: string;
  editorialTitle: string;
  slug: string;
  director: string;
  year: number;
  country: string;
  durationMinutes: number;
  screenplay?: string;
  cinematography?: string;
  genre: string;
  genres: string[];
  coverImage: string;
  content: string;
  starRating: number;
  tags: string[];
  isNewRelease: boolean;
  highlightHome: boolean;
  date: string;
  status: ContentStatus;
  seoTitle?: string;
  seoDescription?: string;
  legacyId?: string;
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1518676590629-3dcbd9c7a5c1?auto=format&fit=crop&q=80&w=1600';

export const CriticasAdmin: React.FC<CriticasAdminProps> = ({ onNotify, autoCreate = false }) => {
  const [criticas, setCriticas] = useState<SupabaseCritica[]>([]);
  const [filmes, setFilmes] = useState<SupabaseFilme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editing, setEditing] = useState<FormState | null>(null);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [previewItem, setPreviewItem] = useState<Critica | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [filmSearchQuery, setFilmSearchQuery] = useState('');

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load Criticas and Films from Supabase
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);

    const [criticasRes, filmesRes] = await Promise.all([
      fetchCriticas({ allStatuses: true }),
      fetchFilmes({ allStatuses: true }),
    ]);

    if (criticasRes.error) {
      setErrorMessage(`Erro ao carregar críticas: ${criticasRes.error.message}`);
    } else {
      setCriticas(criticasRes.data || []);
    }

    if (filmesRes.data) {
      setFilmes(filmesRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoCreate && !editing && !loading) {
      handleCreateNew();
    }
  }, [autoCreate, loading]);

  const handleCreateNew = () => {
    setEditing({
      film_id: '',
      movieTitle: '',
      editorialTitle: '',
      slug: '',
      director: '',
      year: new Date().getFullYear(),
      country: 'Brasil',
      durationMinutes: 120,
      genre: 'Drama',
      genres: ['Drama'],
      coverImage: DEFAULT_COVER,
      content: '',
      starRating: 4.0,
      tags: ['Crítica'],
      isNewRelease: false,
      highlightHome: false,
      date: new Date().toISOString().slice(0, 10),
      status: 'published',
      seoTitle: '',
      seoDescription: '',
    });
    setFilmSearchQuery('');
    setIsUnsaved(false);
  };

  const handleEdit = (raw: SupabaseCritica) => {
    const mapped = mapSupabaseCriticaToCritica(raw);
    setEditing({
      id: raw.id,
      film_id: raw.film_id || '',
      movieTitle: mapped.movieTitle,
      editorialTitle: raw.editorial_title,
      slug: raw.slug,
      director: mapped.director,
      year: mapped.year,
      country: mapped.country,
      durationMinutes: mapped.durationMinutes,
      genre: mapped.genre || 'Drama',
      genres: mapped.genres || ['Drama'],
      coverImage: raw.cover_image || mapped.coverImage,
      content: raw.content,
      starRating: Number(raw.star_rating),
      tags: raw.tags?.map((t) => t.name) || mapped.tags || [],
      isNewRelease: raw.is_new_release,
      highlightHome: raw.highlight_home,
      date: raw.published_at ? raw.published_at.slice(0, 10) : raw.created_at.slice(0, 10),
      status: raw.status,
      seoTitle: raw.seo_title || '',
      seoDescription: raw.seo_description || '',
      legacyId: raw.legacy_id || undefined,
    });
    setFilmSearchQuery('');
    setIsUnsaved(false);
  };

  const handleSelectFilm = (film: SupabaseFilme) => {
    if (!editing) return;

    const dirCredit = film.credits?.find(
      (c) => c.department === 'Direção' || c.department.toLowerCase().includes('dire')
    );
    const dirName = dirCredit?.person?.name || dirCredit?.fallback_person_name || film.legacy_director_name || '';

    const countryName = film.countries && film.countries.length > 0
      ? film.countries.map((c) => c.name).join(' / ')
      : (film.country || '');

    const genresList = film.generos && film.generos.length > 0
      ? film.generos.map((g) => g.name)
      : [];

    const newSlug = editing.slug && editing.slug !== slugifyCritica(`${editing.movieTitle}-critica`)
      ? editing.slug
      : slugifyCritica(`${film.title}-critica`);

    const newCover = (editing.coverImage && editing.coverImage !== DEFAULT_COVER)
      ? editing.coverImage
      : (film.backdrop_url || film.poster_url || DEFAULT_COVER);

    setEditing({
      ...editing,
      film_id: film.id,
      movieTitle: film.title,
      director: dirName || editing.director,
      year: film.year || editing.year,
      country: countryName || editing.country,
      durationMinutes: film.duration_minutes || editing.durationMinutes,
      genres: genresList.length > 0 ? genresList : editing.genres,
      genre: genresList.length > 0 ? genresList.join(', ') : editing.genre,
      coverImage: newCover,
      slug: newSlug,
    });
    setIsUnsaved(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.film_id) {
      onNotify('Atenção: É obrigatório selecionar um filme cadastrado no catálogo para a crítica.');
      return;
    }

    if (!editing.editorialTitle.trim()) {
      onNotify('Atenção: Por favor, preencha o Título Editorial da Crítica.');
      return;
    }

    if (!editing.content.trim()) {
      onNotify('Atenção: Por favor, escreva o texto da crítica.');
      return;
    }

    const calculatedSlug = editing.slug.trim()
      ? slugifyCritica(editing.slug)
      : slugifyCritica(`${editing.movieTitle || editing.editorialTitle}-critica`);

    if (!calculatedSlug) {
      onNotify('Atenção: Slug inválido.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    // Format dates according to status
    let publishedAt: string | null = null;
    let scheduledAt: string | null = null;
    const isoDateStr = editing.date ? `${editing.date}T12:00:00.000Z` : new Date().toISOString();

    if (editing.status === 'published') {
      publishedAt = isoDateStr;
    } else if (editing.status === 'scheduled') {
      scheduledAt = isoDateStr;
      publishedAt = isoDateStr;
    } else {
      publishedAt = editing.date ? isoDateStr : null;
    }

    if (editing.id) {
      // Update
      const { data, error } = await updateCritica(editing.id, {
        editorial_title: editing.editorialTitle.trim(),
        slug: calculatedSlug,
        content: editing.content.trim(),
        star_rating: editing.starRating,
        film_id: editing.film_id,
        is_new_release: editing.isNewRelease,
        highlight_home: editing.highlightHome,
        cover_image: editing.coverImage || null,
        seo_title: editing.seoTitle?.trim() || null,
        seo_description: editing.seoDescription?.trim() || null,
        status: editing.status,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        legacy_movie_title: editing.movieTitle || null,
        legacy_director: editing.director || null,
        legacy_year: editing.year || null,
        legacy_country: editing.country || null,
        tags: editing.tags,
      });

      setSaving(false);

      if (error) {
        setErrorMessage(error.message);
        onNotify(`Erro ao salvar crítica: ${error.message}`);
        return;
      }

      onNotify('Crítica atualizada no Supabase com sucesso!');
    } else {
      // Create
      const { data, error } = await createCritica({
        editorial_title: editing.editorialTitle.trim(),
        slug: calculatedSlug,
        content: editing.content.trim(),
        star_rating: editing.starRating,
        film_id: editing.film_id,
        is_new_release: editing.isNewRelease,
        highlight_home: editing.highlightHome,
        cover_image: editing.coverImage || null,
        seo_title: editing.seoTitle?.trim() || null,
        seo_description: editing.seoDescription?.trim() || null,
        status: editing.status,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        legacy_movie_title: editing.movieTitle || null,
        legacy_director: editing.director || null,
        legacy_year: editing.year || null,
        legacy_country: editing.country || null,
        tags: editing.tags,
      });

      setSaving(false);

      if (error) {
        setErrorMessage(error.message);
        onNotify(`Erro ao criar crítica: ${error.message}`);
        return;
      }

      onNotify('Nova crítica criada no Supabase com sucesso!');
    }

    setEditing(null);
    setIsUnsaved(false);
    loadData();
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    const { success, error } = await deleteCritica(deleteTarget.id);
    setSaving(false);

    if (!success || error) {
      onNotify(`Erro ao excluir crítica: ${error?.message || 'Erro desconhecido'}`);
    } else {
      onNotify(`Crítica de "${deleteTarget.title}" excluída com sucesso.`);
      setDeleteTarget(null);
      loadData();
    }
  };

  // Convert editing state to preview format
  const handleOpenPreview = () => {
    if (!editing) return;
    const previewCritica: Critica = {
      id: editing.id || 'temp-id',
      filmId: editing.film_id || undefined,
      movieTitle: editing.movieTitle || 'Título do Filme',
      editorialTitle: editing.editorialTitle || 'Título Editorial',
      slug: editing.slug || 'slug-critica',
      director: editing.director || 'Diretor',
      year: editing.year,
      country: editing.country,
      durationMinutes: editing.durationMinutes,
      genre: editing.genre,
      genres: editing.genres,
      coverImage: editing.coverImage,
      content: editing.content,
      starRating: editing.starRating,
      tags: editing.tags,
      isNewRelease: editing.isNewRelease,
      highlightHome: editing.highlightHome,
      date: editing.date,
      status: editing.status,
      seoTitle: editing.seoTitle,
      seoDescription: editing.seoDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPreviewItem(previewCritica);
  };

  // Filtered films for the picker
  const filteredFilmsForPicker = filmes.filter((f) => {
    if (!filmSearchQuery.trim()) return true;
    const q = filmSearchQuery.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      (f.original_title && f.original_title.toLowerCase().includes(q)) ||
      String(f.year).includes(q) ||
      (f.legacy_director_name && f.legacy_director_name.toLowerCase().includes(q))
    );
  });

  // Selected film details in editing form
  const selectedFilm = filmes.find((f) => f.id === editing?.film_id);

  // Filtered criticas in table
  const filteredCriticas = criticas.filter((c) => {
    const mapped = mapSupabaseCriticaToCritica(c);

    // Search query
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const matchMovie = mapped.movieTitle.toLowerCase().includes(q);
      const matchEditorial = c.editorial_title.toLowerCase().includes(q);
      const matchDirector = mapped.director.toLowerCase().includes(q);
      const matchContent = c.content.toLowerCase().includes(q);
      if (!matchMovie && !matchEditorial && !matchDirector && !matchContent) return false;
    }

    // Status filter
    if (statusFilter !== 'todos' && c.status !== statusFilter) {
      return false;
    }

    // Type filter (is_new_release)
    if (typeFilter === 'lancamentos' && !c.is_new_release) return false;
    if (typeFilter === 'arquivo' && c.is_new_release) return false;

    return true;
  });

  if (editing) {
    return (
      <div className="space-y-6">
        {/* Form Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#1A1A1A]/15 pb-4 gap-2">
          <button
            type="button"
            onClick={() => {
              if (isUnsaved && !confirm('Você possui alterações não salvas. Deseja realmente sair?')) {
                return;
              }
              setEditing(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft size={14} /> Voltar para lista
          </button>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-mono font-semibold px-2 py-0.5 border ${
                isUnsaved
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              {isUnsaved ? '• Alterações não salvas' : '✓ Dados sincronizados'}
            </span>

            <button
              type="button"
              onClick={handleOpenPreview}
              className="px-3 py-1.5 border border-[#1A1A1A]/20 bg-white hover:bg-[#1A1A1A]/5 text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Eye size={14} /> Pré-visualizar
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-sans flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>Erro:</strong> {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
            <h2 className="text-xl font-serif-display text-[#1A1A1A]">
              {editing.id ? 'Editar Crítica Cinematográfica' : 'Nova Crítica Cinematográfica'}
            </h2>
            <span className="text-[10px] font-mono text-[#1A1A1A]/50 uppercase">
              Supabase public.criticas
            </span>
          </div>

          {/* Canonical Film Selection Section */}
          <div className="p-4 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                <Film size={14} className="text-[#D4AF37]" />
                Filme Relacionado no Acervo *
              </label>
              {editing.film_id ? (
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Vinculado a {selectedFilm?.title || editing.movieTitle}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-red-700 bg-red-100 px-2 py-0.5 font-bold">
                  * Seleção obrigatória
                </span>
              )}
            </div>

            <p className="text-[11px] font-sans text-[#1A1A1A]/70 leading-relaxed">
              Vincule esta crítica diretamente ao registro canônico do filme em <code className="font-mono bg-white px-1 py-0.2 border border-[#1A1A1A]/15">public.filmes</code>. Os dados técnicos de direção, ano, país e poster serão sincronizados automaticamente.
            </p>

            {/* Film Selector Picker */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-[#1A1A1A]/40" />
                <input
                  type="text"
                  placeholder="Pesquisar filme no catálogo por título, ano ou diretor..."
                  value={filmSearchQuery}
                  onChange={(e) => setFilmSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div className="max-h-48 overflow-y-auto border border-[#1A1A1A]/15 bg-white divide-y divide-[#1A1A1A]/5">
                {filmes.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#1A1A1A]/60 font-sans">
                    Nenhum filme encontrado no banco de dados. Cadastre primeiro em &ldquo;Filmes&rdquo;.
                  </div>
                ) : filteredFilmsForPicker.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#1A1A1A]/60 font-sans">
                    Nenhum filme corresponde à busca &ldquo;{filmSearchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredFilmsForPicker.slice(0, 20).map((f) => {
                    const isSelected = editing.film_id === f.id;
                    const dir = f.credits?.find((c) => c.department === 'Direção')?.person?.name || f.legacy_director_name || 'Direção não cadastrada';
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          handleSelectFilm(f);
                          setFilmSearchQuery('');
                        }}
                        className={`w-full text-left p-2.5 flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-[#1A1A1A] text-[#F5F2ED]'
                            : 'hover:bg-[#F5F2ED] text-[#1A1A1A]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {f.poster_url ? (
                            <img
                              src={f.poster_url}
                              alt={f.title}
                              className="w-7 h-10 object-cover border border-[#1A1A1A]/20 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-10 bg-[#1A1A1A]/10 flex items-center justify-center flex-shrink-0">
                              <Film size={12} className="opacity-40" />
                            </div>
                          )}
                          <div className="truncate">
                            <strong className="font-bold text-xs">{f.title}</strong>{' '}
                            <span className={isSelected ? 'text-[#F5F2ED]/70' : 'text-[#1A1A1A]/60'}>
                              ({f.year}) · Dir. {dir} {f.country ? `· ${f.country}` : ''}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-mono uppercase bg-[#D4AF37] text-[#1A1A1A] font-bold px-2 py-0.5 flex-shrink-0 ml-2">
                            SELECIONADO
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {editing.film_id && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-sans text-[#1A1A1A]/80">
                    Filme ativo: <strong className="font-bold">{editing.movieTitle}</strong> ({editing.year})
                  </span>
                  <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                    Para trocar, selecione outro filme na lista acima
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Editorial & Review Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Título Editorial da Crítica *
              </label>
              <input
                type="text"
                required
                value={editing.editorialTitle}
                onChange={(e) => {
                  setEditing({ ...editing, editorialTitle: e.target.value });
                  setIsUnsaved(true);
                }}
                placeholder="Ex: Onde a Verdade Legal se Choca com o Matrimônio"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Nome do Filme *
              </label>
              <input
                type="text"
                required
                value={editing.movieTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditing({
                    ...editing,
                    movieTitle: val,
                    slug: editing.slug || slugifyCritica(`${val}-critica`),
                  });
                  setIsUnsaved(true);
                }}
                placeholder="Ex: Anatomia de uma Queda"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Slug (URL Amigável) *
              </label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) => {
                  setEditing({ ...editing, slug: e.target.value });
                  setIsUnsaved(true);
                }}
                placeholder="anatomia-de-uma-queda-critica"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Direção do Filme
              </label>
              <input
                type="text"
                value={editing.director}
                onChange={(e) => {
                  setEditing({ ...editing, director: e.target.value });
                  setIsUnsaved(true);
                }}
                placeholder="Ex: Justine Triet"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Ano</label>
                <input
                  type="number"
                  value={editing.year}
                  onChange={(e) => {
                    setEditing({ ...editing, year: parseInt(e.target.value) || 2026 });
                    setIsUnsaved(true);
                  }}
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">País</label>
                <input
                  type="text"
                  value={editing.country}
                  onChange={(e) => {
                    setEditing({ ...editing, country: e.target.value });
                    setIsUnsaved(true);
                  }}
                  placeholder="Ex: França"
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Duração (min)</label>
                <input
                  type="number"
                  value={editing.durationMinutes}
                  onChange={(e) => {
                    setEditing({ ...editing, durationMinutes: parseInt(e.target.value) || 120 });
                    setIsUnsaved(true);
                  }}
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
                />
              </div>
              <div>
                <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Gênero</label>
                <input
                  type="text"
                  value={editing.genre}
                  onChange={(e) => {
                    const val = e.target.value;
                    const splitted = val.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
                    setEditing({ ...editing, genre: val, genres: splitted });
                    setIsUnsaved(true);
                  }}
                  placeholder="Ex: Drama, Suspense"
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A]"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Avaliação em Estrelas (0.5 a 5.0) *
              </label>
              <StarRatingPicker
                value={editing.starRating}
                onChange={(val) => {
                  setEditing({ ...editing, starRating: val });
                  setIsUnsaved(true);
                }}
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem de Capa / Fotograma da Crítica"
                value={editing.coverImage}
                onChange={(url) => {
                  setEditing({ ...editing, coverImage: url });
                  setIsUnsaved(true);
                }}
                required
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[#1A1A1A]/80 font-bold uppercase">
                Texto Completo da Crítica *
              </label>
              <div className="border border-[#1A1A1A]/15 bg-white">
                <RichTextToolbar
                  textareaRef={textareaRef}
                  content={editing.content}
                  onChange={(val) => {
                    setEditing({ ...editing, content: val });
                    setIsUnsaved(true);
                  }}
                />
                <textarea
                  ref={textareaRef}
                  rows={14}
                  required
                  value={editing.content}
                  onChange={(e) => {
                    setEditing({ ...editing, content: e.target.value });
                    setIsUnsaved(true);
                  }}
                  placeholder="Escreva o ensaio crítico sobre o filme..."
                  className="w-full p-4 text-sm font-serif-body text-[#1A1A1A] bg-white focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <TagInput
                tags={editing.tags || []}
                onChange={(newTags) => {
                  setEditing({ ...editing, tags: newTags });
                  setIsUnsaved(true);
                }}
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Data de Publicação</label>
              <input
                type="date"
                value={editing.date}
                onChange={(e) => {
                  setEditing({ ...editing, date: e.target.value });
                  setIsUnsaved(true);
                }}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Status Editorial</label>
              <select
                value={editing.status}
                onChange={(e) => {
                  setEditing({ ...editing, status: e.target.value as ContentStatus });
                  setIsUnsaved(true);
                }}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
              >
                <option value="published">Publicado (Visível no site)</option>
                <option value="draft">Rascunho (Apenas CMS)</option>
                <option value="scheduled">Agendado (Publica automaticamente na data)</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            <div className="md:col-span-2 pt-3 border-t border-[#1A1A1A]/10 space-y-3">
              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  Classificação Editorial da Obra
                </label>
                <p className="text-[11px] font-sans text-[#1A1A1A]/60 mb-3">
                  Escolha se a obra deve ser tratada como lançamento em cartaz ou como artigo do arquivo:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing({ ...editing, isNewRelease: false });
                      setIsUnsaved(true);
                    }}
                    className={`p-3 text-left border transition-all ${
                      !editing.isNewRelease
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] shadow-sm'
                        : 'border-[#1A1A1A]/20 bg-[#F5F2ED]/50 text-[#1A1A1A] hover:border-[#1A1A1A]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans font-bold text-xs uppercase tracking-wider">
                        Filme do Arquivo / Clássico
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 ${
                          !editing.isNewRelease
                            ? 'bg-[#F5F2ED]/20 text-[#F5F2ED]'
                            : 'bg-[#1A1A1A]/10 text-[#1A1A1A]'
                        }`}
                      >
                        PADRÃO
                      </span>
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed ${
                        !editing.isNewRelease ? 'text-[#F5F2ED]/80' : 'text-[#1A1A1A]/60'
                      }`}
                    >
                      Crítica de catálogo, retrospectiva ou filme de anos anteriores. Não recebe o selo de lançamento.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing({ ...editing, isNewRelease: true });
                      setIsUnsaved(true);
                    }}
                    className={`p-3 text-left border transition-all ${
                      editing.isNewRelease
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#F5F2ED] shadow-sm'
                        : 'border-[#1A1A1A]/20 bg-[#F5F2ED]/50 text-[#1A1A1A] hover:border-[#1A1A1A]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-400" />
                        Lançamento Recente
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 ${
                          editing.isNewRelease
                            ? 'bg-amber-400 text-[#1A1A1A] font-bold'
                            : 'bg-[#1A1A1A]/10 text-[#1A1A1A]'
                        }`}
                      >
                        DESTAQUE
                      </span>
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed ${
                        editing.isNewRelease ? 'text-[#F5F2ED]/80' : 'text-[#1A1A1A]/60'
                      }`}
                    >
                      Estreia recente em cinema/streaming. Exibe o selo LANÇAMENTO e alimenta a aba de Lançamentos.
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-sans font-bold text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={editing.highlightHome}
                    onChange={(e) => {
                      setEditing({ ...editing, highlightHome: e.target.checked });
                      setIsUnsaved(true);
                    }}
                    className="w-4 h-4 accent-[#1A1A1A]"
                  />
                  <span>Destacar também no Hero Rotativo da Home Principal</span>
                </label>
              </div>
            </div>

            {/* SEO Fields */}
            <div className="md:col-span-2 pt-3 border-t border-[#1A1A1A]/10 space-y-3">
              <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                Otimização para Mecanismos de Busca (SEO)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#1A1A1A]/70 mb-1 font-semibold uppercase">
                    Título SEO (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editing.seoTitle || ''}
                    onChange={(e) => {
                      setEditing({ ...editing, seoTitle: e.target.value });
                      setIsUnsaved(true);
                    }}
                    placeholder="Título para o Google / Redes Sociais"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-sans text-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#1A1A1A]/70 mb-1 font-semibold uppercase">
                    Descrição SEO (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editing.seoDescription || ''}
                    onChange={(e) => {
                      setEditing({ ...editing, seoDescription: e.target.value });
                      setIsUnsaved(true);
                    }}
                    placeholder="Resumo sucinto para meta tags"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-sans text-[#1A1A1A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (isUnsaved && !confirm('Descartar alterações?')) return;
                setEditing(null);
              }}
              className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase hover:bg-[#1A1A1A]/5 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Crítica</span>
                </>
              )}
            </button>
          </div>
        </form>

        {previewItem && (
          <ArticlePreviewModal
            item={previewItem}
            itemType="critica"
            onClose={() => setPreviewItem(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1A1A]/15 pb-4">
        <div>
          <h2 className="font-serif-display text-2xl text-[#1A1A1A]">
            Gestão de Críticas Cinematográficas
          </h2>
          <p className="text-xs font-sans text-[#1A1A1A]/60 mt-0.5">
            Gerenciamento de críticas conectado diretamente ao banco de dados Supabase.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#1A1A1A]/80 transition-colors shadow-sm"
        >
          <Plus size={14} /> Nova Crítica
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-sans flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <strong>Erro:</strong> {errorMessage}
          </div>
          <button
            onClick={loadData}
            className="text-xs underline font-bold hover:text-red-900"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white border border-[#1A1A1A]/15 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-2.5 text-[#1A1A1A]/40" />
          <input
            type="text"
            placeholder="Pesquisar por filme, título editorial, diretor..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 pl-9 pr-3 py-1.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2.5 py-1.5 font-mono text-xs"
          >
            <option value="todos">Todos os Status</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="scheduled">Agendados</option>
            <option value="archived">Arquivados</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2.5 py-1.5 font-mono text-xs"
          >
            <option value="todos">Todas as Classificações</option>
            <option value="lancamentos">Apenas Lançamentos</option>
            <option value="arquivo">Apenas Arquivo / Clássicos</option>
          </select>

          <span className="text-xs font-mono text-[#1A1A1A]/60 ml-2">
            Total: {filteredCriticas.length}
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-[#1A1A1A]/15 space-y-3">
          <Loader2 size={24} className="animate-spin text-[#D4AF37] mx-auto" />
          <p className="text-xs font-sans uppercase tracking-widest text-[#1A1A1A]/60">
            Carregando críticas do Supabase...
          </p>
        </div>
      ) : filteredCriticas.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#1A1A1A]/15 space-y-3">
          <p className="text-sm font-serif-body text-[#1A1A1A]/70">
            {tableSearch || statusFilter !== 'todos' || typeFilter !== 'todos'
              ? 'Nenhuma crítica encontrada com os filtros selecionados.'
              : 'Nenhuma crítica cadastrada no acervo.'}
          </p>
          <button
            onClick={handleCreateNew}
            className="text-xs font-sans font-bold uppercase tracking-wider px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
          >
            Criar Primeira Crítica
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
            <thead>
              <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60 bg-[#F5F2ED]/60">
                <th className="py-3 px-4">Filme & Título Editorial</th>
                <th className="py-3 px-4">Direção & Ano</th>
                <th className="py-3 px-4">Gênero</th>
                <th className="py-3 px-4">Estrelas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tipo / Selo</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {filteredCriticas.map((raw) => {
                const mapped = mapSupabaseCriticaToCritica(raw);
                return (
                  <tr key={raw.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#1A1A1A] max-w-xs">
                      <div className="flex items-center gap-2.5">
                        {mapped.coverImage ? (
                          <img
                            src={mapped.coverImage}
                            alt={mapped.movieTitle}
                            className="w-8 h-11 object-cover border border-[#1A1A1A]/15 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-11 bg-[#1A1A1A]/5 flex items-center justify-center flex-shrink-0">
                            <Film size={14} className="opacity-30" />
                          </div>
                        )}
                        <div className="truncate">
                          <strong className="text-xs font-bold block truncate">
                            {mapped.movieTitle}
                          </strong>
                          <span className="text-[11px] text-[#1A1A1A]/70 italic truncate block">
                            &ldquo;{raw.editorial_title}&rdquo;
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#1A1A1A]/70">
                      <div>{mapped.director}</div>
                      <div className="text-[10px] font-mono text-[#1A1A1A]/50">
                        {mapped.year} · {mapped.country}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#1A1A1A]/80 font-mono text-[11px] uppercase">
                      {mapped.genre || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#1A1A1A]">
                      ★ {Number(raw.star_rating).toFixed(1)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] uppercase">
                      {raw.status === 'published' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">
                          PUBLICADO
                        </span>
                      )}
                      {raw.status === 'draft' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">
                          RASCUNHO
                        </span>
                      )}
                      {raw.status === 'scheduled' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">
                          AGENDADO
                        </span>
                      )}
                      {raw.status === 'archived' && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">
                          ARQUIVADO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {raw.is_new_release ? (
                        <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5">
                          ★ LANÇAMENTO
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#1A1A1A]/50 bg-[#1A1A1A]/5 px-1.5 py-0.5">
                          ARQUIVO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(mapped)}
                          className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                          title="Pré-visualizar"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(raw)}
                          className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: raw.id,
                              title: mapped.movieTitle,
                            })
                          }
                          className="p-1.5 hover:bg-red-50 text-red-600"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <ArticlePreviewModal
          item={previewItem}
          itemType="critica"
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Crítica Cinematográfica"
          message={`Tem certeza de que deseja excluir permanentemente a crítica do filme "${deleteTarget.title}" do Supabase? Esta ação não pode ser desfeita.`}
          confirmLabel={saving ? "Excluindo..." : "Excluir Crítica"}
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
