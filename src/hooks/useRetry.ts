import { useEffect, useRef, RefObject } from 'react';
import { setRetryAlive } from '../utils/notify';

/**
 * "Reintentar" ligado a una pantalla: ejecuta la acción con los datos que la pantalla tiene en ese momento
 * (no una copia de cuando falló) y desaparece al salir de ella.
 */
export function useRetry(action: () => unknown): () => void {
  const latest = useRef(action);
  latest.current = action;
  const retry = useRef(() => {
    void latest.current();
  }).current;
  useEffect(() => {
    setRetryAlive(retry, true);
    return () => setRetryAlive(retry, false);
  }, [retry]);
  return retry;
}

/** Reintento de un formulario: lo vuelve a enviar tal como está en pantalla. */
export function useFormRetry(): { formRef: RefObject<HTMLFormElement>; retry: () => void } {
  const formRef = useRef<HTMLFormElement>(null);
  const retry = useRetry(() => submitForm(formRef.current));
  return { formRef, retry };
}

export function submitForm(form: HTMLFormElement | null | undefined) {
  if (!form) return;
  // requestSubmit no existe en iOS anteriores a la versión 16.
  if (form.requestSubmit) form.requestSubmit();
  else form.querySelector<HTMLButtonElement>('[type="submit"]')?.click();
}
