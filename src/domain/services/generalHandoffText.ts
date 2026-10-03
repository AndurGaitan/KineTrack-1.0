/**
 * General Handoff Text Service — "Pase de Guardia General"
 *
 * Consolidates every patient the current kinesiólogo attended today (any
 * data logged today: prestación, monitorización, VNI session, trach
 * follow-up, MRC) into a single free-text block meant to be pasted straight
 * into the HCE as a narrative note — flowing sentences, no clock timestamps.
 * It is a daily handoff: the caller passes only today's data, and anything
 * not entered today is simply left out. Builds on the same shared prose
 * generators as the per-patient "Evolución Kinésica" note (see
 * clinicalNarrative.ts / handoffText.ts).
 */
import { MrcAssessment, NIVSession, Patient, Prestacion, Sector, SupportEpisode } from '../../types';
import { LatestSupportRecord, TrachNarrativeInput, fmtDate, narrateContext, narratePrestaciones, narrateSupport } from './clinicalNarrative';

export interface GeneralHandoffPatientInput {
  patient: Patient;
  sector?: Sector;
  activeEpisode?: SupportEpisode;
  /** Último registro de soporte cargado HOY (undefined si hoy no se cargó ninguno). */
  latestSupportRecord: LatestSupportRecord;
  /** Prestaciones de hoy para este paciente (ya filtradas). */
  prestaciones: Prestacion[];
  mrcAssessment?: MrcAssessment;
  nivSessions?: NIVSession[];
  trach?: TrachNarrativeInput;
}

export interface GeneralHandoffInput {
  kinesiologoName: string;
  patients: GeneralHandoffPatientInput[];
}

function buildPatientBlock(input: GeneralHandoffPatientInput): string {
  const { patient, sector, activeEpisode, latestSupportRecord, prestaciones, mrcAssessment, nivSessions, trach } = input;
  // Primero la cama, después el nombre: "Cama 2 (UCI) - ALIAS, 50 años".
  const bed = patient.bedLabel ? `Cama ${patient.bedLabel}${sector?.name ? ` (${sector.name})` : ''}` : sector?.name;
  const header = `${bed ? `${bed} - ` : ''}${patient.alias}${patient.age != null ? `, ${patient.age} años` : ''}`;

  // Pase diario: solo se narra el soporte si hoy se cargó algo (último registro
  // del día, o seguimiento de traqueostomía de hoy); lo no cargado no se escribe.
  const hasSupportToday = latestSupportRecord !== undefined || (patient.supportType === 'traqueostomia' && trach !== undefined);
  const supportText = hasSupportToday ? narrateSupport(latestSupportRecord, patient, nivSessions, trach) : undefined;

  const body = [narrateContext(patient, activeEpisode), supportText, narratePrestaciones(prestaciones, mrcAssessment)]
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
