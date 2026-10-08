import { useEffect, useMemo, useState } from 'react';
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
import { buildGeneralHandoffText, GeneralHandoffPatientInput } from '../domain/services/generalHandoffText';
import { appendPlan, collectPatientActivity } from '../domain/services/handoffData';
import { useHandoffPeriod } from '../hooks/useHandoffPeriod';
import { useEditableHandoff } from '../hooks/useEditableHandoff';
import { copyText } from '../utils/clipboard';
import { AirwayEvent, MrcAssessment, Prestacion, TrachOverview } from '../types';
import { CheckIcon, ClipboardCopyIcon, UsersIcon } from 'lucide-react';

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
    getPatientSVPeriods,
  } = useApp();

  const periodState = useHandoffPeriod();
  const { period, mineOnly } = periodState;

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [mrc, setMrc] = useState<MrcAssessment[]>([]);
  const [trachByPatient, setTrachByPatient] = useState<Record<string, TrachOverview>>({});
  const [airwayEvents, setAirwayEvents] = useState<AirwayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const trachIds = patients.filter((p) => p.status === 'active' && p.supportType === 'traqueostomia').map((p) => p.id);
    const from = period.from.toISOString();
    const to = period.to.toISOString();
    Promise.all([
      prestacionesApi.listPrestaciones({ from, to, performedByUserId: mineOnly ? user.id : undefined }),
      mrcApi.listMrcAssessments(),
      trachIds.length > 0 ? trachApi.getTrachOverview(trachIds) : Promise.resolve({} as Record<string, TrachOverview>),
      airwayEventsApi.listAirwayEvents({ from, to }),
    ])
      .then(([prestacionesResult, mrcAll, trachResult, events]) => {
        setPrestaciones(prestacionesResult);
        setMrc(mrcAll);
        setTrachByPatient(trachResult);
        setAirwayEvents(events);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la información del período'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, period, mineOnly]);

  const patientInputs: GeneralHandoffPatientInput[] = useMemo(() => {
    if (!user) return [];

    const bedSortOrder = (patient: (typeof patients)[number], sectorName: string | undefined) => {
      const sector = sectors.find((s) => s.name === sectorName);
      return sector?.beds.find((b) => b.id === patient.bedId)?.sortOrder ?? 0;
    };

    const inputs: GeneralHandoffPatientInput[] = [];
    for (const patient of patients) {
      const activeEpisode = getActiveEpisode(patient.id);
      const activity = collectPatientActivity(
        patient,
        activeEpisode,
        {
          prestaciones: prestaciones.filter((p) => p.patientId === patient.id),
          vmi: getPatientVMIRecords(patient.id),
          niv: getPatientNIVRecords(patient.id),
          hfnc: getPatientHFNCRecords(patient.id),
          trach: getPatientTrachRecords(patient.id),
          nivSessions: patient.supportType === 'niv' ? getPatientNIVSessions(patient.id, activeEpisode?.id) : [],
          mrc: mrc.filter((m) => m.patientId === patient.id),
          trachOverview: trachByPatient[patient.id] ?? null,
          airwayEvents: airwayEvents.filter((e) => e.patientId === patient.id),
          svPeriods: getPatientSVPeriods(patient.id),
        },
        { period, userId: user.id, mineOnly }
      );
      if (!activity) continue;
      inputs.push({ patient, sector: sectors.find((s) => s.id === patient.sectorId), activeEpisode, ...activity });
    }

    return inputs.sort((a, b) => {
      const sectorCmp = (a.sector?.name ?? '').localeCompare(b.sector?.name ?? '');
      if (sectorCmp !== 0) return sectorCmp;
      return bedSortOrder(a.patient, a.sector?.name) - bedSortOrder(b.patient, b.sector?.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, period, mineOnly, prestaciones, mrc, trachByPatient, airwayEvents, patients, sectors]);

  const included = useMemo(() => patientInputs.filter((p) => !excluded.has(p.patient.id)), [patientInputs, excluded]);

  const generated = useMemo(() => {
    if (!user || included.length === 0) return '';
    return buildGeneralHandoffText({
      kinesiologoName: mineOnly ? user.name : `${user.name} (todo el equipo)`,
      patients: included,
      periodPhrase: period.phrase,
      periodTitle: period.title,
    });
  }, [user, included, period, mineOnly]);

  const editor = useEditableHandoff(generated);

  const toggleExcluded = (patientId: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const handleCopy = async () => {
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
        kind: 'general',
        periodFrom: period.from.toISOString(),
        periodTo: period.to.toISOString(),
        text: finalText,
      });
      setHistoryKey((k) => k + 1);
    } catch {
      setError('Se copió el texto, pero no se pudo guardar en el historial.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pase de Guardia General" showBack />
      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
          <p className="text-sm text-purple-900">
            <strong>Pase del período:</strong> se arma solo con lo que se cargó en el período elegido (monitorizaciones,
            prestaciones, sesiones, seguimiento de traqueostomía, MRC, extubaciones) — lo que no se cargó no aparece.
            Podés editar el texto antes de copiarlo.
          </p>
        </div>

        <HandoffPeriodPicker state={periodState} />

        {loading && <p className="text-sm text-gray-500">Cargando datos del período...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && patientInputs.length === 0 && (
          <Card className="text-center py-12">
            <UsersIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No hay datos cargados en este período</p>
            <p className="text-gray-400 mt-2">Probá con otro período, o cargá una monitorización o prestación en algún paciente.</p>
          </Card>
        )}

        {!loading && patientInputs.length > 0 && (
          <>
            <Card>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                {included.length} de {patientInputs.length} paciente{patientInputs.length === 1 ? '' : 's'} incluido{included.length === 1 ? '' : 's'}
              </h3>
              <p className="text-xs text-gray-500 mb-3">Destildá los pacientes que no querés en el pase.</p>
              <div className="flex flex-wrap gap-2">
                {patientInputs.map(({ patient, sector }) => {
                  const on = !excluded.has(patient.id);
                  return (
                    <label
                      key={patient.id}
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                        on ? 'bg-purple-50 text-purple-900' : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleExcluded(patient.id)} />
                      {patient.alias}
                      {sector ? ` · ${sector.name}${patient.bedLabel ? ` ${patient.bedLabel}` : ''}` : ''}
                    </label>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Texto generado</h3>
              {editor.stale && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-amber-900">Cambiaste el texto a mano y después cambió el período, el alcance o los pacientes. Tu texto se mantiene.</p>
                  <button type="button" onClick={editor.regenerate} className="text-sm font-bold text-amber-900 underline flex-shrink-0">
                    Regenerar (descarta mis cambios)
                  </button>
                </div>
              )}
              <textarea
                value={editor.text}
                onChange={(e) => editor.onChange(e.target.value)}
                rows={22}
                className="w-full text-sm font-mono text-gray-900 bg-white border border-gray-200 rounded-xl p-4 resize-y mb-4"
              />

              <label className="block text-sm font-semibold text-gray-900 mb-1">Plan / pendientes (opcional)</label>
              <textarea
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                rows={3}
                placeholder="Ej: reevaluar destete mañana, control de interfaz VNI cama 4..."
                className="w-full text-sm text-gray-900 bg-white border border-gray-200 rounded-xl p-3 resize-y"
              />
              <p className="text-xs text-gray-500 mb-4">Se agrega al final del texto al copiar.</p>

              <Button type="button" onClick={handleCopy} fullWidth disabled={!editor.text.trim()} className="flex items-center justify-center gap-2">
                {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardCopyIcon className="w-5 h-5" />}
                {copied ? 'Copiado' : 'Copiar pase general'}
              </Button>
            </Card>
          </>
        )}

        <HandoffHistory kind="general" refreshKey={historyKey} />
      </main>
    </div>
  );
}
