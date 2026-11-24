import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import * as docsApi from '../../api/protocolDocumentsApi';
import type { ProtocolDocument } from '../../api/protocolDocumentsApi';

const fmtSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const fmtDate = (s?: string) => (s ? s.split('-').reverse().join('/') : null);

/**
 * Biblioteca de protocolos en PDF (solo coordinador). Es independiente del registro de protocolos (QI-04):
 * no lo modifica ni lo usa para ningún cálculo.
 */
export function ProtocolLibraryPage() {
  const [docs, setDocs] = useState<ProtocolDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    docsApi
      .listProtocolDocuments()
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la biblioteca'));
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (docs ?? []).filter((d) => !q || `${d.title} ${d.category ?? ''} ${d.description ?? ''}`.toLowerCase().includes(q));
    const byCategory = new Map<string, ProtocolDocument[]>();
    for (const d of filtered) byCategory.set(d.category ?? 'Sin categoría', [...(byCategory.get(d.category ?? 'Sin categoría') ?? []), d]);
    return [...byCategory.entries()];
  }, [docs, query]);

  const run = async (doc: ProtocolDocument, action: (d: ProtocolDocument) => Promise<void>) => {
    setBusyId(doc.id);
    setError(null);
    try {
      await action(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el documento');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Biblioteca de protocolos" showBack />
      <CoordinatorNav />

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {docs === null && !error && <p className="text-gray-500">Cargando...</p>}

        {docs !== null && docs.length === 0 && (
          <Card className="text-center py-10">
            <p className="text-gray-600">Todavía no hay documentos en la biblioteca.</p>
          </Card>
        )}

        {docs !== null && docs.length > 0 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar protocolo…"
            className="w-full min-h-[48px] px-3 text-base border-2 border-gray-300 rounded-xl bg-white focus:border-blue-600 focus:outline-none"
            aria-label="Buscar protocolo"
          />
        )}

        {groups.map(([category, items]) => (
          <section key={category} className="space-y-2">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{category}</h2>
            {items.map((d) => (
              <Card key={d.id}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">{d.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[d.version, d.updatedAt ? `actualizado el ${fmtDate(d.updatedAt)}` : null, `PDF · ${fmtSize(d.sizeBytes)}`].filter(Boolean).join(' · ')}
                    </div>
                    {d.description && <p className="text-sm text-gray-600 mt-1">{d.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-none">
                    <Button disabled={busyId === d.id} onClick={() => run(d, docsApi.openProtocolDocument)}>
                      {busyId === d.id ? 'Abriendo...' : 'Ver'}
                    </Button>
                    <Button variant="secondary" disabled={busyId === d.id} onClick={() => run(d, docsApi.downloadProtocolDocument)}>
                      Descargar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        ))}

        {docs !== null && docs.length > 0 && groups.length === 0 && <p className="text-sm text-gray-500">Ningún protocolo coincide con la búsqueda.</p>}
      </main>
    </div>
  );
}
