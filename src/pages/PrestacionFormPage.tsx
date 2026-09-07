import { useState, FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import * as prestacionesApi from '../api/prestacionesApi';
import { OxygenDeviceType, PrestacionType } from '../types';

const typeOptions: { value: PrestacionType; label: string }[] = [
  { value: 'kinesioterapia-respiratoria', label: 'Kinesioterapia respiratoria' },
  { value: 'kinesioterapia-motora', label: 'Kinesioterapia motora' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'progresion', label: 'Progresión' },
];

const oxygenDeviceOptions: { value: OxygenDeviceType; label: string }[] = [
  { value: 'canula-nasal-simple', label: 'Cánula nasal simple' },
  { value: 'mascara-simple', label: 'Máscara simple' },
  { value: 'mascara-venturi', label: 'Máscara Venturi' },
  { value: 'mascara-no-reinhalacion', label: 'Máscara de no reinhalación' },
];

export function PrestacionFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patients } = useApp();
  const patient = patients.find((p) => p.id === patientId);

  const prefilledType = searchParams.get('type');
  const isValidType = (t: string | null): t is PrestacionType =>
    t === 'kinesioterapia-respiratoria' || t === 'kinesioterapia-motora' || t === 'evaluacion' || t === 'progresion';
  const [type, setType] = useState<PrestacionType | ''>(isValidType(prefilledType) ? prefilledType : '');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [oxygenDevice, setOxygenDevice] = useState<OxygenDeviceType | ''>('');
  const [oxygenLiters, setOxygenLiters] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showOxygenFields = type === 'kinesioterapia-respiratoria' && patient?.supportType === 'conventional-oxygen';

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Paciente no encontrado</p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!type) return;
    setSubmitting(true);
    setError(null);
    try {
      await prestacionesApi.createPrestacion({
        patientId: patient.id,
        type,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        notes: notes || undefined,
        oxygenDevice: showOxygenFields && oxygenDevice ? oxygenDevice : undefined,
        oxygenLiters: showOxygenFields && oxygenLiters ? Number(oxygenLiters) : undefined,
      });
      navigate(`/patient/${patient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la prestación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={type ? typeOptions.find((o) => o.value === type)?.label ?? 'Registrar Prestación' : 'Registrar Prestación'} showBack />
      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Tipo de prestación"
            value={type}
            onChange={(e) => setType(e.target.value as PrestacionType)}
            options={typeOptions}
            required
          />

          {showOxygenFields && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
              <p className="text-sm text-blue-900">
                <strong>💡</strong> Paciente con O₂ convencional — registrá el dispositivo y el flujo actual.
              </p>
              <Select
                label="Dispositivo de O₂ (opcional)"
                value={oxygenDevice}
                onChange={(e) => setOxygenDevice(e.target.value as OxygenDeviceType)}
                options={oxygenDeviceOptions}
              />
              <Input
                label="Flujo de O₂ en litros/min (opcional)"
                type="number"
                step="0.5"
                min="0"
                value={oxygenLiters}
                onChange={(e) => setOxygenLiters(e.target.value)}
                placeholder="Ej: 3"
              />
            </div>
          )}

          <Input
            label="Duración (minutos, opcional)"
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="Ej: 20"
          />
          <Input
            label="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Sedestación al borde de la cama, buena tolerancia"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={!type || submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
