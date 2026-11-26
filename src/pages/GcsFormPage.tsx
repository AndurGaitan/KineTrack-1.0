import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { SaveButton } from '../components/ui/SaveButton';
import { Input } from '../components/ui/Input';
import { ChoiceChips } from '../components/ChoiceChips';
import { MultiChoiceChips } from '../components/MultiChoiceChips';
import { RecordDateField } from '../components/RecordDateField';
import { GcsEvidence } from '../components/gcs/GcsEvidence';
import { GcsHistory } from '../components/gcs/GcsHistory';
import { useRecordTimestamp } from '../hooks/useRecordTimestamp';
import { useFormRetry } from '../hooks/useRetry';
import * as gcsApi from '../api/gcsApi';
import { dismissRetry, notifyError, notifySuccess, offerRetry } from '../utils/notify';
import { GcsComponent, GcsComponentKey, gcsAirwayAt, gcsAppliesTo, gcsComponents, gcsFactorOptions, gcsSummary, gcsTotal } from '../utils/gcs';
import type { GcsFactor, GcsValue, Patient } from '../types';

const OTHER = 'Otro';

/** Lo elegido en un componente. Nada viene precargado. */
interface Answer {
  score: string; // '' sin elegir, '1'..'6' o 'NT'
  reason: string; // motivo de NT elegido de la lista (u "Otro")
  otherReason: string;
}
const blank: Answer = { score: '', reason: '', otherReason: '' };

const toValue = (score: string): GcsValue => (score === 'NT' ? 'NT' : Number(score));
const ntReasonOf = (a: Answer) => (a.score !== 'NT' ? undefined : (a.reason === OTHER ? a.otherReason.trim() : a.reason) || undefined);

export function GcsFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { patients } = useApp();
  const patient = patients.find((p) => p.id === patientId);

  if (!patient || !gcsAppliesTo(patient)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Escala de Glasgow" showBack />
        <p className="text-gray-600 text-center p-6">{patient ? 'Esta escala está disponible para pacientes adultos.' : 'Paciente no encontrado'}</p>
      </div>
    );
  }
  return <GcsForm key={patient.id} patient={patient} />;
}

function GcsForm({ patient }: { patient: Patient }) {
  const navigate = useNavigate();
  const recordedAt = useRecordTimestamp();
  const [answers, setAnswers] = useState<Record<GcsComponentKey, Answer>>({ eye: blank, verbal: blank, motor: blank });
  const [factors, setFactors] = useState<GcsFactor[]>([]);
  const [trachConfirmed, setTrachConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { formRef, retry } = useFormRetry();

  const airway = gcsAirwayAt(patient, recordedAt.timestamp ? new Date(recordedAt.timestamp) : new Date());
  // V1 es "sin respuesta y sin factor que interfiera": no existe con tubo, ni si se marcó la vía aérea como interferencia.
  const airwayInterferes = airway === 'intubado' || factors.includes('tubo-orotraqueal') || factors.includes('traqueostomia');
  const verbal: Answer = airwayInterferes && answers.verbal.score === '1' ? blank : answers.verbal;
  const chosen: Record<GcsComponentKey, Answer> = { ...answers, verbal };
  const needsTrachConfirm = airway === 'traqueostomizado' && verbal.score === '1';

  const set = (key: GcsComponentKey, patch: Partial<Answer>) => setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const complete = gcsComponents.every((c) => chosen[c.key].score !== '');
  const anyNt = gcsComponents.some((c) => chosen[c.key].score === 'NT');
  const total = complete ? gcsTotal(toValue(chosen.eye.score), toValue(chosen.verbal.score), toValue(chosen.motor.score)) : undefined;

  const missing = [
    ...gcsComponents.filter((c) => chosen[c.key].score === '').map((c) => c.title.toLowerCase()),
    ...gcsComponents.filter((c) => chosen[c.key].score === 'NT' && !ntReasonOf(chosen[c.key])).map((c) => `motivo de ${c.letter}-NT`),
    ...(needsTrachConfirm && !trachConfirmed ? ['confirmar que la respuesta verbal se pudo evaluar'] : []),
  ];
  const canSave = missing.length === 0 && !recordedAt.isFuture;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    const [eyeValue, verbalValue, motorValue] = [toValue(chosen.eye.score), toValue(chosen.verbal.score), toValue(chosen.motor.score)];
    dismissRetry(retry);
    setSaving(true);
    try {
      const saved = await gcsApi.createGcsAssessment({
        patientId: patient.id,
        assessedAt: recordedAt.timestamp,
        eye: eyeValue,
        verbal: verbalValue,
        motor: motorValue,
        eyeNtReason: ntReasonOf(chosen.eye),
        verbalNtReason: ntReasonOf(chosen.verbal),
        motorNtReason: ntReasonOf(chosen.motor),
        interferingFactors: factors,
        notes: notes.trim() || undefined,
      });
      const result = saved.totalScore !== undefined ? `${saved.totalScore}/15` : 'sin total';
      notifySuccess('Glasgow guardado', `${gcsSummary(saved.eye, saved.verbal, saved.motor)} · ${result} · ${patient.alias}`);
      navigate(`/patient/${patient.id}`);
    } catch (err) {
      notifyError('No se pudo guardar la escala de Glasgow', err);
      offerRetry(retry);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Escala de Glasgow" showBack />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Paciente</div>
          <div className="text-lg font-bold text-gray-900">{patient.alias}</div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {gcsComponents.map((component) => (
            <ComponentField
              key={component.key}
              component={component}
              answer={chosen[component.key]}
              hideV1={component.key === 'verbal' && airwayInterferes}
              onChange={(patch) => {
                if (component.key === 'verbal') setTrachConfirmed(false);
                set(component.key, patch);
              }}
            >
              {component.key === 'verbal' && airway && (
                <p className="text-xs text-gray-600">
                  {airway === 'intubado'
                    ? 'Con tubo orotraqueal, si no se puede evaluar se registra NT. V1 no se ofrece.'
                    : 'Con traqueostomía, si la respuesta verbal no se puede evaluar se registra NT, no 1.'}
                </p>
              )}
              {component.key === 'verbal' && needsTrachConfirm && (
                <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm text-gray-900">
                  <input type="checkbox" className="w-5 h-5 mt-0.5 flex-shrink-0" checked={trachConfirmed} onChange={(e) => setTrachConfirmed(e.target.checked)} />
                  La respuesta verbal se pudo evaluar: V1 no se debe solo a la traqueostomía.
                </label>
              )}
            </ComponentField>
          ))}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <MultiChoiceChips<GcsFactor> label="Factores de interferencia (opcional)" options={gcsFactorOptions} value={factors} onChange={setFactors} />
            <Input label="Nota (opcional)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center" aria-live="polite">
            <div className="text-sm text-gray-500">Total</div>
            {total !== undefined ? (
              <div className="text-4xl font-bold text-gray-900">
                {total}
                <span className="text-lg font-semibold text-gray-500">/15</span>
              </div>
            ) : (
              <div className="text-lg font-bold text-gray-900">{anyNt ? 'Total no calculable' : '—'}</div>
            )}
            {complete && <div className="text-sm text-gray-600 mt-1">{gcsSummary(toValue(chosen.eye.score), toValue(chosen.verbal.score), toValue(chosen.motor.score))}</div>}
          </div>

          <RecordDateField state={recordedAt} label="Fecha y hora de la valoración" compact />

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Cancelar
            </Button>
            <SaveButton fullWidth saving={saving} disabled={!canSave}>
              Guardar valoración
            </SaveButton>
          </div>
          {missing.length > 0 && <p className="text-xs text-gray-500 -mt-2">Para guardar completá: {missing.join(', ')}.</p>}
        </form>

        <GcsHistory patientId={patient.id} />
        <GcsEvidence />
      </main>
    </div>
  );
}

function ComponentField({
  component,
  answer,
  hideV1,
  onChange,
  children,
}: {
  component: GcsComponent;
  answer: Answer;
  hideV1: boolean;
  onChange: (patch: Partial<Answer>) => void;
  children?: React.ReactNode;
}) {
  const options = component.responses
    .filter((r) => !(hideV1 && r.score === 1))
    .map((r) => ({ value: String(r.score), label: `${r.score} · ${r.label}`, hint: r.criterion }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <h2 className="text-lg font-bold text-gray-900">
        {component.title} ({component.letter})
      </h2>
      <ChoiceChips options={options} value={answer.score} onChange={(score) => onChange({ score, reason: '', otherReason: '' })} allowClear columns={2} />
      {children}
      {answer.score === 'NT' && (
        <div className="space-y-2">
          <ChoiceChips
            label={`Motivo de ${component.letter}-NT`}
            options={[...component.ntReasons, OTHER].map((r) => ({ value: r, label: r }))}
            value={answer.reason}
            onChange={(reason) => onChange({ reason })}
            columns={2}
          />
          {answer.reason === OTHER && (
            <Input label="Especificá el motivo" value={answer.otherReason} maxLength={200} onChange={(e) => onChange({ otherReason: e.target.value })} />
          )}
        </div>
      )}
    </div>
  );
}
