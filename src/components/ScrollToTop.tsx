import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Cada pantalla nueva arranca desde arriba. Sin esto, la app conserva el desplazamiento de la pantalla
 * anterior (todo ocurre en una sola página). Al volver atrás no se toca: se recupera dónde estabas.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
