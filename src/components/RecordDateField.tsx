import type { RecordTimestampState } from '../hooks/useRecordTimestamp';
import { toLocalDateTimeInputValue } from '../utils/dateInput';

/**
 * "Fecha y hora del registro": permite cargar un registro de días anteriores.
 * Por defecto es ahora; si se cambia, el registro queda en ese momento.
 */
export function RecordDateField({ state, label = 'Fecha y hora del registro' }: { state: RecordTimestampState; label?: string }) {
  const retro = state.timestamp !== undefined && !state.isFuture && new Date(state.timestamp).getTime() < Date.now() - 10 * 60 * 1000;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="datetime-local"
        value={state.value}
        max={toLocalDateTimeInputValue(new Date())}
        onChange={(e) => state.onChange(e.target.value)}
        className={`w-full min-h-[48px] px-3 text-base border-2 rounded-xl focus:outline-none ${
          state.isFuture ? 'border-red-400' : 'border-gray-300 focus:border-blue-600'
        }`}
      />
      {state.isFuture && <p className="text-sm text-red-600 mt-2">La fecha no puede ser posterior a ahora.</p>}
      {retro && (
        <p className="text-sm text-amber-700 mt-2">
          Registro retroactivo: se va a guardar con esta fecha, no con la de hoy.
        </p>
      )}
      {!retro && !state.isFuture && <p className="text-xs text-gray-500 mt-2">Dejala como está para registrar ahora, o elegí una fecha anterior para cargar un día atrasado.</p>}
    </div>
  );
}
