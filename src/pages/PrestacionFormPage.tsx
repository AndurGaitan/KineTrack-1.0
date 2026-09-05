import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import * as prestacionesApi from '../api/prestacionesApi';
import { PrestacionType } from '../types';

const typeOptions: { value: PrestacionType; label: string }[] = [
  { value: 'kinesioterapia-motora', label: 'Kinesioterapia motora' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'progresion', label: 'Progresión' },
];

export function PrestacionFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients } = useApp();
  const patient = patients.find((p) => p.id === patientId);

  const [type, setType] = useState<PrestacionType | ''>('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <Header title="Registrar Prestación" showBack />
      <main className="max-w-2xl mx-auto p-4 space-y-6">
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
