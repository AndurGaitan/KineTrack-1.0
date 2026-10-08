/**
 * General Handoff Text Service — "Pase de Guardia General"
 *
 * Consolidates every patient with data loaded in the chosen period (see
 * handoffData.ts) into a single free-text block meant to be pasted straight
 * into the HCE as a narrative note — flowing sentences, no clock timestamps.
 * The caller passes only what was loaded in the period; anything not loaded is
 * simply left out. Builds on the same shared prose generators as the
 * per-patient "Evolución Kinésica" note (see clinicalNarrative.ts /
 * handoffText.ts).
 */
import { AirwayEvent, MrcAssessment, NIVSession, Patient, Prestacion, Sector, SupportEpisode } from '../../types';
import {
  LatestSupportRecord,
  SpontaneousVentilationNarrativeInput,
  TrachNarrativeInput,
  narrateContext,
  narrateEvents,
  narratePrestaciones,
  narrateSpontaneousVentilation,
  narrateSupport,
} from './clinicalNarrative';

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
}

export interface GeneralHandoffInput {
  kinesiologoName: string;
  patients: GeneralHandoffPatientInput[];
  /** Frase que encabeza la oración de kinesioterapia ("Durante el día"...). */
  periodPhrase: string;
  /** Descripción corta del período para el título ("03/10/2026"). */
  periodTitle: string;
}

function buildPatientBlock(input: GeneralHandoffPatientInput, periodPhrase: string): string {
  const { patient, sector, activeEpisode, latestSupportRecord, prestaciones, mrcAssessment, nivSessions, trach, airwayEvents, episodeChanges, spontaneousVentilation } = input;
  // Primero la cama, después el nombre: "Cama 2 (UCI) - ALIAS, 50 años".
  const bed = patient.bedLabel ? `Cama ${patient.bedLabel}${sector?.name ? ` (${sector.name})` : ''}` : sector?.name;
  const header = `${bed ? `${bed} - ` : ''}${patient.alias}${patient.age != null ? `, ${patient.age} años` : ''}`;

  // Pase diario: solo se narra el soporte si en el período se cargó algo
  // (último registro, o seguimiento de traqueostomía); lo no cargado no se escribe.
  const hasSupportInPeriod = latestSupportRecord !== undefined || (patient.supportType === 'traqueostomia' && trach !== undefined);
  const supportText = hasSupportInPeriod ? narrateSupport(latestSupportRecord, patient, nivSessions, trach) : undefined;

  const body = [
    narrateContext(patient, activeEpisode),
    supportText,
    narrateEvents(airwayEvents ?? [], episodeChanges ?? []),
    narrateSpontaneousVentilation(spontaneousVentilation, periodPhrase),
    narratePrestaciones(prestaciones, mrcAssessment, periodPhrase),
  ]
    .filter(Boolean)
    .join(' ');

  return `${header}\n${body}`;
}

export function buildGeneralHandoffText(input: GeneralHandoffInput): string {
  const count = input.patients.length;
  const header = [
    `PASE DE GUARDIA GENERAL - ${input.periodTitle}`,
    `${input.kinesiologoName} - ${count} paciente${count === 1 ? '' : 's'} con datos cargados`,
  ].join('\n');

  return [header, ...input.patients.map((p) => buildPatientBlock(p, input.periodPhrase))].join('\n\n');
}
