import { useEffect, useState } from 'react';
import { CollapsibleSection } from '../ui/Tooltip';
import * as gcsApi from '../../api/gcsApi';
import { gcsComponents, gcsFactorLabel, gcsSummary } from '../../utils/gcs';
import type { GcsAssessment } from '../../types';

const when = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function ntDetail(a: GcsAssessment) {
  return gcsComponents
    .map((c) => (a[c.key] === 'NT' ? `${c.letter}-NT: ${a[`${c.key}NtReason`]}` : undefined))
    .filter(Boolean)
    .join(' · ');
}

/** Valoraciones guardadas, solo de consulta: nunca completan el formulario. */
export function GcsHistory({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<GcsAssessment[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setItems(undefined);
    setFailed(false);
    gcsApi
      .listGcsAssessments({ patientId })
      .then((list) => alive && setItems(list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [patientId]);

  return (
    <CollapsibleSection title={`Valoraciones anteriores${items ? ` (${items.length})` : ''}`} defaultOpen={false}>
      {failed && <p className="text-sm text-red-600">No se pudieron cargar las valoraciones anteriores.</p>}
      {!failed && !items && <p className="text-sm text-gray-500">Cargando...</p>}
      {items?.length === 0 && <p className="text-sm text-gray-500">Este paciente no tiene valoraciones de Glasgow.</p>}
      <ul className="divide-y divide-gray-100">
        {items?.slice(0, 20).map((a) => (
          <li key={a.id} className="py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-gray-900">{gcsSummary(a.eye, a.verbal, a.motor)}</span>
              <span className="text-sm font-semibold text-gray-900 text-right">{a.totalScore !== undefined ? `${a.totalScore}/15` : 'Total no calculable'}</span>
            </div>
            <div className="text-xs text-gray-500">
              {when(a.assessedAt)}
              {a.evaluatedByName ? ` · ${a.evaluatedByName}` : ''}
            </div>
            {ntDetail(a) && <div className="text-xs text-gray-600 mt-0.5">{ntDetail(a)}</div>}
            {a.interferingFactors.length > 0 && <div className="text-xs text-gray-600">Factores: {a.interferingFactors.map(gcsFactorLabel).join(', ')}</div>}
            {a.notes && <div className="text-xs text-gray-600">{a.notes}</div>}
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}
