import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Trash2, Copy, Check, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, Edit2, X } from 'lucide-react';
import {
  fetchMediaItems,
  deleteMediaItem,
  updateMediaItem,
  SupabaseMediaItem,
} from '../../services/repositories/mediaRepository';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

interface MediaAdminProps {
  onNotify: (msg: string) => void;
}

export const MediaAdmin: React.FC<MediaAdminProps> = ({ onNotify }) => {
  const [mediaList, setMediaList] = useState<SupabaseMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit metadata modal / state
  const [editingItem, setEditingItem] = useState<SupabaseMediaItem | null>(null);
  const [editAltText, setEditAltText] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editCredit, setEditCredit] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string; storage_path: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchMediaItems();
    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setMediaList(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    onNotify('URL pública da imagem copiada para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEdit = (item: SupabaseMediaItem) => {
    setEditingItem(item);
    setEditAltText(item.alt_text || '');
    setEditCaption(item.caption || '');
    setEditCredit(item.credit || '');
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSavingEdit) return;

    setIsSavingEdit(true);
    setError(null);

    const { data, error: updateErr } = await updateMediaItem(editingItem.id, {
      alt_text: editAltText.trim() || null,
      caption: editCaption.trim() || null,
      credit: editCredit.trim() || null,
    });

    if (updateErr) {
      setError(updateErr.message);
      onNotify(`Erro: ${updateErr.message}`);
    } else if (data) {
      onNotify('Metadados da imagem atualizados com sucesso!');
      setEditingItem(null);
      await loadMedia();
    }
    setIsSavingEdit(false);
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    const { error: delErr, storageWarning } = await deleteMediaItem(deleteTarget.id, deleteTarget.storage_path);

    if (delErr) {
      setError(delErr.message);
      onNotify(`Erro ao excluir: ${delErr.message}`);
    } else {
      if (storageWarning) {
        onNotify(`Aviso: ${storageWarning}`);
      } else {
        onNotify(`Imagem "${deleteTarget.filename}" e arquivo no Storage excluídos.`);
      }
      setDeleteTarget(null);
      await loadMedia();
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif-display text-2xl text-[#1A1A1A]">Biblioteca de Mídia</h2>
          <p className="text-xs font-mono text-[#1A1A1A]/60 mt-0.5">
            Arquivos armazenados no bucket <code className="bg-[#1A1A1A]/5 px-1 py-0.5">media</code> do Supabase Storage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadMedia}
            disabled={loading}
            className="p-1.5 bg-white border border-[#1A1A1A]/15 text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
            title="Recarregar biblioteca"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs font-mono text-[#1A1A1A]/60">{mediaList.length} arquivos</span>
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

      {/* Upload de Novo Arquivo */}
      <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-4">
        <h3 className="font-serif-display text-lg text-[#1A1A1A]">Upload Direto para o Supabase Storage</h3>
        <ImageUploader
          label="Selecione imagem para upload no bucket media/uploads"
          value={uploadUrl}
          folder="uploads"
          onChange={(url) => {
            setUploadUrl(url);
            loadMedia();
            onNotify('Imagem enviada e registrada em public.media_items!');
          }}
        />
      </div>

      {/* Modal de Edição de Metadados */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F2ED] w-full max-w-lg border border-[#1A1A1A] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-3">
              <h3 className="font-serif-display text-lg text-[#1A1A1A]">Editar Metadados da Imagem</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]/60"
              >
                <X size={16} />
              </button>
            </div>

            <div className="aspect-video bg-black/5 overflow-hidden border border-[#1A1A1A]/15 max-h-48">
              <img src={editingItem.public_url} alt={editingItem.filename} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#1A1A1A]/60 mb-1">Caminho no Storage</label>
                <input
                  type="text"
                  value={editingItem.storage_path}
                  disabled
                  className="w-full bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 px-2 py-1 text-[11px] text-[#1A1A1A]/60 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#1A1A1A]/60 mb-1">Texto Alternativo (Alt Text)</label>
                <input
                  type="text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  placeholder="Descrição da imagem para acessibilidade..."
                  className="w-full bg-white border border-[#1A1A1A]/15 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#1A1A1A]/60 mb-1">Legenda (Caption)</label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Legenda descritiva..."
                  className="w-full bg-white border border-[#1A1A1A]/15 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#1A1A1A]/60 mb-1">Crédito / Fotógrafo</label>
                <input
                  type="text"
                  value={editCredit}
                  onChange={(e) => setEditCredit(e.target.value)}
                  placeholder="Nome do fotógrafo ou acervo..."
                  className="w-full bg-white border border-[#1A1A1A]/15 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1A1A1A]/15">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-white border border-[#1A1A1A]/15 text-xs font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Salvar Metadados</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid de Imagens */}
      {loading && mediaList.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-[#1A1A1A]/60 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Carregando biblioteca do Supabase...</span>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[#1A1A1A]/20 bg-white p-6">
          <ImageIcon size={24} className="mx-auto text-[#1A1A1A]/30 mb-2" />
          <p className="text-xs font-mono text-[#1A1A1A]/60">Nenhuma imagem armazenada em public.media_items.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {mediaList.map((item) => (
            <div key={item.id} className="bg-white border border-[#1A1A1A]/15 p-4 space-y-3 group hover:border-[#1A1A1A] transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="aspect-video bg-[#1A1A1A]/5 overflow-hidden border border-[#1A1A1A]/10 relative">
                  <img
                    src={item.public_url}
                    alt={item.alt_text || item.filename}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {item.file_size_bytes && (
                    <span className="absolute bottom-1 right-1 bg-[#1A1A1A]/80 text-[#F5F2ED] text-[9px] font-mono px-1 py-0.5">
                      {(item.file_size_bytes / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-[#1A1A1A] truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  {item.caption && (
                    <p className="text-[11px] font-serif-body text-[#1A1A1A]/70 truncate" title={item.caption}>
                      {item.caption}
                    </p>
                  )}
                  {item.credit && (
                    <p className="text-[10px] font-mono text-[#1A1A1A]/50 truncate">
                      Foto: {item.credit}
                    </p>
                  )}
                  <p className="text-[9px] font-mono text-[#1A1A1A]/40 truncate">
                    {item.storage_path}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(item.public_url, item.id)}
                  className="px-2.5 py-1 bg-[#F5F2ED] border border-[#1A1A1A]/15 hover:bg-[#1A1A1A] hover:text-[#F5F2ED] text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  {copiedId === item.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedId === item.id ? 'Copiado!' : 'Copiar URL'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1 text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors"
                    title="Editar Metadados"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: item.id, filename: item.filename, storage_path: item.storage_path })}
                    className="p-1 text-[#1A1A1A]/40 hover:text-red-600 transition-colors"
                    title="Excluir Imagem"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Mídia"
          message={`Tem certeza de que deseja remover permanentemente "${deleteTarget.filename}" do banco de dados e do bucket media (${deleteTarget.storage_path})?`}
          confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir Imagem'}
          isDanger={true}
          onConfirm={confirmDeleteAction}
          onClose={() => !isDeleting && setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

