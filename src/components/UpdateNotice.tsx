import { useEffect, useState } from 'react';

// Identificador de esta versión, fijado al compilar (ver vite.config.ts).
declare const __APP_BUILD__: string;

const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Avisa cuando se publicó una versión nueva mientras la app estaba abierta, para
 * recargar en un momento oportuno en vez de seguir con archivos viejos (que a
 * veces terminan en una pantalla de error al abrir una sección nueva).
 */
export function UpdateNotice() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    // En desarrollo no hay versión compilada que comparar.
    if (typeof __APP_BUILD__ === 'undefined' || __APP_BUILD__ === 'dev') return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { build?: string };
        if (!cancelled && data.build && data.build !== __APP_BUILD__) setAvailable(true);
      } catch {
        // sin conexión: se vuelve a intentar más tarde
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    void check();
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (!available) return null;

  return (
    <div
      role="status"
      className="fixed left-0 right-0 z-40 px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 rounded-2xl bg-gray-900 text-gray-50 px-4 py-3 shadow-lg">
        <span className="text-sm font-medium">Hay una versión nueva de KineTrack</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 text-white text-sm font-semibold px-3 py-1.5"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
