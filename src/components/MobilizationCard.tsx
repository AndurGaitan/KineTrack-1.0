import { useState } from 'react';
import { Card } from './ui/Card';
import { useApp } from '../contexts/AppContext';
import { toLocalDateTimeInputValue } from '../utils/dateInput';
import {
  MOBILIZATION_WINDOW_HOURS,
  formatSpan,
  mobilizationContraindicationReasons,
  mobilizationDeadline,
  mobilizationReasonLabel,
} from '../utils/earlyMobilization';

const fieldClass = 'w-full min-h-[48px] px-3 text-base border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none bg-white';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Movilización precoz del paciente en VMI: ventana de 72 h desde el inicio de la
 * VMI (pausada mientras haya una contraindicación para movilizar) y registro de
 * cuándo se comenzó la movilización activa. Alimenta QI-05.
 */
export function MobilizationCard({ patientId, now }: { patientId: string; now: Date }) {
  const {
    getActiveEpisode,
    getEpisodeMobilizationStart,
    getPatientMobilizationContraindications,
    startMobilization,
    deleteMobilizationStart,
    addMobilizationContraindication,
    liftMobilizationContraindication,
    deleteMobilizationContraindication,
  } = useApp();

  const episode = getActiveEpisode(patientId);
  const [mode, setMode] = useState<null | 'start' | 'contra'>(null);
  const [startValue, setStartValue] = useState(() => toLocalDateTimeInputValue(new Date()));
  const [startNote, setStartNote] = useState('');
  const [reason, setReason] = useState('');
  const [fromValue, setFromValue] = useState(() => toLocalDateTimeInputValue(new Date()));
  const [toValue, setToValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!episode || episode.supportType !== 'imv') return null;

  const episodeStart = new Date(episode.startAt);
  const start = getEpisodeMobilizationStart(episode.id);
  const contraindications = getPatientMobilizationContraindications(patientId).filter(
    (c) => !c.endAt || new Date(c.endAt).getTime() > episodeStart.getTime()
  );
  const open = contraindications.find((c) => !c.endAt);
  const deadline = mobilizationDeadline(episodeStart, contraindications, now);
  const hoursOfVmi = (now.getTime() - episodeStart.getTime()) / 3600000;
  const remainingMs = deadline.getTime() - now.getTime();
  const paused = contraindications.some((c) => new Date(c.startAt).getTime() < deadline.getTime());

  const nowInput = toLocalDateTimeInputValue(new Date());

  const closeForm = () => {
    setMode(null);
    setFormError(null);
    setStartNote('');
    setReason('');
    setToValue('');
  };

  const submitStart = async () => {
    const when = new Date(startValue);
    if (Number.isNaN(when.getTime())) return setFormError('Elegí la fecha y hora de inicio');
    if (when.getTime() > Date.now() + 60 * 1000) return setFormError('La fecha no puede ser posterior a ahora');
    if (when.getTime() < episodeStart.getTime()) return setFormError('No puede ser anterior al inicio de la VMI');
    setBusy(true);
    const ok = await startMobilization(patientId, when.toISOString(), startNote.trim() || undefined);
    setBusy(false);
    if (ok) closeForm();
  };

  const submitContra = async () => {
    if (!reason) return setFormError('Indicá el motivo');
    const from = new Date(fromValue);
    if (Number.isNaN(from.getTime())) return setFormError('Elegí desde cuándo');
    if (from.getTime() > Date.now() + 60 * 1000) return setFormError('"Desde" no puede ser posterior a ahora');
    let endAt: string | undefined;
    if (toValue) {
      const to = new Date(toValue);
      if (to.getTime() <= from.getTime()) return setFormError('"Hasta" tiene que ser posterior a "desde"');
      if (to.getTime() > Date.now() + 60 * 1000) return setFormError('"Hasta" no puede ser posterior a ahora');
      endAt = to.toISOString();
    }
    setBusy(true);
    const ok = await addMobilizationContraindication({ patientId, reason, startAt: from.toISOString(), endAt });
    setBusy(false);
    if (ok) closeForm();
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">Movilización precoz</h2>
        <span className="text-xs text-gray-500">VMI hace {formatSpan(hoursOfVmi * 3600000)} · ventana de {MOBILIZATION_WINDOW_HOURS} h</span>
      </div>

      {start ? (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-900">
          <div className="font-semibold">✓ Movilización activa iniciada el {fmt(start.startedAt)}</div>
          <div className="mt-0.5">
            {new Date(start.startedAt).getTime() <= deadline.getTime()
              ? `Dentro de las ${MOBILIZATION_WINDOW_HOURS} h${paused ? ' (ajustadas por contraindicaciones)' : ''}`
              : `Fuera de las ${MOBILIZATION_WINDOW_HOURS} h${paused ? ' (ajustadas por contraindicaciones)' : ''}`}
            {start.notes ? ` · ${start.notes}` : ''}
          </div>
          <button
            onClick={() => {
              if (window.confirm('¿Eliminar el registro de inicio de movilización? Podés volver a cargarlo después.')) void deleteMobilizationStart(start.id);
            }}
            className="mt-2 text-xs text-green-800 underline"
          >
            Eliminar registro
          </button>
        </div>
      ) : open ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <div className="font-semibold">Contraindicada desde el {fmt(open.startAt)}</div>
          <div className="mt-0.5">{mobilizationReasonLabel(open.reason)} · la ventana de {MOBILIZATION_WINDOW_HOURS} h está en pausa.</div>
          <button
            onClick={() => void liftMobilizationContraindication(open.id)}
            className="mt-2 rounded-lg bg-amber-600 text-white text-sm font-semibold px-3 py-2 active:bg-amber-700"
          >
            Levantar contraindicación (ya se puede movilizar)
          </button>
        </div>
      ) : (
        <div
          className={`rounded-xl border p-3 text-sm ${
            remainingMs > 0 ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {remainingMs > 0 ? (
            <>
              <div className="font-semibold">Sin movilización activa registrada</div>
              <div className="mt-0.5">
                Quedan {formatSpan(remainingMs)} de la ventana de {MOBILIZATION_WINDOW_HOURS} h{paused ? ' (ajustada por contraindicaciones)' : ''}.
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold">La ventana de {MOBILIZATION_WINDOW_HOURS} h venció hace {formatSpan(-remainingMs)}</div>
              <div className="mt-0.5">Podés registrar el inicio igual: queda como fuera de ventana.</div>
            </>
          )}
        </div>
      )}

      {mode === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {!start && (
            <button
              onClick={() => {
                setStartValue(toLocalDateTimeInputValue(new Date()));
                setMode('start');
              }}
              className="rounded-xl bg-emerald-600 text-white font-bold px-4 py-3 active:bg-emerald-700"
            >
              Iniciar movilización activa
            </button>
          )}
          {!open && (
            <button
              onClick={() => {
                setFromValue(toLocalDateTimeInputValue(new Date()));
                setMode('contra');
              }}
              className="rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-900 font-semibold px-4 py-3 active:bg-amber-100"
            >
              Registrar contraindicación
            </button>
          )}
        </div>
      )}

      {mode === 'start' && (
        <div className="mt-3 rounded-2xl border border-emerald-200 p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuándo se comenzó a movilizar?</label>
            <input type="datetime-local" className={fieldClass} value={startValue} max={nowInput} onChange={(e) => setStartValue(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
            <input className={fieldClass} maxLength={500} placeholder="Ej: sedestación al borde de la cama" value={startNote} onChange={(e) => setStartNote(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={closeForm} disabled={busy} className="rounded-xl border border-gray-300 px-4 py-3 text-gray-700 disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={() => void submitStart()} disabled={busy} className="rounded-xl bg-emerald-600 text-white font-bold px-4 py-3 disabled:opacity-50">
              Guardar inicio
            </button>
          </div>
        </div>
      )}

      {mode === 'contra' && (
        <div className="mt-3 rounded-2xl border border-amber-200 p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <select className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Seleccionar...</option>
              {mobilizationContraindicationReasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input type="datetime-local" className={fieldClass} value={fromValue} max={nowInput} onChange={(e) => setFromValue(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta (si ya terminó)</label>
              <input type="datetime-local" className={fieldClass} value={toValue} max={nowInput} onChange={(e) => setToValue(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Mientras dure la contraindicación, el reloj de las {MOBILIZATION_WINDOW_HOURS} h queda en pausa. Dejá "hasta" vacío si sigue vigente.</p>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={closeForm} disabled={busy} className="rounded-xl border border-gray-300 px-4 py-3 text-gray-700 disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={() => void submitContra()} disabled={busy} className="rounded-xl bg-amber-600 text-white font-bold px-4 py-3 disabled:opacity-50">
              Guardar contraindicación
            </button>
          </div>
        </div>
      )}

      {contraindications.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Contraindicaciones registradas</div>
          <ul className="space-y-1">
            {contraindications.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-2 text-sm text-gray-700">
                <span>
                  {mobilizationReasonLabel(c.reason)} · {fmt(c.startAt)} → {c.endAt ? fmt(c.endAt) : 'vigente'}
                </span>
                <button
                  onClick={() => {
                    if (window.confirm('¿Eliminar esta contraindicación?')) void deleteMobilizationContraindication(c.id);
                  }}
                  className="text-xs text-gray-400 underline shrink-0"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
