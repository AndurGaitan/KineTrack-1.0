import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { BlueTestResult, SwallowingTestResult } from '../types';

export function TrachEntryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, addTrachRecord, getActiveEpisode, sectors } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  const sector = patient ? sectors.find((s) => s.id === patient.sectorId) : null;
  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;

  const [glasgow, setGlasgow] = useState('15');
  const [pemax, setPemax] = useState('');
  const [cuffDeflationPerformed, setCuffDeflationPerformed] = useState(false);
  const [cuffDeflationTolerated, setCuffDeflationTolerated] = useState<'' | 'si' | 'no'>('');
  const [cuffDeflationNotes, setCuffDeflationNotes] = useState('');
  const [cappedTrialPerformed, setCappedTrialPerformed] = useState(false);
  const [cappedTrialTolerated, setCappedTrialTolerated] = useState<'' | 'si' | 'no'>('');
  const [cappedTrialNotes, setCappedTrialNotes] = useState('');
  const [swallowingTest, setSwallowingTest] = useState<SwallowingTestResult | ''>('');
  const [blueTest, setBlueTest] = useState<BlueTestResult | ''>('');
  const [submitting, setSubmitting] = useState(false);

  if (!patient || patient.supportType !== 'traqueostomia') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">Este módulo solo está disponible para pacientes traqueostomizados</p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addTrachRecord({
        patientId: patient.id,
        episodeId: activeEpisode?.id,
        glasgow: Number(glasgow),
        pemax: pemax ? Number(pemax) : undefined,
        cuffDeflationPerformed,
        cuffDeflationTolerated: cuffDeflationPerformed && cuffDeflationTolerated ? cuffDeflationTolerated === 'si' : undefined,
        cuffDeflationNotes: cuffDeflationNotes || undefined,
        cappedTrialPerformed,
        cappedTrialTolerated: cappedTrialPerformed && cappedTrialTolerated ? cappedTrialTolerated === 'si' : undefined,
        cappedTrialNotes: cappedTrialNotes || undefined,
        swallowingTest: swallowingTest || undefined,
        blueTest: blueTest || undefined,
      });
      navigate(`/patient/${patient.id}/traqueostomia`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Registro de Traqueostomía" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Nivel neurológico y fuerza</h3>
            <Input
              label="Glasgow (3-15)"
              type="number"
              min={3}
              max={15}
              value={glasgow}
              onChange={(e) => setGlasgow(e.target.value)}
              required
            />
            <Input
              label="PEmax (cmH₂O, opcional)"
              type="number"
              value={pemax}
              onChange={(e) => setPemax(e.target.value)}
              placeholder="Ej: 45"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Prueba de balón desinflado</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={cuffDeflationPerformed}
                onChange={(e) => setCuffDeflationPerformed(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-gray-900">Realizada</span>
            </label>
            {cuffDeflationPerformed && (
              <>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCuffDeflationTolerated('si')}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold ${cuffDeflationTolerated === 'si' ? 'border-green-600 bg-green-50 text-green-900' : 'border-gray-200 text-gray-600'}`}
                  >
                    Tolerada
                  </button>
                  <button
                    type="button"
                    onClick={() => setCuffDeflationTolerated('no')}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold ${cuffDeflationTolerated === 'no' ? 'border-red-600 bg-red-50 text-red-900' : 'border-gray-200 text-gray-600'}`}
                  >
                    No tolerada
                  </button>
                </div>
                <Input label="Notas (opcional)" value={cuffDeflationNotes} onChange={(e) => setCuffDeflationNotes(e.target.value)} />
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Prueba de cánula tapada</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={cappedTrialPerformed}
                onChange={(e) => setCappedTrialPerformed(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-gray-900">Realizada</span>
            </label>
            {cappedTrialPerformed && (
              <>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCappedTrialTolerated('si')}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold ${cappedTrialTolerated === 'si' ? 'border-green-600 bg-green-50 text-green-900' : 'border-gray-200 text-gray-600'}`}
                  >
                    Tolerada
                  </button>
                  <button
                    type="button"
                    onClick={() => setCappedTrialTolerated('no')}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold ${cappedTrialTolerated === 'no' ? 'border-red-600 bg-red-50 text-red-900' : 'border-gray-200 text-gray-600'}`}
                  >
                    No tolerada
                  </button>
                </div>
                <Input label="Notas (opcional)" value={cappedTrialNotes} onChange={(e) => setCappedTrialNotes(e.target.value)} />
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Deglución</h3>
            <Select
              label="Prueba de deglución (opcional)"
              value={swallowingTest}
              onChange={(e) => setSwallowingTest(e.target.value as SwallowingTestResult)}
              options={[
                { value: 'apta', label: 'Apta' },
                { value: 'no-apta', label: 'No apta' },
                { value: 'con-restricciones', label: 'Apta con restricciones' },
              ]}
            />
            <Select
              label="Blue test (opcional)"
              value={blueTest}
              onChange={(e) => setBlueTest(e.target.value as BlueTestResult)}
              options={[
                { value: 'negativo', label: 'Negativo' },
                { value: 'positivo', label: 'Positivo' },
              ]}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Registro'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
