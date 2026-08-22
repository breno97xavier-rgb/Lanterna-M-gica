import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Sparkles,
  FileText,
  List as ListIcon,
  ArrowUp,
  ArrowDown,
  Layers,
  Link as LinkIcon,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  Especial,
  EspecialItem,
  EspecialItemType,
  ContentStatus,
} from '../../types';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal';
import {
  EditorialCreditsEditor,
  EditorialCreditItem,
} from '../../components/admin/EditorialCreditsEditor';
import {
  fetchEspeciais,
  fetchEspecialById,
  createEspecial,
  updateEspecial,
  deleteEspecial,
  slugifyEspecial,
  EspecialItemInput,
} from '../../services/repositories/especiaisRepository';
import { fetchEnsaios, SupabaseEnsaio } from '../../services/repositories/ensaiosRepository';
import { fetchCriticas, SupabaseCritica } from '../../services/repositories/criticasRepository';
import { fetchUmaImagem, SupabaseUmaImagem } from '../../services/repositories/umaImagemRepository';
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
  useEditorialTicker,
  getEditorialStatusBadgeInfo,
} from '../../utils/statusUtils';

interface EspeciaisAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

interface FormState {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  coverImage: string;
  intro: string;
  content: string;
  relatedPersonId: string | null;
  highlightHome: boolean;
  date: string;
  scheduledAt?: string;
  status: ContentStatus;
  legacyId?: string;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600';

export const EspeciaisAdmin: React.FC<EspeciaisAdminProps> = ({ onNotify, autoCreate = false }) => {
  const currentTime = useEditorialTicker(30000);

  // Listagem & Estado Geral
  const [especiais, setEspeciais] = useState<Especial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Entidades para Vinculação e Seleção
  const [ensaios, setEnsaios] = useState<SupabaseEnsaio[]>([]);
  const [criticas, setCriticas] = useState<SupabaseCritica[]>([]);
  const [umaImagem, setUmaImagem] = useState<SupabaseUmaImagem[]>([]);
  const [filmes, setFilmes] = useState<SupabaseFilme[]>([]);
  const [pessoas, setPessoas] = useState<SupabasePessoa[]>([]);
  const [entitiesLoaded, setEntitiesLoaded] = useState(false);

  // Estado de Edição
  const [editing, setEditing] = useState<FormState | null>(null);
  const [items, setItems] = useState<EspecialItem[]>([]);
  const [credits, setCredits] = useState<EditorialCreditItem[]>([]);
  const [previewItem, setPreviewItem] = useState<Especial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Sub-painel: Adição de Itens ao Dossiê
  const [selectedItemType, setSelectedItemType] = useState<EspecialItemType>('ensaio');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [itemCustomLabel, setItemCustomLabel] = useState<string>('');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

  // Sub-painel: Busca de Pessoa Relacionada
  const [personSearchQuery, setPersonSearchQuery] = useState<string>('');

  // Filtros da Tabela
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [homeFilter, setHomeFilter] = useState('todos');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Carrega listagem de Especiais
  const loadEspeciais = async () => {
    setLoading(true);
    setErrorMessage(null);
    const res = await fetchEspeciais({ allStatuses: true });
    if (res.error) {
      setErrorMessage(`Erro ao carregar Cadernos Especiais: ${res.error.message}`);
      setEspeciais([]);
    } else {
      setEspeciais(res.data || []);
    }
    setLoading(false);
  };

  // Carrega entidades auxiliares para seleção nos seletores (lazy ou on mount)
  const loadAuxiliaryEntities = async () => {
    if (entitiesLoaded) return;
    try {
      const [ensRes, critRes, umaRes, filmRes, pesRes] = await Promise.all([
        fetchEnsaios({ allStatuses: true }),
        fetchCriticas({ allStatuses: true }),
        fetchUmaImagem({ allStatuses: true }),
        fetchFilmes({ allStatuses: true }),
        fetchPessoas({ allStatuses: true }),
      ]);

      if (ensRes.data) setEnsaios(ensRes.data);
      if (critRes.data) setCriticas(critRes.data);
      if (umaRes.data) setUmaImagem(umaRes.data);
      if (filmRes.data) setFilmes(filmRes.data);
      if (pesRes.data) setPessoas(pesRes.data);

      setEntitiesLoaded(true);
    } catch (err) {
      console.error('Erro ao carregar entidades para seletores de Especiais:', err);
    }
  };

  useEffect(() => {
    loadEspeciais();
    loadAuxiliaryEntities();
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
      coverImage: DEFAULT_COVER,
      intro: '',
      content: '',
      relatedPersonId: null,
      highlightHome: false,
      date: getTodayLocalDateString(),
      scheduledAt: getNowDateTimeLocalString(30),
      status: 'published',
    });
    setItems([]);
    setCredits([]);
    setSelectedItemType('ensaio');
    setSelectedTargetId('');
    setItemCustomLabel('');
    setItemSearchQuery('');
    setPersonSearchQuery('');
    setErrorMessage(null);
  };

  const handleEdit = async (item: Especial) => {
    setLoading(true);
    setErrorMessage(null);

    // Carrega dados completos por ID para garantir itens e autores atualizados
    const { data: fullItem, error } = await fetchEspecialById(item.id, { includeDrafts: true });
    const current = fullItem || item;

    if (error) {
      console.warn('Aviso ao carregar detalhes completos do Especial:', error.message);
    }

    const sourceDate =
      current.status === 'scheduled' && current.scheduledAt
        ? current.scheduledAt
        : current.publishedAt || current.createdAt;

    setEditing({
      id: current.id,
      title: current.title,
      slug: current.slug,
      subtitle: current.subtitle || '',
      coverImage: current.coverImage || '',
      intro: current.intro || '',
      content: current.content || '',
      relatedPersonId: current.relatedPersonId || null,
      highlightHome: Boolean(current.highlightHome),
      date: getEditorialDateString(sourceDate),
      scheduledAt: formatIsoForDateTimeInput(current.scheduledAt) || getNowDateTimeLocalString(30),
      status: current.status,
      legacyId: current.legacyId || undefined,
    });

    setItems(current.items || []);
    setCredits(
      (current.authorCredits || []).map((ac, idx) => ({
        memberId: ac.memberId,
        roleName: ac.roleName || 'Curadoria',
        orderIndex: ac.orderIndex ?? idx,
      }))
    );

    setSelectedItemType('ensaio');
    setSelectedTargetId('');
    setItemCustomLabel('');
    setItemSearchQuery('');
    setPersonSearchQuery('');
    setLoading(false);
  };

  // Itens: Adição ao Dossiê
  const handleAddItemToDossier = () => {
    if (!selectedTargetId) {
      onNotify('Atenção: Selecione um conteúdo para adicionar ao dossiê.');
      return;
    }

    // Verifica se já foi adicionado
    const alreadyExists = items.some(
      (it) => it.itemType === selectedItemType && it.targetId === selectedTargetId
    );
    if (alreadyExists) {
      onNotify('Este item já está incluído no dossiê.');
      return;
    }

    // Constrói representação visual da entidade selecionada
    let entityData: any = null;
    if (selectedItemType === 'ensaio') {
      const found = ensaios.find((e) => e.id === selectedTargetId);
      if (found) {
        entityData = {
          id: found.id,
          title: found.title,
          subtitle: found.subtitle,
          category: found.category,
          date: found.published_at || found.created_at,
          coverImage: found.cover_image,
        };
      }
    } else if (selectedItemType === 'critica') {
      const found = criticas.find((c) => c.id === selectedTargetId);
      if (found) {
        entityData = {
          id: found.id,
          editorialTitle: found.editorial_title,
          movieTitle: found.movie_title || found.film?.title,
          rating: found.star_rating,
          coverImage: found.cover_image || found.film?.poster_url,
          year: found.film?.year,
        };
      }
    } else if (selectedItemType === 'uma_imagem') {
      const found = umaImagem.find((u) => u.id === selectedTargetId);
      if (found) {
        entityData = {
          id: found.id,
          title: found.title,
          imageUrl: found.image_url,
          date: found.published_at || found.created_at,
        };
      }
    } else if (selectedItemType === 'filme') {
      const found = filmes.find((f) => f.id === selectedTargetId);
      if (found) {
        entityData = {
          id: found.id,
          title: found.title,
          year: found.year,
          country: found.country,
          posterUrl: found.poster_url,
        };
      }
    } else if (selectedItemType === 'pessoa') {
      const found = pessoas.find((p) => p.id === selectedTargetId);
      if (found) {
        entityData = {
          id: found.id,
          name: found.name,
          role: found.primary_role,
          photoUrl: found.photo_url,
        };
      }
    }

    const newItem: EspecialItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      especialId: editing?.id || '',
      itemType: selectedItemType,
      targetId: selectedTargetId,
      customLabel: itemCustomLabel.trim() || undefined,
      orderIndex: items.length,
      createdAt: new Date().toISOString(),
      ensaio: selectedItemType === 'ensaio' ? entityData : undefined,
      critica: selectedItemType === 'critica' ? entityData : undefined,
      umaImagem: selectedItemType === 'uma_imagem' ? entityData : undefined,
      filme: selectedItemType === 'filme' ? entityData : undefined,
      pessoa: selectedItemType === 'pessoa' ? entityData : undefined,
      entity: entityData,
    };

    setItems([...items, newItem]);
    setSelectedTargetId('');
    setItemCustomLabel('');
    setItemSearchQuery('');
  };

  // Itens: Remoção
  const handleRemoveItem = (index: number) => {
    const updated = items
      .filter((_, idx) => idx !== index)
      .map((it, idx) => ({ ...it, orderIndex: idx }));
    setItems(updated);
  };

  // Itens: Reordenação Subir/Descer
  const handleMoveItemUp = (index: number) => {
    if (index <= 0) return;
    const next = [...items];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setItems(next.map((it, idx) => ({ ...it, orderIndex: idx })));
  };

  const handleMoveItemDown = (index: number) => {
    if (index >= items.length - 1) return;
    const next = [...items];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setItems(next.map((it, idx) => ({ ...it, orderIndex: idx })));
  };

  // Itens: Atualização de Rótulo Editorial (customLabel)
  const handleItemLabelChange = (index: number, newLabel: string) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      customLabel: newLabel.trim() ? newLabel : undefined,
    };
    setItems(next);
  };

  // Validação e Salvamento no Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.title.trim()) {
      onNotify('Atenção: O Título do Especial é obrigatório.');
      return;
    }

    if (!editing.coverImage.trim()) {
      onNotify('Atenção: A Imagem de capa do Especial é obrigatória.');
      return;
    }

    const finalSlug = editing.slug.trim() || slugifyEspecial(editing.title);

    let publishedAt: string | null = null;
    let scheduledAt: string | null = null;

    if (editing.status === 'published') {
      publishedAt = parseDateInputToIso(editing.date);
    } else if (editing.status === 'scheduled') {
      if (!editing.scheduledAt) {
        onNotify('Atenção: Para agendar a publicação, informe a data e hora desejadas.');
        return;
      }
      scheduledAt = parseDateTimeInputToIso(editing.scheduledAt);
      publishedAt = scheduledAt;
    } else if (editing.status === 'draft' || editing.status === 'archived') {
      publishedAt = editing.date ? parseDateInputToIso(editing.date) : null;
    }

    // Prepara payload de itens relacionais para o Especial
    const itemsPayload: EspecialItemInput[] = items.map((it, idx) => ({
      item_type: it.itemType,
      target_id: it.targetId,
      custom_label: it.customLabel || null,
      order_index: idx,
    }));

    // Prepara créditos autorais / curadoria
    const authorsPayload = credits.map((c, idx) => ({
      member_id: c.memberId,
      role_name: c.roleName?.trim() || 'Curadoria',
      order_index: idx,
    }));

    setSaving(true);
    setErrorMessage(null);

    if (editing.id) {
      // UPDATE
      const { data, itemsError, authorsError, error } = await updateEspecial(editing.id, {
        title: editing.title.trim(),
        slug: finalSlug,
        subtitle: editing.subtitle.trim(),
        cover_image: editing.coverImage.trim(),
        intro: editing.intro.trim(),
        content: editing.content.trim(),
        related_person_id: editing.relatedPersonId || null,
        highlight_home: editing.highlightHome,
        status: editing.status,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        items: itemsPayload,
        authors: authorsPayload,
      });

      setSaving(false);

      if (error) {
        setErrorMessage(`Falha ao atualizar Especial: ${error.message}`);
        onNotify(`Erro: ${error.message}`);
        return;
      }

      // Trata falhas parciais (itens ou autores)
      if (itemsError || authorsError) {
        const warnings: string[] = [];
        if (itemsError) warnings.push(`Itens do dossiê: ${itemsError.message}`);
        if (authorsError) warnings.push(`Autores/Curadoria: ${authorsError.message}`);
        const warningMsg = `Especial salvo, porém com ressalvas: ${warnings.join(' | ')}`;
        setErrorMessage(warningMsg);
        onNotify(warningMsg);
      } else {
        onNotify('Caderno Especial atualizado com sucesso!');
        setEditing(null);
      }

      loadEspeciais();
    } else {
      // CREATE
      const { data, itemsError, authorsError, error } = await createEspecial({
        title: editing.title.trim(),
        slug: finalSlug,
        subtitle: editing.subtitle.trim(),
        cover_image: editing.coverImage.trim(),
        intro: editing.intro.trim(),
        content: editing.content.trim(),
        related_person_id: editing.relatedPersonId || null,
        highlight_home: editing.highlightHome,
        status: editing.status,
        published_at: publishedAt,
        scheduled_at: scheduledAt,
        legacy_id: editing.legacyId,
        items: itemsPayload,
        authors: authorsPayload,
      });

      setSaving(false);

      if (error) {
        setErrorMessage(`Falha ao criar Especial: ${error.message}`);
        onNotify(`Erro: ${error.message}`);
        return;
      }

      // Trata falhas parciais em CREATE
      if (itemsError || authorsError) {
        const warnings: string[] = [];
        if (itemsError) warnings.push(`Itens do dossiê: ${itemsError.message}`);
        if (authorsError) warnings.push(`Autores/Curadoria: ${authorsError.message}`);
        const warningMsg = `Especial criado, porém com ressalvas: ${warnings.join(' | ')}`;
        setErrorMessage(warningMsg);
        onNotify(warningMsg);
      } else {
        onNotify('Caderno Especial criado com sucesso!');
        setEditing(null);
      }

      loadEspeciais();
    }
  };

  // Exclusão no Supabase
  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    const { success, error } = await deleteEspecial(deleteTarget.id);
    setSaving(false);

    if (!success || error) {
      onNotify(`Erro ao excluir Especial: ${error?.message || 'Falha desconhecida'}`);
    } else {
      onNotify(`Caderno Especial "${deleteTarget.title}" excluído.`);
      loadEspeciais();
    }

    setDeleteTarget(null);
  };

  // Filtros da Tabela
  const filteredEspeciais = useMemo(() => {
    return especiais.filter((esp) => {
      // Status editorial efetivo
      const effectiveStatus = getEffectiveEditorialStatus(esp, undefined, currentTime);

      if (statusFilter !== 'todos' && effectiveStatus !== statusFilter) {
        return false;
      }

      if (homeFilter === 'highlight' && !esp.highlightHome) return false;
      if (homeFilter === 'normal' && esp.highlightHome) return false;

      if (tableSearch.trim()) {
        const term = tableSearch.toLowerCase().trim();
        const matchTitle = esp.title.toLowerCase().includes(term);
        const matchSlug = esp.slug.toLowerCase().includes(term);
        const matchSubtitle = (esp.subtitle || '').toLowerCase().includes(term);
        const matchPerson = (esp.relatedPerson?.name || '').toLowerCase().includes(term);
        return matchTitle || matchSlug || matchSubtitle || matchPerson;
      }

      return true;
    });
  }, [especiais, tableSearch, statusFilter, homeFilter, currentTime]);

  // Lista de entidades disponíveis para adição ao dossiê filtradas pelo termo de busca
  const availableItemsForType = useMemo(() => {
    const term = itemSearchQuery.toLowerCase().trim();

    if (selectedItemType === 'ensaio') {
      return ensaios
        .filter((e) => !term || e.title.toLowerCase().includes(term) || (e.category && e.category.toLowerCase().includes(term)))
        .map((e) => ({
          id: e.id,
          title: e.title,
          subtitle: e.category ? `Ensaio · ${e.category}` : 'Ensaio',
          date: e.published_at || e.created_at,
          coverImage: e.cover_image,
        }));
    }

    if (selectedItemType === 'critica') {
      return criticas
        .filter(
          (c) =>
            !term ||
            (c.movie_title && c.movie_title.toLowerCase().includes(term)) ||
            (c.editorial_title && c.editorial_title.toLowerCase().includes(term)) ||
            (c.film?.title && c.film.title.toLowerCase().includes(term))
        )
        .map((c) => ({
          id: c.id,
          title: `${c.movie_title || c.film?.title || 'Filme'} — ${c.editorial_title || 'Crítica'}`,
          subtitle: `Crítica ${c.film?.year ? `(${c.film.year})` : ''}`,
          date: c.published_at || c.created_at,
          coverImage: c.cover_image || c.film?.poster_url,
        }));
    }

    if (selectedItemType === 'uma_imagem') {
      return umaImagem
        .filter((u) => !term || u.title.toLowerCase().includes(term))
        .map((u) => ({
          id: u.id,
          title: u.title,
          subtitle: 'Uma Imagem, Uma Ideia',
          date: u.published_at || u.created_at,
          coverImage: u.image_url,
        }));
    }

    if (selectedItemType === 'filme') {
      return filmes
        .filter((f) => !term || f.title.toLowerCase().includes(term) || (f.country && f.country.toLowerCase().includes(term)))
        .map((f) => ({
          id: f.id,
          title: f.title,
          subtitle: `Filme (${f.year || 'S/D'}) · ${f.country || ''}`,
          date: String(f.year || ''),
          coverImage: f.poster_url,
        }));
    }

    if (selectedItemType === 'pessoa') {
      return pessoas
        .filter((p) => !term || p.name.toLowerCase().includes(term) || (p.primary_role && p.primary_role.toLowerCase().includes(term)))
        .map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: `Pessoa / Cineasta · ${p.primary_role || 'Cinema'}`,
          date: '',
          coverImage: p.photo_url,
        }));
    }

    return [];
  }, [selectedItemType, itemSearchQuery, ensaios, criticas, umaImagem, filmes, pessoas]);

  // Lista de pessoas disponíveis para vínculo "relatedPerson"
  const availablePessoasForRelation = useMemo(() => {
    const term = personSearchQuery.toLowerCase().trim();
    return pessoas.filter((p) => !term || p.name.toLowerCase().includes(term));
  }, [pessoas, personSearchQuery]);

  const selectedPersonObject = useMemo(() => {
    if (!editing?.relatedPersonId) return null;
    return pessoas.find((p) => p.id === editing.relatedPersonId) || null;
  }, [editing?.relatedPersonId, pessoas]);

  // RENDERIZAÇÃO DO FORMULÁRIO
  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A] disabled:opacity-50"
          >
            <ArrowLeft size={14} /> Voltar para Listagem de Especiais
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const previewObj: Especial = {
                  id: editing.id || 'preview',
                  title: editing.title || 'Título do Especial',
                  slug: editing.slug || 'slug-do-especial',
                  subtitle: editing.subtitle,
                  coverImage: editing.coverImage,
                  intro: editing.intro,
                  content: editing.content,
                  relatedPersonId: editing.relatedPersonId,
                  relatedPerson: selectedPersonObject
                    ? {
                        id: selectedPersonObject.id,
                        name: selectedPersonObject.name,
                        slug: selectedPersonObject.slug,
                        photo_url: selectedPersonObject.photo_url,
                      }
                    : null,
                  items,
                  relatedItemIds: items.map((it) => it.targetId),
                  highlightHome: editing.highlightHome,
                  status: editing.status,
                  publishedAt: editing.date ? parseDateInputToIso(editing.date) : null,
                  scheduledAt: editing.scheduledAt ? parseDateTimeInputToIso(editing.scheduledAt) : null,
                  authorCredits: credits.map((c) => ({
                    memberId: c.memberId,
                    roleName: c.roleName,
                    orderIndex: c.orderIndex,
                  })),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setPreviewItem(previewObj);
              }}
              className="px-3 py-1.5 bg-[#F5F2ED] hover:bg-white text-[#1A1A1A] border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <Eye size={14} />
              <span>Pré-visualizar</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-xs font-sans flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <div className="space-y-1">
              <p className="font-bold">Aviso Editorial / Erro</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-8">
          <div className="border-b border-[#1A1A1A]/15 pb-4 flex items-center justify-between">
            <h2 className="text-xl font-serif-display text-[#1A1A1A]">
              {editing.id ? 'Editar Caderno Especial / Dossiê' : 'Novo Caderno Especial / Dossiê'}
            </h2>
            <span className="text-[10px] font-mono uppercase bg-[#F5F2ED] px-2 py-1 border border-[#1A1A1A]/15 font-bold text-[#1A1A1A]">
              Persistência Supabase Relacional
            </span>
          </div>

          {/* 1. DADOS PRINCIPAIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Título do Especial *
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
                    slug: editing.slug || slugifyEspecial(val),
                  });
                }}
                placeholder="Ex: INGMAR BERGMAN: FÉ, SILÊNCIO E MORTE"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Slug da URL (Único) *
              </label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="ex: ingmar-bergman-fe-silencio-e-morte"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Subtítulo Editorial
              </label>
              <input
                type="text"
                value={editing.subtitle}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                placeholder="Ex: Um ciclo editorial dedicado a explorar a vertigem espiritual e o enigma humano no cinema moderno"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            {/* Imagem de Capa */}
            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem do Banner Principal do Especial *"
                value={editing.coverImage}
                onChange={(url) => setEditing({ ...editing, coverImage: url })}
                required
              />
            </div>

            {/* Introdução / Apresentação */}
            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Texto de Abertura / Introdução Curatorial
              </label>
              <textarea
                rows={3}
                value={editing.intro}
                onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                placeholder="Apresentação conceitual do dossiê ou ciclo especial..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            {/* Corpo do Texto */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[#1A1A1A]/80 font-bold uppercase">
                Corpo do Texto Editorial
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
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Escreva a análise aprofundada do ciclo especial..."
                  className="w-full p-4 text-sm font-serif-body text-[#1A1A1A] bg-white focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* 2. PESSOA RELACIONADA / HOMENAGEADA */}
          <div className="p-4 sm:p-5 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
              <div className="flex items-center gap-2">
                <User size={15} className="text-[#D4AF37]" />
                <h4 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                  Pessoa Relacionada / Homenageada (Opcional)
                </h4>
              </div>
              {editing.relatedPersonId && (
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, relatedPersonId: null })}
                  className="text-[11px] font-sans text-red-600 hover:text-red-800 font-bold uppercase"
                >
                  Remover Vínculo
                </button>
              )}
            </div>

            <p className="text-[11px] font-sans text-[#1A1A1A]/60">
              Vincule um cineasta, ator ou personalidade cadastrada no acervo Supabase como o foco temático deste Especial.
            </p>

            {selectedPersonObject ? (
              <div className="p-3 bg-white border border-[#D4AF37]/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {selectedPersonObject.photo_url ? (
                    <img
                      src={selectedPersonObject.photo_url}
                      alt={selectedPersonObject.name}
                      className="w-10 h-10 object-cover border border-[#1A1A1A]/15"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A]/50">
                      <User size={18} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">{selectedPersonObject.name}</p>
                    <p className="text-[10px] font-mono text-[#1A1A1A]/60">
                      {selectedPersonObject.primary_role || 'Cinema'} {selectedPersonObject.nationality ? `· ${selectedPersonObject.nationality}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, relatedPersonId: null })}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                >
                  Trocar / Desvincular
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-[#1A1A1A]/40" />
                    <input
                      type="text"
                      value={personSearchQuery}
                      onChange={(e) => setPersonSearchQuery(e.target.value)}
                      placeholder="Pesquisar por nome de pessoa..."
                      className="w-full bg-white border border-[#1A1A1A]/20 pl-8 pr-3 py-2 text-xs text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto bg-white border border-[#1A1A1A]/15 divide-y divide-[#1A1A1A]/10">
                  {availablePessoasForRelation.length === 0 ? (
                    <p className="p-3 text-[11px] font-mono text-[#1A1A1A]/50 text-center">
                      Nenhuma pessoa encontrada no acervo.
                    </p>
                  ) : (
                    availablePessoasForRelation.slice(0, 15).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setEditing({ ...editing, relatedPersonId: p.id });
                          setPersonSearchQuery('');
                        }}
                        className="w-full p-2 text-left hover:bg-[#F5F2ED] flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={p.name} className="w-6 h-6 object-cover" />
                          ) : (
                            <User size={14} className="text-[#1A1A1A]/40" />
                          )}
                          <span className="font-bold text-[#1A1A1A]">{p.name}</span>
                          <span className="text-[10px] font-mono text-[#1A1A1A]/50">
                            {p.primary_role || ''}
                          </span>
                        </div>
                        <span className="text-[10px] font-sans font-bold uppercase text-[#D4AF37]">
                          Selecionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. ITENS DO DOSSIÊ (COMPOSIÇÃO POLIMÓRFICA) */}
          <div className="p-4 sm:p-5 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[#D4AF37]" />
                  <h4 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
                    Composição do Dossiê / Itens do Especial ({items.length})
                  </h4>
                </div>
                <p className="text-[11px] font-sans text-[#1A1A1A]/60 mt-0.5">
                  Reúna ensaios, críticas, fotogramas de Uma Imagem, filmes e personalidades que integram este ciclo especial.
                </p>
              </div>
            </div>

            {/* Lista dos itens adicionados com reordenação e rótulo customizado */}
            {items.length === 0 ? (
              <div className="py-6 px-4 bg-white border border-dashed border-[#1A1A1A]/20 text-center space-y-1">
                <p className="text-xs font-serif-body text-[#1A1A1A]/70">
                  Nenhum item adicionado a este dossiê até o momento.
                </p>
                <p className="text-[11px] font-sans text-[#1A1A1A]/50">
                  Utilize o seletor abaixo para incluir ensaios, críticas, filmes e outros conteúdos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === items.length - 1;

                  // Renderização do título e subtítulo dependendo da entidade
                  let titleDisplay = item.targetId;
                  let subtitleDisplay = '';
                  let imageDisplay: string | undefined;

                  if (item.itemType === 'ensaio') {
                    const ens = item.ensaio || ensaios.find((e) => e.id === item.targetId);
                    if (ens) {
                      titleDisplay = ens.title;
                      subtitleDisplay = ens.subtitle || (ens.category ? `Ensaio · ${ens.category}` : 'Ensaio');
                      imageDisplay = ens.coverImage || (ens as any).cover_image;
                    }
                  } else if (item.itemType === 'critica') {
                    const crit = item.critica || criticas.find((c) => c.id === item.targetId);
                    if (crit) {
                      titleDisplay = `${crit.movieTitle || (crit as any).movie_title || (crit as any).film?.title || 'Filme'} — ${crit.editorialTitle || (crit as any).editorial_title || 'Crítica'}`;
                      subtitleDisplay = 'Crítica Cinematográfica';
                      imageDisplay = crit.coverImage || (crit as any).cover_image || (crit as any).film?.poster_url;
                    }
                  } else if (item.itemType === 'uma_imagem') {
                    const uma = item.umaImagem || umaImagem.find((u) => u.id === item.targetId);
                    if (uma) {
                      titleDisplay = uma.title;
                      subtitleDisplay = 'Uma Imagem, Uma Ideia';
                      imageDisplay = uma.imageUrl || (uma as any).image_url;
                    }
                  } else if (item.itemType === 'filme') {
                    const film = item.filme || filmes.find((f) => f.id === item.targetId);
                    if (film) {
                      titleDisplay = film.title;
                      subtitleDisplay = `Filme (${film.year || 'S/D'}) · ${film.country || ''}`;
                      imageDisplay = film.posterUrl || (film as any).poster_url;
                    }
                  } else if (item.itemType === 'pessoa') {
                    const pes = item.pessoa || pessoas.find((p) => p.id === item.targetId);
                    if (pes) {
                      titleDisplay = pes.name;
                      subtitleDisplay = `Personalidade / Cineasta · ${pes.role || (pes as any).primary_role || ''}`;
                      imageDisplay = pes.photoUrl || (pes as any).photo_url;
                    }
                  } else if (item.itemType === 'lista') {
                    titleDisplay = (item.lista as any)?.title || `Lista #${item.targetId}`;
                    subtitleDisplay = 'Lista Cinematográfica';
                  }

                  return (
                    <div
                      key={`${item.itemType}-${item.targetId}-${idx}`}
                      className="p-3 bg-white border border-[#1A1A1A]/15 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Controles de Ordem e Tipo */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveItemUp(idx)}
                              className="p-1 border border-[#1A1A1A]/15 hover:bg-[#1A1A1A] hover:text-[#F5F2ED] disabled:opacity-30 transition-colors"
                              title="Subir na ordem"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveItemDown(idx)}
                              className="p-1 border border-[#1A1A1A]/15 hover:bg-[#1A1A1A] hover:text-[#F5F2ED] disabled:opacity-30 transition-colors"
                              title="Descer na ordem"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>

                          <span className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 px-1.5 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10">
                            #{idx + 1}
                          </span>

                          <span
                            className={`text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 border ${
                              item.itemType === 'ensaio'
                                ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                : item.itemType === 'critica'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : item.itemType === 'uma_imagem'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : item.itemType === 'filme'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : item.itemType === 'pessoa'
                                ? 'bg-rose-50 text-rose-900 border-rose-200'
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {item.itemType === 'uma_imagem' ? 'Uma Imagem' : item.itemType}
                          </span>
                        </div>

                        {/* Detalhes da Entidade */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {imageDisplay && (
                            <img
                              src={imageDisplay}
                              alt=""
                              className="w-9 h-9 object-cover border border-[#1A1A1A]/15 shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#1A1A1A] truncate">{titleDisplay}</p>
                            {subtitleDisplay && (
                              <p className="text-[10px] font-mono text-[#1A1A1A]/60 truncate">
                                {subtitleDisplay}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botão de Exclusão do Item */}
                        <div className="shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                            title="Remover do Dossiê"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Rótulo Customizado Opcional */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#1A1A1A]/5">
                        <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/50 shrink-0">
                          Rótulo Editorial (Opcional):
                        </label>
                        <input
                          type="text"
                          value={item.customLabel || ''}
                          onChange={(e) => handleItemLabelChange(idx, e.target.value)}
                          placeholder="Ex: Leitura fundamental, Filme central do dossiê, Ensaio de abertura..."
                          className="flex-1 bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2 py-1 text-[11px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SELETOR PARA ADICIONAR NOVO ITEM */}
            <div className="bg-white border border-[#1A1A1A]/20 p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-2">
                <Plus size={14} className="text-[#D4AF37]" />
                <h5 className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Adicionar Conteúdo ao Dossiê
                </h5>
              </div>

              {/* Seletor do Tipo */}
              <div className="space-y-1">
                <label className="block text-[10px] font-sans font-bold uppercase text-[#1A1A1A]/70">
                  Tipo de Conteúdo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemType('ensaio');
                      setSelectedTargetId('');
                      setItemSearchQuery('');
                    }}
                    className={`p-2 border text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      selectedItemType === 'ensaio'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                        : 'bg-[#F5F2ED] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <FileText size={13} />
                    <span>Ensaio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemType('critica');
                      setSelectedTargetId('');
                      setItemSearchQuery('');
                    }}
                    className={`p-2 border text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      selectedItemType === 'critica'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                        : 'bg-[#F5F2ED] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <Film size={13} />
                    <span>Crítica</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemType('uma_imagem');
                      setSelectedTargetId('');
                      setItemSearchQuery('');
                    }}
                    className={`p-2 border text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      selectedItemType === 'uma_imagem'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                        : 'bg-[#F5F2ED] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>Uma Imagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemType('filme');
                      setSelectedTargetId('');
                      setItemSearchQuery('');
                    }}
                    className={`p-2 border text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      selectedItemType === 'filme'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                        : 'bg-[#F5F2ED] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <Film size={13} />
                    <span>Filme</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemType('pessoa');
                      setSelectedTargetId('');
                      setItemSearchQuery('');
                    }}
                    className={`p-2 border text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      selectedItemType === 'pessoa'
                        ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                        : 'bg-[#F5F2ED] text-[#1A1A1A] border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <User size={13} />
                    <span>Pessoa</span>
                  </button>

                  {/* Listas: Desabilitado temporariamente com badge discreto até a migração de Listas */}
                  <div className="relative group">
                    <button
                      type="button"
                      disabled={true}
                      className="w-full p-2 border text-xs font-sans font-bold flex items-center justify-center gap-1.5 bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    >
                      <ListIcon size={13} />
                      <span>Lista</span>
                    </button>
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-[#F5F2ED] text-[9px] font-sans px-2 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Disponível após migração de Listas
                    </span>
                  </div>
                </div>
              </div>

              {/* Busca e Lista de Opções */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7 space-y-2">
                  <label className="block text-[10px] font-sans font-bold uppercase text-[#1A1A1A]/70">
                    Selecione o registro ({availableItemsForType.length} disponíveis)
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-[#1A1A1A]/40" />
                    <input
                      type="text"
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      placeholder={`Filtrar ${selectedItemType}...`}
                      className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/20 pl-8 pr-3 py-2 text-xs text-[#1A1A1A]"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-[#1A1A1A]/15 divide-y divide-[#1A1A1A]/10 bg-[#F5F2ED]/30">
                    {availableItemsForType.length === 0 ? (
                      <p className="p-3 text-[11px] font-mono text-[#1A1A1A]/50 text-center">
                        Nenhum registro encontrado para este tipo.
                      </p>
                    ) : (
                      availableItemsForType.map((opt) => {
                        const isChosen = selectedTargetId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedTargetId(opt.id)}
                            className={`w-full p-2 text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                              isChosen
                                ? 'bg-[#1A1A1A] text-[#F5F2ED]'
                                : 'hover:bg-white text-[#1A1A1A]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {opt.coverImage && (
                                <img
                                  src={opt.coverImage}
                                  alt=""
                                  className="w-6 h-6 object-cover border border-[#1A1A1A]/15 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold truncate">{opt.title}</p>
                                <p className={`text-[10px] font-mono truncate ${isChosen ? 'text-white/70' : 'text-[#1A1A1A]/60'}`}>
                                  {opt.subtitle}
                                </p>
                              </div>
                            </div>
                            {isChosen && (
                              <CheckCircle2 size={14} className="text-[#D4AF37] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="md:col-span-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-sans font-bold uppercase text-[#1A1A1A]/70">
                      Rótulo Editorial / Destaque (Opcional)
                    </label>
                    <input
                      type="text"
                      value={itemCustomLabel}
                      onChange={(e) => setItemCustomLabel(e.target.value)}
                      placeholder="Ex: Texto de Abertura, Filme Central..."
                      className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/20 p-2 text-xs text-[#1A1A1A]"
                    />
                    <p className="text-[10px] font-sans text-[#1A1A1A]/50">
                      Uma legenda editorial complementar para orientar a leitura no dossiê.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!selectedTargetId}
                    onClick={handleAddItemToDossier}
                    className="w-full py-2.5 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Inserir no Dossiê</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. AUTORIA & CURADORIA EDITORIAL */}
          <EditorialCreditsEditor
            credits={credits}
            onChange={setCredits}
            defaultRole="Curadoria"
            title="Curadoria & Equipe Editorial do Especial"
          />

          {/* 5. STATUS, PUBLICAÇÃO E AGENDAMENTO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans pt-4 border-t border-[#1A1A1A]/15">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">
                Status Editorial *
              </label>
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

            {editing.status === 'scheduled' ? (
              <div>
                <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase flex items-center gap-1">
                  <Clock size={13} className="text-blue-600" />
                  <span>Data & Hora de Agendamento *</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editing.scheduledAt || ''}
                  onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value })}
                  className="w-full bg-[#F5F2ED] border border-blue-400 p-2.5 text-xs font-mono text-[#1A1A1A]"
                />
                <span className="text-[10px] font-mono text-blue-700 mt-1 block">
                  Liberação automática pelo Supabase ao atingir o horário programado.
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase flex items-center gap-1">
                  <Calendar size={13} />
                  <span>Data de Publicação Editorial</span>
                </label>
                <input
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
                />
              </div>
            )}

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-sans font-bold text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={editing.highlightHome}
                  onChange={(e) => setEditing({ ...editing, highlightHome: e.target.checked })}
                  className="w-4 h-4 accent-[#1A1A1A]"
                />
                <span>Destacar na Home Principal</span>
              </label>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
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
                  <span>Salvar Caderno Especial</span>
                </>
              )}
            </button>
          </div>
        </form>

        {previewItem && (
          <ArticlePreviewModal
            item={previewItem}
            itemType="especial"
            onClose={() => setPreviewItem(null)}
          />
        )}
      </div>
    );
  }

  // RENDERIZAÇÃO DA TABELA / LISTAGEM ADMINISTRATIVA
  return (
    <div className="space-y-4">
      {/* Header com Título e Botão Novo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Especiais e Dossiês</h2>
          <p className="text-xs font-sans text-[#1A1A1A]/60 mt-0.5">
            Gestão relacional de ciclos temáticos, retrospectivas e dossiês curatoriais.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
        >
          <Plus size={14} /> Novo Especial
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white border border-[#1A1A1A]/15 p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-2.5 top-2.5 text-[#1A1A1A]/40" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Buscar por título, slug, pessoa..."
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 pl-8 pr-3 py-2 text-xs text-[#1A1A1A]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-sans font-bold uppercase text-[#1A1A1A]/60">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2.5 py-1.5 text-xs text-[#1A1A1A]"
          >
            <option value="todos">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="scheduled">Agendados</option>
            <option value="archived">Arquivados</option>
          </select>

          <label className="text-[10px] font-sans font-bold uppercase text-[#1A1A1A]/60 ml-2">Home:</label>
          <select
            value={homeFilter}
            onChange={(e) => setHomeFilter(e.target.value)}
            className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2.5 py-1.5 text-xs text-[#1A1A1A]"
          >
            <option value="todos">Todos</option>
            <option value="highlight">Apenas Destaques</option>
            <option value="normal">Sem Destaque</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-xs font-sans flex items-center gap-2">
          <AlertCircle size={15} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabela de Especiais */}
      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs font-mono text-[#1A1A1A]/60">
            <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
            <span>Carregando Especiais do Supabase...</span>
          </div>
        ) : filteredEspeciais.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-serif-body text-[#1A1A1A]/70">
              Nenhum Caderno Especial encontrado.
            </p>
            <button
              onClick={handleCreateNew}
              className="text-xs font-sans font-bold uppercase tracking-wider text-[#D4AF37] hover:underline"
            >
              + Criar o primeiro Especial
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
            <thead>
              <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60 bg-[#F5F2ED]/50">
                <th className="py-3 px-4">Capa & Título</th>
                <th className="py-3 px-4">Pessoa / Homenagem</th>
                <th className="py-3 px-4">Itens</th>
                <th className="py-3 px-4">Curadoria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {filteredEspeciais.map((es) => {
                const effectiveStatus = getEffectiveEditorialStatus(es, undefined, currentTime);
                const badge = getEditorialStatusBadgeInfo(effectiveStatus);

                return (
                  <tr key={es.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        {es.coverImage && (
                          <img
                            src={es.coverImage}
                            alt=""
                            className="w-10 h-10 object-cover border border-[#1A1A1A]/15 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1A1A1A] truncate">{es.title}</span>
                            {es.highlightHome && (
                              <span className="text-[9px] font-sans font-bold uppercase bg-[#D4AF37]/15 text-[#1A1A1A] px-1.5 py-0.5 border border-[#D4AF37]/30 shrink-0">
                                Home
                              </span>
                            )}
                          </div>
                          {es.subtitle && (
                            <p className="text-[10px] font-mono text-[#1A1A1A]/60 truncate">
                              {es.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {es.relatedPerson ? (
                        <div className="flex items-center gap-1.5">
                          {es.relatedPerson.photo_url ? (
                            <img
                              src={es.relatedPerson.photo_url}
                              alt=""
                              className="w-5 h-5 object-cover rounded-full"
                            />
                          ) : (
                            <User size={12} className="text-[#1A1A1A]/40" />
                          )}
                          <span className="font-medium text-[#1A1A1A]">{es.relatedPerson.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-[#1A1A1A]/40">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-[#1A1A1A]">
                      {es.items?.length || 0} itens
                    </td>

                    <td className="py-3 px-4 font-sans text-xs text-[#1A1A1A]/80">
                      {es.authorCredits && es.authorCredits.length > 0 ? (
                        <span className="truncate block max-w-[140px]" title={es.authorCredits.map((ac) => ac.member?.name || ac.roleName).join(', ')}>
                          {es.authorCredits[0].member?.name || 'Equipe'}
                          {es.authorCredits.length > 1 && ` +${es.authorCredits.length - 1}`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#1A1A1A]/40">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[10px] uppercase">
                      <span className={`px-2 py-0.5 ${badge.bgClass} ${badge.textClass} font-bold border ${badge.borderClass}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#1A1A1A]/70 text-[11px]">
                      {formatEditorialDate(es.publishedAt || es.createdAt, 'short')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(es)}
                          className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                          title="Visualizar Prévia"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(es)}
                          className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: es.id, title: es.title })}
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
        )}
      </div>

      {previewItem && (
        <ArticlePreviewModal
          item={previewItem}
          itemType="especial"
          onClose={() => setPreviewItem(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Caderno Especial"
          message={`Tem certeza de que deseja excluir o Especial "${deleteTarget.title}"? Esta ação removerá o Especial e suas composições relacionais.`}
          confirmLabel="Excluir Especial"
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
