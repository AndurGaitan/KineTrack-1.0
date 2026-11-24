import type { SpontaneousVentilationPeriod, SVInterruptionReason, SVModality } from '../types';

const HOUR_MS = 60 * 60 * 1000;

export const svModalityLabels: Record<SVModality, string> = {
  'hme-o2': 'Filtro HME con O₂',
  'tubo-t': 'Tubo en T',
  ventilador: 'Desde el ventilador (CPAP / PS bajo)',
  // Registros viejos: ya no se ofrecen al cargar, pero se siguen leyendo.
  'aire-ambiente': 'Aire ambiente / humidificación',
  oxigeno: 'Oxígeno (collar / máscara traqueal)',
};

/** Versión corta para el texto de la evolución. */
export const svModalityShortLabels: Record<SVModality, string> = {
  'hme-o2': 'filtro HME con O₂',
  'tubo-t': 'tubo en T',
  ventilador: 'desde el ventilador',
  'aire-ambiente': 'aire ambiente',
  oxigeno: 'oxígeno',
};

/** Dispositivos que se ofrecen al cargar un período (los viejos solo se leen). */
export const svModalityOptions = (['hme-o2', 'tubo-t', 'ventilador'] as SVModality[]).map((value) => ({ value, label: svModalityLabels[value] }));

/** Un período viejo (aire ambiente / oxígeno) se precarga como filtro HME con O₂. */
export function currentSVModality(m: SVModality | undefined): SVModality {
  return m && svModalityOptions.some((o) => o.value === m) ? m : 'hme-o2';
}

// El orden es el de los botones: primero los motivos más frecuentes de suspensión.
export const svInterruptionReasonLabels: Record<SVInterruptionReason, string> = {
  'trabajo-ventilatorio': 'Aumento del trabajo ventilatorio (mala mecánica ventilatoria)',
  taquipnea: 'Taquipnea',
  desaturacion: 'Desaturación',
  fatiga: 'Fatiga',
  secreciones: 'Secreciones',
  agitacion: 'Agitación',
  'inestabilidad-hemodinamica': 'Inestabilidad hemodinámica',
  'deterioro-sensorio': 'Deterioro del estado de conciencia',
  hipercapnia: 'Hipercapnia / acidosis',
  otro: 'Otro',
};

export const svInterruptionReasonOptions = (Object.keys(svInterruptionReasonLabels) as SVInterruptionReason[]).map((value) => ({
  value,
  label: svInterruptionReasonLabels[value],
}));

/** "3" / "2,5" — una decimal como máximo, coma decimal. */
export function formatSVHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return String(rounded).replace('.', ',');
}

/**
 * Tiempo con su unidad: la tolerancia cambia de un día a otro (minutos, horas o nada), así que por debajo
 * de la hora se muestra en minutos ("20 min") y de ahí en adelante en horas ("2,5 h"). 0 → "0 min".
 */
export function formatSVDuration(hours: number): string {
  const minutes = Math.round(hours * 60);
  return minutes >= 60 ? `${formatSVHours(minutes / 60)} h` : `${minutes} min`;
}

/** Tiempo transcurrido como lo lee un kinesiólogo: "45 min", "2 h", "1 h 12 min". */
export function formatSVElapsed(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function overlapHours(period: SpontaneousVentilationPeriod, from: Date, to: Date, now: Date): number {
  const start = new Date(period.startAt).getTime();
  const end = period.endAt ? new Date(period.endAt).getTime() : now.getTime();
  const lo = Math.max(start, from.getTime());
  const hi = Math.min(end, to.getTime(), now.getTime());
  return hi > lo ? (hi - lo) / HOUR_MS : 0;
}

/** Horas de ventilación espontánea dentro de un rango (un período en curso cuenta hasta "ahora"). */
export function svHoursInRange(periods: SpontaneousVentilationPeriod[], from: Date, to: Date, now: Date = new Date()): number {
  return periods.reduce((sum, p) => sum + overlapHours(p, from, to, now), 0);
}

export interface SVDay {
  /** Día local, YYYY-MM-DD. */
  date: string;
  /** "lun 6/10" */
  label: string;
  hours: number;
  periods: number;
  tolerated: number;
  notTolerated: number;
}

export interface SVSummary {
  active?: SpontaneousVentilationPeriod;
  hoursLast24h: number;
  /** Últimos 7 días (hoy incluido), del más viejo al más nuevo. */
  days: SVDay[];
}

/** Una prueba que lleva más de esto abierta casi seguro quedó sin cerrar (las pruebas duran de minutos a pocas horas). */
export const STALE_OPEN_PERIOD_HOURS = 8;

/** Horas que lleva abierta una prueba en curso (0 si ya terminó). */
export function openPeriodHours(period: SpontaneousVentilationPeriod | undefined, now: Date = new Date()): number {
  if (!period || period.endAt) return 0;
  return Math.max(0, (now.getTime() - new Date(period.startAt).getTime()) / HOUR_MS);
}

export function isStaleOpenPeriod(period: SpontaneousVentilationPeriod | undefined, now: Date = new Date()): boolean {
  return openPeriodHours(period, now) >= STALE_OPEN_PERIOD_HOURS;
}

function localDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Seguimiento longitudinal a partir de los períodos documentados: horas de las
 * últimas 24 h y horas / cantidad / no tolerados de cada uno de los últimos 7
 * días (un período que cruza la medianoche se reparte entre los días).
 */
export function computeSpontaneousVentilationSummary(periods: SpontaneousVentilationPeriod[], now: Date = new Date()): SVSummary {
  const active = periods.find((p) => !p.endAt);
  const hoursLast24h = svHoursInRange(periods, new Date(now.getTime() - 24 * HOUR_MS), now, now);

  const days: SVDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const nextDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const key = localDayKey(dayStart);
    const overlapping = periods.filter((p) => overlapHours(p, dayStart, nextDayStart, now) > 0);
    days.push({
      date: key,
      label: `${dayStart.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')} ${dayStart.getDate()}/${dayStart.getMonth() + 1}`,
      hours: Math.round(svHoursInRange(periods, dayStart, nextDayStart, now) * 1000) / 1000,
      periods: overlapping.length,
      tolerated: overlapping.filter((p) => p.tolerated === true && localDayKey(new Date(p.startAt)) === key).length,
      notTolerated: overlapping.filter((p) => p.tolerated === false && localDayKey(new Date(p.startAt)) === key).length,
    });
  }

  return { active, hoursLast24h: Math.round(hoursLast24h * 1000) / 1000, days };
}

export interface SVDayMinutes {
  /** Día local, YYYY-MM-DD. */
  date: string;
  /** "6/10" */
  label: string;
  /** Minutos de pruebas que terminaron. */
  ok: number;
  /** Minutos de pruebas que se interrumpieron. */
  stopped: number;
  /** Minutos de pruebas sin resultado cargado. */
  other: number;
}

/**
 * Minutos de ventilación espontánea por día, para el seguimiento longitudinal del coordinador. Una prueba que cruza la
 * medianoche se reparte entre los días; el resultado de cada prueba decide en qué serie cuenta. Desde el día de la
 * primera prueba (como mucho `maxDays` días hacia atrás) hasta hoy; los días sin pruebas quedan en cero.
 */
export function dailySVMinutes(periods: SpontaneousVentilationPeriod[], now: Date = new Date(), maxDays = 45): SVDayMinutes[] {
  if (periods.length === 0) return [];
  const first = Math.min(...periods.map((p) => new Date(p.startAt).getTime()));
  const firstDay = new Date(new Date(first).getFullYear(), new Date(first).getMonth(), new Date(first).getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const spanDays = Math.min(maxDays, Math.round((today.getTime() - firstDay.getTime()) / (24 * HOUR_MS)) + 1);
  const days: SVDayMinutes[] = [];
  for (let i = spanDays - 1; i >= 0; i--) {
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i + 1);
    const row: SVDayMinutes = { date: localDayKey(from), label: `${from.getDate()}/${from.getMonth() + 1}`, ok: 0, stopped: 0, other: 0 };
    for (const p of periods) {
      const minutes = overlapHours(p, from, to, now) * 60;
      if (minutes <= 0) continue;
      if (p.tolerated === true) row.ok += minutes;
      else if (p.tolerated === false) row.stopped += minutes;
      else row.other += minutes;
    }
    row.ok = Math.round(row.ok);
    row.stopped = Math.round(row.stopped);
    row.other = Math.round(row.other);
    days.push(row);
  }
  return days;
}
