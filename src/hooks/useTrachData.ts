import { useCallback, useEffect, useState } from 'react';
import * as trachApi from '../api/trachApi';
import * as prestacionesApi from '../api/prestacionesApi';
import type { Prestacion, TrachDecannulationProcess, TrachOverview } from '../types';

/**
 * Everything the TQT hub needs beyond what AppContext already holds
 * (status records and episodes): the decannulation overview and the
 * patient's prestaciones (KTR/KTM), so the timeline shows both.
 */
export function useTrachData(patientId: string | undefined) {
  const [overview, setOverview] = useState<TrachOverview | null>(null);
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!patientId) return;
    try {
      const [overviewMap, prestacionesList] = await Promise.all([
        trachApi.getTrachOverview([patientId]),
        prestacionesApi.listPrestaciones({ patientId }),
      ]);
      setOverview(overviewMap[patientId] ?? { activeProcess: null, pastProcesses: [], aspirations: [] });
      setPrestaciones(prestacionesList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el seguimiento');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  /** The process endpoints return the whole updated process — swap it in without refetching. */
  const setActiveProcess = useCallback((process: TrachDecannulationProcess | null) => {
    setOverview((prev) => (prev ? { ...prev, activeProcess: process } : prev));
  }, []);

  return { overview, prestaciones, loading, error, reload, setActiveProcess };
}
