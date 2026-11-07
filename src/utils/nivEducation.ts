export const nivEducation = {
  interface: {
    title: 'Tipo de Interfaz',
    definition: 'La interfaz es el dispositivo que conecta al paciente con el ventilador no invasivo.',
    importance: 'La elección correcta de la interfaz impacta directamente en la tolerancia, efectividad y riesgo de lesiones cutáneas.',
    target: 'Elegir según anatomía facial, tolerancia y objetivos terapéuticos',
    example: 'Máscara oronasal: más común, mejor para hipercapnia. Nasal: mejor tolerancia a largo plazo.'
  },
  skinIntegrity: {
    title: 'Integridad de la Piel',
    definition: 'Evaluación del estado de la piel en áreas de contacto con la interfaz de VNI.',
    importance: 'Las lesiones por presión son una complicación frecuente de VNI que puede llevar a discontinuación del tratamiento.',
    target: 'Prevención activa: rotación de interfaces, protección cutánea, ajuste óptimo',
    example: 'Puente nasal es la zona más vulnerable. Inspección cada 4-6 horas.'
  },
  hacorNIV: {
    title: 'Score HACOR en VNI',
    definition: 'Herramienta validada para predecir fracaso de ventilación no invasiva en las primeras horas.',
    importance: 'Permite identificar tempranamente pacientes que requerirán intubación, evitando VNI prolongada inútil.',
    target: 'HACOR > 5 a la hora 1: alto riesgo de fracaso (> 80%)',
    example: 'Evaluar a la 1h, 6h, 12h y 24h del inicio de VNI'
  },
  supportPressureNIV: {
    title: 'Presión de Soporte (PS)',
    definition: 'Presión inspiratoria adicional que entrega el ventilador por sobre el PEEP en cada ciclo, en modo PSV/CPAP.',
    importance: 'Determina el volumen corriente asistido y el trabajo respiratorio del paciente. Es el principal ajuste para taquipnea o hipercapnia.',
    target: 'Inicio típico: PS 8-12 cmH₂O. Titular según FR, Vt y confort del paciente',
    example: 'Aumentar PS si persiste taquipnea o hipercapnia con buen esfuerzo inspiratorio.'
  },
  peepNIV: {
    title: 'PEEP',
    definition: 'Presión positiva al final de la espiración. Mantiene la vía aérea superior y los alvéolos abiertos entre ciclos.',
    importance: 'Contrarresta la obstrucción/colapso de vía aérea superior y mejora la oxigenación al reclutar alvéolos.',
    target: 'Inicio típico: PEEP 4-8 cmH₂O. Aumentar si persiste hipoxemia',
    example: 'Presión pico entregada al paciente = PS + PEEP.'
  },
  expiratorySensitivity: {
    title: 'Sensibilidad Espiratoria (Etrigger)',
    definition: 'Umbral de flujo inspiratorio (como % del pico) al que el ventilador cicla de inspiración a espiración.',
    importance: 'Un valor mal ajustado genera asincronías: ciclado tardío (fugas, EPOC) o precoz (interrumpe la inspiración del paciente).',
    target: 'Rango típico: 25-40%. Bajar el % si hay ciclado precoz, subirlo si hay ciclado tardío/fugas',
    example: 'Paciente con fuga alta por la interfaz: suele necesitar mayor % de sensibilidad espiratoria para ciclar a tiempo.'
  },
  gasometriaNIV: {
    title: 'Gasometría Arterial en VNI',
    definition: 'Panel de pH, PaO₂, PaCO₂, HCO₃ y SatO₂ para evaluar oxigenación, ventilación y equilibrio ácido-base.',
    importance: 'Permite distinguir falla oxigenatoria de ventilatoria, detectar retención de CO₂ y objetivar la respuesta a los ajustes de PS/PEEP.',
    target: 'Reevaluar tras cada cambio de parámetros relevante y en los controles programados (1h, 6h, 12h, 24h)',
    example: 'PaCO₂ que no mejora pese a subir PS sugiere fuga excesiva o fatiga muscular, no solo falta de soporte.'
  },
  previousIMV: {
    title: 'Días Previos de VMI',
    definition: 'Tiempo que el paciente estuvo en ventilación mecánica invasiva antes de pasar a VNI.',
    importance: 'VMI prolongada se asocia a debilidad muscular respiratoria, mayor riesgo de fracaso de VNI y necesidad de soporte más prolongado.',
    target: 'Documentar para contextualizar expectativas de destete',
    example: 'Paciente con 10 días de VMI: mayor probabilidad de requerir VNI prolongada'
  }
};
export const interfaceTypes = [{
  value: 'full-face',
  label: 'Máscara facial total',
  description: 'Cubre nariz y boca completamente'
}, {
  value: 'oronasal',
  label: 'Máscara oronasal',
  description: 'Estándar, cubre nariz y boca'
}, {
  value: 'nasal',
  label: 'Máscara nasal',
  description: 'Solo nariz, mejor tolerancia'
}, {
  value: 'helmet',
  label: 'Helmet',
  description: 'Casco, menor riesgo de lesiones'
}, {
  value: 'other',
  label: 'Otra',
  description: 'Especificar'
}];
export const skinIntegrityOptions = [{
  value: 'no-lesions',
  label: 'Sin lesiones',
  color: 'green'
}, {
  value: 'mild-erythema',
  label: 'Eritema leve',
  color: 'yellow'
}, {
  value: 'pressure-injury-1-2',
  label: 'Lesión por presión grado I-II',
  color: 'orange'
}, {
  value: 'severe-injury',
  label: 'Lesión grave',
  color: 'red'
}];
export const lesionLocations = ['Puente nasal', 'Mejillas', 'Frente', 'Mentón', 'Región perioral', 'Orejas (por arnés)'];
export const nivModes = [{
  value: 'psv',
  label: 'PSV',
  hint: 'PS + PEEP'
}, {
  value: 'cpap',
  label: 'CPAP',
  hint: 'Presión continua'
}, {
  value: 'bipap',
  label: 'BiPAP / BiLevel',
  hint: 'PS + PEEP'
}, {
  value: 'other',
  label: 'Otro modo',
  hint: 'Especificar'
}];

/** Uso de la VNI en las últimas 24 h: un toque, sin reloj de sesiones. */
export const nivUsageOptions = [
  { value: 'continuous', label: 'Continua', hint: 'Las 24 h', short: 'de forma continua' },
  { value: 'gt16', label: 'Más de 16 h', hint: 'Casi todo el día', short: 'más de 16 horas en las últimas 24' },
  { value: '12-16', label: '12 a 16 h', hint: '', short: 'entre 12 y 16 horas en las últimas 24' },
  { value: '8-12', label: '8 a 12 h', hint: '', short: 'entre 8 y 12 horas en las últimas 24' },
  { value: '4-8', label: '4 a 8 h', hint: '', short: 'entre 4 y 8 horas en las últimas 24' },
  { value: 'lt4', label: 'Menos de 4 h', hint: 'Casi destetado', short: 'menos de 4 horas en las últimas 24' }
] as const;

/** Etiquetas para los pases: `nivUsageText[valor]` → "entre 8 y 12 horas en las últimas 24". */
export const nivUsageText: Record<string, string> = Object.fromEntries(nivUsageOptions.map(o => [o.value, o.short]));
export const nivUsageShort: Record<string, string> = Object.fromEntries(nivUsageOptions.map(o => [o.value, o.value === 'continuous' ? 'continua' : o.label.replace('Más de 16 h', '>16 h').replace('Menos de 4 h', '<4 h').replace(' a ', '–')]));

/** Etiqueta corta del modo para los pases (PSV, CPAP, BiPAP). */
export const nivModeShort: Record<string, string> = { psv: 'PSV', cpap: 'CPAP', bipap: 'BiPAP' };
