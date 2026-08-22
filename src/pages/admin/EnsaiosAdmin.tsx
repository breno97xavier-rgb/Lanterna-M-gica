import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, Eye, ArrowLeft, AlertTriangle, Loader2, Search } from 'lucide-react';
import { ContentStatus, Ensaio } from '../../types';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { EditorialCreditsEditor, EditorialCreditItem } from '../../components/admin/EditorialCreditsEditor';
import {
  fetchEnsaios,
  createEnsaio,
  updateEnsaio,
  deleteEnsaio,
  mapSupabaseEnsaioToEnsaio,
  slugifyEnsaio,
  calculateReadTimeMinutes,
  SupabaseEnsaio,
} from '../../services/repositories/ensaiosRepository';
import {
  fetchEnsaioAuthors,
  syncEnsaioAuthors,
} from '../../services/repositories/editorialAuthorsRepository';
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

interface EnsaiosAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

interface EditingEnsaioForm {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  coverImage: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  date: string;
  scheduledAt?: string;
  readTimeMinutes: number;
  highlightHome: boolean;
  status: ContentStatus;
  seoTitle?: string;
  seoDescription?: string;
}

export const EnsaiosAdmin: React.FC<EnsaiosAdminProps> = ({ onNotify, autoCreate = false }) => {
  const currentTime = useEditorialTicker(30000);
  const [ensaios, setEnsaios] = useState<SupabaseEnsaio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<EditingEnsaioForm | null>(null);
  const [credits, setCredits] = useState<EditorialCreditItem[]>([]);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [previewItem, setPreviewItem] = useState<Ensaio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [slugWarning, setSlugWarning] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await fetchEnsaios({ allStatuses: true });
    if (error) {
      setErrorMessage(error.message || 'Erro ao carregar ensaios do Supabase.');
      setEnsaios([]);
    } else {
      setEnsaios(data || []);
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
      subtitle: '',
      coverImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1600',
      content: '',
      category: 'Filosofia & Estética',
      tags: ['Cinema', 'Pensamento'],
      author: 'Redação Lanterna Mágica',
      date: getTodayLocalDateString(),
      scheduledAt: getNowDateTimeLocalString(30),
      readTimeMinutes: 5,
      highlightHome: false,
      status: 'published',
      seoTitle: '',
      seoDescription: '',
    });
    setCredits([]);
    setIsUnsaved(false);
    setSlugWarning('');
  };

  const handleEdit = async (item: SupabaseEnsaio) => {
    const sourceDate = item.status === 'scheduled' && item.scheduled_at
      ? item.scheduled_at
      : item.published_at || item.created_at;

    setEditing({
      id: item.id,
      title: item.title,
      slug: item.slug,
      subtitle: item.subtitle || '',
      coverImage: item.cover_image || '',
      content: item.content || '',
      category: item.category || 'Filosofia & Estética',
      tags: item.tags?.map((t) => t.name) || [],
      author: item.author || 'Redação Lanterna Mágica',
      date: getEditorialDateString(sourceDate),
      scheduledAt: formatIsoForDateTimeInput(item.scheduled_at) || getNowDateTimeLocalString(30),
      readTimeMinutes: item.read_time_minutes ?? 5,
      highlightHome: Boolean(item.highlight_home),
      status: item.status,
      seoTitle: item.seo_title || '',
      seoDescription: item.seo_description || '',
    });

    if (item.authors && item.authors.length > 0) {
      setCredits(
        item.authors.map((a) => ({
          memberId: a.memberId,
          roleName: a.roleName,
          orderIndex: a.orderIndex,
        }))
      );
    } else {
      // Busca autores vinculados caso não estejam pré-carregados
      const { data: authorCredits } = await fetchEnsaioAuthors(item.id);
      if (authorCredits && authorCredits.length > 0) {
        setCredits(
          authorCredits.map((a) => ({
            memberId: a.memberId,
            roleName: a.roleName,
            orderIndex: a.orderIndex,
          }))
        );
      } else {
        setCredits([]);
      }
    }

    setIsUnsaved(false);
    setSlugWarning('');
  };

  const handleTitleChange = (val: string) => {
    if (!editing) return;
    const generatedSlug = slugifyEnsaio(val);
    const newSlug = editing.slug && editing.id ? editing.slug : generatedSlug;

    setEditing({
      ...editing,
      title: val,
      slug: newSlug,
    });
    setIsUnsaved(true);

    const duplicate = ensaios.some((e) => e.slug === newSlug && e.id !== editing.id);
    if (duplicate) {
      setSlugWarning('Atenção: Já existe outro ensaio com esta mesma URL (slug).');
    } else {
      setSlugWarning('');
    }
  };

  const handleContentChange = (contentVal: string) => {
    if (!editing) return;
    const calculatedMinutes = calculateReadTimeMinutes(contentVal);

    setEditing({
      ...editing,
      content: contentVal,
      readTimeMinutes: calculatedMinutes,
    });
    setIsUnsaved(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.title.trim() || !editing.slug.trim() || !editing.content.trim()) {
      onNotify('Atenção: Por favor, preencha o Título, Slug e Texto do Ensaio.');
      return;
    }

    setSaving(true);

    let publishedAt: string | null = null;
    let scheduledAt: string | null = null;

    if (editing.status === 'published') {
      publishedAt = editing.date ? parseDateInputToIso(editing.date) : new Date().toISOString();
      scheduledAt = null;
    } else if (editing.status === 'scheduled') {
      scheduledAt = editing.scheduledAt
        ? parseDateTimeInputToIso(editing.scheduledAt)
        : (editing.date ? parseDateTimeInputToIso(`${editing.date}T12:00`) : new Date().toISOString());
      publishedAt = null;
    } else {
      publishedAt = null;
      scheduledAt = null;
    }

    let ensaioId = editing.id;

    if (editing.id) {
      // Atualizar ensaio existente
      const { data, error } = await updateEnsaio(editing.id, {
        title: editing.title,
        slug: editing.slug,
        subtitle: editing.subtitle,
        cover_image: editing.coverImage,
        content: editing.content,
        category: editing.category,
        author: editing.author,
        read_time_minutes: editing.readTimeMinutes,
        highlight_home: editing.highlightHome,
        status: editing.status,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        seo_title: editing.seoTitle || null,
        seo_description: editing.seoDescription || null,
        tags: editing.tags,
      });

      if (error) {
        setSaving(false);
        onNotify(`Erro ao salvar: ${error.message}`);
        return;
      }
      ensaioId = editing.id;
    } else {
      // Criar novo ensaio
      const { data, error } = await createEnsaio({
        title: editing.title,
        slug: editing.slug,
        subtitle: editing.subtitle,
        cover_image: editing.coverImage,
        content: editing.content,
        category: editing.category,
        author: editing.author,
        read_time_minutes: editing.readTimeMinutes,
        highlight_home: editing.highlightHome,
        status: editing.status,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        seo_title: editing.seoTitle || null,
        seo_description: editing.seoDescription || null,
        tags: editing.tags,
      });

      if (error || !data) {
        setSaving(false);
        onNotify(`Erro ao criar: ${error?.message || 'Falha desconhecida.'}`);
        return;
      }
      ensaioId = data.id;
    }

    // Sincroniza créditos de autoria relacional via RPC transacional
    if (ensaioId) {
      const { success: syncOk, error: syncErr } = await syncEnsaioAuthors(
        ensaioId,
        credits.map((c) => ({
          member_id: c.memberId,
          role_name: c.roleName,
          order_index: c.orderIndex,
        }))
      );

      setSaving(false);

      if (!syncOk && syncErr) {
        onNotify(
          `Ensaio salvo com sucesso, porém ocorreu um erro ao salvar os créditos de equipe: ${syncErr.message}. Por favor, edite o ensaio para salvar os autores.`
        );
      } else {
        onNotify(
          editing.id
            ? 'Ensaio e créditos de autoria atualizados com sucesso!'
            : 'Ensaio publicado e créditos vinculados com sucesso!'
        );
      }
    } else {
      setSaving(false);
    }

    setEditing(null);
    setIsUnsaved(false);
    loadData();
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { success, error } = await deleteEnsaio(deleteTarget.id);
    setDeleting(false);

    if (error) {
      onNotify(`Erro ao excluir: ${error.message}`);
      return;
    }

    onNotify(`Ensaio "${deleteTarget.title}" excluído do Supabase.`);
    setDeleteTarget(null);
    loadData();
  };

  const openPreview = () => {
    if (!editing) return;
    const tempEnsaio: Ensaio = {
      id: editing.id || 'preview-id',
      title: editing.title,
      slug: editing.slug,
      subtitle: editing.subtitle,
      coverImage: editing.coverImage,
      content: editing.content,
      category: editing.category,
      tags: editing.tags,
      author: editing.author,
      date: editing.date,
      readTimeMinutes: editing.readTimeMinutes,
      highlightHome: editing.highlightHome,
      status: editing.status,
      seoTitle: editing.seoTitle,
      seoDescription: editing.seoDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPreviewItem(tempEnsaio);
  };

  const filteredEnsaios = ensaios.filter((e) => {
    // Search query
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchSubtitle = (e.subtitle || '').toLowerCase().includes(q);
      const matchAuthor = (e.author || '').toLowerCase().includes(q);
      const matchCategory = (e.category || '').toLowerCase().includes(q);
      const matchContent = (e.content || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSubtitle && !matchAuthor && !matchCategory && !matchContent) {
        return false;
      }
    }

    // Status filter (utiliza status editorial efetivo para agendamentos já liberados)
    if (statusFilter !== 'todos') {
      const effectiveStatus = getEffectiveEditorialStatus(e, undefined, currentTime);
      if (effectiveStatus !== statusFilter) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== 'todos' && e.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  const categories = Array.from(new Set(ensaios.map((e) => e.category).filter(Boolean)));

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between border-b border-[#1A1A1A]/15 pb-4 gap-2">
          <button
            type="button"
            onClick={() => {
              if (isUnsaved && !confirm('Você possui alterações não salvas. Deseja sair assim mesmo?')) return;
              setEditing(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
          >
            <ArrowLeft size={14} /> Voltar para lista
          </button>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-semibold ${isUnsaved ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isUnsaved ? '• Alterações não salvas' : '✓ Sincronizado'}
            </span>

            <button
              type="button"
              onClick={openPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase hover:bg-[#F5F2ED]"
            >
              <Eye size={14} /> Visualizar Prévia
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <h2 className="text-xl font-serif-display text-[#1A1A1A]">
            {editing.id ? 'Editar Ensaio' : 'Novo Ensaio'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Título *</label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: O Silêncio como Linguagem no Cinema..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Slug (URL) *</label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) => {
                  setEditing({ ...editing, slug: e.target.value });
                  setIsUnsaved(true);
                  const dup = ensaios.some((item) => item.slug === e.target.value && item.id !== editing.id);
                  setSlugWarning(dup ? 'Atenção: Já existe outro ensaio com esta mesma URL (slug).' : '');
                }}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
              {slugWarning && (
                <p className="text-[10px] text-amber-700 font-mono mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> {slugWarning}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Subtítulo / Premissa</label>
              <input
                type="text"
                value={editing.subtitle}
                onChange={(e) => {
                  setEditing({ ...editing, subtitle: e.target.value });
                  setIsUnsaved(true);
                }}
                placeholder="Resumo editorial ou premissa reflexiva..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem de Capa do Ensaio *"
                value={editing.coverImage}
                onChange={(url) => {
                  setEditing({ ...editing, coverImage: url });
                  setIsUnsaved(true);
                }}
                required
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[#1A1A1A]/80 font-bold uppercase">Corpo do Ensaio *</label>
                <span className="text-[10px] font-mono text-[#1A1A1A]/60">
                  Tempo estimado de leitura: ~{editing.readTimeMinutes || 1} min
                </span>
              </div>
              <div className="border border-[#1A1A1A]/15 bg-white">
                <RichTextToolbar
                  textareaRef={textareaRef}
                  content={editing.content}
                  onChange={handleContentChange}
                />
                <textarea
                  ref={textareaRef}
                  rows={14}
                  required
                  value={editing.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Escreva o texto completo do ensaio com formatação Markdown (headings, citações, parágrafos)..."
                  className="w-full p-4 text-sm font-serif-body text-[#1A1A1A] bg-white focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Gestão de Autoria Relacional (Equipe Editorial) */}
            <div className="md:col-span-2">
              <EditorialCreditsEditor
                credits={credits}
                onChange={(newCredits) => {
                  setCredits(newCredits);
                  setIsUnsaved(true);
                }}
                defaultRole="Texto"
                title="Autoria & Créditos Editoriais (Equipe)"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Categoria</label>
              <input
                type="text"
                value={editing.category}
                onChange={(e) => {
                  setEditing({ ...editing, category: e.target.value });
                  setIsUnsaved(true);
                }}
                placeholder="Ex: Filosofia & Estética"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Assinatura Textual Alternativa / Legada
              </label>
              <input
                type="text"
                value={editing.author}
                onChange={(e) => {
                  setEditing({ ...editing, author: e.target.value });
                  setIsUnsaved(true);
                }}
                placeholder="Nome do autor ou Redação (Fallback textual)"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A]"
              />
              <span className="text-[10px] text-[#1A1A1A]/60 font-sans block mt-1">
                Utilizado apenas como fallback quando nenhum integrante da equipe for associado acima.
              </span>
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
                <option value="draft">Rascunho (Privado no banco)</option>
                <option value="scheduled">Agendado (Publica na data programada)</option>
                <option value="archived">Arquivado (Oculto das listagens)</option>
              </select>
            </div>

            {editing.status === 'scheduled' && (
              <div className="md:col-span-2 bg-[#F5F2ED] p-3 border border-[#1A1A1A]/10 space-y-1">
                <label className="block text-[#1A1A1A]/80 font-bold uppercase text-[11px]">
                  Data e Hora do Agendamento *
                </label>
                <input
                  type="datetime-local"
                  value={editing.scheduledAt || ''}
                  onChange={(e) => {
                    setEditing({ ...editing, scheduledAt: e.target.value });
                    setIsUnsaved(true);
                  }}
                  className="w-full bg-white border border-[#1A1A1A]/15 p-2 text-xs font-mono"
                />
                <p className="text-[10px] text-[#1A1A1A]/60 font-mono">
                  O ensaio ficará acessível publicamente assim que o horário estipulado for atingido.
                </p>
              </div>
            )}

            <div className="md:col-span-2 pt-2 border-t border-[#1A1A1A]/10">
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
                <span>Destacar no Carrossel Principal da Home (Até 4 destaques max)</span>
              </label>
            </div>

            {/* SEO Metadata */}
            <div className="md:col-span-2 pt-4 border-t border-[#1A1A1A]/10 space-y-3">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/60 block">
                Otimização para Buscadores (SEO — Opcional)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#1A1A1A]/70 mb-1 font-medium">Título SEO</label>
                  <input
                    type="text"
                    value={editing.seoTitle || ''}
                    onChange={(e) => {
                      setEditing({ ...editing, seoTitle: e.target.value });
                      setIsUnsaved(true);
                    }}
                    placeholder="Título para motores de busca"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[#1A1A1A]/70 mb-1 font-medium">Descrição SEO</label>
                  <input
                    type="text"
                    value={editing.seoDescription || ''}
                    onChange={(e) => {
                      setEditing({ ...editing, seoDescription: e.target.value });
                      setIsUnsaved(true);
                    }}
                    placeholder="Meta description de até 160 caracteres"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-sans"
                  />
                </div>
              </div>
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
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Ensaio</span>
                </>
              )}
            </button>
          </div>
        </form>

        {previewItem && (
          <ArticlePreviewModal
            item={previewItem}
            itemType="ensaio"
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
          <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Gestão de Ensaios</h2>
          <p className="text-xs font-mono text-[#1A1A1A]/60 mt-0.5">
            Fonte de dados: Supabase (public.ensaios)
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <Plus size={14} /> Novo Ensaio
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-mono">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white border border-[#1A1A1A]/15 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-2.5 text-[#1A1A1A]/40" />
          <input
            type="text"
            placeholder="Pesquisar por título, subtítulo, autor ou conteúdo..."
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
            <option value="todos">Todos os Status ({ensaios.length})</option>
            <option value="published">
              Publicados ({ensaios.filter((e) => getEffectiveEditorialStatus(e, undefined, currentTime) === 'published').length})
            </option>
            <option value="draft">
              Rascunhos ({ensaios.filter((e) => getEffectiveEditorialStatus(e, undefined, currentTime) === 'draft').length})
            </option>
            <option value="scheduled">
              Agendados ({ensaios.filter((e) => getEffectiveEditorialStatus(e, undefined, currentTime) === 'scheduled').length})
            </option>
            <option value="archived">
              Arquivados ({ensaios.filter((e) => getEffectiveEditorialStatus(e, undefined, currentTime) === 'archived').length})
            </option>
          </select>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2.5 py-1.5 font-mono text-xs"
            >
              <option value="todos">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          <span className="text-xs font-mono text-[#1A1A1A]/60 ml-2">
            Total: {filteredEnsaios.length}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-[#D4AF37] mx-auto" />
          <p className="text-xs font-mono text-[#1A1A1A]/60">Carregando ensaios do Supabase...</p>
        </div>
      ) : filteredEnsaios.length === 0 ? (
        <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-4">
          <h3 className="font-serif-display text-lg text-[#1A1A1A]">
            {tableSearch || statusFilter !== 'todos' || categoryFilter !== 'todos'
              ? 'Nenhum ensaio encontrado com os filtros selecionados.'
              : 'Nenhum ensaio cadastrado no banco'}
          </h3>
          <p className="text-xs font-serif-body text-[#1A1A1A]/60 max-w-md mx-auto">
            {tableSearch || statusFilter !== 'todos' || categoryFilter !== 'todos'
              ? 'Tente ajustar os termos de pesquisa ou os filtros de status e categoria.'
              : 'Cadastre um novo ensaio para publicá-lo diretamente no catálogo do Lanterna Mágica.'}
          </p>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Criar Primeiro Ensaio
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
          <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
            <thead>
              <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60 bg-[#F5F2ED]/60">
                <th className="py-3 px-4">Título</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Home</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {filteredEnsaios.map((e) => (
                <tr key={e.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-[#1A1A1A] max-w-sm truncate">
                    <div>
                      <span className="font-bold">{e.title}</span>
                      <span className="block text-[10px] font-mono text-[#1A1A1A]/50">/{e.slug}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#1A1A1A]/70">{e.category}</td>
                  <td className="py-3 px-4 font-mono text-[10px] uppercase">
                    {(() => {
                      const effectiveStatus = getEffectiveEditorialStatus(e, undefined, currentTime);
                      if (effectiveStatus === 'published') {
                        return (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">
                            PUBLICADO
                          </span>
                        );
                      }
                      if (effectiveStatus === 'draft') {
                        return (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">
                            RASCUNHO
                          </span>
                        );
                      }
                      if (effectiveStatus === 'scheduled') {
                        return (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">
                            AGENDADO
                          </span>
                        );
                      }
                      if (effectiveStatus === 'archived') {
                        return (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">
                            ARQUIVADO
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#1A1A1A]/70">
                    {formatEditorialDate(
                      e.status === 'scheduled' ? e.scheduled_at : e.published_at || e.created_at,
                      'short'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {e.tags && e.tags.length > 0 ? (
                        e.tags.map((t) => (
                          <span
                            key={t.id}
                            className="px-1.5 py-0.5 bg-[#F5F2ED] text-[#1A1A1A]/70 text-[9px] font-mono border border-[#1A1A1A]/10"
                          >
                            {t.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#1A1A1A]/40 font-mono">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {e.highlight_home ? (
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5">SIM</span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#1A1A1A]/40">NÃO</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(e)}
                        className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: e.id, title: e.title })}
                        className="p-1.5 hover:bg-red-50 text-red-600"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewItem && (
        <ArticlePreviewModal
          item={previewItem}
          itemType="ensaio"
          onClose={() => setPreviewItem(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Ensaio"
          message={`Tem certeza de que deseja excluir permanentemente o ensaio "${deleteTarget.title}" do Supabase? Esta ação é irreversível.`}
          confirmLabel={deleting ? 'Excluindo...' : 'Excluir Ensaio'}
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
