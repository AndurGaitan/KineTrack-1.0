import { useState } from 'react';
import * as trachApi from '../../api/trachApi';
import { RESCUE_ITEMS, ago } from '../../domain/services/trachDecannulation';
import type { TrachDecannulationProcess } from '../../types';

interface RescueChecklistProps {
  process: TrachDecannulationProcess;
  now: Date;
  onProcessChange: (process: TrachDecannulationProcess) => void;
}

/** Capacidad institucional de rescate. Cada ítem recuerda cuándo se confirmó. */
export function RescueChecklist({ process, now, onProcessChange }: RescueChecklistProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (key: string, checked: boolean) => {
    setBusyKey(key);
    setError(null);
    try {
      onProcessChange(await trachApi.updateRescueChecklist(process.id, { [key]: checked }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-2">
      {RESCUE_ITEMS.map((item) => {
        const state = process.rescueChecklist[item.key];
        const checked = !!state?.checked;
        return (
          <label
            key={item.key}
            className={`flex items-start gap-3 rounded-xl border p-3 ${checked ? 'border-green-300 bg-green-50' : 'border-gray-200'} ${busyKey === item.key ? 'opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={busyKey !== null}
              onChange={(e) => toggle(item.key, e.target.checked)}
              className="w-5 h-5 mt-0.5 flex-shrink-0"
            />
            <span className="text-sm text-gray-900">
              {item.label}
              {checked && state && <span className="block text-xs text-green-700 mt-0.5">Confirmado {ago(state.at, now)}</span>}
            </span>
          </label>
        );
      })}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
