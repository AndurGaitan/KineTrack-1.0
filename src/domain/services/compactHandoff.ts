/**
 * Pase de guardia compacto — formato pensado para leerse rápido en WhatsApp.
 *
 * Reglas: una línea por tema, abreviaturas de uso diario (VMI, VCV, PEEP, FiO₂,
 * FR, SpO₂), cada dato una sola vez, y negritas de WhatsApp (*texto*) en la
 * cama y el paciente y en el rótulo de cada línea para poder "escanear" el
 * pase con la vista. No hay oraciones largas ni horarios sueltos: solo días u
 * horas de evolución.
 */
import { MrcAssessment, NIVRecord, NIVSession, HFNCRecord, OxygenRecord, Patient, Prestacion, PveDecision, SupportEpisode, VMIRecord } from '../../types';
import { earlyMobilizationStatus } from '../../utils/earlyMobilization';
import { computeNIVUsageSummary } from '../../utils/nivCalculations';
import { oxygenDeviceLabels, ktrTechniqueLabels } from '../../utils/prestacionLabels';
import { formatSVHours, svInterruptionReasonLabels, svModalityShortLabels } from '../../utils/spontaneousVentilation';
import { formatRass, weaningStatuses } from '../../utils/vmiEducation';
import { cannulaFitOptions } from '../../utils/hfncEducation';
import { pveReasonLabel } from '../../components/PveDecisionForm';
import type { GeneralHandoffPatientInput } from './generalHandoffText';
import { describeAspiration, describeSecretions, mrcStatusLabels, narrateTraqueostomiaForPase } from './clinicalNarrative';

/** Negrita de WhatsApp. El texto no puede empezar ni terminar con espacio ni contener '*'. */
export const bold = (text: string): string => `*${text.replace(/\*/g, '').trim()}*`;

const SEP = ' · ';
const line = (label: string, ...parts: (string | undefined | false)[]): string | undefined => {
  const body = parts.filter(Boolean).join(SEP);
  return body ? `${bold(label)} ${body}` : undefined;
};

const num = (n: number): string => String(n).replace('.', ',');

/** "2 d", "5 h": tiempo en el soporte actual, sin minutos ni horarios. */
export function shortDuration(startAt: string, now: Date = new Date()): string {
  const hours = Math.max(0, (now.getTime() - new Date(startAt).getTime()) / 3600000);
  return hours < 24 ? `${Math.max(1, Math.round(hours))} h` : `${Math.floor(hours / 24)} d`;
}

const supportShort: Record<Patient['supportType'], string> = { imv: 'VMI', niv: 'VMNI', hfnc: 'CAFO', traqueostomia: 'TQT', 'conventional-oxygen': 'O₂', 'room-air': 'Aire ambiente' };
const modeShort: Record<string, string> = { VC: 'VCV', PC: 'PCV', PSV: 'PSV' };
const sbtShort: Record<string, string> = { psv: 'PSV', cpap: 'CPAP', 't-piece': 'tubo en T' };

function vmiLines(r: VMIRecord, pveDecisions: PveDecision[]): (string | undefined)[] {
  const setParam =
    r.ventMode === 'VC' && r.tidalVolumeSet != null
      ? `VT ${r.tidalVolumeSet}`
      : r.ventMode === 'PC' && r.controlPressure != null
        ? `PC ${r.controlPressure}`
        : r.ventMode === 'PSV' && r.supportPressure != null
          ? `PS ${r.supportPressure}`
          : undefined;
  const params = [
    modeShort[r.ventMode] ?? r.ventMode,
    setParam,
    `PEEP ${r.peep}`,
    `FiO₂ ${r.fio2}%`,
    r.respiratoryRate != null ? `FR ${r.respiratoryRate}` : undefined,
    r.spo2 != null ? `SpO₂ ${r.spo2}%` : undefined,
  ];

  const mech = [
    r.vtPerKg > 0 ? `Vt/kg ${num(r.vtPerKg)}${r.vtPerKg > 8 ? ' ⚠️' : ''}` : undefined,
    r.plateauPressure != null ? `Pplat ${r.plateauPressure}${r.plateauPressure > 30 ? ' ⚠️' : ''}` : undefined,
    r.drivingPressure > 0 ? `ΔP ${num(r.drivingPressure)}${r.drivingPressure > 15 ? ' ⚠️' : ''}` : undefined,
    r.compliance != null ? `Cest ${num(r.compliance)}` : undefined,
    r.mechanicalPower != null ? `MP ${num(r.mechanicalPower)}${r.mechanicalPower > 17 ? ' ⚠️' : ''}` : undefined,
  ];

  const gas = [
    r.ph != null ? `pH ${num(r.ph)}` : undefined,
    r.paco2 != null ? `PaCO₂ ${num(r.paco2)}` : undefined,
    r.pao2 != null ? `PaO₂ ${num(r.pao2)}` : undefined,
    r.hco3 != null ? `HCO₃ ${num(r.hco3)}` : undefined,
    r.baseExcess != null ? `EB ${num(r.baseExcess)}` : undefined,
    r.pfRatio != null ? `P/F ${r.pfRatio}` : undefined,
  ];
  const hasGas = r.ph != null || r.paco2 != null || r.pao2 != null || r.hco3 != null;

  const freq = r.asynchronyFrequency === 'rare' ? 'raras' : r.asynchronyFrequency === 'occasional' ? 'ocasionales' : r.asynchronyFrequency === 'frequent' ? 'frecuentes' : undefined;
  const sedation = [r.rass != null ? `RASS ${formatRass(r.rass)}` : undefined, r.hasAsynchrony ? `asincronías${freq ? ` ${freq}` : ''}` : undefined];

  const weaningLabel = weaningStatuses.find((w) => w.value === r.weaningStatus)?.label ?? r.weaningStatus;
  // La decisión de PVE del período manda; si no hay, se usa la SBT cargada en la monitorización.
  const pveParts =
    pveDecisions.length > 0
      ? pveDecisions.map((d) => describePve(d))
      : r.sbtPerformed
        ? [`PVE realizada (${[r.sbtType ? sbtShort[r.sbtType] : undefined, r.sbtResult ? (r.sbtResult === 'success' ? 'exitosa' : 'fallida') : undefined, r.sbtResult === 'failure' ? r.sbtFailureReason : undefined].filter(Boolean).join(', ')})`.replace(' ()', '')]
        : [];

  const mob = r.mobilizationLevel != null ? `Mov. nivel ${r.mobilizationLevel}${r.mobilizationBarrier ? ` (${r.mobilizationBarrier})` : ''}` : undefined;

  return [
    line(`VMI`, ...params),
    line('Mec:', ...mech),
    hasGas ? line('GSA:', ...gas) : undefined,
    line('Sedación:', ...sedation),
    line('Destete:', weaningLabel.toLowerCase().replace(/^./, (c) => c.toUpperCase()), ...pveParts),
    mob ? line('Mov:', mob) : undefined,
  ];
}

export function describePve(d: PveDecision): string {
  if (d.decision === 'realizada') {
    const details = [d.sbtType ? sbtShort[d.sbtType] : undefined, d.sbtResult === 'success' ? 'exitosa' : d.sbtResult === 'failure' ? 'fallida' : undefined, d.failureReason].filter(Boolean);
    return details.length > 0 ? `PVE realizada (${details.join(', ')})` : 'PVE realizada';
  }
  const reason = pveReasonLabel(d.decision, d.reason);
  return `PVE ${d.decision === 'contraindicada' ? 'contraindicada' : 'no realizada'}${reason ? ` (${reason})` : ''}`;
}

const interfaceShort: Record<string, string> = { 'full-face': 'facial total', oronasal: 'oronasal', nasal: 'nasal', helmet: 'helmet' };
const skinShort: Record<string, string> = { 'no-lesions': 'sin lesiones', 'mild-erythema': 'eritema leve', 'pressure-injury-1-2': 'LPP I-II', 'severe-injury': 'lesión grave' };

function nivLines(r: NIVRecord, sessions: NIVSession[] | undefined): (string | undefined)[] {
  const mode = r.mode === 'cpap' ? 'CPAP' : r.mode === 'bipap' ? 'BiPAP' : (r.modeOther ?? 'otro modo');
  const iface = r.interfaceType === 'other' ? (r.interfaceOther ?? 'otra interfaz') : (interfaceShort[r.interfaceType] ?? r.interfaceType);
  const usage = sessions && sessions.length > 0 ? computeNIVUsageSummary(sessions) : undefined;
  const gas = [r.ph != null ? `pH ${num(r.ph)}` : undefined, r.paco2 != null ? `PaCO₂ ${num(r.paco2)}` : undefined, r.pao2 != null ? `PaO₂ ${num(r.pao2)}` : undefined, r.hco3 != null ? `HCO₃ ${num(r.hco3)}` : undefined];
  const hasGas = r.ph != null || r.paco2 != null || r.pao2 != null || r.hco3 != null;
  return [
    line('VMNI', mode, iface, `PS ${r.supportPressure}`, `PEEP ${r.peep}`, `FiO₂ ${r.fio2}%`, r.leak != null ? `fuga ${r.leak}` : undefined, `FR ${r.respiratoryRate}`, r.spo2 != null ? `SpO₂ ${r.spo2}%` : undefined),
    r.hacorScore != null ? line('HACOR', `${r.hacorScore}${r.hacorRisk ? ` (${r.hacorRisk === 'low' ? 'bajo' : r.hacorRisk === 'medium' ? 'medio' : 'alto'})` : ''}`) : undefined,
    hasGas ? line('GSA:', ...gas) : undefined,
    line('Piel:', skinShort[r.skinIntegrity] ?? r.skinIntegrity, r.skinNotes),
    usage ? line('Uso:', `${num(usage.hoursUsedLast24h)} h en 24 h${usage.activeSession ? ' (sesión activa)' : ''}`, `${usage.consecutiveDaysWithoutNIV} d sin VMNI`) : undefined,
    r.previousIMVDays ? line('VMI previa:', `${r.previousIMVDays} d`) : undefined,
  ];
}

function hfncLines(r: HFNCRecord): (string | undefined)[] {
  const fit = cannulaFitOptions.find((c) => c.value === r.cannulaFit)?.label.toLowerCase() ?? r.cannulaFit;
  const risk = r.roxRisk === 'low' ? 'bajo riesgo' : r.roxRisk === 'medium' ? 'riesgo medio' : 'alto riesgo';
  return [
    line('CAFO', `${r.flow} L/min`, `FiO₂ ${r.fio2}%`, `SpO₂ ${r.spo2}%`, `FR ${r.respiratoryRate}`, `ROX ${num(r.roxIndex)} (${risk})${r.roxRisk === 'high' ? ' ⚠️' : ''}`, r.temperature != null ? `${num(r.temperature)} °C` : undefined),
    line('Cánula:', fit, r.cannulaNotes, r.humidificationWorking ? undefined : `humidificación con problema${r.humidificationIssue ? ` (${r.humidificationIssue})` : ''}`),
  ];
}

function oxygenLines(r: OxygenRecord): (string | undefined)[] {
  return [
    line('O₂', oxygenDeviceLabels[r.device].toLowerCase(), r.fio2 != null ? `${r.fio2}%` : undefined, `${num(r.flow)} L/min`, r.spo2 != null ? `SpO₂ ${r.spo2}%` : undefined, r.respiratoryRate != null ? `FR ${r.respiratoryRate}` : undefined),
    r.notes ? line('Nota:', r.notes) : undefined,
  ];
}

/** Prestaciones del período en una línea: "KTR ×2 (…) · KTM ×1 (nivel 2) · MRC 48/60". */
function prestacionesLine(prestaciones: Prestacion[], mrc: MrcAssessment | undefined): string | undefined {
  const items: string[] = [];
  const by = (t: Prestacion['type']) => prestaciones.filter((p) => p.type === t);
  const times = (n: number) => (n > 1 ? ` ×${n}` : '');

  const ktr = by('kinesioterapia-respiratoria');
  if (ktr.length > 0) {
    const techniques = [...new Set(ktr.flatMap((p) => p.techniques ?? []))].map((t) => ktrTechniqueLabels[t].toLowerCase());
    const aspiration = describeAspiration(ktr)?.replace('con aspiración de secreciones', 'c/ aspiración').replace('sin aspiración de secreciones', 's/ aspiración');
    const secretions = describeSecretions(ktr);
    const oxygen = [...new Set(ktr.filter((p) => p.oxygenDevice).map((p) => `${oxygenDeviceLabels[p.oxygenDevice!].toLowerCase()}${p.oxygenLiters != null ? ` ${p.oxygenLiters} L/min` : ''}`))];
    const detail = [...techniques, aspiration, secretions, ...oxygen].filter(Boolean).join(', ');
    items.push(`KTR${times(ktr.length)}${detail ? ` (${detail})` : ''}`);
  }
  const ktm = by('kinesioterapia-motora');
  if (ktm.length > 0) {
    const levels = [...new Set(ktm.map((p) => p.mobilizationLevel).filter((l): l is NonNullable<typeof l> => l != null))].sort();
    items.push(`KTM${times(ktm.length)}${levels.length > 0 ? ` (nivel ${levels.join('-')})` : ''}`);
  }
  const evals = by('evaluacion');
  if (evals.length > 0) items.push(`Evaluación${times(evals.length)}`);
  const prog = by('progresion');
  if (prog.length > 0) items.push(`Progresión${times(prog.length)}`);
  if (mrc) {
    const status = mrcStatusLabels[mrc.status] ?? mrc.status;
    items.push(`MRC ${mrc.totalScore != null ? `${mrc.totalScore}/60` : 'sin score'}${mrc.status === 'evaluable' ? '' : ` (${status.toLowerCase()})`}${mrc.daucicConfirmed ? ' · DAUCI ✔' : ''}`);
  }
  const notes = prestaciones.map((p) => p.notes).filter(Boolean);
  const body = items.join(SEP);
  if (!body && notes.length === 0) return undefined;
  return `${bold('Prestaciones:')} ${body}${notes.length > 0 ? `${body ? ' — ' : ''}Notas: ${notes.join('; ')}` : ''}`;
}

function eventsLine(input: GeneralHandoffPatientInput): string | undefined {
  const items: string[] = [];
  for (const e of [...(input.airwayEvents ?? [])].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())) {
    items.push(e.type === 'extubacion' ? `Extubación${e.classification ? ` ${e.classification}` : ''}` : e.type === 'destete-vni' ? 'Destete de VMNI' : 'Destete de CAFO');
  }
  const labels: Record<Patient['supportType'], string> = { imv: 'VMI', niv: 'VMNI', hfnc: 'CAFO', traqueostomia: 'TQT', 'conventional-oxygen': 'O₂', 'room-air': 'aire ambiente' };
  for (const ep of [...(input.episodeChanges ?? [])].sort((a: SupportEpisode, b: SupportEpisode) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())) {
    items.push(`Cambio a ${labels[ep.supportType]}${ep.reason ? ` (${ep.reason})` : ''}`);
  }
  return items.length > 0 ? `${bold('Eventos:')} ${items.join('; ')}` : undefined;
}

function svLine(input: GeneralHandoffPatientInput): string | undefined {
  const sv = input.spontaneousVentilation;
  if (!sv || sv.periods.length === 0) return undefined;
  const modalities = [...new Set(sv.periods.map((p) => svModalityShortLabels[p.modality]))].join(', ');
  const notTolerated = sv.periods.filter((p) => p.tolerated === false);
  const reasons = [...new Set(notTolerated.map((p) => p.interruptionReason).filter((r): r is NonNullable<typeof r> => !!r))].map((r) => svInterruptionReasonLabels[r].toLowerCase());
  return line(
    'Vent. espontánea:',
    `${formatSVHours(sv.hours)} h`,
    `${sv.periods.length} ${sv.periods.length === 1 ? 'período' : 'períodos'} (${modalities})`,
    notTolerated.length > 0 ? `${notTolerated.length} no tolerado${notTolerated.length === 1 ? '' : 's'}${reasons.length > 0 ? ` (${reasons.join(', ')})` : ''}` : sv.periods.every((p) => p.tolerated === true) ? 'tolerados' : undefined,
    sv.periods.some((p) => !p.endAt) ? 'en curso' : undefined
  );
}

/** Bloque de un paciente: encabezado en negrita + una línea por tema. */
export function buildCompactPatientBlock(input: GeneralHandoffPatientInput, now: Date = new Date()): string {
  const { patient, sector, activeEpisode, latestSupportRecord, prestaciones, mrcAssessment, nivSessions, trach, oxygenRecord, pveDecisions, mobilization } = input;

  const bed = patient.bedLabel ? `Cama ${patient.bedLabel}${sector?.name ? ` (${sector.name})` : ''}` : sector?.name;
  const header = `${bold(`${bed ? `${bed} - ` : ''}${patient.alias}`)}${patient.age != null ? `, ${patient.age} a` : ''}`;

  const lines: (string | undefined)[] = [];
  if (patient.admissionDiagnosis) lines.push(line('Dx:', patient.admissionDiagnosis));
  if (patient.antecedentes.length > 0) lines.push(line('AP:', patient.antecedentes.join(', ')));

  const duration = activeEpisode ? shortDuration(activeEpisode.startAt, now) : undefined;
  const withDuration = (arr: (string | undefined)[]) => {
    // La duración va en la primera línea del soporte: "*VMI* · 2 d · VCV · ..."
    if (!duration || !arr[0]) return arr;
    const [first, ...rest] = arr;
    const m = first!.match(/^(\*[^*]+\*) (.*)$/);
    return m ? [`${m[1]}${SEP}${duration}${SEP}${m[2]}`, ...rest] : arr;
  };

  const type = latestSupportRecord?.type;
  if (type === 'imv') lines.push(...withDuration(vmiLines(latestSupportRecord!.record as VMIRecord, pveDecisions)));
  else if (type === 'niv') lines.push(...withDuration(nivLines(latestSupportRecord!.record as NIVRecord, nivSessions)));
  else if (type === 'hfnc') lines.push(...withDuration(hfncLines(latestSupportRecord!.record as HFNCRecord)));
  else if (patient.supportType === 'traqueostomia' && trach) lines.push(`${bold('TQT')}${duration ? `${SEP}${duration}` : ''} ${narrateTraqueostomiaForPase(trach)}`);
  else if (oxygenRecord) lines.push(...withDuration(oxygenLines(oxygenRecord)));
  else if (patient.supportType === 'conventional-oxygen') lines.push(`${bold('O₂')}${duration ? `${SEP}${duration}` : ''} convencional`);
  else if (patient.supportType === 'room-air') lines.push(`${bold('Aire ambiente')}${duration ? `${SEP}${duration}` : ''}`);
  else lines.push(`${bold(supportShort[patient.supportType])}${duration ? `${SEP}${duration}` : ''}`);

  // Sin monitorización de VMI cargada en el período, igual se informan las decisiones de PVE.
  if (type !== 'imv' && pveDecisions.length > 0) lines.push(line('Destete:', ...pveDecisions.map(describePve)));

  // Movilización precoz: estado actual de la ventana de 72 h (solo pacientes en VMI).
  if (mobilization && activeEpisode?.supportType === 'imv') {
    const status = earlyMobilizationStatus(activeEpisode.startAt, mobilization.start, mobilization.contraindications, now);
    lines.push(`${bold('Mov. precoz:')} ${status.pending ? '⏳ ' : ''}${status.text}`);
  }

  lines.push(eventsLine(input));
  lines.push(svLine(input));
  lines.push(prestacionesLine(prestaciones, mrcAssessment));

  return [header, ...lines.filter(Boolean)].join('\n');
}
