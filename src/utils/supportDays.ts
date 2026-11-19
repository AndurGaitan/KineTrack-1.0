/**
 * Días en un soporte, contados como días de calendario (fecha local), no como
 * horas corridas: un paciente que empezó ayer a la noche lleva "1 día" hoy a la
 * mañana. Todos los textos (evolución, pase, pantallas) usan esta única regla.
 */

/** Días de calendario entre dos instantes (fecha local, sin horas). Nunca negativo. */
export function calendarDaysBetween(startAt: string | Date, endAt: string | Date = new Date()): number {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const a = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const b = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

/** "hace 3 días" / "hace 1 día" / "desde hoy". */
export function daysAgoText(days: number): string {
  if (days <= 0) return 'desde hoy';
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

/** "3 días" / "1 día" / "menos de 1 día" (duración de un episodio ya cerrado o en curso). */
export function daysSpanText(days: number): string {
  if (days <= 0) return 'menos de 1 día';
  return `${days} ${days === 1 ? 'día' : 'días'}`;
}
