import { useState, FormEvent } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useApp } from '../contexts/AppContext';
import { computeNIVUsageSummary } from '../utils/nivCalculations';
import { PlayIcon, SquareIcon, PlusIcon, Trash2Icon } from 'lucide-react';

interface NIVSessionsCardProps {
  patientId: string;
  episodeId?: string;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NIVSessionsCard({ patientId, episodeId }: NIVSessionsCardProps) {
  const { getPatientNIVSessions, startNIVSession, closeNIVSession, addManualNIVSession, deleteNIVSession } = useApp();
  const sessions = getPatientNIVSessions(patientId, episodeId);
  const summary = computeNIVUsageSummary(sessions);

  const [showRetroForm, setShowRetroForm] = useState(false);
  const [retroStart, setRetroStart] = useState(() => toDatetimeLocal(new Date(Date.now() - 4 * 60 * 60 * 1000)));
  const [retroEnd, setRetroEnd] = useState(() => toDatetimeLocal(new Date()));
  const [retroNotes, setRetroNotes] = useState('');

  const handleRetroSubmit = (e: FormEvent) => {
    e.preventDefault();
    addManualNIVSession({
      patientId,
      episodeId,
      startAt: new Date(retroStart).toISOString(),
      endAt: new Date(retroEnd).toISOString(),
      notes: retroNotes || undefined,
    });
    setShowRetroForm(false);
    setRetroNotes('');
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Sesiones de VNI (destete)</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 rounded-xl bg-purple-50">
          <div className="text-xs text-gray-600 mb-1">Uso últimas 24h</div>
          <div className="text-2xl font-bold text-purple-900">{summary.hoursUsedLast24h}h</div>
        </div>
        <div className={`p-4 rounded-xl ${summary.consecutiveDaysWithoutNIV > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="text-xs text-gray-600 mb-1">Días consecutivos sin VNI</div>
          <div className={`text-2xl font-bold ${summary.consecutiveDaysWithoutNIV > 0 ? 'text-green-700' : 'text-gray-900'}`}>
            {summary.consecutiveDaysWithoutNIV}
          </div>
        </div>
      </div>

      {summary.activeSession ? (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-purple-900 font-semibold">Sesión activa</div>
            <div className="text-xs text-purple-700">desde {formatDateTime(summary.activeSession.startAt)}</div>
          </div>
          <Button type="button" onClick={() => closeNIVSession(summary.activeSession!.id)} className="bg-purple-600">
            <SquareIcon className="w-4 h-4 mr-1 inline" /> Finalizar
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={() => startNIVSession(patientId, episodeId)} fullWidth className="mb-4 bg-purple-600">
          <PlayIcon className="w-4 h-4 mr-1 inline" /> Iniciar sesión ahora
        </Button>
      )}

      <button type="button" onClick={() => setShowRetroForm((v) => !v)} className="text-sm text-purple-700 font-medium flex items-center gap-1 mb-3">
        <PlusIcon className="w-4 h-4" /> Cargar sesión retroactiva
      </button>

      {showRetroForm && (
        <form onSubmit={handleRetroSubmit} className="space-y-3 mb-4 p-4 bg-gray-50 rounded-xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Inicio</label>
              <input type="datetime-local" value={retroStart} onChange={(e) => setRetroStart(e.target.value)} className="w-full min-h-[48px] px-3 text-sm border-2 border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Fin</label>
              <input type="datetime-local" value={retroEnd} onChange={(e) => setRetroEnd(e.target.value)} className="w-full min-h-[48px] px-3 text-sm border-2 border-gray-300 rounded-lg" required />
            </div>
          </div>
          <input type="text" placeholder="Notas (opcional)" value={retroNotes} onChange={(e) => setRetroNotes(e.target.value)} className="w-full min-h-[48px] px-3 text-sm border-2 border-gray-300 rounded-lg" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowRetroForm(false)} fullWidth>Cancelar</Button>
            <Button type="submit" fullWidth>Guardar</Button>
          </div>
        </form>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
              <div>
                <span className="text-gray-900 font-medium">{formatDateTime(s.startAt)}</span>
                <span className="text-gray-500"> → </span>
                <span className="text-gray-900 font-medium">{s.endAt ? formatDateTime(s.endAt) : 'en curso'}</span>
                {s.notes && <div className="text-xs text-gray-500">{s.notes}</div>}
              </div>
              <button type="button" onClick={() => deleteNIVSession(s.id)} aria-label="Eliminar sesión" className="text-gray-400 hover:text-red-600 p-1">
                <Trash2Icon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
