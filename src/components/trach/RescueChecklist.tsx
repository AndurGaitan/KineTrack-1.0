import { useRef, useState } from 'react';
import { useRetry } from '../../hooks/useRetry';
import { dismissRetry, notifyError, notifySuccess, offerRetry } from '../../utils/notify';
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
  const lastToggle = useRef<{ key: string; checked: boolean }>();
  const retry = useRetry(() => lastToggle.current && toggle(lastToggle.current.key, lastToggle.current.checked));

  const toggle = async (key: string, checked: boolean) => {
    lastToggle.current = { key, checked };
    dismissRetry(retry);
    setBusyKey(key);
    try {
      onProcessChange(await trachApi.updateRescueChecklist(process.id, { [key]: checked }));
      notifySuccess('Checklist de rescate guardado');
    } catch (err) {
      notifyError('No se pudo guardar el checklist', err);
      offerRetry(retry);
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
    </div>
  );
}
