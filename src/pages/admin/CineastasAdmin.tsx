import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { cmsStore } from '../../services/cmsStore';
import { Cineasta } from '../../types';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { TagInput } from '../../components/admin/TagInput';
import { RichTextToolbar } from '../../components/admin/RichTextToolbar';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface CineastasAdminProps {
  onNotify: (msg: string) => void;
  autoCreate?: boolean;
}

export const CineastasAdmin: React.FC<CineastasAdminProps> = ({ onNotify, autoCreate = false }) => {
  const [cineastas, setCineastas] = useState<Cineasta[]>(() => cmsStore.getCineastas());
  const [editing, setEditing] = useState<Cineasta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; depMsg?: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoCreate && !editing) {
      handleCreateNew();
    }
  }, [autoCreate]);

  const refresh = () => setCineastas(cmsStore.getCineastas());

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
      id: `cin-${Date.now()}`,
      name: '',
      slug: '',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      bio: '',
      birthYear: 1930,
      deathYear: undefined,
      country: 'Suécia',
      tags: [],
      highlightHome: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (!editing.name.trim() || !editing.slug.trim()) {
      onNotify('Atenção: Por favor, preencha o Nome e Slug do cineasta.');
      return;
    }

    cmsStore.saveCineasta(editing);
    setEditing(null);
    refresh();
    onNotify('Cineasta salvo com sucesso!');
  };

  const handleDeleteClick = (id: string, name: string) => {
    const dependencies = cmsStore.checkFilmmakerDependencies(name);
    let depMsg: string | undefined = undefined;
    if (dependencies.length > 0) {
      depMsg = `Atenção: Existem ${dependencies.length} conteúdo(s) associados a este cineasta:\n` +
        dependencies.slice(0, 5).join('\n') +
        (dependencies.length > 5 ? '\n...e outros.' : '') +
        '\n\nDeseja excluir este perfil de cineasta assim mesmo?';
    }
    setDeleteTarget({ id, name, depMsg });
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    cmsStore.deleteCineasta(deleteTarget.id);
    refresh();
    onNotify(`Cineasta "${deleteTarget.name}" excluído.`);
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
          <ArrowLeft size={14} /> Voltar para Cineastas
        </button>

        <form onSubmit={handleSubmit} className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
          <h2 className="text-xl font-serif-display text-[#1A1A1A]">
            {editing.id ? 'Editar Perfil de Cineasta' : 'Novo Cineasta'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Nome do Cineasta *</label>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditing({
                    ...editing,
                    name: val,
                    slug: editing.slug || slugify(val),
                  });
                }}
                placeholder="Ex: Ingmar Bergman"
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

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Ano de Nascimento</label>
              <input
                type="number"
                value={editing.birthYear || ''}
                onChange={(e) => setEditing({ ...editing, birthYear: parseInt(e.target.value) || undefined })}
                placeholder="Ex: 1918"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">Ano de Falecimento (Opcional)</label>
              <input
                type="number"
                value={editing.deathYear || ''}
                onChange={(e) => setEditing({ ...editing, deathYear: parseInt(e.target.value) || undefined })}
                placeholder="Ex: 2007 (deixe em branco se vivo)"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A]/80 mb-1 font-bold uppercase">País de Origem</label>
              <input
                type="text"
                value={editing.country}
                onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                placeholder="Ex: Suécia"
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A]"
              />
            </div>

            <div className="md:col-span-2">
              <ImageUploader
                label="Retrato do Cineasta"
                value={editing.photo}
                onChange={(url) => setEditing({ ...editing, photo: url })}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[#1A1A1A]/80 font-bold uppercase">Biografia / Perfil Crítico *</label>
              <div className="border border-[#1A1A1A]/15 bg-white">
                <RichTextToolbar
                  textareaRef={textareaRef}
                  content={editing.bio}
                  onChange={(val) => setEditing({ ...editing, bio: val })}
                />
                <textarea
                  ref={textareaRef}
                  rows={8}
                  required
                  value={editing.bio}
                  onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                  placeholder="Escreva o perfil crítico e biografia..."
                  className="w-full p-4 text-sm font-serif-body text-[#1A1A1A] bg-white focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <TagInput
                tags={editing.tags || []}
                onChange={(newTags) => setEditing({ ...editing, tags: newTags })}
              />
            </div>

            <div className="md:col-span-2 pt-3 border-t border-[#1A1A1A]/10">
              <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-sans font-bold text-[#1A1A1A] select-none">
                <input
                  type="checkbox"
                  checked={editing.highlightHome || false}
                  onChange={(e) => {
                    setEditing({ ...editing, highlightHome: e.target.checked });
                  }}
                  className="w-4 h-4 accent-[#1A1A1A] rounded-none cursor-pointer"
                />
                <span>Destacar no Hero Rotativo da Home Principal</span>
              </label>
              <p className="text-[11px] font-sans text-[#1A1A1A]/60 mt-1 pl-6">
                Ao ativar, este cineasta passará a compor os destaques com imagem e resumo no carrossel de capa da Home.
              </p>
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
              <span>Salvar Cineasta</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Cineastas e Perfis</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <Plus size={14} /> Novo Cineasta
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cineastas.map((cin) => (
          <div key={cin.id} className="bg-white border border-[#1A1A1A]/15 p-4 flex gap-3 items-center">
            <img src={cin.photo} alt={cin.name} className="w-16 h-16 object-cover border border-[#1A1A1A]/15 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <h3 className="font-serif-display text-base text-[#1A1A1A] truncate">{cin.name}</h3>
                {cin.highlightHome && (
                  <span className="px-1.5 py-0.5 bg-[#1A1A1A] text-[#F5F2ED] text-[9px] font-sans font-bold uppercase tracking-wider">
                    ★ Hero Home
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#1A1A1A]/60">
                {cin.birthYear ? `${cin.birthYear}${cin.deathYear ? `–${cin.deathYear}` : ''}` : ''} · {cin.country}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setEditing(cin)}
                className="p-1 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClick(cin.id, cin.name)}
                className="p-1 hover:bg-red-50 text-red-600"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Cineasta"
          message={deleteTarget.depMsg || `Tem certeza de que deseja excluir o perfil do cineasta "${deleteTarget.name}"?`}
          confirmLabel="Excluir Cineasta"
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
