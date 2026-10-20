import { FormEvent, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from './ui/Button';
import { VMIField } from './VMIField';
import { ChoiceChips } from './ChoiceChips';
import { AlertPanel } from './AlertPanel';
import { RecordDateField } from './RecordDateField';
import { PrefillNotice } from './PrefillNotice';
import { useRecordTimestamp } from '../hooks/useRecordTimestamp';
import { oxygenDeviceOptions } from '../utils/prestacionLabels';
import type { OxygenDeviceType, Patient } from '../types';

const venturiFio2 = [24, 28, 31, 35, 40, 50];

const toNum = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

// Mismas reglas que el servidor (solo para mostrar el aviso antes de guardar).
function previewAlerts(device: OxygenDeviceType, flow: number | undefined, spo2?: number, rr?: number): string[] {
  const alerts: string[] = [];
  if (spo2 !== undefined) {
    if (spo2 < 90) alerts.push('SpO₂ < 90% - Evaluar escalar el soporte de oxígeno');
    else if (spo2 < 92) alerts.push('SpO₂ 90-91% - Reevaluar el dispositivo y el flujo');
  }
  if (device === 'canula-nasal-simple' && flow !== undefined && flow > 6) {
    alerts.push('Cánula nasal con flujo > 6 L/min - Considerar una máscara o un dispositivo de mayor aporte');
  }
  if (rr !== undefined && rr > 28) alerts.push('FR > 28 rpm - Vigilar el trabajo respiratorio y considerar HFNC o VNI si no mejora');
  return alerts;
}

/** Registro de oxigenoterapia convencional: dispositivo + flujo (+ SpO₂ y FR). */
export function OxygenForm({ patient, onDone }: { patient: Patient; onDone: () => void }) {
  const { addOxygenRecord, getActiveEpisode, getPatientOxygenRecords } = useApp();
  const recordedAt = useRecordTimestamp();
  const activeEpisode = getActiveEpisode(patient.id);
  const last = getPatientOxygenRecords(patient.id, activeEpisode?.id)[0];
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<OxygenDeviceType | ''>(last?.device ?? '');
  const [flow, setFlow] = useState<number | undefined>(last?.flow);
  const [fio2, setFio2] = useState<number | undefined>(last?.fio2);
  const [spo2, setSpo2] = useState<number | undefined>(last?.spo2);
  const [rr, setRr] = useState<number | undefined>(last?.respiratoryRate);
  const [notes, setNotes] = useState('');

  const canSave = !!device && flow !== undefined && flow > 0 && !recordedAt.isFuture;
  const alerts = device ? previewAlerts(device, flow, spo2, rr) : [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const ok = await addOxygenRecord({
      patientId: patient.id,
      episodeId: activeEpisode?.id,
      timestamp: recordedAt.timestamp,
      device: device as OxygenDeviceType,
      flow: flow!,
      fio2: device === 'mascara-venturi' ? fio2 : undefined,
      spo2,
      respiratoryRate: rr,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (ok) {
      setNotes('');
      onDone();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {last && <PrefillNotice timestamp={last.timestamp} />}

      <ChoiceChips label="Dispositivo" options={oxygenDeviceOptions} value={device} onChange={setDevice} columns={2} />

      <div className="grid grid-cols-3 gap-3">
        <VMIField label="Flujo" unit="L/min" type="number" step="0.5" inputMode="decimal" value={flow ?? ''} onChange={e => setFlow(toNum(e.target.value))} required />
        <VMIField label="SpO₂" unit="%" type="number" inputMode="decimal" value={spo2 ?? ''} onChange={e => setSpo2(toNum(e.target.value))} />
        <VMIField label="FR" unit="rpm" type="number" inputMode="decimal" value={rr ?? ''} onChange={e => setRr(toNum(e.target.value))} />
      </div>

      {device === 'mascara-venturi' && (
        <ChoiceChips
          label="FiO₂ del Venturi"
          options={venturiFio2.map(v => ({ value: String(v), label: `${v}%` }))}
          value={fio2 !== undefined ? String(fio2) : ''}
          onChange={v => setFio2(v ? Number(v) : undefined)}
          columns={3}
          allowClear
        />
      )}

      <VMIField label="Nota (opcional)" placeholder="Ej: se baja el flujo, buena tolerancia" maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} />

      {alerts.length > 0 && <AlertPanel alerts={alerts} />}

      <RecordDateField state={recordedAt} label="Fecha y hora del registro" compact />

      <Button type="submit" fullWidth disabled={!canSave || saving}>
        {saving ? 'Guardando...' : 'Guardar registro de oxígeno'}
      </Button>
    </form>
  );
}
