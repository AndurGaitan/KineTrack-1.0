import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import * as prestacionesApi from '../api/prestacionesApi';
import * as mrcApi from '../api/mrcApi';
import { buildHandoffText, pickLatestSupportRecord } from '../domain/services/handoffText';
import { MrcAssessment, Prestacion } from '../types';
import { CheckIcon, ClipboardCopyIcon } from 'lucide-react';

const SHIFT_OPTIONS = [12, 24] as const;

export function PaseDeGuardiaPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const {
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

  const [shiftHours, setShiftHours] = useState<number>(12);
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [mrcAssessment, setMrcAssessment] = useState<MrcAssessment | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setLoading(true);
    setError(null);
    const from = new Date(Date.now() - shiftHours * 60 * 60 * 1000).toISOString();
    Promise.all([prestacionesApi.listPrestaciones({ patientId: patient.id, from }), mrcApi.listMrcAssessments(patient.id)])
      .then(([prestacionesResult, mrcResult]) => {
        setPrestaciones(prestacionesResult);
        const latestMrc = [...mrcResult].sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())[0];
        setMrcAssessment(latestMrc);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la información del turno'))
      .finally(() => setLoading(false));
  }, [patient?.id, shiftHours]);

  const latestSupportRecord = useMemo(() => {
    if (!patient) return undefined;
    return pickLatestSupportRecord(
      patient,
      getPatientVMIRecords(patient.id),
      getPatientNIVRecords(patient.id),
      getPatientHFNCRecords(patient.id),
      getPatientTrachRecords(patient.id)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, getPatientVMIRecords, getPatientNIVRecords, getPatientHFNCRecords, getPatientTrachRecords]);

  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;

  const nivSessions = patient && patient.supportType === 'niv' ? getPatientNIVSessions(patient.id, activeEpisode?.id) : undefined;

  const handoffText = useMemo(() => {
    if (!patient) return '';
    return buildHandoffText({ patient, sector, activeEpisode, latestSupportRecord, prestaciones, shiftHours, mrcAssessment, nivSessions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, sector, activeEpisode, latestSupportRecord, prestaciones, shiftHours, mrcAssessment, nivSessions]);

  const hasAnyData = !!latestSupportRecord || prestaciones.length > 0 || !!mrcAssessment;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(handoffText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = handoffText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar automáticamente. Seleccioná el texto manualmente.');
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
      <Header title="Pase de Guardia" showBack />
      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </Card>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Ventana del turno:</span>
          {SHIFT_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setShiftHours(h)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                shiftHours === h ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando datos del turno...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !hasAnyData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900">
              Este paciente todavía no tiene monitorización, prestaciones ni evaluación MRC cargadas — el texto generado va a ser mínimo.
            </p>
          </div>
        )}

        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Texto generado</h3>
          <textarea
            readOnly
            value={handoffText}
            rows={18}
            className="w-full text-sm font-mono text-gray-900 bg-gray-50 border border-gray-200 rounded-xl p-4 resize-y mb-4"
          />
          <Button type="button" onClick={handleCopy} fullWidth className="flex items-center justify-center gap-2">
            {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardCopyIcon className="w-5 h-5" />}
            {copied ? 'Copiado' : 'Copiar pase de guardia'}
          </Button>
        </Card>
      </main>
    </div>
  );
}
