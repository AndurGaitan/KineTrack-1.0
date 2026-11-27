/** Frecuencia de visita de los pacientes de sala y el listado de piso que se pega en WhatsApp. */
import type { Patient, Sector, VisitsPerWeek } from '../types';

export const visitOptions: VisitsPerWeek[] = [2, 3, 5];

export const isWardSector = (sector?: Sector) => sector?.type === 'sala';

/**
 * Todos los pacientes activos de sala, ordenados por habitación, tengan o no algo cargado hoy:
 * "Hab 107 A Pérez (3 x semana)". Sin frecuencia (pendiente de evaluar) va solo el nombre.
 */
export function buildWardList(sectors: Sector[], patients: Patient[], now: Date = new Date()) {
  const date = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const blocks = sectors
    .filter(isWardSector)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
    .map((sector) => ({
      sector,
      list: patients
        .filter((p) => p.status === 'active' && p.sectorId === sector.id)
        .sort((a, b) => (a.bedLabel ?? '').localeCompare(b.bedLabel ?? '', 'es', { numeric: true })),
    }))
    .filter((block) => block.list.length > 0);

  const text = blocks
    .map(({ sector, list }) => {
      const lines = list.map((p) => `Hab ${p.bedLabel ?? '—'} ${p.alias}${p.careFrequency ? ` (${p.careFrequency.timesPerWeek} x semana)` : ''}`);
      return [`*${sector.name.replace(/\*/g, '').trim().toUpperCase()} · Frecuencia kinésica* · ${date}`, '', ...lines].join('\n');
    })
    .join('\n\n');

  const all = blocks.flatMap((block) => block.list);
  return { text, total: all.length, pending: all.filter((p) => !p.careFrequency).length };
}
