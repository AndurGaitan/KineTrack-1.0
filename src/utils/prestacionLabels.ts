import type { KtmType, KtrTechnique, OxygenDeviceType } from '../types';

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

/** Tipos de kinesioterapia motora que se pueden marcar en una sesión de KTM. */
export const ktmTypeLabels: Record<KtmType, string> = {
  pasiva: 'Movilización pasiva',
  'activo-asistida': 'Activa asistida',
  activa: 'Activa libre',
  resistida: 'Activa con resistencia',
  sedestacion: 'Sedestación',
  bipedestacion: 'Bipedestación',
  marcha: 'Marcha',
};

export const ktmTypeOptions: { value: KtmType; label: string }[] = (Object.entries(ktmTypeLabels) as [KtmType, string][]).map(
  ([value, label]) => ({ value, label })
);
