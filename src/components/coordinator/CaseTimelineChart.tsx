import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { CasePoint } from '../../utils/clinicalCase';

export interface CaseSeries {
  key: keyof CasePoint & string;
  label: string;
  color: string;
  /** Eje derecho (para dos magnitudes con escalas distintas en el mismo gráfico). */
  axis?: 'left' | 'right';
  /** Escalonado (parámetros programados) en vez de línea suave (valores medidos). */
  step?: boolean;
}

export interface CaseRefLine {
  value: number;
  label: string;
  color: string;
}

interface Props {
  title: string;
  subtitle?: string;
  unit?: string;
  points: CasePoint[];
  series: CaseSeries[];
  startMs: number;
  endMs: number;
  refLines?: CaseRefLine[];
  /** Decisiones ventilatorias: marcas verticales numeradas, iguales en todos los gráficos. */
  markers: { n: number; t: number }[];
  /** Con fechas reales (no anonimizado) el tooltip las muestra; si no, solo el día de VMI. */
  showDates: boolean;
}

const DAY_MS = 86_400_000;

export function CaseTimelineChart({ title, subtitle, unit, points, series, startMs, endMs, refLines, markers, showDates }: Props) {
  const hasAny = points.some((p) => series.some((s) => p[s.key] != null));
  const totalDays = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
  const stepDays = Math.max(1, Math.ceil(totalDays / 10));
  const ticks: number[] = [];
  for (let d = 0; d <= totalDays; d += stepDays) ticks.push(startMs + d * DAY_MS);
  const dayLabel = (ms: number) => `D${Math.max(1, Math.floor((ms - startMs) / DAY_MS) + 1)}`;
  const hasRight = series.some((s) => s.axis === 'right');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 break-inside-avoid">
      <div className="text-sm font-bold text-gray-900">
        {title}
        {unit && <span className="text-gray-400 font-normal ml-1">({unit})</span>}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mb-1">{subtitle}</div>}
      {!hasAny ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">Sin datos cargados</div>
      ) : (
        <div className="h-52 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} syncId="caso" margin={{ top: 14, right: hasRight ? 4 : 12, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline) / 0.22)" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[startMs, endMs]}
                ticks={ticks}
                tickFormatter={dayLabel}
                tick={{ fontSize: 11, fill: 'rgb(var(--c-gray-500))' }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'rgb(var(--c-gray-500))' }} width={40} domain={['auto', 'auto']} />
              {hasRight && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'rgb(var(--c-gray-500))' }} width={40} domain={['auto', 'auto']} />}
              <Tooltip
                labelFormatter={(ms) => {
                  const d = new Date(ms as number);
                  return `${dayLabel(ms as number)}${showDates ? ` · ${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''}`;
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8, background: 'rgb(var(--surface))', color: 'rgb(var(--c-gray-900))', border: '0.5px solid rgb(var(--hairline) / 0.3)' }}
              />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {refLines?.map((r) => (
                <ReferenceLine key={r.label} yAxisId="left" y={r.value} stroke={r.color} strokeDasharray="4 4" label={{ value: r.label, fontSize: 10, fill: r.color, position: 'insideTopRight' }} />
              ))}
              {markers.map((m) => (
                <ReferenceLine key={m.n} yAxisId="left" x={m.t} stroke="#9ca3af" strokeDasharray="2 3" label={{ value: String(m.n), position: 'top', fontSize: 10, fill: '#6b7280' }} />
              ))}
              {series.map((s) => (
                <Line
                  key={s.key}
                  yAxisId={s.axis ?? 'left'}
                  type={s.step ? 'stepAfter' : 'monotone'}
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
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
