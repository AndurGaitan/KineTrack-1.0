import { useEffect, useState, FormEvent } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import * as protocolsApi from '../../api/protocolsApi';
import { Protocol } from '../../types';
import { useFormRetry } from '../../hooks/useRetry';
import { attempt, dismissRetry, notifyError, notifySuccess, offerRetry } from '../../utils/notify';

const emptyForm = {
  name: '',
  isPriority: false,
  approved: false,
  version: '',
  effectiveFrom: '',
  validUntil: '',
  available: true,
  archived: false,
  replaced: false,
};

export function ProtocolsAdminPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { formRef, retry } = useFormRetry();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    protocolsApi
      .listProtocols()
      .then(setProtocols)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setError('El nombre es obligatorio');
      return;
    }
    setError(null);
    dismissRetry(retry);
    try {
      await protocolsApi.createProtocol({
        ...form,
        version: form.version || undefined,
        effectiveFrom: form.effectiveFrom || undefined,
        validUntil: form.validUntil || undefined,
      });
      notifySuccess('Protocolo creado', form.name);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      notifyError('No se pudo crear el protocolo', err);
      offerRetry(retry);
    }
  };

  const toggleField = async (protocol: Protocol, field: 'approved' | 'available' | 'archived' | 'replaced' | 'isPriority') => {
    await attempt(
      async () => {
        await protocolsApi.updateProtocol(protocol.id, { [field]: !protocol[field] });
        load();
      },
      { success: 'Protocolo actualizado', detail: protocol.name, failure: 'No se pudo actualizar el protocolo' }
    );
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este protocolo?')) return;
    await attempt(
      async () => {
        await protocolsApi.deleteProtocol(id);
        load();
      },
      { success: 'Protocolo eliminado', failure: 'No se pudo eliminar el protocolo' }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Protocolos (QI-04)" showBack />
      <CoordinatorNav />

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Registro de protocolos</h2>
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancelar' : '+ Nuevo Protocolo'}</Button>
        </div>

        {showForm && (
          <Card>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Protocolo de sedoanalgesia" />
              <Input label="Versión" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="Ej: v2" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Vigente desde" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
                <Input label="Vigente hasta" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isPriority} onChange={(e) => setForm({ ...form, isPriority: e.target.checked })} /> Prioritario
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.approved} onChange={(e) => setForm({ ...form, approved: e.target.checked })} /> Aprobado
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> Disponible
                </label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" fullWidth>
                Crear
              </Button>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {protocols.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.version ? `Versión ${p.version}` : 'Sin versión'}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {p.isPriority && <Badge className="bg-purple-100 text-purple-700">Prioritario</Badge>}
                    <Badge variant="risk" type={p.vigente ? 'low' : 'high'}>
                      {p.vigente ? 'Vigente' : 'No vigente'}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(['isPriority', 'approved', 'available', 'archived', 'replaced'] as const).map((field) => (
                    <button
                      key={field}
                      onClick={() => toggleField(p, field)}
                      className={`px-2 py-1 rounded-md border ${p[field] ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      {field} {p[field] ? '✓' : '—'}
                    </button>
                  ))}
                  <button onClick={() => handleDelete(p.id)} className="px-2 py-1 rounded-md border border-red-200 text-red-600 ml-auto">
                    Eliminar
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
