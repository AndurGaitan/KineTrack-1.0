/**
 * General Handoff Text Service — "Pase de Guardia General"
 *
 * Consolidates every patient the current kinesiólogo attended today (at
 * least one prestación logged today) into a single free-text block meant
 * to be pasted straight into the HCE as a narrative note — flowing
 * sentences, no clock timestamps. Builds on the same shared prose
 * generators as the per-patient "Evolución Kinésica" note (see
 * clinicalNarrative.ts / handoffText.ts) so both texts describe the same
 * facts.
 */
import { MrcAssessment, NIVSession, Patient, Prestacion, Sector, SupportEpisode } from '../../types';
import { LatestSupportRecord, fmtDate, narrateContext, narratePrestaciones, narrateSupport } from './clinicalNarrative';

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

function buildPatientBlock(input: GeneralHandoffPatientInput): string {
  const { patient, sector, activeEpisode, latestSupportRecord, prestaciones, mrcAssessment, nivSessions } = input;
  const location = [sector?.name, patient.bedLabel ? `cama ${patient.bedLabel}` : undefined].filter(Boolean).join(', ');
  const header = `${patient.alias}${location ? ` (${location})` : ''}${patient.age != null ? `, ${patient.age} años` : ''}`;

  const body = [narrateContext(patient, activeEpisode), narrateSupport(latestSupportRecord, patient, nivSessions), narratePrestaciones(prestaciones, mrcAssessment)]
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
