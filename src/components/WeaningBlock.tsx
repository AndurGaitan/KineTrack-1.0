import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  PveDecisionForm,
  PveDraft,
  emptyPveDraft,
  pveDecisionLabels,
  pveReasonLabel,
  pveSbtTypes,
} from './PveDecisionForm';
import type { PveDecision } from '../types';

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

/** Decisiones de PVE del paciente que caen en el mismo día que `when` (la fecha del registro). */
export function pveDecisionsOfDay(decisions: PveDecision[], when: Date): PveDecision[] {
  const day = when.toDateString();
  return decisions.filter((d) => new Date(d.timestamp).toDateString() === day);
}

/**
 * "Destete de hoy": único lugar donde se asienta el estado de destete y la PVE.
 * Un solo selector de tres estados; el estado de destete del registro se deduce
 * de la decisión. Si hoy ya hay una decisión cargada, se muestra resumida en vez
 * de pedirla otra vez.
 */
export function WeaningBlock({
  value,
  onChange,
  existing,
}: {
  value: PveDraft;
  onChange: (next: PveDraft) => void;
  /** Decisión(es) ya cargada(s) para el día del registro. */
  existing: PveDecision[];
}) {
  const { deletePveDecision } = useApp();
  const [changing, setChanging] = useState(false);

  const showSummary = existing.length > 0 && !changing && !value.decision;

  if (showSummary) {
    return (
      <div className="space-y-2">
        {existing.map((d) => (
          <div key={d.id} className={`rounded-xl border p-3 text-sm ${tone[d.decision]}`}>
            <div className="font-semibold">{pveDecisionLabels[d.decision]}</div>
            {describe(d) && <div className="mt-0.5">{describe(d)}</div>}
          </div>
        ))}
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => setChanging(true)} className="font-semibold text-blue-700 underline">
            Cambiar
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Quitar la decisión de PVE de hoy?')) existing.forEach((d) => void deletePveDecision(d.id));
            }}
            className="text-gray-600 underline"
          >
            Quitar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <PveDecisionForm value={value} onChange={onChange} />
      {existing.length > 0 && (
        <p className="text-xs text-gray-500">
          Al guardar reemplaza la decisión de hoy.{' '}
          <button
            type="button"
            onClick={() => {
              setChanging(false);
              onChange(emptyPveDraft);
            }}
            className="underline"
          >
            Cancelar cambio
          </button>
        </p>
      )}
    </div>
  );
}
