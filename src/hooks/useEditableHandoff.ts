import { useEffect, useRef, useState } from 'react';

/**
 * Texto generado que el usuario puede editar a mano. Mientras no lo toque, se
 * actualiza solo con lo generado. Si lo editó y después cambian las opciones
 * (período, alcance, pacientes...), NO se pisa su texto: `stale` avisa y
 * `regenerate` descarta sus cambios.
 */
export function useEditableHandoff(generated: string) {
  const [text, setText] = useState(generated);
  const [edited, setEdited] = useState(false);
  const baseline = useRef(generated);

  useEffect(() => {
    if (!edited) {
      setText(generated);
      baseline.current = generated;
    }
  }, [generated, edited]);

  const onChange = (value: string) => {
    if (!edited) {
      baseline.current = generated;
      setEdited(true);
    }
    setText(value);
  };

  const regenerate = () => {
    setEdited(false);
    setText(generated);
    baseline.current = generated;
  };

  return { text, onChange, edited, stale: edited && generated !== baseline.current, regenerate };
}
