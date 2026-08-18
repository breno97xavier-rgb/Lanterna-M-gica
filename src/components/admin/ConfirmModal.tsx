import React, { useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-[#F5F2ED] border border-[#1A1A1A] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#1A1A1A] text-[#F5F2ED] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDanger ? (
              <Trash2 size={16} className="text-red-400" />
            ) : (
              <AlertTriangle size={16} className="text-amber-400" />
            )}
            <span className="font-serif-display text-base tracking-tight text-[#F5F2ED]">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#F5F2ED]/70 hover:text-[#F5F2ED] p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="font-serif-body text-sm text-[#1A1A1A]/85 leading-relaxed whitespace-pre-line">
            {message}
          </p>

          {isDanger && (
            <p className="text-[11px] font-sans font-semibold text-red-800 bg-red-100/80 border border-red-300 p-2.5">
              Esta ação removerá a publicação e não poderá ser desfeita.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#1A1A1A]/30 bg-white hover:bg-[#1A1A1A]/5 text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-5 py-2 text-xs font-sans font-bold uppercase tracking-wider transition-colors shadow-xs ${
                isDanger
                  ? 'bg-red-700 hover:bg-red-800 text-white'
                  : 'bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 text-[#F5F2ED]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
