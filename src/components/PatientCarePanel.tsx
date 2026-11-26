import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Card } from './ui/Card';
import { ActivityCard } from './ActivityCard';
import { VMIEntryForm } from '../pages/VMIEntryPage';
import { NIVEntryForm } from '../pages/NIVEntryPage';
import { HFNCEntryForm } from '../pages/HFNCEntryPage';
import { OxygenForm } from './OxygenForm';
import { MobilizationCard } from './MobilizationCard';
import { AirwayCard } from './AirwayCard';
import { SpontaneousVentilationCard } from './SpontaneousVentilationCard';
import { calendarDaysBetween, daysAgoText } from '../utils/supportDays';
import type { Patient, SupportType } from '../types';

const supportChips: { value: SupportType; label: string }[] = [
  { value: 'imv', label: 'VMI' },
  { value: 'niv', label: 'VMNI' },
  { value: 'hfnc', label: 'CAFO' },
  { value: 'conventional-oxygen', label: 'O₂' },
  { value: 'room-air', label: 'Aire' },
];

const monitoringTitle: Partial<Record<SupportType, string>> = {
  imv: 'Monitorización VMI',
  niv: 'Monitorización VMNI',
  hfnc: 'Monitorización CAFO',
  'conventional-oxygen': 'Registro de oxigenoterapia',
};

/**
 * Todo lo que se hace con un paciente abierto, en una sola pantalla: se elige
 * el soporte (tocar otro abre el cambio de soporte), se cargan KTR/KTM/MRC con
 * un toque y se despliega la planilla propia de ese soporte, precargada con el
 * último registro. Sin navegar entre pantallas.
 */
export function PatientCarePanel({ patient, onChangeSupport }: { patient: Patient; onChangeSupport: (to: SupportType) => void }) {
  const navigate = useNavigate();
  const {
    features,
    getActiveEpisode,
    getPatientPrestaciones,
    getPatientVMIRecords,
    getPatientNIVRecords,
    getPatientHFNCRecords,
    getPatientOxygenRecords,
  } = useApp();
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0);
  const current = patient.supportType;
  const episode = getActiveEpisode(patient.id);
  const prestaciones = getPatientPrestaciones(patient.id);
  const recordCount = (
    current === 'imv'
      ? getPatientVMIRecords(patient.id)
      : current === 'niv'
        ? getPatientNIVRecords(patient.id)
        : current === 'hfnc'
          ? getPatientHFNCRecords(patient.id)
          : getPatientOxygenRecords(patient.id)
  ).length;
  const now = useMemo(() => new Date(), [prestaciones, recordCount]);

  // Cuando el guardado termina del todo, el formulario se vuelve a montar con el nuevo "último registro".
  // (Si falla, queda tal cual, con lo cargado.)
  const formKey = `${current}-${version}`;

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(t);
  }, [saved]);
  useEffect(() => setSaved(false), [current]);

  const chips = supportChips;
  // La traqueostomía es la vía aérea (no un soporte): se muestra en VMI o cuando el paciente ya la tiene.
  const isTrach = patient.airwayType === 'traqueostomia';
  const done = () => {
    setVersion(v => v + 1);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Soporte ventilatorio</h2>
          {episode && (
            <span className="text-xs text-gray-500">
              {daysAgoText(calendarDaysBetween(episode.startAt, now))} ·{' '}
              <button type="button" onClick={() => navigate(`/patient/${patient.id}/edit`)} className="font-semibold text-blue-600 underline underline-offset-2">
                Corregir inicio
              </button>
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Soporte ventilatorio">
          {chips.map(chip => (
            <SupportChip key={chip.value} chip={chip} active={current === chip.value} onPick={() => chip.value !== current && onChangeSupport(chip.value)} />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Tocá otro soporte para cambiarlo.</p>
      </Card>

      {features.tracheostomy && (current === 'imv' || isTrach) && <AirwayCard patient={patient} />}
      {features.tracheostomy && isTrach && <SpontaneousVentilationCard patientId={patient.id} episodeId={episode?.id} />}

      <ActivityCard patientId={patient.id} prestaciones={prestaciones} now={now} />

      {monitoringTitle[current] && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{monitoringTitle[current]}</h2>
          {current === 'imv' && (
            <VMIEntryForm key={formKey} patient={patient} onDone={done} justSaved={saved}>
              <MobilizationCard patientId={patient.id} now={now} />
            </VMIEntryForm>
          )}
          {current === 'niv' && <NIVEntryForm key={formKey} patient={patient} onDone={done} justSaved={saved} />}
          {current === 'hfnc' && <HFNCEntryForm key={formKey} patient={patient} onDone={done} justSaved={saved} />}
          {current === 'conventional-oxygen' && <OxygenForm key={formKey} patient={patient} onDone={done} justSaved={saved} />}
        </Card>
      )}

      {current === 'room-air' && (
        <Card>
          <p className="text-sm text-gray-600">Sin soporte: no hay planilla de monitorización. Registrá la kinesioterapia o la evaluación MRC arriba.</p>
        </Card>
      )}
    </div>
  );
}

function SupportChip({ chip, active, onPick }: { chip: { value: SupportType; label: string }; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onPick}
      className={`min-h-[52px] rounded-xl border-2 text-sm font-bold transition-colors ${
        active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
      }`}
    >
      {chip.label}
    </button>
  );
}
