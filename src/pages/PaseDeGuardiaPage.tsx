import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HandoffPeriodPicker } from '../components/HandoffPeriodPicker';
import { HandoffHistory } from '../components/HandoffHistory';
import * as prestacionesApi from '../api/prestacionesApi';
import * as mrcApi from '../api/mrcApi';
import * as trachApi from '../api/trachApi';
import * as airwayEventsApi from '../api/airwayEventsApi';
import * as handoffNotesApi from '../api/handoffNotesApi';
import { buildHandoffText } from '../domain/services/handoffText';
import { appendPlan, collectPatientActivity } from '../domain/services/handoffData';
import { useHandoffPeriod } from '../hooks/useHandoffPeriod';
import { useEditableHandoff } from '../hooks/useEditableHandoff';
import { copyText } from '../utils/clipboard';
import { AirwayEvent, MrcAssessment, Prestacion, TrachOverview } from '../types';
import { CheckIcon, ClipboardCopyIcon } from 'lucide-react';

export function PaseDeGuardiaPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const {
    user,
    patients,
    sectors,
    getActiveEpisode,
    getPatientVMIRecords,
    getPatientNIVRecords,
    getPatientHFNCRecords,
    getPatientTrachRecords,
    getPatientNIVSessions,
  } = useApp();

  const patient = patients.find((p) => p.id === patientId);
  const sector = patient ? sectors.find((s) => s.id === patient.sectorId) : undefined;

  const periodState = useHandoffPeriod();
  const { period, mineOnly } = periodState;

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [mrc, setMrc] = useState<MrcAssessment[]>([]);
  const [trachOverview, setTrachOverview] = useState<TrachOverview | null>(null);
  const [airwayEvents, setAirwayEvents] = useState<AirwayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [plan, setPlan] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    if (!patient) return;
    setLoading(true);
    setError(null);
    const from = period.from.toISOString();
    const to = period.to.toISOString();
    Promise.all([
      prestacionesApi.listPrestaciones({ patientId: patient.id, from, to }),
      mrcApi.listMrcAssessments(patient.id),
      patient.supportType === 'traqueostomia' ? trachApi.getTrachOverview([patient.id]) : Promise.resolve(undefined),
      airwayEventsApi.listAirwayEvents({ patientIds: [patient.id], from, to }),
    ])
      .then(([prestacionesResult, mrcResult, trachResult, events]) => {
        setPrestaciones(prestacionesResult);
        setMrc(mrcResult);
        setTrachOverview(trachResult?.[patient.id] ?? null);
        setAirwayEvents(events);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la información del período'))
      .finally(() => setLoading(false));
  }, [patient?.id, period]);

  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;

  const activity = useMemo(() => {
    if (!patient || !user) return undefined;
    return collectPatientActivity(
      patient,
      activeEpisode,
      {
        prestaciones,
        vmi: getPatientVMIRecords(patient.id),
        niv: getPatientNIVRecords(patient.id),
        hfnc: getPatientHFNCRecords(patient.id),
        trach: getPatientTrachRecords(patient.id),
        nivSessions: patient.supportType === 'niv' ? getPatientNIVSessions(patient.id, activeEpisode?.id) : [],
        mrc,
        trachOverview,
        airwayEvents,
      },
      { period, userId: user.id, mineOnly }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, user, activeEpisode, prestaciones, mrc, trachOverview, airwayEvents, period, mineOnly, getPatientVMIRecords, getPatientNIVRecords, getPatientHFNCRecords, getPatientTrachRecords]);

  const generated = useMemo(() => {
    if (!patient) return '';
    return buildHandoffText({
      patient,
      sector,
      activeEpisode,
      latestSupportRecord: activity?.latestSupportRecord,
      prestaciones: activity?.prestaciones ?? [],
      periodPhrase: period.phrase,
      mrcAssessment: activity?.mrcAssessment,
      nivSessions: activity?.nivSessions,
      trach: activity?.trach,
      airwayEvents: activity?.airwayEvents,
      episodeChanges: activity?.episodeChanges,
    });
  }, [patient, sector, activeEpisode, activity, period]);

  const editor = useEditableHandoff(generated);

  const handleCopy = async () => {
    if (!patient) return;
    const finalText = appendPlan(editor.text, plan);
    try {
      await copyText(finalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar automáticamente. Seleccioná el texto manualmente.');
      return;
    }
    try {
      await handoffNotesApi.createHandoffNote({
        kind: 'evolucion',
        patientId: patient.id,
        periodFrom: period.from.toISOString(),
        periodTo: period.to.toISOString(),
        text: finalText,
      });
      setHistoryKey((k) => k + 1);
    } catch {
      setError('Se copió el texto, pero no se pudo guardar en el historial.');
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Paciente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Evolución Kinésica" showBack />
      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </Card>

        <HandoffPeriodPicker state={periodState} />

        {loading && <p className="text-sm text-gray-500">Cargando datos del período...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !activity && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900">
              No hay monitorización, prestaciones ni otros datos cargados en este período — el texto generado va a tener solo el contexto del paciente.
            </p>
          </div>
        )}

        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Texto generado</h3>
          {editor.stale && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-900">Cambiaste el texto a mano y después cambió el período o el alcance. Tu texto se mantiene.</p>
              <button type="button" onClick={editor.regenerate} className="text-sm font-bold text-amber-900 underline flex-shrink-0">
                Regenerar (descarta mis cambios)
              </button>
            </div>
          )}
          <textarea
            value={editor.text}
            onChange={(e) => editor.onChange(e.target.value)}
            rows={18}
            className="w-full text-sm font-mono text-gray-900 bg-white border border-gray-200 rounded-xl p-4 resize-y mb-4"
          />

          <label className="block text-sm font-semibold text-gray-900 mb-1">Plan / pendientes (opcional)</label>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            rows={3}
            placeholder="Ej: reevaluar destete mañana, control de interfaz..."
            className="w-full text-sm text-gray-900 bg-white border border-gray-200 rounded-xl p-3 resize-y"
          />
          <p className="text-xs text-gray-500 mb-4">Se agrega al final del texto al copiar.</p>

          <Button type="button" onClick={handleCopy} fullWidth disabled={!editor.text.trim()} className="flex items-center justify-center gap-2">
            {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardCopyIcon className="w-5 h-5" />}
            {copied ? 'Copiado' : 'Copiar evolución'}
          </Button>
        </Card>

        <HandoffHistory kind="evolucion" patientId={patient.id} refreshKey={historyKey} />
      </main>
    </div>
  );
}
