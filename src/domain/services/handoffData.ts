/**
 * Handoff data — decides WHAT goes into a pase de guardia / evolución.
 *
 * Both the per-patient "Evolución Kinésica" and the multi-patient "Pase de
 * Guardia General" use the same rule: only what was loaded inside the chosen
 * period (and, optionally, only by the current kinesiólogo). Anything not
 * loaded in the period is left out. Pure functions only (no React, no
 * fetching), so both pages share one criterion.
 */
import {
  AirwayEvent,
  HFNCRecord,
  MrcAssessment,
  NIVRecord,
  NIVSession,
  Patient,
  Prestacion,
  SpontaneousVentilationPeriod,
  SupportEpisode,
  TrachOverview,
  TrachRecord,
  VMIRecord,
} from '../../types';
import {
  LatestSupportRecord,
  SpontaneousVentilationNarrativeInput,
  TrachNarrativeInput,
  fmtDate,
  pickLatestSupportRecord,
} from './clinicalNarrative';
import { svHoursInRange } from '../../utils/spontaneousVentilation';

/** Agrega el plan / pendientes del kinesiólogo al final del texto (al copiar y al guardar). */
export function appendPlan(text: string, plan: string): string {
  const trimmed = plan.trim();
  return trimmed ? `${text.trimEnd()}\n\nPlan / pendientes: ${trimmed}` : text;
}

export type PeriodPreset = 'hoy' | '12h' | '24h' | 'dia' | 'custom';

export interface HandoffPeriod {
  from: Date;
  to: Date;
  /** Encabezado de la oración de kinesioterapia ("Durante el día", "En las últimas 12 horas"...). */
  phrase: string;
  /** Descripción corta del período (solo fechas, sin horas sueltas). */
  title: string;
}

export interface PeriodInput {
  preset: PeriodPreset;
  /** YYYY-MM-DD, para el preset "dia". */
  day?: string;
  /** Valores de `datetime-local`, para el preset "custom". */
  customFrom?: string;
  customTo?: string;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function parseLocalDay(day: string | undefined): Date | undefined {
  if (!day) return undefined;
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Resuelve las opciones del selector a un rango concreto; si son inválidas cae a "hoy". */
export function resolvePeriod(input: PeriodInput, now: Date = new Date()): HandoffPeriod {
  if (input.preset === '12h' || input.preset === '24h') {
    const hours = input.preset === '12h' ? 12 : 24;
    return {
      from: new Date(now.getTime() - hours * 60 * 60 * 1000),
      to: now,
      phrase: `En las últimas ${hours} horas`,
      title: `últimas ${hours} h - ${fmtDate(now.toISOString())}`,
    };
  }

  if (input.preset === 'dia') {
    const day = parseLocalDay(input.day);
    if (day) {
      return { from: startOfDay(day), to: endOfDay(day), phrase: `El ${fmtDate(day.toISOString())}`, title: fmtDate(day.toISOString()) };
    }
  }

  if (input.preset === 'custom' && input.customFrom && input.customTo) {
    const from = new Date(input.customFrom);
    const to = new Date(input.customTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to.getTime() >= from.getTime()) {
      const a = fmtDate(from.toISOString());
      const b = fmtDate(to.toISOString());
      return sameDay(from, to)
        ? { from, to, phrase: `El ${a}`, title: a }
        : { from, to, phrase: `Entre el ${a} y el ${b}`, title: `${a} al ${b}` };
    }
  }

  return { from: startOfDay(now), to: endOfDay(now), phrase: 'Durante el día', title: fmtDate(now.toISOString()) };
}

export interface ActivitySources {
  prestaciones: Prestacion[];
  vmi: VMIRecord[];
  niv: NIVRecord[];
  hfnc: HFNCRecord[];
  trach: TrachRecord[];
  nivSessions: NIVSession[];
  mrc: MrcAssessment[];
  trachOverview?: TrachOverview | null;
  airwayEvents: AirwayEvent[];
  /** Todos los períodos de ventilación espontánea del paciente (se filtran al rango). */
  svPeriods: SpontaneousVentilationPeriod[];
}

export interface ActivityScope {
  period: HandoffPeriod;
  userId: string;
  /** true = solo lo que cargó `userId`; false = todo el equipo. */
  mineOnly: boolean;
}

export interface PatientActivity {
  latestSupportRecord: LatestSupportRecord;
  prestaciones: Prestacion[];
  mrcAssessment?: MrcAssessment;
  nivSessions?: NIVSession[];
  trach?: TrachNarrativeInput;
  airwayEvents: AirwayEvent[];
  episodeChanges: SupportEpisode[];
  /** Ventilación espontánea (traqueostomía en VMI) dentro del período. */
  spontaneousVentilation?: SpontaneousVentilationNarrativeInput;
}

/**
 * Lo cargado para un paciente dentro del período, o `undefined` si no hubo
 * nada (el paciente no entra al pase). Las listas de registros deben venir de
 * la más nueva a la más vieja.
 */
export function collectPatientActivity(
  patient: Patient,
  activeEpisode: SupportEpisode | undefined,
  src: ActivitySources,
  scope: ActivityScope
): PatientActivity | undefined {
  const fromMs = scope.period.from.getTime();
  const toMs = scope.period.to.getTime();
  const inPeriod = (iso: string | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= fromMs && t <= toMs;
  };
  const isMine = (userId: string | undefined) => !scope.mineOnly || userId === scope.userId;

  const prestaciones = src.prestaciones
    .filter((p) => inPeriod(p.timestamp) && isMine(p.performedByUserId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const mrcAssessment = src.mrc
    .filter((m) => inPeriod(m.assessedAt) && isMine(m.evaluatedByUserId))
    .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())[0];

  const recordsIn = <T extends { timestamp: string; performedByUserId?: string }>(records: T[]) =>
    records.filter((r) => inPeriod(r.timestamp) && isMine(r.performedByUserId));
  const trachInPeriod = recordsIn(src.trach);
  const vmiInPeriod = recordsIn(src.vmi);
  const nivInPeriod = recordsIn(src.niv);
  const hfncInPeriod = recordsIn(src.hfnc);
  // Se prefiere el registro del soporte actual; si en el período solo hay de un
  // soporte anterior (p. ej. se extubó durante el turno), se usa el más reciente.
  let latestSupportRecord = pickLatestSupportRecord(patient, vmiInPeriod, nivInPeriod, hfncInPeriod, trachInPeriod);
  if (!latestSupportRecord) {
    const candidates: NonNullable<LatestSupportRecord>[] = [
      ...(vmiInPeriod[0] ? [{ type: 'imv' as const, record: vmiInPeriod[0] }] : []),
      ...(nivInPeriod[0] ? [{ type: 'niv' as const, record: nivInPeriod[0] }] : []),
      ...(hfncInPeriod[0] ? [{ type: 'hfnc' as const, record: hfncInPeriod[0] }] : []),
      ...(trachInPeriod[0] ? [{ type: 'traqueostomia' as const, record: trachInPeriod[0] }] : []),
    ];
    latestSupportRecord = candidates.sort((a, b) => new Date(b.record.timestamp).getTime() - new Date(a.record.timestamp).getTime())[0];
  }

  const hasSessionInPeriod =
    patient.supportType === 'niv' &&
    src.nivSessions.some((s) => (inPeriod(s.startAt) && isMine(s.performedByUserId)) || inPeriod(s.endAt));

  let trach: TrachNarrativeInput | undefined;
  if (patient.supportType === 'traqueostomia') {
    const overview = src.trachOverview;
    const aspirations = (overview?.aspirations ?? []).filter((a) => inPeriod(a.timestamp) && isMine(a.performedByUserId));
    const process = overview?.activeProcess;
    const processActive =
      !!process &&
      ((inPeriod(process.startedAt) && isMine(process.startedByUserId)) ||
        process.assessments.some((a) => inPeriod(a.assessedAt) && isMine(a.assessedByUserId)) ||
        process.occlusionTrials.some(
          (t) => (inPeriod(t.startedAt) && isMine(t.startedByUserId)) || t.entries.some((e) => inPeriod(e.at) && isMine(e.recordedByUserId))
        ));
    if (trachInPeriod.length > 0 || aspirations.length > 0 || processActive) {
      trach = {
        records: trachInPeriod,
        overview: overview ? { ...overview, aspirations, activeProcess: processActive ? process! : null } : null,
        episode: activeEpisode,
        omitEmptyNotice: true,
      };
    }
  }

  const airwayEvents = src.airwayEvents.filter((e) => inPeriod(e.occurredAt) && isMine(e.performedByUserId));

  // Ventilación espontánea: períodos que se solapan con el rango (los cargó esta persona o todo el equipo).
  const svInRange =
    patient.airwayType === 'traqueostomia'
      ? src.svPeriods.filter((p) => isMine(p.performedByUserId) && svHoursInRange([p], scope.period.from, scope.period.to) > 0)
      : [];
  const spontaneousVentilation =
    svInRange.length > 0 ? { periods: svInRange, hours: svHoursInRange(svInRange, scope.period.from, scope.period.to) } : undefined;

  // El primer episodio es el ingreso, no un cambio de soporte.
  const episodeChanges = [...patient.episodes]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(1)
    .filter((ep) => inPeriod(ep.startAt));

  const hasActivity =
    prestaciones.length > 0 ||
    !!mrcAssessment ||
    !!latestSupportRecord ||
    hasSessionInPeriod ||
    !!trach ||
    airwayEvents.length > 0 ||
    !!spontaneousVentilation ||
    (!scope.mineOnly && episodeChanges.length > 0);
  if (!hasActivity) return undefined;

  return {
    latestSupportRecord,
    prestaciones,
    mrcAssessment,
    nivSessions: hasSessionInPeriod ? src.nivSessions : undefined,
    trach,
    airwayEvents,
    episodeChanges,
    spontaneousVentilation,
  };
}
