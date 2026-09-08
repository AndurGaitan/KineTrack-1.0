import { useState, FormEvent } from 'react';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { Patient, Sector, SupportType } from '../types';
import { calculatePBWKg, Sex } from '../utils/vmiCalculations';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
interface PatientFormProps {
  sectors: Sector[];
  initialData?: Patient;
  prefilledSectorId?: string;
  prefilledBedId?: string;
  onSubmit: (data: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'>) => void;
  onCancel: () => void;
}
export function PatientForm({
  sectors,
  initialData,
  prefilledSectorId,
  prefilledBedId,
  onSubmit,
  onCancel
}: PatientFormProps) {
  const [formData, setFormData] = useState({
    alias: initialData?.alias || '',
    sectorId: initialData?.sectorId || prefilledSectorId || '',
    bedId: initialData?.bedId || prefilledBedId || '',
    supportType: initialData?.supportType || '',
    age: initialData?.age?.toString() || '',
    admissionDiagnosis: initialData?.admissionDiagnosis || '',
    antecedentes: initialData?.antecedentes || [] as string[],
    sex: (initialData?.sex ?? '') as Sex | '',
    heightCm: initialData?.heightCm ?? undefined as number | undefined
  });
  const [newAntecedente, setNewAntecedente] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const addAntecedente = () => {
    const trimmed = newAntecedente.trim();
    if (!trimmed) return;
    setFormData(f => ({ ...f, antecedentes: [...f.antecedentes, trimmed] }));
    setNewAntecedente('');
  };
  // PCI/PBW se recalcula automático de sexo+talla — misma fórmula ARDSNet que
  // usa el módulo VMI. No se re-pide en cada monitorización: se mide una vez
  // acá y de ahí en más se hereda (frontend/src/pages/VMIEntryPage.tsx).
  const predictedBodyWeight = formData.sex && formData.heightCm ? calculatePBWKg(formData.heightCm, formData.sex) ?? undefined : undefined;
  const removeAntecedente = (index: number) => {
    setFormData(f => ({ ...f, antecedentes: f.antecedentes.filter((_, i) => i !== index) }));
  };
  const selectedSector = sectors.find(s => s.id === formData.sectorId);
  const bedOptions = (selectedSector?.beds ?? [])
    .filter(b => b.active || b.id === initialData?.bedId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(b => ({
      value: b.id,
      label: `Cama ${b.label}`
    }));
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.alias) newErrors.alias = 'Requerido';
    if (!formData.sectorId) newErrors.sectorId = 'Requerido';
    if (!formData.bedId) newErrors.bedId = 'Requerido';
    if (!formData.supportType) newErrors.supportType = 'Requerido';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit({
      alias: formData.alias,
      sectorId: formData.sectorId,
      bedId: formData.bedId,
      supportType: formData.supportType as SupportType,
      age: formData.age ? Number(formData.age) : undefined,
      admissionDiagnosis: formData.admissionDiagnosis.trim() || undefined,
      antecedentes: formData.antecedentes,
      sex: formData.sex || undefined,
      heightCm: formData.heightCm,
      predictedBodyWeight
    });
  };
  return <form onSubmit={handleSubmit} className="space-y-6">
      <Input label="Alias del Paciente" value={formData.alias} onChange={e => setFormData({
      ...formData,
      alias: e.target.value
    })} placeholder="Ej: PAC-001" error={errors.alias} />

      <Select label="Sector" value={formData.sectorId} onChange={e => setFormData({
      ...formData,
      sectorId: e.target.value,
      bedId: ''
    })} options={sectors.map(s => ({
      value: s.id,
      label: s.name
    }))} error={errors.sectorId} />

      {formData.sectorId && <Select label="Cama" value={formData.bedId} onChange={e => setFormData({
      ...formData,
      bedId: e.target.value
    })} options={bedOptions} error={errors.bedId} />}

      <Select label="Tipo de Soporte Respiratorio" value={formData.supportType} onChange={e => setFormData({
      ...formData,
      supportType: e.target.value
    })} options={[{
      value: 'imv',
      label: 'VMI - Ventilación Mecánica Invasiva'
    }, {
      value: 'niv',
      label: 'VNI - Ventilación No Invasiva'
    }, {
      value: 'hfnc',
      label: 'HFNC - Cánula Nasal de Alto Flujo'
    }, {
      value: 'traqueostomia',
      label: 'Traqueostomía - Respiración Espontánea'
    }, {
      value: 'conventional-oxygen',
      label: 'Oxígeno Convencional'
    }, {
      value: 'room-air',
      label: 'Aire Ambiente'
    }]} error={errors.supportType} />

      <div className="pt-2 space-y-6">
        <h2 className="text-lg font-bold text-gray-900 -mb-2">Contexto Clínico (opcional)</h2>

        <Input label="Edad" type="number" min="0" max="120" value={formData.age} onChange={e => setFormData({
        ...formData,
        age: e.target.value
      })} placeholder="Ej: 68" />

        <Input label="Diagnóstico de ingreso" value={formData.admissionDiagnosis} onChange={e => setFormData({
        ...formData,
        admissionDiagnosis: e.target.value
      })} placeholder="Ej: Neumonía grave, EPOC reagudizado" />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Sexo" value={formData.sex} onChange={e => setFormData({
          ...formData,
          sex: e.target.value as Sex
        })} options={[{
          value: 'male',
          label: 'Masculino'
        }, {
          value: 'female',
          label: 'Femenino'
        }]} />

          <Input label="Talla (cm)" type="number" value={formData.heightCm ?? ''} onChange={e => {
          const v = e.target.value;
          setFormData({
            ...formData,
            heightCm: v === '' ? undefined : Number(v)
          });
        }} onBlur={e => {
          const v = e.target.value;
          if (v === '') return;
          setFormData(f => ({
            ...f,
            heightCm: clamp(Number(v), 120, 220)
          }));
        }} placeholder="Ej: 170" />
        </div>

        <div className={`p-4 rounded-xl ${predictedBodyWeight ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <div className="text-sm text-gray-600 mb-1">PCI / PBW (Peso Predicho) — usado en VMI</div>
          <div className={`text-2xl font-bold ${predictedBodyWeight ? 'text-blue-900' : 'text-gray-400'}`}>
            {predictedBodyWeight ? `${predictedBodyWeight} kg` : '—'}
          </div>
          {!predictedBodyWeight && <div className="text-sm text-gray-600 mt-1">Completá sexo y talla para calcularlo automáticamente.</div>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Antecedentes</label>
          {formData.antecedentes.length > 0 && <div className="flex flex-wrap gap-2 mb-3">
              {formData.antecedentes.map((item, i) => <span key={i} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                  {item}
                  <button type="button" onClick={() => removeAntecedente(i)} aria-label={`Quitar ${item}`} className="text-gray-400 hover:text-gray-700">
                    ✕
                  </button>
                </span>)}
            </div>}
          <div className="flex gap-2">
            <input type="text" value={newAntecedente} onChange={e => setNewAntecedente(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addAntecedente();
            }
          }} placeholder="Ej: HTA, EPOC, DBT tipo 2..." className="flex-1 min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none" />
            <Button type="button" variant="secondary" onClick={addAntecedente}>
              + Agregar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
          Cancelar
        </Button>
        <Button type="submit" fullWidth>
          Guardar
        </Button>
      </div>
    </form>;
}
