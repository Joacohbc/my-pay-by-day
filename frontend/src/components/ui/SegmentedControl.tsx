interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  label?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const activeHint = options.find((o) => o.value === value)?.hint;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex rounded-input overflow-hidden border border-white/10">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-3 text-xs font-medium transition-colors border-r border-white/10 last:border-r-0 ${
              value === opt.value
                ? 'bg-dn-primary/15 text-dn-primary'
                : 'bg-dn-surface-low text-dn-text-muted hover:text-dn-text-main'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {activeHint && <p className="text-xs text-dn-text-muted">{activeHint}</p>}
    </div>
  );
}
