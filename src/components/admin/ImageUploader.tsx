import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Link as LinkIcon, Folder, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  fetchMediaItems,
  uploadAndCreateMediaItem,
  SupabaseMediaItem,
} from '../../services/repositories/mediaRepository';
import { StorageFolder } from '../../services/storageService';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  altText?: string;
  onChangeAltText?: (alt: string) => void;
  caption?: string;
  onChangeCaption?: (cap: string) => void;
  credit?: string;
  onChangeCredit?: (cred: string) => void;
  required?: boolean;
  folder?: StorageFolder;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  value,
  onChange,
  altText = '',
  onChangeAltText,
  caption = '',
  onChangeCaption,
  credit = '',
  onChangeCredit,
  required = false,
  folder = 'uploads' as StorageFolder,
}) => {
  const [mode, setMode] = useState<'upload' | 'url' | 'library'>('upload');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<SupabaseMediaItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    const { data } = await fetchMediaItems();
    if (data) {
      setLibraryItems(data);
    }
    setLoadingLibrary(false);
  }, []);

  useEffect(() => {
    if (isLibraryOpen || mode === 'library') {
      loadLibrary();
    }
  }, [isLibraryOpen, mode, loadLibrary]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;

    // Reset input value so the same file can be re-selected if needed
    e.target.value = '';

    setIsUploading(true);
    setUploadError(null);

    const result = await uploadAndCreateMediaItem(file, folder, {
      alt_text: altText,
      caption: caption,
      credit: credit,
    });

    if (result.error || !result.data) {
      setUploadError(result.error?.message || 'Falha no envio da imagem.');
    } else {
      onChange(result.data.public_url);
      setUploadError(null);
    }

    setIsUploading(false);
  };

  return (
    <div className="space-y-3 p-4 bg-white border border-[#1A1A1A]/15">
      <div className="flex items-center justify-between">
        <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/80 flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-red-600">*</span>}
        </label>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-1 border ${
              mode === 'upload'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-[#F5F2ED] text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-1 border ${
              mode === 'url'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-[#F5F2ED] text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('library');
              setIsLibraryOpen(true);
            }}
            className={`px-2 py-1 border flex items-center gap-1 ${
              mode === 'library'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-[#F5F2ED] text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <Folder size={12} />
            <span>Biblioteca</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-500 hover:text-red-800 text-[10px] uppercase font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Input controls based on mode */}
      {mode === 'upload' && (
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            disabled={isUploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-4 px-4 bg-[#F5F2ED] border border-dashed border-[#1A1A1A]/30 text-[#1A1A1A] text-xs font-sans hover:bg-white hover:border-[#1A1A1A] transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <Loader2 size={24} className="animate-spin text-[#1A1A1A]" />
                <span className="font-semibold">Enviando para Supabase Storage (bucket: media/{folder})...</span>
                <span className="text-[10px] text-[#1A1A1A]/60 font-mono">Salvando e gerando registro em media_items</span>
              </>
            ) : (
              <>
                <Upload size={20} className="text-[#1A1A1A]/60" />
                <span className="font-semibold">Clique para selecionar imagem do seu dispositivo</span>
                <span className="text-[10px] text-[#1A1A1A]/60 font-mono">PNG, JPG, WEBP, AVIF até 10 MB</span>
              </>
            )}
          </button>
        </div>
      )}

      {mode === 'url' && (
        <div>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
          />
        </div>
      )}

      {/* Preview box */}
      {value && (
        <div className="space-y-3 pt-2">
          <div className="relative aspect-video w-full max-w-md bg-[#1A1A1A]/5 border border-[#1A1A1A]/15 overflow-hidden">
            <img
              src={value}
              alt={altText || 'Pré-visualização'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Optional Meta fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1A1A1A]/10 text-xs">
            {onChangeAltText && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#1A1A1A]/60 mb-0.5">Texto Alt (Acessibilidade)</label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => onChangeAltText(e.target.value)}
                  placeholder="Descrição para leitores..."
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2 py-1 text-xs font-mono"
                />
              </div>
            )}
            {onChangeCaption && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#1A1A1A]/60 mb-0.5">Legenda</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => onChangeCaption(e.target.value)}
                  placeholder="Legenda da foto..."
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2 py-1 text-xs font-mono"
                />
              </div>
            )}
            {onChangeCredit && (
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#1A1A1A]/60 mb-0.5">Crédito / Fotógrafo</label>
                <input
                  type="text"
                  value={credit}
                  onChange={(e) => onChangeCredit(e.target.value)}
                  placeholder="Fotógrafo ou arquivo..."
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 px-2 py-1 text-xs font-mono"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F2ED] w-full max-w-3xl max-h-[80vh] border border-[#1A1A1A] p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-serif-display text-lg text-[#1A1A1A]">Biblioteca de Mídia (Supabase)</h3>
                <button
                  type="button"
                  onClick={loadLibrary}
                  disabled={loadingLibrary}
                  className="p-1 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]/60 transition-colors"
                  title="Atualizar biblioteca"
                >
                  <RefreshCw size={12} className={loadingLibrary ? 'animate-spin' : ''} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsLibraryOpen(false)}
                className="text-xs font-mono px-3 py-1 bg-[#1A1A1A] text-[#F5F2ED]"
              >
                Fechar [ESC]
              </button>
            </div>

            {loadingLibrary && libraryItems.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-[#1A1A1A]/60 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Carregando imagens do Supabase...</span>
              </div>
            ) : libraryItems.length === 0 ? (
              <p className="text-xs font-mono text-[#1A1A1A]/60 py-8 text-center">
                Nenhuma imagem na biblioteca ainda. Faça upload de uma imagem primeiro!
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {libraryItems.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onChange(m.public_url);
                      if (onChangeAltText && m.alt_text) onChangeAltText(m.alt_text);
                      if (onChangeCaption && m.caption) onChangeCaption(m.caption);
                      if (onChangeCredit && m.credit) onChangeCredit(m.credit);
                      setIsLibraryOpen(false);
                    }}
                    className={`cursor-pointer border p-2 bg-white transition-all hover:border-[#1A1A1A] space-y-1 ${
                      value === m.public_url ? 'border-2 border-[#1A1A1A] ring-2 ring-[#1A1A1A]/20' : 'border-[#1A1A1A]/15'
                    }`}
                  >
                    <div className="aspect-video bg-[#1A1A1A]/5 overflow-hidden">
                      <img src={m.public_url} alt={m.alt_text || m.filename} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <p className="text-[10px] font-mono text-[#1A1A1A] truncate">{m.filename}</p>
                    {m.caption && <p className="text-[9px] font-serif-body text-[#1A1A1A]/60 truncate">{m.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

