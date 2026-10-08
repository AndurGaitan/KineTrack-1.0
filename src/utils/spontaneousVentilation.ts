import type { SpontaneousVentilationPeriod, SVInterruptionReason, SVModality } from '../types';

const HOUR_MS = 60 * 60 * 1000;

export const svModalityLabels: Record<SVModality, string> = {
  'aire-ambiente': 'Aire ambiente / humidificación',
  oxigeno: 'Oxígeno (collar / máscara traqueal)',
  ventilador: 'Desde el ventilador (CPAP / PS bajo)',
};

/** Versión corta para el texto de la evolución. */
export const svModalityShortLabels: Record<SVModality, string> = {
  'aire-ambiente': 'aire ambiente',
  oxigeno: 'oxígeno',
  ventilador: 'desde el ventilador',
};

export const svModalityOptions = (Object.keys(svModalityLabels) as SVModality[]).map((value) => ({ value, label: svModalityLabels[value] }));

export const svInterruptionReasonLabels: Record<SVInterruptionReason, string> = {
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
  notTolerated: number;
}

export interface SVSummary {
  active?: SpontaneousVentilationPeriod;
  hoursLast24h: number;
  /** Últimos 7 días (hoy incluido), del más viejo al más nuevo. */
  days: SVDay[];
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
      hours: Math.round(svHoursInRange(periods, dayStart, nextDayStart, now) * 10) / 10,
      periods: overlapping.length,
      notTolerated: overlapping.filter((p) => p.tolerated === false && localDayKey(new Date(p.startAt)) === key).length,
    });
  }

  return { active, hoursLast24h: Math.round(hoursLast24h * 10) / 10, days };
}
