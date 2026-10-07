import { useState } from 'react';
import { EducationalTooltip } from './ui/Tooltip';
import { vmiEducation, rassLevels, formatRass } from '../utils/vmiEducation';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface RassSelectorProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

/** RASS (+4 a -5): una fila por nivel, con su descripción desplegable. Opcional. */
export function RassSelector({ value, onChange }: RassSelectorProps) {
  const [openLevel, setOpenLevel] = useState<number | null>(null);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">RASS</label>
        <div className="flex items-center gap-3">
          {value !== undefined && (
            <button type="button" onClick={() => onChange(undefined)} className="text-sm text-blue-700 font-semibold">
              Quitar selección
            </button>
          )}
          <EducationalTooltip content={vmiEducation.rass} />
        </div>
      </div>

      <div className="space-y-2">
        {rassLevels.map((level) => {
          const selected = value === level.value;
          const expanded = openLevel === level.value;
          return (
            <div
              key={level.value}
              className={`border-2 rounded-xl transition-colors ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-2 pr-2">
                <label className="flex items-center gap-3 flex-1 p-3 cursor-pointer min-w-0">
                  <input type="radio" name="rass" checked={selected} onChange={() => onChange(level.value)} className="w-5 h-5 flex-shrink-0" />
                  <span className="font-bold text-gray-900 w-8 flex-shrink-0">{formatRass(level.value)}</span>
                  <span className="font-medium text-gray-900">{level.label}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setOpenLevel(expanded ? null : level.value)}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Ocultar' : 'Ver'} descripción de ${formatRass(level.value)} ${level.label}`}
                  className="p-2 text-gray-500"
                >
                  {expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                </button>
              </div>
              {expanded && <p className="px-4 pb-3 -mt-1 text-sm text-gray-600">{level.description}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
