import type { KtrTechnique, OxygenDeviceType } from '../types';

export const oxygenDeviceLabels: Record<OxygenDeviceType, string> = {
  'canula-nasal-simple': 'Cánula nasal simple',
  'mascara-simple': 'Máscara simple',
  'mascara-venturi': 'Máscara Venturi',
  'mascara-no-reinhalacion': 'Máscara de no reinhalación',
};

export const oxygenDeviceOptions: { value: OxygenDeviceType; label: string }[] = (
  Object.entries(oxygenDeviceLabels) as [OxygenDeviceType, string][]
).map(([value, label]) => ({ value, label }));

/** Técnicas que se pueden marcar en una kinesioterapia respiratoria. */
export const ktrTechniqueLabels: Record<KtrTechnique, string> = {
  'higiene-bronquial': 'Higiene bronquial',
  'ejercicios-respiratorios': 'Ejercicios respiratorios',
  'tos-asistida': 'Tos asistida',
  'drenaje-postural': 'Drenaje postural',
  'vibracion-percusion': 'Vibración / percusión',
  nebulizacion: 'Nebulización',
};

export const ktrTechniqueOptions: { value: KtrTechnique; label: string }[] = (
  Object.entries(ktrTechniqueLabels) as [KtrTechnique, string][]
).map(([value, label]) => ({ value, label }));
