import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ArrowLeft, Check, Link as LinkIcon } from 'lucide-react';
import { cmsStore } from '../../services/cmsStore';
import { Especial, ContentStatus } from '../../types';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface EspeciaisAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

export const EspeciaisAdmin: React.FC<EspeciaisAdminProps> = ({ onNotify, autoCreate = false }) => {
  const [especiais, setEspeciais] = useState<Especial[]>(() => cmsStore.getEspeciais(false));
  const [editing, setEditing] = useState<Especial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ensaios = cmsStore.getEnsaios(false);
  const criticas = cmsStore.getCriticas(false);
  const cineastas = cmsStore.getCineastas();

  useEffect(() => {
    if (autoCreate && !editing) {
      handleCreateNew();
    }
  }, [autoCreate]);

  const refresh = () => setEspeciais(cmsStore.getEspeciais(false));

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
      id: `esp-${Date.now()}`,
      title: '',
      slug: '',
      subtitle: '',
      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600',
      intro: '',
      content: '',
      relatedItemIds: [],
      highlightHome: false,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleRelatedItem = (id: string) => {
    if (!editing) return;
    const current = editing.relatedItemIds || [];
    if (current.includes(id)) {
      setEditing({ ...editing, relatedItemIds: current.filter((item) => item !== id) });
    } else {
      setEditing({ ...editing, relatedItemIds: [...current, id] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.title.trim() || !editing.slug.trim()) {
      onNotify('Atenção: Por favor, preencha o Título e Slug do especial.');
      return;
    }

    cmsStore.saveEspecial(editing);
    setEditing(null);
    refresh();
    onNotify('Caderno Especial salvo com sucesso!');
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    cmsStore.deleteEspecial(deleteTarget.id);
    refresh();
    onNotify(`Caderno Especial "${deleteTarget.title}" excluído.`);
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
          <ArrowLeft size={14} /> Voltar para Especiais
        </button>

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <h2 className="text-xl font-serif-display text-[#1A1A1A]">
            {editing.id ? 'Editar Caderno Especial' : 'Novo Caderno Especial / Dossiê'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Título do Especial *</label>
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
                placeholder="Ex: BERGMAN: FÉ, SILÊNCIO E MORTE"
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
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Subtítulo Editorial</label>
              <input
                type="text"
                value={editing.subtitle}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                placeholder="Ex: Um ciclo editorial dedicado a explorar a vertigem espiritual..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Imagem do Banner Principal do Especial"
                value={editing.coverImage}
                onChange={(url) => setEditing({ ...editing, coverImage: url })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Texto de Abertura / Introdução</label>
              <textarea
                rows={3}
                value={editing.intro}
                onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                placeholder="Apresentação do dossiê ou especial..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[#1A1A1A]/80 font-bold uppercase">Corpo do Texto do Especial *</label>
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
                  placeholder="Escreva a apresentação analítica do ciclo especial..."
                  className="w-full p-4 text-sm font-serif-body text-[#1A1A1A] bg-white focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Relationship Content Selector */}
            <div className="md:col-span-2 space-y-3 pt-4 border-t border-[#1A1A1A]/15">
              <label className="block text-[#1A1A1A]/80 font-bold uppercase flex items-center gap-1.5">
                <LinkIcon size={14} /> Vincular Ensaios, Críticas e Cineastas a este Especial
              </label>

              <div className="p-4 bg-[#F5F2ED] border border-[#1A1A1A]/15 space-y-4 max-h-60 overflow-y-auto">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#1A1A1A]/60 block mb-1">
                    Ensaios Disponíveis
                  </span>
                  <div className="space-y-1">
                    {ensaios.map((e) => {
                      const isSelected = (editing.relatedItemIds || []).includes(e.id);
                      return (
                        <label
                          key={e.id}
                          className="flex items-center gap-2 text-xs font-sans p-1.5 bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRelatedItem(e.id)}
                            className="w-4 h-4 accent-[#1A1A1A]"
                          />
                          <span className="font-medium text-[#1A1A1A]">{e.title}</span>
                          <span className="text-[10px] font-mono text-[#1A1A1A]/50 ml-auto">Ensaio</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#1A1A1A]/60 block mb-1">
                    Críticas Disponíveis
                  </span>
                  <div className="space-y-1">
                    {criticas.map((c) => {
                      const isSelected = (editing.relatedItemIds || []).includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-xs font-sans p-1.5 bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRelatedItem(c.id)}
                            className="w-4 h-4 accent-[#1A1A1A]"
                          />
                          <span className="font-medium text-[#1A1A1A]">{c.movieTitle} — {c.editorialTitle}</span>
                          <span className="text-[10px] font-mono text-[#1A1A1A]/50 ml-auto">Crítica</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#1A1A1A]/60 block mb-1">
                    Cineastas Disponíveis
                  </span>
                  <div className="space-y-1">
                    {cineastas.map((cin) => {
                      const isSelected = (editing.relatedItemIds || []).includes(cin.id);
                      return (
                        <label
                          key={cin.id}
                          className="flex items-center gap-2 text-xs font-sans p-1.5 bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRelatedItem(cin.id)}
                            className="w-4 h-4 accent-[#1A1A1A]"
                          />
                          <span className="font-medium text-[#1A1A1A]">{cin.name}</span>
                          <span className="text-[10px] font-mono text-[#1A1A1A]/50 ml-auto">Cineasta</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
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

            <div className="pt-6">
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
              <span>Salvar Especial</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Especiais e Dossiês</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <Plus size={14} /> Novo Especial
        </button>
      </div>

      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
        <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
          <thead>
            <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60">
              <th className="py-3 px-4">Título</th>
              <th className="py-3 px-4">Itens Vinculados</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/10">
            {especiais.map((es) => (
              <tr key={es.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                <td className="py-3 px-4 font-bold text-[#1A1A1A] max-w-sm truncate">{es.title}</td>
                <td className="py-3 px-4 font-mono font-bold text-[#1A1A1A]">{es.relatedItemIds?.length || 0} vinculados</td>
                <td className="py-3 px-4 font-mono text-[10px] uppercase">
                  {es.status === 'published' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">PUBLICADO</span>}
                  {es.status === 'draft' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">RASCUNHO</span>}
                  {es.status === 'scheduled' && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">AGENDADO</span>}
                  {es.status === 'archived' && <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">ARQUIVADO</span>}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(es)}
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
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Caderno Especial"
          message={`Tem certeza de que deseja excluir o Especial "${deleteTarget.title}"?`}
          confirmLabel="Excluir Especial"
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
