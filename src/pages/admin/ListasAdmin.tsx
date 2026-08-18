import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { cmsStore } from '../../services/cmsStore';
import { Lista, ContentStatus } from '../../types';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface ListasAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

export const ListasAdmin: React.FC<ListasAdminProps> = ({ onNotify, autoCreate = false }) => {
  const [listas, setListas] = useState<Lista[]>(() => cmsStore.getListas(false));
  const [editing, setEditing] = useState<Lista | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (autoCreate && !editing) {
      handleCreateNew();
    }
  }, [autoCreate]);

  const refresh = () => setListas(cmsStore.getListas(false));

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');
  };

  const handleCreateNew = () => {
    setEditing({
      id: `lis-${Date.now()}`,
      title: '',
      slug: '',
      intro: '',
      coverImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=1600',
      items: [
        { rank: 1, title: '', director: '', year: 2026, note: '' }
      ],
      relatedFilmmaker: '',
      tags: ['Listas', 'Curadoria'],
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddItem = () => {
    if (!editing) return;
    const nextRank = editing.items.length + 1;
    setEditing({
      ...editing,
      items: [...editing.items, { rank: nextRank, title: '', director: '', year: 2026, note: '' }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editing) return;
    const newItems = editing.items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
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

    // Fix ranks
    const ranked = newItems.map((item, idx) => ({ ...item, rank: idx + 1 }));
    setEditing({ ...editing, items: ranked });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.title.trim() || !editing.slug.trim()) {
      onNotify('Atenção: Por favor, preencha o Título e Slug da lista.');
      return;
    }

    cmsStore.saveLista(editing);
    setEditing(null);
    refresh();
    onNotify('Lista salva com sucesso!');
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    cmsStore.deleteLista(deleteTarget.id);
    refresh();
    onNotify(`Lista "${deleteTarget.title}" excluída.`);
    setDeleteTarget(null);
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
        >
          <ArrowLeft size={14} /> Voltar para Listas
        </button>

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <h2 className="text-xl font-serif-display text-[#1A1A1A]">
            {editing.id ? 'Editar Lista Curada' : 'Nova Lista de Filmes'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
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
                    slug: editing.slug || slugify(val),
                  });
                }}
                placeholder="Ex: Dez Obras Fundamentais sobre o Silêncio..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Slug (URL) *</label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Introdução Editorial</label>
              <textarea
                rows={3}
                value={editing.intro}
                onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                placeholder="Texto introdutório sobre a seleção de filmes..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem de Capa da Lista"
                value={editing.coverImage || ''}
                onChange={(url) => setEditing({ ...editing, coverImage: url })}
              />
            </div>

            {/* List items editor */}
            <div className="md:col-span-2 space-y-3 pt-4 border-t border-[#1A1A1A]/15">
              <div className="flex items-center justify-between">
                <h3 className="font-serif-display text-lg text-[#1A1A1A]">Filmes da Lista ({editing.items.length})</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase flex items-center gap-1"
                >
                  <Plus size={12} /> Adicionar Filme à Lista
                </button>
              </div>

              <div className="space-y-3">
                {editing.items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                      <span className="font-mono font-bold text-xs text-[#1A1A1A]">#{item.rank}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, 'up')}
                          className="p-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A] disabled:opacity-30"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === editing.items.length - 1}
                          onClick={() => handleMoveItem(idx, 'down')}
                          className="p-1 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A] disabled:opacity-30"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 bg-red-100 border border-red-200 text-red-700 ml-2 text-xs font-mono"
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/60">Título do Filme</label>
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
                          className="w-full bg-white border border-[#1A1A1A]/15 p-2"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/60">Diretor</label>
                        <input
                          type="text"
                          value={item.director}
                          onChange={(e) => {
                            const newItems = [...editing.items];
                            newItems[idx].director = e.target.value;
                            setEditing({ ...editing, items: newItems });
                          }}
                          placeholder="Ex: Ingmar Bergman"
                          className="w-full bg-white border border-[#1A1A1A]/15 p-2"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/60">Ano</label>
                        <input
                          type="number"
                          value={item.year}
                          onChange={(e) => {
                            const newItems = [...editing.items];
                            newItems[idx].year = parseInt(e.target.value) || 2026;
                            setEditing({ ...editing, items: newItems });
                          }}
                          className="w-full bg-white border border-[#1A1A1A]/15 p-2 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] uppercase font-bold text-[#1A1A1A]/60">Nota Editorial sobre o filme nesta posição</label>
                        <textarea
                          rows={2}
                          value={item.note || ''}
                          onChange={(e) => {
                            const newItems = [...editing.items];
                            newItems[idx].note = e.target.value;
                            setEditing({ ...editing, items: newItems });
                          }}
                          placeholder="Breve justificativa ou comentário do porquê o filme está na lista..."
                          className="w-full bg-white border border-[#1A1A1A]/15 p-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Cineasta Associado (Opcional)</label>
              <input
                type="text"
                value={editing.relatedFilmmaker || ''}
                onChange={(e) => setEditing({ ...editing, relatedFilmmaker: e.target.value })}
                placeholder="Ex: Ingmar Bergman"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Status</label>
              <select
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as ContentStatus })}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
              >
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="scheduled">Agendado</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <TagInput
                tags={editing.tags || []}
                onChange={(newTags) => setEditing({ ...editing, tags: newTags })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>Salvar Lista</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Listas e Seleções Curadas</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <Plus size={14} /> Nova Lista
        </button>
      </div>

      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
        <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
          <thead>
            <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60">
              <th className="py-3 px-4">Título</th>
              <th className="py-3 px-4">Qtd. Filmes</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/10">
            {listas.map((l) => (
              <tr key={l.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#1A1A1A] max-w-sm truncate">{l.title}</td>
                <td className="py-3 px-4 font-mono font-bold text-[#1A1A1A]">{l.items?.length || 0} filmes</td>
                <td className="py-3 px-4 font-mono text-[10px] uppercase">
                  {l.status === 'published' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">PUBLICADO</span>}
                  {l.status === 'draft' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">RASCUNHO</span>}
                  {l.status === 'scheduled' && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">AGENDADO</span>}
                  {l.status === 'archived' && <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">ARQUIVADO</span>}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(l)}
                      className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: l.id, title: l.title })}
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

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Lista Curada"
          message={`Tem certeza de que deseja excluir a lista "${deleteTarget.title}"?`}
          confirmLabel="Excluir Lista"
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
