/**
 * Evolución Kinésica — per-patient narrative note
 *
 * The kinesiólogo evolves one patient, then generates this and pastes it
 * straight into the electronic clinical record (HCE) before moving to the
 * next patient — flowing sentences, no clock timestamps (only day counts,
 * which aren't a "horario"). Was previously branded "Pase de Guardia" with
 * label:value lines and timestamps; kept that shape for the *general*,
 * multi-patient shift handoff (see generalHandoffText.ts), which is still
 * literally a pase de guardia between kinesiólogos.
 *
 * Both this file and generalHandoffText.ts build on the shared prose
 * generators in clinicalNarrative.ts so they describe the same facts.
 */
import { MrcAssessment, NIVSession, Patient, Prestacion, Sector, SupportEpisode } from '../../types';
import {
  LatestSupportRecord,
  fmtDate,
  narrateContext,
  narratePrestaciones,
  narrateSupport,
  pickLatestSupportRecord,
} from './clinicalNarrative';

export type { LatestSupportRecord };
export { pickLatestSupportRecord };

export interface HandoffInput {
  patient: Patient;
  sector?: Sector;
  activeEpisode?: SupportEpisode;
  latestSupportRecord: LatestSupportRecord;
  /** Prestaciones ya filtradas a la ventana del turno elegida. */
  prestaciones: Prestacion[];
  /** Ventana usada para filtrar `prestaciones` — encabeza la oración de kinesioterapia. */
  shiftHours: number;
  mrcAssessment?: MrcAssessment;
  /** Sesiones de VNI del episodio activo, si el soporte actual es VNI — para la oración de uso/destete. */
  nivSessions?: NIVSession[];
}

function buildHeader(patient: Patient, sector: Sector | undefined): string {
  const location = [sector?.name, patient.bedLabel ? `cama ${patient.bedLabel}` : undefined].filter(Boolean).join(', ');
  const ageText = patient.age != null ? `, ${patient.age} años` : '';
  const titleLine = `EVOLUCIÓN KINÉSICA - ${patient.alias}${location ? ` (${location})` : ''}${ageText}`;
  return [titleLine, fmtDate(new Date().toISOString())].join('\n');
}

export function buildHandoffText(input: HandoffInput): string {
  const header = buildHeader(input.patient, input.sector);
  const body = [
    narrateContext(input.patient, input.activeEpisode),
    narrateSupport(input.latestSupportRecord, input.patient, input.nivSessions),
    narratePrestaciones(input.prestaciones, input.mrcAssessment, `En las últimas ${input.shiftHours} horas`),
  ]
    .filter(Boolean)
    .join(' ');

  return [header, body].join('\n\n');
}
