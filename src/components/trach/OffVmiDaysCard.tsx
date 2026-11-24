import { calendarDaysBetween, daysSpanText } from '../../utils/supportDays';
import type { SupportEpisode } from '../../types';

/**
 * Días de calendario desde que el paciente pasó a "Traqueostomía - respiración espontánea" (ya sin VMI).
 * No muestra nada si el episodio activo es de otro soporte.
 */
export function OffVmiDaysCard({ episode, now = new Date() }: { episode?: SupportEpisode; now?: Date }) {
  if (episode?.supportType !== 'traqueostomia') return null;
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
      <div className="text-xs text-indigo-700">Ventilación espontánea sin VMI</div>
      <div className="text-xl font-bold text-indigo-900">{daysSpanText(calendarDaysBetween(episode.startAt, now))}</div>
      <div className="text-xs text-indigo-700 mt-0.5">Desde {new Date(episode.startAt).toLocaleDateString('es-AR')}</div>
    </div>
  );
}
