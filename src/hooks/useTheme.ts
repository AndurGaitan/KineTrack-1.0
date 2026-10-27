import { useCallback, useEffect, useState } from 'react';

/** 'auto' sigue al sistema (claro u oscuro del teléfono); 'light' y 'dark' lo fuerzan. */
export type ThemeChoice = 'auto' | 'light' | 'dark';

const KEY = 'kinetrack-theme';

export function readStoredTheme(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

/** Aplica la preferencia guardada antes de dibujar la app, para que no parpadee. */
export function initTheme(): void {
  applyTheme(readStoredTheme());
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readStoredTheme);

  useEffect(() => {
    applyTheme(choice);
  }, [choice]);

  const update = useCallback((next: ThemeChoice) => {
    try {
      if (next === 'auto') window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, next);
    } catch {
      // sin almacenamiento: la elección vale hasta cerrar la app
    }
    setChoice(next);
  }, []);

  return { choice, setTheme: update };
}
