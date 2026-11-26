import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/Card';
import { useApp } from '../contexts/AppContext';
import { mobilizationLevels } from '../utils/vmiEducation';
import { ktmTypeOptions } from '../utils/prestacionLabels';
import { ago } from '../domain/services/trachDecannulation';
import { KtrDetail, KtrDetailFields, emptyKtrDetail, ktrDetailPayload } from './KtrDetailFields';
import { MultiChoiceChips } from './MultiChoiceChips';
import { ChoiceChips } from './ChoiceChips';
import type { KtmType, MobilizationLevel, Prestacion } from '../types';
import { DumbbellIcon, StethoscopeIcon } from 'lucide-react';
import { useRetry } from '../hooks/useRetry';
import { dismissRetry, notifyError, notifySuccess, offerRetry } from '../utils/notify';

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

const levelOptions = mobilizationLevels.map((l) => ({ value: String(l.value), label: l.label, hint: l.description }));

/**
 * KTR / KTM as independent prestaciones — the same records the team
 * productivity dashboard, the timeline and QI-05 (movilización precoz) already
 * read, so logging here is the *only* entry for that work.
 */
export function ActivityCard({ patientId, prestaciones, now, onChanged }: ActivityCardProps) {
  const { addPrestacion, features, patients, getActiveEpisode, getEpisodeMobilizationStart, startMobilization } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  // Paciente en VMI cuyo episodio todavía no tiene registrado el inicio de la movilización activa.
  const canStartMobilization =
    patient?.status === 'active' && patient.supportType === 'imv' && !!getActiveEpisode(patientId) && !getEpisodeMobilizationStart(getActiveEpisode(patientId)?.id);
  const [busy, setBusy] = useState<'ktr' | 'ktm' | null>(null);
  const [ktmOpen, setKtmOpen] = useState(false);
  const [ktmTypes, setKtmTypes] = useState<KtmType[]>([]);
  const [ktmLevel, setKtmLevel] = useState('');
  const [startsMobilization, setStartsMobilization] = useState(false);
  const [ktrOpen, setKtrOpen] = useState(false);
  const [ktrDetail, setKtrDetail] = useState<KtrDetail>(emptyKtrDetail);
  // Contador que se resalta un instante después de registrar.
  const [flash, setFlash] = useState<'ktr' | 'ktm' | null>(null);
  const lastAttempt = useRef<{ kind: 'ktr' | 'ktm'; withDetail: boolean }>({ kind: 'ktr', withDetail: false });
  const retry = useRetry(() => log(lastAttempt.current.kind, lastAttempt.current.withDetail));

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 1800);
    return () => window.clearTimeout(t);
  }, [flash]);

  const today = startOfToday(now);
  const todays = prestaciones.filter((p) => new Date(p.timestamp).getTime() >= today);
  const ktrToday = todays.filter((p) => p.type === 'kinesioterapia-respiratoria');
  const ktmToday = todays.filter((p) => p.type === 'kinesioterapia-motora');
  const lastKtr = prestaciones.find((p) => p.type === 'kinesioterapia-respiratoria');
  const lastKtm = prestaciones.find((p) => p.type === 'kinesioterapia-motora');

  const startMobilizationToo = async (): Promise<boolean> => {
    const ok = await startMobilization(patientId);
    if (!ok) offerRetry(() => void startMobilizationToo().then((done) => done && notifySuccess('Inicio de movilización anotado', patient?.alias)));
    return ok;
  };

  const log = async (kind: 'ktr' | 'ktm', withDetail = false) => {
    if (busy) return;
    lastAttempt.current = { kind, withDetail };
    dismissRetry(retry);
    setBusy(kind);
    const detail = withDetail ? ktrDetail : undefined;
    try {
      await addPrestacion({
        patientId,
        type: kind === 'ktr' ? 'kinesioterapia-respiratoria' : 'kinesioterapia-motora',
        ...(kind === 'ktm' && ktmLevel !== '' ? { mobilizationLevel: Number(ktmLevel) as MobilizationLevel } : {}),
        ...(kind === 'ktm' && ktmTypes.length > 0 ? { ktmTypes } : {}),
        ...(detail ? ktrDetailPayload(detail) : {}),
      });
    } catch (err) {
      notifyError(kind === 'ktr' ? 'No se pudo registrar la KTR' : 'No se pudo registrar la KTM', err);
      offerRetry(retry);
      setBusy(null);
      return;
    }
    // Desde acá la prestación ya está guardada: nada de lo que siga puede ofrecer repetirla.
    const started = kind === 'ktm' && startsMobilization ? await startMobilizationToo() : false;
    notifySuccess(kind === 'ktr' ? 'KTR registrada' : started ? 'KTM e inicio de movilización registrados' : 'KTM registrada', patient?.alias);
    setKtmOpen(false);
    setKtmTypes([]);
    setKtmLevel('');
    setStartsMobilization(false);
    setKtrOpen(false);
    setKtrDetail(emptyKtrDetail);
    setFlash(kind);
    setBusy(null);
    if (detail?.aspirated) {
      try {
        await onChanged?.();
      } catch (err) {
        notifyError('Se registró, pero no se pudo actualizar la vista', err);
      }
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">Actividad</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setKtrOpen((v) => !v);
            setKtmOpen(false);
          }}
          disabled={busy !== null}
          className={`rounded-2xl border-2 p-3 text-left disabled:opacity-50 ${
            ktrOpen ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50 active:bg-blue-100'
          }`}
        >
          <StethoscopeIcon className="w-6 h-6 text-blue-600 mb-2" />
          <div className="font-bold text-gray-900">KTR</div>
          <div className="text-xs text-gray-600">Kinesioterapia respiratoria</div>
          <div className={`inline-block rounded-md px-1 -mx-1 text-xs text-blue-800 mt-2 font-semibold ${flash === 'ktr' ? 'kt-flash' : ''}`}>Hoy: {ktrToday.length}</div>
          {lastKtr && <div className="text-[11px] text-blue-800/80">última {ago(lastKtr.timestamp, now)}</div>}
        </button>

        <button
          onClick={() => {
            setKtrOpen(false);
            setKtmOpen((v) => !v);
          }}
          disabled={busy !== null}
          className={`rounded-2xl border-2 p-3 text-left disabled:opacity-50 ${
            ktmOpen ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 bg-emerald-50 active:bg-emerald-100'
          }`}
        >
          <DumbbellIcon className="w-6 h-6 text-emerald-600 mb-2" />
          <div className="font-bold text-gray-900">KTM</div>
          <div className="text-xs text-gray-600">Kinesioterapia motora</div>
          <div className={`inline-block rounded-md px-1 -mx-1 text-xs text-emerald-800 mt-2 font-semibold ${flash === 'ktm' ? 'kt-flash' : ''}`}>Hoy: {ktmToday.length}</div>
          {lastKtm && <div className="text-[11px] text-emerald-800/80">última {ago(lastKtm.timestamp, now)}</div>}
        </button>
      </div>

      {ktrOpen && (
        <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-3 space-y-4">
          <div className="text-sm font-semibold text-gray-900">Detalle de la kinesioterapia respiratoria (opcional)</div>
          <KtrDetailFields value={ktrDetail} onChange={setKtrDetail} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => log('ktr', true)}
              disabled={busy !== null}
              className="rounded-xl bg-blue-600 text-white font-bold px-4 py-3 active:bg-blue-700 disabled:opacity-50"
            >
              {busy === 'ktr' && lastAttempt.current.withDetail ? 'Guardando...' : 'Registrar KTR'}
            </button>
            <button
              onClick={() => log('ktr')}
              disabled={busy !== null}
              className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 active:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'ktr' && !lastAttempt.current.withDetail ? 'Guardando...' : 'Registrar sin detalle'}
            </button>
          </div>
        </div>
      )}

      {ktmOpen && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3 space-y-4">
          <MultiChoiceChips<KtmType> label="Tipo de kinesioterapia motora (opcional)" options={ktmTypeOptions} value={ktmTypes} onChange={setKtmTypes} />

          {features.mobilizationLevel && (
            <ChoiceChips label="Nivel de movilización (opcional)" options={levelOptions} value={ktmLevel} onChange={setKtmLevel} allowClear columns={2} />
          )}

          {canStartMobilization && (
            <label className="flex items-start gap-3 p-3 border-2 border-emerald-200 bg-emerald-50 rounded-xl cursor-pointer">
              <input type="checkbox" checked={startsMobilization} onChange={(e) => setStartsMobilization(e.target.checked)} className="w-6 h-6 mt-0.5" />
              <span>
                <span className="font-bold text-gray-900 block">Es el inicio de la movilización activa</span>
                <span className="text-sm text-gray-700">Paciente en VMI sin inicio registrado: cuenta para la movilización precoz.</span>
              </span>
            </label>
          )}

          <button
            onClick={() => log('ktm')}
            disabled={busy !== null}
            className="w-full rounded-xl bg-emerald-600 text-white font-bold px-4 py-3 active:bg-emerald-700 disabled:opacity-50"
          >
            {busy === 'ktm' ? 'Guardando...' : 'Registrar KTM'}
          </button>
        </div>
      )}
    </Card>
  );
}
