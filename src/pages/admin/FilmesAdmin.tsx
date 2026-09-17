import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  Film,
  Clapperboard,
  X,
  Search,
  Check,
  UserPlus,
  Globe,
  Tag,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  fetchFilmes,
  fetchFilmeById,
  createFilme,
  updateFilme,
  deleteFilme,
  SupabaseFilme,
  SupabaseFilmCredit,
  FilmCreditInput,
  slugifyFilm,
} from '../../services/repositories/filmesRepository';
import {
  fetchGeneros,
  createGenero,
  SupabaseGenero,
} from '../../services/repositories/generosRepository';
import {
  fetchCountries,
  createCountry,
  SupabaseCountry,
} from '../../services/repositories/countriesRepository';
import {
  fetchPessoas,
  createPessoa,
  SupabasePessoa,
} from '../../services/repositories/pessoasRepository';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { TmdbMovieImportModal } from '../../components/admin/TmdbMovieImportModal';
import { ContentStatus } from '../../types';
import { getEffectiveEditorialStatus } from '../../utils/statusUtils';

interface FilmesAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

const DEPARTMENTS = [
  'Direção',
  'Elenco',
  'Roteiro',
  'Fotografia',
  'Montagem',
  'Música',
  'Produção',
  'Direção de Arte',
  'Figurino',
  'Som',
  'Outro',
];

interface FormState {
  id?: string;
  title: string;
  original_title: string;
  slug: string;
  year: number;
  country: string;
  duration_minutes: number | '';
  poster_url: string;
  backdrop_url: string;
  synopsis: string;
  editorial_rating: number | '';
  status: ContentStatus;
  published_at: string;
  scheduled_at: string;
  tmdb_id?: number | null;
  tmdb_synced_at?: string | null;
  original_language?: string | null;
  imdb_id?: string | null;
  selectedGeneroIds: string[];
  selectedCountryIds: string[];
  credits: {
    tempId: string;
    person_id: string | null;
    personName: string;
    personSlug?: string;
    personPhoto?: string | null;
    fallback_person_name: string | null;
    department: string;
    role: string;
    character_name: string;
  }[];
}

export const FilmesAdmin: React.FC<FilmesAdminProps> = ({ onNotify, autoCreate = false }) => {
  // Data lists
  const [filmes, setFilmes] = useState<SupabaseFilme[]>([]);
  const [generos, setGeneros] = useState<SupabaseGenero[]>([]);
  const [countries, setCountries] = useState<SupabaseCountry[]>([]);
  const [pessoas, setPessoas] = useState<SupabasePessoa[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [showTmdbModal, setShowTmdbModal] = useState(false);

  // New genre inline creation
  const [isAddingGenero, setIsAddingGenero] = useState(false);
  const [newGeneroName, setNewGeneroName] = useState('');

  // New country inline creation
  const [isAddingCountry, setIsAddingCountry] = useState(false);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryFlag, setNewCountryFlag] = useState('');
  const [isSavingCountry, setIsSavingCountry] = useState(false);

  // Credit inputs in form
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<SupabasePessoa | null>(null);
  const [creditDept, setCreditDept] = useState<string>('Direção');
  const [creditRole, setCreditRole] = useState<string>('Diretor');
  const [creditCharacter, setCreditCharacter] = useState<string>('');
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);

  // Quick New Person Modal
  const [showQuickPersonModal, setShowQuickPersonModal] = useState(false);
  const [quickPersonName, setQuickPersonName] = useState('');
  const [quickPersonCountryId, setQuickPersonCountryId] = useState('');
  const [quickPersonRole, setQuickPersonRole] = useState('');
  const [quickPersonSaving, setQuickPersonSaving] = useState(false);

  // Initial data loading
  const loadAllData = useCallback(async () => {
    setLoading(true);
    const [filmsRes, genRes, countryRes, pesRes] = await Promise.all([
      fetchFilmes(),
      fetchGeneros(),
      fetchCountries(),
      fetchPessoas({ allStatuses: true }),
    ]);

    if (filmsRes.data) setFilmes(filmsRes.data);
    if (genRes.data) setGeneros(genRes.data);
    if (countryRes.data) setCountries(countryRes.data);
    if (pesRes.data) setPessoas(pesRes.data);

    if (filmsRes.error) {
      onNotify(`Aviso ao carregar filmes: ${filmsRes.error.message}`);
    }

    setLoading(false);
  }, [onNotify]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (autoCreate && !editing && !loading) {
      handleCreateNew();
    }
  }, [autoCreate, loading]);

  const handleCreateNew = () => {
    const dramaGen = generos.find((g) => g.slug === 'drama' || g.name.toLowerCase() === 'drama');
    setEditing({
      title: '',
      original_title: '',
      slug: '',
      year: new Date().getFullYear(),
      country: '',
      duration_minutes: '',
      poster_url: '',
      backdrop_url: '',
      synopsis: '',
      editorial_rating: '',
      status: 'published',
      published_at: new Date().toISOString().slice(0, 16),
      scheduled_at: '',
      tmdb_id: null,
      tmdb_synced_at: null,
      original_language: null,
      imdb_id: null,
      selectedGeneroIds: dramaGen ? [dramaGen.id] : [],
      selectedCountryIds: [],
      credits: [],
    });
    setPersonSearch('');
    setSelectedPerson(null);
    setCreditDept('Direção');
    setCreditRole('Diretor');
    setCreditCharacter('');
  };

  const handleEditFilm = (film: SupabaseFilme) => {
    setEditing({
      id: film.id,
      title: film.title,
      original_title: film.original_title || '',
      slug: film.slug,
      year: film.year,
      country: film.country || '',
      duration_minutes: film.duration_minutes ?? '',
      poster_url: film.poster_url || '',
      backdrop_url: film.backdrop_url || '',
      synopsis: film.synopsis || '',
      editorial_rating: film.editorial_rating ?? '',
      status: film.status,
      published_at: film.published_at ? new Date(film.published_at).toISOString().slice(0, 16) : '',
      scheduled_at: film.scheduled_at ? new Date(film.scheduled_at).toISOString().slice(0, 16) : '',
      tmdb_id: film.tmdb_id ?? null,
      tmdb_synced_at: film.tmdb_synced_at ?? null,
      original_language: film.original_language ?? null,
      imdb_id: film.imdb_id ?? null,
      selectedGeneroIds: film.generos?.map((g) => g.id) || [],
      selectedCountryIds: film.countries?.map((c) => c.id) || [],
      credits: (film.credits || []).map((c) => ({
        tempId: c.id,
        person_id: c.person_id,
        personName: c.person?.name || c.fallback_person_name || 'Desconhecido',
        personSlug: c.person?.slug,
        personPhoto: c.person?.photo_url,
        fallback_person_name: c.fallback_person_name,
        department: c.department,
        role: c.role || c.department,
        character_name: c.character_name || '',
      })),
    });
    setPersonSearch('');
    setSelectedPerson(null);
    setCreditDept('Direção');
    setCreditRole('Diretor');
    setCreditCharacter('');
  };

  const handleImportSuccess = async (importedFilmId: string) => {
    await loadAllData();
    const { data: film } = await fetchFilmeById(importedFilmId);
    if (film) {
      handleEditFilm(film);
    }
  };

  // Genre helpers
  const toggleGenero = (gId: string) => {
    if (!editing) return;
    const exists = editing.selectedGeneroIds.includes(gId);
    setEditing({
      ...editing,
      selectedGeneroIds: exists
        ? editing.selectedGeneroIds.filter((id) => id !== gId)
        : [...editing.selectedGeneroIds, gId],
    });
  };

  const handleCreateGeneroInline = async () => {
    if (!newGeneroName.trim()) return;
    const { data, error } = await createGenero(newGeneroName.trim());
    if (error) {
      onNotify(`Erro ao criar gênero: ${error.message}`);
      return;
    }
    if (data) {
      setGeneros((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      if (editing) {
        setEditing({
          ...editing,
          selectedGeneroIds: [...editing.selectedGeneroIds, data.id],
        });
      }
      setNewGeneroName('');
      setIsAddingGenero(false);
      onNotify(`Gênero "${data.name}" cadastrado e selecionado!`);
    }
  };

  const handleCreateCountryInline = async () => {
    const trimmedName = newCountryName.trim();
    if (!trimmedName) {
      onNotify('O nome do país é obrigatório.');
      return;
    }
    if (isSavingCountry) return;

    setIsSavingCountry(true);
    const { data, error } = await createCountry({
      name: trimmedName,
      flag_url: newCountryFlag.trim() || null,
    });
    setIsSavingCountry(false);

    if (error) {
      onNotify(`Erro ao criar país: ${error.message}`);
      return;
    }
    if (data) {
      setCountries((prev) => {
        const updated = prev.filter((c) => c.id !== data.id);
        return [...updated, data].sort((a, b) => a.name.localeCompare(b.name));
      });
      if (editing) {
        setEditing({
          ...editing,
          selectedCountryIds: [...editing.selectedCountryIds, data.id],
        });
      }
      setNewCountryName('');
      setNewCountryFlag('');
      setIsAddingCountry(false);
      onNotify(`País "${data.name}" cadastrado e selecionado!`);
    }
  };

  // Country helpers
  const toggleCountry = (cId: string) => {
    if (!editing) return;
    const exists = editing.selectedCountryIds.includes(cId);
    setEditing({
      ...editing,
      selectedCountryIds: exists
        ? editing.selectedCountryIds.filter((id) => id !== cId)
        : [...editing.selectedCountryIds, cId],
    });
  };

  // Credits helpers
  const filteredPessoas = useMemo(() => {
    if (!personSearch.trim()) return pessoas.slice(0, 8);
    const term = personSearch.toLowerCase().trim();
    return pessoas.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 10);
  }, [pessoas, personSearch]);

  const handleSelectPerson = (p: SupabasePessoa) => {
    setSelectedPerson(p);
    setPersonSearch(p.name);
    setIsPersonDropdownOpen(false);
    // If they have primary roles, suggest default role
    if (p.primary_roles && p.primary_roles.length > 0) {
      const firstRole = p.primary_roles[0].toLowerCase();
      if (firstRole.includes('ator') || firstRole.includes('atriz')) {
        setCreditDept('Elenco');
        setCreditRole('Ator');
      } else if (firstRole.includes('dire')) {
        setCreditDept('Direção');
        setCreditRole('Diretor');
      } else if (firstRole.includes('roteir')) {
        setCreditDept('Roteiro');
        setCreditRole('Roteirista');
      } else if (firstRole.includes('foto')) {
        setCreditDept('Fotografia');
        setCreditRole('Diretor de Fotografia');
      }
    }
  };

  const handleDepartmentChange = (dept: string) => {
    setCreditDept(dept);
    if (dept === 'Direção') setCreditRole('Diretor');
    else if (dept === 'Elenco') setCreditRole('Ator');
    else if (dept === 'Roteiro') setCreditRole('Roteirista');
    else if (dept === 'Fotografia') setCreditRole('Diretor de Fotografia');
    else if (dept === 'Montagem') setCreditRole('Montador');
    else if (dept === 'Música') setCreditRole('Compositor / Trilha Sonora');
    else if (dept === 'Produção') setCreditRole('Produtor');
    else if (dept === 'Direção de Arte') setCreditRole('Diretor de Arte');
    else if (dept === 'Figurino') setCreditRole('Figurinista');
    else if (dept === 'Som') setCreditRole('Desenho de Som');
    else setCreditRole(dept);
  };

  const handleAddCredit = () => {
    if (!editing) return;
    const name = selectedPerson ? selectedPerson.name : personSearch.trim();
    if (!name) {
      onNotify('Por favor, informe ou selecione o nome da pessoa.');
      return;
    }

    const newCreditItem = {
      tempId: `crd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      person_id: selectedPerson ? selectedPerson.id : null,
      personName: name,
      personSlug: selectedPerson?.slug,
      personPhoto: selectedPerson?.photo_url,
      fallback_person_name: selectedPerson ? null : name,
      department: creditDept,
      role: creditRole.trim() || creditDept,
      character_name: creditDept === 'Elenco' ? creditCharacter.trim() : '',
    };

    setEditing({
      ...editing,
      credits: [...editing.credits, newCreditItem],
    });

    // Reset credit inputs
    setSelectedPerson(null);
    setPersonSearch('');
    setCreditCharacter('');
    if (creditDept === 'Elenco') {
      setCreditRole('Ator');
    }
  };

  const handleRemoveCredit = (tempId: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      credits: editing.credits.filter((c) => c.tempId !== tempId),
    });
  };

  const handleMoveCredit = (index: number, direction: 'up' | 'down') => {
    if (!editing) return;
    const newCredits = [...editing.credits];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newCredits.length) return;
    const temp = newCredits[index];
    newCredits[index] = newCredits[targetIdx];
    newCredits[targetIdx] = temp;
    setEditing({ ...editing, credits: newCredits });
  };

  // Quick Create Person Action
  const handleQuickCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPersonName.trim()) {
      onNotify('O nome da pessoa é obrigatório.');
      return;
    }
    setQuickPersonSaving(true);
    const { data: newPessoa, error } = await createPessoa({
      name: quickPersonName.trim(),
      country_id: quickPersonCountryId || null,
      primary_roles: quickPersonRole.trim() ? [quickPersonRole.trim()] : ['Cineasta'],
      status: 'published',
    });

    setQuickPersonSaving(false);
    if (error || !newPessoa) {
      onNotify(`Erro ao criar pessoa: ${error?.message || 'Falha desconhecida'}`);
      return;
    }

    // Add to local state and auto-select
    setPessoas((prev) => [newPessoa, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    handleSelectPerson(newPessoa);
    setShowQuickPersonModal(false);
    setQuickPersonName('');
    setQuickPersonCountryId('');
    setQuickPersonRole('');
    onNotify(`Pessoa "${newPessoa.name}" cadastrada no Supabase e selecionada!`);
  };

  // Submit Film Form
  const handleSubmitFilm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const title = editing.title.trim();
    if (!title) {
      onNotify('Atenção: O título do filme é obrigatório.');
      return;
    }

    if (!editing.year || Number(editing.year) < 1888) {
      onNotify('Atenção: Informe um ano de lançamento válido (a partir de 1888).');
      return;
    }

    setSaving(true);

    // Build country text fallback
    const selectedCountriesNames = countries
      .filter((c) => editing.selectedCountryIds.includes(c.id))
      .map((c) => c.name);
    const countryFallback = selectedCountriesNames.length > 0
      ? selectedCountriesNames.join(', ')
      : editing.country.trim() || 'Internacional';

    // Build credits payload
    const creditsPayload: FilmCreditInput[] = editing.credits.map((c, index) => ({
      person_id: c.person_id,
      fallback_person_name: c.fallback_person_name,
      department: c.department,
      role: c.role || c.department,
      character_name: c.character_name || null,
      order_index: index,
    }));

    // Find legacy director name for backward compatibility
    const directorCredit = editing.credits.find((c) => c.department === 'Direção');
    const legacyDirector = directorCredit ? directorCredit.personName : null;

    if (editing.id) {
      // UPDATE
      const { data: updated, error } = await updateFilme(editing.id, {
        title,
        original_title: editing.original_title.trim() || null,
        slug: editing.slug.trim() ? slugifyFilm(editing.slug) : slugifyFilm(title),
        year: Number(editing.year),
        country: countryFallback,
        duration_minutes: editing.duration_minutes !== '' ? Number(editing.duration_minutes) : null,
        poster_url: editing.poster_url.trim() || null,
        backdrop_url: editing.backdrop_url.trim() || null,
        synopsis: editing.synopsis.trim() || null,
        editorial_rating: editing.editorial_rating !== '' ? Number(editing.editorial_rating) : null,
        status: editing.status,
        published_at: editing.published_at ? new Date(editing.published_at).toISOString() : new Date().toISOString(),
        scheduled_at: editing.status === 'scheduled' && editing.scheduled_at ? new Date(editing.scheduled_at).toISOString() : null,
        legacy_director_name: legacyDirector,
        genero_ids: editing.selectedGeneroIds,
        country_ids: editing.selectedCountryIds,
        credits: creditsPayload,
      });

      setSaving(false);
      if (error || !updated) {
        onNotify(`Erro ao atualizar filme: ${error?.message || 'Falha desconhecida'}`);
        return;
      }

      setFilmes((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setEditing(null);
      onNotify(`Filme "${updated.title}" atualizado com sucesso no Supabase!`);
    } else {
      // CREATE
      const { data: created, error } = await createFilme({
        title,
        original_title: editing.original_title.trim() || null,
        slug: editing.slug.trim() ? slugifyFilm(editing.slug) : slugifyFilm(title),
        year: Number(editing.year),
        country: countryFallback,
        duration_minutes: editing.duration_minutes !== '' ? Number(editing.duration_minutes) : null,
        poster_url: editing.poster_url.trim() || null,
        backdrop_url: editing.backdrop_url.trim() || null,
        synopsis: editing.synopsis.trim() || null,
        editorial_rating: editing.editorial_rating !== '' ? Number(editing.editorial_rating) : null,
        status: editing.status,
        published_at: editing.published_at ? new Date(editing.published_at).toISOString() : new Date().toISOString(),
        scheduled_at: editing.status === 'scheduled' && editing.scheduled_at ? new Date(editing.scheduled_at).toISOString() : null,
        legacy_director_name: legacyDirector,
        genero_ids: editing.selectedGeneroIds,
        country_ids: editing.selectedCountryIds,
        credits: creditsPayload,
      });

      setSaving(false);
      if (error || !created) {
        onNotify(`Erro ao cadastrar filme: ${error?.message || 'Falha desconhecida'}`);
        return;
      }

      setFilmes((prev) => [created, ...prev]);
      setEditing(null);
      onNotify(`Filme "${created.title}" registrado no catálogo do Supabase!`);
    }
  };

  // Delete Action
  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    const { success, error } = await deleteFilme(deleteTarget.id);
    if (error || !success) {
      onNotify(`Erro ao excluir filme: ${error?.message || 'Falha ao remover'}`);
      return;
    }
    setFilmes((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    onNotify(`Filme "${deleteTarget.title}" removido com sucesso.`);
    setDeleteTarget(null);
  };

  // Filtered film list
  const displayedFilmes = useMemo(() => {
    return filmes.filter((f) => {
      if (statusFilter !== 'all' && getEffectiveEditorialStatus(f) !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchTitle = f.title.toLowerCase().includes(term);
        const matchOrig = f.original_title?.toLowerCase().includes(term);
        const matchSlug = f.slug.toLowerCase().includes(term);
        const matchDirector = f.legacy_director_name?.toLowerCase().includes(term);
        const matchYear = String(f.year).includes(term);
        return matchTitle || matchOrig || matchSlug || matchDirector || matchYear;
      }
      return true;
    });
  }, [filmes, statusFilter, searchTerm]);

  // Render Form if editing
  if (editing) {
    return (
      <div className="space-y-6">
        {/* Form Header */}
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="p-1.5 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors"
              title="Voltar ao catálogo"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="font-serif-display text-2xl text-[#1A1A1A]">
                {editing.id ? 'Editar Ficha do Filme' : 'Registrar Novo Filme no Acervo'}
              </h2>
              <p className="text-xs font-serif-body text-[#1A1A1A]/70">
                Ficha cinematográfica canônica sincronizada no Supabase com relações de gênero, coprodução e créditos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase hover:bg-[#1A1A1A]/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitFilm}
              disabled={saving}
              className="px-6 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Salvando...' : 'Salvar Ficha do Filme'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitFilm} className="space-y-8">
          {/* Main Info Box */}
          <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A1A1A]/10 pb-2">
              <h3 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-2">
                <Film size={14} /> 1. Identificação Principal
              </h3>
              {editing.tmdb_id && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/40 text-[10px] font-mono uppercase font-bold tracking-wider">
                    <Sparkles size={11} className="text-[#D4AF37]" /> TMDB #{editing.tmdb_id}
                  </span>
                  {editing.imdb_id && (
                    <a
                      href={`https://www.imdb.com/title/${editing.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F2ED] text-[#1A1A1A]/80 border border-[#1A1A1A]/15 text-[10px] font-mono hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors"
                      title="Ver ficha no IMDb"
                    >
                      IMDb <ExternalLink size={10} />
                    </a>
                  )}
                  {editing.original_language && (
                    <span className="px-2 py-0.5 bg-[#F5F2ED] text-[#1A1A1A]/70 border border-[#1A1A1A]/15 text-[10px] font-mono uppercase">
                      Lang: {editing.original_language}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Title */}
              <div className="md:col-span-6">
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                  Título em Português / Exibição *
                </label>
                <input
                  type="text"
                  required
                  value={editing.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditing({
                      ...editing,
                      title: val,
                      slug: editing.id ? editing.slug : slugifyFilm(val),
                    });
                  }}
                  placeholder="Ex: Persona"
                  className="w-full bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 p-2.5 text-sm text-[#1A1A1A] font-serif-body focus:bg-white focus:border-[#1A1A1A] outline-none"
                />
              </div>

              {/* Original Title */}
              <div className="md:col-span-6">
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                  Título Original (caso diferente)
                </label>
                <input
                  type="text"
                  value={editing.original_title}
                  onChange={(e) => setEditing({ ...editing, original_title: e.target.value })}
                  placeholder="Ex: Persona (sueco)"
                  className="w-full bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 p-2.5 text-sm text-[#1A1A1A] font-serif-body italic focus:bg-white focus:border-[#1A1A1A] outline-none"
                />
              </div>

              {/* Slug */}
              <div className="md:col-span-5">
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                  Slug Canônico (URL) *
                </label>
                <div className="flex items-center">
                  <span className="bg-[#1A1A1A]/5 border border-r-0 border-[#1A1A1A]/20 px-2.5 py-2.5 text-xs text-[#1A1A1A]/60 font-mono">
                    /filmes/
                  </span>
                  <input
                    type="text"
                    required
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugifyFilm(e.target.value) })}
                    placeholder="persona"
                    className="w-full bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 p-2.5 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:border-[#1A1A1A] outline-none"
                  />
                </div>
              </div>

              {/* Year */}
              <div className="md:col-span-2">
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                  Ano de Lançamento *
                </label>
                <input
                  type="number"
                  required
                  min={1888}
                  max={2099}
                  value={editing.year}
                  onChange={(e) => setEditing({ ...editing, year: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 p-2.5 text-sm text-[#1A1A1A] font-mono focus:bg-white focus:border-[#1A1A1A] outline-none"
                />
              </div>

              {/* Duration */}
              <div className="md:col-span-2">
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1200}
                  value={editing.duration_minutes}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      duration_minutes: e.target.value ? parseInt(e.target.value) : '',
                    })
                  }
                  placeholder="Ex: 85"
                  className="w-full bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 p-2.5 text-sm text-[#1A1A1A] font-mono focus:bg-white focus:border-[#1A1A1A] outline-none"
                />
              </div>

              {/* Status */}
              <div className="md:col-span-3">
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                  Status Editorial
                </label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as ContentStatus })}
                  className="w-full bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 p-2.5 text-xs font-sans font-bold text-[#1A1A1A] focus:bg-white focus:border-[#1A1A1A] outline-none"
                >
                  <option value="published">Publicado (Disponível no Acervo)</option>
                  <option value="draft">Rascunho (Privado)</option>
                  <option value="scheduled">Agendado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              {/* Scheduled date if scheduled */}
              {editing.status === 'scheduled' && (
                <div className="md:col-span-6">
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                    Data e Hora do Agendamento (UTC)
                  </label>
                  <input
                    type="datetime-local"
                    value={editing.scheduled_at}
                    onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value })}
                    className="w-full bg-white border border-[#1A1A1A]/20 p-2.5 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Synopsis */}
            <div>
              <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A] mb-1">
                Sinopse / Argumento Crítico
              </label>
              <textarea
                rows={4}
                value={editing.synopsis}
                onChange={(e) => setEditing({ ...editing, synopsis: e.target.value })}
                placeholder="Breve sinopse dramática ou contextualização canônica da obra..."
                className="w-full bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 p-3 text-sm text-[#1A1A1A] font-serif-body focus:bg-white focus:border-[#1A1A1A] outline-none resize-y"
              />
            </div>
          </div>

          {/* Poster Upload Box */}
          <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37] border-b border-[#1A1A1A]/10 pb-2 flex items-center gap-2">
              <Film size={14} /> 2. Imagem / Pôster Vertical
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-8">
                <ImageUploader
                  label="Pôster Oficial do Filme (Armazenado na pasta films/ do Supabase Storage)"
                  value={editing.poster_url}
                  onChange={(url) => setEditing({ ...editing, poster_url: url })}
                  folder="films"
                />
              </div>
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#F5F2ED] border border-[#1A1A1A]/10">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/60 mb-2">
                  Pré-visualização do Pôster
                </span>
                {editing.poster_url ? (
                  <img
                    src={editing.poster_url}
                    alt="Pôster"
                    className="w-32 aspect-[2/3] object-cover shadow-md border border-[#1A1A1A]/20 bg-white"
                  />
                ) : (
                  <div className="w-32 aspect-[2/3] bg-white border border-dashed border-[#1A1A1A]/20 flex flex-col items-center justify-center text-[#1A1A1A]/40 text-xs gap-1">
                    <Film size={24} />
                    <span className="text-[10px]">Sem pôster</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Genres & Countries Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GÊNEROS (public.generos) */}
            <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                <h3 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-2">
                  <Tag size={14} /> Gêneros Cinematográficos
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingGenero(!isAddingGenero)}
                  className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] hover:text-[#D4AF37] flex items-center gap-1"
                >
                  <Plus size={12} /> {isAddingGenero ? 'Fechar' : 'Novo Gênero'}
                </button>
              </div>

              {/* Inline Create Genero */}
              {isAddingGenero && (
                <div className="p-3 bg-[#F5F2ED] border border-[#1A1A1A]/15 flex items-center gap-2">
                  <input
                    type="text"
                    value={newGeneroName}
                    onChange={(e) => setNewGeneroName(e.target.value)}
                    placeholder="Nome do gênero (Ex: Neorrealismo)"
                    className="flex-1 bg-white border border-[#1A1A1A]/20 px-2.5 py-1.5 text-xs text-[#1A1A1A]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateGeneroInline();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateGeneroInline}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-bold uppercase hover:bg-[#D4AF37] hover:text-[#1A1A1A]"
                  >
                    Salvar
                  </button>
                </div>
              )}

              <p className="text-[11px] font-serif-body text-[#1A1A1A]/60">
                Selecione os gêneros correspondentes à obra. Um filme pode possuir múltiplos gêneros sem duplicação:
              </p>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {generos.map((g) => {
                  const isSelected = editing.selectedGeneroIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGenero(g.id)}
                      className={`px-3 py-1 text-xs font-sans font-medium uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] shadow-xs'
                          : 'bg-[#F5F2ED]/60 text-[#1A1A1A]/80 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-[#D4AF37]" />}
                      <span>{g.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PAÍSES DE ORIGEM / COPRODUÇÃO (public.countries) */}
            <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-4">
              <div className="border-b border-[#1A1A1A]/10 pb-2 flex items-center justify-between">
                <h3 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-2">
                  <Globe size={14} /> Países de Produção / Coprodução
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#1A1A1A]/60">
                    {editing.selectedCountryIds.length} selecionado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCountry(!isAddingCountry)}
                    className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] hover:text-[#D4AF37] flex items-center gap-1"
                  >
                    <Plus size={12} /> {isAddingCountry ? 'Fechar' : 'Novo País'}
                  </button>
                </div>
              </div>

              {/* Inline Create Country */}
              {isAddingCountry && (
                <div className="p-3 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={newCountryName}
                      onChange={(e) => setNewCountryName(e.target.value)}
                      placeholder="Nome do país (Ex: Argentina)"
                      className="sm:col-span-6 bg-white border border-[#1A1A1A]/20 px-2.5 py-1.5 text-xs text-[#1A1A1A]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCountryInline();
                        }
                      }}
                    />
                    <input
                      type="text"
                      value={newCountryFlag}
                      onChange={(e) => setNewCountryFlag(e.target.value)}
                      placeholder="URL da bandeira (opcional)"
                      className="sm:col-span-4 bg-white border border-[#1A1A1A]/20 px-2.5 py-1.5 text-xs text-[#1A1A1A] font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCountryInline();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSavingCountry}
                      onClick={handleCreateCountryInline}
                      className="sm:col-span-2 px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-bold uppercase hover:bg-[#D4AF37] hover:text-[#1A1A1A] disabled:opacity-50"
                    >
                      {isSavingCountry ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] font-serif-body text-[#1A1A1A]/60">
                Selecione os países produtores do catálogo oficial. Permite coproduções (ex: França + Alemanha + Itália):
              </p>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {countries.map((c) => {
                  const isSelected = editing.selectedCountryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCountry(c.id)}
                      className={`px-2.5 py-1 text-xs font-sans font-medium transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] shadow-xs'
                          : 'bg-[#F5F2ED]/60 text-[#1A1A1A]/80 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                      }`}
                    >
                      {c.flag_url ? (
                        <img src={c.flag_url} alt="" className="w-3.5 h-2.5 object-cover border border-white/20 shrink-0" />
                      ) : (
                        <span>🌐</span>
                      )}
                      <span>{c.name}</span>
                      {isSelected && <Check size={12} className="text-[#D4AF37]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CRÉDITOS E EQUIPE (public.pessoas & public.film_credits) */}
          <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
            <div className="border-b border-[#1A1A1A]/10 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-2">
                  <Users size={14} /> 3. Elenco & Equipe Técnica (Créditos Canônicos)
                </h3>
                <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-1">
                  Vincule profissionais já cadastrados em <span className="font-mono text-[#1A1A1A]">public.pessoas</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickPersonModal(true)}
                className="px-3 py-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/20 hover:border-[#1A1A1A] text-xs font-sans font-bold uppercase flex items-center gap-1 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors"
              >
                <UserPlus size={13} /> + Nova Pessoa
              </button>
            </div>

            {/* Credit Insertion Tool */}
            <div className="p-4 bg-[#F5F2ED]/70 border border-[#1A1A1A]/15 space-y-4">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 block">
                Adicionar Profissional à Ficha Técnica:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Department */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase text-[#1A1A1A]/70 mb-1">
                    Departamento
                  </label>
                  <select
                    value={creditDept}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/20 p-2 text-xs font-sans text-[#1A1A1A] focus:border-[#1A1A1A] outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Person Search / Autocomplete */}
                <div className="sm:col-span-4 relative">
                  <label className="block text-[10px] font-bold uppercase text-[#1A1A1A]/70 mb-1 flex items-center justify-between">
                    <span>Profissional *</span>
                    {selectedPerson && (
                      <span className="text-[9px] text-[#D4AF37] font-semibold">✓ Vinculado</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={personSearch}
                      onChange={(e) => {
                        setPersonSearch(e.target.value);
                        setSelectedPerson(null);
                        setIsPersonDropdownOpen(true);
                      }}
                      onFocus={() => setIsPersonDropdownOpen(true)}
                      placeholder="Pesquisar pessoa (ex: Christopher Nolan)..."
                      className="w-full bg-white border border-[#1A1A1A]/20 p-2 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] outline-none pr-8"
                    />
                    {personSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setPersonSearch('');
                          setSelectedPerson(null);
                        }}
                        className="absolute right-2 top-2.5 text-stone-400 hover:text-stone-700"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete dropdown */}
                  {isPersonDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#1A1A1A]/20 shadow-lg max-h-56 overflow-y-auto">
                      {filteredPessoas.length > 0 ? (
                        <div className="divide-y divide-[#1A1A1A]/5">
                          {filteredPessoas.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPerson(p)}
                              className="w-full p-2.5 text-left text-xs hover:bg-[#F5F2ED] flex items-center gap-2.5 transition-colors"
                            >
                              {p.photo_url ? (
                                <img
                                  src={p.photo_url}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover border border-[#1A1A1A]/20"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center font-bold text-[10px]">
                                  {p.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-[#1A1A1A] truncate">{p.name}</div>
                                <div className="text-[10px] text-[#1A1A1A]/60">
                                  {p.primary_roles?.join(', ') || 'Cineasta'}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-xs text-[#1A1A1A]/60 text-center space-y-2">
                          <p>Nenhuma pessoa encontrada com "{personSearch}".</p>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickPersonName(personSearch);
                              setShowQuickPersonModal(true);
                              setIsPersonDropdownOpen(false);
                            }}
                            className="px-2.5 py-1 bg-[#1A1A1A] text-[#F5F2ED] text-[11px] font-bold uppercase hover:bg-[#D4AF37] hover:text-[#1A1A1A]"
                          >
                            + Cadastrar "{personSearch}" agora
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Role / Function */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase text-[#1A1A1A]/70 mb-1">
                    {creditDept === 'Elenco' ? 'Personagem Interpretado' : 'Função Específica'}
                  </label>
                  {creditDept === 'Elenco' ? (
                    <input
                      type="text"
                      value={creditCharacter}
                      onChange={(e) => setCreditCharacter(e.target.value)}
                      placeholder="Ex: Elisabet Vogler / Alma"
                      className="w-full bg-white border border-[#1A1A1A]/20 p-2 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] outline-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={creditRole}
                      onChange={(e) => setCreditRole(e.target.value)}
                      placeholder="Ex: Diretor de Fotografia"
                      className="w-full bg-white border border-[#1A1A1A]/20 p-2 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] outline-none"
                    />
                  )}
                </div>

                {/* Add button */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddCredit}
                    disabled={!personSearch.trim()}
                    className="w-full py-2 bg-[#1A1A1A] disabled:bg-[#1A1A1A]/20 text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Added Credits Table / List */}
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 block">
                Créditos Registrados nesta Ficha ({editing.credits.length}):
              </span>

              {editing.credits.length === 0 ? (
                <div className="p-6 bg-[#F5F2ED]/40 border border-dashed border-[#1A1A1A]/20 text-center text-xs font-serif-body text-[#1A1A1A]/60">
                  Nenhum profissional adicionado ainda. Adicione pelo menos o Diretor e atores principais da obra.
                </div>
              ) : (
                <div className="border border-[#1A1A1A]/15 overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[#1A1A1A]/5 border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/70">
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">Ordem</th>
                        <th className="py-2 px-3">Departamento</th>
                        <th className="py-2 px-3">Profissional</th>
                        <th className="py-2 px-3">Função / Personagem</th>
                        <th className="py-2 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/10 bg-white">
                      {editing.credits.map((c, idx) => (
                        <tr key={c.tempId} className="hover:bg-[#F5F2ED]/50 transition-colors">
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveCredit(idx, 'up')}
                                className="text-stone-400 hover:text-stone-900 disabled:opacity-20"
                                title="Subir"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === editing.credits.length - 1}
                                onClick={() => handleMoveCredit(idx, 'down')}
                                className="text-stone-400 hover:text-stone-900 disabled:opacity-20"
                                title="Descer"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#D4AF37] uppercase text-[10px]">
                            {c.department}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {c.personPhoto ? (
                                <img
                                  src={c.personPhoto}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover border border-[#1A1A1A]/20"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[9px] font-bold">
                                  {c.personName.charAt(0)}
                                </div>
                              )}
                              <span className="font-bold text-[#1A1A1A]">{c.personName}</span>
                              {c.person_id ? (
                                <span className="text-[9px] font-mono px-1 bg-green-100 text-green-800 rounded">
                                  FK
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-1 bg-amber-100 text-amber-800 rounded">
                                  texto
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-serif-body text-[#1A1A1A]/80">
                            {c.department === 'Elenco' ? (
                              <span>como <strong className="font-serif-body italic">{c.character_name || 'Personagem não informado'}</strong></span>
                            ) : (
                              <span>{c.role}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCredit(c.tempId)}
                              className="p-1 text-red-600 hover:bg-red-50"
                              title="Remover crédito"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Form Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase hover:bg-[#1A1A1A]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Salvando no Supabase...' : 'Salvar Ficha do Filme'}</span>
            </button>
          </div>
        </form>

        {/* QUICK CREATE PERSON MODAL */}
        {showQuickPersonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-[#F5F2ED] border border-[#1A1A1A] max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-2">
                <h3 className="font-serif-display text-lg text-[#1A1A1A]">
                  Cadastrar Nova Pessoa no Banco
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickPersonModal(false)}
                  className="text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleQuickCreatePerson} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#1A1A1A] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickPersonName}
                    onChange={(e) => setQuickPersonName(e.target.value)}
                    placeholder="Ex: Liv Ullmann"
                    className="w-full bg-white border border-[#1A1A1A]/20 p-2.5 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#1A1A1A] mb-1">
                    País de Origem
                  </label>
                  <select
                    value={quickPersonCountryId}
                    onChange={(e) => setQuickPersonCountryId(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/20 p-2.5 text-xs text-[#1A1A1A]"
                  >
                    <option value="">-- Selecionar País --</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#1A1A1A] mb-1">
                    Atuação Principal (Função)
                  </label>
                  <input
                    type="text"
                    value={quickPersonRole}
                    onChange={(e) => setQuickPersonRole(e.target.value)}
                    placeholder="Ex: Atriz / Cineasta"
                    className="w-full bg-white border border-[#1A1A1A]/20 p-2.5 text-xs text-[#1A1A1A]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1A1A1A]/10">
                  <button
                    type="button"
                    onClick={() => setShowQuickPersonModal(false)}
                    className="px-3 py-1.5 border border-[#1A1A1A]/20 text-xs font-bold uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={quickPersonSaving}
                    className="px-4 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-bold uppercase hover:bg-[#D4AF37] hover:text-[#1A1A1A] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {quickPersonSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{quickPersonSaving ? 'Salvando...' : 'Cadastrar e Selecionar'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Table / List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-display text-2xl text-[#1A1A1A] flex items-center gap-2.5">
            <span>Catálogo Canônico de Filmes</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-[#1A1A1A]/10 text-[#1A1A1A] font-normal">
              {filmes.length}
            </span>
          </h2>
          <p className="text-xs font-serif-body text-[#1A1A1A]/70">
            Fichas cinematográficas centralizadas no Supabase com relações de gêneros, países de produção e créditos completos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTmdbModal(true)}
            className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors shadow-xs"
          >
            <Sparkles size={14} className="text-[#D4AF37]" /> Adicionar via TMDB
          </button>
          <button
            onClick={handleCreateNew}
            className="px-3 py-2 bg-white text-[#1A1A1A] border border-[#1A1A1A]/20 font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#1A1A1A]/5 transition-colors"
          >
            <Plus size={14} /> Novo Manual
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#1A1A1A]/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-3 text-[#1A1A1A]/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, diretor, ano..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F2ED]/50 border border-[#1A1A1A]/20 focus:bg-white focus:border-[#1A1A1A] outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 text-xs font-sans w-full sm:w-auto overflow-x-auto">
          {(['all', 'published', 'draft', 'scheduled', 'archived'] as const).map((st) => {
            const count =
              st === 'all'
                ? filmes.length
                : filmes.filter((f) => getEffectiveEditorialStatus(f) === st).length;
            const label =
              st === 'all'
                ? 'Todos'
                : st === 'published'
                ? 'Publicados'
                : st === 'draft'
                ? 'Rascunhos'
                : st === 'scheduled'
                ? 'Agendados'
                : 'Arquivados';

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                    : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Films Table */}
      {loading ? (
        <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-[#D4AF37] mx-auto" />
          <p className="text-xs font-sans uppercase tracking-wider text-[#1A1A1A]/60">
            Carregando catálogo de filmes do Supabase...
          </p>
        </div>
      ) : displayedFilmes.length === 0 ? (
        <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
          <Film size={32} className="text-[#1A1A1A]/30 mx-auto" />
          <h3 className="font-serif-display text-lg text-[#1A1A1A]">Nenhum filme encontrado</h3>
          <p className="text-xs font-serif-body text-[#1A1A1A]/60 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou o termo de busca.'
              : 'Clique em "+ Novo Filme" para começar a cadastrar o acervo.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
          <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
            <thead>
              <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5">
                <th className="py-3 px-4">Filme</th>
                <th className="py-3 px-4">Ano</th>
                <th className="py-3 px-4">Direção</th>
                <th className="py-3 px-4">Países</th>
                <th className="py-3 px-4">Gêneros</th>
                <th className="py-3 px-4">Créditos</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {displayedFilmes.map((f) => {
                const directorCredit = f.credits?.find((c) => c.department === 'Direção');
                const directorName = directorCredit
                  ? (directorCredit.person?.name || directorCredit.fallback_person_name)
                  : (f.legacy_director_name || '-');

                return (
                  <tr key={f.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1A1A1A]">
                      <div className="flex items-center gap-3">
                        {f.poster_url ? (
                          <img
                            src={f.poster_url}
                            alt={f.title}
                            className="w-8 aspect-[2/3] object-cover border border-[#1A1A1A]/20 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-8 aspect-[2/3] bg-[#1A1A1A]/10 flex items-center justify-center shrink-0">
                            <Film size={14} className="text-[#1A1A1A]/40" />
                          </div>
                        )}
                        <div>
                          <div className="font-serif-display text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                            <span>{f.title}</span>
                            {f.tmdb_id && (
                              <span className="inline-block px-1.5 py-0.2 bg-[#1A1A1A] text-[#D4AF37] text-[8px] font-mono uppercase font-bold tracking-wider">
                                TMDB #{f.tmdb_id}
                              </span>
                            )}
                          </div>
                          {f.original_title && f.original_title !== f.title && (
                            <div className="text-[10px] italic text-[#1A1A1A]/60 font-serif-body">
                              {f.original_title}
                            </div>
                          )}
                          <span className="text-[9px] font-mono text-[#1A1A1A]/40 block">
                            /filmes/{f.slug}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">{f.year}</td>
                    <td className="py-3 px-4 font-serif-body font-medium">{directorName}</td>
                    <td className="py-3 px-4">
                      {f.countries && f.countries.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {f.countries.map((c) => (
                            <span key={c.id} title={c.name} className="inline-block">
                              {c.flag_url ? (
                                <img src={c.flag_url} alt={c.name} className="w-4 h-3 object-cover border border-black/10" />
                              ) : (
                                <span className="text-[10px]">{c.name}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#1A1A1A]/60">{f.country || '-'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {f.generos && f.generos.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {f.generos.slice(0, 2).map((g) => (
                            <span
                              key={g.id}
                              className="px-1.5 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10 text-[9px] font-semibold uppercase"
                            >
                              {g.name}
                            </span>
                          ))}
                          {f.generos.length > 2 && (
                            <span className="text-[9px] text-[#1A1A1A]/60">
                              +{f.generos.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#1A1A1A]/40">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10 text-[10px] font-semibold">
                        {f.credits?.length || 0} prof.
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const eff = getEffectiveEditorialStatus(f);
                        return (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                              eff === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : eff === 'draft'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : eff === 'scheduled'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}
                          >
                            {eff === 'published'
                              ? 'Publicado'
                              : eff === 'draft'
                              ? 'Rascunho'
                              : eff === 'scheduled'
                              ? 'Agendado'
                              : 'Arquivado'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditFilm(f)}
                          className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] transition-colors"
                          title="Editar Ficha Técnica"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: f.id, title: f.title })}
                          className="p-1.5 hover:bg-red-50 text-red-600 transition-colors"
                          title="Excluir Filme"
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Filme do Catálogo"
          message={`Tem certeza de que deseja excluir o filme "${deleteTarget.title}" do catálogo Supabase? Essa ação removerá as associações de gêneros e créditos deste filme sem apagar as pessoas, gêneros ou países cadastrados.`}
          confirmLabel="Excluir Filme"
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* TMDB Movie Search, Preview & Import Modal (F10.3) */}
      <TmdbMovieImportModal
        isOpen={showTmdbModal}
        onClose={() => setShowTmdbModal(false)}
        existingFilmes={filmes}
        onImportSuccess={handleImportSuccess}
        onOpenExistingFilm={(f) => handleEditFilm(f)}
        onManualCreate={handleCreateNew}
        onNotify={onNotify}
      />
    </div>
  );
};
