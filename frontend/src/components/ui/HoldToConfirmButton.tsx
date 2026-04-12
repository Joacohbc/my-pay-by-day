import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  duration?: number;
  className?: string;
  icon: string;
  label: string;
  description?: string;
  variant?: 'danger' | 'primary';
  disabled?: boolean;
}

export function HoldToConfirmButton({
  onConfirm,
  duration = 1500,
  className = '',
  icon,
  label,
  description,
  variant = 'danger',
  disabled = false
}: HoldToConfirmButtonProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    if (!isHolding) return;

    const start = performance.now();
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - start;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);

      if (p < 100) {
        frameId = requestAnimationFrame(tick);
      } else {
        onConfirm();
        setIsHolding(false);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isHolding, duration, onConfirm]);

  const handleStop = () => {
    setIsHolding(false);
    setProgress(0);
  };

  const colorClass = variant === 'danger' ? 'text-dn-error' : 'text-dn-primary';
  const bgColorClass = variant === 'danger' ? 'bg-dn-error/10' : 'bg-dn-primary/10';
  const progressBgClass = variant === 'danger' ? 'bg-dn-error/20' : 'bg-dn-primary/20';

  return (
    <button
      type="button"
      className={`relative w-full flex items-center gap-4 p-4 text-left bg-dn-bg/50 border border-white/5 rounded-card overflow-hidden transition-all select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group ${className}`}
      onMouseDown={() => !disabled && setIsHolding(true)}
      onMouseUp={handleStop}
      onMouseLeave={handleStop}
      onTouchStart={() => !disabled && setIsHolding(true)}
      onTouchEnd={handleStop}
      disabled={disabled}
    >
      {/* Progress Background Overlay */}
      <div 
        className={`absolute inset-y-0 left-0 ${progressBgClass} transition-opacity duration-300 ${isHolding ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: `${progress}%` }}
      />

      <div className={`relative z-10 w-12 h-12 rounded-full ${bgColorClass} flex items-center justify-center ${colorClass} shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
        <Icon name={isHolding ? 'timer' : icon} className="text-2xl" />
      </div>

      <div className="relative z-10 flex-1 min-w-0">
        <p className={`font-semibold text-base transition-colors ${isHolding ? colorClass : 'text-dn-text-main'}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-dn-text-muted mt-0.5 leading-relaxed">
            {isHolding ? t('common.holdToConfirm') : description}
          </p>
        )}
      </div>

      <div className="relative z-10">
        <Icon name="arrow_forward_ios" className="text-dn-text-muted text-[16px] group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
