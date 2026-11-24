import { calendarDaysBetween } from './supportDays';

/**
 * Días desde que el paciente salió de la VMI, deducidos del historial de soportes (el episodio de VMI se cierra
 * cuando cambia el soporte): sin registrar nada aparte. Son días de calendario, como el resto de la app.
 * Solo aplica si hoy no está en VMI. Si lo reconectan a la VMI, deja de aplicar; al volver a salir, cuenta de nuevo.
 */
export interface VmiOff {
  /** Días de calendario desde que terminó la última VMI. */
  days: number;
  /** Cuándo terminó la última VMI (ISO). */
  endedAt: string;
}

/** Fin de la última VMI del paciente, o undefined si hoy está en VMI o no tuvo una VMI cerrada. */
export function lastVmiEnd(episodes: { supportType: string; endAt?: string }[], currentSupport: string): string | undefined {
  if (currentSupport === 'imv') return undefined;
  if (episodes.some((e) => e.supportType === 'imv' && !e.endAt)) return undefined;
  let best: string | undefined;
  for (const e of episodes) {
    if (e.supportType === 'imv' && e.endAt && (!best || new Date(e.endAt) > new Date(best))) best = e.endAt;
  }
  return best;
}

/** `maxDays`: pasado ese tiempo ya no se informa en el pase ni en la evolución (como la VMNI, 7 días). */
export function daysSinceVmiEnded(
  episodes: { supportType: string; endAt?: string }[],
  currentSupport: string,
  now: Date = new Date(),
  maxDays = 7
): VmiOff | undefined {
  const endedAt = lastVmiEnd(episodes, currentSupport);
  if (!endedAt) return undefined;
  const days = calendarDaysBetween(endedAt, now);
  return days >= 0 && days <= maxDays ? { days, endedAt } : undefined;
}

/** "sáb 21/11" / "sábado 21/11" */
export function dayWithWeekday(iso: string, long = false): string {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('es-AR', { weekday: long ? 'long' : 'short' }).replace('.', '');
  return `${wd} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
