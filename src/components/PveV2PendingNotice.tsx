import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import * as qualityV2Api from '../api/qualityV2Api';

/**
 * Aviso discreto (indicadores de calidad v2, modo sombra): desde la hora configurada de la institución (18:00 por
 * defecto) recuerda qué pacientes en VMI todavía no tienen registrada la elegibilidad para PVE de hoy.
 * Con la flag apagada no pide nada ni muestra nada.
 */
export function PveV2PendingNotice() {
  const { qualityIndicatorsV2 } = useApp();
  const [data, setData] = useState<qualityV2Api.PendingResponse | null>(null);

  useEffect(() => {
    if (!qualityIndicatorsV2) return;
    let alive = true;
    qualityV2Api
      .getPending()
      .then((r) => alive && setData(r))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [qualityIndicatorsV2]);

  if (!qualityIndicatorsV2 || !data || !data.afterWarningTime || data.pending.length === 0) return null;

  const beds = data.pending.map((p) => (p.bed ? `cama ${p.bed}` : p.alias ?? 'paciente')).join(', ');
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
      Pendiente de registrar la PVE de hoy (elegibilidad o realización): {beds}.
    </div>
  );
}
