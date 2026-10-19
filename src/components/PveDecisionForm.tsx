import type { PveDecisionKind, PveSbtType } from '../types';
import type { CreatePveDecisionInput } from '../api/pveDecisionsApi';

/**
 * Decisión diaria sobre la prueba de ventilación espontánea (PVE):
 * realizada, contraindicada (con motivo) o no realizada (con motivo).
 * Lo usan la monitorización VMI y la tarjeta "PVE de hoy".
 */

export const pveContraindicationReasons: { value: string; label: string }[] = [
  { value: 'inestabilidad-hemodinamica', label: 'Inestabilidad hemodinámica' },
  { value: 'fio2-peep-altos', label: 'FiO₂ / PEEP altos' },
  { value: 'sedacion-profunda', label: 'Sedación profunda o sin impulso respiratorio' },
  { value: 'bloqueo-neuromuscular', label: 'Bloqueo neuromuscular' },
  { value: 'hipertension-endocraneana', label: 'Hipertensión endocraneana' },
  { value: 'otra', label: 'Otra' },
];

export const pveNotDoneReasons: { value: string; label: string }[] = [
  { value: 'decision-medica', label: 'Decisión médica' },
  { value: 'falta-de-tiempo', label: 'Falta de tiempo / personal' },
  { value: 'otra', label: 'Otra' },
];

export const pveSbtTypes: { value: PveSbtType; label: string }[] = [
  { value: 'psv', label: 'Presión de soporte (PSV)' },
  { value: 'cpap', label: 'CPAP' },
  { value: 't-piece', label: 'Tubo en T' },
];

export const pveDecisionLabels: Record<PveDecisionKind, string> = {
  realizada: 'PVE realizada',
  contraindicada: 'PVE contraindicada',
  'no-realizada': 'PVE no realizada',
};

export function pveReasonLabel(decision: PveDecisionKind, reason?: string): string | undefined {
  const list = decision === 'contraindicada' ? pveContraindicationReasons : pveNotDoneReasons;
  return list.find((r) => r.value === reason)?.label ?? reason;
}

export interface PveDraft {
  decision: '' | PveDecisionKind;
  reason: string;
  sbtType: '' | PveSbtType;
  sbtResult: '' | 'success' | 'failure';
  failureReason: string;
}

export const emptyPveDraft: PveDraft = { decision: '', reason: '', sbtType: '', sbtResult: '', failureReason: '' };

/** Qué falta para poder guardar el borrador (null si está completo o si no se eligió ninguna decisión). */
export function pveDraftError(d: PveDraft): string | null {
  if (!d.decision) return null;
  if (d.decision === 'realizada') return d.sbtType ? null : 'Indicá la modalidad de la PVE';
  return d.reason ? null : d.decision === 'contraindicada' ? 'Indicá el motivo de la contraindicación' : 'Indicá por qué no se realizó';
}

export function pveDraftToInput(d: PveDraft, patientId: string, timestamp?: string): CreatePveDecisionInput | null {
  if (!d.decision || pveDraftError(d)) return null;
  if (d.decision === 'realizada') {
    return {
      patientId,
      timestamp,
      decision: 'realizada',
      sbtType: d.sbtType as PveSbtType,
      sbtResult: d.sbtResult || undefined,
      failureReason: d.sbtResult === 'failure' && d.failureReason.trim() ? d.failureReason.trim() : undefined,
    };
  }
  return { patientId, timestamp, decision: d.decision, reason: d.reason };
}

const options: { value: PveDecisionKind; label: string; hint: string; active: string }[] = [
  { value: 'realizada', label: 'Realizada', hint: 'Se hizo la prueba', active: 'border-green-500 bg-green-50' },
  { value: 'contraindicada', label: 'Contraindicada', hint: 'No es elegible hoy', active: 'border-amber-500 bg-amber-50' },
  { value: 'no-realizada', label: 'No realizada', hint: 'Era elegible, no se hizo', active: 'border-gray-500 bg-gray-100' },
];

const fieldClass = 'w-full min-h-[48px] px-3 text-base border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none bg-white';

export function PveDecisionForm({
  value,
  onChange,
  allowClear = true,
}: {
  value: PveDraft;
  onChange: (next: PveDraft) => void;
  /** Permite volver a "sin decisión" (en la monitorización es opcional). */
  allowClear?: boolean;
}) {
  const reasons = value.decision === 'contraindicada' ? pveContraindicationReasons : pveNotDoneReasons;
  const error = pveDraftError(value);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Decisión sobre la PVE">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value.decision === opt.value}
            onClick={() =>
              onChange(
                value.decision === opt.value && allowClear
                  ? emptyPveDraft
                  : { ...emptyPveDraft, decision: opt.value }
              )
            }
            className={`p-3 border-2 rounded-xl text-left transition-colors min-h-[64px] ${
              value.decision === opt.value ? opt.active : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="font-bold text-gray-900 text-sm">{opt.label}</div>
            <div className="text-xs text-gray-600 mt-0.5">{opt.hint}</div>
          </button>
        ))}
      </div>

      {value.decision === 'realizada' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
            <select
              className={fieldClass}
              value={value.sbtType}
              onChange={(e) => onChange({ ...value, sbtType: e.target.value as PveDraft['sbtType'] })}
            >
              <option value="">Seleccionar...</option>
              {pveSbtTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
            <div className="grid grid-cols-2 gap-2">
              {(['success', 'failure'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={value.sbtResult === r}
                  onClick={() => onChange({ ...value, sbtResult: value.sbtResult === r ? '' : r, failureReason: '' })}
                  className={`min-h-[48px] border-2 rounded-xl font-medium ${
                    value.sbtResult === r
                      ? r === 'success'
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r === 'success' ? 'Exitosa' : 'Fallida'}
                </button>
              ))}
            </div>
          </div>
          {value.sbtResult === 'failure' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de falla (opcional)</label>
              <input
                className={fieldClass}
                placeholder="Ej: taquipnea, desaturación"
                maxLength={500}
                value={value.failureReason}
                onChange={(e) => onChange({ ...value, failureReason: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      {(value.decision === 'contraindicada' || value.decision === 'no-realizada') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {value.decision === 'contraindicada' ? 'Motivo de la contraindicación' : 'Motivo por el que no se realizó'}
          </label>
          <select className={fieldClass} value={value.reason} onChange={(e) => onChange({ ...value, reason: e.target.value })}>
            <option value="">Seleccionar...</option>
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {value.decision === 'contraindicada' && (
            <p className="text-xs text-gray-500 mt-1">Un día contraindicado no cuenta como día elegible en el indicador de PVE.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-amber-700">{error}.</p>}
    </div>
  );
}
