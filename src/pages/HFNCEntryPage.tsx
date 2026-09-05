import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { CollapsibleSection } from '../components/ui/Tooltip';
import { VMIField, VMISelect } from '../components/VMIField';
import { AlertPanel } from '../components/AlertPanel';
import { CannulaFit } from '../types';
import { calculateROXForHFNC, generateHFNCAlerts } from '../utils/hfncCalculations';
import { cannulaFitOptions } from '../utils/hfncEducation';
export function HFNCEntryPage() {
  const {
    patientId
  } = useParams<{
    patientId: string;
  }>();
  const navigate = useNavigate();
  const {
    patients,
    addHFNCRecord,
    sectors,
    getActiveEpisode
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;
  const [formData, setFormData] = useState({
    // HFNC Parameters
    flow: 50,
    fio2: 50,
    temperature: 37,
    cannulaFit: '' as CannulaFit | '',
    cannulaNotes: '',
    // Humidification
    humidificationWorking: true,
    humidificationIssue: '',
    // ROX Index
    spo2: 95,
    respiratoryRate: 24
  });
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
    const newAlerts = generateHFNCAlerts({
      ...formData,
      roxIndex: calc.roxIndex,
      roxRisk: calc.roxRisk,
      cannulaFit: formData.cannulaFit as CannulaFit
    });
    setAlerts(newAlerts);
  }, [formData]);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    addHFNCRecord({
      patientId: patient!.id,
      episodeId: activeEpisode?.id,
      flow: formData.flow,
      fio2: formData.fio2,
      temperature: formData.temperature || undefined,
      cannulaFit: formData.cannulaFit as CannulaFit,
      cannulaNotes: formData.cannulaNotes || undefined,
      humidificationWorking: formData.humidificationWorking,
      humidificationIssue: formData.humidificationIssue || undefined,
      spo2: formData.spo2,
      respiratoryRate: formData.respiratoryRate,
      roxIndex: calculations.roxIndex,
      roxRisk: calculations.roxRisk,
      alerts
    });
    navigate(`/patient/${patient!.id}/hfnc`);
  };
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
        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-teal-900">
            <strong>Evaluación específica de HFNC:</strong> Flujo, ROX,
            humidificación y ajuste de cánula para optimizar la oxigenación de
            alto flujo.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* HFNC Parameters Section */}
          <CollapsibleSection title="Parámetros de HFNC" subtitle="Configuración del sistema de alto flujo">
            <div className="space-y-4">
              <VMIField label="Flujo" educationKey="flow" unit="L/min" type="number" value={formData.flow} onChange={e => setFormData({
              ...formData,
              flow: Number(e.target.value)
            })} required />

              <div className="grid grid-cols-2 gap-4">
                <VMIField label="FiO₂" educationKey="fio2HFNC" unit="%" type="number" value={formData.fio2} onChange={e => setFormData({
                ...formData,
                fio2: Number(e.target.value)
              })} required />
                <VMIField label="Temperatura" unit="°C" type="number" step="0.1" value={formData.temperature} onChange={e => setFormData({
                ...formData,
                temperature: Number(e.target.value)
              })} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Ajuste de la cánula
                </label>
                <div className="space-y-2">
                  {cannulaFitOptions.map(option => <label key={option.value} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${formData.cannulaFit === option.value ? `border-${option.color}-500 bg-${option.color}-50` : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="cannulaFit" checked={formData.cannulaFit === option.value} onChange={() => setFormData({
                    ...formData,
                    cannulaFit: option.value as CannulaFit
                  })} className="w-5 h-5" required />
                      <span className="font-medium text-gray-900">
                        {option.label}
                      </span>
                    </label>)}
                </div>
              </div>

              {(formData.cannulaFit === 'discomfort' || formData.cannulaFit === 'significant-leak') && <VMIField label="Notas sobre la cánula" placeholder="Ej: Paciente refiere presión en narina derecha" value={formData.cannulaNotes} onChange={e => setFormData({
              ...formData,
              cannulaNotes: e.target.value
            })} />}
            </div>
          </CollapsibleSection>

          {/* Humidification Section */}
          <CollapsibleSection title="Humidificación Activa" subtitle="Verificación del sistema">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={formData.humidificationWorking} onChange={e => setFormData({
                  ...formData,
                  humidificationWorking: e.target.checked
                })} className="w-6 h-6" />
                  <span className="text-lg font-medium">
                    Humidificación funcionando correctamente
                  </span>
                </label>
              </div>

              {!formData.humidificationWorking && <VMIField label="Problema detectado" educationKey="humidification" placeholder="Ej: Agua fría, condensación excesiva, nivel bajo" value={formData.humidificationIssue} onChange={e => setFormData({
              ...formData,
              humidificationIssue: e.target.value
            })} />}
            </div>
          </CollapsibleSection>

          {/* ROX Index Section */}
          <CollapsibleSection title="Índice ROX" subtitle="Predicción de éxito/fracaso de HFNC">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <VMIField label="SpO₂" educationKey="roxIndex" unit="%" type="number" value={formData.spo2} onChange={e => setFormData({
                ...formData,
                spo2: Number(e.target.value)
              })} required />
                <VMIField label="Frecuencia Respiratoria" educationKey="roxIndex" unit="rpm" type="number" value={formData.respiratoryRate} onChange={e => setFormData({
                ...formData,
                respiratoryRate: Number(e.target.value)
              })} required />
              </div>

              <div className={`p-4 rounded-xl ${calculations.roxIndex >= 4.88 ? 'bg-green-50' : calculations.roxIndex >= 3.85 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <div className="text-sm text-gray-600 mb-1">Índice ROX</div>
                <div className={`text-5xl font-bold ${calculations.roxIndex >= 4.88 ? 'text-green-600' : calculations.roxIndex >= 3.85 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {calculations.roxIndex}
                </div>
                <div className="text-sm mt-2 font-medium">
                  {calculations.roxIndex >= 4.88 && 'Bajo riesgo de fracaso'}
                  {calculations.roxIndex >= 3.85 && calculations.roxIndex < 4.88 && 'Riesgo moderado'}
                  {calculations.roxIndex < 3.85 && 'Alto riesgo de fracaso'}
                </div>
              </div>
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