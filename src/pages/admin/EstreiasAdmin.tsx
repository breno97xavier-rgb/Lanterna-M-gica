import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Calendar,
  Film,
  Check,
  X,
  Clock,
  Archive,
  AlertCircle,
  Loader2,
  CheckCircle,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Estreia, ContentStatus } from '../../types';
import {
  fetchEstreias,
  createEstreia,
  updateEstreia,
  deleteEstreia,
} from '../../services/repositories/estreiasRepository';
import { fetchFilmes, SupabaseFilme } from '../../services/repositories/filmesRepository';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import {
  getTodayLocalDateString,
  getNowDateTimeLocalString,
  getEditorialDateString,
  formatEditorialDate,
  formatIsoForDateTimeInput,
  parseDateTimeInputToIso,
} from '../../utils/dateUtils';
import { getEffectiveEditorialStatus, useEditorialTicker } from '../../utils/statusUtils';

interface EstreiasAdminProps {
  onNotify?: (msg: string) => void;
  autoCreate?: boolean;
}

interface FormState {
  id?: string;
  film_id: string;
  country: string;
  release_date: string; // YYYY-MM-DD
  release_type: string;
  distributor: string;
  notes: string;
  status: ContentStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
}

export const EstreiasAdmin: React.FC<EstreiasAdminProps> = ({ onNotify, autoCreate = false }) => {
  const currentTime = useEditorialTicker(30000);
  const [estreias, setEstreias] = useState<Estreia[]>([]);
  const [filmes, setFilmes] = useState<SupabaseFilme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [releaseTypeFilter, setReleaseTypeFilter] = useState('todos');

  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormState | null>(null);
  const [filmSearchQuery, setFilmSearchQuery] = useState('');
  const [isFilmDropdownOpen, setIsFilmDropdownOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filmTitle: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [estRes, filmRes] = await Promise.all([
        fetchEstreias({ allStatuses: true }),
        fetchFilmes({ allStatuses: true }),
      ]);

      if (estRes.error) {
        setErrorMessage(`Erro ao carregar estreias: ${estRes.error.message}`);
        setEstreias([]);
      } else {
        setEstreias(estRes.data || []);
      }

      if (filmRes.error) {
        console.warn('Erro ao carregar catálogo de filmes:', filmRes.error.message);
        setFilmes([]);
      } else {
        setFilmes(filmRes.data || []);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao carregar dados do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto create when prop changes
  useEffect(() => {
    if (autoCreate && !loading) {
      handleCreateNew();
    }
  }, [autoCreate, loading]);

  const getSuggestedThursday = (): string => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sunday, 4 = Thursday
    const diff = (4 - day + 7) % 7 || 7; // days to next thursday
    d.setDate(d.getDate() + diff);
    return getEditorialDateString(d.toISOString().slice(0, 10));
  };

  const handleCreateNew = () => {
    const defaultFilmId = filmes[0]?.id || '';
    setFormData({
      film_id: defaultFilmId,
      country: 'Brasil',
      release_date: getSuggestedThursday(),
      release_type: 'Cinema',
      distributor: '',
      notes: '',
      status: 'published',
      published_at: new Date().toISOString(),
      scheduled_at: null,
    });
    setFilmSearchQuery('');
    setIsFilmDropdownOpen(false);
    setIsEditing(true);
  };

  const handleEdit = (est: Estreia) => {
    setFormData({
      id: est.id,
      film_id: est.filmId,
      country: est.country || 'Brasil',
      release_date: getEditorialDateString(est.releaseDate),
      release_type: est.releaseType || 'Cinema',
      distributor: est.distributor || '',
      notes: est.notes || '',
      status: est.status || 'published',
      published_at: est.publishedAt || null,
      scheduled_at: est.scheduledAt || null,
    });
    setFilmSearchQuery('');
    setIsFilmDropdownOpen(false);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (!formData.film_id) {
      alert('Selecione um filme do acervo para cadastrar a estreia.');
      return;
    }

    if (!formData.release_date) {
      alert('A data de lançamento é obrigatória.');
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        // Atualização
        const { data, error } = await updateEstreia(formData.id, {
          film_id: formData.film_id,
          country: formData.country,
          release_date: formData.release_date,
          release_type: formData.release_type,
          distributor: formData.distributor,
          notes: formData.notes,
          status: formData.status,
          published_at:
            formData.status === 'published'
              ? formData.published_at || new Date().toISOString()
              : formData.published_at,
          scheduled_at: formData.status === 'scheduled' ? formData.scheduled_at : null,
        });

        if (error) {
          alert(`Erro ao atualizar estreia: ${error.message}`);
          return;
        }

        if (onNotify) {
          onNotify(`Estreia atualizada com sucesso no Supabase.`);
        }
      } else {
        // Criação
        const { data, error } = await createEstreia({
          film_id: formData.film_id,
          country: formData.country,
          release_date: formData.release_date,
          release_type: formData.release_type,
          distributor: formData.distributor,
          notes: formData.notes,
          status: formData.status,
          published_at:
            formData.status === 'published'
              ? formData.published_at || new Date().toISOString()
              : null,
          scheduled_at: formData.status === 'scheduled' ? formData.scheduled_at : null,
        });

        if (error) {
          alert(`Erro ao criar estreia: ${error.message}`);
          return;
        }

        if (onNotify) {
          onNotify(`Estreia cadastrada com sucesso no Supabase.`);
        }
      }

      setIsEditing(false);
      setFormData(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erro inesperado ao salvar estreia.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { success, error } = await deleteEstreia(deleteTarget.id);
      if (error || !success) {
        alert(`Erro ao excluir estreia: ${error?.message || 'Falha na exclusão'}`);
        return;
      }

      if (onNotify) {
        onNotify(`Estreia de "${deleteTarget.filmTitle}" excluída com sucesso.`);
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erro inesperado ao excluir.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper para extrair diretor do filme selecionado
  const getFilmDirectorDisplay = (film?: SupabaseFilme | null): string => {
    if (!film) return 'Direção não informada';
    if (film.credits && film.credits.length > 0) {
      const dirs = film.credits
        .filter((c) => c.department === 'Direção')
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((c) => c.person?.name || c.fallback_person_name)
        .filter(Boolean);
      if (dirs.length > 0) return dirs.join(', ');
    }
    return film.legacy_director_name || 'Direção não informada';
  };

  // Filme selecionado no formulário
  const selectedFilm = useMemo(() => {
    if (!formData?.film_id) return null;
    return filmes.find((f) => f.id === formData.film_id) || null;
  }, [formData?.film_id, filmes]);

  // Filmes filtrados no dropdown
  const filteredFilmsForSelect = useMemo(() => {
    if (!filmSearchQuery.trim()) return filmes;
    const q = filmSearchQuery.toLowerCase().trim();
    return filmes.filter((f) => {
      const dir = getFilmDirectorDisplay(f).toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        (f.original_title && f.original_title.toLowerCase().includes(q)) ||
        dir.includes(q) ||
        String(f.year).includes(q)
      );
    });
  }, [filmes, filmSearchQuery]);

  // Lista filtrada da tabela
  const filteredEstreias = useMemo(() => {
    return estreias.filter((est) => {
      // Filtro de status
      if (statusFilter !== 'todos') {
        const effectiveStatus = getEffectiveEditorialStatus(
          est,
          undefined,
          currentTime
        );
        if (effectiveStatus !== statusFilter) return false;
      }

      // Filtro de tipo de lançamento
      if (releaseTypeFilter !== 'todos') {
        if (est.releaseType !== releaseTypeFilter) return false;
      }

      // Busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = est.filmTitle.toLowerCase().includes(q);
        const matchesDirector = est.filmDirector?.toLowerCase().includes(q);
        const matchesDistributor = est.distributor?.toLowerCase().includes(q);
        const matchesDate = est.releaseDate.includes(q);
        const matchesNotes = est.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDirector && !matchesDistributor && !matchesDate && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [estreias, statusFilter, releaseTypeFilter, searchQuery, currentTime]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A]/10 pb-4">
        <div>
          <h2 className="text-xl font-serif-display font-bold text-[#1A1A1A] flex items-center gap-2">
            <span>Guia de Estreias ({estreias.length})</span>
            {loading && <Loader2 size={16} className="animate-spin text-[#D4AF37]" />}
          </h2>
          <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-0.5">
            Lançamentos cinematográficos cadastrados no Supabase com data de estreia no circuito e status editorial.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          disabled={loading || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider transition-colors shadow-xs disabled:opacity-50"
        >
          <Plus size={14} />
          <span>Cadastrar Estreia</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={loadData}
            className="ml-auto underline hover:text-red-900 text-[11px] font-bold uppercase"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Editor Modal */}
      {isEditing && formData && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#F5F2ED] border border-[#1A1A1A]/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#D4AF37]" />
                <h3 className="text-lg font-serif-display font-bold text-[#1A1A1A]">
                  {formData.id ? 'Editar Estreia' : 'Cadastrar Nova Estreia'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setIsEditing(false);
                    setFormData(null);
                  }
                }}
                disabled={saving}
                className="p-1 text-[#1A1A1A]/60 hover:text-[#1A1A1A] disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Seleção do Filme Canônico */}
              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center justify-between">
                  <span>Filme do Acervo *</span>
                  <span className="text-[9px] font-mono text-[#1A1A1A]/50">
                    {filmes.length} filmes disponíveis no catálogo
                  </span>
                </label>

                {/* Dropdown com Busca Integrada */}
                <div className="relative">
                  <div
                    onClick={() => setIsFilmDropdownOpen(!isFilmDropdownOpen)}
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] flex items-center justify-between cursor-pointer hover:border-[#D4AF37] transition-colors"
                  >
                    {selectedFilm ? (
                      <div className="flex items-center gap-2 truncate">
                        <Film size={14} className="text-[#D4AF37] shrink-0" />
                        <span className="font-bold truncate">{selectedFilm.title}</span>
                        <span className="text-[#1A1A1A]/60 shrink-0">
                          ({selectedFilm.year}) — Dir. {getFilmDirectorDisplay(selectedFilm)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#1A1A1A]/40">Selecione um filme cadastrado...</span>
                    )}
                    <ChevronDown size={14} className="text-[#1A1A1A]/50 shrink-0 ml-2" />
                  </div>

                  {isFilmDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-[#1A1A1A] shadow-xl max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-[#1A1A1A]/10 sticky top-0 bg-[#F5F2ED]">
                        <div className="relative">
                          <Search
                            size={12}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"
                          />
                          <input
                            type="text"
                            value={filmSearchQuery}
                            onChange={(e) => setFilmSearchQuery(e.target.value)}
                            placeholder="Pesquisar por título, diretor ou ano..."
                            className="w-full bg-white border border-[#1A1A1A]/20 pl-7 pr-2 py-1 text-[11px] font-sans focus:outline-none focus:border-[#D4AF37]"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="divide-y divide-[#1A1A1A]/5">
                        {filteredFilmsForSelect.length === 0 ? (
                          <div className="p-3 text-center text-xs text-[#1A1A1A]/50">
                            Nenhum filme encontrado com &quot;{filmSearchQuery}&quot;
                          </div>
                        ) : (
                          filteredFilmsForSelect.map((f) => (
                            <div
                              key={f.id}
                              onClick={() => {
                                setFormData((prev) => (prev ? { ...prev, film_id: f.id } : null));
                                setIsFilmDropdownOpen(false);
                                setFilmSearchQuery('');
                              }}
                              className={`p-2.5 text-xs font-sans hover:bg-[#F5F2ED] cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                                formData.film_id === f.id ? 'bg-[#D4AF37]/10 font-bold' : ''
                              }`}
                            >
                              <div className="truncate">
                                <div className="text-[#1A1A1A] truncate">{f.title}</div>
                                <div className="text-[10px] text-[#1A1A1A]/60">
                                  {f.year} · Dir. {getFilmDirectorDisplay(f)} · {f.country || 'Internacional'}
                                </div>
                              </div>
                              {formData.film_id === f.id && (
                                <Check size={14} className="text-[#D4AF37] shrink-0" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview dos Metadados do Filme Selecionado */}
                {selectedFilm && (
                  <div className="p-3 bg-white border border-[#1A1A1A]/10 flex items-start gap-3 rounded-xs">
                    {selectedFilm.poster_url ? (
                      <img
                        src={selectedFilm.poster_url}
                        alt={selectedFilm.title}
                        className="w-12 aspect-[2/3] object-cover border border-[#1A1A1A]/20 shrink-0"
                      />
                    ) : (
                      <div className="w-12 aspect-[2/3] bg-[#1A1A1A]/5 border border-[#1A1A1A]/20 flex items-center justify-center shrink-0">
                        <Film size={16} className="text-[#1A1A1A]/30" />
                      </div>
                    )}
                    <div className="text-xs font-sans space-y-0.5 overflow-hidden">
                      <div className="font-bold text-[#1A1A1A] truncate">{selectedFilm.title}</div>
                      {selectedFilm.original_title && selectedFilm.original_title !== selectedFilm.title && (
                        <div className="text-[10px] italic text-[#1A1A1A]/60 truncate">
                          Título original: {selectedFilm.original_title}
                        </div>
                      )}
                      <div className="text-[10px] text-[#1A1A1A]/70">
                        Direção: <span className="font-semibold">{getFilmDirectorDisplay(selectedFilm)}</span>
                      </div>
                      <div className="text-[10px] text-[#1A1A1A]/60">
                        {selectedFilm.year} · {selectedFilm.country || 'País não informado'} ·{' '}
                        {selectedFilm.duration_minutes ? `${selectedFilm.duration_minutes} min` : 'Duração n/d'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Data de Lançamento, Tipo e País */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Data de Lançamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.release_date}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, release_date: e.target.value } : null))
                    }
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <p className="text-[9px] font-sans text-[#1A1A1A]/50">
                    Sugerido: Quinta-feira
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Tipo de Estreia
                  </label>
                  <select
                    value={formData.release_type}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, release_type: e.target.value } : null))
                    }
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Cinema">Cinema (Salas comerciais)</option>
                    <option value="Streaming">Streaming / VOD</option>
                    <option value="Festival">Festival de Cinema</option>
                    <option value="Relançamento">Relançamento em Cópia Restaurada</option>
                    <option value="Especial">Sessão Especial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    País do Circuito
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, country: e.target.value } : null))
                    }
                    placeholder="Ex: Brasil"
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Distribuidora */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Distribuidora no Brasil
                </label>
                <input
                  type="text"
                  value={formData.distributor}
                  onChange={(e) =>
                    setFormData((prev) => (prev ? { ...prev, distributor: e.target.value } : null))
                  }
                  placeholder="Ex: O2 Play / MUBI / Imovision / Vitrine Filmes / Warner Bros."
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Notas Editoriais */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Notas Editoriais / Observações de Lançamento
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  placeholder="Ex: Vencedor da Palma de Ouro no Festival de Cannes. Estreia em circuito restrito e salas IMAX selecionadas."
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-serif-body text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Status Editorial & Agendamento */}
              <div className="p-4 bg-white border border-[#1A1A1A]/10 space-y-4">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] block">
                  Status Editorial & Visibilidade
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: 'published',
                              published_at: prev.published_at || new Date().toISOString(),
                              scheduled_at: null,
                            }
                          : null
                      )
                    }
                    className={`p-2.5 text-xs font-mono uppercase font-bold border text-center transition-colors flex items-center justify-center gap-1.5 ${
                      formData.status === 'published'
                        ? 'bg-emerald-800 text-white border-emerald-900'
                        : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <CheckCircle size={12} />
                    <span>Publicado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: 'scheduled',
                              scheduled_at:
                                prev.scheduled_at ||
                                new Date(Date.now() + 86400000).toISOString(),
                            }
                          : null
                      )
                    }
                    className={`p-2.5 text-xs font-mono uppercase font-bold border text-center transition-colors flex items-center justify-center gap-1.5 ${
                      formData.status === 'scheduled'
                        ? 'bg-blue-800 text-white border-blue-900'
                        : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <Clock size={12} />
                    <span>Agendado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => (prev ? { ...prev, status: 'draft', scheduled_at: null } : null))
                    }
                    className={`p-2.5 text-xs font-mono uppercase font-bold border text-center transition-colors flex items-center justify-center gap-1.5 ${
                      formData.status === 'draft'
                        ? 'bg-amber-700 text-white border-amber-800'
                        : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <AlertCircle size={12} />
                    <span>Rascunho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => (prev ? { ...prev, status: 'archived', scheduled_at: null } : null))
                    }
                    className={`p-2.5 text-xs font-mono uppercase font-bold border text-center transition-colors flex items-center justify-center gap-1.5 ${
                      formData.status === 'archived'
                        ? 'bg-gray-700 text-white border-gray-800'
                        : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <Archive size={12} />
                    <span>Arquivado</span>
                  </button>
                </div>

                {formData.status === 'scheduled' && (
                  <div className="space-y-1.5 p-3 bg-blue-50/50 border border-blue-200 text-xs">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-blue-900 block">
                      Data e Hora da Publicação Automática *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formatIsoForDateTimeInput(formData.scheduled_at)}
                      onChange={(e) =>
                        setFormData((prev) =>
                          prev
                            ? { ...prev, scheduled_at: parseDateTimeInputToIso(e.target.value) }
                            : null
                        )
                      }
                      className="w-full bg-white border border-blue-300 px-3 py-2 text-xs font-mono text-blue-950 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-blue-800/80">
                      A estreia será visível ao público automaticamente assim que o horário estipulado for atingido.
                    </p>
                  </div>
                )}
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans uppercase tracking-wider text-[#1A1A1A] hover:bg-[#1A1A1A]/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <span>{formData.id ? 'Salvar Alterações' : 'Cadastrar Estreia'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por filme, distribuidora, diretor, data..."
            className="w-full bg-white border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs font-sans text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#1A1A1A]/15 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="todos">Todos os Status</option>
            <option value="published">Publicados</option>
            <option value="scheduled">Agendados</option>
            <option value="draft">Rascunhos</option>
            <option value="archived">Arquivados</option>
          </select>

          {/* Release Type Filter */}
          <select
            value={releaseTypeFilter}
            onChange={(e) => setReleaseTypeFilter(e.target.value)}
            className="bg-white border border-[#1A1A1A]/15 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="Cinema">Cinema</option>
            <option value="Streaming">Streaming</option>
            <option value="Festival">Festival</option>
            <option value="Relançamento">Relançamento</option>
            <option value="Especial">Especial</option>
          </select>
        </div>
      </div>

      {/* Tabela de Estreias */}
      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#1A1A1A]/5 border-b border-[#1A1A1A]/10 text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/70">
            <tr>
              <th className="py-3 px-4">Filme</th>
              <th className="py-3 px-4">Data de Lançamento</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Distribuidora</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#1A1A1A]/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
                    <span>Carregando estreias do Supabase...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEstreias.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#1A1A1A]/50 space-y-2">
                  <Calendar size={28} className="mx-auto text-[#1A1A1A]/20" />
                  <p className="font-serif-body text-sm text-[#1A1A1A]/70">
                    Nenhuma estreia cadastrada ou encontrada com os filtros selecionados.
                  </p>
                  <p className="text-[11px] text-[#1A1A1A]/40">
                    Clique em &quot;Cadastrar Estreia&quot; para registrar um lançamento no circuito.
                  </p>
                </td>
              </tr>
            ) : (
              filteredEstreias.map((est) => {
                const effectiveStatus = getEffectiveEditorialStatus(
                  est,
                  undefined,
                  currentTime
                );

                return (
                  <tr key={est.id} className="hover:bg-[#1A1A1A]/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {est.filmPoster ? (
                          <img
                            src={est.filmPoster}
                            alt={est.filmTitle}
                            className="w-9 aspect-[2/3] object-cover border border-[#1A1A1A]/20 shrink-0"
                          />
                        ) : (
                          <div className="w-9 aspect-[2/3] bg-[#1A1A1A]/10 flex items-center justify-center shrink-0">
                            <Film size={14} className="text-[#1A1A1A]/40" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <div className="font-bold text-[#1A1A1A] truncate">{est.filmTitle}</div>
                          <div className="text-[10px] text-[#1A1A1A]/60 truncate">
                            Dir. {est.filmDirector} ({est.filmYear})
                          </div>
                          {est.country && est.country !== 'Brasil' && (
                            <div className="text-[9px] text-[#1A1A1A]/40">{est.country}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-[#1A1A1A] whitespace-nowrap">
                      {formatEditorialDate(est.releaseDate, 'short')}
                      <span className="block text-[9px] text-[#1A1A1A]/50 font-mono">
                        {est.releaseDate}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10 text-[10px] font-semibold uppercase">
                        {est.releaseType || 'Cinema'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#1A1A1A]/80 max-w-xs truncate">
                      {est.distributor || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {effectiveStatus === 'published' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px] uppercase">
                          <CheckCircle size={12} /> Publicado
                        </span>
                      )}
                      {effectiveStatus === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold text-[10px] uppercase">
                          <Clock size={12} /> Agendado
                        </span>
                      )}
                      {effectiveStatus === 'draft' && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[10px] uppercase">
                          <AlertCircle size={12} /> Rascunho
                        </span>
                      )}
                      {effectiveStatus === 'archived' && (
                        <span className="inline-flex items-center gap-1 text-gray-500 font-semibold text-[10px] uppercase">
                          <Archive size={12} /> Arquivado
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(est)}
                          className="p-1 text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/10 transition-colors rounded-xs"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: est.id,
                              filmTitle: est.filmTitle,
                            })
                          }
                          className="p-1 text-red-600/70 hover:text-red-600 hover:bg-red-50 transition-colors rounded-xs"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Excluir Estreia"
        message={`Tem certeza que deseja excluir a estreia do filme "${deleteTarget?.filmTitle}"? Esta ação removerá apenas o registro de lançamento, preservando a ficha do filme no catálogo.`}
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir Estreia'}
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
