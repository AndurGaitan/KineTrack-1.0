import { ReactNode, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import * as trachApi from '../../api/trachApi';
import {
  TrachContext,
  aspirationBlocks,
  ago,
  cuffStatusLabels,
  formatHours,
  hoursFreeOfVmi,
  secretionAmountLabels,
  secretionCharacterLabels,
  statusCounts,
  ventilatorySupportLabels,
} from '../../domain/services/trachDecannulation';
import type { TrachRecord } from '../../types';
import { PlusIcon, PencilIcon } from 'lucide-react';

interface TrachStatusCardProps {
  patientId: string;
  ctx: TrachContext;
  onUpdateState: () => void;
  /** Recarga los datos del hub después de registrar/deshacer una aspiración. */
  onChanged: () => void | Promise<void>;
}

function Row({ label, children, muted }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <div className="text-sm text-gray-500 flex-shrink-0">{label}</div>
      <div className={`text-sm text-right ${muted ? 'text-gray-400' : 'font-semibold text-gray-900'}`}>{children}</div>
    </div>
  );
}

/** Latest known value of a field across records (a status update may carry only some fields). */
function latest<T>(records: TrachRecord[], pick: (r: TrachRecord) => T | undefined) {
  for (const r of records) {
    const v = pick(r);
    if (v !== undefined) return { value: v, at: r.timestamp };
  }
  return undefined;
}

export function TrachStatusCard({ patientId, ctx, onUpdateState, onChanged }: TrachStatusCardProps) {
  const { now, records, overview, episode } = ctx;
  const [busy, setBusy] = useState(false);
  const [justLogged, setJustLogged] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const hours = hoursFreeOfVmi(episode, now);
  const cuff = latest(records, (r) => r.cuffStatus);
  const support = latest(records, (r) => r.ventilatorySupport);
  const amount = latest(records, (r) => r.secretionAmount);
  const character = latest(records, (r) => r.secretionCharacter);
  const lastRecord = records[0];

  const aspirations24h = aspirationBlocks(overview?.aspirations ?? [], now).reduce((s, b) => s + b.count, 0);
  const process = overview?.activeProcess ?? null;
  const counts = statusCounts(process);

  const logAspiration = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await trachApi.logAspiration({ patientId, episodeId: episode?.id });
      setJustLogged(created.id);
      await onChanged();
      window.setTimeout(() => setJustLogged((current) => (current === created.id ? undefined : current)), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la aspiración');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!justLogged) return;
    const id = justLogged;
    setJustLogged(undefined);
    try {
      await trachApi.deleteAspiration(id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo deshacer');
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">Estado actual</h2>
        {lastRecord && <span className="text-xs text-gray-400">Actualizado {ago(lastRecord.timestamp, now)}</span>}
      </div>

      <div>
        <Row label="Traqueostomía">
          Presente{hours !== undefined ? ` · ${formatHours(hours)} sin VMI` : ''}
        </Row>
        <Row label="Neumotaponamiento" muted={!cuff}>
          {cuff ? cuffStatusLabels[cuff.value] : 'Sin dato'}
        </Row>
        <Row label="Soporte ventilatorio" muted={!support}>
          {support ? ventilatorySupportLabels[support.value] : 'Sin dato'}
        </Row>
        <Row label="Secreciones" muted={!amount && aspirations24h === 0}>
          {amount ? `${secretionAmountLabels[amount.value]}${character ? `, ${secretionCharacterLabels[character.value]}` : ''}` : 'Sin dato'}
          <div className="text-xs font-normal text-gray-500">
            {aspirations24h} {aspirations24h === 1 ? 'aspiración' : 'aspiraciones'} en 24 h
          </div>
        </Row>
        <Row label="Decanulación" muted={!process}>
          {process ? (
            <>
              En curso
              <div className="text-xs font-normal text-gray-500">
                {counts.favorable} favorable{counts.favorable === 1 ? '' : 's'} · {counts.pendiente} pendiente{counts.pendiente === 1 ? '' : 's'}
                {counts.condicionado > 0 ? ` · ${counts.condicionado} condicionado${counts.condicionado === 1 ? '' : 's'}` : ''}
                {counts.desfavorable > 0 ? ` · ${counts.desfavorable} desfavorable${counts.desfavorable === 1 ? '' : 's'}` : ''}
              </div>
            </>
          ) : (
            'No iniciada'
          )}
        </Row>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Button onClick={onUpdateState} className="flex items-center justify-center gap-2 bg-indigo-600">
          <PencilIcon className="w-4 h-4" />
          Actualizar estado
        </Button>
        <Button variant="secondary" onClick={logAspiration} disabled={busy} className="flex items-center justify-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Aspiración
        </Button>
      </div>

      {justLogged && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-900">
          <span>✓ Aspiración registrada</span>
          <button onClick={undo} className="font-semibold underline">
            Deshacer
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
