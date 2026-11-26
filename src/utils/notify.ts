/**
 * Avisos de confirmación de toda la app. Viven fuera de React para que sobrevivan al cambio de pantalla
 * (se guarda, se navega y el aviso sigue a la vista) y para poder emitirlos desde cualquier lugar.
 * Los dibuja <Toaster />.
 */
export interface NoticeAction {
  label: string;
  run: () => void;
}

export interface Notice {
  id: number;
  kind: 'success' | 'error';
  message: string;
  detail?: string;
  action?: NoticeAction;
}

const SUCCESS_MS = 3500;
/** Con un botón (Deshacer) hace falta más tiempo para alcanzarlo. */
const SUCCESS_WITH_ACTION_MS = 8000;
const MAX_ERRORS = 3;

let notices: Notice[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function publish(next: Notice[]) {
  for (const old of notices) {
    if (next.some((n) => n.id === old.id)) continue;
    clearTimeout(timers.get(old.id));
    timers.delete(old.id);
  }
  notices = next;
  listeners.forEach((listener) => listener());
}

export const getNotices = () => notices;

export function subscribeNotices(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissNotice(id: number) {
  publish(notices.filter((n) => n.id !== id));
}

export function clearNotices() {
  publish([]);
}

/** Confirmación breve. Solo hay una a la vista: la nueva reemplaza a la anterior (los errores quedan). */
export function notifySuccess(message: string, detail?: string, action?: NoticeAction) {
  const id = nextId++;
  publish([...notices.filter((n) => n.kind === 'error'), { id, kind: 'success', message, detail, action }]);
  timers.set(id, setTimeout(() => dismissNotice(id), action ? SUCCESS_WITH_ACTION_MS : SUCCESS_MS));
}

function errorDetail(error: unknown): string | undefined {
  // fetch lanza TypeError cuando no hubo respuesta: no se sabe si el servidor llegó a guardar.
  if (error instanceof TypeError) return 'Sin conexión con el servidor. Revisá que no haya quedado guardado antes de repetirlo.';
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : undefined;
}

/** Falla: queda a la vista hasta que se cierre o se reintente. */
export function notifyError(message: string, error?: unknown) {
  const detail = errorDetail(error);
  const others = notices.filter((n) => !(n.kind === 'error' && n.message === message && n.detail === detail));
  const errors = others.filter((n) => n.kind === 'error').slice(-(MAX_ERRORS - 1));
  publish([...others.filter((n) => n.kind === 'success'), ...errors, { id: nextId++, kind: 'error', message, detail }]);
}

/**
 * Agrega "Reintentar" al último error que todavía no lo tiene. Se llama apenas vuelve un guardado fallido,
 * desde la pantalla que sabe cómo repetirlo.
 */
export function offerRetry(run: () => void) {
  // Si la pantalla que sabía repetirlo ya no está, queda el error sin botón.
  if (retired.has(run)) return;
  const target = [...notices].reverse().find((n) => n.kind === 'error' && !n.action);
  if (!target) return;
  publish(notices.map((n) => (n.id === target.id ? { ...n, action: { label: 'Reintentar', run } } : n)));
}

/** Retira los avisos cuyo botón ejecuta `run` (porque se repite la acción o se salió de la pantalla). */
export function dismissRetry(run: () => void) {
  if (notices.some((n) => n.action?.run === run)) publish(notices.filter((n) => n.action?.run !== run));
}

const retired = new WeakSet<() => void>();

/** Marca si la pantalla dueña de un reintento sigue abierta (lo maneja useRetry). */
export function setRetryAlive(run: () => void, alive: boolean) {
  if (alive) {
    retired.delete(run);
    return;
  }
  retired.add(run);
  dismissRetry(run);
}

/** Guardado de un toque a través del contexto (que ya avisa el error): confirma o permite repetirlo. */
export async function confirmSave(task: () => Promise<boolean>, success: string, detail?: string): Promise<boolean> {
  if (await task()) {
    notifySuccess(success, detail);
    return true;
  }
  offerRetry(() => void confirmSave(task, success, detail));
  return false;
}

/**
 * Para guardados directos contra la API desde una pantalla (sin pasar por el contexto): avisa el resultado
 * y, si falla, permite repetir exactamente la misma operación.
 */
export async function attempt(
  task: () => Promise<unknown>,
  texts: { success: string; detail?: string; failure: string }
): Promise<boolean> {
  try {
    await task();
    notifySuccess(texts.success, texts.detail);
    return true;
  } catch (error) {
    notifyError(texts.failure, error);
    offerRetry(() => void attempt(task, texts));
    return false;
  }
}
