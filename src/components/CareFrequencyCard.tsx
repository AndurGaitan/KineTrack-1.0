import { useRef, useState } from 'react';
import { Card } from './ui/Card';
import { ChoiceChips } from './ChoiceChips';
import { useApp } from '../contexts/AppContext';
import { useRetry } from '../hooks/useRetry';
import { dismissRetry, notifySuccess, offerRetry } from '../utils/notify';
import { visitOptions } from '../utils/careFrequency';
import type { Patient, VisitsPerWeek } from '../types';

/** Frecuencia de visita según la evaluación: se guarda con un toque. */
export function CareFrequencyCard({ patient }: { patient: Patient }) {
  const { setCareFrequency } = useApp();
  const [saving, setSaving] = useState<VisitsPerWeek | null>();
  const pending = useRef<VisitsPerWeek | null>(null);
  const current = patient.careFrequency;
  const retry = useRetry(() => save(pending.current));

  const save = async (value: VisitsPerWeek | null) => {
    if (saving !== undefined) return;
    pending.current = value;
    dismissRetry(retry);
    setSaving(value);
    const ok = await setCareFrequency(patient.id, value);
    setSaving(undefined);
    if (!ok) offerRetry(retry);
    else if (value) notifySuccess('Frecuencia guardada', `${value} x semana · ${patient.alias}`);
    else notifySuccess('Frecuencia quitada', patient.alias);
  };

  const shown = saving !== undefined ? saving : current?.timesPerWeek;
  const since = current && new Date(current.setAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-3">Frecuencia kinésica</h3>
      <div aria-busy={saving !== undefined}>
        <ChoiceChips
          options={visitOptions.map((n) => ({ value: String(n), label: `${n} veces`, hint: 'por semana' }))}
          value={shown ? String(shown) : ''}
          onChange={(value) => {
            const next = Number(value) as VisitsPerWeek;
            if (next !== current?.timesPerWeek) save(next);
          }}
          columns={3}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>{current ? `Definida ${current.setByName ? `por ${current.setByName} ` : ''}el ${since}` : 'Pendiente de evaluar'}</span>
        {current && (
          <button type="button" onClick={() => save(null)} disabled={saving !== undefined} className="font-semibold text-gray-600 underline py-1">
            Quitar
          </button>
        )}
      </div>
    </Card>
  );
}
