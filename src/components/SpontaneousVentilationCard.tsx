import { FormEvent, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useApp } from '../contexts/AppContext';
import { toLocalDateTimeInputValue } from '../utils/dateInput';
import {
  computeSpontaneousVentilationSummary,
  formatSVDuration,
  isStaleOpenPeriod,
  openPeriodHours,
  currentSVModality,
  svInterruptionReasonLabels,
  svInterruptionReasonOptions,
  svModalityLabels,
  svModalityOptions,
} from '../utils/spontaneousVentilation';
import type { SpontaneousVentilationPeriod, SVInterruptionReason, SVModality } from '../types';
import { CheckIcon, PlayIcon, PlusIcon, SquareIcon, Trash2Icon, XIcon } from 'lucide-react';

interface SpontaneousVentilationCardProps {
  patientId: string;
  episodeId?: string;
}

const chip = (active: boolean) =>
  `px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
    active ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'
  }`;

const dateInput = 'w-full min-h-[48px] px-3 text-sm border-2 border-gray-300 rounded-lg';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

function durationLabel(p: SpontaneousVentilationPeriod): string {
  const end = p.endAt ? new Date(p.endAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - new Date(p.startAt).getTime()) / 60000));
  return formatSVDuration(minutes / 60);
}

/** Tolerancia: ¿toleró? y, si no, el motivo de interrupción. */
function ToleranceFields({
  tolerated,
  reason,
  onTolerated,
  onReason,
}: {
  tolerated: boolean | undefined;
  reason: SVInterruptionReason | undefined;
  onTolerated: (v: boolean | undefined) => void;
  onReason: (v: SVInterruptionReason | undefined) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-gray-900 mb-2">¿Toleró?</div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { onTolerated(tolerated === true ? undefined : true); onReason(undefined); }} className={chip(tolerated === true)}>
            Sí, toleró
          </button>
          <button type="button" onClick={() => onTolerated(tolerated === false ? undefined : false)} className={chip(tolerated === false)}>
            No toleró
          </button>
        </div>
      </div>
      {tolerated === false && (
        <div>
          <div className="text-sm font-semibold text-gray-900 mb-2">Motivo de suspensión</div>
          <div className="flex flex-wrap gap-2">
            {svInterruptionReasonOptions.map((o) => (
              <button key={o.value} type="button" onClick={() => onReason(reason === o.value ? undefined : o.value)} className={chip(reason === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Períodos de ventilación espontánea de un paciente traqueostomizado en VMI:
 * iniciar / finalizar en vivo (con tolerancia), cargar uno retroactivo, y ver la
 * evolución de las horas por día de la última semana.
 */
export function SpontaneousVentilationCard({ patientId, episodeId }: SpontaneousVentilationCardProps) {
  const { getPatientSVPeriods, startSVPeriod, closeSVPeriod, addManualSVPeriod, deleteSVPeriod } = useApp();
  const periods = getPatientSVPeriods(patientId);
  const summary = computeSpontaneousVentilationSummary(periods);
  const maxHours = Math.max(4, ...summary.days.map((d) => d.hours));
  const today = summary.days[summary.days.length - 1];
  const stale = isStaleOpenPeriod(summary.active);

  const [modality, setModality] = useState<SVModality>(currentSVModality(periods[0]?.modality));
  const [finishing, setFinishing] = useState(false);
  // Cierre rápido (prueba que no quedó abierta de más): un toque en "Toleró" o "No toleró" + motivo.
  const [quickNo, setQuickNo] = useState(false);
  const [closing, setClosing] = useState(false);
  const [finishTolerated, setFinishTolerated] = useState<boolean | undefined>(undefined);
  const [finishReason, setFinishReason] = useState<SVInterruptionReason | undefined>(undefined);
  // Hora real de fin: solo se pide cuando la prueba quedó abierta de más.
  const [finishEnd, setFinishEnd] = useState(() => toLocalDateTimeInputValue(new Date()));
  const finishEndDate = new Date(finishEnd);
  const finishEndInvalid =
    stale && !!summary.active && (!(finishEndDate.getTime() > new Date(summary.active.startAt).getTime()) || finishEndDate.getTime() > Date.now() + 60_000);

  const [showRetro, setShowRetro] = useState(false);
  const [retroStart, setRetroStart] = useState(() => toLocalDateTimeInputValue(new Date(Date.now() - 3 * 60 * 60 * 1000)));
  const [retroEnd, setRetroEnd] = useState(() => toLocalDateTimeInputValue(new Date()));
  const [retroModality, setRetroModality] = useState<SVModality>(currentSVModality(periods[0]?.modality));
  const [retroTolerated, setRetroTolerated] = useState<boolean | undefined>(undefined);
  const [retroReason, setRetroReason] = useState<SVInterruptionReason | undefined>(undefined);
  const [retroNotes, setRetroNotes] = useState('');

  const handleFinish = async () => {
    if (!summary.active || finishTolerated === undefined || finishEndInvalid) return;
    await closeSVPeriod(summary.active.id, {
      tolerated: finishTolerated,
      interruptionReason: finishReason,
      endAt: stale ? finishEndDate.toISOString() : undefined,
    });
    setFinishing(false);
    setFinishTolerated(undefined);
    setFinishReason(undefined);
  };

  const quickClose = async (tolerated: boolean, interruptionReason?: SVInterruptionReason) => {
    if (!summary.active || closing) return;
    setClosing(true);
    await closeSVPeriod(summary.active.id, { tolerated, interruptionReason });
    setClosing(false);
    setQuickNo(false);
  };

  const handleRetro = async (e: FormEvent) => {
    e.preventDefault();
    await addManualSVPeriod({
      patientId,
      episodeId,
      startAt: new Date(retroStart).toISOString(),
      endAt: new Date(retroEnd).toISOString(),
      modality: retroModality,
      tolerated: retroTolerated,
      interruptionReason: retroTolerated === false ? retroReason : undefined,
      notes: retroNotes || undefined,
    });
    setShowRetro(false);
    setRetroNotes('');
    setRetroTolerated(undefined);
    setRetroReason(undefined);
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-1">Ventilación espontánea</h3>
      <p className="text-xs text-gray-500 mb-4">Pruebas fuera del ventilador con filtro HME + O₂ o tubo en T. La duración cambia cada día: puede ser de minutos, de horas o no haber tolerancia.</p>

      <div className="p-4 rounded-xl bg-blue-50 mb-4">
        <div className="text-xs font-semibold text-blue-900 mb-2">Hoy</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-2xl font-bold text-blue-900">{today.periods === 0 ? '—' : formatSVDuration(today.hours)}</div>
            <div className="text-xs text-gray-600">Tiempo</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{today.tolerated}</div>
            <div className="text-xs text-gray-600">{today.tolerated === 1 ? 'Tolerada' : 'Toleradas'}</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${today.notTolerated > 0 ? 'text-amber-600' : 'text-blue-900'}`}>{today.notTolerated}</div>
            <div className="text-xs text-gray-600">{today.notTolerated === 1 ? 'No tolerada' : 'No toleradas'}</div>
          </div>
        </div>
        <div className="text-xs text-blue-800 mt-3">
          {summary.active ? `En curso · ${svModalityLabels[summary.active.modality]} · lleva ${formatSVDuration(openPeriodHours(summary.active))}` : today.periods === 0 ? 'Hoy todavía no se hizo ninguna prueba.' : 'Sin prueba en curso.'}
          {' · '}Últimas 24 h: {formatSVDuration(summary.hoursLast24h)}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-900 mb-2">Últimos 7 días</div>
        <div className="space-y-1.5">
          {summary.days.map((day) => (
            <div key={day.date} className="flex items-center gap-2 text-xs">
              <div className="w-14 text-gray-600 flex-shrink-0">{day.label}</div>
              <div className="flex-1 h-4 bg-gray-100 rounded">
                <div className="h-4 bg-blue-500 rounded" style={{ width: `${Math.min(100, (day.hours / maxHours) * 100)}%` }} />
              </div>
              <div className="w-24 text-right text-gray-700 flex-shrink-0">
                {day.periods === 0 ? <span className="text-gray-400">sin pruebas</span> : formatSVDuration(day.hours)}
                {day.periods > 0 && <span className="text-gray-400"> · {day.periods}</span>}
                {day.notTolerated > 0 && <span className="text-amber-600"> ⚠{day.notTolerated}</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Tiempo por día · cantidad de períodos · ⚠ períodos no tolerados</p>
      </div>

      {summary.active && stale && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4 text-sm text-amber-900" role="alert">
          <div className="font-semibold">Prueba abierta hace {formatSVDuration(openPeriodHours(summary.active))}</div>
          <p className="mt-1">
            Empezó el {formatDateTime(summary.active.startAt)} y sigue en curso. Si ya terminó, cerrala con la hora real para que no sume tiempo de más.
          </p>
          {!finishing && (
            <Button type="button" onClick={() => { setFinishEnd(toLocalDateTimeInputValue(new Date())); setFinishing(true); }} className="mt-3 bg-amber-600">
              Cerrar con la hora real
            </Button>
          )}
        </div>
      )}

      {summary.active ? (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-900 font-semibold">Período en curso</div>
              <div className="text-xs text-blue-700">
                desde {formatDateTime(summary.active.startAt)} · {svModalityLabels[summary.active.modality]}
              </div>
            </div>
            {stale && !finishing && (
              <Button type="button" onClick={() => { setFinishEnd(toLocalDateTimeInputValue(new Date())); setFinishing(true); }} className="bg-blue-600">
                <SquareIcon className="w-4 h-4 mr-1 inline" /> Finalizar
              </Button>
            )}
          </div>
          {!stale && !quickNo && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={closing} onClick={() => quickClose(true)} className="min-h-[56px] rounded-xl bg-green-600 text-white font-semibold text-base active:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1">
                <CheckIcon className="w-5 h-5" /> Toleró
              </button>
              <button type="button" disabled={closing} onClick={() => setQuickNo(true)} className="min-h-[56px] rounded-xl bg-amber-500 text-white font-semibold text-base active:bg-amber-600 disabled:opacity-60 flex items-center justify-center gap-1">
                <XIcon className="w-5 h-5" /> No toleró
              </button>
            </div>
          )}
          {!stale && quickNo && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-semibold text-gray-900">¿Por qué se suspendió? <span className="font-normal text-gray-500">(tocá uno para cerrar)</span></div>
              <div className="flex flex-wrap gap-2">
                {svInterruptionReasonOptions.map((o) => (
                  <button key={o.value} type="button" disabled={closing} onClick={() => quickClose(false, o.value)} className={`${chip(false)} disabled:opacity-60`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setQuickNo(false)} fullWidth>
                  Volver
                </Button>
                <Button type="button" variant="secondary" disabled={closing} onClick={() => quickClose(false)} fullWidth>
                  Cerrar sin motivo
                </Button>
              </div>
            </div>
          )}
          {finishing && (
            <div className="mt-3 space-y-3">
              {stale && (
                <label className="block text-xs font-medium text-gray-700">
                  Hora real de fin
                  <input type="datetime-local" value={finishEnd} onChange={(e) => setFinishEnd(e.target.value)} className={`${dateInput} mt-1`} />
                  {finishEndInvalid && <span className="text-red-600">Tiene que ser posterior al inicio y no futura.</span>}
                </label>
              )}
              <ToleranceFields tolerated={finishTolerated} reason={finishReason} onTolerated={setFinishTolerated} onReason={setFinishReason} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setFinishing(false)} fullWidth>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleFinish} disabled={finishTolerated === undefined || finishEndInvalid} fullWidth>
                  Finalizar período
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {svModalityOptions.map((o) => (
              <button key={o.value} type="button" onClick={() => setModality(o.value)} className={chip(modality === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => startSVPeriod(patientId, modality, episodeId)} fullWidth className="bg-blue-600">
            <PlayIcon className="w-4 h-4 mr-1 inline" /> Iniciar ahora · {svModalityLabels[modality]}
          </Button>
        </div>
      )}

      <button type="button" onClick={() => setShowRetro((v) => !v)} className="text-sm text-blue-700 font-medium flex items-center gap-1 mb-3">
        <PlusIcon className="w-4 h-4" /> Cargar período retroactivo
      </button>

      {showRetro && (
        <form onSubmit={handleRetro} className="space-y-3 mb-4 p-4 bg-gray-50 rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-medium text-gray-700">
              Inicio
              <input type="datetime-local" value={retroStart} onChange={(e) => setRetroStart(e.target.value)} className={`${dateInput} mt-1`} required />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Fin
              <input type="datetime-local" value={retroEnd} onChange={(e) => setRetroEnd(e.target.value)} className={`${dateInput} mt-1`} required />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {svModalityOptions.map((o) => (
              <button key={o.value} type="button" onClick={() => setRetroModality(o.value)} className={chip(retroModality === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
          <ToleranceFields tolerated={retroTolerated} reason={retroReason} onTolerated={setRetroTolerated} onReason={setRetroReason} />
          <input type="text" placeholder="Notas (opcional)" value={retroNotes} onChange={(e) => setRetroNotes(e.target.value)} className={dateInput} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowRetro(false)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              Guardar
            </Button>
          </div>
        </form>
      )}

      {periods.length > 0 && (
        <div className="space-y-2">
          {periods.slice(0, 10).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 gap-2">
              <div className="min-w-0">
                <div>
                  <span className="text-gray-900 font-medium">{formatDateTime(p.startAt)}</span>
                  <span className="text-gray-500"> → </span>
                  <span className="text-gray-900 font-medium">{p.endAt ? formatDateTime(p.endAt) : 'en curso'}</span>
                  <span className="text-gray-500"> · {durationLabel(p)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {svModalityLabels[p.modality]}
                  {p.tolerated === true && ' · toleró'}
                  {p.tolerated === false && ` · no toleró${p.interruptionReason ? ` (${svInterruptionReasonLabels[p.interruptionReason].toLowerCase()})` : ''}`}
                  {p.notes ? ` · ${p.notes}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => deleteSVPeriod(p.id)} aria-label="Eliminar período" className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0">
                <Trash2Icon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
