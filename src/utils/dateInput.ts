/**
 * `yyyy-MM-ddTHH:mm` en hora LOCAL, tal como lo espera un
 * `<input type="datetime-local">`.
 *
 * Ojo: `date.toISOString().slice(0, 16)` es un error común acá — devuelve la
 * hora en UTC, pero el input la interpreta como hora local, así que el valor
 * por defecto queda corrido por el offset de la zona horaria (p. ej. 3 h en
 * Argentina). Usar siempre este helper para precargar un campo de fecha/hora.
 */
export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
