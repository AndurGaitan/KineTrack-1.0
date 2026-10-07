import { Card } from './ui/Card';
import type { HandoffPeriodState } from '../hooks/useHandoffPeriod';
import type { PeriodPreset } from '../domain/services/handoffData';
import { toLocalDateTimeInputValue } from '../utils/dateInput';
import { RefreshCwIcon } from 'lucide-react';

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: '12h', label: 'Últimas 12 h' },
  { value: '24h', label: 'Últimas 24 h' },
  { value: 'dia', label: 'Otro día' },
  { value: 'custom', label: 'Personalizado' },
];

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
    active ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
  }`;

const dateInput = 'border-2 border-gray-200 rounded-lg px-2 py-2 text-sm bg-white';

/** Selector de período (hoy / 12 h / 24 h / otro día / personalizado) y alcance (mío / equipo). */
export function HandoffPeriodPicker({ state }: { state: HandoffPeriodState }) {
  const { preset, setPreset, day, setDay, customFrom, setCustomFrom, customTo, setCustomTo, mineOnly, setMineOnly, refresh } = state;
  return (
    <Card>
      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 mb-2">Período</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.value} type="button" onClick={() => setPreset(p.value)} className={chip(preset === p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'dia' && (
          <input type="date" value={day} max={toLocalDateTimeInputValue(new Date()).slice(0, 10)} onChange={(e) => setDay(e.target.value)} className={dateInput} />
        )}
        {preset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              Desde
              <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={`${dateInput} w-full mt-1`} />
            </label>
            <label className="text-xs text-gray-600">
              Hasta
              <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={`${dateInput} w-full mt-1`} />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMineOnly(true)} className={chip(mineOnly)}>
              Solo lo mío
            </button>
            <button type="button" onClick={() => setMineOnly(false)} className={chip(!mineOnly)}>
              Todo el equipo
            </button>
          </div>
          <button type="button" onClick={refresh} className="flex items-center gap-1 text-sm text-blue-700 font-semibold">
            <RefreshCwIcon className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>
    </Card>
  );
}
