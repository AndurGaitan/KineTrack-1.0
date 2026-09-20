import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { TrachStatusCard } from '../components/trach/TrachStatusCard';
import { TrachActivityCard } from '../components/trach/TrachActivityCard';
import { DecannulationPanel } from '../components/trach/DecannulationPanel';
import { TrachTimeline } from '../components/trach/TrachTimeline';
import { useTrachData } from '../hooks/useTrachData';
import type { TrachContext } from '../domain/services/trachDecannulation';
import { WindIcon } from 'lucide-react';

/**
 * Traqueostomía — hub longitudinal.
 *
 * Tres bloques que nunca se mezclan:
 *   1. ESTADO      — cómo está hoy la traqueostomía (datos clínicos).
 *   2. ACTIVIDAD   — KTR/KTM como prestaciones independientes (productividad).
 *   3. DECANULACIÓN — proceso opcional, con 7 dominios, solo cuando el profesional lo inicia.
 * Más una línea de tiempo única que junta todo.
 */
export function TrachHubPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, getPatientTrachRecords, getActiveEpisode, sectors } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  const sector = patient ? sectors.find((s) => s.id === patient.sectorId) : null;
  const records = patient ? getPatientTrachRecords(patient.id) : [];
  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;
  const { overview, prestaciones, loading, error, reload, setActiveProcess } = useTrachData(patient?.id);

  const now = useMemo(() => new Date(), [overview, prestaciones, records.length]);
  const ctx: TrachContext = { now, episode: activeEpisode, records, overview };

  if (!patient || patient.supportType !== 'traqueostomia') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Este módulo solo está disponible para pacientes traqueostomizados</p>
          <Button onClick={() => navigate(`/patient/${patientId}`)}>Volver al Paciente</Button>
        </div>
      </div>
    );
  }

  const goToUpdateState = () => navigate(`/patient/${patient.id}/traqueostomia/new`);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Traqueostomía" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Paciente</div>
            <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
            {sector && (
              <div className="text-sm text-gray-500">
                {sector.name} · Cama {patient.bedLabel ?? patient.bedId}
              </div>
            )}
          </div>
          <WindIcon className="w-8 h-8 text-indigo-600" />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => void reload()} className="font-bold underline flex-shrink-0">
              Reintentar
            </button>
          </div>
        )}

        <TrachStatusCard patientId={patient.id} ctx={ctx} onUpdateState={goToUpdateState} onChanged={reload} />

        <TrachActivityCard patientId={patient.id} prestaciones={prestaciones} now={now} onChanged={reload} />

        {loading && !overview ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-sm text-gray-500">Cargando proceso de decanulación...</div>
        ) : (
          <DecannulationPanel
            patientId={patient.id}
            ctx={ctx}
            onProcessChange={setActiveProcess}
            onGoToUpdateState={goToUpdateState}
            onChanged={reload}
          />
        )}

        <TrachTimeline
          records={records}
          prestaciones={prestaciones}
          overview={overview}
          onOpenRecord={(recordId) => navigate(`/patient/${patient.id}/traqueostomia/${recordId}`)}
        />
      </main>
    </div>
  );
}
