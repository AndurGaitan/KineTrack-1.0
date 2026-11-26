import { ago } from '../domain/services/trachDecannulation';

/** Aviso de que el formulario viene con los datos del último registro. */
export function PrefillNotice({ timestamp, highlight = false }: { timestamp: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-900 ${highlight ? 'kt-flash' : ''}`}>
      Precargado con el último registro ({ago(timestamp, new Date())}). Cambiá solo lo que varió y guardá.
    </div>
  );
}
