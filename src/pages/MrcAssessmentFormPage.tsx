import { useMemo, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import * as mrcApi from '../api/mrcApi';
import { MrcScores, MrcStatus } from '../types';

const MUSCLE_GROUPS: { key: keyof MrcScores; label: string }[] = [
  { key: 'shoulderAbductionRight', label: 'Abducción de hombro' },
  { key: 'elbowFlexionRight', label: 'Flexión de codo' },
  { key: 'wristExtensionRight', label: 'Extensión de muñeca' },
  { key: 'hipFlexionRight', label: 'Flexión de cadera' },
  { key: 'kneeExtensionRight', label: 'Extensión de rodilla' },
  { key: 'ankleDorsiflexionRight', label: 'Dorsiflexión de tobillo' },
];

const statusOptions: { value: MrcStatus; label: string }[] = [
  { value: 'evaluable', label: 'Evaluable' },
  { value: 'no-evaluable', label: 'No evaluable' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'desconocido', label: 'Desconocido' },
];

const scoreChoices = [0, 1, 2, 3, 4, 5];

function leftKeyFor(rightKey: keyof MrcScores): keyof MrcScores {
  return rightKey.replace('Right', 'Left') as keyof MrcScores;
}

export function MrcAssessmentFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients } = useApp();
  const patient = patients.find((p) => p.id === patientId);

  const [status, setStatus] = useState<MrcStatus>('evaluable');
  const [scores, setScores] = useState<MrcScores>({});
  const [daucicConfirmed, setDaucicConfirmed] = useState<'' | 'si' | 'no'>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    const values = MUSCLE_GROUPS.flatMap((g) => [scores[g.key], scores[leftKeyFor(g.key)]]);
    if (values.some((v) => v === undefined)) return undefined;
    return (values as number[]).reduce((sum, v) => sum + v, 0);
  }, [scores]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Paciente no encontrado</p>
      </div>
    );
  }

  const setScore = (key: keyof MrcScores, value: string) => {
    setScores((prev) => ({ ...prev, [key]: value === '' ? undefined : Number(value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await mrcApi.createMrcAssessment({
        patientId: patient.id,
        status,
        daucicConfirmed: daucicConfirmed === '' ? undefined : daucicConfirmed === 'si',
        ...scores,
      });
      navigate(`/patient/${patient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la evaluación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Evaluación MRC" showBack />
      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-900">
            MRC Sum Score (0-60). <strong>MRC &lt; 48</strong> es un criterio de referencia para debilidad adquirida en
            UCI (DAUCI), pero no genera automáticamente el diagnóstico — la confirmación es una decisión clínica
            aparte.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Select label="Estado de la evaluación" value={status} onChange={(e) => setStatus(e.target.value as MrcStatus)} options={statusOptions} />

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 px-1">
              <div>Grupo muscular</div>
              <div className="text-center">Derecha</div>
              <div className="text-center">Izquierda</div>
            </div>
            {MUSCLE_GROUPS.map((g) => (
              <div key={g.key} className="grid grid-cols-3 gap-2 items-center">
                <div className="text-sm text-gray-900">{g.label}</div>
                <select
                  value={scores[g.key] ?? ''}
                  onChange={(e) => setScore(g.key, e.target.value)}
                  className="min-h-[44px] px-2 border-2 border-gray-300 rounded-lg text-center bg-white"
                >
                  <option value="">-</option>
                  {scoreChoices.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={scores[leftKeyFor(g.key)] ?? ''}
                  onChange={(e) => setScore(leftKeyFor(g.key), e.target.value)}
                  className="min-h-[44px] px-2 border-2 border-gray-300 rounded-lg text-center bg-white"
                >
                  <option value="">-</option>
                  {scoreChoices.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="bg-gray-100 rounded-2xl p-4 text-center">
            <div className="text-sm text-gray-600">MRC Sum Score</div>
            <div className={`text-4xl font-bold ${total !== undefined && total < 48 ? 'text-red-600' : 'text-gray-900'}`}>
              {total ?? '—'}
            </div>
            {total !== undefined && total < 48 && (
              <div className="text-xs text-red-600 mt-1">Por debajo de 48 — criterio de referencia para DAUCI</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">¿Se confirma diagnóstico de DAUCI?</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDaucicConfirmed('si')}
                className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${daucicConfirmed === 'si' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setDaucicConfirmed('no')}
                className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${daucicConfirmed === 'no' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                No
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Evaluación'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
