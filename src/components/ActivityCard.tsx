import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/Card';
import { useApp } from '../contexts/AppContext';
import { mobilizationLevels } from '../utils/vmiEducation';
import { ago } from '../domain/services/trachDecannulation';
import { KtrDetail, KtrDetailFields, emptyKtrDetail, ktrDetailPayload } from './KtrDetailFields';
import type { MobilizationLevel, Prestacion } from '../types';
import { BrainIcon, DumbbellIcon, StethoscopeIcon } from 'lucide-react';

interface ActivityCardProps {
  patientId: string;
  prestaciones: Prestacion[];
  now: Date;
  /** Se llama después de registrar un KTR con aspiración (en TQT suma al conteo de aspiraciones). */
  onChanged?: () => void | Promise<void>;
}

function startOfToday(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * KTR / KTM as independent prestaciones — the same records the team
 * productivity dashboard, the timeline and QI-05 (movilización precoz) already
 * read, so logging here is the *only* entry for that work.
 */
export function ActivityCard({ patientId, prestaciones, now, onChanged }: ActivityCardProps) {
  const navigate = useNavigate();
  const { addPrestacion, features, patients, getActiveEpisode, getEpisodeMobilizationStart, startMobilization } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  // Paciente en VMI cuyo episodio todavía no tiene registrado el inicio de la movilización activa.
  const canStartMobilization =
    patient?.status === 'active' && patient.supportType === 'imv' && !!getActiveEpisode(patientId) && !getEpisodeMobilizationStart(getActiveEpisode(patientId)?.id);
  const [busy, setBusy] = useState<'ktr' | 'ktm' | null>(null);
  const [pickingLevel, setPickingLevel] = useState(false);
  const [ktrOpen, setKtrOpen] = useState(false);
  const [ktrDetail, setKtrDetail] = useState<KtrDetail>(emptyKtrDetail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = startOfToday(now);
  const todays = prestaciones.filter((p) => new Date(p.timestamp).getTime() >= today);
  const ktrToday = todays.filter((p) => p.type === 'kinesioterapia-respiratoria');
  const ktmToday = todays.filter((p) => p.type === 'kinesioterapia-motora');
  const lastKtr = prestaciones.find((p) => p.type === 'kinesioterapia-respiratoria');
  const lastKtm = prestaciones.find((p) => p.type === 'kinesioterapia-motora');

  const log = async (kind: 'ktr' | 'ktm', options?: { mobilizationLevel?: MobilizationLevel; ktrDetail?: KtrDetail; startsMobilization?: boolean }) => {
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      await addPrestacion({
        patientId,
        type: kind === 'ktr' ? 'kinesioterapia-respiratoria' : 'kinesioterapia-motora',
        mobilizationLevel: options?.mobilizationLevel,
        ...(options?.ktrDetail ? ktrDetailPayload(options.ktrDetail) : {}),
      });
      let started = false;
      if (options?.startsMobilization) started = await startMobilization(patientId);
      setMessage(
        kind === 'ktr'
          ? '✓ Kinesioterapia respiratoria registrada'
          : started
            ? '✓ Kinesioterapia motora registrada · inicio de movilización activa anotado'
            : '✓ Kinesioterapia motora registrada'
      );
      setPickingLevel(false);
      setKtrOpen(false);
      setKtrDetail(emptyKtrDetail);
      if (options?.ktrDetail?.aspirated) await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la prestación');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">Actividad</h2>
        
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            setKtrOpen((v) => !v);
            setPickingLevel(false);
          }}
          disabled={busy !== null}
          className={`rounded-2xl border-2 p-3 text-left disabled:opacity-50 ${
            ktrOpen ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50 active:bg-blue-100'
          }`}
        >
          <StethoscopeIcon className="w-6 h-6 text-blue-600 mb-2" />
          <div className="font-bold text-gray-900">KTR</div>
          <div className="text-xs text-gray-600">Respiratoria</div>
          <div className="text-xs text-blue-800 mt-2 font-semibold">
            Hoy: {ktrToday.length}
          </div>
          {lastKtr && <div className="text-[11px] text-blue-800/80">última {ago(lastKtr.timestamp, now)}</div>}
        </button>

        <button
          onClick={() => {
            setKtrOpen(false);
            // Etapa 1: un toque registra el KTM, salvo que haya que marcar el inicio de la movilización activa.
            if (!features.mobilizationLevel && !canStartMobilization) {
              void log('ktm');
              return;
            }
            setPickingLevel((v) => !v);
          }}
          disabled={busy !== null}
          className={`rounded-2xl border-2 p-3 text-left disabled:opacity-50 ${
            pickingLevel ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 bg-emerald-50 active:bg-emerald-100'
          }`}
        >
          <DumbbellIcon className="w-6 h-6 text-emerald-600 mb-2" />
          <div className="font-bold text-gray-900">KTM</div>
          <div className="text-xs text-gray-600">Motora</div>
          <div className="text-xs text-emerald-800 mt-2 font-semibold">
            Hoy: {ktmToday.length}
          </div>
          {lastKtm && <div className="text-[11px] text-emerald-800/80">última {ago(lastKtm.timestamp, now)}</div>}
        </button>

        <button
          onClick={() => navigate(`/patient/${patientId}/mrc/new`)}
          disabled={busy !== null}
          className="rounded-2xl border-2 border-violet-200 bg-violet-50 active:bg-violet-100 p-3 text-left disabled:opacity-50"
        >
          <BrainIcon className="w-6 h-6 text-violet-600 mb-2" />
          <div className="font-bold text-gray-900">MRC</div>
          <div className="text-xs text-gray-600">Fuerza muscular</div>
          <div className="text-xs text-violet-800 mt-2 font-semibold">Evaluar</div>
        </button>
      </div>

      {ktrOpen && (
        <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-3 space-y-4">
          <div className="text-sm font-semibold text-gray-900">Detalle de la kinesioterapia respiratoria (opcional)</div>
          <KtrDetailFields value={ktrDetail} onChange={setKtrDetail} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => log('ktr', { ktrDetail })}
              disabled={busy !== null}
              className="rounded-xl bg-blue-600 text-white font-bold px-4 py-3 active:bg-blue-700 disabled:opacity-50"
            >
              Registrar KTR
            </button>
            <button
              onClick={() => log('ktr')}
              disabled={busy !== null}
              className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 active:bg-gray-50 disabled:opacity-50"
            >
              Registrar sin detalle
            </button>
          </div>
        </div>
      )}

      {pickingLevel && !features.mobilizationLevel && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3 space-y-2">
          <div className="text-sm font-semibold text-gray-900">Este paciente en VMI todavía no tiene inicio de movilización activa</div>
          <button
            onClick={() => log('ktm', { startsMobilization: true })}
            disabled={busy !== null}
            className="w-full rounded-xl bg-emerald-600 text-white font-bold px-4 py-3 active:bg-emerald-700 disabled:opacity-50"
          >
            Registrar KTM — inicio de movilización activa
          </button>
          <button
            onClick={() => log('ktm')}
            disabled={busy !== null}
            className="w-full rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 active:bg-gray-50 disabled:opacity-50"
          >
            Registrar KTM (no es el inicio)
          </button>
        </div>
      )}

      {pickingLevel && features.mobilizationLevel && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3">
          <div className="text-sm font-semibold text-gray-900 mb-2">¿Qué nivel de movilización se realizó?</div>
          <div className="space-y-2">
            {mobilizationLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => log('ktm', { mobilizationLevel: level.value as MobilizationLevel })}
                disabled={busy !== null}
                className="w-full text-left rounded-xl border border-gray-200 px-4 py-2.5 active:bg-emerald-50 disabled:opacity-50"
              >
                <span className="font-semibold text-gray-900">{level.label}</span>
                <span className="text-sm text-gray-600"> · {level.description}</span>
              </button>
            ))}
            <button
              onClick={() => log('ktm')}
              disabled={busy !== null}
              className="w-full text-left rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 active:bg-gray-50 disabled:opacity-50"
            >
              Registrar sin especificar el nivel
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-green-700 font-medium">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
