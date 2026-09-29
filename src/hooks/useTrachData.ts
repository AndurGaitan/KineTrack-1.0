import { useCallback, useEffect, useState } from 'react';
import * as trachApi from '../api/trachApi';
import type { TrachDecannulationProcess, TrachOverview } from '../types';

/**
 * Everything the TQT hub needs beyond what AppContext already holds
 * (status records, episodes and prestaciones): the decannulation overview.
 */
export function useTrachData(patientId: string | undefined) {
  const [overview, setOverview] = useState<TrachOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!patientId) return;
    try {
      const overviewMap = await trachApi.getTrachOverview([patientId]);
      setOverview(overviewMap[patientId] ?? { activeProcess: null, pastProcesses: [], aspirations: [] });
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

  return { overview, loading, error, reload, setActiveProcess };
}
