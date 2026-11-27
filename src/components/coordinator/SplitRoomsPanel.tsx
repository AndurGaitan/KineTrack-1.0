import { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import * as sectorsApi from '../../api/sectorsApi';
import { parseBedLabels } from '../../utils/bedLabels';
import { notifyError, notifySuccess } from '../../utils/notify';
import type { Sector } from '../../types';

const rooms = (n: number) => (n === 1 ? '1 habitación' : `${n} habitaciones`);

/** Pasa habitaciones de una cama a dos (A y B). Primero muestra qué va a cambiar y recién después confirma. */
export function SplitRoomsPanel({ sector }: { sector: Sector }) {
  const { patients, refreshSectors } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<sectorsApi.SplitRoomsResult>();
  const [busy, setBusy] = useState(false);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const result = await sectorsApi.splitRooms(sector.id, { rooms: parseBedLabels(input), dryRun });
      if (dryRun) {
        setPreview(result);
      } else {
        await refreshSectors();
        notifySuccess(`${rooms(result.split.length)} con cama A y B`, sector.name);
        setPreview(undefined);
        setInput('');
        setOpen(false);
      }
    } catch (err) {
      notifyError(dryRun ? 'No se pudieron revisar las habitaciones' : 'No se pudieron dividir las habitaciones', err);
    } finally {
      setBusy(false);
    }
  };

  const review = (e: FormEvent) => {
    e.preventDefault();
    if (parseBedLabels(input).length > 0) run(true);
  };

  // Quien hoy figura en la habitación queda en la A: hay que verlo antes de confirmar.
  const occupants = (preview?.split ?? []).flatMap((room) =>
    patients
      .filter((p) => p.status === 'active' && p.sectorId === sector.id && (p.bedLabel === room || p.bedLabel === `${room} A`))
      .map((p) => ({ id: p.id, text: `${room} A · ${p.alias}` }))
  );

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-sm font-semibold text-blue-700 py-1">
        Habitaciones con dos camas (A y B)
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-gray-600">Cada habitación pasa a tener cama A y cama B. Quien hoy está internado queda en la A.</p>
          <form onSubmit={review} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setPreview(undefined);
              }}
              aria-label="Números de habitación"
              placeholder="Ej: 1, 3-6, 103"
              className="flex-1 min-w-0 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
            />
            <Button type="submit" variant="secondary" disabled={busy || parseBedLabels(input).length === 0} className="px-4">
              Revisar
            </Button>
          </form>

          {preview && (
            <div className="rounded-xl border border-gray-200 p-3 text-sm text-gray-800 space-y-2" aria-live="polite">
              {preview.split.length > 0 ? (
                <p>
                  <strong>Se dividen {rooms(preview.split.length)}:</strong> {preview.split.join(', ')}
                </p>
              ) : (
                <p className="font-semibold">No hay habitaciones para dividir.</p>
              )}
              {occupants.length > 0 && (
                <div>
                  <strong>Con paciente internado</strong> (si está en la B, cambialo de cama después):
                  <ul className="mt-1">
                    {occupants.map((o) => (
                      <li key={o.id}>{o.text}</li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.alreadySplit.length > 0 && <p>Ya tienen A y B: {preview.alreadySplit.join(', ')}</p>}
              {preview.notFound.length > 0 && <p className="text-red-700">No existen en este sector: {preview.notFound.join(', ')}</p>}
              {preview.conflicts.length > 0 && <p className="text-red-700">No se tocan porque sus camas se superponen: {preview.conflicts.join(', ')}</p>}
              {preview.split.length > 0 && (
                <Button type="button" fullWidth disabled={busy} onClick={() => run(false)}>
                  {busy ? 'Dividiendo…' : `Dividir ${rooms(preview.split.length)}`}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
