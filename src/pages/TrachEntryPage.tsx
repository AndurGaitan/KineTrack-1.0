import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { ChipGroup } from '../components/trach/ChipGroup';
import {
  ago,
  cuffStatusLabels,
  secretionAmountLabels,
  secretionCharacterLabels,
  ventilatorySupportLabels,
} from '../domain/services/trachDecannulation';
import {
  BlueTestResult,
  SwallowingTestResult,
  TrachCuffStatus,
  TrachSecretionAmount,
  TrachSecretionCharacter,
  TrachVentilatorySupport,
} from '../types';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

/**
 * "Actualizar estado" — quick status snapshot (balón, soporte, secreciones)
 * plus optional measurements. Everything here is reused by the decannulation
 * process (Pemáx, Glasgow, deglución, blue test, prueba de balón desinflado),
 * so nothing is asked twice.
 */
export function TrachEntryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, addTrachRecord, getActiveEpisode, getPatientTrachRecords, sectors } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  const sector = patient ? sectors.find((s) => s.id === patient.sectorId) : null;
  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;
  const previous = patient ? getPatientTrachRecords(patient.id) : [];

  // State that rarely changes between updates is pre-selected from the last
  // record (and labelled as such) to save taps; secretions start empty because
  // they must reflect *now*.
  const lastCuff = previous.find((r) => r.cuffStatus);
  const lastSupport = previous.find((r) => r.ventilatorySupport);

  const [cuffStatus, setCuffStatus] = useState<TrachCuffStatus | undefined>(lastCuff?.cuffStatus);
  const [support, setSupport] = useState<TrachVentilatorySupport | undefined>(lastSupport?.ventilatorySupport);
  const [secretionAmount, setSecretionAmount] = useState<TrachSecretionAmount | undefined>(undefined);
  const [secretionCharacter, setSecretionCharacter] = useState<TrachSecretionCharacter | undefined>(undefined);

  const [showMeasures, setShowMeasures] = useState(false);
  const [glasgow, setGlasgow] = useState('');
  const [pemax, setPemax] = useState('');
  const [cuffTest, setCuffTest] = useState<'' | 'si' | 'no'>('');
  const [cuffTestNotes, setCuffTestNotes] = useState('');
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

  const hasMeasure = !!(glasgow || pemax || cuffTest || swallowingTest || blueTest);
  const hasAnything = !!(cuffStatus || support || secretionAmount || hasMeasure);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasAnything) return;
    setSubmitting(true);
    try {
      await addTrachRecord({
        patientId: patient.id,
        episodeId: activeEpisode?.id,
        cuffStatus,
        ventilatorySupport: support,
        secretionAmount,
        secretionCharacter: secretionAmount && secretionAmount !== 'ausente' ? secretionCharacter : undefined,
        glasgow: glasgow ? Number(glasgow) : undefined,
        pemax: pemax ? Number(pemax) : undefined,
        cuffDeflationPerformed: !!cuffTest,
        cuffDeflationTolerated: cuffTest ? cuffTest === 'si' : undefined,
        cuffDeflationNotes: cuffTest && cuffTestNotes ? cuffTestNotes : undefined,
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
      <Header title="Actualizar estado" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="text-xs text-gray-500 mb-0.5">Paciente</div>
          <div className="text-lg font-bold text-gray-900">{patient.alias}</div>
          <p className="text-xs text-gray-500 mt-2">Completá solo lo que cambió. Todo lo que cargues se reutiliza en el proceso de decanulación y en la evolución.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                Neumotaponamiento
                {lastCuff && cuffStatus === lastCuff.cuffStatus && <span className="ml-2 text-xs font-normal text-gray-400">igual que el registro de {ago(lastCuff.timestamp)}</span>}
              </h3>
              <ChipGroup value={cuffStatus} onChange={setCuffStatus} options={toOptions(cuffStatusLabels)} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                Soporte ventilatorio
                {lastSupport && support === lastSupport.ventilatorySupport && <span className="ml-2 text-xs font-normal text-gray-400">igual que el registro de {ago(lastSupport.timestamp)}</span>}
              </h3>
              <ChipGroup value={support} onChange={setSupport} options={toOptions(ventilatorySupportLabels)} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Secreciones</h3>
              <ChipGroup
                value={secretionAmount}
                onChange={(v) => {
                  setSecretionAmount(v);
                  if (v === 'ausente' || v === undefined) setSecretionCharacter(undefined);
                }}
                options={toOptions(secretionAmountLabels)}
              />
              {secretionAmount && secretionAmount !== 'ausente' && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1.5">Aspecto</div>
                  <ChipGroup value={secretionCharacter} onChange={setSecretionCharacter} options={toOptions(secretionCharacterLabels).map((o) => ({ ...o, label: o.label.charAt(0).toUpperCase() + o.label.slice(1) }))} />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Para contar aspiraciones usá el botón “Aspiración” del hub: suma al indicador de secreciones sin cargar nada más.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <button type="button" onClick={() => setShowMeasures((v) => !v)} className="w-full flex items-center justify-between p-5 text-left" aria-expanded={showMeasures}>
              <span>
                <span className="block text-sm font-bold text-gray-900">Mediciones y pruebas {hasMeasure && '· cargadas'}</span>
                <span className="block text-xs text-gray-500">Glasgow, Pemáx, balón desinflado, deglución, blue test</span>
              </span>
              {showMeasures ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
            </button>

            {showMeasures && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Glasgow (3-15)" type="number" inputMode="numeric" min={3} max={15} value={glasgow} onChange={(e) => setGlasgow(e.target.value)} />
                  <Input label="Pemáx (cmH₂O)" type="number" inputMode="decimal" value={pemax} onChange={(e) => setPemax(e.target.value)} placeholder="Ej: 45" />
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Prueba de balón desinflado</div>
                  <ChipGroup
                    value={cuffTest || undefined}
                    onChange={(v) => setCuffTest(v ?? '')}
                    tone={cuffTest === 'no' ? 'red' : 'green'}
                    options={[
                      { value: 'si', label: 'Tolerada' },
                      { value: 'no', label: 'No tolerada' },
                    ]}
                  />
                  {cuffTest && <div className="mt-3"><Input label="Notas (opcional)" value={cuffTestNotes} onChange={(e) => setCuffTestNotes(e.target.value)} /></div>}
                </div>

                <Select
                  label="Prueba de deglución"
                  value={swallowingTest}
                  onChange={(e) => setSwallowingTest(e.target.value as SwallowingTestResult)}
                  options={[
                    { value: 'apta', label: 'Apta' },
                    { value: 'no-apta', label: 'No apta' },
                    { value: 'con-restricciones', label: 'Apta con restricciones' },
                  ]}
                />
                <Select
                  label="Blue test"
                  value={blueTest}
                  onChange={(e) => setBlueTest(e.target.value as BlueTestResult)}
                  options={[
                    { value: 'negativo', label: 'Negativo' },
                    { value: 'positivo', label: 'Positivo' },
                  ]}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={submitting || !hasAnything} className="bg-indigo-600">
              {submitting ? 'Guardando...' : 'Guardar estado'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
