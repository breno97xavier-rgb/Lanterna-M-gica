import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Tag as TagIcon, Edit2, Loader2, AlertCircle, RefreshCw, Check } from 'lucide-react';
import {
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  SupabaseTag,
} from '../../services/repositories/tagsRepository';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface TagsAdminProps {
  onNotify: (msg: string) => void;
}

export const TagsAdmin: React.FC<TagsAdminProps> = ({ onNotify }) => {
  const [tags, setTags] = useState<SupabaseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newTagName, setNewTagName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit states
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchTags();
    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setTags(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const { data, error: createErr } = await createTag(trimmed);
    if (createErr) {
      setError(createErr.message);
      onNotify(`Erro: ${createErr.message}`);
    } else if (data) {
      setNewTagName('');
      onNotify(`Tag #${data.name} criada com sucesso no Supabase!`);
      await loadTags();
    }
    setIsSubmitting(false);
  };

  const handleStartEdit = (tag: SupabaseTag) => {
    setEditingTag({ id: tag.id, name: tag.name });
    setEditTagName(tag.name);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editTagName.trim() || isSavingEdit) return;

    setIsSavingEdit(true);
    setError(null);

    const { data, error: updateErr } = await updateTag(editingTag.id, editTagName.trim());
    if (updateErr) {
      setError(updateErr.message);
      onNotify(`Erro: ${updateErr.message}`);
    } else if (data) {
      onNotify(`Tag atualizada para #${data.name}`);
      setEditingTag(null);
      setEditTagName('');
      await loadTags();
    }
    setIsSavingEdit(false);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditTagName('');
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    const { error: deleteErr } = await deleteTag(deleteTarget.id);
    if (deleteErr) {
      setError(`Erro ao excluir tag: ${deleteErr.message}`);
      onNotify(`Erro: ${deleteErr.message}`);
    } else {
      onNotify(`Tag #${deleteTarget.name} removida.`);
      setDeleteTarget(null);
      await loadTags();
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Gestão de Tags e Temas</h2>
          <p className="text-xs font-mono text-[#1A1A1A]/60 mt-0.5">
            Sincronizado diretamente com a tabela <code className="bg-[#1A1A1A]/5 px-1 py-0.5">public.tags</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadTags}
            disabled={loading}
            className="p-1.5 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
            title="Recarregar tags do Supabase"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs font-mono text-[#1A1A1A]/60">{tags.length} tags</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-800 text-[10px] uppercase font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Formulário de Criação */}
      <form onSubmit={handleAdd} className="p-4 bg-white border border-[#1A1A1A]/15 flex gap-2 items-center">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Digite o nome da nova tag (ex: Cinema Marginal, Neo-Realismo)..."
          disabled={isSubmitting}
          className="flex-1 bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newTagName.trim()}
          className="px-5 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          <span>{isSubmitting ? 'Salvando...' : 'Criar Tag'}</span>
        </button>
      </form>

      {/* Modal / Linha de Edição */}
      {editingTag && (
        <form onSubmit={handleSaveEdit} className="p-4 bg-[#F5F2ED] border-2 border-[#1A1A1A] flex flex-wrap gap-2 items-center">
          <div className="text-xs font-mono font-bold text-[#1A1A1A] flex items-center gap-1">
            <Edit2 size={12} />
            <span>Editando:</span>
          </div>
          <input
            type="text"
            value={editTagName}
            onChange={(e) => setEditTagName(e.target.value)}
            disabled={isSavingEdit}
            className="flex-1 min-w-[200px] bg-white border border-[#1A1A1A]/20 px-3 py-1.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          />
          <button
            type="submit"
            disabled={isSavingEdit || !editTagName.trim()}
            className="px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-mono font-bold hover:bg-[#1A1A1A]/80 flex items-center gap-1 disabled:opacity-50"
          >
            {isSavingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            <span>Salvar</span>
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSavingEdit}
            className="px-3 py-1.5 bg-white border border-[#1A1A1A]/20 text-xs font-mono hover:bg-[#1A1A1A]/5"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Lista de Tags */}
      {loading && tags.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-[#1A1A1A]/60 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Carregando tags do Supabase...</span>
        </div>
      ) : tags.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[#1A1A1A]/20 bg-white p-6">
          <TagIcon size={24} className="mx-auto text-[#1A1A1A]/30 mb-2" />
          <p className="text-xs font-mono text-[#1A1A1A]/60">Nenhuma tag cadastrada no banco de dados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map((t) => (
            <div
              key={t.id}
              className="p-3 bg-white border border-[#1A1A1A]/15 flex items-center justify-between group hover:border-[#1A1A1A] transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <TagIcon size={12} className="text-[#1A1A1A]/40 shrink-0" />
                <span className="text-xs font-mono font-medium text-[#1A1A1A] truncate" title={`#${t.name} (slug: ${t.slug})`}>
                  #{t.name}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartEdit(t)}
                  className="p-1 text-[#1A1A1A]/30 hover:text-[#1A1A1A] transition-colors"
                  title="Editar Tag"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: t.id, name: t.name })}
                  className="p-1 text-[#1A1A1A]/30 hover:text-red-600 transition-colors"
                  title="Excluir Tag"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Tag"
          message={`Tem certeza de que deseja remover permanentemente a tag "#${deleteTarget.name}" de public.tags?`}
          confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir Tag'}
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => !isDeleting && setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

