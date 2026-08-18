import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ArrowLeft, Eye } from 'lucide-react';
import { cmsStore } from '../../services/cmsStore';
import { UmaImagemUmaIdeia, ContentStatus } from '../../types';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface UmaImagemAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

export const UmaImagemAdmin: React.FC<UmaImagemAdminProps> = ({ onNotify, autoCreate = false }) => {
  const [items, setItems] = useState<UmaImagemUmaIdeia[]>(() => cmsStore.getUmaImagemList(false));
  const [editing, setEditing] = useState<UmaImagemUmaIdeia | null>(null);
  const [previewItem, setPreviewItem] = useState<UmaImagemUmaIdeia | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoCreate && !editing) {
      handleCreateNew();
    }
  }, [autoCreate]);

  const refresh = () => setItems(cmsStore.getUmaImagemList(false));

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
      id: `img-${Date.now()}`,
      title: '',
      slug: '',
      image: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&q=80&w=1600',
      content: '',
      relatedMovie: '',
      relatedFilmmaker: '',
      tags: ['Contemplação', 'Fotografia'],
      highlightHome: false,
      date: new Date().toISOString().slice(0, 10),
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.title.trim() || !editing.image.trim() || !editing.content.trim()) {
      onNotify('Atenção: Por favor, preencha o Título, Imagem e Texto da reflexão.');
      return;
    }

    cmsStore.saveUmaImagem(editing);
    setEditing(null);
    refresh();
    onNotify('Publicação salva com sucesso!');
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    cmsStore.deleteUmaImagem(deleteTarget.id);
    refresh();
    onNotify(`Publicação "${deleteTarget.title}" excluída.`);
    setDeleteTarget(null);
  };

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
            onClick={() => setPreviewItem(editing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#1A1A1A]/20 text-xs font-sans font-bold uppercase hover:bg-[#F5F2ED]"
          >
            <Eye size={14} /> Visualizar Prévia
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <h2 className="text-xl font-serif-display text-[#1A1A1A]">
            {editing.id ? 'Editar Uma Imagem, Uma Ideia' : 'Nova Publicação: Uma Imagem, Uma Ideia'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Título da Imagem / Conceito *</label>
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
                placeholder="Ex: A Luz que Atravessa as Árvores em Komorebi"
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
              <ImageUploader
                label="Imagem Principal (Alta Resolução)"
                value={editing.image}
                onChange={(url) => setEditing({ ...editing, image: url })}
                required
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[#1A1A1A]/80 font-bold uppercase">Texto Reflexivo / Micro-ensaio *</label>
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

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Filme Relacionado (Opcional)</label>
              <input
                type="text"
                value={editing.relatedMovie || ''}
                onChange={(e) => setEditing({ ...editing, relatedMovie: e.target.value })}
                placeholder="Ex: Dias Perfeitos"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Cineasta Relacionado (Opcional)</label>
              <input
                type="text"
                value={editing.relatedFilmmaker || ''}
                onChange={(e) => setEditing({ ...editing, relatedFilmmaker: e.target.value })}
                placeholder="Ex: Wim Wenders"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <TagInput
                tags={editing.tags || []}
                onChange={(newTags) => setEditing({ ...editing, tags: newTags })}
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Data</label>
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
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

            <div className="md:col-span-2 pt-2 border-t border-[#1A1A1A]/10">
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
              <span>Salvar Publicação</span>
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
        <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Uma Imagem, Uma Ideia</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <Plus size={14} /> Nova Publicação
        </button>
      </div>

      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
        <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
          <thead>
            <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60">
              <th className="py-3 px-4">Título</th>
              <th className="py-3 px-4">Filme</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/10">
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#1A1A1A] max-w-xs truncate">{u.title}</td>
                <td className="py-3 px-4 text-[#1A1A1A]/70">{u.relatedMovie || '—'}</td>
                <td className="py-3 px-4 font-mono text-[10px] uppercase">
                  {u.status === 'published' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">PUBLICADO</span>}
                  {u.status === 'draft' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">RASCUNHO</span>}
                  {u.status === 'scheduled' && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">AGENDADO</span>}
                  {u.status === 'archived' && <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">ARQUIVADO</span>}
                </td>
                <td className="py-3 px-4 font-mono">{u.date}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(u)}
                      className="p-1.5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: u.id, title: u.title })}
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
