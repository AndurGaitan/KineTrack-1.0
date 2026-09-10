import React, { useEffect, useMemo, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { CollapsibleSection } from '../components/ui/Tooltip';
import { VMIField, VMISelect } from '../components/VMIField';
import { AlertPanel } from '../components/AlertPanel';
import {
  AsynchronyType,
  MobilizationLevel,
  WeaningStatus,
  VentMode,
  VentControlVariable
} from '../types';
import {
  calculateVMI,
  generateVMIAlerts,
  calculateMechanicalPower
} from '../utils/vmiCalculations';
import { ventModes, mobilizationLevels } from '../utils/vmiEducation';
import { ZapIcon, EditIcon } from 'lucide-react';
import { EducationalTooltip } from '../components/ui/Tooltip';
import { vmiEducation } from '../utils/vmiEducation';

const asynchronyTypes = [
  { value: 'ineffective-effort', label: 'Esfuerzo inefectivo', description: 'Esfuerzo sin trigger' },
  { value: 'double-trigger', label: 'Doble disparo', description: 'Dos ciclos en un esfuerzo' },
  { value: 'premature-cycling', label: 'Ciclado prematuro', description: 'Termina antes de tiempo' },
  { value: 'delayed-cycling', label: 'Ciclado tardío', description: 'Termina después de tiempo' },
  { value: 'auto-peep', label: 'Auto-PEEP', description: 'Hiperinsuflación dinámica' }
];

const sbtTypeOptions = [
  { value: 'psv', label: 'Presión de Soporte (PSV)' },
  { value: 'cpap', label: 'CPAP' },
  { value: 't-piece', label: 'Tubo en T' }
];

// Helpers: keep numbers truly empty (avoid Number('') => 0)
const toNumberOrUndefined = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function VMIEntryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, addVMIRecord, sectors, getActiveEpisode } = useApp();

  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;

  const [formData, setFormData] = useState(() => ({
    // A) Ventilator Mode & Settings (MODE FIRST)
    ventMode: '' as VentMode | '',
    ventModeOther: '',
    controlVariable: '' as VentControlVariable | '',

    // PCI/PBW ya no se pide acá — se mide una vez en la ficha del paciente
    // (Contexto Clínico) y se hereda tal cual quedó guardado ahí.
    predictedBodyWeight: patient?.predictedBodyWeight ?? 0,

    // Vent params (no defaults)
    tidalVolumeSet: undefined as number | undefined,
    tidalVolumeExpired: undefined as number | undefined,
    controlPressure: undefined as number | undefined,
    supportPressure: undefined as number | undefined,
    inspiratoryTime: undefined as number | undefined,
    plateauPressure: undefined as number | undefined,
    peakPressure: undefined as number | undefined,
    peep: undefined as number | undefined,
    fio2: undefined as number | undefined,
    respiratoryRate: undefined as number | undefined,

    // B) Synchrony
    hasAsynchrony: false,
    asynchronyTypes: [] as AsynchronyType[],
    asynchronyFrequency: '' as '' | 'rare' | 'occasional' | 'frequent',

    // C) Oxygenation & Acid-Base (no defaults)
    spo2: undefined as number | undefined,
    pao2: undefined as number | undefined,
    paco2: undefined as number | undefined,
    ph: undefined as number | undefined,
    hco3: undefined as number | undefined,
    baseExcess: undefined as number | undefined,

    // D) Weaning
    weaningStatus: 'not-candidate' as WeaningStatus,
    sbtPerformed: false,
    sbtType: '' as '' | 'psv' | 'cpap' | 't-piece',
    sbtResult: '' as '' | 'success' | 'failure',
    sbtFailureReason: '',

    // E) Mobilization
    mobilizationLevel: 0 as MobilizationLevel,
    mobilizationBarrier: ''
  }));

  const [calculations, setCalculations] = useState(() => calculateVMI(formData));
  const [alerts, setAlerts] = useState<string[]>([]);

  const [mpResult, setMpResult] = useState(() =>
    calculateMechanicalPower({
      ventMode: formData.ventMode as VentMode,
      controlVariable: formData.controlVariable as VentControlVariable,
      respiratoryRate: formData.respiratoryRate,
      tidalVolumeExpired: formData.tidalVolumeExpired ?? 0,
      peep: formData.peep ?? 0,
      plateauPressure: formData.plateauPressure ?? 0,
      peakPressure: formData.peakPressure
    })
  );

  useEffect(() => {
    const calc = calculateVMI(formData);
    setCalculations(calc);

    const newAlerts = generateVMIAlerts(formData, calc);
    setAlerts(newAlerts);

    if (formData.ventMode && formData.controlVariable) {
      const mp = calculateMechanicalPower({
        ventMode: formData.ventMode as VentMode,
        controlVariable: formData.controlVariable as VentControlVariable,
        respiratoryRate: formData.respiratoryRate,
        tidalVolumeExpired: formData.tidalVolumeExpired ?? 0,
        peep: formData.peep ?? 0,
        plateauPressure: formData.plateauPressure ?? 0,
        peakPressure: formData.peakPressure
      });
      setMpResult(mp);
    } else {
      setMpResult({ canCalculate: false, isApproximation: false, reason: 'Seleccione modo y variable de control' });
    }
  }, [formData]);

  // Auto-set control variable when mode changes
  useEffect(() => {
    if (formData.ventMode) {
      const selectedMode = ventModes.find(m => m.value === formData.ventMode);
      if (selectedMode && selectedMode.control !== formData.controlVariable) {
        setFormData(prev => ({
          ...prev,
          controlVariable: selectedMode.control
        }));
      }
    } else if (formData.controlVariable) {
      setFormData(prev => ({ ...prev, controlVariable: '' as VentControlVariable | '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.ventMode]);

  // ✅ Minimal requirements (ONLY these 3)
  const canSave =
    !!formData.ventMode &&
    formData.peep != null &&
    formData.fio2 != null;

  const missingSummary = useMemo(() => {
    const missing: string[] = [];
    if (!formData.ventMode) missing.push('Modo ventilatorio');
    if (formData.peep == null) missing.push('PEEP');
    if (formData.fio2 == null) missing.push('FiO₂');
    return missing;
  }, [formData.ventMode, formData.peep, formData.fio2]);

  const pbwOk = formData.predictedBodyWeight > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!canSave) {
      setAlerts(prev => [
        `⚠️ Completá los campos mínimos antes de guardar: ${missingSummary.join(', ')}.`,
        ...prev
      ]);
      return;
    }

    addVMIRecord({
      patientId: patient!.id,
      episodeId: activeEpisode?.id,

      ventMode: formData.ventMode as VentMode,
      ventModeOther: formData.ventModeOther || undefined,
      controlVariable: formData.controlVariable ? (formData.controlVariable as VentControlVariable) : undefined,

      // PBW is OPTIONAL (stored if available)
      predictedBodyWeight: pbwOk ? formData.predictedBodyWeight : undefined,

      tidalVolumeSet: formData.tidalVolumeSet ?? undefined,
      tidalVolumeExpired: formData.tidalVolumeExpired ?? undefined,
      controlPressure: formData.controlPressure ?? undefined,
      supportPressure: formData.supportPressure ?? undefined,
      inspiratoryTime: formData.inspiratoryTime ?? undefined,
      plateauPressure: formData.plateauPressure ?? undefined,
      peakPressure: formData.peakPressure ?? undefined,
      peep: formData.peep!,
      fio2: formData.fio2!,
      respiratoryRate: formData.respiratoryRate ?? undefined,

      hasAsynchrony: formData.hasAsynchrony,
      asynchronyTypes: formData.asynchronyTypes,
      asynchronyFrequency: formData.asynchronyFrequency || undefined,

      spo2: formData.spo2 ?? undefined,
      pao2: formData.pao2 ?? undefined,
      paco2: formData.paco2 ?? undefined,
      ph: formData.ph ?? undefined,
      hco3: formData.hco3 ?? undefined,
      baseExcess: formData.baseExcess ?? undefined,

      weaningStatus: formData.weaningStatus,
      sbtPerformed: formData.sbtPerformed || undefined,
      sbtType: formData.sbtType || undefined,
      sbtResult: formData.sbtResult || undefined,
      sbtFailureReason: formData.sbtFailureReason || undefined,

      mobilizationLevel: formData.mobilizationLevel,
      mobilizationBarrier: formData.mobilizationBarrier || undefined,

      // Derived metrics become OPTIONAL-friendly (if missing inputs, they will be 0/undefined)
      vtPerKg: calculations.vtPerKg || undefined,
      drivingPressure: calculations.drivingPressure || undefined,
      pfRatio: calculations.pfRatio,
      compliance: calculations.compliance,

      // IMPORTANT: use MP from mpResult
      mechanicalPower: mpResult.value,

      protectiveVentilation: calculations.protectiveVentilation,
      alerts
    });

    navigate(`/patient/${patient!.id}/vmi`);
  };

  if (!patient || patient.supportType !== 'imv') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">Este módulo solo está disponible para pacientes en VMI</p>
      </div>
    );
  }

  const toggleAsynchronyType = (type: AsynchronyType) => {
    setFormData(prev => ({
      ...prev,
      asynchronyTypes: prev.asynchronyTypes.includes(type)
        ? prev.asynchronyTypes.filter(t => t !== type)
        : [...prev.asynchronyTypes, type]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Monitorización VMI" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Herramienta avanzada de VMI:</strong> Este módulo está diseñado para terapeutas con
            manejo avanzado de ventilación mecánica, y para ayudar a quienes están en formación a pensar
            como un experto.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Ventilator Mode (FIRST) */}
          <CollapsibleSection title="1) Modo Ventilatorio" subtitle="VCV, PCV o PSV">
            <div className="space-y-4">
              <VMISelect
                label="Modo Ventilatorio"
                educationKey="ventMode"
                options={ventModes.map(m => ({ value: m.value, label: m.label }))}
                value={formData.ventMode}
                onChange={e => setFormData({ ...formData, ventMode: e.target.value as VentMode })}
                required
              />

              {formData.ventMode && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-sm text-gray-700 mb-2">
                    <strong>Variable de control:</strong>{' '}
                    {formData.controlVariable === 'volume' ? 'Volumen' : 'Presión'}
                  </div>
                  <p className="text-xs text-gray-600">
                    {formData.controlVariable === 'volume' && 'El ventilador garantiza el volumen programado (VT)'}
                    {formData.controlVariable === 'pressure' &&
                      formData.ventMode === 'PC' &&
                      'El ventilador garantiza la presión control programada'}
                    {formData.controlVariable === 'pressure' &&
                      formData.ventMode === 'PSV' &&
                      'El ventilador asiste con la presión de soporte programada ante cada esfuerzo del paciente'}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* STEP 2: Mode-specific parameter + common parameters */}
          {formData.ventMode && (
            <CollapsibleSection title="2) Parámetros" subtitle="Parámetro propio del modo + parámetros comunes">
              <div className="space-y-4">
                {formData.ventMode === 'VC' && (
                  <VMIField
                    label="VT (Volumen Tidal Programado)"
                    unit="ml"
                    type="number"
                    value={formData.tidalVolumeSet ?? ''}
                    onChange={e => setFormData({ ...formData, tidalVolumeSet: toNumberOrUndefined(e.target.value) })}
                  />
                )}
                {formData.ventMode === 'PC' && (
                  <VMIField
                    label="PC (Presión Control)"
                    educationKey="controlPressure"
                    unit="cmH₂O"
                    type="number"
                    value={formData.controlPressure ?? ''}
                    onChange={e => setFormData({ ...formData, controlPressure: toNumberOrUndefined(e.target.value) })}
                  />
                )}
                {formData.ventMode === 'PSV' && (
                  <VMIField
                    label="PS (Presión de Soporte)"
                    educationKey="supportPressure"
                    unit="cmH₂O"
                    type="number"
                    value={formData.supportPressure ?? ''}
                    onChange={e => setFormData({ ...formData, supportPressure: toNumberOrUndefined(e.target.value) })}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <VMIField
                    label="Ti (Tiempo Inspiratorio)"
                    educationKey="inspiratoryTime"
                    unit="seg"
                    type="number"
                    step="0.1"
                    value={formData.inspiratoryTime ?? ''}
                    onChange={e => setFormData({ ...formData, inspiratoryTime: toNumberOrUndefined(e.target.value) })}
                  />
                  <VMIField
                    label="FR (Frecuencia Resp.)"
                    unit="rpm"
                    type="number"
                    value={formData.respiratoryRate ?? ''}
                    onChange={e => setFormData({ ...formData, respiratoryRate: toNumberOrUndefined(e.target.value) })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <VMIField
                    label="PEEP"
                    educationKey="peep"
                    unit="cmH₂O"
                    type="number"
                    value={formData.peep ?? ''}
                    onChange={e => setFormData({ ...formData, peep: toNumberOrUndefined(e.target.value) })}
                    required
                  />
                  {/* FiO₂ bug fix: only clamp on blur, not on every keystroke — clamping
                      live corrupted typing (e.g. typing "5" of "55" snapped to 21). */}
                  <VMIField
                    label="FiO₂"
                    educationKey="fio2"
                    unit="%"
                    type="number"
                    value={formData.fio2 ?? ''}
                    onChange={e => setFormData({ ...formData, fio2: toNumberOrUndefined(e.target.value) })}
                    onBlur={e => {
                      const n = toNumberOrUndefined(e.target.value);
                      if (n != null) setFormData(prev => ({ ...prev, fio2: clamp(n, 21, 100) }));
                    }}
                    required
                  />
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* STEP 3: Predicted Body Weight (PCI/PBW) */}
          {formData.ventMode && (
            <CollapsibleSection title="3) Peso Corporal Ideal (PCI)" subtitle="Se mide una sola vez en la ficha del paciente">
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${pbwOk ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="text-sm text-gray-600 mb-1">PCI / PBW (Peso Predicho)</div>
                  <div className={`text-3xl font-bold ${pbwOk ? 'text-blue-900' : 'text-gray-400'}`}>
                    {pbwOk ? `${formData.predictedBodyWeight} kg` : '—'}
                  </div>
                  {pbwOk ? (
                    <div className="text-sm text-gray-600 mt-2">
                      Calculado de sexo y talla ({patient.sex === 'male' ? 'Masculino' : 'Femenino'}, {patient.heightCm} cm) cargados en la
                      ficha del paciente.
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mt-2">
                      Este paciente no tiene sexo/talla cargados — no bloquea el guardado, pero el Vt/kg no se va a poder calcular.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/${patient.id}/edit`)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 mt-3"
                  >
                    <EditIcon className="w-4 h-4" />
                    {pbwOk ? 'Corregir en la ficha del paciente' : 'Cargar sexo y talla en la ficha del paciente'}
                  </button>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* STEP 4: Advanced Monitoring (Pplat, Ppeak, Vt Espirado/Vt-kg, ΔP, Compliance, Mechanical Power) */}
          {formData.ventMode && (
            <CollapsibleSection title="4) Monitorización Avanzada" subtitle="Protección pulmonar y Mechanical Power">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <VMIField
                    label="Vt Espirado"
                    educationKey="vtPerKg_ardsnet2000"
                    unit="ml"
                    type="number"
                    value={formData.tidalVolumeExpired ?? ''}
                    onChange={e => setFormData({ ...formData, tidalVolumeExpired: toNumberOrUndefined(e.target.value) })}
                  />
                  <VMIField
                    label="Presión Plateau"
                    educationKey="plateauPressure"
                    unit="cmH₂O"
                    type="number"
                    value={formData.plateauPressure ?? ''}
                    onChange={e => setFormData({ ...formData, plateauPressure: toNumberOrUndefined(e.target.value) })}
                  />
                </div>

                {calculations.vtPerKg > 0 && (
                  <div className={`p-4 rounded-xl ${calculations.vtPerKg > 8 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="text-sm text-gray-600 mb-1">Vt/kg calculado</div>
                    <div className={`text-3xl font-bold ${calculations.vtPerKg > 8 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculations.vtPerKg} ml/kg
                    </div>
                  </div>
                )}

                <VMIField
                  label="Presión Pico (Ppeak)"
                  educationKey="peakPressure"
                  unit="cmH₂O"
                  type="number"
                  value={formData.peakPressure ?? ''}
                  onChange={e => setFormData({ ...formData, peakPressure: toNumberOrUndefined(e.target.value) })}
                />

                {calculations.drivingPressure > 0 && (
                  <div className={`p-4 rounded-xl ${calculations.drivingPressure > 15 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="text-sm text-gray-600 mb-1">Driving Pressure (ΔP)</div>
                    <div className={`text-3xl font-bold ${calculations.drivingPressure > 15 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculations.drivingPressure} cmH₂O
                    </div>
                  </div>
                )}

                {calculations.compliance && (
                  <div className="p-4 rounded-xl bg-blue-50">
                    <div className="text-sm text-gray-600 mb-1">Compliance Estática</div>
                    <div className="text-2xl font-bold text-blue-900">{calculations.compliance} ml/cmH₂O</div>
                  </div>
                )}

                {/* Mechanical Power */}
                {formData.controlVariable && (
                  <div className="pt-2 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm text-amber-900">
                        <strong>Mechanical Power</strong> estima la energía por minuto transferida al sistema respiratorio.
                        Es un indicador integrador y no reemplaza el juicio clínico.
                      </p>
                      <EducationalTooltip content={vmiEducation.mechanicalPower_gattinoni2016} />
                    </div>

                    {mpResult.canCalculate ? (
                      <>
                        <div
                          className={`p-6 rounded-xl text-center ${
                            (mpResult.value ?? 0) > 17 ? 'bg-red-50' : (mpResult.value ?? 0) > 12 ? 'bg-yellow-50' : 'bg-green-50'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <ZapIcon
                              className={`w-6 h-6 ${
                                (mpResult.value ?? 0) > 17 ? 'text-red-600' : (mpResult.value ?? 0) > 12 ? 'text-yellow-600' : 'text-green-600'
                              }`}
                            />
                            <div className="text-sm text-gray-600">Mechanical Power</div>
                          </div>
                          <div
                            className={`text-5xl font-bold ${
                              (mpResult.value ?? 0) > 17 ? 'text-red-600' : (mpResult.value ?? 0) > 12 ? 'text-yellow-600' : 'text-green-600'
                            }`}
                          >
                            {mpResult.value}
                          </div>
                          <div className="text-lg font-medium mt-1">J/min</div>
                          <div className="text-sm mt-3 font-medium">
                            {(mpResult.value ?? 0) > 17 && 'Alto riesgo de VILI'}
                            {(mpResult.value ?? 0) > 12 && (mpResult.value ?? 0) <= 17 && 'Zona gris - Monitoreo estrecho'}
                            {(mpResult.value ?? 0) <= 12 && 'Rango seguro'}
                          </div>
                        </div>

                        {mpResult.isApproximation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-sm text-blue-900">
                              ℹ️ <strong>Estimación:</strong> {mpResult.reason}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-gray-50 border border-gray-300 rounded-xl p-6 text-center">
                        <p className="text-gray-600 font-medium mb-2">MP no calculable</p>
                        <p className="text-sm text-gray-500">{mpResult.reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* B) Synchrony */}
          <CollapsibleSection title="5) Sincronía Paciente-Ventilador" subtitle="Evaluación de asincronías">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.hasAsynchrony}
                    onChange={e => setFormData({ ...formData, hasAsynchrony: e.target.checked })}
                    className="w-6 h-6"
                  />
                  <span className="text-lg font-medium">Se observan asincronías</span>
                </label>
              </div>

              {formData.hasAsynchrony && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tipos de asincronía detectados</label>
                    <div className="space-y-2">
                      {asynchronyTypes.map(type => (
                        <label
                          key={type.value}
                          className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={formData.asynchronyTypes.includes(type.value as AsynchronyType)}
                            onChange={() => toggleAsynchronyType(type.value as AsynchronyType)}
                            className="w-5 h-5 mt-0.5"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{type.label}</div>
                            <div className="text-sm text-gray-600">{type.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <VMISelect
                    label="Frecuencia de asincronías"
                    options={[
                      { value: 'rare', label: 'Raras (< 5%)' },
                      { value: 'occasional', label: 'Ocasionales (5-10%)' },
                      { value: 'frequent', label: 'Frecuentes (> 10%)' }
                    ]}
                    value={formData.asynchronyFrequency}
                    onChange={e => setFormData({ ...formData, asynchronyFrequency: e.target.value as any })}
                  />
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* C) Oxygenation & Acid-Base — orden de reporte de gasometría:
              pH, PaCO₂, PaO₂, HCO₃, SatO₂, Exceso de Bases (FiO₂ ya se
              carga en Configuración del Ventilador, arriba). */}
          <CollapsibleSection title="6) Oxigenación y Equilibrio Ácido-Base" subtitle="Gasometría y parámetros de intercambio">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* pH bug fix: same clamp-on-blur pattern. */}
                <VMIField
                  label="pH"
                  type="number"
                  step="0.01"
                  value={formData.ph ?? ''}
                  onChange={e => setFormData({ ...formData, ph: toNumberOrUndefined(e.target.value) })}
                  onBlur={e => {
                    const n = toNumberOrUndefined(e.target.value);
                    if (n != null) setFormData(prev => ({ ...prev, ph: clamp(n, 6.8, 7.8) }));
                  }}
                />
                <VMIField
                  label="PaCO₂"
                  unit="mmHg"
                  type="number"
                  value={formData.paco2 ?? ''}
                  onChange={e => setFormData({ ...formData, paco2: toNumberOrUndefined(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <VMIField
                  label="PaO₂"
                  educationKey="pfRatio"
                  unit="mmHg"
                  type="number"
                  value={formData.pao2 ?? ''}
                  onChange={e => setFormData({ ...formData, pao2: toNumberOrUndefined(e.target.value) })}
                />
                <VMIField
                  label="HCO₃"
                  educationKey="hco3"
                  unit="mEq/L"
                  type="number"
                  step="0.1"
                  value={formData.hco3 ?? ''}
                  onChange={e => setFormData({ ...formData, hco3: toNumberOrUndefined(e.target.value) })}
                />
              </div>

              {calculations.pfRatio && (
                <div className={`p-4 rounded-xl ${calculations.pfRatio < 200 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div className="text-sm text-gray-600 mb-1">Relación P/F</div>
                  <div className={`text-3xl font-bold ${calculations.pfRatio < 200 ? 'text-red-600' : 'text-green-600'}`}>
                    {calculations.pfRatio}
                  </div>
                  <div className="text-sm mt-1 text-gray-700">
                    {calculations.pfRatio < 100 && 'SDRA Severo'}
                    {calculations.pfRatio >= 100 && calculations.pfRatio < 200 && 'SDRA Moderado'}
                    {calculations.pfRatio >= 200 && calculations.pfRatio < 300 && 'SDRA Leve'}
                    {calculations.pfRatio >= 300 && 'Normal'}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* SpO₂ bug fix: same clamp-on-blur pattern (min=0 rarely triggered
                    the bug in practice, kept consistent anyway). */}
                <VMIField
                  label="SpO₂"
                  unit="%"
                  type="number"
                  value={formData.spo2 ?? ''}
                  onChange={e => setFormData({ ...formData, spo2: toNumberOrUndefined(e.target.value) })}
                  onBlur={e => {
                    const n = toNumberOrUndefined(e.target.value);
                    if (n != null) setFormData(prev => ({ ...prev, spo2: clamp(n, 0, 100) }));
                  }}
                />
                <VMIField
                  label="Exceso de Bases (BE)"
                  unit="mEq/L"
                  type="number"
                  step="0.1"
                  value={formData.baseExcess ?? ''}
                  onChange={e => setFormData({ ...formData, baseExcess: toNumberOrUndefined(e.target.value) })}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* D) Weaning */}
          <CollapsibleSection title="7) Destete de la Ventilación" subtitle="Evaluación y pruebas de destete">
            <div className="space-y-4">
              <VMISelect
                label="Estado de Destete"
                options={[
                  { value: 'not-candidate', label: 'No candidato' },
                  { value: 'candidate', label: 'Candidato a destete' },
                  { value: 'sbt-trial', label: 'En prueba de respiración espontánea' },
                  { value: 'extubated', label: 'Extubado' }
                ]}
                value={formData.weaningStatus}
                onChange={e => setFormData({ ...formData, weaningStatus: e.target.value as WeaningStatus })}
                required
              />

              {(formData.weaningStatus === 'candidate' || formData.weaningStatus === 'sbt-trial') && (
                <>
                  <div>
                    <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.sbtPerformed}
                        onChange={e => setFormData({ ...formData, sbtPerformed: e.target.checked })}
                        className="w-6 h-6"
                      />
                      <span className="text-lg font-medium">SBT realizada</span>
                    </label>
                  </div>

                  {formData.sbtPerformed && (
                    <>
                      {/* Bug fix: "Tipo de SBT" era texto libre, pero el backend
                          solo acepta 'psv' | 'cpap' | 't-piece' — cualquier otro
                          texto (como sugería el placeholder anterior) hacía
                          fallar el guardado completo del registro. */}
                      <VMISelect
                        label="Tipo de SBT"
                        options={sbtTypeOptions}
                        value={formData.sbtType}
                        onChange={e => setFormData({ ...formData, sbtType: e.target.value as any })}
                      />

                      <VMISelect
                        label="Resultado de SBT"
                        options={[
                          { value: 'success', label: 'Exitosa' },
                          { value: 'failure', label: 'Fallida' }
                        ]}
                        value={formData.sbtResult}
                        onChange={e => setFormData({ ...formData, sbtResult: e.target.value as any })}
                      />

                      {formData.sbtResult === 'failure' && (
                        <VMIField
                          label="Motivo de falla"
                          placeholder="Ej: Taquipnea, desaturación"
                          value={formData.sbtFailureReason}
                          onChange={e => setFormData({ ...formData, sbtFailureReason: e.target.value })}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* E) Mobilization */}
          <CollapsibleSection title="8) Movilización y Rehabilitación" subtitle="Nivel de actividad física">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nivel máximo de movilización</label>
                <div className="space-y-2">
                  {mobilizationLevels.map(level => (
                    <label
                      key={level.value}
                      className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                        formData.mobilizationLevel === level.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mobilization"
                        checked={formData.mobilizationLevel === level.value}
                        onChange={() => setFormData({ ...formData, mobilizationLevel: level.value as MobilizationLevel })}
                        className="w-5 h-5 mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-gray-900">{level.label}</div>
                        <div className="text-sm text-gray-600">{level.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {formData.mobilizationLevel === 0 && (
                <VMIField
                  label="Barrera para movilización"
                  placeholder="Ej: Inestabilidad hemodinámica, sedación profunda"
                  value={formData.mobilizationBarrier}
                  onChange={e => setFormData({ ...formData, mobilizationBarrier: e.target.value })}
                />
              )}
            </div>
          </CollapsibleSection>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Evaluación Clínica</h3>
              <AlertPanel alerts={alerts} />
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={!canSave}>
              Guardar Monitorización
            </Button>
          </div>

          {!canSave && (
            <div className="text-xs text-gray-500 -mt-2">
              Para guardar completá: {missingSummary.join(', ')}.
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
