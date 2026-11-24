import { useState } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { toLocalDateTimeInputValue } from '../utils/dateInput';
import type { AirwayType, Patient } from '../types';

const OPTIONS: { value: AirwayType; label: string }[] = [
  { value: 'tot', label: 'Tubo orotraqueal' },
  { value: 'traqueostomia', label: 'Traqueostomía' },
];

const chip = (active: boolean) =>
  `flex-1 px-3 py-3 rounded-xl text-sm font-semibold border transition-colors ${
    active ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'
  }`;

/**
 * Vía aérea del paciente, como una fila de la ficha: la traqueostomía es una interfaz (igual que el tubo
 * orotraqueal), no un soporte ventilatorio. Se cambia tocando la fila. Con traqueostomía se habilitan las
 * pruebas de ventilación espontánea.
 */
export function AirwayCard({ patient }: { patient: Patient }) {
  const { updatePatient } = useApp();
  const [open, setOpen] = useState(false);
  const today = toLocalDateTimeInputValue(new Date()).slice(0, 10);
  const dateValue = patient.tracheostomyDate ? toLocalDateTimeInputValue(new Date(patient.tracheostomyDate)).slice(0, 10) : '';
  const dayNumber = patient.tracheostomyDate ? Math.floor((Date.now() - new Date(patient.tracheostomyDate).getTime()) / (24 * 60 * 60 * 1000)) + 1 : undefined;

  const handleDate = (value: string) => {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    // Mediodía local: evita que la zona horaria corra la fecha un día.
    void updatePatient(patient.id, { tracheostomyDate: new Date(y, m - 1, d, 12).toISOString() });
  };

  const label = OPTIONS.find((o) => o.value === patient.airwayType)?.label ?? 'Sin indicar';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-5 py-4" aria-expanded={open}>
        <span className="text-sm text-gray-500">Vía aérea</span>
        <span className="text-base font-semibold text-gray-900 flex items-center gap-1">
          {label}
          {patient.airwayType === 'traqueostomia' && dayNumber !== undefined && dayNumber > 0 && <span className="font-normal text-gray-500"> · día {dayNumber}</span>}
          <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
          <div className="flex gap-2">
            {OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => patient.airwayType !== o.value && void updatePatient(patient.id, { airwayType: o.value })} className={chip(patient.airwayType === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
          {patient.airwayType === 'traqueostomia' && (
            <label className="block text-xs text-gray-600">
              Fecha de la traqueostomía (opcional)
              <input
                type="date"
                value={dateValue}
                max={today}
                onChange={(e) => handleDate(e.target.value)}
                className="block w-full mt-1 border border-gray-300 rounded-xl px-3 py-2 text-base bg-white"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
