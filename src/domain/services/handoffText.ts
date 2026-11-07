/**
 * Evolución Kinésica — nota individual por paciente.
 *
 * El kinesiólogo evoluciona a un paciente, genera esta nota y la pega en la
 * historia clínica. Es una narración corrida (ver narrativeHandoff.ts): sin
 * cabecera, sin nombre ni cama, sin negritas y sin pendientes. Usa el mismo
 * criterio de período/alcance que el pase general (ver handoffData.ts): solo
 * lo que se cargó en el período elegido. El pase de guardia general, en
 * cambio, es un texto corto con formato para WhatsApp (generalHandoffText.ts).
 */
import { AirwayEvent, MobilizationContraindication, MobilizationStart, MrcAssessment, OxygenRecord, Patient, Prestacion, PveDecision, Sector, SupportEpisode } from '../../types';
import { LatestSupportRecord, SpontaneousVentilationNarrativeInput, TrachNarrativeInput, pickLatestSupportRecord } from './clinicalNarrative';
import { buildNarrativeEvolution } from './narrativeHandoff';

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
  /** Días sin VNI (si dejó la VNI hace poco). */
  daysSinceNiv?: number;
  /** Estado + aspiraciones + proceso de decanulación del período, si el soporte actual es traqueostomía. */
  trach?: TrachNarrativeInput;
  airwayEvents?: AirwayEvent[];
  episodeChanges?: SupportEpisode[];
  spontaneousVentilation?: SpontaneousVentilationNarrativeInput;
  oxygenRecord?: OxygenRecord;
  pveDecisions?: PveDecision[];
  mobilization?: { start?: MobilizationStart; contraindications: MobilizationContraindication[] };
}

export function buildHandoffText(input: HandoffInput): string {
  return buildNarrativeEvolution(input);
}
