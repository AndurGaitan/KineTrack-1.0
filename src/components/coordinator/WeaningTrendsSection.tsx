import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../ui/Card';
import * as dashboardApi from '../../api/dashboardApi';
import type { AirwayGroup, WeaningTests } from '../../types';
import { svInterruptionReasonLabels, formatSVHours } from '../../utils/spontaneousVentilation';
import {
  AIRWAY_GROUPS,
  Granularity,
  airwayGroupColors,
  airwayGroupLabels,
  buildBuckets,
  computePveSeries,
  computePveTotals,
  computeSvSeries,
  computeSvTotals,
  defaultGranularity,
  endOfLocalDay,
  parseLocalDate,
  startOfLocalDay,
  successRate,
} from '../../utils/weaningTrends';

const axisTick = { fontSize: 11, fill: '#6b7280' };
const tooltipStyle = { fontSize: 12, borderRadius: 8 };

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="text-sm font-bold text-gray-900">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mb-2">{subtitle}</div>}
      <div className="h-56 mt-2">{children}</div>
    </div>
  );
}

/**
 * Evolución en el tiempo de las pruebas de destete: PVE (SBT) comparando
 * traqueostomía vs tubo orotraqueal, y ventilación espontánea de los pacientes
 * traqueostomizados. Usa el rango de fechas del Panel de Coordinación.
 */
export function WeaningTrendsSection({ range }: { range: { from: string; to: string } }) {
  const rangeFrom = useMemo(() => startOfLocalDay(parseLocalDate(range.from) ?? new Date()), [range.from]);
  const rangeTo = useMemo(() => endOfLocalDay(parseLocalDate(range.to) ?? new Date()), [range.to]);
  const validRange = rangeTo.getTime() >= rangeFrom.getTime();

  const [data, setData] = useState<WeaningTests | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granularityOverride, setGranularityOverride] = useState<Granularity | null>(null);
  const granularity = granularityOverride ?? defaultGranularity(rangeFrom, rangeTo);

  useEffect(() => {
    if (!validRange) return;
    setLoading(true);
    setError(null);
    dashboardApi
      .getWeaningTests(rangeFrom.toISOString(), rangeTo.toISOString())
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el seguimiento de pruebas'))
      .finally(() => setLoading(false));
  }, [rangeFrom, rangeTo, validRange]);

  const buckets = useMemo(() => (validRange ? buildBuckets(rangeFrom, rangeTo, granularity) : []), [rangeFrom, rangeTo, granularity, validRange]);
  const pveSeries = useMemo(() => (data ? computePveSeries(data.pve, buckets) : []), [data, buckets]);
  const pveTotals = useMemo(() => (data ? computePveTotals(data.pve) : null), [data]);
  const svSeries = useMemo(() => (data ? computeSvSeries(data.ventilacionEspontanea, buckets, rangeFrom, rangeTo) : []), [data, buckets, rangeFrom, rangeTo]);
  const svTotals = useMemo(() => (data ? computeSvTotals(data.ventilacionEspontanea, rangeFrom, rangeTo) : null), [data, rangeFrom, rangeTo]);

  const countData = pveSeries.map((p) => ({
    label: p.bucket.label,
    traqueostomia: p.byAirway.traqueostomia.total,
    tot: p.byAirway.tot.total,
    'sin-indicar': p.byAirway['sin-indicar'].total,
  }));
  const rateData = pveSeries.map((p) => {
    const row: Record<string, number | string | null> = { label: p.bucket.label };
    for (const g of AIRWAY_GROUPS) {
      row[`rate_${g}`] = successRate(p.byAirway[g]);
      row[`n_${g}`] = p.byAirway[g].exitosas + p.byAirway[g].fallidas;
    }
    return row;
  });
  const hoursData = svSeries.map((s) => ({ label: s.bucket.label, hours: s.hours, periods: s.periods, notTolerated: s.notTolerated, patients: s.patients }));

  // Solo se dibujan los grupos con datos, para que "sin indicar" no ensucie el gráfico cuando no hay.
  const activeGroups = pveTotals ? AIRWAY_GROUPS.filter((g) => pveTotals[g].total > 0) : [];
  const sinIndicar = pveTotals?.['sin-indicar'].total ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Seguimiento de pruebas de destete</h2>
          <p className="text-xs text-gray-500">PVE y ventilación espontánea a lo largo del tiempo, por vía aérea.</p>
        </div>
        <div className="flex gap-2">
          {(['day', 'week'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularityOverride(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                granularity === g ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {g === 'day' ? 'Por día' : 'Por semana'}
            </button>
          ))}
        </div>
      </div>

      {!validRange && <p className="text-sm text-amber-700">La fecha "hasta" es anterior a "desde".</p>}
      {loading && <p className="text-sm text-gray-500">Cargando seguimiento...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && pveTotals && svTotals && validRange && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AIRWAY_GROUPS.map((g: AirwayGroup) => {
              const s = pveTotals[g];
              const rate = successRate(s);
              return (
                <Card key={g}>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: airwayGroupColors[g] }} />
                    {airwayGroupLabels[g]}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">PVE en el período</div>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-bold text-gray-900">{s.total}</div>
                    <div className="text-sm text-gray-600 pb-1">
                      <span className="text-green-700 font-semibold">{s.exitosas} exitosas</span> ·{' '}
                      <span className="text-red-600 font-semibold">{s.fallidas} fallidas</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{rate === null ? 'Sin pruebas con resultado' : `${rate}% de éxito`}</div>
                </Card>
              );
            })}
          </div>

          {sinIndicar > 0 && (
            <p className="text-xs text-amber-700">
              {sinIndicar} PVE sin vía aérea indicada. Se completa en la pantalla de VMI de cada paciente (tarjeta "Vía aérea").
            </p>
          )}

          {pveTotals.traqueostomia.total + pveTotals.tot.total + sinIndicar === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-500">No hay PVE registradas en este período.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard title="PVE en el tiempo" subtitle="Cantidad de pruebas por vía aérea">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis allowDecimals={false} tick={axisTick} width={36} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {activeGroups.map((g) => (
                      <Bar key={g} dataKey={g} name={airwayGroupLabels[g]} stackId="pve" fill={airwayGroupColors[g]} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="% de éxito de las PVE" subtitle="Solo períodos con pruebas que tienen resultado (en el detalle se ve la cantidad)">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rateData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis domain={[0, 100]} unit="%" tick={axisTick} width={44} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, item) => {
                        const nKey = String(item?.dataKey ?? '').replace('rate_', 'n_');
                        return [`${value}% (${item?.payload?.[nKey] ?? 0} con resultado)`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {activeGroups.map((g) => (
                      <Line
                        key={g}
                        type="linear"
                        dataKey={`rate_${g}`}
                        name={airwayGroupLabels[g]}
                        stroke={airwayGroupColors[g]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <Card>
            <div className="text-sm font-bold text-gray-900">Traqueostomía · ventilación espontánea</div>
            <div className="text-xs text-gray-500 mb-3">Períodos fuera del ventilador o con asistencia mínima registrados en pacientes traqueostomizados en VMI.</div>

            {svTotals.periods === 0 ? (
              <p className="text-sm text-gray-500">No hay períodos de ventilación espontánea registrados en este período.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="text-xs text-gray-600">Horas totales</div>
                    <div className="text-xl font-bold text-blue-900">{formatSVHours(svTotals.hours)} h</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-600">Pacientes</div>
                    <div className="text-xl font-bold text-gray-900">{svTotals.patients}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-600">Períodos</div>
                    <div className="text-xl font-bold text-gray-900">{svTotals.periods}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-600">Toleradas</div>
                    <div className="text-xl font-bold text-gray-900">{svTotals.toleratedPct === null ? '—' : `${svTotals.toleratedPct}%`}</div>
                  </div>
                </div>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={16} />
                      <YAxis tick={axisTick} width={44} unit=" h" />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, _name, item) => [
                          `${value} h · ${item?.payload?.periods ?? 0} períodos · ${item?.payload?.patients ?? 0} pacientes${item?.payload?.notTolerated ? ` · ${item.payload.notTolerated} no tolerados` : ''}`,
                          'Ventilación espontánea',
                        ]}
                      />
                      <Bar dataKey="hours" name="Horas" fill={airwayGroupColors.traqueostomia} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {svTotals.reasons.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Motivos de interrupción</div>
                    <div className="flex flex-wrap gap-2">
                      {svTotals.reasons.map((r) => (
                        <span key={r.reason} className="text-xs bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg">
                          {svInterruptionReasonLabels[r.reason]} · {r.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
