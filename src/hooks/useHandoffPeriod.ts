import { useCallback, useMemo, useState } from 'react';
import { HandoffPeriod, PeriodPreset, resolvePeriod } from '../domain/services/handoffData';
import { toLocalDateTimeInputValue } from '../utils/dateInput';

/** Estado del selector de período + alcance (solo lo mío / todo el equipo). */
export function useHandoffPeriod() {
  const [preset, setPreset] = useState<PeriodPreset>('hoy');
  const [day, setDay] = useState(() => toLocalDateTimeInputValue(new Date()).slice(0, 10));
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toLocalDateTimeInputValue(d);
  });
  const [customTo, setCustomTo] = useState(() => toLocalDateTimeInputValue(new Date()));
  const [mineOnly, setMineOnly] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const period: HandoffPeriod = useMemo(
    () => resolvePeriod({ preset, day, customFrom, customTo }),
    // refreshKey vuelve a calcular "ahora" para las ventanas de 12/24 h.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preset, day, customFrom, customTo, refreshKey]
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { preset, setPreset, day, setDay, customFrom, setCustomFrom, customTo, setCustomTo, mineOnly, setMineOnly, period, refresh };
}

export type HandoffPeriodState = ReturnType<typeof useHandoffPeriod>;
