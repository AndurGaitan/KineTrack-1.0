import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { CollapsibleSection } from '../components/ui/Tooltip';
import { NIVField, NIVSelect } from '../components/NIVField';
import { AlertPanel } from '../components/AlertPanel';
import { NIVInterfaceType, SkinIntegrityStatus, NIVMode } from '../types';
import { calculateHACORForNIV, generateNIVAlerts } from '../utils/nivCalculations';
import { interfaceTypes, skinIntegrityOptions, lesionLocations, nivModes } from '../utils/nivEducation';

// Helpers: keep numbers truly empty (avoid Number('') => 0), same pattern as VMIEntryPage.
const toNumberOrUndefined = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

export function NIVEntryPage() {
  const {
    patientId
  } = useParams<{
    patientId: string;
  }>();
  const navigate = useNavigate();
  const {
    patients,
    addNIVRecord,
    sectors,
    getActiveEpisode
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;
  const [formData, setFormData] = useState({
    // Interface
    interfaceType: '' as NIVInterfaceType | '',
    interfaceOther: '',
    // Skin Integrity
    skinIntegrity: '' as SkinIntegrityStatus | '',
    lesionLocations: [] as string[],
    skinNotes: '',
    // NIV Parameters (PSV/CPAP-style, not IPAP/EPAP)
    mode: '' as NIVMode | '',
    modeOther: '',
    supportPressure: 10,
    peep: 5,
    expiratorySensitivity: 25,
    fio2: 40,
    leak: 0,
    // HACOR Score
    heartRate: 80,
    ph: 7.4,
    consciousness: 15,
    pao2: 80,
    respiratoryRate: 24,
    // Rest of the ABG panel
    paco2: undefined as number | undefined,
    hco3: undefined as number | undefined,
    spo2: undefined as number | undefined,
    baseExcess: undefined as number | undefined,
    // Previous IMV
    previousIMVDays: 0
  });
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
    const newAlerts = generateNIVAlerts({
      ...formData,
      hacorScore: calc.hacorScore,
      hacorRisk: calc.hacorRisk
    });
    setAlerts(newAlerts);
  }, [formData]);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    addNIVRecord({
      patientId: patient!.id,
      episodeId: activeEpisode?.id,
      interfaceType: formData.interfaceType as NIVInterfaceType,
      interfaceOther: formData.interfaceOther || undefined,
      skinIntegrity: formData.skinIntegrity as SkinIntegrityStatus,
      lesionLocations: formData.lesionLocations,
      skinNotes: formData.skinNotes || undefined,
      mode: formData.mode as NIVMode,
      modeOther: formData.modeOther || undefined,
      supportPressure: formData.supportPressure,
      peep: formData.peep,
      expiratorySensitivity: formData.expiratorySensitivity,
      fio2: formData.fio2,
      leak: formData.leak || undefined,
      heartRate: formData.heartRate,
      ph: formData.ph,
      consciousness: formData.consciousness,
      pao2: formData.pao2,
      paco2: formData.paco2,
      hco3: formData.hco3,
      spo2: formData.spo2,
      baseExcess: formData.baseExcess,
      respiratoryRate: formData.respiratoryRate,
      hacorScore: calculations.hacorScore,
      hacorRisk: calculations.hacorRisk,
      previousIMVDays: formData.previousIMVDays || undefined,
      alerts
    });
    navigate(`/patient/${patient!.id}/niv`);
  };
  if (!patient || patient.supportType !== 'niv') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">
          Este módulo solo está disponible para pacientes en VNI
        </p>
      </div>;
  }
  const toggleLesionLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      lesionLocations: prev.lesionLocations.includes(location) ? prev.lesionLocations.filter(l => l !== location) : [...prev.lesionLocations, location]
    }));
  };
  return <div className="min-h-screen bg-gray-50">
      <Header title="Monitorización VNI" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-purple-900">
            <strong>Evaluación específica de VNI:</strong> Interfaz, integridad
            de piel, HACOR y parámetros ventilatorios para optimizar el soporte
            no invasivo.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Interface Section */}
          <CollapsibleSection title="Interfaz de VNI" subtitle="Tipo de máscara o dispositivo">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Tipo de interfaz
                </label>
                <div className="space-y-2">
                  {interfaceTypes.map(type => <label key={type.value} className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${formData.interfaceType === type.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="interface" checked={formData.interfaceType === type.value} onChange={() => setFormData({
                    ...formData,
                    interfaceType: type.value as NIVInterfaceType
                  })} className="w-5 h-5 mt-0.5" required />
                      <div>
                        <div className="font-bold text-gray-900">
                          {type.label}
                        </div>
                        <div className="text-sm text-gray-600">
                          {type.description}
                        </div>
                      </div>
                    </label>)}
                </div>
              </div>

              {formData.interfaceType === 'other' && <NIVField label="Especificar interfaz" placeholder="Ej: Máscara custom, otro tipo" value={formData.interfaceOther} onChange={e => setFormData({
              ...formData,
              interfaceOther: e.target.value
            })} />}
            </div>
          </CollapsibleSection>

          {/* Skin Integrity Section */}
          <CollapsibleSection title="Integridad de la Piel" subtitle="Evaluación de lesiones por presión">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Estado de la piel
                </label>
                <div className="space-y-2">
                  {skinIntegrityOptions.map(option => <label key={option.value} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${formData.skinIntegrity === option.value ? `border-${option.color}-500 bg-${option.color}-50` : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="skinIntegrity" checked={formData.skinIntegrity === option.value} onChange={() => setFormData({
                    ...formData,
                    skinIntegrity: option.value as SkinIntegrityStatus
                  })} className="w-5 h-5" required />
                      <span className="font-medium text-gray-900">
                        {option.label}
                      </span>
                    </label>)}
                </div>
              </div>

              {formData.skinIntegrity !== 'no-lesions' && formData.skinIntegrity !== '' && <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Ubicación de lesiones
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {lesionLocations.map(location => <label key={location} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input type="checkbox" checked={formData.lesionLocations.includes(location)} onChange={() => toggleLesionLocation(location)} className="w-5 h-5" />
                            <span className="text-sm text-gray-900">
                              {location}
                            </span>
                          </label>)}
                      </div>
                    </div>

                    <NIVField label="Notas adicionales sobre la piel" placeholder="Ej: Eritema en puente nasal, aplicada protección" value={formData.skinNotes} onChange={e => setFormData({
                ...formData,
                skinNotes: e.target.value
              })} />
                  </>}
            </div>
          </CollapsibleSection>

          {/* NIV Parameters Section (PSV/CPAP-style) */}
          <CollapsibleSection title="Parámetros de VNI" subtitle="Configuración del ventilador (modo PSV/CPAP)">
            <div className="space-y-4">
              <NIVSelect label="Modo ventilatorio" options={nivModes} value={formData.mode} onChange={e => setFormData({
              ...formData,
              mode: e.target.value as NIVMode
            })} required />

              {formData.mode === 'other' && <NIVField label="Especificar modo" placeholder="Ej: AVAPS, otro modo" value={formData.modeOther} onChange={e => setFormData({
              ...formData,
              modeOther: e.target.value
            })} />}

              <div className="grid grid-cols-2 gap-4">
                <NIVField label="Presión de Soporte (PS)" educationKey="supportPressureNIV" unit="cmH₂O" type="number" value={formData.supportPressure} onChange={e => setFormData({
                ...formData,
                supportPressure: Number(e.target.value)
              })} required />
                <NIVField label="PEEP" educationKey="peepNIV" unit="cmH₂O" type="number" value={formData.peep} onChange={e => setFormData({
                ...formData,
                peep: Number(e.target.value)
              })} required />
              </div>

              <NIVField label="Sensibilidad Espiratoria" educationKey="expiratorySensitivity" unit="%" type="number" value={formData.expiratorySensitivity} onChange={e => setFormData({
              ...formData,
              expiratorySensitivity: Number(e.target.value)
            })} required />

              <div className="p-4 rounded-xl bg-purple-50">
                <div className="text-sm text-gray-600 mb-1">
                  Presión pico (PS + PEEP)
                </div>
                <div className="text-3xl font-bold text-purple-900">
                  {formData.supportPressure + formData.peep} cmH₂O
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <NIVField label="FiO₂" unit="%" type="number" value={formData.fio2} onChange={e => setFormData({
                ...formData,
                fio2: Number(e.target.value)
              })} required />
                <NIVField label="Fuga estimada" unit="L/min" type="number" value={formData.leak} onChange={e => setFormData({
                ...formData,
                leak: Number(e.target.value)
              })} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Gasometry + HACOR Score Section */}
          <CollapsibleSection title="Gasometría Arterial y Score HACOR" subtitle="Panel de ABG completo y predicción de fracaso de VNI">
            <div className="space-y-4">
              {/* Orden de reporte de gasometría: pH, PaCO₂, PaO₂, HCO₃, SatO₂,
                  Exceso de Bases (FiO₂ ya se carga arriba, en Parámetros de VNI). */}
              <div className="grid grid-cols-2 gap-4">
                <NIVField label="pH" educationKey="hacorNIV" type="number" step="0.01" value={formData.ph} onChange={e => setFormData({
                ...formData,
                ph: Number(e.target.value)
              })} required />
                <NIVField label="PaCO₂" educationKey="gasometriaNIV" unit="mmHg" type="number" value={formData.paco2 ?? ''} onChange={e => setFormData({
                ...formData,
                paco2: toNumberOrUndefined(e.target.value)
              })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <NIVField label="PaO₂" educationKey="hacorNIV" unit="mmHg" type="number" value={formData.pao2} onChange={e => setFormData({
                ...formData,
                pao2: Number(e.target.value)
              })} required />
                <NIVField label="HCO₃" educationKey="gasometriaNIV" unit="mEq/L" type="number" step="0.1" value={formData.hco3 ?? ''} onChange={e => setFormData({
                ...formData,
                hco3: toNumberOrUndefined(e.target.value)
              })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <NIVField label="SatO₂" educationKey="gasometriaNIV" unit="%" type="number" value={formData.spo2 ?? ''} onChange={e => setFormData({
                ...formData,
                spo2: toNumberOrUndefined(e.target.value)
              })} />
                <NIVField label="Exceso de Bases (BE)" educationKey="gasometriaNIV" unit="mEq/L" type="number" step="0.1" value={formData.baseExcess ?? ''} onChange={e => setFormData({
                ...formData,
                baseExcess: toNumberOrUndefined(e.target.value)
              })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <NIVField label="Frecuencia Cardíaca" educationKey="hacorNIV" unit="lpm" type="number" value={formData.heartRate} onChange={e => setFormData({
                ...formData,
                heartRate: Number(e.target.value)
              })} required />
                <NIVField label="Glasgow (Conciencia)" educationKey="hacorNIV" type="number" value={formData.consciousness} onChange={e => setFormData({
                ...formData,
                consciousness: Number(e.target.value)
              })} placeholder="3-15" required />
              </div>

              <NIVField label="Frecuencia Respiratoria" educationKey="hacorNIV" unit="rpm" type="number" value={formData.respiratoryRate} onChange={e => setFormData({
              ...formData,
              respiratoryRate: Number(e.target.value)
            })} required />

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
          </CollapsibleSection>

          {/* Previous IMV Section */}
          <CollapsibleSection title="Ventilación Mecánica Invasiva Previa" subtitle="Contexto de destete" defaultOpen={false}>
            <div className="space-y-4">
              <NIVField label="Días previos en VMI" educationKey="previousIMV" unit="días" type="number" value={formData.previousIMVDays} onChange={e => setFormData({
              ...formData,
              previousIMVDays: Number(e.target.value)
            })} placeholder="0 si no aplica" />
            </div>
          </CollapsibleSection>

          {/* Alerts */}
          {alerts.length > 0 && <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Evaluación Clínica
              </h3>
              <AlertPanel alerts={alerts} />
            </div>}

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              Guardar Monitorización
            </Button>
          </div>
        </form>
      </main>
    </div>;
}
