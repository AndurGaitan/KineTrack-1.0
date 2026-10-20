import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { CollapsibleSection } from '../components/ui/Tooltip';
import { NIVField } from '../components/NIVField';
import { ChoiceChips } from '../components/ChoiceChips';
import { AlertPanel } from '../components/AlertPanel';
import { RecordDateField } from '../components/RecordDateField';
import { PrefillNotice } from '../components/PrefillNotice';
import { useRecordTimestamp } from '../hooks/useRecordTimestamp';
import { NIVInterfaceType, SkinIntegrityStatus, NIVMode, Patient } from '../types';
import { calculateHACORForNIV, generateNIVAlerts } from '../utils/nivCalculations';
import { interfaceTypes, skinIntegrityOptions, lesionLocations, nivModes } from '../utils/nivEducation';

// Helpers: keep numbers truly empty (avoid Number('') => 0), same pattern as VMIEntryPage.
const toNumberOrUndefined = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

const interfaceOptions = interfaceTypes.map(t => ({ value: t.value as NIVInterfaceType, label: t.label }));
const skinOptions = skinIntegrityOptions.map(o => ({ value: o.value as SkinIntegrityStatus, label: o.label }));
const modeOptions = nivModes.map(m => ({ value: m.value as NIVMode, label: m.label }));

/**
 * Carga de monitorización VNI (VMNI). Se precarga con el último registro:
 * interfaz, modo, parámetros y piel quedan como estaban y solo se cambia lo que varió.
 */
export function NIVEntryForm({ patient, onDone, onCancel }: { patient: Patient; onDone: () => void; onCancel?: () => void }) {
  const { addNIVRecord, getActiveEpisode, getPatientNIVRecords, features } = useApp();
  const recordedAt = useRecordTimestamp();
  const activeEpisode = getActiveEpisode(patient.id);
  const last = getPatientNIVRecords(patient.id, activeEpisode?.id)[0];
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => ({
    interfaceType: (last?.interfaceType ?? '') as NIVInterfaceType | '',
    interfaceOther: last?.interfaceOther ?? '',
    skinIntegrity: (last?.skinIntegrity ?? '') as SkinIntegrityStatus | '',
    lesionLocations: (last?.lesionLocations ?? []) as string[],
    skinNotes: last?.skinNotes ?? '',
    mode: (last?.mode ?? '') as NIVMode | '',
    modeOther: last?.modeOther ?? '',
    supportPressure: last?.supportPressure ?? 10,
    peep: last?.peep ?? 5,
    expiratorySensitivity: last?.expiratorySensitivity ?? 25,
    fio2: last?.fio2 ?? 40,
    leak: last?.leak ?? 0,
    // HACOR (solo con gasometría, etapa 2)
    heartRate: last?.heartRate ?? 80,
    ph: last?.ph ?? 7.4,
    consciousness: last?.consciousness ?? 15,
    pao2: last?.pao2 ?? 80,
    respiratoryRate: last?.respiratoryRate ?? 24,
    paco2: undefined as number | undefined,
    hco3: undefined as number | undefined,
    spo2: last?.spo2 as number | undefined,
    baseExcess: undefined as number | undefined,
    previousIMVDays: last?.previousIMVDays ?? 0
  }));
  const [calculations, setCalculations] = useState(calculateHACORForNIV({
    heartRate: formData.heartRate,
    ph: formData.ph,
    consciousness: formData.consciousness,
    pao2: formData.pao2,
    fio2: formData.fio2,
    respiratoryRate: formData.respiratoryRate
  }));
  const [alerts, setAlerts] = useState<string[]>([]);
  useEffect(() => {
    const calc = calculateHACORForNIV({
      heartRate: formData.heartRate,
      ph: formData.ph,
      consciousness: formData.consciousness,
      pao2: formData.pao2,
      fio2: formData.fio2,
      respiratoryRate: formData.respiratoryRate
    });
    setCalculations(calc);
    setAlerts(generateNIVAlerts({
      ...formData,
      interfaceType: formData.interfaceType || undefined,
      skinIntegrity: formData.skinIntegrity || undefined,
      mode: formData.mode || undefined,
      hacorScore: features.gasometry ? calc.hacorScore : undefined,
      hacorRisk: features.gasometry ? calc.hacorRisk : undefined
    }));
  }, [formData, features.gasometry]);
  const set = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));
  const canSave = !!formData.interfaceType && !!formData.skinIntegrity && !!formData.mode && !recordedAt.isFuture;
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    await addNIVRecord({
      patientId: patient.id,
      episodeId: activeEpisode?.id,
      timestamp: recordedAt.timestamp,
      interfaceType: formData.interfaceType as NIVInterfaceType,
      interfaceOther: formData.interfaceType === 'other' ? formData.interfaceOther || undefined : undefined,
      skinIntegrity: formData.skinIntegrity as SkinIntegrityStatus,
      lesionLocations: formData.skinIntegrity === 'no-lesions' ? [] : formData.lesionLocations,
      skinNotes: formData.skinNotes || undefined,
      mode: formData.mode as NIVMode,
      modeOther: formData.mode === 'other' ? formData.modeOther || undefined : undefined,
      supportPressure: formData.supportPressure,
      peep: formData.peep,
      expiratorySensitivity: formData.expiratorySensitivity,
      fio2: formData.fio2,
      leak: formData.leak || undefined,
      // Etapa 1: sin gasometría ni HACOR (solo SpO₂ y FR).
      ...(features.gasometry ? {
        heartRate: formData.heartRate,
        ph: formData.ph,
        consciousness: formData.consciousness,
        pao2: formData.pao2,
        paco2: formData.paco2,
        hco3: formData.hco3,
        baseExcess: formData.baseExcess,
        hacorScore: calculations.hacorScore,
        hacorRisk: calculations.hacorRisk
      } : {}),
      spo2: formData.spo2,
      respiratoryRate: formData.respiratoryRate,
      previousIMVDays: formData.previousIMVDays || undefined,
      alerts
    });
    setSaving(false);
    onDone();
  };
  const toggleLesionLocation = (location: string) => {
    set({
      lesionLocations: formData.lesionLocations.includes(location) ? formData.lesionLocations.filter(l => l !== location) : [...formData.lesionLocations, location]
    });
  };
  const hasSkinIssue = formData.skinIntegrity !== 'no-lesions' && formData.skinIntegrity !== '';

  return <form onSubmit={handleSubmit} className="space-y-4">
      {last && <PrefillNotice timestamp={last.timestamp} />}

      <ChoiceChips label="Interfaz" options={interfaceOptions} value={formData.interfaceType} onChange={v => set({ interfaceType: v })} />
      {formData.interfaceType === 'other' && <NIVField label="Especificar interfaz" placeholder="Ej: máscara custom" value={formData.interfaceOther} onChange={e => set({ interfaceOther: e.target.value })} />}

      <ChoiceChips label="Modo" options={modeOptions} value={formData.mode} onChange={v => set({ mode: v })} />
      {formData.mode === 'other' && <NIVField label="Especificar modo" placeholder="Ej: AVAPS" value={formData.modeOther} onChange={e => set({ modeOther: e.target.value })} />}

      <div className="grid grid-cols-3 gap-3">
        <NIVField label="PS" educationKey="supportPressureNIV" unit="cmH₂O" type="number" inputMode="decimal" value={formData.supportPressure} onChange={e => set({ supportPressure: Number(e.target.value) })} required />
        <NIVField label="PEEP" educationKey="peepNIV" unit="cmH₂O" type="number" inputMode="decimal" value={formData.peep} onChange={e => set({ peep: Number(e.target.value) })} required />
        <NIVField label="FiO₂" unit="%" type="number" inputMode="decimal" value={formData.fio2} onChange={e => set({ fio2: Number(e.target.value) })} required />
        <NIVField label="Fuga" unit="L/min" type="number" inputMode="decimal" value={formData.leak} onChange={e => set({ leak: Number(e.target.value) })} />
        <NIVField label="SpO₂" unit="%" type="number" inputMode="decimal" value={formData.spo2 ?? ''} onChange={e => set({ spo2: toNumberOrUndefined(e.target.value) })} />
        <NIVField label="FR" educationKey="hacorNIV" unit="rpm" type="number" inputMode="decimal" value={formData.respiratoryRate} onChange={e => set({ respiratoryRate: Number(e.target.value) })} required />
      </div>

      <ChoiceChips label="Estado de la piel" options={skinOptions} value={formData.skinIntegrity} onChange={v => set({ skinIntegrity: v })} />
      {hasSkinIssue && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {lesionLocations.map(location => <label key={location} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer">
                <input type="checkbox" checked={formData.lesionLocations.includes(location)} onChange={() => toggleLesionLocation(location)} className="w-5 h-5" />
                <span className="text-sm text-gray-900">{location}</span>
              </label>)}
          </div>
          <NIVField label="Notas sobre la piel" placeholder="Ej: eritema en puente nasal, se aplicó protección" value={formData.skinNotes} onChange={e => set({ skinNotes: e.target.value })} />
        </div>}

      {/* Etapa 2: gasometría y HACOR */}
      {features.gasometry && <CollapsibleSection title="Gasometría Arterial y Score HACOR" subtitle="Panel de ABG completo y predicción de fracaso de VNI" defaultOpen={false}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NIVField label="pH" educationKey="hacorNIV" type="number" step="0.01" value={formData.ph} onChange={e => set({ ph: Number(e.target.value) })} required />
              <NIVField label="PaCO₂" educationKey="gasometriaNIV" unit="mmHg" type="number" value={formData.paco2 ?? ''} onChange={e => set({ paco2: toNumberOrUndefined(e.target.value) })} />
              <NIVField label="PaO₂" educationKey="hacorNIV" unit="mmHg" type="number" value={formData.pao2} onChange={e => set({ pao2: Number(e.target.value) })} required />
              <NIVField label="HCO₃" educationKey="gasometriaNIV" unit="mEq/L" type="number" step="0.1" value={formData.hco3 ?? ''} onChange={e => set({ hco3: toNumberOrUndefined(e.target.value) })} />
              <NIVField label="Exceso de Bases (BE)" educationKey="gasometriaNIV" unit="mEq/L" type="number" step="0.1" value={formData.baseExcess ?? ''} onChange={e => set({ baseExcess: toNumberOrUndefined(e.target.value) })} />
              <NIVField label="Frecuencia Cardíaca" educationKey="hacorNIV" unit="lpm" type="number" value={formData.heartRate} onChange={e => set({ heartRate: Number(e.target.value) })} required />
              <NIVField label="Glasgow (Conciencia)" educationKey="hacorNIV" type="number" value={formData.consciousness} onChange={e => set({ consciousness: Number(e.target.value) })} placeholder="3-15" required />
            </div>
            <div className={`p-4 rounded-xl ${calculations.hacorScore > 5 ? 'bg-red-50' : calculations.hacorScore >= 3 ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <div className="text-sm text-gray-600 mb-1">Score HACOR</div>
              <div className={`text-5xl font-bold ${calculations.hacorScore > 5 ? 'text-red-600' : calculations.hacorScore >= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                {calculations.hacorScore}
              </div>
              <div className="text-sm mt-2 font-medium">
                {calculations.hacorScore > 5 && 'Alto riesgo de fracaso'}
                {calculations.hacorScore >= 3 && calculations.hacorScore <= 5 && 'Riesgo moderado'}
                {calculations.hacorScore < 3 && 'Bajo riesgo de fracaso'}
              </div>
            </div>
          </div>
        </CollapsibleSection>}

      <CollapsibleSection title="VMI previa" subtitle="Contexto de destete (opcional)" defaultOpen={false}>
        <NIVField label="Días previos en VMI" educationKey="previousIMV" unit="días" type="number" value={formData.previousIMVDays} onChange={e => set({ previousIMVDays: Number(e.target.value) })} placeholder="0 si no aplica" />
      </CollapsibleSection>

      {alerts.length > 0 && <AlertPanel alerts={alerts} />}

      <RecordDateField state={recordedAt} label="Fecha y hora de la monitorización" compact />

      {!canSave && !recordedAt.isFuture && <div className="text-xs text-gray-500">
          Para guardar elegí: {[!formData.interfaceType && 'interfaz', !formData.mode && 'modo', !formData.skinIntegrity && 'estado de la piel'].filter(Boolean).join(', ')}.
        </div>}

      <div className="flex gap-3">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
            Cancelar
          </Button>}
        <Button type="submit" fullWidth disabled={!canSave || saving}>
          {saving ? 'Guardando...' : 'Guardar monitorización'}
        </Button>
      </div>
    </form>;
}

export function NIVEntryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, sectors } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  if (!patient || patient.supportType !== 'niv') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">
          Este módulo solo está disponible para pacientes en VNI
        </p>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      <Header title="Monitorización VNI" showBack showPatientList sectorId={sector?.id} />
      <main className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="text-sm text-gray-600">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>
        <NIVEntryForm patient={patient} onDone={() => navigate(`/patient/${patient.id}`)} onCancel={() => navigate(-1)} />
      </main>
    </div>;
}
