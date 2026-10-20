/**
 * Selector de una opción con botones grandes (reemplaza radios y selects en los
 * formularios de carga rápida). Tocar de nuevo la opción elegida la deselecciona
 * si `allowClear`.
 */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  allowClear = false,
  columns,
}: {
  label?: string;
  options: { value: T; label: string; hint?: string }[];
  value: T | '' | undefined;
  onChange: (next: T | '') => void;
  allowClear?: boolean;
  /** Fuerza la cantidad de columnas; por defecto se acomoda solo. */
  columns?: 2 | 3;
}) {
  const grid = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';
  return (
    <div>
      {label && <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>}
      <div className={`grid ${grid} gap-2`} role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active && allowClear ? '' : opt.value)}
              className={`min-h-[52px] px-3 py-2 border-2 rounded-xl text-left transition-colors ${
                active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white active:bg-gray-50'
              }`}
            >
              <span className="block text-sm font-semibold text-gray-900 leading-tight">{opt.label}</span>
              {opt.hint && <span className="block text-xs text-gray-500 mt-0.5 leading-tight">{opt.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
