import { useState } from 'react';
import { Card } from '../ui/Card';
import * as prestacionesApi from '../../api/prestacionesApi';
import { mobilizationLevels } from '../../utils/vmiEducation';
import { ago } from '../../domain/services/trachDecannulation';
import type { MobilizationLevel, Prestacion } from '../../types';
import { DumbbellIcon, StethoscopeIcon } from 'lucide-react';

interface TrachActivityCardProps {
  patientId: string;
  prestaciones: Prestacion[];
  now: Date;
  onChanged: () => void | Promise<void>;
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
export function TrachActivityCard({ patientId, prestaciones, now, onChanged }: TrachActivityCardProps) {
  const [busy, setBusy] = useState<'ktr' | 'ktm' | null>(null);
  const [pickingLevel, setPickingLevel] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = startOfToday(now);
  const todays = prestaciones.filter((p) => new Date(p.timestamp).getTime() >= today);
  const ktrToday = todays.filter((p) => p.type === 'kinesioterapia-respiratoria');
  const ktmToday = todays.filter((p) => p.type === 'kinesioterapia-motora');
  const lastKtr = prestaciones.find((p) => p.type === 'kinesioterapia-respiratoria');
  const lastKtm = prestaciones.find((p) => p.type === 'kinesioterapia-motora');

  const log = async (kind: 'ktr' | 'ktm', mobilizationLevel?: MobilizationLevel) => {
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      await prestacionesApi.createPrestacion({
        patientId,
        type: kind === 'ktr' ? 'kinesioterapia-respiratoria' : 'kinesioterapia-motora',
        mobilizationLevel,
      });
      setMessage(kind === 'ktr' ? '✓ Kinesioterapia respiratoria registrada' : '✓ Kinesioterapia motora registrada');
      setPickingLevel(false);
      await onChanged();
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
        <span className="text-xs text-gray-400">Un solo registro: suma a la productividad y al timeline</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => log('ktr')}
          disabled={busy !== null}
          className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-left active:bg-blue-100 disabled:opacity-50"
        >
          <StethoscopeIcon className="w-6 h-6 text-blue-600 mb-2" />
          <div className="font-bold text-gray-900">KTR</div>
          <div className="text-xs text-gray-600">Kinesioterapia respiratoria</div>
          <div className="text-xs text-blue-800 mt-2 font-semibold">
            Hoy: {ktrToday.length}
            {lastKtr ? ` · última ${ago(lastKtr.timestamp, now)}` : ''}
          </div>
        </button>

        <button
          onClick={() => setPickingLevel((v) => !v)}
          disabled={busy !== null}
          className={`rounded-2xl border-2 p-4 text-left disabled:opacity-50 ${
            pickingLevel ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 bg-emerald-50 active:bg-emerald-100'
          }`}
        >
          <DumbbellIcon className="w-6 h-6 text-emerald-600 mb-2" />
          <div className="font-bold text-gray-900">KTM</div>
          <div className="text-xs text-gray-600">Kinesioterapia motora</div>
          <div className="text-xs text-emerald-800 mt-2 font-semibold">
            Hoy: {ktmToday.length}
            {lastKtm ? ` · última ${ago(lastKtm.timestamp, now)}` : ''}
          </div>
        </button>
      </div>

      {pickingLevel && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-3">
          <div className="text-sm font-semibold text-gray-900 mb-2">¿Qué nivel de movilización se realizó?</div>
          <div className="space-y-2">
            {mobilizationLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => log('ktm', level.value as MobilizationLevel)}
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
