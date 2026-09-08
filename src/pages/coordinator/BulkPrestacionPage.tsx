import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import * as prestacionesApi from '../../api/prestacionesApi';
import { PrestacionType } from '../../types';
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react';

const supportTypeLabels: Record<string, string> = {
  imv: 'VMI',
  niv: 'VNI',
  hfnc: 'HFNC',
  traqueostomia: 'TQT',
  'conventional-oxygen': 'O₂',
  'room-air': 'Aire'
};

const typeOptions: { value: PrestacionType; label: string }[] = [
  { value: 'kinesioterapia-respiratoria', label: 'Kinesioterapia Respiratoria' },
  { value: 'kinesioterapia-motora', label: 'Kinesioterapia Motora' }
];

interface BatchResult {
  succeeded: string[]; // patient ids
  failed: { patientId: string; alias: string; error: string }[];
}

export function BulkPrestacionPage() {
  const { patients, sectors } = useApp();

  const [type, setType] = useState<PrestacionType>('kinesioterapia-respiratoria');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const activePatients = useMemo(() => patients.filter((p) => p.status === 'active'), [patients]);
  const bySector = useMemo(
    () =>
      sectors
        .map((sector) => ({ sector, patients: activePatients.filter((p) => p.sectorId === sector.id) }))
        .filter((group) => group.patients.length > 0),
    [sectors, activePatients]
  );

  const allSelected = activePatients.length > 0 && selected.size === activePatients.length;

  const toggle = (patientId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const toggleSector = (patientIds: string[]) => {
    const allIn = patientIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      patientIds.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(activePatients.map((p) => p.id)));
  };

  const handleSubmit = async (patientIds: string[]) => {
    setSubmitting(true);
    const outcomes = await Promise.allSettled(
      patientIds.map((patientId) => prestacionesApi.createPrestacion({ patientId, type, notes: notes.trim() || undefined }))
    );
    const succeeded: string[] = [];
    const failed: BatchResult['failed'] = [];
    outcomes.forEach((outcome, i) => {
      const patientId = patientIds[i];
      if (outcome.status === 'fulfilled') {
        succeeded.push(patientId);
      } else {
        const alias = patients.find((p) => p.id === patientId)?.alias ?? patientId;
        failed.push({ patientId, alias, error: outcome.reason instanceof Error ? outcome.reason.message : 'Error desconocido' });
      }
    });
    setResult({ succeeded, failed });
    setSelected(new Set(failed.map((f) => f.patientId)));
    setSubmitting(false);
  };

  const currentTypeLabel = typeOptions.find((o) => o.value === type)?.label ?? type;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Carga Masiva de Prestaciones" showBack />
      <CoordinatorNav />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-900">
            <strong>⚠️ Herramienta provisoria:</strong> registra las prestaciones a tu propio usuario (no se puede cargar a nombre de
            otro kinesiólogo) — usala mientras el resto del equipo no tiene su propio acceso. La "Productividad por kinesiólogo" del
            Dashboard va a mostrar todo esto bajo tu cuenta.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de prestación</label>
          <div className="flex gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setType(opt.value);
                  setResult(null);
                }}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  type === opt.value ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Input label="Nota (opcional, se aplica a todos los registros del lote)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Ronda de la mañana" />

        {result && (
          <Card className={result.failed.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
            <div className="flex items-start gap-3">
              {result.failed.length === 0 ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {result.succeeded.length} {result.succeeded.length === 1 ? 'prestación registrada' : 'prestaciones registradas'} (
                  {currentTypeLabel}).
                </p>
                {result.failed.length > 0 && (
                  <p className="text-sm text-gray-700 mt-1">
                    Fallaron {result.failed.length}: {result.failed.map((f) => f.alias).join(', ')} — quedaron tildados, tocá "Registrar" de
                    nuevo para reintentar.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Pacientes activos ({activePatients.length})</h2>
          <button type="button" onClick={toggleAll} className="text-sm font-semibold text-blue-600">
            {allSelected ? 'Ninguno' : 'Seleccionar todos'}
          </button>
        </div>

        {bySector.map(({ sector, patients: sectorPatients }) => {
          const ids = sectorPatients.map((p) => p.id);
          const allSectorSelected = ids.every((id) => selected.has(id));
          return (
            <Card key={sector.id} className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="font-bold text-gray-900">{sector.name}</span>
                <button type="button" onClick={() => toggleSector(ids)} className="text-xs font-semibold text-blue-600">
                  {allSectorSelected ? 'Ninguno' : 'Todos'}
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {sectorPatients.map((patient) => (
                  <label key={patient.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                    <input type="checkbox" checked={selected.has(patient.id)} onChange={() => toggle(patient.id)} className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{patient.alias}</div>
                      <div className="text-xs text-gray-500">Cama {patient.bedLabel ?? patient.bedId}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 flex-shrink-0">
                      {supportTypeLabels[patient.supportType] ?? patient.supportType}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          );
        })}

        {activePatients.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-gray-500">No hay pacientes activos.</p>
          </Card>
        )}

        {activePatients.length > 0 && (
          <Button onClick={() => handleSubmit([...selected])} disabled={selected.size === 0 || submitting} fullWidth className="min-h-[64px] text-lg">
            {submitting ? 'Registrando...' : `Registrar ${selected.size} ${selected.size === 1 ? 'Prestación' : 'Prestaciones'}`}
          </Button>
        )}
      </main>
    </div>
  );
}
