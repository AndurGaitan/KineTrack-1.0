/**
 * General Handoff Text Service — "Pase de Guardia General"
 *
 * Consolida a cada paciente con datos cargados en el período (ver
 * handoffData.ts) en un texto compacto para leer rápido y pegar en WhatsApp:
 * una línea por tema, abreviaturas y negritas (*texto*). El detalle del
 * formato vive en compactHandoff.ts. La "Evolución Kinésica" individual, en
 * cambio, sigue siendo prosa para la historia clínica (handoffText.ts).
 */
import { AirwayEvent, MobilizationContraindication, MobilizationStart, MrcAssessment, NIVSession, OxygenRecord, Patient, Prestacion, PveDecision, Sector, SupportEpisode } from '../../types';
import { LatestSupportRecord, SpontaneousVentilationNarrativeInput, TrachNarrativeInput } from './clinicalNarrative';
import { bold, buildCompactPatientBlock } from './compactHandoff';

export interface GeneralHandoffPatientInput {
  patient: Patient;
  sector?: Sector;
  activeEpisode?: SupportEpisode;
  /** Último registro de soporte cargado en el período (undefined si no se cargó ninguno). */
  latestSupportRecord: LatestSupportRecord;
  /** Prestaciones del período para este paciente (ya filtradas). */
  prestaciones: Prestacion[];
  mrcAssessment?: MrcAssessment;
  nivSessions?: NIVSession[];
  trach?: TrachNarrativeInput;
  airwayEvents?: AirwayEvent[];
  episodeChanges?: SupportEpisode[];
  spontaneousVentilation?: SpontaneousVentilationNarrativeInput;
  /** Último registro de oxigenoterapia convencional del período. */
  oxygenRecord?: OxygenRecord;
  /** Decisiones de PVE del período (de la más vieja a la más nueva). */
  pveDecisions: PveDecision[];
  /** Movilización precoz del paciente en VMI (estado actual). */
  mobilization?: { start?: MobilizationStart; contraindications: MobilizationContraindication[] };
}

export interface GeneralHandoffInput {
  kinesiologoName: string;
  patients: GeneralHandoffPatientInput[];
  /** Ya no se usa en el formato compacto; se mantiene por compatibilidad con quien lo llame. */
  periodPhrase?: string;
  /** Descripción corta del período para el título ("03/10/2026"). */
  periodTitle: string;
}

export function buildGeneralHandoffText(input: GeneralHandoffInput): string {
  const count = input.patients.length;
  const header = [
    `${bold('PASE DE GUARDIA')} · ${input.periodTitle}`,
    `${input.kinesiologoName} · ${count} paciente${count === 1 ? '' : 's'}`,
  ].join('\n');

  const now = new Date();
  const separator = '──────────';
  return [header, ...input.patients.map((p) => `${separator}\n${buildCompactPatientBlock(p, now)}`)].join('\n\n');
}
