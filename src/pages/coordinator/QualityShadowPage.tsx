import { useCallback, useEffect, useState } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { useApp } from '../../contexts/AppContext';
import * as api from '../../api/qualityV2Api';
import type { DefinitionDTO, PveStatus, ShadowPatientDay, ShadowSummary } from '../../api/qualityV2Api';
import { confirmSave, notifySuccess } from '../../utils/notify';

/**
 * Indicadores de calidad v2 — fase 1: PVE en MODO SOMBRA (solo coordinador).
 * Es una vista de contraste: NO reemplaza al panel de calidad actual y no alimenta reportes oficiales,
 * pases ni productividad.
 */

const statusLabels: Record<PveStatus, string> = {
  ELIGIBLE_PERFORMED: 'Elegible · PVE realizada',
  ELIGIBLE_NOT_PERFORMED: 'Elegible · PVE no realizada',
  NOT_ELIGIBLE: 'No elegible',
  NOT_ASSESSED: 'Sin evaluar',
  NOT_EVALUABLE: 'No evaluable',
  INCOMPLETE_DATA: 'Datos incompletos',
};
const statusTone: Record<PveStatus, string> = {
  ELIGIBLE_PERFORMED: 'bg-green-100 text-green-800',
  ELIGIBLE_NOT_PERFORMED: 'bg-red-100 text-red-800',
  NOT_ELIGIBLE: 'bg-gray-100 text-gray-700',
  NOT_ASSESSED: 'bg-amber-100 text-amber-800',
  NOT_EVALUABLE: 'bg-gray-100 text-gray-700',
  INCOMPLETE_DATA: 'bg-amber-100 text-amber-800',
};
const missingLabels: Record<string, string> = {
  eligibilityAssessment: 'falta la evaluación de elegibilidad',
  notEligibleReason: 'falta el motivo de no elegibilidad',
  notEvaluableReason: 'falta el motivo de no evaluable',
  performanceRecord: 'falta registrar si se hizo la PVE',
  performedAt: 'falta la hora de la PVE',
  method: 'falta el método',
  notPerformedReason: 'falta el motivo de no realización',
  CONFLICT_PERFORMED_BUT_NOT_ELIGIBLE: 'PVE realizada en un paciente evaluado como no elegible',
};

const isoDay = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: isoDay(from), to: isoDay(to) };
};
const fmtDate = (s: string) => s.split('-').reverse().join('/');
const pct = (v: number | null) => (v === null ? '—' : `${String(v).replace('.', ',')} %`);

function Kpi({ title, value, detail, tone = 'text-blue-700' }: { title: string; value: string; detail: string; tone?: string }) {
  return (
    <Card>
      <div className="text-xs text-gray-500">{title}</div>
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{detail}</div>
    </Card>
  );
}

export function QualityShadowPage() {
  const { qualityIndicatorsV2, setQualityV2Enabled } = useApp();
  const [busy, setBusy] = useState(false);

  if (!qualityIndicatorsV2) {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <Header title="Calidad v2 · Modo sombra" />
        <CoordinatorNav />
        <main className="max-w-4xl mx-auto p-4 space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-gray-900">Desactivado</h2>
            <p className="text-sm text-gray-600 mt-2">
              Los indicadores de calidad v2 están apagados. El panel de calidad actual no cambia. Al activarlos se empiezan a copiar,
              desde la fecha de vigencia que definas, las decisiones de PVE al nuevo modelo para compararlas en modo sombra. No se
              reconstruye ni se reinterpreta ningún dato anterior.
            </p>
            <div className="mt-4">
              <Button
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm('¿Activar los indicadores de calidad v2 en modo sombra? No cambia el panel actual ni los reportes.')) return;
                  setBusy(true);
                  await confirmSave(() => setQualityV2Enabled(true), 'Modo sombra activado');
                  setBusy(false);
                }}
              >
                {busy ? 'Activando...' : 'Activar modo sombra'}
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }
  return <ShadowPanel onDisable={() => confirmSave(() => setQualityV2Enabled(false), 'Modo sombra apagado')} />;
}

function ShadowPanel({ onDisable }: { onDisable: () => Promise<boolean> }) {
  const [range, setRange] = useState(defaultRange);
  const [summary, setSummary] = useState<ShadowSummary | null>(null);
  const [rows, setRows] = useState<ShadowPatientDay[]>([]);
  const [defs, setDefs] = useState<DefinitionDTO[]>([]);
  const [filter, setFilter] = useState<PveStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<ShadowPatientDay | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, d] = await Promise.all([api.getShadowSummary(range.from, range.to), api.getShadowPatientDays(range.from, range.to, filter || undefined), api.getDefinitions()]);
      setSummary(s);
      setRows(r);
      setDefs(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el panel');
    } finally {
      setLoading(false);
    }
  }, [range, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const compliance = defs.find((d) => d.code === 'PVE-COMPLIANCE');

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="Calidad v2 · Modo sombra" />
      <CoordinatorNav />
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Modo sombra:</strong> estos números son de contraste. No reemplazan al panel de calidad actual ni alimentan reportes oficiales, pases o
          productividad.
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {compliance && <DefinitionCard def={compliance} onSaved={(m) => { notifySuccess(m); void load(); }} onError={setError} />}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="border-2 border-gray-200 rounded-lg px-2 py-1" />
          <span className="text-gray-400">a</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="border-2 border-gray-200 rounded-lg px-2 py-1" />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await api.consolidateNow();
                notifySuccess('Consolidación de hoy ejecutada', 'Antes de la hora de corte queda como provisional');
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'No se pudo consolidar');
              }
            }}
          >
            Consolidar hoy ahora
          </Button>
        </div>

        {loading && <p className="text-gray-500 text-sm">Cargando...</p>}

        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Kpi
                title="Cumplimiento de PVE (sombra)"
                value={pct(summary.compliance.percentage)}
                detail={`${summary.compliance.numerator} días-paciente con PVE realizada / ${summary.compliance.denominator} elegibles`}
              />
              <Kpi
                title="Completitud del registro"
                value={pct(summary.completeness.percentage)}
                detail={`${summary.completeness.complete} de ${summary.completeness.total} días-paciente en VMI con estado clasificable`}
                tone="text-emerald-700"
              />
            </div>
            <Card>
              <div className="text-sm font-bold text-gray-900 mb-2">Qué entra y qué queda afuera</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <Mini label="Numerador" value={summary.compliance.numerator} />
                <Mini label="Denominador" value={summary.compliance.denominator} />
                <Mini label="Excluidos (no elegibles / no evaluables)" value={summary.compliance.excluded} />
                <Mini label="Elegibles sin PVE" value={summary.compliance.eligibleNotPerformed} />
                <Mini label="Sin evaluar" value={summary.compliance.notAssessed} tone="text-amber-700" />
                <Mini label="Datos incompletos" value={summary.compliance.incompleteData} tone="text-amber-700" />
                <Mini label="Días-paciente en VMI" value={summary.compliance.totalPatientDays} />
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Fórmula: días-paciente elegibles con PVE realizada / total de días-paciente elegibles × 100. Una PVE realizada cuenta sin importar su resultado.
                Los días sin evaluación de elegibilidad no entran al denominador: se muestran como falta de completitud.
                Consolidación diaria a las {summary.institution.consolidationTime} ({summary.institution.timezone}).
              </p>
              {summary.notConsolidatedDays.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">Todavía sin consolidar: {summary.notConsolidatedDays.map(fmtDate).join(', ')}.</p>
              )}
            </Card>

            <Card>
              <div className="text-sm font-bold text-gray-900 mb-2">Por día</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs">
                      <th className="py-1 pr-2">Día</th>
                      <th className="py-1 px-2 text-center">Cumplimiento</th>
                      <th className="py-1 px-2 text-center">Num / Den</th>
                      <th className="py-1 px-2 text-center">Completitud</th>
                      <th className="py-1 px-2 text-center">Revisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byDay.map((d) => (
                      <tr key={d.date} className="border-t border-gray-100">
                        <td className="py-2 pr-2 font-medium">{fmtDate(d.date)}</td>
                        <td className="py-2 px-2 text-center">{pct(d.compliance.percentage)}</td>
                        <td className="py-2 px-2 text-center">{d.compliance.numerator} / {d.compliance.denominator}</td>
                        <td className="py-2 px-2 text-center">{pct(d.completeness.percentage)}</td>
                        <td className="py-2 px-2 text-center text-xs text-gray-600">{d.revision === null ? '—' : `#${d.revision}${d.provisional ? ' (provisoria)' : ''}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        <Card>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="text-sm font-bold text-gray-900">Pacientes que explican el resultado</div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as PveStatus | '')} className="border-2 border-gray-200 rounded-lg px-2 py-1 text-sm">
              <option value="">Todos los estados</option>
              {(Object.keys(statusLabels) as PveStatus[]).map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">Sin días consolidados en este período.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={`${r.clinicalDate}-${r.patientId}`} className="border border-gray-100 rounded-xl p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-semibold text-gray-900">
                      {fmtDate(r.clinicalDate)} · {r.alias ?? 'Paciente'}{r.bed ? ` · cama ${r.bed}` : ''}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusTone[r.status]}`}>{statusLabels[r.status]}</span>
                  </div>
                  {(r.reason || r.missingFields.length > 0) && (
                    <div className="text-xs text-gray-600 mt-1">
                      {r.reason && <span>Motivo: {r.reason}. </span>}
                      {r.missingFields.length > 0 && <span className="text-amber-700">{r.missingFields.map((m) => missingLabels[m] ?? m).join('; ')}.</span>}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {r.assessment ? `Elegibilidad ${r.assessment.eligibilityStatus} (${r.assessment.shift}${r.assessment.lateEntry ? ', carga tardía' : ''})` : 'Sin evaluación de elegibilidad'}
                    {r.performance ? ` · PVE ${r.performance.performed ? 'realizada' : 'no realizada'}${r.performance.method ? ` (${r.performance.method})` : ''}` : ''}
                    {` · rev. #${r.revision}`}
                  </div>
                  {(r.assessment || r.performance) && (
                    <button type="button" onClick={() => setCorrecting(r)} className="mt-2 text-xs font-semibold text-blue-700 underline underline-offset-2">
                      Corregir registro
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="text-right">
          <button
            type="button"
            className="text-xs text-gray-500 underline"
            onClick={async () => {
              if (window.confirm('¿Apagar los indicadores de calidad v2? Los datos ya copiados se conservan, pero dejan de actualizarse.')) await onDisable();
            }}
          >
            Apagar el modo sombra
          </button>
        </div>
      </main>

      {correcting && (
        <CorrectionDialog
          row={correcting}
          onClose={() => setCorrecting(null)}
          onDone={() => {
            setCorrecting(null);
            notifySuccess('Corrección registrada', 'Día recalculado; queda auditada');
            void load();
          }}
        />
      )}
    </div>
  );
}

function Mini({ label, value, tone = 'text-gray-900' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function DefinitionCard({ def, onSaved, onError }: { def: DefinitionDTO; onSaved: (msg: string) => void; onError: (msg: string) => void }) {
  const [status, setStatus] = useState<DefinitionDTO['status']>(def.status);
  const [from, setFrom] = useState(def.effectiveFrom ?? '');
  const [target, setTarget] = useState(def.targetValue === null ? '' : String(def.targetValue));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateDefinition(def.code, { status, effectiveFrom: from || null, targetValue: target === '' ? null : Number(target) });
      onSaved('Definición actualizada.');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="text-sm font-bold text-gray-900">{def.name} · v{def.version}</div>
      <p className="text-xs text-gray-600 mt-1">{def.formula}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-sm">
        <label className="block">
          <span className="text-xs text-gray-500">Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as DefinitionDTO['status'])} className="w-full border-2 border-gray-200 rounded-lg px-2 py-1">
            <option value="DRAFT">Borrador</option>
            <option value="SHADOW">Sombra</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Vigente desde (fecha clínica)</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-2 py-1" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Meta institucional (%)</span>
          <input type="number" min={0} max={100} value={target} onChange={(e) => setTarget(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-2 py-1" />
        </label>
      </div>
      <p className="text-xs text-gray-500 mt-2">No se reconstruye nada anterior a la fecha de vigencia. En esta fase el indicador solo puede estar en modo sombra.</p>
      <div className="mt-3">
        <Button variant="secondary" disabled={saving} onClick={save}>{saving ? 'Guardando...' : 'Guardar definición'}</Button>
      </div>
    </Card>
  );
}

function CorrectionDialog({ row, onClose, onDone }: { row: ShadowPatientDay; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [eligibility, setEligibility] = useState(row.assessment?.eligibilityStatus ?? 'ELIGIBLE');
  const [eligReason, setEligReason] = useState('');
  const [performed, setPerformed] = useState(row.performance?.performed ?? true);
  const [method, setMethod] = useState(row.performance?.method ?? '');
  const [notPerformedReason, setNotPerformedReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return setError('La corrección necesita un motivo.');
    setSaving(true);
    setError(null);
    try {
      if (row.assessment) {
        await api.correctAssessment(row.assessment.id, {
          reason: reason.trim(),
          eligibilityStatus: eligibility as 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NOT_EVALUABLE',
          notEligibleReason: eligibility === 'NOT_ELIGIBLE' ? eligReason.trim() || null : null,
          notEvaluableReason: eligibility === 'NOT_EVALUABLE' ? eligReason.trim() || null : null,
        });
      }
      if (row.performance) {
        await api.correctPerformance(row.performance.id, {
          reason: reason.trim(),
          performed,
          method: performed ? ((method || null) as 'psv' | 'cpap' | 't-piece' | null) : null,
          notPerformedReason: performed ? null : notPerformedReason.trim() || null,
        });
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo corregir');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900">Corregir registro</h3>
        <p className="text-xs text-gray-600">
          {fmtDate(row.clinicalDate)} · {row.alias ?? 'Paciente'}. El dato original no se borra: se agrega uno nuevo, queda auditado y el día se recalcula.
        </p>
        {row.assessment && (
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="text-xs text-gray-500">Elegibilidad</span>
              <select value={eligibility} onChange={(e) => setEligibility(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-2 py-1">
                <option value="ELIGIBLE">Elegible</option>
                <option value="NOT_ELIGIBLE">No elegible</option>
                <option value="NOT_EVALUABLE">No evaluable</option>
              </select>
            </label>
            {eligibility !== 'ELIGIBLE' && (
              <input value={eligReason} onChange={(e) => setEligReason(e.target.value)} placeholder="Motivo" className="w-full border-2 border-gray-200 rounded-lg px-2 py-1 text-sm" />
            )}
          </div>
        )}
        {row.performance && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={performed} onChange={(e) => setPerformed(e.target.checked)} /> PVE realizada
            </label>
            {performed ? (
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-2 py-1 text-sm">
                <option value="">Método…</option>
                <option value="psv">PSV</option>
                <option value="t-piece">Tubo en T</option>
              </select>
            ) : (
              <input value={notPerformedReason} onChange={(e) => setNotPerformedReason(e.target.value)} placeholder="Motivo de no realización" className="w-full border-2 border-gray-200 rounded-lg px-2 py-1 text-sm" />
            )}
          </div>
        )}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo de la corrección (obligatorio)" rows={2} className="w-full border-2 border-gray-200 rounded-lg px-2 py-1 text-sm" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Registrar corrección'}</Button>
        </div>
      </div>
    </div>
  );
}
