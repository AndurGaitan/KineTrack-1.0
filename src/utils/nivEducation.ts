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
  ipapEpap: {
    title: 'IPAP / EPAP (o PS / PEEP)',
    definition: 'IPAP: presión inspiratoria máxima. EPAP: presión espiratoria (equivalente a PEEP).',
    importance: 'La diferencia IPAP-EPAP determina el soporte ventilatorio. EPAP mantiene vía aérea abierta y recluta alvéolos.',
    target: 'Inicio típico: IPAP 12-16, EPAP 4-6. Titular según respuesta',
    example: 'Aumentar IPAP si persiste taquipnea/hipercapnia. Aumentar EPAP si hipoxemia.'
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
  value: 'cpap',
  label: 'CPAP'
}, {
  value: 'bipap',
  label: 'BiPAP / BiLevel'
}, {
  value: 'other',
  label: 'Otro modo'
}];