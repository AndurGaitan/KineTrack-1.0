/**
 * Ventana de movilización precoz: 72 h desde el inicio de la VMI, corrida por el
 * tiempo de contraindicación para movilizar (el reloj queda en pausa mientras
 * dura). Misma regla que `mobilizationDeadline` del backend (QI-05).
 */
export const MOBILIZATION_WINDOW_HOURS = 72;
const MOBILIZATION_WINDOW_MS = MOBILIZATION_WINDOW_HOURS * 60 * 60 * 1000;

export const mobilizationContraindicationReasons: { value: string; label: string }[] = [
  { value: 'inestabilidad-hemodinamica', label: 'Inestabilidad hemodinámica' },
  { value: 'sedacion-profunda', label: 'Sedación profunda' },
  { value: 'fio2-peep-altos', label: 'FiO₂ / PEEP altos' },
  { value: 'hipertension-endocraneana', label: 'Hipertensión endocraneana' },
  { value: 'lesion-que-lo-impide', label: 'Fractura o lesión que lo impide' },
  { value: 'otra', label: 'Otra' },
];

export function mobilizationReasonLabel(reason: string): string {
  return mobilizationContraindicationReasons.find((r) => r.value === reason)?.label ?? reason;
}

export function mobilizationDeadline(
  episodeStart: Date,
  contraindications: { startAt: string; endAt?: string }[],
  limit: Date
): Date {
  let deadline = episodeStart.getTime() + MOBILIZATION_WINDOW_MS;
  const sorted = contraindications
    .map((c) => ({ start: new Date(c.startAt).getTime(), end: c.endAt ? new Date(c.endAt).getTime() : null }))
    .filter((c) => c.end === null || c.end > episodeStart.getTime())
    .sort((a, b) => a.start - b.start);
  for (const c of sorted) {
    const start = Math.max(c.start, episodeStart.getTime());
    if (start >= deadline) break;
    const end = Math.min(c.end ?? limit.getTime(), limit.getTime());
    if (end > start) deadline += end - start;
  }
  return new Date(deadline);
}

/** "2 d 5 h", "5 h 10 min" o "40 min". */
export function formatSpan(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}
