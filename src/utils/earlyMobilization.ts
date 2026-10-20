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

/** "22 h" o "2 d 4 h": horas enteras, sin minutos (para textos de pase). */
function hoursText(ms: number): string {
  const totalHours = Math.max(1, Math.round(ms / 3600000));
  const d = Math.floor(totalHours / 24);
  const h = totalHours % 24;
  return d > 0 ? `${d} d${h > 0 ? ` ${h} h` : ''}` : `${totalHours} h`;
}

export interface EarlyMobilizationStatus {
  /** Texto corto listo para el pase: "iniciada a las 30 h de VMI", "pendiente, quedan 12 h", etc. */
  text: string;
  /** Sigue sin iniciarse (pendiente, vencida o en pausa por contraindicación). */
  pending: boolean;
}

/** Estado de la movilización precoz de un episodio de VMI, en una frase. */
export function earlyMobilizationStatus(
  episodeStartAt: string,
  start: { startedAt: string } | undefined,
  contraindications: { reason: string; startAt: string; endAt?: string }[],
  now: Date
): EarlyMobilizationStatus {
  const episodeStart = new Date(episodeStartAt);
  const relevant = contraindications.filter((c) => !c.endAt || new Date(c.endAt).getTime() > episodeStart.getTime());
  const deadline = mobilizationDeadline(episodeStart, relevant, now);

  if (start) {
    const startedAt = new Date(start.startedAt);
    const hours = Math.max(0, Math.round((startedAt.getTime() - episodeStart.getTime()) / 3600000));
    const inWindow = startedAt.getTime() <= deadline.getTime();
    return { text: `iniciada a las ${hours} h de VMI${inWindow ? '' : ' (fuera de las 72 h)'}`, pending: false };
  }

  const open = relevant.find((c) => !c.endAt);
  if (open) {
    return { text: `contraindicada (${mobilizationReasonLabel(open.reason)}), ventana de 72 h en pausa`, pending: true };
  }

  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs > 0) return { text: `pendiente, quedan ${hoursText(remainingMs)} de las 72 h`, pending: true };
  return { text: `sin iniciar, ventana de 72 h vencida hace ${hoursText(-remainingMs)}`, pending: true };
}
