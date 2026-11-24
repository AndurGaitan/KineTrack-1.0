import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { toLocalDateTimeInputValue } from '../utils/dateInput';
import {
  currentSVModality,
  formatSVElapsed,
  isStaleOpenPeriod,
  openPeriodHours,
  svInterruptionReasonLabels,
  svInterruptionReasonOptions,
  svModalityOptions,
  svModalityShortLabels,
} from '../utils/spontaneousVentilation';
import { calendarDaysBetween, daysSpanText } from '../utils/supportDays';
import { dayWithWeekday, lastVmiEnd } from '../utils/vmiDays';
import type { SpontaneousVentilationPeriod, SVInterruptionReason, SVModality } from '../types';
import { ChevronRightIcon } from 'lucide-react';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const deviceName = (m: SVModality) => cap(svModalityShortLabels[m]);
const hm = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

function dayWord(iso: string, now: Date): string {
  const d = new Date(iso);
  const diff = calendarDaysBetween(d, now);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

/** "ayer 14:00 – 16:30" · "hoy 09:10 – en curso". */
function rangeText(p: SpontaneousVentilationPeriod, now: Date): string {
  const sameDay = p.endAt && calendarDaysBetween(p.startAt, p.endAt) === 0;
  const end = p.endAt ? `${sameDay ? '' : `${dayWord(p.endAt, now)} `}${hm(p.endAt)}` : 'en curso';
  return `${dayWord(p.startAt, now)} ${hm(p.startAt)} – ${end}`;
}

function resultText(p: SpontaneousVentilationPeriod): string {
  if (p.tolerated === true) return 'terminó';
  if (p.tolerated === false) return `se interrumpió${p.interruptionReason ? ` (${svInterruptionReasonLabels[p.interruptionReason].toLowerCase()})` : ''}`;
  return '';
}

type Sheet = { kind: 'finish' } | { kind: 'edit'; id: string } | { kind: 'new' } | null;
type Result = 'ok' | 'stop' | undefined;

const primary = 'w-full min-h-[56px] rounded-2xl bg-blue-600 text-white text-lg font-semibold active:bg-blue-700 disabled:opacity-50';
const option = 'min-h-[52px] rounded-2xl border border-gray-200 bg-white text-base font-semibold text-gray-900 active:bg-gray-50 disabled:opacity-50';
const reasonChip = 'px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-800 active:bg-gray-50 disabled:opacity-50';
const timeInput = 'w-full min-h-[48px] px-3 text-base border border-gray-300 rounded-xl bg-white';
const selected = '!border-blue-600 !bg-blue-50 !text-blue-900';

/**
 * Pruebas de ventilación espontánea de un paciente traqueostomizado, sin resúmenes ni gráficos: cuánto lleva sin
 * ventilador, iniciar una prueba y cerrarla ("terminó" o "se interrumpió"), con el desde y el hasta corregibles.
 * El seguimiento longitudinal se ve desde Coordinación.
 */
export function SpontaneousVentilationCard({ patientId, episodeId }: { patientId: string; episodeId?: string }) {
  const { patients, getPatientSVPeriods, startSVPeriod, updateSVPeriod, addManualSVPeriod, deleteSVPeriod } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  const periods = getPatientSVPeriods(patientId);
  const active = periods.find((p) => !p.endAt);
  const last = periods.find((p) => p.endAt);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNowMs(Date.now());
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [active?.id]);
  const now = new Date(nowMs);

  const [modality, setModality] = useState<SVModality>(currentSVModality(periods[0]?.modality));
  const [pickDevice, setPickDevice] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState<Result>(undefined);
  const [reason, setReason] = useState<SVInterruptionReason | undefined>(undefined);
  const [timesOpen, setTimesOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const local = (iso: string) => toLocalDateTimeInputValue(new Date(iso));
  const iso = (v: string) => new Date(v).toISOString();

  // Si el paciente ya salió de la VMI (hoy no está en ventilador), las pruebas dejan de aplicar:
  // se muestra desde cuándo está desvinculado, calculado del historial de soportes.
  const vmiEnd = patient ? lastVmiEnd(patient.episodes, patient.supportType) : undefined;
  const offVent = !!vmiEnd;

  const stale = isStaleOpenPeriod(active, now);
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const timesInvalid = !start || !end || !(endMs > startMs) || endMs > Date.now() + 60_000;

  const open = (next: Sheet) => {
    setResult(undefined);
    setReason(undefined);
    if (next?.kind === 'finish' && active) {
      setStart(local(active.startAt));
      setEnd(local(new Date().toISOString()));
      setTimesOpen(isStaleOpenPeriod(active));
    } else if (next?.kind === 'edit') {
      const p = periods.find((x) => x.id === next.id);
      if (!p) return;
      setStart(local(p.startAt));
      setEnd(p.endAt ? local(p.endAt) : local(new Date().toISOString()));
      setResult(p.tolerated === true ? 'ok' : p.tolerated === false ? 'stop' : undefined);
      setReason(p.interruptionReason);
      setTimesOpen(true);
    } else if (next?.kind === 'new') {
      setStart(local(new Date(Date.now() - 60 * 60 * 1000).toISOString()));
      setEnd(local(new Date().toISOString()));
      setTimesOpen(true);
    }
    setSheet(next);
  };

  // Al cerrar la prueba en curso, sin tocar las horas el "hasta" es el momento del toque.
  const finishBlocked = timesOpen && timesInvalid;
  const closeActive = async (res: 'ok' | 'stop', rsn?: SVInterruptionReason) => {
    if (!active || busy || finishBlocked) return;
    setBusy(true);
    await updateSVPeriod(active.id, {
      ...(timesOpen ? { startAt: iso(start), endAt: iso(end) } : { endAt: new Date().toISOString() }),
      tolerated: res === 'ok',
      interruptionReason: res === 'stop' ? rsn : undefined,
    });
    setBusy(false);
    setSheet(null);
  };

  const save = async () => {
    if (busy || timesInvalid || !sheet) return;
    setBusy(true);
    const tolerated = result === 'ok' ? true : result === 'stop' ? false : undefined;
    const interruptionReason = result === 'stop' ? reason : undefined;
    if (sheet.kind === 'edit') {
      await updateSVPeriod(sheet.id, { startAt: iso(start), endAt: iso(end), tolerated, interruptionReason });
    } else if (sheet.kind === 'new') {
      await addManualSVPeriod({ patientId, episodeId, startAt: iso(start), endAt: iso(end), modality, tolerated, interruptionReason });
    }
    setBusy(false);
    setSheet(null);
  };

  const remove = async () => {
    if (sheet?.kind !== 'edit' || busy) return;
    if (!window.confirm('¿Eliminar esta prueba?')) return;
    setBusy(true);
    await deleteSVPeriod(sheet.id);
    setBusy(false);
    setSheet(null);
  };

  const times = (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600">
        Desde
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={`${timeInput} mt-1`} />
      </label>
      <label className="block text-xs font-medium text-gray-600">
        Hasta
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={`${timeInput} mt-1`} />
      </label>
      {timesInvalid && <p className="text-xs text-red-600">El "hasta" tiene que ser posterior al "desde" y no futuro.</p>}
    </div>
  );

  const reasons = (onPick: (r: SVInterruptionReason) => void, current?: SVInterruptionReason) => (
    <div className="flex flex-wrap gap-2">
      {svInterruptionReasonOptions.map((o) => (
        <button key={o.value} type="button" disabled={busy} onClick={() => onPick(o.value)} className={`${reasonChip} ${current === o.value ? selected : ''}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div className="text-sm font-semibold text-gray-500">Ventilación espontánea</div>

      {/* Prueba en curso */}
      {active && sheet?.kind !== 'finish' && (
        <>
          <div className="text-center space-y-1">
            <div className="text-xs text-gray-500">Desvinculado hace</div>
            <div className="text-4xl font-bold text-gray-900">{formatSVElapsed(openPeriodHours(active, now))}</div>
            <div className="text-sm text-gray-500">
              Desde {hm(active.startAt)} · {deviceName(active.modality)}
            </div>
            {stale && <div className="text-xs text-amber-700 pt-1">Lleva mucho abierta. Si ya terminó, cerrala con la hora real.</div>}
          </div>
          <button type="button" onClick={() => open({ kind: 'finish' })} className={primary}>
            Finalizar
          </button>
        </>
      )}

      {/* Cierre de la prueba en curso */}
      {active && sheet?.kind === 'finish' && (
        <div className="space-y-3">
          <div className="text-lg font-semibold text-gray-900">¿Cómo terminó?</div>
          {result !== 'stop' ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={busy || finishBlocked} onClick={() => closeActive('ok')} className={option}>
                Terminó
              </button>
              <button type="button" disabled={busy} onClick={() => setResult('stop')} className={option}>
                Se interrumpió
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">Motivo (opcional). Tocá uno para cerrar.</div>
              {reasons((r) => closeActive('stop', r))}
              <button type="button" disabled={busy || finishBlocked} onClick={() => closeActive('stop')} className="text-sm font-semibold text-blue-700">
                Cerrar sin motivo
              </button>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Desde {hm(active.startAt)} · Hasta {timesOpen ? 'la hora indicada' : 'ahora'}{' '}
            <button type="button" onClick={() => setTimesOpen((v) => !v)} className="font-semibold text-blue-700">
              {timesOpen ? 'Listo' : 'Cambiar'}
            </button>
          </div>
          {timesOpen && times}
          <button type="button" onClick={() => setSheet(null)} className="text-sm font-semibold text-gray-500">
            Cancelar
          </button>
        </div>
      )}

      {/* Sin prueba en curso */}
      {!active && !sheet && (
        <>
          {offVent && vmiEnd && (
            <div className="text-center space-y-1">
              <div className="text-xs text-gray-500">Desvinculado de la VMI hace</div>
              <div className="text-4xl font-bold text-gray-900">{daysSpanText(calendarDaysBetween(vmiEnd, now))}</div>
              <div className="text-sm text-gray-500">Desde el {dayWithWeekday(vmiEnd, true)}</div>
            </div>
          )}
          {!offVent && (
            <button type="button" onClick={() => startSVPeriod(patientId, modality, episodeId)} className={primary}>
              Iniciar prueba
            </button>
          )}

          {!offVent && (
            <button type="button" onClick={() => setPickDevice((v) => !v)} className="w-full flex items-center justify-between text-sm py-1">
              <span className="text-gray-500">Dispositivo</span>
              <span className="font-semibold text-gray-900 flex items-center gap-1">
                {deviceName(modality)} <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </span>
            </button>
          )}
          {!offVent && pickDevice && (
            <div className="flex flex-wrap gap-2">
              {svModalityOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setModality(o.value);
                    setPickDevice(false);
                  }}
                  className={`${reasonChip} ${modality === o.value ? selected : ''}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {last && (
            <button type="button" onClick={() => open({ kind: 'edit', id: last.id })} className="w-full text-left text-sm border-t border-gray-100 pt-3">
              <span className="text-gray-500">Última: </span>
              <span className="text-gray-900">
                {rangeText(last, now)}
                {resultText(last) ? ` · ${resultText(last)}` : ''}
              </span>
              <span className="text-blue-700 font-semibold"> · Editar</span>
            </button>
          )}
          {!offVent && (
            <button type="button" onClick={() => open({ kind: 'new' })} className="text-sm font-semibold text-blue-700">
              Agregar una prueba anterior
            </button>
          )}
        </>
      )}

      {/* Editar o agregar una prueba ya cerrada */}
      {(sheet?.kind === 'edit' || sheet?.kind === 'new') && (
        <div className="space-y-3">
          <div className="text-lg font-semibold text-gray-900">{sheet.kind === 'edit' ? 'Editar prueba' : 'Agregar una prueba anterior'}</div>
          {times}
          {sheet.kind === 'new' && (
            <div className="flex flex-wrap gap-2">
              {svModalityOptions.map((o) => (
                <button key={o.value} type="button" onClick={() => setModality(o.value)} className={`${reasonChip} ${modality === o.value ? selected : ''}`}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setResult(result === 'ok' ? undefined : 'ok')} className={`${option} ${result === 'ok' ? selected : ''}`}>
              Terminó
            </button>
            <button type="button" onClick={() => setResult(result === 'stop' ? undefined : 'stop')} className={`${option} ${result === 'stop' ? selected : ''}`}>
              Se interrumpió
            </button>
          </div>
          {result === 'stop' && reasons((r) => setReason(reason === r ? undefined : r), reason)}
          <button type="button" onClick={save} disabled={busy || timesInvalid} className={primary}>
            Guardar
          </button>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setSheet(null)} className="text-sm font-semibold text-gray-500">
              Cancelar
            </button>
            {sheet.kind === 'edit' && (
              <button type="button" onClick={remove} className="text-sm font-semibold text-red-600">
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
