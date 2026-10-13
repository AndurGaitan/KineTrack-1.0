import { useState } from 'react';
import { toLocalDateTimeInputValue } from '../utils/dateInput';

/**
 * Fecha y hora de un registro que se carga a posteriori (retroactivo). El campo
 * arranca en "ahora"; `timestamp` solo trae un valor si el usuario lo cambió —
 * si no, queda `undefined` y el servidor pone el momento exacto del guardado.
 */
export function useRecordTimestamp() {
  const [value, setValue] = useState(() => toLocalDateTimeInputValue(new Date()));
  const [touched, setTouched] = useState(false);

  const parsed = touched && value ? new Date(value) : undefined;
  const valid = !!parsed && !Number.isNaN(parsed.getTime());

  return {
    value,
    onChange: (next: string) => {
      setValue(next);
      setTouched(true);
    },
    /** ISO para mandar a la API, o `undefined` = "ahora". */
    timestamp: valid ? parsed!.toISOString() : undefined,
    /** El usuario eligió una fecha posterior a ahora. */
    isFuture: valid && parsed!.getTime() > Date.now() + 60 * 1000,
  };
}

export type RecordTimestampState = ReturnType<typeof useRecordTimestamp>;
