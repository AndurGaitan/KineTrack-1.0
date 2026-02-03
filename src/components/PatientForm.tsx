import React, { useState } from 'react';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { Patient, Sector, SupportType } from '../types';
interface PatientFormProps {
  sectors: Sector[];
  initialData?: Patient;
  prefilledSectorId?: string;
  prefilledBed?: string;
  onSubmit: (data: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'>) => void;
  onCancel: () => void;
}
export function PatientForm({
  sectors,
  initialData,
  prefilledSectorId,
  prefilledBed,
  onSubmit,
  onCancel
}: PatientFormProps) {
  const [formData, setFormData] = useState({
    alias: initialData?.alias || '',
    sectorId: initialData?.sectorId || prefilledSectorId || '',
    bed: initialData?.bed?.toString() || prefilledBed || '',
    supportType: initialData?.supportType || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedSector = sectors.find(s => s.id === formData.sectorId);
  const bedOptions = selectedSector ? Array.from({
    length: selectedSector.beds
  }, (_, i) => ({
    value: (i + 1).toString(),
    label: `Cama ${i + 1}`
  })) : [];
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.alias) newErrors.alias = 'Requerido';
    if (!formData.sectorId) newErrors.sectorId = 'Requerido';
    if (!formData.bed) newErrors.bed = 'Requerido';
    if (!formData.supportType) newErrors.supportType = 'Requerido';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit({
      alias: formData.alias,
      sectorId: formData.sectorId,
      bed: parseInt(formData.bed),
      supportType: formData.supportType as SupportType
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
      bed: ''
    })} options={sectors.map(s => ({
      value: s.id,
      label: s.name
    }))} error={errors.sectorId} />

      {formData.sectorId && <Select label="Cama" value={formData.bed} onChange={e => setFormData({
      ...formData,
      bed: e.target.value
    })} options={bedOptions} error={errors.bed} />}

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
      value: 'conventional-oxygen',
      label: 'Oxígeno Convencional'
    }, {
      value: 'room-air',
      label: 'Aire Ambiente'
    }]} error={errors.supportType} />

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