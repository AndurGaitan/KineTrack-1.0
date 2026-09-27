import { useState, FormEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { SectorBedPicker } from './SectorBedPicker';
import { Patient, Sector } from '../types';

interface ChangeBedModalProps {
  patient: Patient;
  sectors: Sector[];
  onClose: () => void;
  onConfirm: (sectorId: string, bedId: string) => void;
}

/**
 * Cambio de cama sin pasar por "Editar paciente" ni por un cambio de soporte:
 * mover a alguien dentro del mismo sector (o a otro) sin tocar nada más.
 */
export function ChangeBedModal({ patient, sectors, onClose, onConfirm }: ChangeBedModalProps) {
  const [sectorId, setSectorId] = useState(patient.sectorId);
  const [bedId, setBedId] = useState(patient.bedId);
  const [error, setError] = useState<string | null>(null);

  const currentSector = sectors.find((s) => s.id === patient.sectorId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!bedId) {
      setError('Seleccioná una cama');
      return;
    }
    if (sectorId === patient.sectorId && bedId === patient.bedId) {
      setError('Elegí una cama o un sector distinto del actual');
      return;
    }
    onConfirm(sectorId, bedId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Cambiar de Cama</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <strong>Ubicación actual:</strong> {currentSector?.name ?? '—'} · Cama {patient.bedLabel ?? patient.bedId}
          </div>

          <SectorBedPicker
            sectors={sectors}
            sectorId={sectorId}
            bedId={bedId}
            currentBedId={patient.bedId}
            onSectorChange={(id) => {
              setSectorId(id);
              setBedId('');
              setError(null);
            }}
            onBedChange={(id) => {
              setBedId(id);
              setError(null);
            }}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              Confirmar Cambio
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
