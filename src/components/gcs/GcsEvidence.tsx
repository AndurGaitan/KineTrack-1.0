import { CollapsibleSection } from '../ui/Tooltip';

const references = [
  {
    text: 'Teasdale G, Jennett B. Assessment of coma and impaired consciousness. A practical scale. Lancet. 1974;304(7872):81-84.',
    doi: '10.1016/S0140-6736(74)91639-0',
  },
  {
    text: 'Teasdale G, Maas A, Lecky F, Manley G, Stocchetti N, Murray G. The Glasgow Coma Scale at 40 years: standing the test of time. Lancet Neurol. 2014;13(8):844-854.',
    doi: '10.1016/S1474-4422(14)70120-6',
  },
  {
    text: 'Reith FCM, Van den Brande R, Synnot A, Gruen R, Maas AIR. The reliability of the Glasgow Coma Scale: a systematic review. Intensive Care Med. 2016;42(1):3-15.',
    doi: '10.1007/s00134-015-4124-3',
  },
];

const steps = [
  ['Comprobar', 'factores que interfieran con la comunicación, la capacidad de respuesta y otras lesiones.'],
  ['Observar', 'apertura ocular, contenido del habla y movimientos de ambos lados.'],
  ['Estimular', 'con una orden hablada o gritada; si hace falta, con presión en la punta del dedo, el trapecio o la escotadura supraorbitaria.'],
  ['Valorar', 'según la mejor respuesta observada.'],
];

const link = 'text-blue-700 font-medium underline break-words';

export function GcsEvidence() {
  return (
    <CollapsibleSection title="Metodología y evidencia" defaultOpen={false}>
      <div className="space-y-4 text-sm text-gray-700">
        <ol className="space-y-1.5">
          {steps.map(([name, text], i) => (
            <li key={name}>
              <strong className="text-gray-900">
                {i + 1}. {name}:
              </strong>{' '}
              {text}
            </li>
          ))}
        </ol>
        <div>
          <strong className="text-gray-900">Flexión normal:</strong> rápida, variable, con el brazo separado del cuerpo.
          <br />
          <strong className="text-gray-900">Flexión anormal:</strong> lenta y estereotipada, brazo sobre el pecho, antebrazo rotado, pulgar apretado, pierna extendida.
        </div>
        <p>
          Si un componente no es evaluable se registra NT, no 1, y no se informa el total. Con intubación o traqueostomía que impida evaluar la respuesta verbal,
          corresponde V-NT.
        </p>
        <p>
          <a className={link} href="https://www.glasgowcomascale.org/" target="_blank" rel="noreferrer">
            glasgowcomascale.org
          </a>
          {' · '}
          <a className={link} href="https://glasgowcomascale.org/downloads/GCS-Assessment-Aid-Spanish.pdf" target="_blank" rel="noreferrer">
            Ayuda oficial en español (PDF)
          </a>
        </p>
        <ul className="space-y-2 text-xs text-gray-600">
          {references.map((r) => (
            <li key={r.doi}>
              {r.text}{' '}
              <a className={link} href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">
                doi:{r.doi}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500">
          Glasgow Coma Scale © University of Glasgow. GCS Aid © Sir Graham Teasdale. Criterios basados en la ayuda oficial.
        </p>
      </div>
    </CollapsibleSection>
  );
}
