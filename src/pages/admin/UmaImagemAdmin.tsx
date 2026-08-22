import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  Eye,
  Search,
  Loader2,
  AlertCircle,
  Film,
  User,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { UmaImagemUmaIdeia, ContentStatus } from '../../types';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import {
  EditorialCreditsEditor,
  EditorialCreditItem,
} from '../../components/admin/EditorialCreditsEditor';
import {
  fetchUmaImagem,
  createUmaImagem,
  updateUmaImagem,
  deleteUmaImagem,
  slugifyUmaImagem,
  mapSupabaseUmaImagemToDomain,
  SupabaseUmaImagem,
} from '../../services/repositories/umaImagemRepository';
import {
  fetchUmaImagemAuthors,
  syncUmaImagemAuthors,
} from '../../services/repositories/editorialAuthorsRepository';
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
import { getEffectiveEditorialStatus, useEditorialTicker } from '../../utils/statusUtils';

interface UmaImagemAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

interface FormState {
  id?: string;
  title: string;
  slug: string;
  image_url: string;
  content: string;
  film_id: string | null;
  person_id: string | null;
  tags: string[];
  highlight_home: boolean;
  date: string;
  scheduledAt?: string;
  status: ContentStatus;
  legacy_id?: string;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&q=80&w=1600';

export const UmaImagemAdmin: React.FC<UmaImagemAdminProps> = ({ onNotify, autoCreate = false }) => {
  const currentTime = useEditorialTicker(30000);
  const [items, setItems] = useState<SupabaseUmaImagem[]>([]);
  const [filmes, setFilmes] = useState<SupabaseFilme[]>([]);
  const [pessoas, setPessoas] = useState<SupabasePessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editing, setEditing] = useState<FormState | null>(null);
  const [credits, setCredits] = useState<EditorialCreditItem[]>([]);
  const [previewItem, setPreviewItem] = useState<UmaImagemUmaIdeia | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Search in selectors
  const [filmSearchQuery, setFilmSearchQuery] = useState('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);

    const [itemsRes, filmesRes, pessoasRes] = await Promise.all([
      fetchUmaImagem({ allStatuses: true }),
      fetchFilmes({ allStatuses: true }),
      fetchPessoas({ allStatuses: true }),
    ]);

    if (itemsRes.error) {
      setErrorMessage(`Erro ao carregar publicações de Uma Imagem: ${itemsRes.error.message}`);
      setItems([]);
    } else {
      setItems(itemsRes.data || []);
    }

    if (filmesRes.data) {
      setFilmes(filmesRes.data);
    }

    if (pessoasRes.data) {
      setPessoas(pessoasRes.data);
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
      title: '',
      slug: '',
      image_url: DEFAULT_IMAGE,
      content: '',
      film_id: null,
      person_id: null,
      tags: ['Contemplação', 'Fotografia'],
      highlight_home: false,
      date: getTodayLocalDateString(),
      scheduledAt: getNowDateTimeLocalString(30),
      status: 'published',
    });
    setCredits([]);
    setFilmSearchQuery('');
    setPersonSearchQuery('');
    setErrorMessage(null);
  };

  const handleEdit = async (item: SupabaseUmaImagem) => {
    const sourceDate =
      item.status === 'scheduled' && item.scheduled_at
        ? item.scheduled_at
        : item.published_at || item.created_at;

    setEditing({
      id: item.id,
      title: item.title,
      slug: item.slug,
      image_url: item.image_url || '',
      content: item.content || '',
      film_id: item.film_id || null,
      person_id: item.person_id || null,
      tags: item.tags?.map((t) => t.name) || [],
      highlight_home: Boolean(item.highlight_home),
      date: getEditorialDateString(sourceDate),
      scheduledAt: formatIsoForDateTimeInput(item.scheduled_at) || getNowDateTimeLocalString(30),
      status: item.status,
      legacy_id: item.legacy_id || undefined,
    });

    if (item.authors && item.authors.length > 0) {
      setCredits(
        item.authors.map((a) => ({
          memberId: a.memberId,
          roleName: a.roleName || 'Texto',
          orderIndex: a.orderIndex,
        }))
      );
    } else {
      const { data: authorCredits } = await fetchUmaImagemAuthors(item.id);
      if (authorCredits && authorCredits.length > 0) {
        setCredits(
          authorCredits.map((a) => ({
            memberId: a.memberId,
            roleName: a.roleName || 'Texto',
            orderIndex: a.orderIndex,
          }))
        );
      } else {
        setCredits([]);
      }
    }

    setFilmSearchQuery('');
    setPersonSearchQuery('');
    setErrorMessage(null);
  };

  const handleOpenPreview = () => {
    if (!editing) return;

    const selectedFilm = filmes.find((f) => f.id === editing.film_id);
    const selectedPerson = pessoas.find((p) => p.id === editing.person_id);

    const previewModel: UmaImagemUmaIdeia = {
      id: editing.id || 'preview-temp-id',
      title: editing.title || 'Título da Imagem',
      slug: editing.slug || 'slug-previa',
      image: editing.image_url || DEFAULT_IMAGE,
      content: editing.content || '',
      filmId: editing.film_id,
      personId: editing.person_id,
      film: selectedFilm
        ? {
            id: selectedFilm.id,
            title: selectedFilm.title,
            slug: selectedFilm.slug,
            year: selectedFilm.year,
            posterUrl: selectedFilm.poster_url,
            backdropUrl: selectedFilm.backdrop_url,
          }
        : null,
      person: selectedPerson
        ? {
            id: selectedPerson.id,
            name: selectedPerson.name,
            slug: selectedPerson.slug,
            photoUrl: selectedPerson.photo_url,
          }
        : null,
      relatedMovie: selectedFilm?.title,
      relatedFilmmaker: selectedPerson?.name,
      tags: editing.tags || [],
      highlightHome: editing.highlight_home,
      date: editing.date,
      status: editing.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPreviewItem(previewModel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;

    if (!editing.title.trim()) {
      onNotify('Atenção: Por favor, preencha o Título da Imagem/Conceito.');
      return;
    }

    if (!editing.image_url.trim()) {
      onNotify('Atenção: Por favor, forneça a Imagem Principal.');
      return;
    }

    if (!editing.content.trim()) {
      onNotify('Atenção: Por favor, escreva o Texto Reflexivo / Micro-ensaio.');
      return;
    }

    const calculatedSlug = editing.slug.trim()
      ? slugifyUmaImagem(editing.slug)
      : slugifyUmaImagem(editing.title);

    if (!calculatedSlug) {
      onNotify('Atenção: Slug inválido.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    let pubIso: string | null = null;
    let schIso: string | null = null;

    if (editing.status === 'published') {
      pubIso = parseDateInputToIso(editing.date);
    } else if (editing.status === 'scheduled') {
      schIso = parseDateTimeInputToIso(editing.scheduledAt);
    }

    const authorPayload = credits
      .filter((c) => Boolean(c.memberId))
      .map((c, idx) => ({
        member_id: c.memberId,
        role_name: c.roleName?.trim() || 'Texto',
        order_index: typeof c.orderIndex === 'number' ? c.orderIndex : idx,
      }));

    try {
      if (editing.id) {
        // UPDATE
        const { data: updatedItem, error: updateErr } = await updateUmaImagem(editing.id, {
          title: editing.title,
          slug: calculatedSlug,
          image_url: editing.image_url,
          content: editing.content,
          film_id: editing.film_id,
          person_id: editing.person_id,
          highlight_home: editing.highlight_home,
          status: editing.status,
          published_at: pubIso,
          scheduled_at: schIso,
          tags: editing.tags,
        });

        if (updateErr || !updatedItem) {
          setErrorMessage(updateErr?.message || 'Erro ao atualizar publicação de Uma Imagem.');
          setSaving(false);
          return;
        }

        // Sincronizar autoria pela RPC
        const { success: authSuccess, error: authErr } = await syncUmaImagemAuthors(
          editing.id,
          authorPayload
        );

        if (!authSuccess && authErr) {
          onNotify(
            `Atenção: A publicação foi atualizada, mas houve um erro ao salvar os créditos de autoria: ${authErr.message}`
          );
        } else {
          onNotify('Publicação atualizada com sucesso!');
        }

        setEditing(null);
        await loadData();
      } else {
        // CREATE
        const { data: createdItem, error: createErr } = await createUmaImagem({
          title: editing.title,
          slug: calculatedSlug,
          image_url: editing.image_url,
          content: editing.content,
          film_id: editing.film_id,
          person_id: editing.person_id,
          highlight_home: editing.highlight_home,
          status: editing.status,
          published_at: pubIso,
          scheduled_at: schIso,
          tags: editing.tags,
        });

        if (createErr || !createdItem) {
          setErrorMessage(createErr?.message || 'Erro ao criar publicação de Uma Imagem.');
          setSaving(false);
          return;
        }

        // Sincronizar autoria com o ID retornado
        if (authorPayload.length > 0) {
          const { success: authSuccess, error: authErr } = await syncUmaImagemAuthors(
            createdItem.id,
            authorPayload
          );

          if (!authSuccess && authErr) {
            onNotify(
              `Atenção: A publicação foi criada com sucesso, mas houve um erro ao salvar os créditos de autoria: ${authErr.message}`
            );
          } else {
            onNotify('Publicação criada com sucesso!');
          }
        } else {
          onNotify('Publicação criada com sucesso!');
        }

        setEditing(null);
        await loadData();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado ao salvar publicação.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    const { success, error } = await deleteUmaImagem(deleteTarget.id);
    setSaving(false);

    if (error || !success) {
      onNotify(`Erro ao excluir: ${error?.message || 'Falha na exclusão.'}`);
    } else {
      onNotify(`Publicação "${deleteTarget.title}" excluída com sucesso.`);
      setDeleteTarget(null);
      await loadData();
    }
  };

  // Filtragem de filmes para o seletor
  const filteredFilmsForPicker = filmes.filter((f) => {
    if (!filmSearchQuery.trim()) return true;
    const q = filmSearchQuery.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      (f.year && String(f.year).includes(q)) ||
      (f.legacy_director_name && f.legacy_director_name.toLowerCase().includes(q))
    );
  });

  // Filtragem de pessoas para o seletor
  const filteredPersonsForPicker = pessoas.filter((p) => {
    if (!personSearchQuery.trim()) return true;
    const q = personSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.primary_roles && p.primary_roles.some((r) => r.toLowerCase().includes(q)))
    );
  });

  const selectedFilm = filmes.find((f) => f.id === editing?.film_id);
  const selectedPerson = pessoas.find((p) => p.id === editing?.person_id);

  // Filtragem da tabela principal
  const filteredItems = items.filter((item) => {
    const effectiveStatus = getEffectiveEditorialStatus(item, undefined, currentTime);

    if (statusFilter !== 'todos') {
      if (statusFilter === 'published' && effectiveStatus !== 'published') return false;
      if (statusFilter === 'scheduled' && effectiveStatus !== 'scheduled') return false;
      if (statusFilter === 'draft' && item.status !== 'draft') return false;
      if (statusFilter === 'archived' && item.status !== 'archived') return false;
      if (statusFilter === 'destaque' && !item.highlight_home) return false;
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchFilm = item.film?.title.toLowerCase().includes(q);
      const matchPerson = item.person?.name.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      const matchTag = item.tags?.some((t) => t.name.toLowerCase().includes(q));
      if (!matchTitle && !matchFilm && !matchPerson && !matchContent && !matchTag) return false;
    }

    return true;
  });

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-4">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
          >
            <ArrowLeft size={14} /> Voltar para lista
          </button>

          <button
            type="button"
            onClick={handleOpenPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase hover:bg-[#F5F2ED] transition-colors"
          >
            <Eye size={14} /> Visualizar Prévia
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-sans flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>Erro:</strong> {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
            <h2 className="text-xl font-serif-display text-[#1A1A1A]">
              {editing.id ? 'Editar Uma Imagem, Uma Ideia' : 'Nova Publicação: Uma Imagem, Uma Ideia'}
            </h2>
            <span className="text-[10px] font-mono text-[#1A1A1A]/50 uppercase">
              Supabase public.uma_imagem
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Título da Imagem / Conceito *
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
                    slug: editing.slug || slugifyUmaImagem(val),
                  });
                }}
                placeholder="Ex: A Luz que Atravessa as Árvores em Komorebi"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Slug (URL) *
              </label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem Principal (Alta Resolução)"
                value={editing.image_url}
                onChange={(url) => setEditing({ ...editing, image_url: url })}
                required
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[#1A1A1A]/80 font-bold uppercase">
                Texto Reflexivo / Micro-ensaio *
              </label>
              <div className="border border-[#1A1A1A]/15 bg-white">
                <RichTextToolbar
                  textareaRef={textareaRef}
                  content={editing.content}
                  onChange={(val) => setEditing({ ...editing, content: val })}
                />
                <textarea
                  ref={textareaRef}
                  rows={8}
                  required
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Escreva a reflexão associada a esta imagem..."
                  className="w-full p-4 text-sm font-serif-body text-[#1A1A1A] bg-white focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* SELETOR DE FILME RELACIONADO */}
            <div className="md:col-span-2 p-4 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                  <Film size={14} className="text-[#D4AF37]" />
                  Filme Relacionado no Acervo (Opcional)
                </label>
                {editing.film_id && selectedFilm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> {selectedFilm.title} {selectedFilm.year ? `(${selectedFilm.year})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, film_id: null })}
                      className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5"
                    >
                      <X size={12} /> Desvincular
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                    Nenhum filme vinculado
                  </span>
                )}
              </div>

              <p className="text-[11px] font-sans text-[#1A1A1A]/70 leading-relaxed">
                Vincule esta publicação diretamente a um filme de <code className="font-mono bg-white px-1 py-0.5 border border-[#1A1A1A]/15">public.filmes</code> para conectar a ficha técnica e metadados.
              </p>

              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[#1A1A1A]/40" />
                  <input
                    type="text"
                    placeholder="Pesquisar filme por título, ano ou diretor..."
                    value={filmSearchQuery}
                    onChange={(e) => setFilmSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-[#1A1A1A]/15 bg-white divide-y divide-[#1A1A1A]/5">
                  {filmes.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#1A1A1A]/60 font-sans">
                      Nenhum filme cadastrado no catálogo.
                    </div>
                  ) : filteredFilmsForPicker.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#1A1A1A]/60 font-sans">
                      Nenhum filme corresponde à busca &ldquo;{filmSearchQuery}&rdquo;.
                    </div>
                  ) : (
                    filteredFilmsForPicker.slice(0, 15).map((f) => {
                      const isSelected = editing.film_id === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setEditing({ ...editing, film_id: f.id });
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
                                className="w-6 h-8 object-cover border border-[#1A1A1A]/20 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-8 bg-[#1A1A1A]/10 flex items-center justify-center flex-shrink-0">
                                <Film size={10} className="opacity-40" />
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-bold">{f.title}</span>
                              <span className="opacity-70 ml-1.5">
                                {f.year ? `(${f.year})` : ''}
                              </span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* SELETOR DE PESSOA RELACIONADA */}
            <div className="md:col-span-2 p-4 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                  <User size={14} className="text-[#D4AF37]" />
                  Pessoa / Cineasta Relacionado (Opcional)
                </label>
                {editing.person_id && selectedPerson ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> {selectedPerson.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, person_id: null })}
                      className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5"
                    >
                      <X size={12} /> Desvincular
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                    Nenhuma pessoa vinculada
                  </span>
                )}
              </div>

              <p className="text-[11px] font-sans text-[#1A1A1A]/70 leading-relaxed">
                Vincule esta publicação a uma Pessoa cadastrada em <code className="font-mono bg-white px-1 py-0.5 border border-[#1A1A1A]/15">public.pessoas</code>.
              </p>

              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[#1A1A1A]/40" />
                  <input
                    type="text"
                    placeholder="Pesquisar pessoa por nome ou função..."
                    value={personSearchQuery}
                    onChange={(e) => setPersonSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-[#1A1A1A]/15 bg-white divide-y divide-[#1A1A1A]/5">
                  {pessoas.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#1A1A1A]/60 font-sans">
                      Nenhuma pessoa cadastrada no catálogo.
                    </div>
                  ) : filteredPersonsForPicker.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#1A1A1A]/60 font-sans">
                      Nenhuma pessoa corresponde à busca &ldquo;{personSearchQuery}&rdquo;.
                    </div>
                  ) : (
                    filteredPersonsForPicker.slice(0, 15).map((p) => {
                      const isSelected = editing.person_id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setEditing({ ...editing, person_id: p.id });
                            setPersonSearchQuery('');
                          }}
                          className={`w-full text-left p-2.5 flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#1A1A1A] text-[#F5F2ED]'
                              : 'hover:bg-[#F5F2ED] text-[#1A1A1A]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.name}
                                className="w-6 h-6 rounded-full object-cover border border-[#1A1A1A]/20 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center flex-shrink-0">
                                <User size={10} className="opacity-40" />
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-bold">{p.name}</span>
                              {p.primary_roles && p.primary_roles.length > 0 && (
                                <span className="opacity-70 ml-1.5">
                                  ({p.primary_roles.join(', ')})
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* TAGS */}
            <div className="md:col-span-2">
              <TagInput
                tags={editing.tags || []}
                onChange={(newTags) => setEditing({ ...editing, tags: newTags })}
              />
            </div>

            {/* AUTORIA EDITORIAL */}
            <div className="md:col-span-2 p-4 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-3">
              <EditorialCreditsEditor
                credits={credits}
                onChange={setCredits}
                defaultRole="Texto"
                disabled={saving}
              />
            </div>

            {/* STATUS E DATAS */}
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Status</label>
              <select
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as ContentStatus })}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="scheduled">Agendado</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            <div>
              {editing.status === 'scheduled' ? (
                <div>
                  <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                    Data e Hora do Agendamento *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editing.scheduledAt || ''}
                    onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value })}
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                    Data Editorial de Publicação
                  </label>
                  <input
                    type="date"
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2 pt-2 border-t border-[#1A1A1A]/10">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-sans font-bold text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={editing.highlight_home}
                  onChange={(e) => setEditing({ ...editing, highlight_home: e.target.checked })}
                  className="w-4 h-4 accent-[#1A1A1A]"
                />
                <span className="flex items-center gap-1">
                  <Sparkles size={14} className="text-[#D4AF37]" /> Destacar na Home Principal
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(null)}
              className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase disabled:opacity-50"
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
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Publicação</span>
                </>
              )}
            </button>
          </div>
        </form>

        {previewItem && (
          <ArticlePreviewModal
            item={previewItem}
            itemType="uma_imagem"
            onClose={() => setPreviewItem(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Uma Imagem, Uma Ideia</h2>
          <p className="text-xs text-[#1A1A1A]/60 font-sans">
            Gerenciamento editorial conectado diretamente a <code className="font-mono">public.uma_imagem</code>
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#1A1A1A]/80 transition-colors"
        >
          <Plus size={14} /> Nova Publicação
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-sans flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Controles de Busca e Filtros */}
      <div className="bg-white border border-[#1A1A1A]/15 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-2.5 text-[#1A1A1A]/40" />
          <input
            type="text"
            placeholder="Buscar por título, filme, pessoa ou conteúdo..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase font-bold text-[#1A1A1A]/60">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-1.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          >
            <option value="todos">Todos ({items.length})</option>
            <option value="published">
              Publicados (
              {
                items.filter(
                  (i) =>
                    getEffectiveEditorialStatus(i, undefined, currentTime) ===
                    'published'
                ).length
              }
              )
            </option>
            <option value="scheduled">
              Agendados (
              {
                items.filter(
                  (i) =>
                    getEffectiveEditorialStatus(i, undefined, currentTime) ===
                    'scheduled'
                ).length
              }
              )
            </option>
            <option value="draft">
              Rascunhos ({items.filter((i) => i.status === 'draft').length})
            </option>
            <option value="archived">
              Arquivados ({items.filter((i) => i.status === 'archived').length})
            </option>
            <option value="destaque">
              Destaques ({items.filter((i) => i.highlight_home).length})
            </option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center text-xs font-sans text-[#1A1A1A]/60 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Carregando publicações do Supabase...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
          <p className="text-sm font-serif-body text-[#1A1A1A]/70">
            Nenhuma publicação de &ldquo;Uma Imagem, Uma Ideia&rdquo; cadastrada no banco de dados.
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Criar Primeira Publicação
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-[#1A1A1A]/15 p-8 text-center text-xs text-[#1A1A1A]/60 font-sans">
          Nenhuma publicação encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
          <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
            <thead>
              <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60 bg-[#F5F2ED]/50">
                <th className="py-3 px-4">Imagem</th>
                <th className="py-3 px-4">Título / Conceito</th>
                <th className="py-3 px-4">Filme / Pessoa</th>
                <th className="py-3 px-4">Autoria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data Editorial</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {filteredItems.map((u) => {
                const effectiveStatus = getEffectiveEditorialStatus(u, undefined, currentTime);

                const sourceDate =
                  u.status === 'scheduled' && u.scheduled_at
                    ? u.scheduled_at
                    : u.published_at || u.created_at;

                return (
                  <tr key={u.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                    <td className="py-3 px-4 w-16">
                      {u.image_url ? (
                        <img
                          src={u.image_url}
                          alt={u.title}
                          className="w-12 h-8 object-cover border border-[#1A1A1A]/15"
                        />
                      ) : (
                        <div className="w-12 h-8 bg-[#1A1A1A]/10 border border-[#1A1A1A]/15" />
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1A1A1A] max-w-xs">
                      <div className="truncate">{u.title}</div>
                      <div className="text-[10px] font-mono font-normal text-[#1A1A1A]/50 truncate">
                        /{u.slug}
                      </div>
                      {u.highlight_home && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#D4AF37] font-bold mt-0.5">
                          <Sparkles size={10} /> Destaque Home
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#1A1A1A]/70 max-w-[200px]">
                      {u.film?.title ? (
                        <div className="truncate font-medium text-[#1A1A1A]">
                          🎬 {u.film.title} {u.film.year ? `(${u.film.year})` : ''}
                        </div>
                      ) : null}
                      {u.person?.name ? (
                        <div className="truncate text-[11px] text-[#1A1A1A]/60">
                          👤 {u.person.name}
                        </div>
                      ) : null}
                      {!u.film?.title && !u.person?.name && '—'}
                    </td>
                    <td className="py-3 px-4 text-[#1A1A1A]/70 max-w-[160px]">
                      {u.authors && u.authors.length > 0 ? (
                        <div className="truncate">
                          {u.authors.map((a) => a.member?.name || 'Integrante').join(', ')}
                        </div>
                      ) : (
                        <span className="text-[#1A1A1A]/40 italic">Sem créditos</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] uppercase whitespace-nowrap">
                      {effectiveStatus === 'published' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">
                          PUBLICADO
                        </span>
                      )}
                      {effectiveStatus === 'scheduled' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">
                          AGENDADO
                        </span>
                      )}
                      {effectiveStatus === 'draft' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">
                          RASCUNHO
                        </span>
                      )}
                      {effectiveStatus === 'archived' && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">
                          ARQUIVADO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                      {formatEditorialDate(sourceDate)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const domainModel = mapSupabaseUmaImagemToDomain(u);
                            setPreviewItem(domainModel);
                          }}
                          className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] transition-colors"
                          title="Visualizar Prévia"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(u)}
                          className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: u.id, title: u.title })}
                          className="p-1.5 hover:bg-red-50 text-red-600 transition-colors"
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

      {previewItem && (
        <ArticlePreviewModal
          item={previewItem}
          itemType="uma_imagem"
          onClose={() => setPreviewItem(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Uma Imagem, Uma Ideia"
          message={`Tem certeza de que deseja excluir permanentemente a publicação "${deleteTarget.title}"?`}
          confirmLabel="Excluir Publicação"
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
