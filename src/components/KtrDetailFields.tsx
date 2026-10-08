import type { ReactNode } from 'react';
import { ktrTechniqueOptions } from '../utils/prestacionLabels';
import { secretionAmountLabels, secretionCharacterLabels } from '../domain/services/trachDecannulation';
import type { KtrTechnique, TrachSecretionAmount, TrachSecretionCharacter } from '../types';

/** Detalle opcional de una kinesioterapia respiratoria. Todo es opcional; vacío = "no indicado". */
export interface KtrDetail {
  techniques: KtrTechnique[];
  aspirated: boolean | undefined;
  secretionAmount: TrachSecretionAmount | undefined;
  secretionCharacter: TrachSecretionCharacter | undefined;
}

export const emptyKtrDetail: KtrDetail = { techniques: [], aspirated: undefined, secretionAmount: undefined, secretionCharacter: undefined };

/** Campos del detalle listos para enviar a la API (solo lo indicado). */
export function ktrDetailPayload(detail: KtrDetail) {
  return {
    techniques: detail.techniques.length > 0 ? detail.techniques : undefined,
    aspirated: detail.aspirated,
    secretionAmount: detail.secretionAmount,
    secretionCharacter: detail.secretionCharacter,
  };
}

const AMOUNTS = Object.keys(secretionAmountLabels) as TrachSecretionAmount[];
const CHARACTERS = Object.keys(secretionCharacterLabels) as TrachSecretionCharacter[];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const chip = (active: boolean) =>
  `px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
    active ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'
  }`;

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {hint && <div className="text-xs text-gray-400">{hint}</div>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * Técnicas, aspiración y secreciones (cantidad y calidad) de un KTR. Tocar de
 * nuevo una opción elegida la deselecciona. Aspiración y secreciones son
 * independientes (p. ej. "sin aspiración, secreciones moderadas").
 */
export function KtrDetailFields({ value, onChange }: { value: KtrDetail; onChange: (next: KtrDetail) => void }) {
  const toggleTechnique = (t: KtrTechnique) =>
    onChange({
      ...value,
      techniques: value.techniques.includes(t) ? value.techniques.filter((x) => x !== t) : [...value.techniques, t],
    });

  return (
    <div className="space-y-4">
      <Group title="Técnicas" hint="Opcional, podés marcar varias">
        {ktrTechniqueOptions.map((o) => (
          <button key={o.value} type="button" onClick={() => toggleTechnique(o.value)} className={chip(value.techniques.includes(o.value))}>
            {o.label}
          </button>
        ))}
      </Group>

      <Group title="Aspiración de secreciones" hint="Opcional">
        <button type="button" onClick={() => onChange({ ...value, aspirated: value.aspirated === true ? undefined : true })} className={chip(value.aspirated === true)}>
          Con aspiración
        </button>
        <button type="button" onClick={() => onChange({ ...value, aspirated: value.aspirated === false ? undefined : false })} className={chip(value.aspirated === false)}>
          Sin aspiración
        </button>
      </Group>

      <Group title="Cantidad de secreciones" hint="Opcional">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange({ ...value, secretionAmount: value.secretionAmount === a ? undefined : a })}
            className={chip(value.secretionAmount === a)}
          >
            {secretionAmountLabels[a]}
          </button>
        ))}
      </Group>

      <Group title="Calidad de secreciones" hint="Opcional">
        {CHARACTERS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ ...value, secretionCharacter: value.secretionCharacter === c ? undefined : c })}
            className={chip(value.secretionCharacter === c)}
          >
            {capitalize(secretionCharacterLabels[c])}
          </button>
        ))}
      </Group>
    </div>
  );
}
