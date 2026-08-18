import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, Eye, ArrowLeft, AlertTriangle } from 'lucide-react';
import { cmsStore } from '../../services/cmsStore';
import { Ensaio, ContentStatus } from '../../types';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { ArticlePreviewModal } from '../../components/admin/ArticlePreviewModal';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface EnsaiosAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

export const EnsaiosAdmin: React.FC<EnsaiosAdminProps> = ({ onNotify, autoCreate = false }) => {
  const [ensaios, setEnsaios] = useState<Ensaio[]>(() => cmsStore.getEnsaios(false));
  const [editing, setEditing] = useState<Ensaio | null>(null);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [previewItem, setPreviewItem] = useState<Ensaio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [slugWarning, setSlugWarning] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoCreate && !editing) {
      handleCreateNew();
    }
  }, [autoCreate]);

  const refresh = () => setEnsaios(cmsStore.getEnsaios(false));

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
      id: `ens-${Date.now()}`,
      title: '',
      slug: '',
      subtitle: '',
      coverImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1600',
      content: '',
      category: 'Filosofia & Cinema',
      tags: ['Cinema', 'Pensamento'],
      author: 'Breno Matos',
      date: new Date().toISOString().slice(0, 10),
      readTimeMinutes: 5,
      highlightHome: false,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsUnsaved(false);
    setSlugWarning('');
  };

  const handleTitleChange = (val: string) => {
    if (!editing) return;
    const generatedSlug = slugify(val);
    setEditing({
      ...editing,
      title: val,
      slug: editing.slug ? editing.slug : generatedSlug,
    });
    setIsUnsaved(true);

    if (cmsStore.checkDuplicateSlug(generatedSlug, 'ensaios', editing.id)) {
      setSlugWarning('Atenção: Já existe outro ensaio com esta mesma URL (slug).');
    } else {
      setSlugWarning('');
    }
  };

  const handleContentChange = (contentVal: string) => {
    if (!editing) return;
    const wordCount = contentVal.trim().split(/\s+/).filter(Boolean).length;
    const calculatedMinutes = Math.max(1, Math.round(wordCount / 200));

    setEditing({
      ...editing,
      content: contentVal,
      readTimeMinutes: calculatedMinutes,
    });
    setIsUnsaved(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.title.trim() || !editing.slug.trim() || !editing.content.trim()) {
      onNotify('Atenção: Por favor, preencha o Título, Slug e Texto do Ensaio.');
      return;
    }

    cmsStore.saveEnsaio(editing);
    setEditing(null);
    setIsUnsaved(false);
    refresh();
    onNotify('Ensaio salvo com sucesso!');
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    cmsStore.deleteEnsaio(deleteTarget.id);
    refresh();
    onNotify(`Ensaio "${deleteTarget.title}" excluído.`);
    setDeleteTarget(null);
  };

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
              {isUnsaved ? '• Alterações não salvas' : '✓ Salvo'}
            </span>

            <button
              type="button"
              onClick={() => setPreviewItem(editing)}
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
                placeholder="Ex: O Silêncio como Linguagem..."
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
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Subtítulo</label>
              <input
                type="text"
                value={editing.subtitle}
                onChange={(e) => {
                  setEditing({ ...editing, subtitle: e.target.value });
                  setIsUnsaved(true);
                }}
                placeholder="Resumo editorial ou premissa..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem de Capa do Ensaio"
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
                  Tempo est. de leitura: ~{editing.readTimeMinutes || 1} min
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
                  placeholder="Escreva o texto do ensaio..."
                  className="w-full p-4 text-sm font-serif-body text-[#1A1A1A] bg-white focus:outline-none leading-relaxed"
                />
              </div>
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
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Autor</label>
              <input
                type="text"
                value={editing.author}
                onChange={(e) => {
                  setEditing({ ...editing, author: e.target.value });
                  setIsUnsaved(true);
                }}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A]"
              />
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
                <option value="draft">Rascunho (Privado)</option>
                <option value="scheduled">Agendado (Publica na data selecionada)</option>
                <option value="archived">Arquivado (Fora das listas principais)</option>
              </select>
            </div>

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
              <span>Salvar Ensaio</span>
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
        <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Gestão de Ensaios</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <Plus size={14} /> Novo Ensaio
        </button>
      </div>

      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
        <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
          <thead>
            <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60">
              <th className="py-3 px-4">Título</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-4">Home</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/10">
            {ensaios.map((e) => (
              <tr key={e.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                <td className="py-3 px-4 font-medium text-[#1A1A1A] max-w-sm truncate">
                  {e.title}
                </td>
                <td className="py-3 px-4 text-[#1A1A1A]/70">{e.category}</td>
                <td className="py-3 px-4 font-mono text-[10px] uppercase">
                  {e.status === 'published' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">PUBLICADO</span>}
                  {e.status === 'draft' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">RASCUNHO</span>}
                  {e.status === 'scheduled' && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">AGENDADO</span>}
                  {e.status === 'archived' && <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">ARQUIVADO</span>}
                </td>
                <td className="py-3 px-4 font-mono text-[#1A1A1A]/70">{e.date}</td>
                <td className="py-3 px-4">
                  {e.highlightHome ? (
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5">SIM</span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#1A1A1A]/40">NÃO</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(e)}
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
          message={`Tem certeza de que deseja excluir permanentemente o ensaio "${deleteTarget.title}"?`}
          confirmLabel="Excluir Ensaio"
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
