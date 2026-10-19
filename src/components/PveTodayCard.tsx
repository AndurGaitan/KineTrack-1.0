import { useState } from 'react';
import { Card } from './ui/Card';
import { useApp } from '../contexts/AppContext';
import { useRecordTimestamp } from '../hooks/useRecordTimestamp';
import { RecordDateField } from './RecordDateField';
import {
  PveDecisionForm,
  PveDraft,
  emptyPveDraft,
  pveDecisionLabels,
  pveDraftError,
  pveDraftToInput,
  pveReasonLabel,
  pveSbtTypes,
} from './PveDecisionForm';
import type { PveDecision } from '../types';

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const tone: Record<PveDecision['decision'], string> = {
  realizada: 'bg-green-50 border-green-200 text-green-900',
  contraindicada: 'bg-amber-50 border-amber-200 text-amber-900',
  'no-realizada': 'bg-gray-50 border-gray-200 text-gray-800',
};

function describe(d: PveDecision): string {
  if (d.decision === 'realizada') {
    const type = pveSbtTypes.find((t) => t.value === d.sbtType)?.label ?? d.sbtType;
    const result = d.sbtResult === 'success' ? 'exitosa' : d.sbtResult === 'failure' ? 'fallida' : undefined;
    return [type, result, d.failureReason].filter(Boolean).join(' · ');
  }
  return pveReasonLabel(d.decision, d.reason) ?? '';
}

/**
 * "PVE de hoy": acción rápida para dejar asentada la decisión diaria sobre la
 * prueba de ventilación espontánea sin tener que cargar una monitorización completa.
 */
export function PveTodayCard({ patientId, now }: { patientId: string; now: Date }) {
  const { getPatientPveDecisions, addPveDecision, deletePveDecision } = useApp();
  const recordedAt = useRecordTimestamp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PveDraft>(emptyPveDraft);
  const [busy, setBusy] = useState(false);

  const decisions = getPatientPveDecisions(patientId);
  const today = decisions.filter((d) => sameDay(new Date(d.timestamp), now));
  const earlier = decisions.filter((d) => !sameDay(new Date(d.timestamp), now)).slice(0, 3);

  const error = pveDraftError(draft);
  const canSave = !!draft.decision && !error && !recordedAt.isFuture;

  const save = async () => {
    const input = pveDraftToInput(draft, patientId, recordedAt.timestamp);
    if (!input || recordedAt.isFuture) return;
    setBusy(true);
    const ok = await addPveDecision(input);
    setBusy(false);
    if (ok) {
      setOpen(false);
      setDraft(emptyPveDraft);
    }
  };

  const row = (d: PveDecision, showDate: boolean) => (
    <div key={d.id} className={`rounded-xl border p-3 text-sm ${tone[d.decision]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">
            {pveDecisionLabels[d.decision]}
            {showDate && (
              <span className="font-normal text-xs ml-2">
                {new Date(d.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
          {describe(d) && <div className="mt-0.5">{describe(d)}</div>}
        </div>
        <button
          onClick={() => {
            if (window.confirm('¿Eliminar esta decisión de PVE?')) void deletePveDecision(d.id);
          }}
          className="text-xs underline opacity-70 shrink-0"
        >
          Eliminar
        </button>
      </div>
    </div>
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">PVE de hoy</h2>
        <span className="text-xs text-gray-500">Prueba de ventilación espontánea</span>
      </div>

      {today.length > 0 ? (
        <div className="space-y-2">{today.map((d) => row(d, false))}</div>
      ) : (
        <p className="text-sm text-gray-600">Todavía no hay una decisión registrada hoy.</p>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-xl bg-blue-600 text-white font-bold px-4 py-3 active:bg-blue-700"
        >
          {today.length > 0 ? 'Registrar otra decisión' : 'Registrar decisión de PVE'}
        </button>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          <PveDecisionForm value={draft} onChange={setDraft} allowClear={false} />
          <RecordDateField state={recordedAt} label="Fecha y hora de la decisión" />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setOpen(false);
                setDraft(emptyPveDraft);
              }}
              disabled={busy}
              className="rounded-xl border border-gray-300 px-4 py-3 text-gray-700 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => void save()}
              disabled={!canSave || busy}
              className="rounded-xl bg-blue-600 text-white font-bold px-4 py-3 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {earlier.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Días anteriores</div>
          <div className="space-y-2">{earlier.map((d) => row(d, true))}</div>
        </div>
      )}
    </Card>
  );
}
