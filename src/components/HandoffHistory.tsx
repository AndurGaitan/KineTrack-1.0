import { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import * as handoffNotesApi from '../api/handoffNotesApi';
import { copyText } from '../utils/clipboard';
import type { HandoffNote } from '../types';
import { CheckIcon, ClipboardCopyIcon, Trash2Icon } from 'lucide-react';

interface HandoffHistoryProps {
  kind: 'general' | 'evolucion';
  patientId?: string;
  /** Cambia cuando se guarda una nota nueva, para recargar la lista. */
  refreshKey: number;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

function fmtPeriod(note: HandoffNote): string {
  const from = new Date(note.periodFrom);
  const to = new Date(note.periodTo);
  const f = (d: Date) => d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  return f(from) === f(to) ? f(from) : `${f(from)} al ${f(to)}`;
}

/** Últimas notas guardadas por el usuario (se guardan al copiar). */
export function HandoffHistory({ kind, patientId, refreshKey }: HandoffHistoryProps) {
  const [notes, setNotes] = useState<HandoffNote[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handoffNotesApi
      .listHandoffNotes({ kind, patientId, limit: 10 })
      .then((list) => {
        setNotes(list);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el historial'));
  }, [kind, patientId, refreshKey]);

  const handleCopy = async (note: HandoffNote) => {
    try {
      await copyText(note.text);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('No se pudo copiar automáticamente. Abrí la nota y seleccioná el texto manualmente.');
    }
  };

  const handleDelete = async (note: HandoffNote) => {
    if (!window.confirm('¿Eliminar esta nota del historial?')) return;
    try {
      await handoffNotesApi.deleteHandoffNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la nota');
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-1">Historial</h3>
      <p className="text-xs text-gray-500 mb-3">Se guarda automáticamente cada vez que copiás el texto.</p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {notes.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no guardaste notas.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => setExpanded(expanded === note.id ? null : note.id)} className="text-left flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {fmtDateTime(note.createdAt)} <span className="font-normal text-gray-500">· período {fmtPeriod(note)}</span>
                  </div>
                  {expanded !== note.id && <div className="text-xs text-gray-500 truncate">{note.text.replace(/\s+/g, ' ')}</div>}
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => handleCopy(note)} className="p-2 text-blue-700" aria-label="Copiar nota">
                    {copiedId === note.id ? <CheckIcon className="w-4 h-4" /> : <ClipboardCopyIcon className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => handleDelete(note)} className="p-2 text-red-500" aria-label="Eliminar nota">
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {expanded === note.id && <pre className="mt-2 whitespace-pre-wrap text-xs font-mono text-gray-800 bg-gray-50 rounded-lg p-3">{note.text}</pre>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
