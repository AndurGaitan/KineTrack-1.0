/**
 * Escala de Coma de Glasgow. Criterios de la ayuda oficial "GCS: Do it this way"
 * (https://www.glasgowcomascale.org/, © Sir Graham Teasdale 2015), en su versión en español.
 * Donde la traducción publicada se aparta del original en inglés (M6, M5 y M4) se sigue el original.
 */
import type { GcsAssessment, GcsFactor, GcsValue, Patient } from '../types';

export type GcsComponentKey = 'eye' | 'verbal' | 'motor';

export interface GcsComponent {
  key: GcsComponentKey;
  letter: 'E' | 'V' | 'M';
  title: string;
  responses: { score: GcsValue; label: string; criterion: string }[];
  ntReasons: string[];
}

export const gcsComponents: GcsComponent[] = [
  {
    key: 'eye',
    letter: 'E',
    title: 'Apertura ocular',
    responses: [
      { score: 4, label: 'Espontánea', criterion: 'Abre antes de cualquier estímulo' },
      { score: 3, label: 'Al sonido', criterion: 'Abre tras una orden hablada o gritada' },
      { score: 2, label: 'A la presión', criterion: 'Abre tras estímulo en la punta del dedo' },
      { score: 1, label: 'Ninguna', criterion: 'No abre en ningún momento, sin factor que interfiera' },
      { score: 'NT', label: 'No evaluable', criterion: 'Ojos cerrados por un factor local' },
    ],
    ntReasons: ['Edema o traumatismo ocular', 'Apósito o vendaje'],
  },
  {
    key: 'verbal',
    letter: 'V',
    title: 'Respuesta verbal',
    responses: [
      { score: 5, label: 'Orientado', criterion: 'Dice correctamente nombre, lugar y fecha' },
      { score: 4, label: 'Confuso', criterion: 'No está orientado, pero se comunica con coherencia' },
      { score: 3, label: 'Palabras', criterion: 'Palabras sueltas inteligibles' },
      { score: 2, label: 'Sonidos', criterion: 'Solo quejidos o gemidos' },
      { score: 1, label: 'Ninguna', criterion: 'Sin respuesta audible, sin factor que interfiera' },
      { score: 'NT', label: 'No evaluable', criterion: 'Un factor interfiere en la comunicación' },
    ],
    ntReasons: ['Tubo orotraqueal', 'Traqueostomía', 'Sedación', 'Afasia o disfasia', 'Idioma o audición'],
  },
  {
    key: 'motor',
    letter: 'M',
    title: 'Respuesta motora',
    responses: [
      { score: 6, label: 'Obedece órdenes', criterion: 'Cumple una orden de dos pasos' },
      { score: 5, label: 'Localiza', criterion: 'Lleva la mano sobre la clavícula ante un estímulo en cabeza o cuello' },
      { score: 4, label: 'Flexión normal', criterion: 'Flexiona el codo rápido, sin rasgos predominantemente anormales' },
      { score: 3, label: 'Flexión anormal', criterion: 'Flexiona el codo con rasgos claramente anormales' },
      { score: 2, label: 'Extensión', criterion: 'Extiende el brazo a nivel del codo' },
      { score: 1, label: 'Ninguna', criterion: 'Sin movimiento de brazos ni piernas, sin factor que interfiera' },
      { score: 'NT', label: 'No evaluable', criterion: 'Parálisis u otro factor limitante' },
    ],
    ntReasons: ['Bloqueo neuromuscular', 'Sedación', 'Lesión medular', 'Limitación de extremidades'],
  },
];

export const gcsFactorOptions: { value: GcsFactor; label: string }[] = [
  { value: 'sedacion', label: 'Sedación' },
  { value: 'bloqueo-neuromuscular', label: 'Bloqueo neuromuscular' },
  { value: 'limitacion-fisica', label: 'Limitación física' },
  { value: 'lenguaje-audicion', label: 'Lenguaje o audición' },
  { value: 'tubo-orotraqueal', label: 'Tubo orotraqueal' },
  { value: 'traqueostomia', label: 'Traqueostomía' },
  { value: 'otro', label: 'Otro' },
];

export const gcsFactorLabel = (factor: GcsFactor) => gcsFactorOptions.find((o) => o.value === factor)?.label ?? factor;

/** Total (3-15) solo con los tres componentes evaluables; con algún NT no se informa total. */
export function gcsTotal(eye: GcsValue, verbal: GcsValue, motor: GcsValue): number | undefined {
  if (eye === 'NT' || verbal === 'NT' || motor === 'NT') return undefined;
  return eye + verbal + motor;
}

const part = (letter: string, value: GcsValue) => (value === 'NT' ? `${letter}-NT` : `${letter}${value}`);

/** "E3 V-NT M5" */
export function gcsSummary(eye: GcsValue, verbal: GcsValue, motor: GcsValue): string {
  return [part('E', eye), part('V', verbal), part('M', motor)].join(' ');
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const joinEs = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);

/** Componentes NT con su motivo, y los factores que ese motivo no haya dicho ya. */
function gcsContext(a: GcsAssessment) {
  const nt = gcsComponents.filter((c) => a[c.key] === 'NT').map((c) => ({ ...c, reason: lower(a[`${c.key}NtReason`] ?? '') }));
  const said = new Set(nt.map((c) => c.reason.toLowerCase()));
  const factors = a.interferingFactors.map((f) => lower(gcsFactorLabel(f))).filter((label) => !said.has(label));
  return { nt, factors, notes: a.notes?.trim().replace(/[.\s]+$/, '') };
}

/** Para la evolución (prosa): "Escala de Glasgow de 14/15 (E4 V4 M6)." */
export function gcsSentence(a: GcsAssessment): string {
  const { nt, factors, notes } = gcsContext(a);
  const summary = gcsSummary(a.eye, a.verbal, a.motor);
  const reasons = nt.map((c) => `${c.title.toLowerCase()} no evaluable${c.reason ? ` por ${c.reason}` : ''}`);
  const main =
    a.totalScore !== undefined
      ? `Escala de Glasgow de ${a.totalScore}/15 (${summary}).`
      : `Escala de Glasgow ${summary}, sin total calculable${reasons.length > 0 ? `: ${joinEs(reasons)}` : ''}.`;
  return [main, factors.length > 0 ? `Factores de interferencia: ${joinEs(factors)}.` : '', notes ? `Observación de la valoración: ${notes}.` : ''].filter(Boolean).join(' ');
}

/** Partes de la línea del pase compacto: "14/15 (E4 V4 M6)" y, si hay, NT, factores y nota. */
export function gcsHandoffParts(a: GcsAssessment): string[] {
  const { nt, factors, notes } = gcsContext(a);
  const summary = gcsSummary(a.eye, a.verbal, a.motor);
  return [
    ...(a.totalScore !== undefined ? [`${a.totalScore}/15 (${summary})`] : [summary, 'total no calculable']),
    ...nt.filter((c) => c.reason).map((c) => `${c.letter}-NT por ${c.reason}`),
    ...(factors.length > 0 ? [`factores: ${factors.join(', ')}`] : []),
    ...(notes ? [`nota: ${notes}`] : []),
  ];
}

/**
 * Vía aérea artificial que tenía el paciente en un momento dado (mismas reglas que el servidor).
 * `intubado`: en VMI sin traqueostomía, así que la respuesta verbal no se puede evaluar.
 */
export function gcsAirwayAt(patient: Patient, at: Date): 'intubado' | 'traqueostomizado' | undefined {
  const trach = patient.airwayType === 'traqueostomia' && !(patient.tracheostomyDate && new Date(patient.tracheostomyDate) > at);
  if (trach) return 'traqueostomizado';
  const episode = patient.episodes
    .filter((e) => new Date(e.startAt) <= at && (!e.endAt || new Date(e.endAt) >= at))
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0];
  return episode?.supportType === 'imv' ? 'intubado' : undefined;
}

/** La escala de esta app es la de adultos: se oculta solo si la edad cargada es menor de 18. */
export const gcsAppliesTo = (patient: Patient) => patient.age === undefined || patient.age === null || patient.age >= 18;
