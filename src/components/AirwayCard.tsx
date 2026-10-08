import { Card } from './ui/Card';
import { useApp } from '../contexts/AppContext';
import { toLocalDateTimeInputValue } from '../utils/dateInput';
import type { AirwayType, Patient } from '../types';

const OPTIONS: { value: AirwayType; label: string }[] = [
  { value: 'tot', label: 'Tubo orotraqueal' },
  { value: 'traqueostomia', label: 'Traqueostomía' },
];

const chip = (active: boolean) =>
  `flex-1 px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
    active ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'
  }`;

/**
 * Vía aérea del paciente en VMI. Con traqueostomía se habilita el registro de
 * períodos de ventilación espontánea (el tubo orotraqueal no los alterna).
 */
export function AirwayCard({ patient }: { patient: Patient }) {
  const { updatePatient } = useApp();
  const today = toLocalDateTimeInputValue(new Date()).slice(0, 10);
  const dateValue = patient.tracheostomyDate ? toLocalDateTimeInputValue(new Date(patient.tracheostomyDate)).slice(0, 10) : '';
  const dayNumber = patient.tracheostomyDate
    ? Math.floor((Date.now() - new Date(patient.tracheostomyDate).getTime()) / (24 * 60 * 60 * 1000)) + 1
    : undefined;

  const handleDate = (value: string) => {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    // Mediodía local: evita que la zona horaria corra la fecha un día.
    void updatePatient(patient.id, { tracheostomyDate: new Date(y, m - 1, d, 12).toISOString() });
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">Vía aérea</h3>
        {patient.airwayType === 'traqueostomia' && dayNumber !== undefined && dayNumber > 0 && (
          <span className="text-xs text-gray-500">Día {dayNumber} de traqueostomía</span>
        )}
      </div>

      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button key={o.value} type="button" onClick={() => patient.airwayType !== o.value && void updatePatient(patient.id, { airwayType: o.value })} className={chip(patient.airwayType === o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {!patient.airwayType && <p className="text-xs text-gray-500 mt-2">Sin indicar. Con traqueostomía podés registrar los períodos de ventilación espontánea.</p>}

      {patient.airwayType === 'traqueostomia' && (
        <label className="block mt-3 text-xs text-gray-600">
          Fecha de la traqueostomía (opcional)
          <input
            type="date"
            value={dateValue}
            max={today}
            onChange={(e) => handleDate(e.target.value)}
            className="block w-full mt-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </label>
      )}
    </Card>
  );
}
