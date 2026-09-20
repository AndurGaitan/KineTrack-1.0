/**
 * Clinical Narrative — shared prose-generation building blocks used by both:
 * - handoffText.ts: per-patient "Evolución Kinésica" note (paste into the
 *   HCE right after evolving that one patient).
 * - generalHandoffText.ts: multi-patient "Pase de Guardia General" (every
 *   patient attended today, consolidated for shift handoff).
 *
 * Both describe the same underlying facts (latest support record,
 * prestaciones, MRC) as flowing sentences — no clock timestamps, only day
 * counts (a duration isn't a "horario").
 */
import {
  HFNCRecord,
  MrcAssessment,
  NIVRecord,
  NIVSession,
  Patient,
  Prestacion,
  PrestacionType,
  RiskLevel,
  SupportEpisode,
  TrachOverview,
  TrachRecord,
  VMIRecord,
} from '../../types';
import { calculateEpisodeDuration } from './episodeService';
import { cannulaFitOptions } from '../../utils/hfncEducation';
import { interfaceTypes, nivModes, skinIntegrityOptions } from '../../utils/nivEducation';
import { computeNIVUsageSummary } from '../../utils/nivCalculations';
import { mobilizationLevels, ventModes, weaningStatuses } from '../../utils/vmiEducation';
import {
  aspirationBlocks,
  cuffStatusLabels,
  describeStatusOneLine,
  hoursFreeOfVmi,
  secretionAmountLabels,
  secretionCharacterLabels,
  ventilatorySupportLabels,
} from './trachDecannulation';

export type LatestSupportRecord =
  | { type: 'imv'; record: VMIRecord }
  | { type: 'niv'; record: NIVRecord }
  | { type: 'hfnc'; record: HFNCRecord }
  | { type: 'traqueostomia'; record: TrachRecord }
  | undefined;

/**
 * Picks the latest support record matching a patient's current support type
 * from already-loaded (and already-sorted-desc) per-type record lists — the
 * same selection logic the individual and general pages both need.
 */
export function pickLatestSupportRecord(
  patient: Patient,
  vmiRecords: VMIRecord[],
  nivRecords: NIVRecord[],
  hfncRecords: HFNCRecord[],
  trachRecords: TrachRecord[]
): LatestSupportRecord {
  if (patient.supportType === 'imv') return vmiRecords[0] ? { type: 'imv', record: vmiRecords[0] } : undefined;
  if (patient.supportType === 'niv') return nivRecords[0] ? { type: 'niv', record: nivRecords[0] } : undefined;
  if (patient.supportType === 'hfnc') return hfncRecords[0] ? { type: 'hfnc', record: hfncRecords[0] } : undefined;
  if (patient.supportType === 'traqueostomia') return trachRecords[0] ? { type: 'traqueostomia', record: trachRecords[0] } : undefined;
  return undefined;
}

export const riskLabels: Record<RiskLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto' };

export const sbtTypeLabels: Record<string, string> = {
  psv: 'Presión de Soporte (PSV)',
  cpap: 'CPAP',
  't-piece': 'Tubo en T',
};

export const swallowingLabels: Record<string, string> = {
  apta: 'Apta',
  'no-apta': 'No apta',
  'con-restricciones': 'Con restricciones',
};

export const prestacionTypeLabels: Record<PrestacionType, string> = {
  'kinesioterapia-respiratoria': 'Kinesioterapia respiratoria',
  'kinesioterapia-motora': 'Kinesioterapia motora',
  evaluacion: 'Evaluación',
  progresion: 'Progresión',
};

export const mrcStatusLabels: Record<string, string> = {
  evaluable: 'Evaluable',
  'no-evaluable': 'No evaluable',
  parcial: 'Parcial',
  desconocido: 'Desconocido',
};

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Los arrays `alerts` de cada módulo ya vienen con un emoji indicador
// (✓/⚠️/⚡/ℹ️) pensado para la UI de la app. Para una nota de HCE se recorta
// ese prefijo y se deja solo el texto de la alerta.
function stripAlertEmoji(alert: string): string {
  return alert.replace(/^[✓⚠️⚡ℹ️]+\s*/u, '').trim();
}

export function formatAlerts(alerts: string[]): string | undefined {
  if (alerts.length === 0) return undefined;
  return alerts.map(stripAlertEmoji).join('; ');
}

export function pfInterpretation(pf: number): string {
  if (pf < 100) return 'SDRA severo';
  if (pf < 200) return 'SDRA moderado';
  if (pf < 300) return 'SDRA leve';
  return 'normal';
}

export function acidBaseInterpretation(ph: number, hco3: number): string | undefined {
  if (ph >= 7.35 && ph <= 7.45) return 'balance normal';
  if (ph < 7.35 && hco3 < 22) return 'acidosis metabólica';
  if (ph < 7.35 && hco3 >= 22) return 'acidosis respiratoria';
  if (ph > 7.45 && hco3 > 26) return 'alcalosis metabólica';
  if (ph > 7.45 && hco3 <= 26) return 'alcalosis respiratoria';
  return undefined;
}

export function supportTypeLabel(type: Patient['supportType']): string {
  const labels: Record<Patient['supportType'], string> = {
    imv: 'VMI',
    niv: 'VNI',
    hfnc: 'HFNC',
    traqueostomia: 'Traqueostomía',
    'conventional-oxygen': 'Oxígeno convencional',
    'room-air': 'Aire ambiente',
  };
  return labels[type];
}

/** Contexto clínico básico + soporte actual, como una o dos oraciones. */
export function narrateContext(patient: Patient, activeEpisode: SupportEpisode | undefined): string {
  const parts: string[] = [];
  if (patient.admissionDiagnosis) parts.push(`Diagnóstico de ingreso: ${patient.admissionDiagnosis}.`);
  if (patient.antecedentes.length > 0) parts.push(`Antecedentes: ${patient.antecedentes.join(', ')}.`);
  const supportLabel = supportTypeLabel(patient.supportType);
  if (activeEpisode) {
    const duration = calculateEpisodeDuration(activeEpisode.startAt);
    parts.push(`Actualmente en ${supportLabel}, hace ${duration.label}.`);
  } else {
    parts.push(`Actualmente en ${supportLabel}.`);
  }
  return parts.join(' ');
}

function narrateImv(record: VMIRecord): string {
  const modeLabel = ventModes.find((m) => m.value === record.ventMode)?.label || record.ventMode;
  const setParam =
    record.ventMode === 'VC'
      ? `VT ${record.tidalVolumeSet} ml`
      : record.ventMode === 'PC' && record.controlPressure != null
        ? `PC ${record.controlPressure} cmH2O`
        : record.ventMode === 'PSV' && record.supportPressure != null
          ? `PS ${record.supportPressure} cmH2O`
          : undefined;

  const parts: string[] = [];
  parts.push(
    `En ventilación mecánica invasiva, modo ${modeLabel}${setParam ? ` (${setParam})` : ''}, PEEP ${record.peep}, FiO₂ ${record.fio2}%${record.respiratoryRate != null ? `, FR ${record.respiratoryRate}` : ''}.`
  );

  const mech = [
    `Vt/kg ${record.vtPerKg}`,
    `Pplat ${record.plateauPressure}${record.plateauPressure > 30 ? ' (elevada)' : ''}`,
    `driving pressure ${record.drivingPressure}${record.drivingPressure > 15 ? ' (elevada)' : ''}`,
    record.compliance != null ? `compliance ${record.compliance}` : undefined,
    record.mechanicalPower != null ? `mechanical power ${record.mechanicalPower}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  parts.push(`Mecánica ventilatoria: ${mech}.`);

  // Orden de reporte de gasometría: pH, PaCO₂, PaO₂, HCO₃, SatO₂, Exceso de
  // Bases, FiO₂.
  const gasBits = [
    record.ph != null ? `pH ${record.ph}` : undefined,
    record.paco2 != null ? `PaCO₂ ${record.paco2}` : undefined,
    record.pao2 != null ? `PaO₂ ${record.pao2}` : undefined,
    record.hco3 != null ? `HCO₃ ${record.hco3}` : undefined,
    record.spo2 != null ? `SatO₂ ${record.spo2}%` : undefined,
    record.baseExcess != null ? `exceso de bases ${record.baseExcess}` : undefined,
    `FiO₂ ${record.fio2}%`,
  ].filter(Boolean);
  if (gasBits.length > 0) {
    let gasSentence = `Gasometría: ${gasBits.join(', ')}`;
    if (record.pfRatio != null) gasSentence += ` (P/F ${record.pfRatio}, ${pfInterpretation(record.pfRatio)})`;
    if (record.ph != null && record.hco3 != null) {
      const interp = acidBaseInterpretation(record.ph, record.hco3);
      if (interp) gasSentence += `, ${interp}`;
    }
    parts.push(`${gasSentence}.`);
  }

  const weaningLabel = weaningStatuses.find((w) => w.value === record.weaningStatus)?.label || record.weaningStatus;
  let weaningSentence = `Destete: ${weaningLabel}`;
  if (record.sbtPerformed) {
    weaningSentence += `, SBT ${record.sbtType ? (sbtTypeLabels[record.sbtType] ?? record.sbtType) : 'realizada'}`;
    if (record.sbtResult) {
      weaningSentence += ` (${record.sbtResult === 'success' ? 'exitosa' : 'fallida'}${record.sbtResult === 'failure' && record.sbtFailureReason ? `: ${record.sbtFailureReason}` : ''})`;
    }
  } else {
    weaningSentence += ', SBT no realizada';
  }
  parts.push(`${weaningSentence}.`);

  const mobDescription = mobilizationLevels.find((m) => m.value === record.mobilizationLevel)?.description;
  if (mobDescription) {
    parts.push(
      `Movilización nivel ${record.mobilizationLevel} (${mobDescription})${record.mobilizationBarrier ? `, barrera: ${record.mobilizationBarrier}` : ''}.`
    );
  }

  if (record.hasAsynchrony) {
    const freqLabel =
      record.asynchronyFrequency === 'rare'
        ? 'raras'
        : record.asynchronyFrequency === 'occasional'
          ? 'ocasionales'
          : record.asynchronyFrequency === 'frequent'
            ? 'frecuentes'
            : undefined;
    parts.push(`Presenta asincronías${freqLabel ? ` ${freqLabel}` : ''}.`);
  }

  const alertsText = formatAlerts(record.alerts);
  if (alertsText) parts.push(`${alertsText}.`);

  return parts.join(' ');
}

function narrateNiv(record: NIVRecord, nivSessions: NIVSession[] | undefined): string {
  const interfaceLabel = interfaceTypes.find((i) => i.value === record.interfaceType)?.label || record.interfaceType;
  const modeLabel = nivModes.find((m) => m.value === record.mode)?.label || record.mode;
  const skinLabel = skinIntegrityOptions.find((s) => s.value === record.skinIntegrity)?.label || record.skinIntegrity;

  const parts: string[] = [];
  parts.push(
    `En ventilación no invasiva (${modeLabel}), interfaz ${interfaceLabel}. Parámetros: PS ${record.supportPressure}, PEEP ${record.peep}, sensibilidad espiratoria ${record.expiratorySensitivity}%, FiO₂ ${record.fio2}%${record.leak != null ? `, fuga ${record.leak} l/min` : ''}.`
  );
  parts.push(`HACOR ${record.hacorScore}, riesgo ${riskLabels[record.hacorRisk]}.`);

  // Orden de reporte de gasometría: pH, PaCO₂, PaO₂, HCO₃, SatO₂, Exceso de
  // Bases, FiO₂.
  const gasBits = [
    `pH ${record.ph}`,
    record.paco2 != null ? `PaCO₂ ${record.paco2}` : undefined,
    `PaO₂ ${record.pao2}`,
    record.hco3 != null ? `HCO₃ ${record.hco3}` : undefined,
    record.spo2 != null ? `SatO₂ ${record.spo2}%` : undefined,
    record.baseExcess != null ? `exceso de bases ${record.baseExcess}` : undefined,
    `FiO₂ ${record.fio2}%`,
  ].filter(Boolean);
  let gasSentence = `Gasometría: ${gasBits.join(', ')}`;
  if (record.hco3 != null) {
    const interp = acidBaseInterpretation(record.ph, record.hco3);
    if (interp) gasSentence += `, ${interp}`;
  }
  parts.push(`${gasSentence}.`);

  parts.push(`Piel: ${skinLabel}${record.skinNotes ? ` (${record.skinNotes})` : ''}.`);

  if (record.previousIMVDays != null && record.previousIMVDays > 0) {
    parts.push(`Con ${record.previousIMVDays} día${record.previousIMVDays === 1 ? '' : 's'} previos en VMI.`);
  }

  if (nivSessions && nivSessions.length > 0) {
    const usage = computeNIVUsageSummary(nivSessions);
    parts.push(
      `Uso de VNI: ${usage.hoursUsedLast24h} horas en las últimas 24 horas${usage.activeSession ? ' (sesión activa)' : ''}, ${usage.consecutiveDaysWithoutNIV} día${usage.consecutiveDaysWithoutNIV === 1 ? '' : 's'} consecutivos sin VNI.`
    );
  }

  const alertsText = formatAlerts(record.alerts);
  if (alertsText) parts.push(`${alertsText}.`);

  return parts.join(' ');
}

function narrateHfnc(record: HFNCRecord): string {
  const cannulaLabel = cannulaFitOptions.find((c) => c.value === record.cannulaFit)?.label || record.cannulaFit;
  const parts: string[] = [];
  parts.push(
    `En cánula nasal de alto flujo, flujo ${record.flow} l/min, FiO₂ ${record.fio2}%${record.temperature != null ? `, temperatura ${record.temperature}°C` : ''}.`
  );
  parts.push(`Índice ROX ${record.roxIndex}, riesgo ${riskLabels[record.roxRisk]}. SatO₂ ${record.spo2}%, FR ${record.respiratoryRate}.`);
  parts.push(`Interfaz: ${cannulaLabel}${record.cannulaNotes ? ` (${record.cannulaNotes})` : ''}.`);
  parts.push(
    `Humidificación ${record.humidificationWorking ? 'funcionando correctamente' : `con problema${record.humidificationIssue ? `: ${record.humidificationIssue}` : ''}`}.`
  );
  const alertsText = formatAlerts(record.alerts);
  if (alertsText) parts.push(`${alertsText}.`);
  return parts.join(' ');
}

/** Todo lo que hace falta para narrar una traqueostomía: estado, aspiraciones y proceso de decanulación. */
export interface TrachNarrativeInput {
  /** Registros de estado, del más nuevo al más viejo. */
  records: TrachRecord[];
  overview?: TrachOverview | null;
  episode?: SupportEpisode;
}

function latestOf<T>(records: TrachRecord[], pick: (r: TrachRecord) => T | undefined): T | undefined {
  for (const r of records) {
    const v = pick(r);
    if (v !== undefined) return v;
  }
  return undefined;
}

function narrateTraqueostomia(input: TrachNarrativeInput): string {
  const { records, overview, episode } = input;
  const now = new Date();
  const parts: string[] = [];

  const hours = hoursFreeOfVmi(episode, now);
  const freeDays = hours !== undefined ? Math.floor(hours / 24) : 0;
  const freeText = hours !== undefined ? `, ${freeDays} ${freeDays === 1 ? 'día libre' : 'días libres'} de VMI` : '';
  parts.push(`Traqueostomizado, en respiración espontánea${freeText}.`);

  // Estado: lo último que se sabe de cada ítem (una actualización puede traer solo algunos).
  const cuff = latestOf(records, (r) => r.cuffStatus);
  const support = latestOf(records, (r) => r.ventilatorySupport);
  const state: string[] = [];
  if (cuff) state.push(`neumotaponamiento ${cuffStatusLabels[cuff].toLowerCase()}`);
  if (support) state.push(`con ${ventilatorySupportLabels[support].toLowerCase()}`);
  if (state.length > 0) parts.push(`${state.join(', ').replace(/^./, (c) => c.toUpperCase())}.`);

  const amount = latestOf(records, (r) => r.secretionAmount);
  const character = latestOf(records, (r) => r.secretionCharacter);
  const asp24h = aspirationBlocks(overview?.aspirations ?? [], now).reduce((sum, b) => sum + b.count, 0);
  const secretions: string[] = [];
  if (amount) secretions.push(`Secreciones ${secretionAmountLabels[amount].toLowerCase().replace('sin secreciones', 'ausentes')}${character ? ` ${secretionCharacterLabels[character]}` : ''}`);
  if (asp24h > 0) secretions.push(`${asp24h} ${asp24h === 1 ? 'aspiración' : 'aspiraciones'} en las últimas 24 horas`);
  if (secretions.length > 0) parts.push(`${secretions.join('; ')}.`);

  const glasgow = latestOf(records, (r) => r.glasgow);
  const pemax = latestOf(records, (r) => r.pemax);
  const measures: string[] = [];
  if (glasgow !== undefined) measures.push(`Glasgow ${glasgow}`);
  if (pemax !== undefined) measures.push(`Pemáx ${pemax} cmH2O`);
  if (measures.length > 0) parts.push(`${measures.join(', ')}.`);

  const cuffTest = records.find((r) => r.cuffDeflationPerformed);
  if (cuffTest) parts.push(`Prueba de balón desinflado ${cuffTest.cuffDeflationTolerated ? 'tolerada' : 'no tolerada'}${cuffTest.cuffDeflationNotes ? ` (${cuffTest.cuffDeflationNotes})` : ''}.`);
  const capped = records.find((r) => r.cappedTrialPerformed);
  if (capped) parts.push(`Prueba de cánula tapada ${capped.cappedTrialTolerated ? 'tolerada' : 'no tolerada'} (registro previo).`);
  const swallow = latestOf(records, (r) => r.swallowingTest);
  if (swallow) parts.push(`Deglución: ${swallowingLabels[swallow] ?? swallow}.`);
  const blue = latestOf(records, (r) => r.blueTest);
  if (blue) parts.push(`Blue test ${blue === 'positivo' ? 'positivo' : 'negativo'}.`);

  if (overview?.activeProcess) parts.push(describeStatusOneLine(overview.activeProcess, now));

  if (records.length === 0 && !overview?.activeProcess && asp24h === 0) parts.push('Sin seguimiento de traqueostomía cargado todavía.');
  return parts.join(' ');
}

export function narrateSupport(
  latest: LatestSupportRecord,
  patient: Patient,
  nivSessions: NIVSession[] | undefined,
  trach?: TrachNarrativeInput
): string {
  // La traqueostomía se narra con el estado + aspiraciones + proceso, no solo con el último registro.
  if (patient.supportType === 'traqueostomia') {
    return narrateTraqueostomia(trach ?? { records: latest?.type === 'traqueostomia' ? [latest.record] : [] });
  }
  if (!latest) {
    if (patient.supportType === 'conventional-oxygen') return 'Con oxígeno convencional.';
    if (patient.supportType === 'room-air') return 'En aire ambiente.';
    return `Sin monitorización de ${supportTypeLabel(patient.supportType)} cargada todavía.`;
  }
  switch (latest.type) {
    case 'imv':
      return narrateImv(latest.record);
    case 'niv':
      return narrateNiv(latest.record, nivSessions);
    case 'hfnc':
      return narrateHfnc(latest.record);
    case 'traqueostomia':
      return narrateTraqueostomia({ records: [latest.record] });
  }
}

/**
 * Prestaciones + MRC como una o dos oraciones. `periodPhrase` encabeza la
 * primera ("Durante el día recibió..." para el pase general que siempre
 * mira "hoy"; "En las últimas Xh recibió..." para la evolución individual,
 * que respeta la ventana de turno elegida por el kinesiólogo).
 */
export function narratePrestaciones(
  prestaciones: Prestacion[],
  mrcAssessment: MrcAssessment | undefined,
  periodPhrase: string = 'Durante el día'
): string | undefined {
  const parts: string[] = [];
  const byType = new Map<PrestacionType, Prestacion[]>();
  for (const p of prestaciones) {
    const list = byType.get(p.type) ?? [];
    list.push(p);
    byType.set(p.type, list);
  }
  const order: PrestacionType[] = ['kinesioterapia-respiratoria', 'kinesioterapia-motora', 'evaluacion', 'progresion'];
  const typeLabelsUsed: string[] = [];
  const notes: string[] = [];
  for (const type of order) {
    const list = byType.get(type);
    if (!list || list.length === 0) continue;
    typeLabelsUsed.push(`${prestacionTypeLabels[type]}${list.length > 1 ? ` (${list.length} sesiones)` : ''}`);
    for (const p of list) if (p.notes) notes.push(p.notes);
  }
  if (typeLabelsUsed.length > 0) parts.push(`${periodPhrase} recibió ${typeLabelsUsed.join(', ')}.`);
  if (notes.length > 0) parts.push(`Notas: ${notes.join('; ')}.`);
  if (mrcAssessment) {
    const statusLabel = mrcStatusLabels[mrcAssessment.status] ?? mrcAssessment.status;
    const score = mrcAssessment.totalScore != null ? `${mrcAssessment.totalScore}/60` : 'sin score';
    parts.push(`Evaluación MRC: ${score} (${statusLabel})${mrcAssessment.daucicConfirmed ? ', DAUCI confirmada' : ''}.`);
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}
