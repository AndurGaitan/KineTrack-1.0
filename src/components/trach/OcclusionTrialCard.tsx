import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BottomSheet } from '../ui/BottomSheet';
import { ChipGroup } from './ChipGroup';
import * as trachApi from '../../api/trachApi';
import { REFERENCES, formatHours, occlusionInfo } from '../../domain/services/trachDecannulation';
import type { TrachDecannulationProcess, TrachOcclusionEventType, TrachOcclusionResult, TrachOcclusionTrial } from '../../types';

const EVENT_LABELS: Record<TrachOcclusionEventType, string> = {
  desaturacion: 'Desaturación',
  disnea: 'Disnea',
  secreciones: 'Secreciones',
  'retiro-tapon': 'Retiro del tapón',
  otro: 'Otro',
};

const RESULT_LABELS: Record<TrachOcclusionResult, string> = {
  tolerada: 'Tolerada',
  'no-tolerada': 'No tolerada',
  interrumpida: 'Interrumpida',
};

const RESULT_BADGE: Record<TrachOcclusionResult, string> = {
  tolerada: 'bg-green-100 text-green-800',
  'no-tolerada': 'bg-red-100 text-red-800',
  interrumpida: 'bg-amber-100 text-amber-800',
};

function clock(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** yyyy-MM-ddTHH:mm in local time, as <input type="datetime-local"> expects. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface OcclusionTrialCardProps {
  process: TrachDecannulationProcess;
  now: Date;
  onProcessChange: (process: TrachDecannulationProcess) => void;
}

type SheetKind = 'control' | 'evento' | 'end' | null;

export function OcclusionTrialCard({ process, now, onProcessChange }: OcclusionTrialCardProps) {
  const active = process.occlusionTrials.find((t) => !t.endedAt);
  const past = process.occlusionTrials.filter((t) => t.endedAt).slice().reverse();

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backdate, setBackdate] = useState(false);
  const [startAt, setStartAt] = useState(toLocalInput(now));

  const [spo2, setSpo2] = useState('');
  const [rr, setRr] = useState('');
  const [hr, setHr] = useState('');
  const [notes, setNotes] = useState('');
  const [eventType, setEventType] = useState<TrachOcclusionEventType | undefined>(undefined);
  const [result, setResult] = useState<TrachOcclusionResult | undefined>(undefined);

  const run = async (fn: () => Promise<TrachDecannulationProcess>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      onProcessChange(updated);
      after?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const closeSheet = () => {
    setSheet(null);
    setSpo2('');
    setRr('');
    setHr('');
    setNotes('');
    setEventType(undefined);
    setResult(undefined);
    setError(null);
  };

  const start = () =>
    run(
      () => trachApi.startOcclusionTrial(process.id, backdate ? new Date(startAt).toISOString() : undefined),
      () => setBackdate(false)
    );

  const saveEntry = (kind: 'control' | 'evento') =>
    run(
      () =>
        trachApi.addOcclusionEntry(active!.id, {
          kind,
          spo2: spo2 ? Number(spo2) : undefined,
          respiratoryRate: rr ? Number(rr) : undefined,
          heartRate: hr ? Number(hr) : undefined,
          eventType: kind === 'evento' ? eventType : undefined,
          notes: notes.trim() || undefined,
        }),
      closeSheet
    );

  const finish = () => run(() => trachApi.endOcclusionTrial(active!.id, { result: result!, notes: notes.trim() || undefined }), closeSheet);

  const info = active ? occlusionInfo(active, now) : undefined;

  return (
    <div className="space-y-3">
      {!active && (
        <div className="rounded-xl border border-gray-200 p-3 space-y-3">
          <p className="text-sm text-gray-600">
            La oclusión se registra como un episodio: inicio, controles, eventos y resultado. Referencia: ≥ {REFERENCES.occlusionMinHours} h incluyendo el período nocturno.
          </p>
          {backdate && (
            <Input label="Inicio de la oclusión" type="datetime-local" value={startAt} max={toLocalInput(now)} onChange={(e) => setStartAt(e.target.value)} />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={start} disabled={busy || (backdate && !startAt)} className="bg-indigo-600">
              {busy ? 'Iniciando...' : 'Iniciar oclusión ahora'}
            </Button>
            <button onClick={() => setBackdate((v) => !v)} className="text-sm font-semibold text-indigo-700 underline">
              {backdate ? 'Usar la hora actual' : 'Ya la inicié antes'}
            </button>
          </div>
        </div>
      )}

      {active && info && (
        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-3 space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Oclusión en curso</div>
            <div className="text-2xl font-bold text-gray-900">{formatHours(info.hours)}</div>
            <div className="text-xs text-gray-600">
              Desde {clock(active.startedAt)} · {info.coversNight ? 'ya incluye período nocturno' : 'aún sin período nocturno'}
              {info.hours < REFERENCES.occlusionMinHours && ` · faltan ${formatHours(REFERENCES.occlusionMinHours - info.hours)} para la referencia`}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={() => setSheet('control')} className="min-h-[48px] px-2 text-sm">
              + Control
            </Button>
            <Button variant="secondary" onClick={() => setSheet('evento')} className="min-h-[48px] px-2 text-sm">
              + Evento
            </Button>
            <Button onClick={() => setSheet('end')} className="min-h-[48px] px-2 text-sm bg-indigo-600">
              Finalizar
            </Button>
          </div>
          {active.entries.length > 0 && <EntryList trial={active} />}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pruebas anteriores</div>
          {past.map((trial) => {
            const i = occlusionInfo(trial, now);
            return (
              <div key={trial.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatHours(i.hours)} · {clock(trial.startedAt)}
                  </div>
                  {trial.result && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RESULT_BADGE[trial.result]}`}>{RESULT_LABELS[trial.result]}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {i.coversNight ? 'Incluyó período nocturno' : 'Sin período nocturno'} · {i.controls} controles · {i.events} eventos
                </div>
                {trial.resultNotes && <div className="text-sm text-gray-700 mt-1">{trial.resultNotes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {error && !sheet && <p className="text-sm text-red-600">{error}</p>}

      {sheet === 'control' && (
        <BottomSheet title="Control durante la oclusión" onClose={closeSheet}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="SpO₂ %" type="number" inputMode="decimal" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
              <Input label="FR" type="number" inputMode="decimal" value={rr} onChange={(e) => setRr(e.target.value)} />
              <Input label="FC" type="number" inputMode="decimal" value={hr} onChange={(e) => setHr(e.target.value)} />
            </div>
            <Input label="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button fullWidth disabled={busy || (!spo2 && !rr && !hr && !notes.trim())} onClick={() => saveEntry('control')}>
              {busy ? 'Guardando...' : 'Guardar control'}
            </Button>
          </div>
        </BottomSheet>
      )}

      {sheet === 'evento' && (
        <BottomSheet title="Evento durante la oclusión" onClose={closeSheet}>
          <div className="space-y-4">
            <ChipGroup
              tone="amber"
              value={eventType}
              onChange={setEventType}
              options={(Object.keys(EVENT_LABELS) as TrachOcclusionEventType[]).map((v) => ({ value: v, label: EVENT_LABELS[v] }))}
            />
            <Input label="Detalle (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button fullWidth disabled={busy || !eventType} onClick={() => saveEntry('evento')}>
              {busy ? 'Guardando...' : 'Guardar evento'}
            </Button>
          </div>
        </BottomSheet>
      )}

      {sheet === 'end' && active && (
        <BottomSheet title="Finalizar la prueba de oclusión" onClose={closeSheet}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Duración hasta ahora: <strong>{formatHours(occlusionInfo(active, now).hours)}</strong>. El resultado lo definís vos; el sistema no lo decide.
            </p>
            <ChipGroup
              clearable={false}
              value={result}
              onChange={setResult}
              tone={result === 'tolerada' ? 'green' : result === 'no-tolerada' ? 'red' : 'amber'}
              options={(Object.keys(RESULT_LABELS) as TrachOcclusionResult[]).map((v) => ({ value: v, label: RESULT_LABELS[v] }))}
            />
            <Input label="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button fullWidth disabled={busy || !result} onClick={finish}>
              {busy ? 'Guardando...' : 'Finalizar prueba'}
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function EntryList({ trial }: { trial: TrachOcclusionTrial }) {
  const entries = trial.entries.slice().reverse();
  return (
    <div className="space-y-1.5">
      {entries.slice(0, 6).map((e) => (
        <div key={e.id} className="flex items-start gap-2 text-sm">
          <span className="text-xs text-gray-500 w-20 flex-shrink-0 pt-0.5">{clock(e.at)}</span>
          {e.kind === 'control' ? (
            <span className="text-gray-800">
              Control{e.spo2 !== undefined ? ` · SpO₂ ${e.spo2}%` : ''}
              {e.respiratoryRate !== undefined ? ` · FR ${e.respiratoryRate}` : ''}
              {e.heartRate !== undefined ? ` · FC ${e.heartRate}` : ''}
              {e.notes ? ` · ${e.notes}` : ''}
            </span>
          ) : (
            <span className="text-amber-800 font-medium">
              Evento: {e.eventType ? EVENT_LABELS[e.eventType] : ''}
              {e.notes ? ` · ${e.notes}` : ''}
            </span>
          )}
        </div>
      ))}
      {entries.length > 6 && <div className="text-xs text-gray-400">+ {entries.length - 6} más antiguos</div>}
    </div>
  );
}
