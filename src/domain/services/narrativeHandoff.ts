/**
 * Evolución kinésica individual — versión narrativa para la historia clínica.
 *
 * Un solo párrafo corrido: sin cabecera, sin nombre, cama ni fecha, sin
 * negritas ni rótulos, y sin MAYÚSCULAS (los diagnósticos y antecedentes se
 * pasan a minúscula normal). Empieza por quién es el paciente y su contexto
 * clínico, sigue con el soporte actual y termina con lo realizado en el
 * período. No incluye pendientes. De la movilización precoz solo informa si se
 * está llevando a cabo o si no cumple criterios.
 */
import { AirwayEvent, HFNCRecord, MobilizationContraindication, MobilizationStart, MrcAssessment, NIVRecord, OxygenRecord, Patient, Prestacion, PveDecision, SupportEpisode, VMIRecord } from '../../types';
import { oxygenDeviceLabels, ktrTechniqueLabels, ktmTypeLabels } from '../../utils/prestacionLabels';
import { cannulaFitOptions } from '../../utils/hfncEducation';
import { formatRass, mobilizationLevels, rassLevels } from '../../utils/vmiEducation';
import { pveReasonLabel } from '../../components/PveDecisionForm';
import { nivModeShort, nivUsageText } from '../../utils/nivEducation';
import {
  LatestSupportRecord,
  SpontaneousVentilationNarrativeInput,
  TrachNarrativeInput,
  describeAspiration,
  describeSecretions,
  mrcStatusLabels,
  narrateSpontaneousVentilation,
  narrateSupport,
} from './clinicalNarrative';

export interface NarrativeHandoffInput {
  patient: Patient;
  activeEpisode?: SupportEpisode;
  latestSupportRecord: LatestSupportRecord;
  prestaciones: Prestacion[];
  /** Frase que encabeza la oración de prestaciones ("Durante el día", "En las últimas 12 horas"...). */
  periodPhrase: string;
  mrcAssessment?: MrcAssessment;
  trach?: TrachNarrativeInput;
  daysSinceNiv?: number;
  airwayEvents?: AirwayEvent[];
  episodeChanges?: SupportEpisode[];
  spontaneousVentilation?: SpontaneousVentilationNarrativeInput;
  oxygenRecord?: OxygenRecord;
  pveDecisions?: PveDecision[];
  mobilization?: { start?: MobilizationStart; contraindications: MobilizationContraindication[] };
}

// ---------------------------------------------------------------- utilidades

/** "a, b y c" */
function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

const num = (n: number): string => String(n).replace('.', ',');

const acronyms = new Set(['HTA', 'EPOC', 'DBT', 'IAM', 'ACV', 'TEC', 'ARM', 'SDRA', 'ICC', 'IRA', 'IRC', 'VIH', 'TBC', 'ECV', 'DM', 'ATB', 'TVP', 'TEP', 'FA', 'COVID', 'UCI', 'AVC', 'HIV', 'IOT', 'TQT']);

/**
 * Pasa a minúscula normal lo que viene en MAYÚSCULAS o con inicial en mayúscula
 * ("POLITRAUMATISMO POR ACCIDENTE VIAL" → "politraumatismo por accidente vial"),
 * sin tocar las siglas cortas (HTA, EPOC) ni los términos como FiO₂ o PaO₂.
 */
export function plainCase(text: string): string {
  const trimmed = text.trim();
  const letters = trimmed.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  const allCaps = letters.length > 0 && letters === letters.toUpperCase();
  const words = trimmed.split(/(\s+)/);
  const single = words.filter((w) => w.trim()).length === 1;
  return words
    .map((w) => {
      if (!w.trim()) return w;
      const bare = w.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
      if (allCaps) {
        // Una sigla suelta corta (HTA, EPOC) o conocida se respeta; el resto va en minúscula.
        if (acronyms.has(bare) || (single && bare.length <= 4)) return w;
        return w.toLowerCase();
      }
      // Inicial en mayúscula seguida solo de minúsculas: "Tabaquismo" → "tabaquismo".
      if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+[.,;:]?$/.test(w)) return w.charAt(0).toLowerCase() + w.slice(1);
      return w;
    })
    .join('');
}

/** Minúscula inicial salvo en términos como FiO₂ / PaO₂ / PEEP. */
function lowerFirst(text: string): string {
  const first = text.split(/\s+/)[0] ?? '';
  return /[A-ZÁÉÍÓÚÑ]/.test(first.slice(1)) || first === first.toUpperCase() ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

/** "hace 2 días" / "hace 5 horas" */
function durationText(startAt: string | undefined, now: Date): string | undefined {
  if (!startAt) return undefined;
  const hours = Math.max(0, (now.getTime() - new Date(startAt).getTime()) / 3600000);
  if (hours < 24) {
    const h = Math.max(1, Math.round(hours));
    return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  }
  const d = Math.floor(hours / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

const supportPlain: Record<Patient['supportType'], string> = {
  imv: 'ventilación mecánica invasiva',
  niv: 'ventilación mecánica no invasiva',
  hfnc: 'cánula nasal de alto flujo',
  traqueostomia: 'traqueostomía en respiración espontánea',
  'conventional-oxygen': 'oxígeno convencional',
  'room-air': 'aire ambiente',
};

// ------------------------------------------------------------------ secciones

function introSentences(patient: Patient): string[] {
  const sex = patient.sex === 'male' ? ' masculino' : patient.sex === 'female' ? ' femenino' : '';
  const age = patient.age != null ? ` de ${patient.age} años` : '';
  const hasAntecedentes = patient.antecedentes.length > 0;
  if (!sex && !age && !hasAntecedentes && !patient.admissionDiagnosis) return [];
  const first = `Paciente${sex}${age}${hasAntecedentes ? `, con antecedentes de ${joinEs(patient.antecedentes.map(plainCase))}` : ''}.`;
  return patient.admissionDiagnosis ? [first, `Ingresó con diagnóstico de ${plainCase(patient.admissionDiagnosis)}.`] : [first];
}

function pveSentences(decisions: PveDecision[]): string[] {
  return decisions.map((d) => {
    if (d.decision === 'realizada') {
      const mode = d.sbtType === 'psv' ? ' en presión de soporte' : d.sbtType === 'cpap' ? ' en CPAP' : d.sbtType === 't-piece' ? ' con tubo en T' : '';
      const result = d.sbtResult === 'success' ? ', con resultado exitoso' : d.sbtResult === 'failure' ? `, con resultado fallido${d.failureReason ? ` (${d.failureReason})` : ''}` : '';
      return `se realizó la prueba de ventilación espontánea${mode}${result}`;
    }
    const reason = pveReasonLabel(d.decision, d.reason);
    return d.decision === 'contraindicada'
      ? `la prueba de ventilación espontánea se consideró contraindicada${reason ? ` por ${lowerFirst(reason)}` : ''}`
      : `no se realizó la prueba de ventilación espontánea${reason ? ` por ${lowerFirst(reason)}` : ''}`;
  });
}

function imvSentences(r: VMIRecord, dur: string | undefined, decisions: PveDecision[]): string[] {
  const out: string[] = [];
  const mode = r.ventMode === 'VC' ? 'VCV' : r.ventMode === 'PC' ? 'PCV' : 'PSV';
  const setParam =
    r.ventMode === 'VC' && r.tidalVolumeSet != null
      ? ` con volumen tidal de ${r.tidalVolumeSet} ml`
      : r.ventMode === 'PC' && r.controlPressure != null
        ? ` con presión control de ${r.controlPressure} cmH₂O`
        : r.ventMode === 'PSV' && r.supportPressure != null
          ? ` con presión de soporte de ${r.supportPressure} cmH₂O`
          : '';
  const params = [`PEEP ${r.peep}`, `FiO₂ ${r.fio2}%`];
  if (r.respiratoryRate != null) params.push(`frecuencia respiratoria de ${r.respiratoryRate}`);
  if (r.spo2 != null) params.push(`SpO₂ de ${r.spo2}%`);
  out.push(`Se encuentra en ventilación mecánica invasiva${dur ? ` ${dur}` : ''}, en modo ${mode}${setParam}, ${joinEs(params)}.`);

  const mech = [
    r.plateauPressure != null ? `presión meseta de ${r.plateauPressure} cmH₂O${r.plateauPressure > 30 ? ' (elevada)' : ''}` : undefined,
    r.drivingPressure > 0 ? `driving pressure de ${num(r.drivingPressure)}${r.drivingPressure > 15 ? ' (elevada)' : ''}` : undefined,
    r.vtPerKg > 0 ? `Vt/kg de ${num(r.vtPerKg)}${r.vtPerKg > 8 ? ' (elevado)' : ''}` : undefined,
    r.compliance != null ? `compliance estática de ${num(r.compliance)}` : undefined,
    r.mechanicalPower != null ? `mechanical power de ${num(r.mechanicalPower)} J/min${r.mechanicalPower > 17 ? ' (elevado)' : ''}` : undefined,
  ].filter((x): x is string => !!x);
  if (mech.length > 0) out.push(`Presenta ${joinEs(mech)}.`);

  const gas = [
    r.ph != null ? `pH ${num(r.ph)}` : undefined,
    r.paco2 != null ? `PaCO₂ ${num(r.paco2)}` : undefined,
    r.pao2 != null ? `PaO₂ ${num(r.pao2)}` : undefined,
    r.hco3 != null ? `HCO₃ ${num(r.hco3)}` : undefined,
    r.baseExcess != null ? `exceso de bases ${num(r.baseExcess)}` : undefined,
  ].filter((x): x is string => !!x);
  if (gas.length > 0) out.push(`En la gasometría arterial: ${gas.join(', ')}${r.pfRatio != null ? `, con relación PaO₂/FiO₂ de ${r.pfRatio}` : ''}.`);

  if (r.rass != null) {
    const label = rassLevels.find((l) => l.value === r.rass)?.label;
    out.push(`Nivel de sedación RASS ${formatRass(r.rass)}${label ? ` (${label.toLowerCase()})` : ''}.`);
  }
  if (r.hasAsynchrony) {
    const freq = r.asynchronyFrequency === 'rare' ? ' raras' : r.asynchronyFrequency === 'occasional' ? ' ocasionales' : r.asynchronyFrequency === 'frequent' ? ' frecuentes' : '';
    out.push(`Se observan asincronías${freq}.`);
  }

  const status =
    r.weaningStatus === 'not-candidate'
      ? 'No es candidato a destete'
      : r.weaningStatus === 'candidate'
        ? 'Es candidato a destete'
        : r.weaningStatus === 'sbt-trial'
          ? 'Se encuentra en prueba de ventilación espontánea'
          : 'Se encuentra extubado';
  // La decisión de PVE del período manda; si no hay, se usa la SBT de la monitorización.
  let pve = pveSentences(decisions);
  if (pve.length === 0 && r.sbtPerformed) {
    pve = pveSentences([{ decision: 'realizada', sbtType: r.sbtType, sbtResult: r.sbtResult, failureReason: r.sbtFailureReason } as PveDecision]);
  }
  out.push(`${status}${pve.length > 0 ? `; ${pve.join('; ')}` : ''}.`);

  const level = mobilizationLevels.find((m) => m.value === r.mobilizationLevel)?.description;
  if (level) out.push(`Movilización nivel ${r.mobilizationLevel} (${level.toLowerCase()})${r.mobilizationBarrier ? `, con barrera: ${r.mobilizationBarrier}` : ''}.`);
  return out;
}

function nivSentences(r: NIVRecord, dur: string | undefined): string[] {
  const out: string[] = [];
  const mode = nivModeShort[r.mode] ?? (r.modeOther ?? 'otro modo');
  const iface =
    r.interfaceType === 'other' ? (r.interfaceOther ?? 'otra') : ({ 'full-face': 'máscara facial total', oronasal: 'máscara oronasal', nasal: 'máscara nasal', helmet: 'helmet' } as Record<string, string>)[r.interfaceType];
  const params = r.mode === 'cpap' ? [`CPAP de ${r.peep} cmH₂O`, `FiO₂ ${r.fio2}%`] : [`presión de soporte de ${r.supportPressure} cmH₂O`, `PEEP ${r.peep}`, `FiO₂ ${r.fio2}%`];
  if (r.leak != null) params.push(`fuga de ${r.leak} l/min`);
  params.push(`frecuencia respiratoria de ${r.respiratoryRate}`);
  if (r.spo2 != null) params.push(`SpO₂ de ${r.spo2}%`);
  out.push(`Se encuentra en ventilación mecánica no invasiva${dur ? ` ${dur}` : ''}, en modo ${mode} con ${iface}, ${joinEs(params)}.`);
  if (r.hacorScore != null && r.hacorRisk) out.push(`HACOR ${r.hacorScore} (riesgo ${r.hacorRisk === 'low' ? 'bajo' : r.hacorRisk === 'medium' ? 'medio' : 'alto'}).`);
  const gas = [r.ph != null ? `pH ${num(r.ph)}` : undefined, r.paco2 != null ? `PaCO₂ ${num(r.paco2)}` : undefined, r.pao2 != null ? `PaO₂ ${num(r.pao2)}` : undefined, r.hco3 != null ? `HCO₃ ${num(r.hco3)}` : undefined].filter((x): x is string => !!x);
  if (gas.length > 0) out.push(`En la gasometría arterial: ${gas.join(', ')}.`);
  const skin = ({ 'no-lesions': 'sin lesiones', 'mild-erythema': 'con eritema leve', 'pressure-injury-1-2': 'con lesión por presión grado I-II', 'severe-injury': 'con lesión grave' } as Record<string, string>)[r.skinIntegrity];
  out.push(`La piel se encuentra ${skin ?? r.skinIntegrity}${r.skinNotes ? ` (${r.skinNotes})` : ''}.`);
  if (r.previousIMVDays) out.push(`Cuenta con ${r.previousIMVDays} ${r.previousIMVDays === 1 ? 'día' : 'días'} previos de ventilación mecánica invasiva.`);
  if (r.usage24h) out.push(`Utiliza la ventilación no invasiva ${nivUsageText[r.usage24h]}.`);
  return out;
}

function hfncSentences(r: HFNCRecord, dur: string | undefined): string[] {
  const risk = r.roxRisk === 'low' ? 'bajo riesgo de fracaso' : r.roxRisk === 'medium' ? 'riesgo moderado de fracaso' : 'alto riesgo de fracaso';
  const fit = cannulaFitOptions.find((c) => c.value === r.cannulaFit)?.label.toLowerCase() ?? r.cannulaFit;
  return [
    `Se encuentra con cánula nasal de alto flujo${dur ? ` ${dur}` : ''}, a ${r.flow} l/min con FiO₂ ${r.fio2}%${r.temperature != null ? ` y temperatura de ${num(r.temperature)} °C` : ''}, SpO₂ de ${r.spo2}% y frecuencia respiratoria de ${r.respiratoryRate}, con índice ROX de ${num(r.roxIndex)} (${risk}).`,
    `La cánula se encuentra ${fit}${r.cannulaNotes ? ` (${r.cannulaNotes})` : ''} y la humidificación ${r.humidificationWorking ? 'funciona correctamente' : `presenta un problema${r.humidificationIssue ? ` (${r.humidificationIssue})` : ''}`}.`,
  ];
}

function oxygenSentences(r: OxygenRecord, dur: string | undefined): string[] {
  const extras = [r.fio2 != null ? `al ${r.fio2}%` : undefined, `a ${num(r.flow)} l/min`].filter(Boolean).join(' ');
  const vitals = [r.spo2 != null ? `SpO₂ de ${r.spo2}%` : undefined, r.respiratoryRate != null ? `frecuencia respiratoria de ${r.respiratoryRate}` : undefined].filter((x): x is string => !!x);
  return [`Se encuentra con oxígeno convencional${dur ? ` ${dur}` : ''}, por ${oxygenDeviceLabels[r.device].toLowerCase()} ${extras}${vitals.length > 0 ? `, con ${joinEs(vitals)}` : ''}.${r.notes ? ` ${r.notes}.` : ''}`.replace('..', '.')];
}

function supportSentences(input: NarrativeHandoffInput, now: Date): string[] {
  const { patient, activeEpisode, latestSupportRecord: latest, trach, oxygenRecord, pveDecisions = [] } = input;
  const dur = durationText(activeEpisode?.startAt, now);
  if (patient.supportType === 'traqueostomia') {
    return trach || latest ? [narrateSupport(latest, patient, trach)] : [`Se encuentra con ${supportPlain.traqueostomia} ${dur ?? ''}.`.replace(' .', '.')];
  }
  if (latest?.type === 'imv') return imvSentences(latest.record, dur, pveDecisions);
  if (latest?.type === 'niv') return nivSentences(latest.record, dur);
  if (latest?.type === 'hfnc') return hfncSentences(latest.record, dur);
  if (oxygenRecord) return oxygenSentences(oxygenRecord, dur);
  // Sin registro de parámetros en el período: se informa el soporte actual y, en VMI, las decisiones de PVE.
  const out = [`Se encuentra en ${supportPlain[patient.supportType]}${dur ? ` ${dur}` : ''}.`];
  if (patient.supportType === 'imv' && pveDecisions.length > 0) out.push(`${pveSentences(pveDecisions).join('; ').replace(/^./, (c) => c.toUpperCase())}.`);
  return out;
}

function mobilizationSentence(input: NarrativeHandoffInput): string | undefined {
  const m = input.mobilization;
  if (!m || input.activeEpisode?.supportType !== 'imv') return undefined;
  if (m.start) return 'Se está llevando a cabo la movilización precoz.';
  if (m.contraindications.some((c) => !c.endAt)) return 'El paciente no cumple criterios para movilización precoz.';
  return undefined;
}

function eventsSentence(input: NarrativeHandoffInput): string | undefined {
  const items: string[] = [];
  for (const e of [...(input.airwayEvents ?? [])].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())) {
    items.push(e.type === 'extubacion' ? `extubación${e.classification ? ` ${e.classification}` : ''}` : e.type === 'destete-vni' ? 'destete de la ventilación no invasiva' : 'destete de la cánula nasal de alto flujo');
  }
  for (const ep of [...(input.episodeChanges ?? [])].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())) {
    items.push(`cambio de soporte a ${supportPlain[ep.supportType]}${ep.reason ? ` (${plainCase(ep.reason)})` : ''}`);
  }
  return items.length > 0 ? `Se registró ${joinEs(items)}.` : undefined;
}

function prestacionesSentences(input: NarrativeHandoffInput): string[] {
  const { prestaciones, mrcAssessment, periodPhrase } = input;
  const out: string[] = [];
  const by = (t: Prestacion['type']) => prestaciones.filter((p) => p.type === t);
  const sessions = (n: number) => (n > 1 ? ` (${n} sesiones)` : '');
  const items: string[] = [];

  const ktr = by('kinesioterapia-respiratoria');
  if (ktr.length > 0) {
    const techniques = [...new Set(ktr.flatMap((p) => p.techniques ?? []))].map((t) => ktrTechniqueLabels[t].toLowerCase());
    const aspiration = describeAspiration(ktr);
    const secretions = describeSecretions(ktr);
    const oxygen = [...new Set(ktr.filter((p) => p.oxygenDevice).map((p) => `${oxygenDeviceLabels[p.oxygenDevice!].toLowerCase()}${p.oxygenLiters != null ? ` a ${p.oxygenLiters} l/min` : ''}`))];
    const detail = [...techniques, aspiration?.replace(/^con /, ''), secretions].filter((x): x is string => !!x);
    items.push(`kinesioterapia respiratoria${sessions(ktr.length)}${detail.length > 0 ? ` con ${joinEs(detail)}` : ''}${oxygen.length > 0 ? `, con aporte de oxígeno por ${joinEs(oxygen)}` : ''}`);
  }
  const ktm = by('kinesioterapia-motora');
  if (ktm.length > 0) {
    const levels = [...new Set(ktm.map((p) => p.mobilizationLevel).filter((l): l is NonNullable<typeof l> => l != null))].sort();
    const types = [...new Set(ktm.flatMap((p) => p.ktmTypes ?? []))].map((t) => ktmTypeLabels[t].toLowerCase());
    items.push(
      `kinesioterapia motora${sessions(ktm.length)}${types.length > 0 ? ` con ${joinEs(types)}` : ''}${levels.length > 0 ? `, de nivel ${joinEs(levels.map(String))}` : ''}`
    );
  }
  const evals = by('evaluacion');
  if (evals.length > 0) items.push(`evaluación clínica${sessions(evals.length)}`);
  const prog = by('progresion');
  if (prog.length > 0) items.push(`progresión del plan kinésico${sessions(prog.length)}`);
  // Si algún ítem ya contiene una enumeración con "y", se separan con punto y coma para no confundir.
  if (items.length > 0) out.push(`${periodPhrase} recibió ${items.some((i) => / y /.test(i)) && items.length > 1 ? items.join('; ') : joinEs(items)}.`);

  const notes = prestaciones.map((p) => p.notes).filter((n): n is string => !!n);
  if (notes.length > 0) out.push(`Observaciones: ${notes.join('; ')}.`);
  if (mrcAssessment) {
    const status = mrcStatusLabels[mrcAssessment.status] ?? mrcAssessment.status;
    out.push(`Se realizó evaluación MRC con ${mrcAssessment.totalScore != null ? `puntaje de ${mrcAssessment.totalScore}/60` : 'puntaje no calculado'}${mrcAssessment.status === 'evaluable' ? '' : ` (${status.toLowerCase()})`}${mrcAssessment.daucicConfirmed ? ', con diagnóstico de DAUCI confirmado' : ''}.`);
  }
  return out;
}

/** Evolución narrativa: un único párrafo, sin cabecera ni formato. */
export function buildNarrativeEvolution(input: NarrativeHandoffInput, now: Date = new Date()): string {
  const sentences = [
    ...introSentences(input.patient),
    ...supportSentences(input, now),
    ...(input.daysSinceNiv != null ? [`Sin ventilación no invasiva desde hace ${input.daysSinceNiv === 0 ? 'menos de un día' : input.daysSinceNiv === 1 ? '1 día' : `${input.daysSinceNiv} días`}.`] : []),
    mobilizationSentence(input),
    eventsSentence(input),
    narrateSpontaneousVentilation(input.spontaneousVentilation, input.periodPhrase),
    ...prestacionesSentences(input),
  ].filter((s): s is string => !!s && s.trim().length > 0);
  return sentences.join(' ').replace(/\s+/g, ' ').trim();
}
