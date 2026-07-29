import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  full: 'w-full max-w-5xl h-[92vh]',
};

export function Modal({ open, onClose, title, children, footer, size = 'md', className = '' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onSubmit={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative z-10 w-full bg-dn-surface border border-white/5 rounded-card shadow-xl flex flex-col max-h-[92vh] ${sizeClasses[size]} ${className}`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-dn-bg/30 shrink-0">
            <h2 className="text-base font-semibold text-dn-text-main">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-dn-text-muted hover:text-dn-text-main hover:bg-dn-surface-low transition-colors"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 pb-5 pt-3 border-t border-dn-bg/30 shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
