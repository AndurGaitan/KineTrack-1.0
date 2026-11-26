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
import { useApp } from '../../contexts/AppContext';
import { useRetry } from '../../hooks/useRetry';
import { attempt, dismissRetry, notifyError, notifySuccess, offerRetry } from '../../utils/notify';

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
  const { patients } = useApp();
  const alias = patients.find((p) => p.id === patientId)?.alias;
  const retry = useRetry(() => logAspiration());

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
    if (busy) return;
    dismissRetry(retry);
    setBusy(true);
    try {
      const created = await trachApi.logAspiration({ patientId, episodeId: episode?.id });
      notifySuccess('Aspiración registrada', alias, { label: 'Deshacer', run: () => void undo(created.id) });
    } catch (err) {
      notifyError('No se pudo registrar la aspiración', err);
      offerRetry(retry);
      setBusy(false);
      return;
    }
    try {
      await onChanged();
    } catch (err) {
      notifyError('Se registró, pero no se pudo actualizar la vista', err);
    } finally {
      setBusy(false);
    }
  };

  const undo = (id: string) =>
    attempt(
      async () => {
        await trachApi.deleteAspiration(id);
        await onChanged();
      },
      { success: 'Aspiración deshecha', detail: alias, failure: 'No se pudo deshacer la aspiración' }
    );

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
    </Card>
  );
}
