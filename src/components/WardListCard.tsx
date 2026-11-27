import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, ClipboardCopyIcon } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useApp } from '../contexts/AppContext';
import { useEditableHandoff } from '../hooks/useEditableHandoff';
import { buildWardList } from '../utils/careFrequency';
import { copyText } from '../utils/clipboard';
import { notifyError, notifySuccess } from '../utils/notify';

/** Listado de piso con la frecuencia de cada paciente. No depende del período del pase. */
export function WardListCard() {
  const { sectors, patients, refreshPatients } = useApp();
  const [refresh, setRefresh] = useState<'loading' | 'ok' | 'failed'>('loading');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Se vuelve a pedir al abrir: otra persona pudo cargar pacientes o cambiar frecuencias.
  useEffect(() => {
    refreshPatients().then((ok) => setRefresh(ok ? 'ok' : 'failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => buildWardList(sectors, patients), [sectors, patients]);
  const editor = useEditableHandoff(list.text);
  if (list.total === 0) return null;

  const handleCopy = async () => {
    try {
      await copyText(editor.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notifySuccess('Listado de piso copiado');
    } catch {
      setOpen(true);
      notifyError('No se pudo copiar automáticamente', 'Seleccioná el texto manualmente.');
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900">Listado de piso</h3>
      <p className="text-sm text-gray-600 mb-3">
        {list.total} paciente{list.total === 1 ? '' : 's'}
        {list.pending > 0 ? ` · ${list.pending} sin frecuencia` : ''}
      </p>
      {refresh === 'failed' && <p className="text-sm text-red-600 mb-3">No se pudo actualizar: puede faltar algún cambio reciente.</p>}
      <Button type="button" onClick={handleCopy} fullWidth disabled={refresh === 'loading' || !editor.text.trim()} className="flex items-center justify-center gap-2">
        {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardCopyIcon className="w-5 h-5" />}
        {refresh === 'loading' ? 'Actualizando…' : copied ? 'Copiado' : 'Copiar listado'}
      </Button>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-sm font-semibold text-blue-700 py-1">
        {open ? 'Ocultar texto' : 'Ver y editar texto'}
      </button>
      {open && (
        <>
          {editor.stale && (
            <p className="text-sm text-amber-900 mb-2">
              Cambiaste el texto y después cambiaron los pacientes.{' '}
              <button type="button" onClick={editor.regenerate} className="font-bold underline">
                Regenerar (descarta mis cambios)
              </button>
            </p>
          )}
          <textarea
            value={editor.text}
            onChange={(e) => editor.onChange(e.target.value)}
            rows={Math.min(18, list.total * 2 + 3)}
            aria-label="Texto del listado de piso"
            className="w-full text-sm font-mono text-gray-900 bg-white border border-gray-200 rounded-xl p-3 resize-y"
          />
        </>
      )}
    </Card>
  );
}
