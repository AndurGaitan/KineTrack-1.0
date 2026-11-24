import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, PrinterIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { CaseTimelineChart } from '../../components/coordinator/CaseTimelineChart';
import {
  buildCasePoints,
  detectVentilatoryDecisions,
  formatImpact,
  impactLabels,
  IMPACT_WINDOW_HOURS,
  pveEvents,
  summarizeCase,
  type CaseEvent,
} from '../../utils/clinicalCase';

const MIN_RECORDS = 3;
const DAY_MS = 86_400_000;

const closureLabels: Record<string, string> = {
  discharge: 'Alta médica',
  'transfer-ward': 'Pase a sala',
  'transfer-facility': 'Traslado',
  deceased: 'Fallecimiento',
};

const supportLabels: Record<string, string> = {
  imv: 'VMI',
  niv: 'VMNI',
  hfnc: 'CAFO',
  traqueostomia: 'Traqueostomía (respiración espontánea)',
  'conventional-oxygen': 'Oxígeno convencional',
  'room-air': 'Aire ambiente',
};

const fmtRange = (r: [number, number] | undefined, decimals = 0, unit = '') =>
  r ? `${r[0].toFixed(decimals).replace('.', ',')}${r[0] !== r[1] ? ` – ${r[1].toFixed(decimals).replace('.', ',')}` : ''}${unit}` : '—';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * Retrospectiva de casos de VMI: la estrategia ventilatoria, la gasometría y la mecánica de un paciente a lo
 * largo de toda su ventilación, con las decisiones marcadas. Pensada para mostrar al directorio la capacidad de
 * la app; por defecto el paciente va anonimizado (sin nombre, cama ni fechas calendario).
 */
export function ClinicalCasesPage() {
  const { patients, getPatientVMIRecords, getPatientPveDecisions, getPatientPrestaciones } = useApp();
  const [params, setParams] = useSearchParams();
  const [anonymous, setAnonymous] = useState(true);
  const [includeActive, setIncludeActive] = useState(false);

  // Todos los pacientes con datos suficientes, del más al menos completo: el orden fija el número de "Caso N".
  const ranked = useMemo(
    () =>
      patients
        .map((p) => ({ patient: p, count: getPatientVMIRecords(p.id).length }))
        .filter((x) => x.count >= MIN_RECORDS)
        .sort((a, b) => b.count - a.count),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patients, getPatientVMIRecords]
  );
  const eligible = ranked.filter((x) => x.patient.status === 'closed' || includeActive);
  const requested = params.get('paciente');
  const selected = eligible.find((x) => x.patient.id === requested) ?? eligible[0];
  const caseNumber = selected ? ranked.findIndex((x) => x.patient.id === selected.patient.id) + 1 : 0;

  const patient = selected?.patient;
  const records = patient ? getPatientVMIRecords(patient.id) : [];
  const imvEpisode = patient?.episodes.filter((e) => e.supportType === 'imv').sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  const startMs = records.length > 0 ? (imvEpisode ? new Date(imvEpisode.startAt).getTime() : Math.min(...records.map((r) => new Date(r.timestamp).getTime()))) : 0;

  const points = useMemo(() => buildCasePoints(records, startMs), [records, startMs]);
  const decisions = useMemo(() => detectVentilatoryDecisions(points), [points]);
  const summary = useMemo(() => summarizeCase(points), [points]);
  const endMs = points.length > 0 ? points[points.length - 1].t : startMs;
  const showDates = !anonymous;
  const dayOf = (iso: string) => Math.max(1, Math.floor((new Date(iso).getTime() - startMs) / DAY_MS) + 1);
  const dateText = (iso: string) => (showDates ? ` · ${new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}` : '');

  const events: CaseEvent[] = useMemo(() => {
    if (!patient) return [];
    const list: CaseEvent[] = [...pveEvents(getPatientPveDecisions(patient.id), startMs)];
    for (const e of patient.episodes) {
      list.push({ t: new Date(e.startAt).getTime(), iso: e.startAt, day: dayOf(e.startAt), text: `Pasa a ${supportLabels[e.supportType] ?? e.supportType}${e.reason ? ` (${e.reason})` : ''}` });
    }
    if (patient.closure) {
      list.push({ t: new Date(patient.closure.date).getTime(), iso: patient.closure.date, day: dayOf(patient.closure.date), text: `Cierre: ${closureLabels[patient.closure.reason] ?? patient.closure.reason}` });
    }
    return list.sort((a, b) => a.t - b.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, startMs, getPatientPveDecisions]);

  const prestaciones = patient ? getPatientPrestaciones(patient.id) : [];
  const ktr = prestaciones.filter((p) => p.type === 'kinesioterapia-respiratoria').length;
  const ktm = prestaciones.filter((p) => p.type === 'kinesioterapia-motora').length;

  const markers = decisions.map((d) => ({ n: d.n, t: d.t }));
  const chartProps = { points, startMs, endMs, markers, showDates };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="print:hidden">
        <Header title="Casos clínicos" showBack />
        <CoordinatorNav />
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <Card className="print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="flex-1 text-xs font-medium text-gray-700">
              Caso
              <select
                value={selected?.patient.id ?? ''}
                onChange={(e) => setParams({ paciente: e.target.value })}
                disabled={eligible.length === 0}
                className="mt-1 w-full min-h-[48px] px-3 text-base border-2 border-gray-300 rounded-xl bg-white"
              >
                {eligible.map((x) => {
                  const n = ranked.findIndex((r) => r.patient.id === x.patient.id) + 1;
                  return (
                    <option key={x.patient.id} value={x.patient.id}>
                      {anonymous ? `Caso ${n}` : x.patient.alias} · {x.count} registros{x.patient.admissionDiagnosis ? ` · ${x.patient.admissionDiagnosis}` : ''}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="flex flex-col gap-2 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="w-5 h-5" />
                Anonimizar (sin nombre, cama ni fechas)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeActive} onChange={(e) => setIncludeActive(e.target.checked)} className="w-5 h-5" />
                Incluir pacientes activos
              </label>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!patient}
              className="min-h-[48px] px-4 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PrinterIcon className="w-4 h-4" /> Imprimir / PDF
            </button>
          </div>
        </Card>

        {!patient ? (
          <Card className="text-center py-12">
            <p className="text-gray-600">No hay pacientes cerrados con al menos {MIN_RECORDS} registros de VMI.</p>
            <p className="text-sm text-gray-500 mt-1">Probá con "Incluir pacientes activos".</p>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-gray-500">Retrospectiva de ventilación mecánica invasiva</div>
                  <h2 className="text-2xl font-bold text-gray-900">{anonymous ? `Caso ${caseNumber}` : patient.alias}</h2>
                  <div className="text-sm text-gray-700 mt-1">
                    {[patient.sex ? (patient.sex === 'female' ? 'Mujer' : 'Hombre') : null, patient.age != null ? `${patient.age} años` : null, patient.admissionDiagnosis].filter(Boolean).join(' · ') || 'Sin datos clínicos básicos'}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div className="font-semibold text-gray-900">
                    {patient.closure ? closureLabels[patient.closure.reason] ?? patient.closure.reason : 'Paciente activo'}
                  </div>
                  {patient.closure && <div className="text-xs text-gray-500">día {dayOf(patient.closure.date)} de VMI{dateText(patient.closure.date)}</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 mt-4 border-t border-gray-100">
                <Stat label="Días de VMI registrados" value={String(summary.days)} />
                <Stat label="Registros" value={String(summary.records)} />
                <Stat label="Con gasometría" value={String(summary.withGasometry)} />
                <Stat label="Con mecánica (Pplat y ΔP)" value={String(summary.withMechanics)} />
                <Stat label="PEEP" value={fmtRange(summary.peep, 0, ' cmH₂O')} />
                <Stat label="FiO₂" value={fmtRange(summary.fio2, 0, ' %')} />
                <Stat label="pH" value={fmtRange(summary.ph, 2)} />
                <Stat label="PaFi" value={fmtRange(summary.pfRatio)} />
              </div>
              <div className="text-xs text-gray-500 mt-3">Modos usados: {summary.modes.join(', ')} · KTR: {ktr} · KTM: {ktm}</div>
            </Card>

            <h3 className="text-lg font-bold text-gray-900 pt-2">Estrategia ventilatoria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CaseTimelineChart
                {...chartProps}
                title="PEEP y FiO₂"
                subtitle="Parámetros programados"
                series={[
                  { key: 'peep', label: 'PEEP (cmH₂O)', color: '#2563eb', step: true },
                  { key: 'fio2', label: 'FiO₂ (%)', color: '#f59e0b', axis: 'right', step: true },
                ]}
              />
              <CaseTimelineChart
                {...chartProps}
                title="Volumen corriente"
                unit="ml/kg PBW"
                series={[{ key: 'vtPerKg', label: 'Vt/kg', color: '#2563eb' }]}
                refLines={[{ value: 8, label: '≤ 8', color: '#ef4444' }]}
              />
            </div>

            <h3 className="text-lg font-bold text-gray-900 pt-2">Gasometría</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CaseTimelineChart
                {...chartProps}
                title="Relación PaO₂/FiO₂"
                series={[{ key: 'pfRatio', label: 'PaFi', color: '#0ea5e9' }]}
                refLines={[
                  { value: 300, label: '300', color: '#22c55e' },
                  { value: 200, label: '200', color: '#eab308' },
                  { value: 100, label: '100', color: '#f97316' },
                ]}
              />
              <CaseTimelineChart
                {...chartProps}
                title="pH y PaCO₂"
                series={[
                  { key: 'ph', label: 'pH', color: '#0ea5e9' },
                  { key: 'paco2', label: 'PaCO₂ (mmHg)', color: '#8b5cf6', axis: 'right' },
                ]}
              />
            </div>

            <h3 className="text-lg font-bold text-gray-900 pt-2">Mecánica ventilatoria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CaseTimelineChart
                {...chartProps}
                title="Presión meseta y driving pressure"
                unit="cmH₂O"
                series={[
                  { key: 'pplat', label: 'Pplat', color: '#2563eb' },
                  { key: 'driving', label: 'ΔP', color: '#f59e0b' },
                ]}
                refLines={[
                  { value: 30, label: 'Pplat ≤ 30', color: '#ef4444' },
                  { value: 15, label: 'ΔP ≤ 15', color: '#f97316' },
                ]}
              />
              <CaseTimelineChart {...chartProps} title="Compliance estática" unit="ml/cmH₂O" series={[{ key: 'compliance', label: 'Compliance', color: '#2563eb' }]} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 pt-2">Decisiones de estrategia ventilatoria</h3>
            <p className="text-xs text-gray-500 -mt-2">
              Cambios de modo, PEEP (≥ 2), FiO₂ (≥ 10 puntos) o Vt/kg (≥ 1) entre dos registros consecutivos; el número es el que aparece marcado en los
              gráficos. Cada una compara el último valor cargado antes del cambio con el primero posterior (hasta {IMPACT_WINDOW_HOURS} h). Es una
              descripción: que una variable se mueva después de un cambio no demuestra que el cambio la haya causado.
            </p>
            {decisions.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500">No hay cambios de estrategia entre los registros de este caso.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {decisions.map((d) => (
                  <Card key={d.n} className="break-inside-avoid">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{d.n}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900">
                          Día {d.day}
                          {dateText(d.iso)} · {d.changes.map((c) => `${c.label} ${c.from} → ${c.to}`).join(', ')}
                        </div>
                        {d.impact.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {d.impact.map((i) => {
                              const Icon = i.after > i.before ? ArrowUpIcon : i.after < i.before ? ArrowDownIcon : ArrowRightIcon;
                              return (
                                <span key={i.key} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-800 rounded-lg px-2 py-1">
                                  <span className="font-semibold">{impactLabels[i.key].label}</span>
                                  {formatImpact(i.before, i.key)} <Icon className="w-3 h-3" /> {formatImpact(i.after, i.key)}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">Sin valores comparables antes y después.</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <h3 className="text-lg font-bold text-gray-900 pt-2">Eventos del caso</h3>
            {events.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500">Sin PVE ni cambios de soporte registrados.</p>
              </Card>
            ) : (
              <Card>
                <ul className="divide-y divide-gray-100">
                  {events.map((e, i) => (
                    <li key={i} className="py-2 flex gap-3 text-sm">
                      <span className="w-16 flex-shrink-0 font-semibold text-gray-900">Día {e.day}</span>
                      <span className="text-gray-700">
                        {e.text}
                        {showDates && <span className="text-gray-400">{dateText(e.iso)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
