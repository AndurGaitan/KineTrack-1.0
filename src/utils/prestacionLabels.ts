import type { OxygenDeviceType } from '../types';

export const oxygenDeviceLabels: Record<OxygenDeviceType, string> = {
  'canula-nasal-simple': 'Cánula nasal simple',
  'mascara-simple': 'Máscara simple',
  'mascara-venturi': 'Máscara Venturi',
  'mascara-no-reinhalacion': 'Máscara de no reinhalación',
};

export const oxygenDeviceOptions: { value: OxygenDeviceType; label: string }[] = (
  Object.entries(oxygenDeviceLabels) as [OxygenDeviceType, string][]
).map(([value, label]) => ({ value, label }));
