import { useState, FormEvent } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { useApp } from '../../contexts/AppContext';
import * as sectorsApi from '../../api/sectorsApi';

const typeOptions = [
  { value: 'uci', label: 'UCI' },
  { value: 'sala', label: 'Sala' },
  { value: 'uco', label: 'UCO' },
  { value: 'utim', label: 'UTIM' },
  { value: 'otro', label: 'Otro' },
];

/**
 * Parses a comma-separated bed label list that also accepts numeric ranges,
 * e.g. "1,2,3,101-111,300-307" -> ["1","2","3","101",...,"111","300",...,"307"].
 */
function parseBedLabels(input: string): string[] {
  const labels: string[] = [];
  for (const token of input.split(',').map((t) => t.trim()).filter(Boolean)) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let n = start; n <= end; n++) labels.push(String(n));
    } else {
      labels.push(token);
    }
  }
  return labels;
}

export function SectorsAdminPage() {
  const { sectors, refreshSectors } = useApp();
  const [showNewSector, setShowNewSector] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('uci');
  const [bedLabelsInput, setBedLabelsInput] = useState('');
  const [addBedInputs, setAddBedInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSector = async (e: FormEvent) => {
    e.preventDefault();
    const bedLabels = parseBedLabels(bedLabelsInput);
    if (!name || bedLabels.length === 0) {
      setError('Completá el nombre y al menos una cama');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await sectorsApi.createSector({ name, type, bedLabels });
      await refreshSectors();
      setShowNewSector(false);
      setName('');
      setBedLabelsInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el sector');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBeds = async (sectorId: string) => {
    const raw = addBedInputs[sectorId];
    if (!raw) return;
    const labels = parseBedLabels(raw);
    try {
      for (const label of labels) {
        await sectorsApi.addBed(sectorId, { label });
      }
      await refreshSectors();
      setAddBedInputs((prev) => ({ ...prev, [sectorId]: '' }));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo agregar la cama');
    }
  };

  const toggleSectorActive = async (sectorId: string, active: boolean) => {
    await sectorsApi.updateSector(sectorId, { active: !active });
    await refreshSectors();
  };

  const toggleBedActive = async (sectorId: string, bedId: string, active: boolean) => {
    await sectorsApi.updateBed(sectorId, bedId, { active: !active });
    await refreshSectors();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Administración de Sectores" showBack />
      <CoordinatorNav />

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Sectores</h2>
          <Button onClick={() => setShowNewSector((s) => !s)}>{showNewSector ? 'Cancelar' : '+ Nuevo Sector'}</Button>
        </div>

        {showNewSector && (
          <Card>
            <form onSubmit={handleCreateSector} className="space-y-4">
              <Input label="Nombre del sector" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: UCI, Piso 3er nivel" />
              <Select label="Tipo de internación" value={type} onChange={(e) => setType(e.target.value)} options={typeOptions} />
              <Input
                label="Camas/habitaciones (separadas por coma; admite rangos)"
                value={bedLabelsInput}
                onChange={(e) => setBedLabelsInput(e.target.value)}
                placeholder="Ej: 1,2,3,101-111,300-307"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting} fullWidth>
                {submitting ? 'Creando...' : 'Crear Sector'}
              </Button>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {sectors.map((sector) => (
            <Card key={sector.id} className={!sector.active ? 'opacity-50' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-lg font-bold text-gray-900">{sector.name}</div>
                  <div className="text-sm text-gray-500 uppercase">{sector.type}</div>
                </div>
                <button
                  onClick={() => toggleSectorActive(sector.id, sector.active)}
                  className="text-xs px-3 py-1 rounded-lg border border-gray-300 text-gray-600"
                >
                  {sector.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {sector.beds
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((bed) => (
                    <button
                      key={bed.id}
                      onClick={() => toggleBedActive(sector.id, bed.id, bed.active)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border ${bed.active ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'}`}
                      title={bed.active ? 'Click para desactivar' : 'Click para reactivar'}
                    >
                      {bed.label}
                    </button>
                  ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={addBedInputs[sector.id] ?? ''}
                  onChange={(e) => setAddBedInputs((prev) => ({ ...prev, [sector.id]: e.target.value }))}
                  placeholder="Agregar camas (ej: 125,126 o 200-210)"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                />
                <Button onClick={() => handleAddBeds(sector.id)} className="px-4">
                  Agregar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
