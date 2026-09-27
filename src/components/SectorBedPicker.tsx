import { Select } from './ui/Input';
import { Sector } from '../types';

interface SectorBedPickerProps {
  sectors: Sector[];
  sectorId: string;
  bedId: string;
  /** Deja seleccionable la cama actual del paciente aunque esté inactiva. */
  currentBedId?: string;
  onSectorChange: (sectorId: string) => void;
  onBedChange: (bedId: string) => void;
  sectorError?: string;
  bedError?: string;
}

/** Selector Sector + Cama reutilizado por el alta de pacientes y los cambios de ubicación. */
export function SectorBedPicker({
  sectors,
  sectorId,
  bedId,
  currentBedId,
  onSectorChange,
  onBedChange,
  sectorError,
  bedError,
}: SectorBedPickerProps) {
  const selectedSector = sectors.find((s) => s.id === sectorId);
  const bedOptions = (selectedSector?.beds ?? [])
    .filter((b) => b.active || b.id === currentBedId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((b) => ({ value: b.id, label: `Cama ${b.label}` }));

  return (
    <div className="space-y-4">
      <Select
        label="Sector"
        value={sectorId}
        onChange={(e) => onSectorChange(e.target.value)}
        options={sectors.map((s) => ({ value: s.id, label: s.name }))}
        error={sectorError}
      />
      {sectorId && (
        <Select label="Cama" value={bedId} onChange={(e) => onBedChange(e.target.value)} options={bedOptions} error={bedError} />
      )}
    </div>
  );
}
