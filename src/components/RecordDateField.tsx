import { useState } from 'react';
import type { RecordTimestampState } from '../hooks/useRecordTimestamp';
import { toLocalDateTimeInputValue } from '../utils/dateInput';

/**
 * "Fecha y hora del registro": permite cargar un registro de días anteriores.
 * Por defecto es ahora; si se cambia, el registro queda en ese momento.
 *
 * `compact`: en los formularios de carga rápida queda en una línea
 * ("Registro de ahora · Cambiar") y el campo aparece solo si se pide.
 */
export function RecordDateField({
  state,
  label = 'Fecha y hora del registro',
  compact = false,
}: {
  state: RecordTimestampState;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const retro = state.timestamp !== undefined && !state.isFuture && new Date(state.timestamp).getTime() < Date.now() - 10 * 60 * 1000;

  if (compact && !open && !retro && !state.isFuture) {
    return (
      <div className="flex items-center justify-between text-sm text-gray-600 px-1">
        <span>Registro de ahora</span>
        <button type="button" onClick={() => setOpen(true)} className="text-blue-700 font-medium underline min-h-[32px]">
          Cargar de otro momento
        </button>
      </div>
    );
  }

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
