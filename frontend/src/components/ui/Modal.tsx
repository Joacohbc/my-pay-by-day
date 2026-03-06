import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md bg-dn-surface border border-white/5 rounded-t-[28px] sm:rounded-card shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-dn-bg/30">
            <h2 className="text-base font-semibold text-dn-text-main">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 pb-5 pt-3 border-t border-dn-bg/30">{footer}</div>
        )}
      </div>
    </div>
  );
}
