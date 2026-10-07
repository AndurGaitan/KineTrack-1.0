/** Copia texto al portapapeles; lanza si ningún método funciona. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Sin permiso o sin foco: se prueba el método alternativo.
    }
  }
  // Fallback con textarea fuera de pantalla (`position: absolute; left: -9999px`,
  // en el flujo normal, en vez de `fixed; opacity: 0`, que puede quedar encima
  // del contenido visible). El try/finally garantiza la limpieza aunque
  // execCommand falle.
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  let ok = false;
  try {
    textarea.focus();
    textarea.select();
    ok = document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
  if (!ok) throw new Error('No se pudo copiar al portapapeles');
}
