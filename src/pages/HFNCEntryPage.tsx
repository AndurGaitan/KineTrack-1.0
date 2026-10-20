import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { VMIField } from '../components/VMIField';
import { ChoiceChips } from '../components/ChoiceChips';
import { AlertPanel } from '../components/AlertPanel';
import { RecordDateField } from '../components/RecordDateField';
import { PrefillNotice } from '../components/PrefillNotice';
import { useRecordTimestamp } from '../hooks/useRecordTimestamp';
import { CannulaFit, Patient } from '../types';
import { calculateROXForHFNC, generateHFNCAlerts } from '../utils/hfncCalculations';
import { cannulaFitOptions } from '../utils/hfncEducation';

const fitOptions = cannulaFitOptions.map(o => ({ value: o.value as CannulaFit, label: o.label }));

/**
 * Carga de monitorización HFNC (CAFO). Se precarga con el último registro del
 * paciente: si no cambió nada alcanza con guardar.
 */
export function HFNCEntryForm({ patient, onDone, onCancel }: { patient: Patient; onDone: () => void; onCancel?: () => void }) {
  const { addHFNCRecord, getActiveEpisode, getPatientHFNCRecords } = useApp();
  const recordedAt = useRecordTimestamp();
  const activeEpisode = getActiveEpisode(patient.id);
  const last = getPatientHFNCRecords(patient.id, activeEpisode?.id)[0];
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => ({
    flow: last?.flow ?? 50,
    fio2: last?.fio2 ?? 50,
    temperature: last?.temperature ?? 37,
    cannulaFit: (last?.cannulaFit ?? 'well-adapted') as CannulaFit,
    cannulaNotes: last?.cannulaNotes ?? '',
    humidificationWorking: last?.humidificationWorking ?? true,
    humidificationIssue: last?.humidificationIssue ?? '',
    spo2: last?.spo2 ?? 95,
    respiratoryRate: last?.respiratoryRate ?? 24
  }));
  const [calculations, setCalculations] = useState(calculateROXForHFNC({
    spo2: formData.spo2,
    fio2: formData.fio2,
    respiratoryRate: formData.respiratoryRate
  }));
  const [alerts, setAlerts] = useState<string[]>([]);
  useEffect(() => {
    const calc = calculateROXForHFNC({
      spo2: formData.spo2,
      fio2: formData.fio2,
      respiratoryRate: formData.respiratoryRate
    });
    setCalculations(calc);
    setAlerts(generateHFNCAlerts({
      ...formData,
      roxIndex: calc.roxIndex,
      roxRisk: calc.roxRisk,
      cannulaFit: formData.cannulaFit
    }));
  }, [formData]);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (recordedAt.isFuture || saving) return;
    setSaving(true);
    await addHFNCRecord({
      patientId: patient.id,
      episodeId: activeEpisode?.id,
      timestamp: recordedAt.timestamp,
      flow: formData.flow,
      fio2: formData.fio2,
      temperature: formData.temperature || undefined,
      cannulaFit: formData.cannulaFit,
      cannulaNotes: formData.cannulaNotes || undefined,
      humidificationWorking: formData.humidificationWorking,
      humidificationIssue: formData.humidificationWorking ? undefined : formData.humidificationIssue || undefined,
      spo2: formData.spo2,
      respiratoryRate: formData.respiratoryRate,
      roxIndex: calculations.roxIndex,
      roxRisk: calculations.roxRisk,
      alerts
    });
    setSaving(false);
    onDone();
  };
  const set = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));
  const roxTone = calculations.roxIndex >= 4.88 ? 'green' : calculations.roxIndex >= 3.85 ? 'yellow' : 'red';

  return <form onSubmit={handleSubmit} className="space-y-4">
      {last && <PrefillNotice timestamp={last.timestamp} />}

      <div className="grid grid-cols-2 gap-3">
        <VMIField label="Flujo" educationKey="flow" unit="L/min" type="number" inputMode="decimal" value={formData.flow} onChange={e => set({ flow: Number(e.target.value) })} required />
        <VMIField label="FiO₂" educationKey="fio2HFNC" unit="%" type="number" inputMode="decimal" value={formData.fio2} onChange={e => set({ fio2: Number(e.target.value) })} required />
        <VMIField label="SpO₂" educationKey="roxIndex" unit="%" type="number" inputMode="decimal" value={formData.spo2} onChange={e => set({ spo2: Number(e.target.value) })} required />
        <VMIField label="FR" educationKey="roxIndex" unit="rpm" type="number" inputMode="decimal" value={formData.respiratoryRate} onChange={e => set({ respiratoryRate: Number(e.target.value) })} required />
      </div>

      <div className={`p-3 rounded-xl flex items-center justify-between ${roxTone === 'green' ? 'bg-green-50' : roxTone === 'yellow' ? 'bg-yellow-50' : 'bg-red-50'}`}>
        <div>
          <div className="text-xs text-gray-600">Índice ROX</div>
          <div className="text-sm font-medium">
            {roxTone === 'green' && 'Bajo riesgo de fracaso'}
            {roxTone === 'yellow' && 'Riesgo moderado'}
            {roxTone === 'red' && 'Alto riesgo de fracaso'}
          </div>
        </div>
        <div className={`text-3xl font-bold ${roxTone === 'green' ? 'text-green-600' : roxTone === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{calculations.roxIndex}</div>
      </div>

      <ChoiceChips label="Ajuste de la cánula" options={fitOptions} value={formData.cannulaFit} onChange={v => v && set({ cannulaFit: v })} columns={3} />
      {formData.cannulaFit !== 'well-adapted' && <VMIField label="Notas sobre la cánula" placeholder="Ej: presión en narina derecha" value={formData.cannulaNotes} onChange={e => set({ cannulaNotes: e.target.value })} />}

      <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer">
        <input type="checkbox" checked={formData.humidificationWorking} onChange={e => set({ humidificationWorking: e.target.checked })} className="w-6 h-6" />
        <span className="font-medium text-gray-900">Humidificación funcionando</span>
      </label>
      {!formData.humidificationWorking && <VMIField label="Problema detectado" educationKey="humidification" placeholder="Ej: agua fría, condensación, nivel bajo" value={formData.humidificationIssue} onChange={e => set({ humidificationIssue: e.target.value })} />}

      <VMIField label="Temperatura" unit="°C" type="number" step="0.1" inputMode="decimal" value={formData.temperature} onChange={e => set({ temperature: Number(e.target.value) })} />

      {alerts.length > 0 && <AlertPanel alerts={alerts} />}

      <RecordDateField state={recordedAt} label="Fecha y hora de la monitorización" compact />

      <div className="flex gap-3">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
            Cancelar
          </Button>}
        <Button type="submit" fullWidth disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar monitorización'}
        </Button>
      </div>
    </form>;
}

export function HFNCEntryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, sectors } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  if (!patient || patient.supportType !== 'hfnc') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">
          Este módulo solo está disponible para pacientes en HFNC
        </p>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      <Header title="Monitorización HFNC" showBack showPatientList sectorId={sector?.id} />
      <main className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="text-sm text-gray-600">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>
        <HFNCEntryForm patient={patient} onDone={() => navigate(`/patient/${patient.id}`)} onCancel={() => navigate(-1)} />
      </main>
    </div>;
}
