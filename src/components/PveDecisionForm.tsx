import type { PveDecision, PveDecisionKind, PveFailureCause, PveInterruptionCriterion, PveSbtType, WeaningStatus } from '../types';
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

/** Protocolo: 30 minutos como duración inicial, extensible hasta 120. */
const pveDurationPresets = [30, 60, 120];
const PVE_MAX_PROTOCOL_MINUTES = 120;

/** Criterios de interrupción (sección 5.2). `short` para el pase compacto y `text` para la evolución. */
export const pveInterruptionCriteria: { value: PveInterruptionCriterion; label: string; hint: string; short: string; text: string }[] = [
  { value: 'taquipnea', label: 'FR > 35 sostenida', hint: 'Más de 35 respiraciones por minuto', short: 'FR >35', text: 'frecuencia respiratoria mayor a 35 sostenida' },
  { value: 'desaturacion', label: 'Desaturación', hint: 'SpO₂ < 90 % o deterioro del objetivo', short: 'desaturación', text: 'desaturación' },
  { value: 'trabajo-respiratorio', label: 'Trabajo respiratorio', hint: 'Respiración paradójica o musculatura accesoria', short: 'trabajo resp.', text: 'aumento del trabajo respiratorio' },
  { value: 'hemodinamica', label: 'Hemodinamia o arritmia', hint: 'Inestabilidad o arritmia significativa', short: 'hemodinamia/arritmia', text: 'inestabilidad hemodinámica o arritmia' },
  { value: 'neurologico', label: 'Conciencia o agitación', hint: 'Deterioro, agitación, ansiedad o diaforesis', short: 'conciencia/agitación', text: 'deterioro de conciencia, agitación o diaforesis' },
  { value: 'otros-signos', label: 'Otros signos de fatiga', hint: 'Fatiga o intolerancia evidente', short: 'fatiga', text: 'signos de fatiga o intolerancia' },
];

/** Causa probable predominante de la falla (sección 5.5). */
export const pveFailureCauses: { value: PveFailureCause; label: string; hint: string }[] = [
  { value: 'respiratoria', label: 'Respiratoria', hint: 'Enfermedad pulmonar o carga ventilatoria' },
  { value: 'cardiovascular', label: 'Cardiovascular', hint: 'Disfunción o edema por el destete' },
  { value: 'neuromuscular', label: 'Neuromuscular', hint: 'Debilidad muscular respiratoria' },
  { value: 'neurologica', label: 'Neurológica', hint: 'Sedación, delirium o alteración neurológica' },
  { value: 'metabolica', label: 'Metabólica', hint: 'Electrolitos, fiebre o dolor' },
  { value: 'secreciones', label: 'Secreciones', hint: 'Abundantes o difíciles de eliminar' },
  { value: 'asincronias', label: 'Asincronías', hint: 'O programación inadecuada' },
  { value: 'no-identificada', label: 'No identificada', hint: 'Todavía sin causa clara' },
];

/** Criterios y causa de una PVE fallida, con sus textos (vacío en los registros anteriores). */
export function pveFailureInfo(d: Pick<PveDecision, 'interruptionCriteria' | 'failureCause'>) {
  const criteria = (d.interruptionCriteria ?? [])
    .map((v) => pveInterruptionCriteria.find((c) => c.value === v))
    .filter((c): c is (typeof pveInterruptionCriteria)[number] => !!c);
  const cause = pveFailureCauses.find((c) => c.value === d.failureCause)?.label.toLowerCase();
  return { criteria, cause };
}

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
  /** Minutos, como texto del campo. */
  duration: string;
  interruptionCriteria: PveInterruptionCriterion[];
  failureCause: '' | PveFailureCause;
  failureReason: string;
}

export const emptyPveDraft: PveDraft = {
  decision: '',
  reason: '',
  sbtType: '',
  sbtResult: '',
  duration: '',
  interruptionCriteria: [],
  failureCause: '',
  failureReason: '',
};

const validDuration = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 1440;
};

/** Qué falta para poder guardar el borrador (null si está completo o si no se eligió ninguna decisión). */
export function pveDraftError(d: PveDraft): string | null {
  if (!d.decision) return null;
  if (d.decision === 'realizada') {
    // El protocolo pide registrar modalidad, duración, resultado y, si falla, por qué (sección 6).
    if (!d.sbtType) return 'Indicá la modalidad de la PVE';
    if (!validDuration(d.duration)) return 'Indicá cuántos minutos duró la PVE';
    if (!d.sbtResult) return 'Indicá el resultado de la PVE';
    if (d.sbtResult === 'failure' && d.interruptionCriteria.length === 0) return 'Marcá por qué se interrumpió la PVE';
    if (d.sbtResult === 'failure' && !d.failureCause) return 'Elegí la causa probable o "No identificada"';
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
      durationMinutes: Number(d.duration),
      ...(d.sbtResult === 'failure'
        ? {
            interruptionCriteria: d.interruptionCriteria,
            failureCause: d.failureCause || undefined,
            failureReason: d.failureReason.trim() || undefined,
          }
        : {}),
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
            <div className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos)</div>
            <div className="grid grid-cols-4 gap-2">
              {pveDurationPresets.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={value.duration === String(m)}
                  onClick={() => onChange({ ...value, duration: String(m) })}
                  className={`min-h-[48px] border-2 rounded-xl font-semibold ${
                    value.duration === String(m) ? 'border-green-500 bg-green-50 text-gray-900' : 'border-gray-200 text-gray-700 active:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
              <input
                className={`${fieldClass} text-center`}
                type="number"
                inputMode="numeric"
                min={1}
                max={1440}
                aria-label="Duración de la PVE en minutos"
                placeholder="Min"
                value={value.duration}
                onChange={(e) => onChange({ ...value, duration: e.target.value })}
              />
            </div>
            <p className={`text-xs mt-1 ${Number(value.duration) > PVE_MAX_PROTOCOL_MINUTES ? 'text-amber-700' : 'text-gray-500'}`}>
              {Number(value.duration) > PVE_MAX_PROTOCOL_MINUTES
                ? 'Supera los 120 minutos que contempla el protocolo.'
                : 'Protocolo: 30 minutos iniciales, extensible hasta 120.'}
            </p>
          </div>
          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1">Resultado</div>
            <div className="grid grid-cols-2 gap-2">
              {(['success', 'failure'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={value.sbtResult === r}
                  onClick={() =>
                    onChange({ ...value, sbtResult: value.sbtResult === r ? '' : r, interruptionCriteria: [], failureCause: '', failureReason: '' })
                  }
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
            <>
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-1">¿Por qué se interrumpió? (una o más)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pveInterruptionCriteria.map((c) => {
                    const on = value.interruptionCriteria.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() =>
                          onChange({
                            ...value,
                            interruptionCriteria: on ? value.interruptionCriteria.filter((v) => v !== c.value) : [...value.interruptionCriteria, c.value],
                          })
                        }
                        className={`min-h-[52px] px-3 py-2 border-2 rounded-xl text-left ${on ? 'border-red-500 bg-red-50' : 'border-gray-200 active:bg-gray-50'}`}
                      >
                        <div className="text-sm font-semibold text-gray-900">{c.label}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{c.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="block text-sm font-medium text-gray-700 mb-1">Causa probable (la predominante)</div>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Causa probable de la falla">
                  {pveFailureCauses.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={value.failureCause === c.value}
                      onClick={() => onChange({ ...value, failureCause: c.value })}
                      className={`min-h-[52px] px-3 py-2 border-2 rounded-xl text-left ${
                        value.failureCause === c.value ? 'border-red-500 bg-red-50' : 'border-gray-200 active:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">{c.label}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{c.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detalle (opcional)</label>
                <input
                  className={fieldClass}
                  placeholder="Ej: edema pulmonar a los 15 minutos"
                  maxLength={500}
                  value={value.failureReason}
                  onChange={(e) => onChange({ ...value, failureReason: e.target.value })}
                />
              </div>
            </>
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
