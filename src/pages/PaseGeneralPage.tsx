import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import * as prestacionesApi from '../api/prestacionesApi';
import * as mrcApi from '../api/mrcApi';
import { buildGeneralHandoffText, GeneralHandoffPatientInput } from '../domain/services/generalHandoffText';
import { pickLatestSupportRecord } from '../domain/services/handoffText';
import { MrcAssessment, Prestacion } from '../types';
import { CheckIcon, ClipboardCopyIcon, UsersIcon } from 'lucide-react';

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function PaseGeneralPage() {
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

  const [prestacionesHoy, setPrestacionesHoy] = useState<Prestacion[]>([]);
  const [mrcByPatient, setMrcByPatient] = useState<Record<string, MrcAssessment | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    prestacionesApi
      .listPrestaciones({ performedByUserId: user.id, from: startOfToday() })
      .then(async (result) => {
        setPrestacionesHoy(result);
        const patientIds = [...new Set(result.map((p) => p.patientId))];
        const mrcResults = await Promise.all(patientIds.map((id) => mrcApi.listMrcAssessments(id)));
        const byPatient: Record<string, MrcAssessment | undefined> = {};
        patientIds.forEach((id, i) => {
          byPatient[id] = [...mrcResults[i]].sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())[0];
        });
        setMrcByPatient(byPatient);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la información del día'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const patientInputs: GeneralHandoffPatientInput[] = useMemo(() => {
    const byPatient = new Map<string, Prestacion[]>();
    for (const p of prestacionesHoy) {
      const list = byPatient.get(p.patientId) ?? [];
      list.push(p);
      byPatient.set(p.patientId, list);
    }

    const bedSortOrder = (patient: (typeof patients)[number], sectorName: string | undefined) => {
      const sector = sectors.find((s) => s.name === sectorName);
      return sector?.beds.find((b) => b.id === patient.bedId)?.sortOrder ?? 0;
    };

    const inputs = [...byPatient.entries()]
      .map(([patientId, prestaciones]) => {
        const patient = patients.find((p) => p.id === patientId);
        if (!patient) return undefined;
        const sector = sectors.find((s) => s.id === patient.sectorId);
        const activeEpisode = getActiveEpisode(patient.id);
        const latestSupportRecord = pickLatestSupportRecord(
          patient,
          getPatientVMIRecords(patient.id),
          getPatientNIVRecords(patient.id),
          getPatientHFNCRecords(patient.id),
          getPatientTrachRecords(patient.id)
        );
        const nivSessions = patient.supportType === 'niv' ? getPatientNIVSessions(patient.id, activeEpisode?.id) : undefined;
        const input: GeneralHandoffPatientInput = {
          patient,
          sector,
          activeEpisode,
          latestSupportRecord,
          prestaciones: [...prestaciones].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
          mrcAssessment: mrcByPatient[patientId],
          nivSessions,
        };
        return input;
      })
      .filter((x): x is GeneralHandoffPatientInput => !!x);

    return inputs.sort((a, b) => {
      const sectorCmp = (a.sector?.name ?? '').localeCompare(b.sector?.name ?? '');
      if (sectorCmp !== 0) return sectorCmp;
      return bedSortOrder(a.patient, a.sector?.name) - bedSortOrder(b.patient, b.sector?.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestacionesHoy, mrcByPatient, patients, sectors]);

  const handoffText = useMemo(() => {
    if (!user || patientInputs.length === 0) return '';
    return buildGeneralHandoffText({ kinesiologoName: user.name, patients: patientInputs });
  }, [user, patientInputs]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pase de Guardia General" showBack />
      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
          <p className="text-sm text-purple-900">
            <strong>Pacientes atendidos hoy:</strong> se arma solo con los pacientes donde cargaste al menos una
            prestación hoy — texto libre listo para pegar en la HCE.
          </p>
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando pacientes de hoy...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && patientInputs.length === 0 && (
          <Card className="text-center py-12">
            <UsersIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">Todavía no registraste prestaciones hoy</p>
            <p className="text-gray-400 mt-2">
              Cargá al menos una prestación en algún paciente para poder generar el pase general.
            </p>
          </Card>
        )}

        {!loading && patientInputs.length > 0 && (
          <>
            <Card>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {patientInputs.length} paciente{patientInputs.length === 1 ? '' : 's'} incluido{patientInputs.length === 1 ? '' : 's'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {patientInputs.map(({ patient, sector }) => (
                  <span key={patient.id} className="text-xs bg-purple-50 text-purple-900 px-3 py-1.5 rounded-lg font-medium">
                    {patient.alias}
                    {sector ? ` · ${sector.name}${patient.bedLabel ? ` ${patient.bedLabel}` : ''}` : ''}
                  </span>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Texto generado</h3>
              <textarea
                readOnly
                value={handoffText}
                rows={22}
                className="w-full text-sm font-mono text-gray-900 bg-gray-50 border border-gray-200 rounded-xl p-4 resize-y mb-4"
              />
              <Button type="button" onClick={handleCopy} fullWidth className="flex items-center justify-center gap-2">
                {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardCopyIcon className="w-5 h-5" />}
                {copied ? 'Copiado' : 'Copiar pase general'}
              </Button>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
