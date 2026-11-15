import type { VentilatoryMechanics } from '../types';

/** Valoración de la mecánica ventilatoria (VMNI, CAFO y oxígeno convencional). */
export const ventilatoryMechanicsLabels: Record<VentilatoryMechanics, string> = {
  mala: 'Mala',
  regular: 'Regular',
  buena: 'Buena',
};

export const ventilatoryMechanicsOptions: { value: VentilatoryMechanics; label: string }[] = (
  Object.entries(ventilatoryMechanicsLabels) as [VentilatoryMechanics, string][]
).map(([value, label]) => ({ value, label }));

/** "Presenta mecánica ventilatoria regular." — para la evolución. */
export const ventilatoryMechanicsSentence = (v: VentilatoryMechanics): string => `Presenta mecánica ventilatoria ${v}.`;
