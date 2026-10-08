/**
 * Seguimiento longitudinal de pruebas de destete para el panel de coordinación.
 * Funciones puras: agrupan por día o semana (hora local) las PVE y los períodos
 * de ventilación espontánea que devuelve `/dashboard/weaning-tests`.
 */
import type { AirwayGroup, PveRow, SpontaneousVentilationPeriod, SVInterruptionReason } from '../types';
import { svHoursInRange } from './spontaneousVentilation';

export type Granularity = 'day' | 'week';

export const AIRWAY_GROUPS: AirwayGroup[] = ['traqueostomia', 'tot', 'sin-indicar'];

export const airwayGroupLabels: Record<AirwayGroup, string> = {
  traqueostomia: 'Traqueostomía',
  tot: 'Tubo orotraqueal',
  'sin-indicar': 'Sin indicar',
};

export const airwayGroupColors: Record<AirwayGroup, string> = {
  traqueostomia: '#6366f1',
  tot: '#0ea5e9',
  'sin-indicar': '#9ca3af',
};

export interface TrendBucket {
  key: string;
  /** "6/10" */
  label: string;
  from: Date;
  /** Exclusivo. */
  to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BUCKETS = 120;

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** "YYYY-MM-DD" → medianoche local de ese día. */
export function parseLocalDate(value: string): Date | undefined {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
}

/** Lunes de la semana de `d` (hora local). */
function startOfLocalWeek(d: Date): Date {
  const day = startOfLocalDay(d);
  const offset = (day.getDay() + 6) % 7; // lunes = 0
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - offset);
}

function labelFor(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Elige día o semana según el largo del rango (día hasta 31 días). */
export function defaultGranularity(rangeFrom: Date, rangeTo: Date): Granularity {
  return (rangeTo.getTime() - rangeFrom.getTime()) / DAY_MS <= 31 ? 'day' : 'week';
}

export function buildBuckets(rangeFrom: Date, rangeTo: Date, granularity: Granularity): TrendBucket[] {
  const buckets: TrendBucket[] = [];
  let cursor = granularity === 'week' ? startOfLocalWeek(rangeFrom) : startOfLocalDay(rangeFrom);
  const step = granularity === 'week' ? 7 : 1;
  while (cursor.getTime() <= rangeTo.getTime() && buckets.length < MAX_BUCKETS) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + step);
    buckets.push({ key: `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`, label: labelFor(cursor), from: cursor, to: next });
    cursor = next;
  }
  return buckets;
}

// --- PVE ---------------------------------------------------------------

export interface PveStats {
  total: number;
  exitosas: number;
  fallidas: number;
  sinResultado: number;
}

const emptyPve = (): PveStats => ({ total: 0, exitosas: 0, fallidas: 0, sinResultado: 0 });

function addPve(stats: PveStats, row: PveRow) {
  stats.total += 1;
  if (row.sbtResult === 'success') stats.exitosas += 1;
  else if (row.sbtResult === 'failure') stats.fallidas += 1;
  else stats.sinResultado += 1;
}

/** % de éxito sobre las pruebas que tienen resultado; null si ninguna lo tiene. */
export function successRate(stats: PveStats): number | null {
  const evaluated = stats.exitosas + stats.fallidas;
  return evaluated > 0 ? Math.round((stats.exitosas / evaluated) * 100) : null;
}

export interface PveSeriesPoint {
  bucket: TrendBucket;
  byAirway: Record<AirwayGroup, PveStats>;
}

export function computePveSeries(rows: PveRow[], buckets: TrendBucket[]): PveSeriesPoint[] {
  return buckets.map((bucket) => {
    const byAirway: Record<AirwayGroup, PveStats> = { traqueostomia: emptyPve(), tot: emptyPve(), 'sin-indicar': emptyPve() };
    for (const row of rows) {
      const t = new Date(row.timestamp).getTime();
      if (t >= bucket.from.getTime() && t < bucket.to.getTime()) addPve(byAirway[row.airway], row);
    }
    return { bucket, byAirway };
  });
}

export function computePveTotals(rows: PveRow[]): Record<AirwayGroup, PveStats> {
  const totals: Record<AirwayGroup, PveStats> = { traqueostomia: emptyPve(), tot: emptyPve(), 'sin-indicar': emptyPve() };
  for (const row of rows) addPve(totals[row.airway], row);
  return totals;
}

// --- Ventilación espontánea (traqueostomía) ------------------------------

export interface SvBucketStats {
  bucket: TrendBucket;
  hours: number;
  periods: number;
  notTolerated: number;
  patients: number;
}

export function computeSvSeries(
  periods: SpontaneousVentilationPeriod[],
  buckets: TrendBucket[],
  rangeFrom: Date,
  rangeTo: Date,
  now: Date = new Date()
): SvBucketStats[] {
  return buckets.map((bucket) => {
    // El bucket (sobre todo el semanal) puede salirse del rango elegido: se recorta.
    const from = new Date(Math.max(bucket.from.getTime(), rangeFrom.getTime()));
    const to = new Date(Math.min(bucket.to.getTime(), rangeTo.getTime()));
    const inBucket = periods.filter((p) => svHoursInRange([p], from, to, now) > 0);
    return {
      bucket,
      hours: Math.round(svHoursInRange(periods, from, to, now) * 10) / 10,
      periods: inBucket.length,
      notTolerated: inBucket.filter((p) => p.tolerated === false).length,
      patients: new Set(inBucket.map((p) => p.patientId)).size,
    };
  });
}

export interface SvTotals {
  hours: number;
  periods: number;
  patients: number;
  tolerated: number;
  notTolerated: number;
  /** % de períodos tolerados sobre los que tienen la tolerancia indicada; null si ninguno. */
  toleratedPct: number | null;
  reasons: { reason: SVInterruptionReason; count: number }[];
}

export function computeSvTotals(periods: SpontaneousVentilationPeriod[], rangeFrom: Date, rangeTo: Date, now: Date = new Date()): SvTotals {
  const inRange = periods.filter((p) => svHoursInRange([p], rangeFrom, rangeTo, now) > 0);
  const tolerated = inRange.filter((p) => p.tolerated === true).length;
  const notTolerated = inRange.filter((p) => p.tolerated === false).length;
  const reasonCounts = new Map<SVInterruptionReason, number>();
  for (const p of inRange) {
    if (p.tolerated === false && p.interruptionReason) reasonCounts.set(p.interruptionReason, (reasonCounts.get(p.interruptionReason) ?? 0) + 1);
  }
  return {
    hours: Math.round(svHoursInRange(inRange, rangeFrom, rangeTo, now) * 10) / 10,
    periods: inRange.length,
    patients: new Set(inRange.map((p) => p.patientId)).size,
    tolerated,
    notTolerated,
    toleratedPct: tolerated + notTolerated > 0 ? Math.round((tolerated / (tolerated + notTolerated)) * 100) : null,
    reasons: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}
