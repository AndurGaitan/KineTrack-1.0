/**
 * Handoff Text Service - Builds the "Pase de Guardia" summary
 *
 * Turns the structured data a kinesiólogo already loads into the app
 * (último registro del soporte activo, prestaciones del turno, evaluación
 * MRC) into one plain-text block ready to paste into WhatsApp or into the
 * electronic clinical record. No markdown/emoji — same text has to read
 * well in both destinations.
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
  Sector,
  SupportEpisode,
  TrachRecord,
  VMIRecord,
} from '../../types';
import { calculateEpisodeDuration } from './episodeService';
import { cannulaFitOptions } from '../../utils/hfncEducation';
import { interfaceTypes, nivModes, skinIntegrityOptions } from '../../utils/nivEducation';
import { computeNIVUsageSummary } from '../../utils/nivCalculations';
import { mobilizationLevels, ventModes, weaningStatuses } from '../../utils/vmiEducation';

export type LatestSupportRecord =
  | { type: 'imv'; record: VMIRecord }
  | { type: 'niv'; record: NIVRecord }
  | { type: 'hfnc'; record: HFNCRecord }
  | { type: 'traqueostomia'; record: TrachRecord }
  | undefined;

export interface HandoffInput {
  patient: Patient;
  sector?: Sector;
  activeEpisode?: SupportEpisode;
  latestSupportRecord: LatestSupportRecord;
  /** Prestaciones ya filtradas a la ventana del turno elegida. */
  prestaciones: Prestacion[];
  /** Ventana usada para filtrar `prestaciones`, solo para el título de la sección. */
  shiftHours: number;
  mrcAssessment?: MrcAssessment;
  /** Sesiones de VNI del episodio activo, si el soporte actual es VNI — para la línea de uso/destete. */
  nivSessions?: NIVSession[];
}

const riskLabels: Record<RiskLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto' };

const sbtTypeLabels: Record<string, string> = {
  psv: 'Presión de Soporte (PSV)',
  cpap: 'CPAP',
  't-piece': 'Tubo en T',
};

const swallowingLabels: Record<string, string> = {
  apta: 'Apta',
  'no-apta': 'No apta',
  'con-restricciones': 'Con restricciones',
};

const prestacionTypeLabels: Record<PrestacionType, string> = {
  'kinesioterapia-respiratoria': 'Kinesioterapia respiratoria',
  'kinesioterapia-motora': 'Kinesioterapia motora',
  evaluacion: 'Evaluación',
  progresion: 'Progresión',
};

const mrcStatusLabels: Record<string, string> = {
  evaluable: 'Evaluable',
  'no-evaluable': 'No evaluable',
  parcial: 'Parcial',
  desconocido: 'Desconocido',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// Los arrays `alerts` de cada módulo ya vienen con un emoji indicador
// (✓/⚠️/⚡/ℹ️) pensado para la UI de la app. Para el pase de guardia — que
// tiene que verse igual de prolijo pegado en WhatsApp que en la HCE — se
// recorta ese prefijo y se deja solo el texto de la alerta.
function stripAlertEmoji(alert: string): string {
  return alert.replace(/^[✓⚠️⚡ℹ️]+\s*/u, '').trim();
}

function formatAlerts(alerts: string[]): string | undefined {
  if (alerts.length === 0) return undefined;
  return alerts.map(stripAlertEmoji).join('; ');
}

function pfInterpretation(pf: number): string {
  if (pf < 100) return 'SDRA severo';
  if (pf < 200) return 'SDRA moderado';
  if (pf < 300) return 'SDRA leve';
  return 'normal';
}

function acidBaseInterpretation(ph: number, hco3: number): string | undefined {
  if (ph >= 7.35 && ph <= 7.45) return 'balance normal';
  if (ph < 7.35 && hco3 < 22) return 'acidosis metabólica';
  if (ph < 7.35 && hco3 >= 22) return 'acidosis respiratoria';
  if (ph > 7.45 && hco3 > 26) return 'alcalosis metabólica';
  if (ph > 7.45 && hco3 <= 26) return 'alcalosis respiratoria';
  return undefined;
}

function buildHeader(patient: Patient, sector: Sector | undefined): string[] {
  const location = [sector?.name, patient.bedLabel ? `Cama ${patient.bedLabel}` : undefined].filter(Boolean).join(' · ');
  const lines = [`PASE DE GUARDIA - ${patient.alias}`];
  if (location) lines.push(location);
  lines.push(`Generado: ${fmtDateTime(new Date().toISOString())}`);
  return lines;
}

function buildContextSection(patient: Patient, activeEpisode: SupportEpisode | undefined): string[] {
  const lines: string[] = ['CONTEXTO CLINICO'];
  if (patient.age != null) lines.push(`Edad: ${patient.age} años`);
  if (patient.admissionDiagnosis) lines.push(`Diagnóstico de ingreso: ${patient.admissionDiagnosis}`);
  if (patient.antecedentes.length > 0) lines.push(`Antecedentes: ${patient.antecedentes.join(', ')}`);
  const supportLabel = supportTypeLabel(patient.supportType);
  if (activeEpisode) {
    const duration = calculateEpisodeDuration(activeEpisode.startAt);
    lines.push(`Soporte actual: ${supportLabel} (${duration.label}, desde ${fmtDate(activeEpisode.startAt)})`);
  } else {
    lines.push(`Soporte actual: ${supportLabel}`);
  }
  return lines.length > 1 ? lines : [...lines, 'Sin datos de contexto cargados'];
}

function supportTypeLabel(type: Patient['supportType']): string {
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

function buildImvSection(record: VMIRecord): string[] {
  const modeLabel = ventModes.find((m) => m.value === record.ventMode)?.label || record.ventMode;
  const setParam =
    record.ventMode === 'VC'
      ? `VT ${record.tidalVolumeSet} ml`
      : record.ventMode === 'PC' && record.controlPressure != null
        ? `PC ${record.controlPressure} cmH2O`
        : record.ventMode === 'PSV' && record.supportPressure != null
          ? `PS ${record.supportPressure} cmH2O`
          : undefined;
  const lines = [`ESTADO RESPIRATORIO ACTUAL (VMI - ${fmtDateTime(record.timestamp)})`];
  const params = [
    `Modo: ${modeLabel}`,
    setParam,
    record.inspiratoryTime != null ? `Ti ${record.inspiratoryTime}s` : undefined,
    record.respiratoryRate != null ? `FR ${record.respiratoryRate} rpm` : undefined,
    `PEEP ${record.peep} cmH2O`,
    `FiO2 ${record.fio2}%`,
  ].filter(Boolean);
  lines.push(params.join(' | '));

  const mechanics = [
    `Vt/kg ${record.vtPerKg}`,
    `Pplat ${record.plateauPressure}${record.plateauPressure > 30 ? ' (elevada)' : ''}`,
    `Driving Pressure ${record.drivingPressure}${record.drivingPressure > 15 ? ' (elevado)' : ''}`,
    record.compliance != null ? `Compliance ${record.compliance} ml/cmH2O` : undefined,
    record.mechanicalPower != null ? `Mechanical Power ${record.mechanicalPower} J/min` : undefined,
  ].filter(Boolean);
  lines.push(`Mecánica: ${mechanics.join(' | ')}`);

  const gas = [
    record.ph != null ? `pH ${record.ph}` : undefined,
    record.paco2 != null ? `PaCO2 ${record.paco2}` : undefined,
    record.pao2 != null ? `PaO2 ${record.pao2}` : undefined,
    record.hco3 != null ? `HCO3 ${record.hco3}` : undefined,
    record.pfRatio != null ? `P/F ${record.pfRatio} (${pfInterpretation(record.pfRatio)})` : undefined,
  ].filter(Boolean);
  if (gas.length > 0) lines.push(`Gasometría: ${gas.join(' | ')}`);
  if (record.ph != null && record.hco3 != null) {
    const interp = acidBaseInterpretation(record.ph, record.hco3);
    if (interp) lines.push(`Equilibrio ácido-base: ${interp}`);
  }

  const weaningLabel = weaningStatuses.find((w) => w.value === record.weaningStatus)?.label || record.weaningStatus;
  const sbt = record.sbtPerformed
    ? `SBT: ${record.sbtType ? sbtTypeLabels[record.sbtType] ?? record.sbtType : 'realizada'}${record.sbtResult ? ` - ${record.sbtResult === 'success' ? 'exitosa' : 'fallida'}` : ''}${record.sbtResult === 'failure' && record.sbtFailureReason ? ` (${record.sbtFailureReason})` : ''}`
    : 'SBT: no realizada';
  lines.push(`Destete: ${weaningLabel} | ${sbt}`);

  const mobDescription = mobilizationLevels.find((m) => m.value === record.mobilizationLevel)?.description;
  if (mobDescription) lines.push(`Movilización: Nivel ${record.mobilizationLevel} - ${mobDescription}${record.mobilizationBarrier ? ` (barrera: ${record.mobilizationBarrier})` : ''}`);

  if (record.hasAsynchrony) {
    lines.push(`Asincronías: sí${record.asynchronyFrequency ? ` (${record.asynchronyFrequency === 'rare' ? 'raras' : record.asynchronyFrequency === 'occasional' ? 'ocasionales' : 'frecuentes'})` : ''}`);
  }

  const alertsText = formatAlerts(record.alerts);
  if (alertsText) lines.push(`Alertas: ${alertsText}`);
  return lines;
}

function buildNivSection(record: NIVRecord, nivSessions: NIVSession[] | undefined): string[] {
  const interfaceLabel = interfaceTypes.find((i) => i.value === record.interfaceType)?.label || record.interfaceType;
  const modeLabel = nivModes.find((m) => m.value === record.mode)?.label || record.mode;
  const skinLabel = skinIntegrityOptions.find((s) => s.value === record.skinIntegrity)?.label || record.skinIntegrity;
  const lines = [`ESTADO RESPIRATORIO ACTUAL (VNI - ${fmtDateTime(record.timestamp)})`];
  const params = [
    `Interfaz: ${interfaceLabel}`,
    `Modo: ${modeLabel}`,
    `PS ${record.supportPressure} cmH2O`,
    `PEEP ${record.peep} cmH2O`,
    `Sens. esp. ${record.expiratorySensitivity}%`,
    `FiO2 ${record.fio2}%`,
    record.leak != null ? `Fuga ${record.leak} l/min` : undefined,
  ].filter(Boolean);
  lines.push(params.join(' | '));
  lines.push(`HACOR: ${record.hacorScore} (riesgo ${riskLabels[record.hacorRisk]})`);
  const gas = [
    `pH ${record.ph}`,
    `PaO2 ${record.pao2}`,
    record.paco2 != null ? `PaCO2 ${record.paco2}` : undefined,
    record.hco3 != null ? `HCO3 ${record.hco3}` : undefined,
    record.spo2 != null ? `SatO2 ${record.spo2}%` : undefined,
  ].filter(Boolean);
  if (gas.length > 0) lines.push(`Gasometría: ${gas.join(' | ')}`);
  if (record.hco3 != null) {
    const interp = acidBaseInterpretation(record.ph, record.hco3);
    if (interp) lines.push(`Equilibrio ácido-base: ${interp}`);
  }
  lines.push(`Integridad de piel: ${skinLabel}${record.skinNotes ? ` (${record.skinNotes})` : ''}`);
  if (record.previousIMVDays != null) lines.push(`Días previos en VMI: ${record.previousIMVDays}`);
  if (nivSessions && nivSessions.length > 0) {
    const usage = computeNIVUsageSummary(nivSessions);
    lines.push(
      `Uso VNI: ${usage.hoursUsedLast24h}h en últimas 24h${usage.activeSession ? ' (sesión activa)' : ''} | ${usage.consecutiveDaysWithoutNIV} días consecutivos sin VNI`
    );
  }
  const nivAlertsText = formatAlerts(record.alerts);
  if (nivAlertsText) lines.push(`Alertas: ${nivAlertsText}`);
  return lines;
}

function buildHfncSection(record: HFNCRecord): string[] {
  const cannulaLabel = cannulaFitOptions.find((c) => c.value === record.cannulaFit)?.label || record.cannulaFit;
  const lines = [`ESTADO RESPIRATORIO ACTUAL (HFNC - ${fmtDateTime(record.timestamp)})`];
  const params = [
    `Flujo ${record.flow} l/min`,
    `FiO2 ${record.fio2}%`,
    record.temperature != null ? `Temp ${record.temperature}°C` : undefined,
  ].filter(Boolean);
  lines.push(params.join(' | '));
  lines.push(`ROX: ${record.roxIndex} (riesgo ${riskLabels[record.roxRisk]}) | SpO2 ${record.spo2}% | FR ${record.respiratoryRate} rpm`);
  lines.push(`Cánula: ${cannulaLabel}${record.cannulaNotes ? ` (${record.cannulaNotes})` : ''}`);
  lines.push(`Humidificación: ${record.humidificationWorking ? 'funcionando' : `con problema (${record.humidificationIssue ?? 'sin detalle'})`}`);
  const hfncAlertsText = formatAlerts(record.alerts);
  if (hfncAlertsText) lines.push(`Alertas: ${hfncAlertsText}`);
  return lines;
}

function buildTrachSection(record: TrachRecord): string[] {
  const lines = [`ESTADO RESPIRATORIO ACTUAL (Traqueostomía - ${fmtDateTime(record.timestamp)})`];
  const params = [`Glasgow ${record.glasgow}`, record.pemax != null ? `PEmax ${record.pemax}` : undefined].filter(Boolean);
  lines.push(params.join(' | '));
  if (record.cuffDeflationPerformed) {
    lines.push(`Desinsuflación de cuff: ${record.cuffDeflationTolerated ? 'tolerada' : 'no tolerada'}${record.cuffDeflationNotes ? ` (${record.cuffDeflationNotes})` : ''}`);
  }
  if (record.cappedTrialPerformed) {
    lines.push(`Prueba de tapado: ${record.cappedTrialTolerated ? 'tolerada' : 'no tolerada'}${record.cappedTrialNotes ? ` (${record.cappedTrialNotes})` : ''}`);
  }
  if (record.swallowingTest) lines.push(`Deglución: ${swallowingLabels[record.swallowingTest] ?? record.swallowingTest}`);
  if (record.blueTest) lines.push(`Blue test: ${record.blueTest === 'positivo' ? 'positivo' : 'negativo'}`);
  const trachAlertsText = formatAlerts(record.alerts);
  if (trachAlertsText) lines.push(`Alertas: ${trachAlertsText}`);
  return lines;
}

function buildSupportSection(latest: LatestSupportRecord, patient: Patient, nivSessions: NIVSession[] | undefined): string[] {
  if (!latest) {
    if (patient.supportType === 'conventional-oxygen' || patient.supportType === 'room-air') return [];
    return [`ESTADO RESPIRATORIO ACTUAL (${supportTypeLabel(patient.supportType)})`, 'Sin monitorización cargada todavía en este soporte.'];
  }
  switch (latest.type) {
    case 'imv':
      return buildImvSection(latest.record);
    case 'niv':
      return buildNivSection(latest.record, nivSessions);
    case 'hfnc':
      return buildHfncSection(latest.record);
    case 'traqueostomia':
      return buildTrachSection(latest.record);
  }
}

function buildPrestacionesSection(prestaciones: Prestacion[], mrcAssessment: MrcAssessment | undefined, shiftHours: number): string[] {
  const lines = [`KINESIOTERAPIA DEL TURNO (últimas ${shiftHours}h)`];
  const byType = new Map<PrestacionType, Prestacion[]>();
  for (const p of prestaciones) {
    const list = byType.get(p.type) ?? [];
    list.push(p);
    byType.set(p.type, list);
  }
  const order: PrestacionType[] = ['kinesioterapia-respiratoria', 'kinesioterapia-motora', 'evaluacion', 'progresion'];
  let any = false;
  for (const type of order) {
    const list = byType.get(type);
    if (!list || list.length === 0) continue;
    any = true;
    const sorted = [...list].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const times = sorted.map((p) => fmtTime(p.timestamp)).join(', ');
    lines.push(`${prestacionTypeLabels[type]}: ${list.length} sesión${list.length === 1 ? '' : 'es'} (${times})`);
    for (const p of sorted) {
      if (p.notes) lines.push(`  - ${fmtTime(p.timestamp)}: ${p.notes}`);
    }
  }
  if (mrcAssessment) {
    any = true;
    const statusLabel = mrcStatusLabels[mrcAssessment.status] ?? mrcAssessment.status;
    const score = mrcAssessment.totalScore != null ? `${mrcAssessment.totalScore}/60` : 'sin score';
    lines.push(`Evaluación MRC: ${score} (${statusLabel}) - ${fmtDate(mrcAssessment.assessedAt)}${mrcAssessment.daucicConfirmed ? ' - DAUCI confirmada' : ''}`);
  }
  if (!any) lines.push('Sin prestaciones registradas en esta ventana.');
  return lines;
}

export function buildHandoffText(input: HandoffInput): string {
  const sections: string[][] = [
    buildHeader(input.patient, input.sector),
    buildContextSection(input.patient, input.activeEpisode),
    buildSupportSection(input.latestSupportRecord, input.patient, input.nivSessions),
    buildPrestacionesSection(input.prestaciones, input.mrcAssessment, input.shiftHours),
  ].filter((section) => section.length > 0);

  return sections.map((section) => section.join('\n')).join('\n\n');
}
