import { useState, FormEvent } from 'react';
import { XIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { ClosureReason } from '../types';
interface ClosePatientModalProps {
  patientAlias: string;
  onClose: () => void;
  onConfirm: (reason: ClosureReason, date: string, notes: string) => void;
}
const closureReasons = [{
  value: 'discharge',
  label: 'Alta médica',
  color: 'green'
}, {
  value: 'transfer-ward',
  label: 'Pase a sala general',
  color: 'blue'
}, {
  value: 'transfer-facility',
  label: 'Traslado a otra institución',
  color: 'purple'
}, {
  value: 'deceased',
  label: 'Fallecimiento',
  color: 'red'
}];
export function ClosePatientModal({
  patientAlias,
  onClose,
  onConfirm
}: ClosePatientModalProps) {
  const [reason, setReason] = useState<ClosureReason | ''>('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    onConfirm(reason as ClosureReason, new Date(date).toISOString(), notes);
  };
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Cerrar Caso</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-900 font-medium">
                Estás por cerrar el caso de <strong>{patientAlias}</strong>
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                El paciente saldrá del listado activo pero todo su historial se
                mantendrá disponible.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Motivo del cierre *
            </label>
            <div className="space-y-2">
              {closureReasons.map(opt => <label key={opt.value} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${reason === opt.value ? `border-${opt.color}-500 bg-${opt.color}-50` : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="reason" value={opt.value} checked={reason === opt.value} onChange={e => setReason(e.target.value as ClosureReason)} className="w-5 h-5" required />
                  <span className="font-medium text-gray-900">{opt.label}</span>
                </label>)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y hora del cierre
            </label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas adicionales (opcional)
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-[100px] px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none resize-none" placeholder="Observaciones, destino, etc..." />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" fullWidth disabled={!reason}>
              Cerrar Caso
            </Button>
          </div>
        </form>
      </div>
    </div>;
}