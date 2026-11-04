/** Selector de varias opciones con botones grandes (se pueden marcar o desmarcar libremente). */
export function MultiChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
  columns?: 2 | 3;
}) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div>
      {label && <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>}
      <div className={`grid ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`} role="group" aria-label={label}>
        {options.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt.value)}
              className={`min-h-[48px] px-3 py-2 border-2 rounded-xl text-left text-sm font-semibold leading-tight transition-colors ${
                active ? 'border-emerald-600 bg-emerald-50 text-gray-900' : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
