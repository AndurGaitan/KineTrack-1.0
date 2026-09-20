import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BottomSheet } from '../ui/BottomSheet';
import { ChipGroup } from './ChipGroup';
import { OcclusionTrialCard } from './OcclusionTrialCard';
import { RescueChecklist } from './RescueChecklist';
import * as trachApi from '../../api/trachApi';
import {
  CHECK_META,
  DOMAINS,
  DomainAction,
  DomainMeta,
  STATUS_META,
  STATUS_ORDER,
  TrachContext,
  ago,
  currentAssessments,
  isNearDecannulation,
  missingItems,
  observeDomain,
  statusCounts,
} from '../../domain/services/trachDecannulation';
import type { TrachDecannulationProcess, TrachDomain, TrachDomainStatus } from '../../types';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface DecannulationPanelProps {
  patientId: string;
  ctx: TrachContext;
  onProcessChange: (process: TrachDecannulationProcess | null) => void;
  onGoToUpdateState: () => void;
  /** Recarga aspiraciones/overview después de una acción rápida. */
  onChanged: () => void | Promise<void>;
}

export function DecannulationPanel({ patientId, ctx, onProcessChange, onGoToUpdateState, onChanged }: DecannulationPanelProps) {
  const { now, overview, episode } = ctx;
  const process = overview?.activeProcess ?? null;
  const [expanded, setExpanded] = useState<TrachDomain | null>(null);
  const [rescueForced, setRescueForced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const near = isNearDecannulation(process, ctx);
  const rescueVisible = near || rescueForced;
  const counts = useMemo(() => statusCounts(process), [process]);
  const missing = useMemo(() => missingItems(process, ctx, rescueVisible), [process, ctx, rescueVisible]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      onProcessChange(await trachApi.startProcess({ patientId, episodeId: episode?.id }));
      setConfirmStart(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el proceso');
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (domain: TrachDomain, action: DomainAction) => {
    if (action === 'update-state') return onGoToUpdateState();
    if (action === 'occlusion') return setExpanded('oclusion');
    if (action === 'rescue') {
      setRescueForced(true);
      return setExpanded('rescate');
    }
    // log-aspiration
    try {
      await trachApi.logAspiration({ patientId, episodeId: episode?.id });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la aspiración');
    }
    void domain;
  };

  // ------------------------------------------------------------------ no process
  if (!process) {
    const past = overview?.pastProcesses[0];
    return (
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Proceso de decanulación</h2>
        <p className="text-sm text-gray-600 mb-4">
          No es necesario para el seguimiento diario. Iniciálo cuando consideres que corresponde: se abren los 7 dominios de evaluación y se reutilizan los datos que ya cargaste.
        </p>
        {past && (
          <div className="mb-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm text-gray-700">
            Proceso anterior: {past.outcome === 'decanulado' ? 'finalizó con decanulación' : 'suspendido'} {ago(past.endedAt, now)}
            {past.endNotes ? ` — ${past.endNotes}` : ''}
          </div>
        )}
        {!confirmStart ? (
          <Button fullWidth onClick={() => setConfirmStart(true)} className="bg-indigo-600">
            Iniciar proceso de decanulación
          </Button>
        ) : (
          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-3">
            <p className="text-sm text-gray-800">¿Iniciar el proceso de decanulación para este paciente? Queda registrado con tu usuario y la fecha de hoy.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmStart(false)}>
                Cancelar
              </Button>
              <Button onClick={start} disabled={busy} className="bg-indigo-600">
                {busy ? 'Iniciando...' : 'Sí, iniciar'}
              </Button>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>
    );
  }

  // ------------------------------------------------------------------ active process
  const assessments = currentAssessments(process);
  const dayNumber = Math.max(0, Math.floor((now.getTime() - new Date(process.startedAt).getTime()) / 86400000)) + 1;
  const visibleDomains = DOMAINS.filter((d) => d.key !== 'rescate' || rescueVisible);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Proceso de decanulación</h2>
          <div className="text-xs text-gray-500">
            Día {dayNumber} · iniciado {ago(process.startedAt, now)}
          </div>
        </div>
        <button onClick={() => setShowEnd(true)} className="text-xs font-semibold text-gray-500 underline flex-shrink-0">
          Finalizar
        </button>
      </div>

      {/* One-glance summary: no score, no percentage — just the state of each domain. */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 mb-4">
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {DOMAINS.map((d, i) => {
            const status = assessments[d.key]?.status ?? 'pendiente';
            const hidden = d.key === 'rescate' && !rescueVisible;
            return (
              <button
                key={d.key}
                onClick={() => !hidden && setExpanded(expanded === d.key ? null : d.key)}
                className={`flex flex-col items-center gap-1 ${hidden ? 'opacity-30' : ''}`}
                aria-label={`${d.label}: ${STATUS_META[status].label}`}
              >
                <span className={`w-full h-2.5 rounded-full ${hidden ? 'bg-gray-200' : STATUS_META[status].dot}`} />
                <span className="text-[10px] text-gray-500 font-medium">{i + 1}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
          {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
              {counts[s]} {STATUS_META[s].label.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4">
          <div className="text-sm font-bold text-amber-900 mb-1.5">Qué falta</div>
          <ul className="space-y-2">
            {missing.slice(0, 4).map((m) => (
              <li key={m.domain} className="flex items-start justify-between gap-3 text-sm text-amber-900">
                <span>{m.text}</span>
                {m.action ? (
                  <button onClick={() => runAction(m.domain, m.action!)} className="flex-shrink-0 text-xs font-bold underline">
                    Registrar
                  </button>
                ) : (
                  <button onClick={() => setExpanded(m.domain)} className="flex-shrink-0 text-xs font-bold underline">
                    Ver
                  </button>
                )}
              </li>
            ))}
          </ul>
          {missing.length > 4 && <div className="text-xs text-amber-800 mt-1.5">y {missing.length - 4} más</div>}
        </div>
      )}

      <div className="space-y-2">
        {visibleDomains.map((d) => (
          <DomainCard
            key={d.key}
            meta={d}
            index={DOMAINS.findIndex((x) => x.key === d.key) + 1}
            ctx={ctx}
            process={process}
            open={expanded === d.key}
            onToggle={() => setExpanded(expanded === d.key ? null : d.key)}
            onProcessChange={onProcessChange}
            onAction={(action) => runAction(d.key, action)}
          />
        ))}
        {!rescueVisible && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 flex items-center justify-between gap-3">
            <span>
              <strong className="text-gray-700">7 · Capacidad de rescate:</strong> se muestra al acercarse a la decanulación.
            </span>
            <button onClick={() => setRescueForced(true)} className="text-xs font-bold text-indigo-700 underline flex-shrink-0">
              Abrir ahora
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showEnd && <EndProcessSheet process={process} onClose={() => setShowEnd(false)} onEnded={() => { setShowEnd(false); onProcessChange(null); void onChanged(); }} />}
    </Card>
  );
}

// ---------------------------------------------------------------------------
interface DomainCardProps {
  meta: DomainMeta;
  index: number;
  ctx: TrachContext;
  process: TrachDecannulationProcess;
  open: boolean;
  onToggle: () => void;
  onProcessChange: (process: TrachDecannulationProcess) => void;
  onAction: (action: DomainAction) => void;
}

function DomainCard({ meta, index, ctx, process, open, onToggle, onProcessChange, onAction }: DomainCardProps) {
  const { now } = ctx;
  const obs = observeDomain(meta.key, ctx);
  const history = process.assessments.filter((a) => a.domain === meta.key).slice().reverse();
  const current = history[0];
  const status: TrachDomainStatus = current?.status ?? 'pendiente';

  const [draft, setDraft] = useState<TrachDomainStatus | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await trachApi.assessDomain(process.id, {
        domain: meta.key,
        status: draft,
        notes: notes.trim() || undefined,
        // Freeze what the screen showed, so the interpretation stays auditable
        // even after the underlying data changes.
        observed: { facts: obs.facts, check: obs.check, checkText: obs.checkText, reference: meta.reference },
      });
      onProcessChange(updated);
      setDraft(undefined);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la interpretación');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-xl border-2 ${open ? STATUS_META[status].ring : 'border-gray-200'} bg-white`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left" aria-expanded={open}>
        <span className={`w-2.5 self-stretch rounded-full ${STATUS_META[status].dot}`} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-gray-900">
            {index} · {meta.label}
          </span>
          <span className={`block text-xs ${CHECK_META[obs.check].className}`}>{obs.checkText}</span>
        </span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_META[status].badge}`}>{STATUS_META[status].label}</span>
        {open ? <ChevronUpIcon className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-4 border-t border-gray-100 pt-3">
          {/* 1 · Dato observado */}
          <section>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Dato observado</div>
            {meta.key === 'oclusion' ? null : obs.facts.length === 0 ? (
              <div className="text-sm text-gray-400">Sin datos cargados todavía.</div>
            ) : (
              <dl className="space-y-1">
                {obs.facts.map((f) => (
                  <div key={f.label} className="flex justify-between gap-3 text-sm">
                    <dt className="text-gray-500">{f.label}</dt>
                    <dd className="text-right font-semibold text-gray-900">
                      {f.value}
                      {f.when && <span className="block text-xs font-normal text-gray-400">{f.when}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {obs.action && meta.key !== 'oclusion' && meta.key !== 'rescate' && (
              <button onClick={() => onAction(obs.action!.kind)} className="mt-2 text-sm font-bold text-indigo-700 underline">
                {obs.action.label}
              </button>
            )}
          </section>

          {meta.key === 'oclusion' && <OcclusionTrialCard process={process} now={now} onProcessChange={onProcessChange} />}
          {meta.key === 'rescate' && <RescueChecklist process={process} now={now} onProcessChange={onProcessChange} />}

          {/* 2 · Referencia institucional */}
          <section>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Referencia institucional</div>
            <div className="text-sm text-gray-800">{meta.reference}</div>
            {meta.provisional && <div className="text-xs text-amber-700 mt-1">Referencia provisoria: validar con el protocolo institucional.</div>}
            <div className={`text-sm font-semibold mt-1 ${CHECK_META[obs.check].className}`}>{CHECK_META[obs.check].label}</div>
          </section>

          {/* 3 · Interpretación profesional */}
          <section>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Tu interpretación</div>
            {current && (
              <div className="text-xs text-gray-500 mb-2">
                Vigente: <strong className="text-gray-800">{STATUS_META[current.status].label}</strong> · {ago(current.assessedAt, now)}
                {current.notes ? ` — ${current.notes}` : ''}
              </div>
            )}
            <ChipGroup
              clearable
              value={draft}
              onChange={setDraft}
              tone={draft === 'favorable' ? 'green' : draft === 'desfavorable' ? 'red' : draft === 'condicionado' ? 'amber' : 'blue'}
              options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))}
            />
            {draft && (
              <div className="mt-3 space-y-3">
                <Input label="Fundamento (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: tos efectiva, secreciones manejables" />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button fullWidth onClick={save} disabled={busy} className="bg-indigo-600">
                  {busy ? 'Guardando...' : `Guardar como ${STATUS_META[draft].label.toLowerCase()}`}
                </Button>
              </div>
            )}
            {history.length > 1 && (
              <div className="mt-3">
                <button onClick={() => setShowHistory((v) => !v)} className="text-xs font-semibold text-gray-500 underline">
                  {showHistory ? 'Ocultar historial' : `Ver historial (${history.length})`}
                </button>
                {showHistory && (
                  <ul className="mt-2 space-y-1.5">
                    {history.map((a) => (
                      <li key={a.id} className="text-xs text-gray-600">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold mr-1.5 ${STATUS_META[a.status].badge}`}>{STATUS_META[a.status].label}</span>
                        {ago(a.assessedAt, now)}
                        {a.notes ? ` — ${a.notes}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function EndProcessSheet({ process, onClose, onEnded }: { process: TrachDecannulationProcess; onClose: () => void; onEnded: () => void }) {
  const [outcome, setOutcome] = useState<'decanulado' | 'suspendido' | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const end = async () => {
    if (!outcome) return;
    setBusy(true);
    setError(null);
    try {
      await trachApi.endProcess(process.id, { outcome, notes: notes.trim() || undefined });
      onEnded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo finalizar el proceso');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet title="Finalizar proceso de decanulación" onClose={onClose}>
      <div className="space-y-4">
        <ChipGroup
          clearable={false}
          value={outcome}
          onChange={setOutcome}
          tone={outcome === 'decanulado' ? 'green' : 'amber'}
          options={[
            { value: 'decanulado', label: 'Se decanuló' },
            { value: 'suspendido', label: 'Se suspendió' },
          ]}
        />
        <Input label="Motivo / nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {outcome === 'decanulado' && (
          <p className="text-xs text-gray-500">Después de decanular, actualizá el soporte del paciente desde “Cambiar soporte” en su ficha.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button fullWidth disabled={busy || !outcome} onClick={end}>
          {busy ? 'Guardando...' : 'Finalizar proceso'}
        </Button>
      </div>
    </BottomSheet>
  );
}
