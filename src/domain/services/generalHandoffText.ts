/**
 * General Handoff Text Service — "Pase de Guardia General"
 *
 * Consolidates every patient the current kinesiólogo attended today (at
 * least one prestación logged today) into a single free-text block meant
 * to be pasted straight into the HCE as a narrative note — flowing
 * sentences instead of the label:value lines the per-patient pase de
 * guardia uses (see handoffText.ts), and no clock timestamps (only day
 * counts, which aren't a "horario").
 *
 * Reuses the same label maps, interpretation helpers and record-selection
 * logic as handoffText.ts so both texts describe the same facts.
 */
import {
  HFNCRecord,
  MrcAssessment,
  NIVRecord,
  NIVSession,
  Patient,
  Prestacion,
  PrestacionType,
  Sector,
  SupportEpisode,
  TrachRecord,
  VMIRecord,
} from '../../types';
import { calculateEpisodeDuration } from './episodeService';
import {
  LatestSupportRecord,
  acidBaseInterpretation,
  fmtDate,
  formatAlerts,
  mrcStatusLabels,
  pfInterpretation,
  prestacionTypeLabels,
  riskLabels,
  sbtTypeLabels,
  supportTypeLabel,
  swallowingLabels,
} from './handoffText';
import { cannulaFitOptions } from '../../utils/hfncEducation';
import { interfaceTypes, nivModes, skinIntegrityOptions } from '../../utils/nivEducation';
import { computeNIVUsageSummary } from '../../utils/nivCalculations';
import { mobilizationLevels, ventModes, weaningStatuses } from '../../utils/vmiEducation';

export interface GeneralHandoffPatientInput {
  patient: Patient;
  sector?: Sector;
  activeEpisode?: SupportEpisode;
  latestSupportRecord: LatestSupportRecord;
  /** Prestaciones de hoy para este paciente (ya filtradas). */
  prestaciones: Prestacion[];
  mrcAssessment?: MrcAssessment;
  nivSessions?: NIVSession[];
}

export interface GeneralHandoffInput {
  kinesiologoName: string;
  patients: GeneralHandoffPatientInput[];
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

  const gasBits = [
    record.ph != null ? `pH ${record.ph}` : undefined,
    record.paco2 != null ? `PaCO₂ ${record.paco2}` : undefined,
    record.pao2 != null ? `PaO₂ ${record.pao2}` : undefined,
    record.hco3 != null ? `HCO₃ ${record.hco3}` : undefined,
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

  const gasBits = [
    `pH ${record.ph}`,
    `PaO₂ ${record.pao2}`,
    record.paco2 != null ? `PaCO₂ ${record.paco2}` : undefined,
    record.hco3 != null ? `HCO₃ ${record.hco3}` : undefined,
    record.spo2 != null ? `SatO₂ ${record.spo2}%` : undefined,
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

function narrateTraqueostomia(record: TrachRecord): string {
  const parts: string[] = [];
  parts.push(`Traqueostomizado, en respiración espontánea. Glasgow ${record.glasgow}${record.pemax != null ? `, PEmax ${record.pemax}` : ''}.`);
  if (record.cuffDeflationPerformed) {
    parts.push(
      `Desinsuflación de cuff ${record.cuffDeflationTolerated ? 'tolerada' : 'no tolerada'}${record.cuffDeflationNotes ? ` (${record.cuffDeflationNotes})` : ''}.`
    );
  }
  if (record.cappedTrialPerformed) {
    parts.push(
      `Prueba de tapado ${record.cappedTrialTolerated ? 'tolerada' : 'no tolerada'}${record.cappedTrialNotes ? ` (${record.cappedTrialNotes})` : ''}.`
    );
  }
  if (record.swallowingTest) parts.push(`Deglución: ${swallowingLabels[record.swallowingTest] ?? record.swallowingTest}.`);
  if (record.blueTest) parts.push(`Blue test ${record.blueTest === 'positivo' ? 'positivo' : 'negativo'}.`);
  const alertsText = formatAlerts(record.alerts);
  if (alertsText) parts.push(`${alertsText}.`);
  return parts.join(' ');
}

function narrateSupport(latest: LatestSupportRecord, patient: Patient, nivSessions: NIVSession[] | undefined): string {
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
      return narrateTraqueostomia(latest.record);
  }
}

function narratePrestaciones(prestaciones: Prestacion[], mrcAssessment: MrcAssessment | undefined): string | undefined {
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
  if (typeLabelsUsed.length > 0) parts.push(`Durante el día recibió ${typeLabelsUsed.join(', ')}.`);
  if (notes.length > 0) parts.push(`Notas: ${notes.join('; ')}.`);
  if (mrcAssessment) {
    const statusLabel = mrcStatusLabels[mrcAssessment.status] ?? mrcAssessment.status;
    const score = mrcAssessment.totalScore != null ? `${mrcAssessment.totalScore}/60` : 'sin score';
    parts.push(`Evaluación MRC: ${score} (${statusLabel})${mrcAssessment.daucicConfirmed ? ', DAUCI confirmada' : ''}.`);
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}

function buildPatientBlock(input: GeneralHandoffPatientInput): string {
  const { patient, sector, activeEpisode, latestSupportRecord, prestaciones, mrcAssessment, nivSessions } = input;
  const location = [sector?.name, patient.bedLabel ? `cama ${patient.bedLabel}` : undefined].filter(Boolean).join(', ');
  const header = `${patient.alias}${location ? ` (${location})` : ''}${patient.age != null ? `, ${patient.age} años` : ''}`;

  const intro: string[] = [];
  if (patient.admissionDiagnosis) intro.push(`Diagnóstico de ingreso: ${patient.admissionDiagnosis}.`);
  if (patient.antecedentes.length > 0) intro.push(`Antecedentes: ${patient.antecedentes.join(', ')}.`);
  const supportLabel = supportTypeLabel(patient.supportType);
  if (activeEpisode) {
    const duration = calculateEpisodeDuration(activeEpisode.startAt);
    intro.push(`Actualmente en ${supportLabel}, hace ${duration.label}.`);
  } else {
    intro.push(`Actualmente en ${supportLabel}.`);
  }

  const body = [intro.join(' '), narrateSupport(latestSupportRecord, patient, nivSessions), narratePrestaciones(prestaciones, mrcAssessment)]
    .filter(Boolean)
    .join(' ');

  return `${header}\n${body}`;
}

export function buildGeneralHandoffText(input: GeneralHandoffInput): string {
  const today = fmtDate(new Date().toISOString());
  const count = input.patients.length;
  const header = [
    `PASE DE GUARDIA GENERAL - ${today}`,
    `${input.kinesiologoName} - ${count} paciente${count === 1 ? '' : 's'} atendido${count === 1 ? '' : 's'} hoy`,
  ].join('\n');

  return [header, ...input.patients.map(buildPatientBlock)].join('\n\n');
}
