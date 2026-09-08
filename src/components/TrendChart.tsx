import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export interface TrendReferenceLine {
  value: number;
  label: string;
  color?: string;
}

export interface TrendChartPoint {
  timestampMs: number;
  [seriesKey: string]: number | null | undefined;
}

interface TrendChartProps {
  title: string;
  unit?: string;
  data: TrendChartPoint[];
  series: TrendSeries[];
  referenceLines?: TrendReferenceLine[];
}

function formatTick(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatTooltipLabel(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' - ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Small multiple line chart for a VMI trend (one or two series over real
 * elapsed time, not evenly-spaced categories — evaluations aren't taken at
 * regular intervals). Used by VMITrendsPage.
 */
export function TrendChart({ title, unit, data, series, referenceLines }: TrendChartProps) {
  const hasAnyValue = data.some((d) => series.some((s) => d[s.key] != null));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="text-sm font-bold text-gray-900 mb-1">
        {title}
        {unit && <span className="text-gray-400 font-normal ml-1">({unit})</span>}
      </div>
      {!hasAnyValue ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">Sin datos cargados</div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="timestampMs"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTick}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                minTickGap={40}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={36} />
              <Tooltip labelFormatter={(ms) => formatTooltipLabel(ms as number)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {referenceLines?.map((ref) => (
                <ReferenceLine
                  key={ref.label}
                  y={ref.value}
                  stroke={ref.color ?? '#ef4444'}
                  strokeDasharray="4 4"
                  label={{ value: ref.label, fontSize: 10, fill: ref.color ?? '#ef4444', position: 'insideTopRight' }}
                />
              ))}
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
