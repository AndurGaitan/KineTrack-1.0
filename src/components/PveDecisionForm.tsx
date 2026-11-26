import type { PveDecisionKind, PveSbtType, WeaningStatus } from '../types';
import type { CreatePveDecisionInput } from '../api/pveDecisionsApi';

/**
 * Decisión diaria sobre la prueba de ventilación espontánea (PVE):
 * realizada, no cumple criterios (con motivo) o cumple criterios y no se realizó (con motivo).
 * Internamente "no cumple criterios" se guarda como 'contraindicada' (valor histórico de la base).
 * Lo usan la monitorización VMI y la tarjeta "PVE de hoy".
 */

/**
 * Motivos de "no cumple criterios": uno por cada criterio de aptitud del protocolo institucional de liberación de
 * la VMI (2026), sección 5.1. El protocolo no exige un valor de RASS, Glasgow ni hemoglobina para iniciar la PVE.
 */
export const pveContraindicationReasons: { value: string; label: string; hint: string }[] = [
  { value: 'causa-no-resuelta', label: 'Causa de la VMI sin mejoría', hint: 'La causa que motivó la VMI no está resuelta ni controlada' },
  { value: 'oxigenacion-inadecuada', label: 'Oxigenación inadecuada', hint: 'Requiere FiO₂ > 0,50 o PEEP > 8 cmH₂O, o SpO₂ fuera del objetivo' },
  { value: 'inestabilidad-hemodinamica', label: 'Inestabilidad hemodinámica', hint: 'Shock no controlado o aumento reciente de vasoactivos' },
  { value: 'sin-esfuerzo-inspiratorio', label: 'Ausencia de esfuerzo inspiratorio espontáneo', hint: 'No inicia respiraciones por sí mismo' },
];

/** Motivos que ya no se ofrecen; solo para mostrar los registros cargados antes del protocolo. */
const pveContraindicationLegacyReasons: Record<string, string> = {
  'fio2-peep-altos': 'FiO₂ / PEEP altos',
  'sedacion-profunda': 'Sedación profunda o sin impulso respiratorio',
  'bloqueo-neuromuscular': 'Bloqueo neuromuscular',
  'hipertension-endocraneana': 'Hipertensión endocraneana',
  otra: 'Otra',
};

/**
 * "Cumple criterios y no se realizó": el motivo ahora es texto libre. Estas etiquetas
 * son solo para mostrar los registros viejos, que guardaban un código.
 */
const pveNotDoneLegacyReasons: Record<string, string> = {
  'decision-medica': 'Decisión médica',
  'falta-de-tiempo': 'Falta de tiempo / personal',
  otra: 'Otra',
};

/** Todas las modalidades, incluida CPAP, para mostrar los registros ya cargados. */
export const pveSbtTypes: { value: PveSbtType; label: string; short: string; hint?: string }[] = [
  { value: 'psv', label: 'Presión de soporte (PSV)', short: 'PSV', hint: 'PS 5–7 + PEEP 5' },
  { value: 'cpap', label: 'CPAP', short: 'CPAP' },
  { value: 't-piece', label: 'Tubo en T', short: 'Tubo en T', hint: 'Sin soporte' },
];

/** Modalidades del protocolo: PSV de bajo nivel o tubo en T (sección 5.2). */
const pveEntrySbtTypes = pveSbtTypes.filter((t) => t.value !== 'cpap');

/** Duraciones que se registran: 30 minutos (inicial) o 120 (extendida). */
const pveDurationOptions = [30, 120];

export const pveDecisionLabels: Record<PveDecisionKind, string> = {
  realizada: 'PVE realizada',
  contraindicada: 'No cumple criterios para la PVE',
  'no-realizada': 'PVE no realizada',
};

export function pveReasonLabel(decision: PveDecisionKind, reason?: string): string | undefined {
  if (decision === 'contraindicada') {
    return pveContraindicationReasons.find((r) => r.value === reason)?.label ?? ((reason && pveContraindicationLegacyReasons[reason]) || reason);
  }
  return (reason && pveNotDoneLegacyReasons[reason]) || reason;
}

export interface PveDraft {
  decision: '' | PveDecisionKind;
  reason: string;
  sbtType: '' | PveSbtType;
  sbtResult: '' | 'success' | 'failure';
  /** Minutos elegidos ('30' o '120'). */
  duration: string;
  failureReason: string;
}

export const emptyPveDraft: PveDraft = {
  decision: '',
  reason: '',
  sbtType: '',
  sbtResult: '',
  duration: '',
  failureReason: '',
};

/** Qué falta para poder guardar el borrador (null si está completo o si no se eligió ninguna decisión). */
export function pveDraftError(d: PveDraft): string | null {
  if (!d.decision) return null;
  if (d.decision === 'realizada') {
    // El protocolo pide registrar modalidad, duración y resultado (sección 6).
    if (!d.sbtType) return 'Indicá la modalidad de la PVE';
    if (!d.sbtResult) return 'Indicá el resultado de la PVE';
    // En una fallida no se pide la duración: se interrumpe antes y no se guarda un tiempo que nadie midió.
    if (d.sbtResult === 'success' && !d.duration) return 'Indicá la duración de la PVE';
    return null;
  }
  return d.reason.trim() ? null : d.decision === 'contraindicada' ? 'Indicá por qué no cumple criterios' : 'Indicá por qué no se realizó';
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
      durationMinutes: d.sbtResult === 'success' ? Number(d.duration) : undefined,
      failureReason: d.sbtResult === 'failure' && d.failureReason.trim() ? d.failureReason.trim() : undefined,
    };
  }
  return { patientId, timestamp, decision: d.decision, reason: d.reason.trim() };
}

const options: { value: PveDecisionKind; label: string; hint: string; active: string }[] = [
  { value: 'contraindicada', label: 'No cumple criterios', hint: 'No está en condiciones hoy', active: 'border-amber-500 bg-amber-50' },
  { value: 'no-realizada', label: 'Cumple criterios, sin PVE', hint: 'Era elegible, no se hizo', active: 'border-gray-500 bg-gray-100' },
  { value: 'realizada', label: 'PVE realizada', hint: 'Se hizo la prueba', active: 'border-green-500 bg-green-50' },
];

/** Estado de destete que le corresponde a cada decisión (así no se pregunta dos veces). */
export const weaningStatusFromPve: Record<PveDecisionKind, WeaningStatus> = {
  contraindicada: 'not-candidate',
  'no-realizada': 'candidate',
  realizada: 'sbt-trial',
};

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
  const error = pveDraftError(value);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Decisión sobre la PVE">
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
            className={`px-3 py-2.5 border-2 rounded-xl text-left transition-colors min-h-[56px] sm:min-h-[64px] ${
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
            <div className="block text-sm font-medium text-gray-700 mb-1">Modalidad</div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Modalidad de la PVE">
              {pveEntrySbtTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={value.sbtType === t.value}
                  onClick={() => onChange({ ...value, sbtType: t.value })}
                  className={`min-h-[52px] px-2 py-1.5 border-2 rounded-xl leading-tight ${
                    value.sbtType === t.value ? 'border-green-500 bg-green-50' : 'border-gray-200 active:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900">{t.short}</div>
                  <div className="text-xs text-gray-600">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1">Resultado</div>
            <div className="grid grid-cols-2 gap-2">
              {(['success', 'failure'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={value.sbtResult === r}
                  onClick={() => onChange({ ...value, sbtResult: value.sbtResult === r ? '' : r, duration: '', failureReason: '' })}
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
          {value.sbtResult === 'success' && (
            <div>
              <div className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos)</div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Duración de la PVE en minutos">
                {pveDurationOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={value.duration === String(m)}
                    onClick={() => onChange({ ...value, duration: String(m) })}
                    className={`min-h-[48px] border-2 rounded-xl font-semibold ${
                      value.duration === String(m) ? 'border-green-500 bg-green-50 text-gray-900' : 'border-gray-200 text-gray-700 active:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            {value.decision === 'contraindicada' ? 'Motivo por el que no cumple criterios' : 'Motivo por el que no se realizó'}
          </label>
          {value.decision === 'contraindicada' ? (
            <>
              <div className="space-y-2" role="radiogroup" aria-label="Criterio que no cumple">
                {pveContraindicationReasons.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={value.reason === r.value}
                    onClick={() => onChange({ ...value, reason: r.value })}
                    className={`w-full min-h-[52px] px-3 py-2 border-2 rounded-xl text-left ${
                      value.reason === r.value ? 'border-amber-500 bg-amber-50' : 'border-gray-200 active:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{r.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{r.hint}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Si hay más de una, elegí la principal. Un día en que no cumple criterios no cuenta como día elegible en el indicador de PVE.
              </p>
            </>
          ) : (
            <input
              className={fieldClass}
              placeholder="Escribí el motivo"
              maxLength={200}
              value={value.reason}
              onChange={(e) => onChange({ ...value, reason: e.target.value })}
            />
          )}
        </div>
      )}

      {error && <p className="text-sm text-amber-700">{error}.</p>}
    </div>
  );
}
