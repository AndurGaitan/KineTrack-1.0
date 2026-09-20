interface ChipGroupProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  /** Tocar de nuevo el chip elegido lo deselecciona (por defecto sí: casi todo es opcional). */
  clearable?: boolean;
  tone?: 'blue' | 'green' | 'red' | 'amber';
}

const TONES = {
  blue: 'border-blue-600 bg-blue-50 text-blue-900',
  green: 'border-green-600 bg-green-50 text-green-900',
  red: 'border-red-600 bg-red-50 text-red-900',
  amber: 'border-amber-500 bg-amber-50 text-amber-900',
};

/** Fila de chips de selección única, pensada para tocar rápido con el pulgar. */
export function ChipGroup<T extends string>({ options, value, onChange, clearable = true, tone = 'blue' }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(selected && clearable ? undefined : opt.value)}
            aria-pressed={selected}
            className={`min-h-[44px] px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
              selected ? TONES[tone] : 'border-gray-200 text-gray-600 bg-white active:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
