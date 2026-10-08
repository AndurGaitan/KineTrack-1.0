/**
 * Evolución Kinésica — per-patient narrative note
 *
 * The kinesiólogo evolves one patient, then generates this and pastes it
 * straight into the electronic clinical record (HCE) before moving to the
 * next patient — flowing sentences, no clock timestamps (only day counts,
 * which aren't a "horario"). Uses the same period/scope criterion as the
 * general handoff (see handoffData.ts): only what was loaded in the chosen
 * period. Was previously branded "Pase de Guardia" with label:value lines and
 * timestamps; kept that shape for the *general*, multi-patient shift handoff
 * (see generalHandoffText.ts), which is still literally a pase de guardia
 * between kinesiólogos.
 *
 * Both this file and generalHandoffText.ts build on the shared prose
 * generators in clinicalNarrative.ts so they describe the same facts.
 */
import { AirwayEvent, MrcAssessment, NIVSession, Patient, Prestacion, Sector, SupportEpisode } from '../../types';
import {
  LatestSupportRecord,
  fmtDate,
  narrateContext,
  narrateEvents,
  narratePrestaciones,
  narrateSpontaneousVentilation,
  narrateSupport,
  pickLatestSupportRecord,
  SpontaneousVentilationNarrativeInput,
  TrachNarrativeInput,
} from './clinicalNarrative';

export type { LatestSupportRecord };
export { pickLatestSupportRecord };

export interface HandoffInput {
  patient: Patient;
  sector?: Sector;
  activeEpisode?: SupportEpisode;
  /** Último registro de soporte cargado en el período (undefined si no hubo). */
  latestSupportRecord: LatestSupportRecord;
  /** Prestaciones ya filtradas al período. */
  prestaciones: Prestacion[];
  /** Encabezado de la oración de kinesioterapia ("En las últimas 12 horas"...). */
  periodPhrase: string;
  mrcAssessment?: MrcAssessment;
  /** Sesiones de VNI del episodio activo, si en el período hubo sesiones — para la oración de uso/destete. */
  nivSessions?: NIVSession[];
  /** Estado + aspiraciones + proceso de decanulación del período, si el soporte actual es traqueostomía. */
  trach?: TrachNarrativeInput;
  airwayEvents?: AirwayEvent[];
  episodeChanges?: SupportEpisode[];
  spontaneousVentilation?: SpontaneousVentilationNarrativeInput;
}

function buildHeader(patient: Patient, sector: Sector | undefined): string {
  const location = [sector?.name, patient.bedLabel ? `cama ${patient.bedLabel}` : undefined].filter(Boolean).join(', ');
  const ageText = patient.age != null ? `, ${patient.age} años` : '';
  const titleLine = `EVOLUCIÓN KINÉSICA - ${patient.alias}${location ? ` (${location})` : ''}${ageText}`;
  return [titleLine, fmtDate(new Date().toISOString())].join('\n');
}

export function buildHandoffText(input: HandoffInput): string {
  const header = buildHeader(input.patient, input.sector);
  const hasSupportInPeriod =
    input.latestSupportRecord !== undefined || (input.patient.supportType === 'traqueostomia' && input.trach !== undefined);
  const body = [
    narrateContext(input.patient, input.activeEpisode),
    hasSupportInPeriod ? narrateSupport(input.latestSupportRecord, input.patient, input.nivSessions, input.trach) : undefined,
    narrateEvents(input.airwayEvents ?? [], input.episodeChanges ?? []),
    narrateSpontaneousVentilation(input.spontaneousVentilation, input.periodPhrase),
    narratePrestaciones(input.prestaciones, input.mrcAssessment, input.periodPhrase),
  ]
    .filter(Boolean)
    .join(' ');

  return [header, body].join('\n\n');
}
