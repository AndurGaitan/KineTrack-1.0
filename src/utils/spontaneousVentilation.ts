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

export const svInterruptionReasonLabels: Record<SVInterruptionReason, string> = {
  'trabajo-ventilatorio': 'Aumento del trabajo ventilatorio (mala mecánica ventilatoria)',
  'deterioro-sensorio': 'Deterioro del estado de conciencia',
  hipercapnia: 'Hipercapnia / acidosis',
  taquipnea: 'Taquipnea',
  desaturacion: 'Desaturación',
  fatiga: 'Fatiga',
  secreciones: 'Secreciones',
  agitacion: 'Agitación',
  'inestabilidad-hemodinamica': 'Inestabilidad hemodinámica',
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
