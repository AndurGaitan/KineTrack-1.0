import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { BottomNav } from '../../components/BottomNav';
import * as dashboardApi from '../../api/dashboardApi';
import { DashboardSummary } from '../../types';

type Preset = 'today' | 'week' | 'month';

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = toDateInputValue(now);
  const from = new Date(now);
  if (preset === 'today') {
    // from = to
  } else if (preset === 'week') {
    from.setDate(from.getDate() - 6);
  } else {
    from.setDate(1);
  }
  return { from: toDateInputValue(from), to };
}

function QICard({
  title,
  formula,
  result,
}: {
  title: string;
  formula: string;
  // Shape varies per QI (each has its own extra detail fields) — read generically
  // at render time rather than fighting TS's lack of structural Record assignability for named interfaces.
  result: object;
}) {
  const r = result as { calculable: boolean; percentage: number | null };
  const detailEntries = Object.entries(result).filter(
    (entry): entry is [string, number] => entry[0] !== 'calculable' && entry[0] !== 'percentage'
  );
  return (
    <Card>
      <div className="text-sm font-bold text-gray-900">{title}</div>
      <div className="text-xs text-gray-500 mt-1 mb-3">{formula}</div>
      {r.calculable ? (
        <div className="text-3xl font-bold text-blue-700">{r.percentage}%</div>
      ) : (
        <div className="text-lg font-bold text-gray-400">NO CALCULABLE</div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
        {detailEntries.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
            <span className="font-semibold text-gray-900">{v}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AchievementRow({ label, data }: { label: string; data: { total: number; exitosas: number; fallidas: number; pendientes: number } }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex gap-3 text-sm">
        <span className="text-green-700 font-semibold">{data.exitosas} ✓</span>
        <span className="text-red-600 font-semibold">{data.fallidas} ✗</span>
        <span className="text-gray-400">{data.pendientes} pend.</span>
      </div>
    </div>
  );
}

export function CoordinatorDashboardPage() {
  const [preset, setPreset] = useState<Preset>('week');
  const [range, setRange] = useState(() => rangeForPreset('week'));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    dashboardApi
      .getDashboardSummary(range.from, range.to)
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard'))
      .finally(() => setLoading(false));
  }, [range]);

  const presetButtons = useMemo(
    () => [
      { key: 'today' as const, label: 'Hoy' },
      { key: 'week' as const, label: 'Esta semana' },
      { key: 'month' as const, label: 'Este mes' },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="Panel de Coordinación" />
      <CoordinatorNav />

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {presetButtons.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPreset(p.key);
                  setRange(rangeForPreset(p.key));
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${preset === p.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm sm:ml-auto">
            <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="flex-1 min-w-0 border-2 border-gray-200 rounded-lg px-2 py-1" />
            <span className="text-gray-400">a</span>
            <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="flex-1 min-w-0 border-2 border-gray-200 rounded-lg px-2 py-1" />
          </div>
        </div>

        {loading && <p className="text-gray-500">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {summary && (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Productividad del equipo</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Card>
                  <div className="text-xs text-gray-500">Kinesio. Respiratoria</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.productivity.total.kinesioterapiaRespiratoria}</div>
                </Card>
                <Card>
                  <div className="text-xs text-gray-500">Kinesio. Motora</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.productivity.total.kinesioterapiaMotora}</div>
                </Card>
                <Card>
                  <div className="text-xs text-gray-500">Evaluaciones</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.productivity.total.evaluaciones}</div>
                </Card>
                <Card>
                  <div className="text-xs text-gray-500">Progresiones</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.productivity.total.progresiones}</div>
                </Card>
              </div>

              <Card>
                <div className="text-sm font-bold text-gray-900 mb-2">Por kinesiólogo</div>
                {summary.productivity.byUser.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin actividad en el período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 text-xs">
                          <th className="py-1 pr-2">Kinesiólogo</th>
                          <th className="py-1 px-2 text-center">Respiratoria</th>
                          <th className="py-1 px-2 text-center">Motora</th>
                          <th className="py-1 px-2 text-center">Evaluaciones</th>
                          <th className="py-1 px-2 text-center">Progresiones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.productivity.byUser.map((u) => (
                          <tr key={u.userId} className="border-t border-gray-100">
                            <td className="py-2 pr-2 font-medium text-gray-900">{u.userName}</td>
                            <td className="py-2 px-2 text-center">{u.kinesioterapiaRespiratoria}</td>
                            <td className="py-2 px-2 text-center">{u.kinesioterapiaMotora}</td>
                            <td className="py-2 px-2 text-center">{u.evaluaciones}</td>
                            <td className="py-2 px-2 text-center">{u.progresiones}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Logros</h2>
              <Card>
                <AchievementRow label="Extubación exitosa (programadas)" data={summary.achievements.extubacionExitosa} />
                <AchievementRow label="Destete de VNI" data={summary.achievements.desteteVniExitoso} />
                <AchievementRow label="Destete de HFNC" data={summary.achievements.desteteHfncExitoso} />
              </Card>
              <Card className="mt-3">
                <div className="text-sm font-bold text-gray-900 mb-2">
                  Pruebas de ventilación espontánea (PVE) — {summary.achievements.sbt.total} totales
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {(['psv', 'cpap', 't-piece'] as const).map((mode) => (
                    <div key={mode} className="bg-gray-50 rounded-lg p-2">
                      <div className="text-xs text-gray-500 uppercase">{mode}</div>
                      <div className="text-lg font-bold text-gray-900">{summary.achievements.sbt.byType[mode].total}</div>
                      <div className="text-xs text-green-700">{summary.achievements.sbt.byType[mode].exitosas} exitosas</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Indicadores de calidad</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QICard
                  title="QI-01 · PVE en días elegibles"
                  formula="días-paciente elegibles con ≥1 PVE / total días-paciente elegibles"
                  result={summary.qualityIndicators.qi01PveDiasElegibles}
                />
                <QICard
                  title="QI-02 · Reintubación ≤48h"
                  formula="reintubadas ≤48h / programadas con seguimiento completo"
                  result={summary.qualityIndicators.qi02Reintubacion48h}
                />
                <QICard
                  title="QI-03 · DAUCI"
                  formula="DAUCI confirmada / pacientes con VMI >7 días"
                  result={summary.qualityIndicators.qi03Dauci}
                />
                <QICard
                  title="QI-04 · Protocolos vigentes"
                  formula="protocolos vigentes / protocolos prioritarios (objetivo: 100%)"
                  result={summary.qualityIndicators.qi04ProtocolosVigentes}
                />
              </div>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
