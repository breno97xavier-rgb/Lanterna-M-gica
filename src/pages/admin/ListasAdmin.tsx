import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Search,
  AlertCircle,
  Film as FilmIcon,
  User as UserIcon,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { Lista, ListaItem, ContentStatus } from '../../types';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import {
  fetchListas,
  fetchListaById,
  createLista,
  updateLista,
  deleteLista,
  slugifyLista,
  ListaItemInput,
} from '../../services/repositories/listasRepository';
import { fetchFilmes, SupabaseFilme } from '../../services/repositories/filmesRepository';
import { fetchPessoas, SupabasePessoa } from '../../services/repositories/pessoasRepository';
import {
  getTodayLocalDateString,
  getNowDateTimeLocalString,
  getEditorialDateString,
  formatEditorialDate,
  formatIsoForDateTimeInput,
  parseDateInputToIso,
  parseDateTimeInputToIso,
} from '../../utils/dateUtils';
import {
  getEffectiveEditorialStatus,
  getEditorialStatusBadgeInfo,
  useEditorialTicker,
} from '../../utils/statusUtils';

interface ListasAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

interface EditingItemFormState extends ListaItem {
  isCustomManual?: boolean;
}

interface EditingListaForm {
  id?: string;
  legacyId?: string | null;
  title: string;
  slug: string;
  intro: string;
  coverImage: string;
  relatedPersonId?: string | null;
  relatedFilmmaker?: string;
  status: ContentStatus;
  date: string;
  scheduledAt?: string;
  tags: string[];
  items: EditingItemFormState[];
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1600';

export const ListasAdmin: React.FC<ListasAdminProps> = ({ onNotify, autoCreate = false }) => {
  const currentTime = useEditorialTicker(30000);

  // Estados de dados principais
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado do formulário de edição/criação
  const [editing, setEditing] = useState<EditingListaForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Entidades auxiliares para seleção (Filmes e Pessoas)
  const [filmesCatalog, setFilmesCatalog] = useState<SupabaseFilme[]>([]);
  const [pessoasCatalog, setPessoasCatalog] = useState<SupabasePessoa[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState<boolean>(false);

  // Modal / Dropdown de busca de filme para um item específico
  const [activeFilmSearchItemIdx, setActiveFilmSearchItemIdx] = useState<number | null>(null);
  const [filmItemSearchTerm, setFilmItemSearchTerm] = useState<string>('');

  // Busca de pessoa relacionada
  const [personSearchTerm, setPersonSearchTerm] = useState<string>('');
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState<boolean>(false);

  // Filtros da listagem
  const [tableSearch, setTableSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Carrega listagem principal do Supabase
  const loadListas = async () => {
    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await fetchListas({ allStatuses: true });
    if (error) {
      setErrorMessage(`Erro ao carregar Listas do Supabase: ${error.message}`);
      setListas([]);
    } else {
      setListas(data || []);
    }
    setLoading(false);
  };

  // Carrega catálogos de filmes e pessoas
  const loadCatalogs = async () => {
    if (catalogsLoaded) return;
    try {
      const [filmRes, pesRes] = await Promise.all([
        fetchFilmes({ allStatuses: true }),
        fetchPessoas({ allStatuses: true }),
      ]);
      if (filmRes.data) setFilmesCatalog(filmRes.data);
      if (pesRes.data) setPessoasCatalog(pesRes.data);
      setCatalogsLoaded(true);
    } catch (err) {
      console.error('Erro ao carregar catálogos para o CMS de Listas:', err);
    }
  };

  useEffect(() => {
    loadListas();
    loadCatalogs();
  }, []);

  useEffect(() => {
    if (autoCreate && !editing && !loading) {
      handleCreateNew();
    }
  }, [autoCreate, loading]);

  const handleCreateNew = () => {
    loadCatalogs();
    setEditing({
      title: '',
      slug: '',
      intro: '',
      coverImage: DEFAULT_COVER,
      relatedPersonId: null,
      relatedFilmmaker: '',
      status: 'published',
      date: getTodayLocalDateString(),
      scheduledAt: getNowDateTimeLocalString(30),
      tags: ['Listas', 'Curadoria'],
      items: [
        {
          rank: 1,
          orderIndex: 0,
          filmId: null,
          title: '',
          director: '',
          year: new Date().getFullYear(),
          note: '',
          image: '',
        },
      ],
    });
    setErrorMessage(null);
  };

  const handleEdit = async (lista: Lista) => {
    loadCatalogs();
    setLoading(true);
    setErrorMessage(null);

    // Busca versão mais recente com itens e relacionamentos completos
    const { data: fullLista, error } = await fetchListaById(lista.id, { includeDrafts: true });
    const current = fullLista || lista;

    if (error) {
      console.warn('Aviso ao carregar dados completos da Lista:', error.message);
    }

    const sourceDate =
      current.status === 'scheduled' && current.scheduledAt
        ? current.scheduledAt
        : current.publishedAt || current.createdAt;

    const domainItems: EditingItemFormState[] = (current.items || []).map((it, idx) => ({
      id: it.id,
      rank: typeof it.rank === 'number' ? it.rank : idx + 1,
      orderIndex: typeof it.orderIndex === 'number' ? it.orderIndex : idx,
      filmId: it.filmId || null,
      title: it.title || it.film?.title || '',
      director: it.director || '',
      year: it.year || it.film?.year || new Date().getFullYear(),
      image: it.image || it.film?.posterUrl || '',
      note: it.note || '',
      film: it.film || null,
    }));

    setEditing({
      id: current.id,
      legacyId: current.legacyId,
      title: current.title,
      slug: current.slug,
      intro: current.intro || '',
      coverImage: current.coverImage || DEFAULT_COVER,
      relatedPersonId: current.relatedPersonId || null,
      relatedFilmmaker: current.relatedFilmmaker || current.relatedPerson?.name || '',
      status: current.status,
      date: getEditorialDateString(sourceDate),
      scheduledAt: formatIsoForDateTimeInput(current.scheduledAt) || getNowDateTimeLocalString(30),
      tags: current.tags || [],
      items:
        domainItems.length > 0
          ? domainItems
          : [
              {
                rank: 1,
                orderIndex: 0,
                filmId: null,
                title: '',
                director: '',
                year: new Date().getFullYear(),
                note: '',
                image: '',
              },
            ],
    });
    setLoading(false);
  };

  const handleAddItem = () => {
    if (!editing) return;
    const nextRank = editing.items.length + 1;
    setEditing({
      ...editing,
      items: [
        ...editing.items,
        {
          rank: nextRank,
          orderIndex: editing.items.length,
          filmId: null,
          title: '',
          director: '',
          year: new Date().getFullYear(),
          note: '',
          image: '',
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editing) return;
    const newItems = editing.items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        orderIndex: idx,
      }));
    setEditing({ ...editing, items: newItems });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!editing) return;
    const newItems = [...editing.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    // Normaliza ranks e order_index rigorosamente
    const normalized = newItems.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      orderIndex: idx,
    }));
    setEditing({ ...editing, items: normalized });
  };

  const handleSelectFilmForIndex = (itemIdx: number, film: SupabaseFilme) => {
    if (!editing) return;
    const newItems = [...editing.items];
    newItems[itemIdx] = {
      ...newItems[itemIdx],
      filmId: film.id,
      title: film.title,
      director: film.legacy_director_name || newItems[itemIdx].director || '',
      year: film.year || newItems[itemIdx].year,
      image: film.poster_url || film.backdrop_url || newItems[itemIdx].image || '',
      film: {
        id: film.id,
        title: film.title,
        slug: film.slug,
        year: film.year,
        posterUrl: film.poster_url,
        backdropUrl: film.backdrop_url,
        country: film.country,
      },
    };
    setEditing({ ...editing, items: newItems });
    setActiveFilmSearchItemIdx(null);
    setFilmItemSearchTerm('');
  };

  const handleUnlinkFilmForIndex = (itemIdx: number) => {
    if (!editing) return;
    const newItems = [...editing.items];
    newItems[itemIdx] = {
      ...newItems[itemIdx],
      filmId: null,
      film: null,
    };
    setEditing({ ...editing, items: newItems });
  };

  const handleSelectRelatedPerson = (person: SupabasePessoa | null) => {
    if (!editing) return;
    if (person) {
      setEditing({
        ...editing,
        relatedPersonId: person.id,
        relatedFilmmaker: person.name,
      });
    } else {
      setEditing({
        ...editing,
        relatedPersonId: null,
      });
    }
    setIsPersonDropdownOpen(false);
    setPersonSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.title.trim()) {
      onNotify('Atenção: Por favor, preencha o Título da lista.');
      return;
    }

    const calculatedSlug = editing.slug.trim() || slugifyLista(editing.title);
    if (!calculatedSlug) {
      onNotify('Atenção: O slug da lista não pode ser vazio.');
      return;
    }

    if (!editing.coverImage?.trim()) {
      onNotify('Atenção: A imagem de capa da lista é obrigatória.');
      return;
    }

    // Validação de itens
    if (editing.items.length === 0) {
      onNotify('Atenção: A lista deve conter ao menos um filme.');
      return;
    }

    for (let i = 0; i < editing.items.length; i++) {
      const it = editing.items[i];
      if (!it.title?.trim() && !it.filmId) {
        onNotify(`Atenção: O item #${i + 1} precisa de um título ou de um filme vinculado.`);
        return;
      }
    }

    // Validação temporal de agendamento
    let scheduledAtIso: string | null = null;
    let publishedAtIso: string | null = null;

    if (editing.status === 'scheduled') {
      if (!editing.scheduledAt || !editing.scheduledAt.trim()) {
        onNotify('Atenção: Selecione data e hora para o agendamento da Lista.');
        return;
      }
      scheduledAtIso = parseDateTimeInputToIso(editing.scheduledAt);
    } else if (editing.status === 'published') {
      publishedAtIso = parseDateInputToIso(editing.date);
    }

    setSaving(true);
    setErrorMessage(null);

    // Prepara payload de itens com normalização
    const itemsPayload: ListaItemInput[] = editing.items.map((it, idx) => ({
      film_id: it.filmId || null,
      rank: typeof it.rank === 'number' ? it.rank : idx + 1,
      order_index: idx,
      custom_title: it.title?.trim() || null,
      custom_director: it.director?.trim() || null,
      custom_year: typeof it.year === 'number' ? it.year : null,
      custom_image: it.image?.trim() || null,
      note: it.note?.trim() || null,
    }));

    try {
      if (editing.id) {
        // Atualização
        const { data, itemsError, tagsError, error } = await updateLista(editing.id, {
          title: editing.title.trim(),
          slug: calculatedSlug,
          intro: editing.intro?.trim() || '',
          cover_image: editing.coverImage.trim(),
          related_person_id: editing.relatedPersonId || null,
          status: editing.status,
          published_at: publishedAtIso,
          scheduled_at: scheduledAtIso,
          items: itemsPayload,
          tags: editing.tags,
        });

        if (error) {
          setErrorMessage(error.message);
          setSaving(false);
          return;
        }

        if (itemsError) {
          console.warn('Aviso na sincronização de itens:', itemsError.message);
        }
        if (tagsError) {
          console.warn('Aviso na sincronização de tags:', tagsError.message);
        }

        onNotify('Lista atualizada com sucesso no Supabase!');
      } else {
        // Criação
        const { data, itemsError, tagsError, error } = await createLista({
          title: editing.title.trim(),
          slug: calculatedSlug,
          intro: editing.intro?.trim() || '',
          cover_image: editing.coverImage.trim(),
          related_person_id: editing.relatedPersonId || null,
          status: editing.status,
          published_at: publishedAtIso,
          scheduled_at: scheduledAtIso,
          items: itemsPayload,
          tags: editing.tags,
        });

        if (error) {
          setErrorMessage(error.message);
          setSaving(false);
          return;
        }

        if (itemsError) {
          console.warn('Aviso na sincronização de itens:', itemsError.message);
        }
        if (tagsError) {
          console.warn('Aviso na sincronização de tags:', tagsError.message);
        }

        onNotify('Lista criada com sucesso no Supabase!');
      }

      setEditing(null);
      await loadListas();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar Lista.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { success, error } = await deleteLista(deleteTarget.id);
    setIsDeleting(false);

    if (error) {
      setErrorMessage(`Erro ao excluir lista: ${error.message}`);
      return;
    }

    onNotify(`Lista "${deleteTarget.title}" excluída com sucesso.`);
    setDeleteTarget(null);
    await loadListas();
  };

  // Filtragem da tabela
  const filteredListas = listas.filter((item) => {
    const effectiveStatus = getEffectiveEditorialStatus(item, undefined, currentTime);

    // Filtro por status
    if (statusFilter !== 'todos') {
      if (statusFilter === 'published' && effectiveStatus !== 'published') return false;
      if (statusFilter === 'draft' && effectiveStatus !== 'draft') return false;
      if (statusFilter === 'scheduled' && effectiveStatus !== 'scheduled') return false;
      if (statusFilter === 'archived' && effectiveStatus !== 'archived') return false;
    }

    // Filtro de busca por texto
    if (tableSearch.trim()) {
      const term = tableSearch.toLowerCase().trim();
      const inTitle = item.title.toLowerCase().includes(term);
      const inIntro = (item.intro || '').toLowerCase().includes(term);
      const inPerson = (item.relatedPerson?.name || item.relatedFilmmaker || '').toLowerCase().includes(term);
      const inTags = (item.tags || []).some((t) => t.toLowerCase().includes(term));
      const inFilms = (item.items || []).some(
        (it) => it.title.toLowerCase().includes(term) || (it.director || '').toLowerCase().includes(term)
      );
      return inTitle || inIntro || inPerson || inTags || inFilms;
    }

    return true;
  });

  // RENDERIZAÇÃO DO FORMULÁRIO DE EDIÇÃO / CRIAÇÃO
  if (editing) {
    const selectedPerson = pessoasCatalog.find((p) => p.id === editing.relatedPersonId) || null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A] disabled:opacity-50"
          >
            <ArrowLeft size={14} /> Voltar para Listas
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-sans flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-4">
            <div>
              <h2 className="text-xl font-serif-display text-[#1A1A1A]">
                {editing.id ? 'Editar Lista Curada' : 'Nova Lista de Filmes'}
              </h2>
              <p className="text-xs font-sans text-[#1A1A1A]/60 mt-0.5">
                Seleção curada com itens ranqueados, notas críticas e vínculo relacional ao acervo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-[#1A1A1A]/50">
                {editing.items.length} {editing.items.length === 1 ? 'filme' : 'filmes'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            {/* Título */}
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Título da Lista *</label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditing({
                    ...editing,
                    title: val,
                    slug: editing.slug ? editing.slug : slugifyLista(val),
                  });
                }}
                placeholder="Ex: Dez Obras Fundamentais sobre o Silêncio..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A] focus:bg-white focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Slug (URL Canônica) *</label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="dez-obras-fundamentais-sobre-o-silencio"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            {/* Introdução */}
            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Introdução Editorial</label>
              <textarea
                rows={3}
                value={editing.intro}
                onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                placeholder="Apresentação crítica da seleção e contexto estético..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A] focus:bg-white focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            {/* Imagem de Capa */}
            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem de Capa da Lista *"
                value={editing.coverImage || ''}
                onChange={(url) => setEditing({ ...editing, coverImage: url })}
              />
            </div>

            {/* Pessoa Relacionada / Homenageado */}
            <div className="md:col-span-2 p-4 bg-[#F5F2ED]/60 border border-[#1A1A1A]/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[#1A1A1A]/80 font-bold uppercase text-xs flex items-center gap-1.5">
                  <UserIcon size={14} className="text-[#1A1A1A]/70" />
                  <span>Pessoa / Cineasta Relacionado (Opcional)</span>
                </label>
                {selectedPerson && (
                  <button
                    type="button"
                    onClick={() => handleSelectRelatedPerson(null)}
                    className="text-[10px] font-mono text-red-600 hover:underline flex items-center gap-1"
                  >
                    <X size={10} /> Desvincular Pessoa
                  </button>
                )}
              </div>

              {selectedPerson ? (
                <div className="flex items-center gap-3 p-2.5 bg-white border border-[#1A1A1A]/15">
                  {selectedPerson.photo_url ? (
                    <img
                      src={selectedPerson.photo_url}
                      alt={selectedPerson.name}
                      className="w-10 h-10 object-cover border border-[#1A1A1A]/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#1A1A1A] text-[#F5F2ED] flex items-center justify-center font-bold text-xs shrink-0">
                      {selectedPerson.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#1A1A1A] truncate">{selectedPerson.name}</p>
                    <p className="text-[10px] font-mono text-[#1A1A1A]/60 truncate">
                      /{selectedPerson.slug} {selectedPerson.primary_role ? `• ${selectedPerson.primary_role}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300 shrink-0">
                    Vinculado
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={personSearchTerm}
                      onChange={(e) => {
                        setPersonSearchTerm(e.target.value);
                        setIsPersonDropdownOpen(true);
                      }}
                      onFocus={() => setIsPersonDropdownOpen(true)}
                      placeholder="Pesquisar pessoa no acervo (ex: Bergman, Godard, Fernanda Montenegro)..."
                      className="w-full bg-white border border-[#1A1A1A]/15 p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                    />
                    {personSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setPersonSearchTerm('');
                          setIsPersonDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-2.5 text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {isPersonDropdownOpen && personSearchTerm.trim().length > 0 && (
                    <div className="max-h-48 overflow-y-auto bg-white border border-[#1A1A1A]/15 shadow-sm divide-y divide-[#1A1A1A]/5">
                      {pessoasCatalog
                        .filter((p) =>
                          p.name.toLowerCase().includes(personSearchTerm.toLowerCase().trim())
                        )
                        .slice(0, 8)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectRelatedPerson(p)}
                            className="w-full text-left p-2 hover:bg-[#F5F2ED] flex items-center justify-between transition-colors"
                          >
                            <span className="font-bold text-xs text-[#1A1A1A]">{p.name}</span>
                            <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                              {p.primary_role || 'Pessoa'}
                            </span>
                          </button>
                        ))}
                      {pessoasCatalog.filter((p) =>
                        p.name.toLowerCase().includes(personSearchTerm.toLowerCase().trim())
                      ).length === 0 && (
                        <div className="p-3 text-center text-[#1A1A1A]/50 text-[11px]">
                          Nenhuma pessoa encontrada no acervo.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status Editorial e Agendamento */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1A1A1A]/10">
              <div>
                <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Status</label>
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as ContentStatus })
                  }
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
                >
                  <option value="published">Publicado</option>
                  <option value="draft">Rascunho</option>
                  <option value="scheduled">Agendado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              {editing.status === 'published' && (
                <div>
                  <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                    Data de Publicação
                  </label>
                  <input
                    type="date"
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {editing.status === 'scheduled' && (
                <div className="sm:col-span-2">
                  <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase text-blue-800">
                    Data e Hora do Agendamento *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editing.scheduledAt || ''}
                    onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value })}
                    className="w-full bg-blue-50/50 border border-blue-200 p-2.5 text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <TagInput
                tags={editing.tags || []}
                onChange={(newTags) => setEditing({ ...editing, tags: newTags })}
              />
            </div>

            {/* ========================================================================= */}
            {/* EDITOR DE ITENS / FILMES DA LISTA */}
            {/* ========================================================================= */}
            <div className="md:col-span-2 space-y-4 pt-6 border-t border-[#1A1A1A]/15">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif-display text-lg text-[#1A1A1A]">
                    Filmes da Lista ({editing.items.length})
                  </h3>
                  <p className="text-[11px] font-sans text-[#1A1A1A]/60">
                    Organize os títulos ranqueados, vincule filmes do acervo ou preencha dados customizados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase flex items-center gap-1.5 hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
                >
                  <Plus size={13} /> Adicionar Filme à Lista
                </button>
              </div>

              <div className="space-y-4">
                {editing.items.map((item, idx) => {
                  const hasFilmLink = Boolean(item.filmId);
                  const isSearchingFilm = activeFilmSearchItemIdx === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-4 bg-[#F5F2ED] border ${
                        hasFilmLink ? 'border-[#1A1A1A]/30 bg-white' : 'border-[#1A1A1A]/15'
                      } space-y-3 relative shadow-xs`}
                    >
                      {/* Top Header do Card do Item */}
                      <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-[#1A1A1A] text-[#F5F2ED] px-2 py-0.5">
                            #{item.rank || idx + 1}
                          </span>
                          {hasFilmLink ? (
                            <span className="text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300 flex items-center gap-1">
                              <FilmIcon size={10} /> Filme do Acervo Vinculado
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold uppercase bg-stone-200 text-stone-700 px-2 py-0.5 border border-stone-300">
                              Item Customizado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(idx, 'up')}
                            className="p-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A] hover:bg-[#F5F2ED] disabled:opacity-30 transition-colors"
                            title="Subir posição"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === editing.items.length - 1}
                            onClick={() => handleMoveItem(idx, 'down')}
                            className="p-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A] hover:bg-[#F5F2ED] disabled:opacity-30 transition-colors"
                            title="Descer posição"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 ml-2 text-[11px] font-mono font-bold transition-colors"
                            title="Remover item da lista"
                          >
                            Remover
                          </button>
                        </div>
                      </div>

                      {/* Vínculo / Busca no Acervo */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#F5F2ED]/60 border border-[#1A1A1A]/10 text-xs">
                        {hasFilmLink ? (
                          <div className="flex items-center gap-3 w-full justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="w-8 h-11 object-cover border border-[#1A1A1A]/15 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-[#1A1A1A] truncate">{item.title}</p>
                                <p className="text-[10px] font-mono text-[#1A1A1A]/60">
                                  {item.year || 'Ano N/D'} • {item.director || 'Diretor N/D'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnlinkFilmForIndex(idx)}
                              className="text-[10px] font-mono text-stone-600 hover:text-red-700 border border-[#1A1A1A]/20 bg-white px-2 py-1 shrink-0"
                            >
                              Desvincular do Acervo
                            </button>
                          </div>
                        ) : (
                          <div className="w-full">
                            {!isSearchingFilm ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveFilmSearchItemIdx(idx);
                                  setFilmItemSearchTerm('');
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[#1A1A1A] hover:text-[#D4AF37] transition-colors"
                              >
                                <Search size={12} />
                                <span>Vincular a um Filme existente no Acervo</span>
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={filmItemSearchTerm}
                                      onChange={(e) => setFilmItemSearchTerm(e.target.value)}
                                      placeholder="Digite o título do filme no acervo..."
                                      className="w-full bg-white border border-[#1A1A1A]/20 p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                                    />
                                    {filmItemSearchTerm && (
                                      <button
                                        type="button"
                                        onClick={() => setFilmItemSearchTerm('')}
                                        className="absolute right-2.5 top-2.5 text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveFilmSearchItemIdx(null);
                                      setFilmItemSearchTerm('');
                                    }}
                                    className="px-2.5 py-2 border border-[#1A1A1A]/20 text-xs font-mono text-[#1A1A1A] hover:bg-white"
                                  >
                                    Cancelar
                                  </button>
                                </div>

                                {filmItemSearchTerm.trim().length > 0 && (
                                  <div className="max-h-44 overflow-y-auto bg-white border border-[#1A1A1A]/15 shadow-sm divide-y divide-[#1A1A1A]/5">
                                    {filmesCatalog
                                      .filter((f) =>
                                        f.title
                                          .toLowerCase()
                                          .includes(filmItemSearchTerm.toLowerCase().trim())
                                      )
                                      .slice(0, 6)
                                      .map((f) => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          onClick={() => handleSelectFilmForIndex(idx, f)}
                                          className="w-full text-left p-2 hover:bg-[#F5F2ED] flex items-center justify-between transition-colors gap-2"
                                        >
                                          <div className="min-w-0">
                                            <p className="font-bold text-xs text-[#1A1A1A] truncate">
                                              {f.title}
                                            </p>
                                            <p className="text-[10px] font-mono text-[#1A1A1A]/60">
                                              {f.year} • {f.legacy_director_name || f.country || 'Filme'}
                                            </p>
                                          </div>
                                          <span className="text-[10px] font-mono font-bold uppercase bg-[#1A1A1A] text-[#F5F2ED] px-2 py-0.5 shrink-0">
                                            Selecionar
                                          </span>
                                        </button>
                                      ))}
                                    {filmesCatalog.filter((f) =>
                                      f.title
                                        .toLowerCase()
                                        .includes(filmItemSearchTerm.toLowerCase().trim())
                                    ).length === 0 && (
                                      <div className="p-3 text-center text-[#1A1A1A]/50 text-[11px]">
                                        Nenhum filme encontrado com esse título.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Campos do Item */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/70 mb-1">
                            Título do Filme *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.title}
                            onChange={(e) => {
                              const newItems = [...editing.items];
                              newItems[idx].title = e.target.value;
                              setEditing({ ...editing, items: newItems });
                            }}
                            placeholder="Ex: O Sétimo Selo"
                            className="w-full bg-white border border-[#1A1A1A]/15 p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/70 mb-1">
                            Diretor / Realizador
                          </label>
                          <input
                            type="text"
                            value={item.director || ''}
                            onChange={(e) => {
                              const newItems = [...editing.items];
                              newItems[idx].director = e.target.value;
                              setEditing({ ...editing, items: newItems });
                            }}
                            placeholder="Ex: Ingmar Bergman"
                            className="w-full bg-white border border-[#1A1A1A]/15 p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/70 mb-1">
                            Ano de Lançamento
                          </label>
                          <input
                            type="number"
                            value={item.year || ''}
                            onChange={(e) => {
                              const newItems = [...editing.items];
                              newItems[idx].year = parseInt(e.target.value, 10) || undefined;
                              setEditing({ ...editing, items: newItems });
                            }}
                            placeholder="Ex: 1957"
                            className="w-full bg-white border border-[#1A1A1A]/15 p-2 font-mono text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/70 mb-1">
                            URL do Pôster / Imagem (Opcional)
                          </label>
                          <input
                            type="url"
                            value={item.image || ''}
                            onChange={(e) => {
                              const newItems = [...editing.items];
                              newItems[idx].image = e.target.value;
                              setEditing({ ...editing, items: newItems });
                            }}
                            placeholder="https://..."
                            className="w-full bg-white border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/70 mb-1">
                            Nota Crítica / Comentário Editorial sobre a escolha
                          </label>
                          <textarea
                            rows={2}
                            value={item.note || ''}
                            onChange={(e) => {
                              const newItems = [...editing.items];
                              newItems[idx].note = e.target.value;
                              setEditing({ ...editing, items: newItems });
                            }}
                            placeholder="Breve justificativa crítica do porquê o filme ocupa esta posição na lista..."
                            className="w-full bg-white border border-[#1A1A1A]/15 p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOTÕES DE SALVAMENTO */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#1A1A1A]/15">
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(null)}
              className="px-4 py-2.5 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase hover:bg-[#F5F2ED] disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Lista</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // RENDERIZAÇÃO DA LISTAGEM ADMINISTRATIVA
  // =========================================================================
  const publishedCount = listas.filter(
    (l) => getEffectiveEditorialStatus(l, undefined, currentTime) === 'published'
  ).length;
  const draftCount = listas.filter(
    (l) => getEffectiveEditorialStatus(l, undefined, currentTime) === 'draft'
  ).length;
  const scheduledCount = listas.filter(
    (l) => getEffectiveEditorialStatus(l, undefined, currentTime) === 'scheduled'
  ).length;
  const archivedCount = listas.filter(
    (l) => getEffectiveEditorialStatus(l, undefined, currentTime) === 'archived'
  ).length;

  return (
    <div className="space-y-4">
      {/* Header com Título e Botão Nova Lista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Listas & Seleções Curadas</h2>
          <p className="text-xs font-sans text-[#1A1A1A]/60 mt-0.5">
            Gestão editorial de rankings temáticos, retrospectivas e filmografias comentadas.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors flex items-center gap-1.5"
        >
          <Plus size={14} /> Nova Lista
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-sans flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white border border-[#1A1A1A]/15 p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Filtros por Status com contadores */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors ${
              statusFilter === 'todos'
                ? 'bg-[#1A1A1A] text-[#F5F2ED]'
                : 'bg-[#F5F2ED] text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/10'
            }`}
          >
            Todos ({listas.length})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors ${
              statusFilter === 'published'
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Publicados ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors ${
              statusFilter === 'draft'
                ? 'bg-amber-800 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Rascunhos ({draftCount})
          </button>
          <button
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors ${
              statusFilter === 'scheduled'
                ? 'bg-blue-800 text-white'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Agendados ({scheduledCount})
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`px-3 py-1.5 font-bold uppercase text-[11px] transition-colors ${
              statusFilter === 'archived'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Arquivados ({archivedCount})
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Buscar por título, filme, tag..."
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 py-1.5 pl-8 pr-3 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          />
          <Search size={13} className="absolute left-2.5 top-2 text-[#1A1A1A]/40" />
        </div>
      </div>

      {/* Tabela de Listas */}
      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-sans text-[#1A1A1A]/60 flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-[#1A1A1A]" />
            <span>Carregando Listas do Supabase...</span>
          </div>
        ) : filteredListas.length === 0 ? (
          <div className="p-12 text-center text-xs font-sans text-[#1A1A1A]/60 space-y-3">
            <p>Nenhuma lista encontrada com os filtros selecionados.</p>
            <button
              onClick={handleCreateNew}
              className="text-xs font-sans font-bold uppercase tracking-wider text-[#D4AF37] hover:underline"
            >
              + Criar a primeira Lista
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
            <thead>
              <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60 bg-[#F5F2ED]/50">
                <th className="py-3 px-4">Capa & Título</th>
                <th className="py-3 px-4">Pessoa / Cineasta</th>
                <th className="py-3 px-4">Qtd. Filmes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {filteredListas.map((l) => {
                const effectiveStatus = getEffectiveEditorialStatus(l, undefined, currentTime);
                const badge = getEditorialStatusBadgeInfo(effectiveStatus);
                const dateDisplay =
                  effectiveStatus === 'scheduled' && l.scheduledAt
                    ? formatEditorialDate(l.scheduledAt)
                    : formatEditorialDate(l.publishedAt || l.createdAt);

                return (
                  <tr key={l.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                    {/* Capa e Título */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        {l.coverImage && (
                          <img
                            src={l.coverImage}
                            alt=""
                            className="w-10 h-10 object-cover border border-[#1A1A1A]/15 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-[#1A1A1A] block truncate">{l.title}</span>
                          <span className="text-[10px] font-mono text-[#1A1A1A]/50 block truncate">
                            /{l.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Pessoa Relacionada */}
                    <td className="py-3 px-4 text-xs">
                      {l.relatedPerson ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon size={12} className="text-[#1A1A1A]/50 shrink-0" />
                          <span className="font-medium text-[#1A1A1A] truncate">
                            {l.relatedPerson.name}
                          </span>
                        </div>
                      ) : l.relatedFilmmaker ? (
                        <span className="text-[#1A1A1A]/80">{l.relatedFilmmaker}</span>
                      ) : (
                        <span className="text-[#1A1A1A]/40 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Qtd Filmes */}
                    <td className="py-3 px-4 font-mono font-bold text-[#1A1A1A]">
                      {l.items?.length || 0} {l.items?.length === 1 ? 'filme' : 'filmes'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {/* Data */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#1A1A1A]/70">
                      {dateDisplay || '—'}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(l)}
                          className="p-1.5 bg-white border border-[#1A1A1A]/15 hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-[#1A1A1A] transition-colors"
                          title="Editar Lista"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: l.id, title: l.title })}
                          className="p-1.5 bg-white border border-red-200 hover:bg-red-600 hover:text-white text-red-600 transition-colors"
                          title="Excluir Lista"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Lista Curada"
          message={`Tem certeza de que deseja excluir permanentemente a lista "${deleteTarget.title}"? Esta ação removerá a lista e todos os seus itens associados no Supabase.`}
          confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir Lista'}
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => !isDeleting && setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
