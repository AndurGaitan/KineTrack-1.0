/**
 * Decannulation process — domain rules.
 *
 * Pure functions only (no React, no fetching) so the same logic feeds the TQT
 * hub, the handoff texts and, later, indicators.
 *
 * Principles that shape everything here:
 *  - No score, percentage or "apto/no apto". The output is descriptive.
 *  - Every domain keeps three things apart: what was OBSERVED (derived from
 *    data already in KineTrack — never re-entered), the institutional
 *    REFERENCE, and the professional's INTERPRETATION (which only a person
 *    sets; nothing here ever chooses a status for them).
 *  - `check` compares observed data against the reference. It is a neutral
 *    "within / outside reference" hint, not an interpretation.
 */
import type {
  SupportEpisode,
  TrachAspiration,
  TrachCuffStatus,
  TrachDecannulationProcess,
  TrachDomain,
  TrachDomainAssessment,
  TrachDomainStatus,
  TrachOcclusionTrial,
  TrachOverview,
  TrachRecord,
  TrachSecretionAmount,
  TrachSecretionCharacter,
  TrachVentilatorySupport,
} from '../../types';

// ---------------------------------------------------------------------------
// Institutional references. Numbers marked "dado" came from the service's own
// protocol; the rest are provisional defaults lifted from KineTrack's existing
// alerts and MUST be validated against the written institutional protocol.
// They live in one place so changing a reference never means hunting the UI.
// ---------------------------------------------------------------------------
export const REFERENCES = {
  vmiFreeHours: 48, // dado: >48 h libres de VMI
  aspirationsPerBlock: 2, // dado: <=2 aspiraciones por bloque de 8 h
  aspirationBlockHours: 8,
  aspirationWindowHours: 24, // dado: durante 24 h
  pemaxMin: 40, // dado: favorable >= 40 cmH2O
  occlusionMinHours: 24, // dado: oclusión completa >= 24 h incluyendo período nocturno
  glasgowMin: 13, // provisorio: mismo corte que las alertas actuales ("conciencia adecuada")
  // provisorio: período nocturno (hora local). La oclusión "incluye la noche" si
  // se solapa al menos `nightMinOverlapHours` con esta franja.
  nightStartHour: 22,
  nightEndHour: 6,
  nightMinOverlapHours: 6,
  // provisorio: el checklist de rescate aparece cuando la oclusión ya lleva tiempo
  // o cuando casi todos los dominios previos están favorables.
  nearOcclusionHours: 12,
  nearFavorableDomains: 5,
} as const;

const HOUR = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Labels & presentation
// ---------------------------------------------------------------------------
export const STATUS_ORDER: TrachDomainStatus[] = ['pendiente', 'favorable', 'condicionado', 'desfavorable', 'no-evaluable'];

export const STATUS_META: Record<TrachDomainStatus, { label: string; badge: string; dot: string; ring: string }> = {
  pendiente: { label: 'Pendiente', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-300', ring: 'border-gray-300' },
  favorable: { label: 'Favorable', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500', ring: 'border-green-500' },
  condicionado: { label: 'Condicionado', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', ring: 'border-amber-500' },
  desfavorable: { label: 'Desfavorable', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500', ring: 'border-red-500' },
  'no-evaluable': { label: 'No evaluable', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', ring: 'border-slate-400' },
};

export const cuffStatusLabels: Record<TrachCuffStatus, string> = {
  insuflado: 'Insuflado',
  desinsuflado: 'Desinsuflado',
  'sin-balon': 'Cánula sin balón',
};

export const ventilatorySupportLabels: Record<TrachVentilatorySupport, string> = {
  'aire-ambiente': 'Aire ambiente',
  oxigeno: 'Oxígeno suplementario',
  hfnc: 'Alto flujo por TQT',
  'vmi-intermitente': 'VMI intermitente',
};

export const secretionAmountLabels: Record<TrachSecretionAmount, string> = {
  ausente: 'Sin secreciones',
  escasa: 'Escasas',
  moderada: 'Moderadas',
  abundante: 'Abundantes',
};

export const secretionCharacterLabels: Record<TrachSecretionCharacter, string> = {
  mucosa: 'mucosas',
  mucopurulenta: 'mucopurulentas',
  purulenta: 'purulentas',
  hemoptoica: 'hemoptoicas',
};

export const swallowingLabels: Record<string, string> = {
  apta: 'Apta',
  'no-apta': 'No apta',
  'con-restricciones': 'Apta con restricciones',
};

export interface DomainMeta {
  key: TrachDomain;
  label: string;
  /** Nombre corto para usar dentro de una oración (evolución / pase). */
  prose: string;
  /** Qué se espera, en una línea (referencia institucional). */
  reference: string;
  /** true = referencia tomada de las alertas actuales de KineTrack, a validar contra el protocolo escrito. */
  provisional: boolean;
}

export const DOMAINS: DomainMeta[] = [
  { key: 'estabilidad', label: 'Estabilidad y tiempo libre de VMI', prose: 'estabilidad y tiempo libre de VMI', reference: '> 48 h libres de VMI, con estabilidad clínica', provisional: false },
  { key: 'via-aerea-superior', label: 'Permeabilidad de vía aérea superior', prose: 'permeabilidad de vía aérea superior', reference: 'Prueba de balón desinflado tolerada', provisional: true },
  { key: 'secreciones', label: 'Secreciones', prose: 'secreciones', reference: '≤ 2 aspiraciones por bloque de 8 h durante 24 h', provisional: false },
  { key: 'pemax', label: 'Fuerza tusígena (Pemáx)', prose: 'fuerza tusígena (Pemáx)', reference: 'Pemáx favorable ≥ 40 cmH₂O', provisional: false },
  { key: 'proteccion', label: 'Protección de vía aérea', prose: 'protección de vía aérea', reference: 'Glasgow ≥ 13, deglución apta y blue test negativo', provisional: true },
  { key: 'oclusion', label: 'Oclusión completa', prose: 'oclusión completa', reference: '≥ 24 h de oclusión completa, incluyendo período nocturno', provisional: false },
  { key: 'rescate', label: 'Capacidad institucional de rescate', prose: 'capacidad institucional de rescate', reference: 'Checklist de rescate completo antes de decanular', provisional: true },
];

export const DOMAIN_BY_KEY: Record<TrachDomain, DomainMeta> = Object.fromEntries(DOMAINS.map((d) => [d.key, d])) as Record<
  TrachDomain,
  DomainMeta
>;

/** Propuesta inicial de checklist — validar contra el protocolo institucional. */
export const RESCUE_ITEMS: { key: string; label: string }[] = [
  { key: 'personal-entrenado', label: 'Personal entrenado en vía aérea disponible durante las primeras 24 h' },
  { key: 'material-reintubacion', label: 'Material de reintubación / vía aérea difícil junto a la cama' },
  { key: 'canula-reserva', label: 'Cánula de traqueostomía de reserva (mismo número y uno menor)' },
  { key: 'oxigeno-aspiracion', label: 'Oxígeno, aspiración y bolsa-válvula-máscara operativos' },
  { key: 'equipo-informado', label: 'Equipo médico responsable informado y de acuerdo' },
  { key: 'plan-escalamiento', label: 'Plan de escalamiento definido (quién decide reintubar / recolocar cánula)' },
  { key: 'horario-cobertura', label: 'Decanulación en horario con cobertura completa del equipo' },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
export function ago(iso: string | Date, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const h = Math.floor(ms / HOUR);
  if (h < 1) return `hace ${Math.max(1, Math.floor(ms / 60000))} min`;
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  const d = Math.floor(hours / 24);
  const rest = Math.round(hours - d * 24);
  return rest > 0 ? `${d} d ${rest} h` : `${d} d`;
}

function latestField<T>(records: TrachRecord[], pick: (r: TrachRecord) => T | undefined): { value: T; at: string } | undefined {
  // `records` are newest-first (as returned by getPatientTrachRecords).
  for (const r of records) {
    const value = pick(r);
    if (value !== undefined && value !== null) return { value, at: r.timestamp };
  }
  return undefined;
}

export function hoursFreeOfVmi(episode: SupportEpisode | undefined, now: Date): number | undefined {
  if (!episode || episode.supportType !== 'traqueostomia') return undefined;
  return Math.max(0, (now.getTime() - new Date(episode.startAt).getTime()) / HOUR);
}

// ---------------------------------------------------------------------------
// Aspirations → 8 h blocks over the last 24 h
// ---------------------------------------------------------------------------
export interface AspirationBlock {
  from: Date;
  to: Date;
  count: number;
}

/** Three consecutive 8 h blocks ending now, oldest first. */
export function aspirationBlocks(aspirations: TrachAspiration[], now: Date): AspirationBlock[] {
  const blockMs = REFERENCES.aspirationBlockHours * HOUR;
  const blocks: AspirationBlock[] = [];
  const n = REFERENCES.aspirationWindowHours / REFERENCES.aspirationBlockHours;
  for (let i = n - 1; i >= 0; i--) {
    const to = new Date(now.getTime() - i * blockMs);
    const from = new Date(to.getTime() - blockMs);
    const count = aspirations
      .filter((a) => {
        const t = new Date(a.timestamp).getTime();
        return t > from.getTime() && t <= to.getTime();
      })
      .reduce((sum, a) => sum + a.count, 0);
    blocks.push({ from, to, count });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Occlusion trial → derived facts
// ---------------------------------------------------------------------------
export interface OcclusionInfo {
  ongoing: boolean;
  hours: number;
  coversNight: boolean;
  controls: number;
  events: number;
  result?: TrachOcclusionTrial['result'];
}

/** Hours of [start, end] that fall inside a nightly window (local time). */
function nightOverlapHours(start: Date, end: Date): number {
  let total = 0;
  // Start one day earlier so a window that began the previous evening is counted.
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1);
  while (cursor.getTime() < end.getTime()) {
    const winStart = new Date(cursor);
    winStart.setHours(REFERENCES.nightStartHour, 0, 0, 0);
    const winEnd = new Date(cursor);
    winEnd.setDate(winEnd.getDate() + 1);
    winEnd.setHours(REFERENCES.nightEndHour, 0, 0, 0);
    const overlap = Math.min(end.getTime(), winEnd.getTime()) - Math.max(start.getTime(), winStart.getTime());
    if (overlap > 0) total += overlap;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total / HOUR;
}

export function occlusionInfo(trial: TrachOcclusionTrial, now: Date): OcclusionInfo {
  const start = new Date(trial.startedAt);
  const end = trial.endedAt ? new Date(trial.endedAt) : now;
  return {
    ongoing: !trial.endedAt,
    hours: Math.max(0, (end.getTime() - start.getTime()) / HOUR),
    coversNight: nightOverlapHours(start, end) >= REFERENCES.nightMinOverlapHours,
    controls: trial.entries.filter((e) => e.kind === 'control').length,
    events: trial.entries.filter((e) => e.kind === 'evento').length,
    result: trial.result,
  };
}

// ---------------------------------------------------------------------------
// Observed data → reference comparison, per domain
// ---------------------------------------------------------------------------
export interface TrachContext {
  now: Date;
  /** Episodio activo de tipo traqueostomía (si lo hay). */
  episode?: SupportEpisode;
  /** Registros de estado, del más nuevo al más viejo. */
  records: TrachRecord[];
  overview: TrachOverview | null;
}

export type ReferenceCheck = 'dentro' | 'fuera' | 'parcial' | 'sin-dato';

export interface ObservedFact {
  label: string;
  value: string;
  /** Cuándo se registró (texto corto), si aplica. */
  when?: string;
}

/** Qué puede registrar ahora el profesional para completar este dominio. */
export type DomainAction = 'update-state' | 'log-aspiration' | 'occlusion' | 'rescue';

export interface DomainObservation {
  facts: ObservedFact[];
  check: ReferenceCheck;
  checkText: string;
  action?: { kind: DomainAction; label: string };
}

export const CHECK_META: Record<ReferenceCheck, { label: string; className: string }> = {
  dentro: { label: 'Dentro de la referencia', className: 'text-green-700' },
  fuera: { label: 'Fuera de la referencia', className: 'text-red-700' },
  parcial: { label: 'Referencia parcialmente cubierta', className: 'text-amber-700' },
  'sin-dato': { label: 'Sin dato para comparar', className: 'text-gray-500' },
};

export function observeDomain(domain: TrachDomain, ctx: TrachContext): DomainObservation {
  const { now, records, overview, episode } = ctx;
  const process = overview?.activeProcess ?? null;

  switch (domain) {
    case 'estabilidad': {
      const hours = hoursFreeOfVmi(episode, now);
      const glasgow = latestField(records, (r) => r.glasgow);
      const support = latestField(records, (r) => r.ventilatorySupport);
      const facts: ObservedFact[] = [];
      if (hours !== undefined) facts.push({ label: 'Libre de VMI', value: formatHours(hours) });
      if (glasgow) facts.push({ label: 'Glasgow', value: String(glasgow.value), when: ago(glasgow.at, now) });
      if (support) facts.push({ label: 'Soporte actual', value: ventilatorySupportLabels[support.value], when: ago(support.at, now) });
      if (hours === undefined) {
        return { facts, check: 'sin-dato', checkText: 'No hay un episodio de traqueostomía activo para calcular las horas libres de VMI.' };
      }
      return hours > REFERENCES.vmiFreeHours
        ? { facts, check: 'dentro', checkText: `${formatHours(hours)} libres de VMI (referencia > ${REFERENCES.vmiFreeHours} h).` }
        : { facts, check: 'fuera', checkText: `${formatHours(hours)} libres de VMI; la referencia es > ${REFERENCES.vmiFreeHours} h.` };
    }

    case 'via-aerea-superior': {
      const cuff = latestField(records, (r) => (r.cuffDeflationPerformed ? (r.cuffDeflationTolerated ? 'tolerada' : 'no-tolerada') : undefined));
      const cuffNow = latestField(records, (r) => r.cuffStatus);
      const facts: ObservedFact[] = [];
      if (cuff) facts.push({ label: 'Balón desinflado', value: cuff.value === 'tolerada' ? 'Tolerado' : 'No tolerado', when: ago(cuff.at, now) });
      if (cuffNow) facts.push({ label: 'Neumotaponamiento actual', value: cuffStatusLabels[cuffNow.value], when: ago(cuffNow.at, now) });
      if (!cuff) {
        return {
          facts,
          check: 'sin-dato',
          checkText: 'Todavía no hay prueba de balón desinflado registrada.',
          action: { kind: 'update-state', label: 'Registrar prueba de balón desinflado' },
        };
      }
      return cuff.value === 'tolerada'
        ? { facts, check: 'dentro', checkText: 'Última prueba de balón desinflado tolerada.' }
        : { facts, check: 'fuera', checkText: 'Última prueba de balón desinflado no tolerada.' };
    }

    case 'secreciones': {
      const blocks = aspirationBlocks(overview?.aspirations ?? [], now);
      const total = blocks.reduce((s, b) => s + b.count, 0);
      const amount = latestField(records, (r) => r.secretionAmount);
      const character = latestField(records, (r) => r.secretionCharacter);
      const facts: ObservedFact[] = [
        {
          label: 'Aspiraciones por bloque de 8 h',
          value: blocks.map((b) => b.count).join(' · '),
          when: 'últimas 24 h, del más antiguo al más reciente',
        },
      ];
      if (amount) {
        const text = `${secretionAmountLabels[amount.value]}${character ? `, ${secretionCharacterLabels[character.value]}` : ''}`;
        facts.push({ label: 'Secreciones (último estado)', value: text, when: ago(amount.at, now) });
      }
      const action = { kind: 'log-aspiration' as const, label: 'Registrar aspiración' };
      const over = blocks.filter((b) => b.count > REFERENCES.aspirationsPerBlock);
      if (over.length > 0) {
        return {
          facts,
          check: 'fuera',
          checkText: `${over.length} de ${blocks.length} bloques superan las ${REFERENCES.aspirationsPerBlock} aspiraciones.`,
          action,
        };
      }
      // Sin ninguna aspiración registrada no se puede distinguir "no hubo" de "no se cargó".
      const recentAmount = amount && now.getTime() - new Date(amount.at).getTime() <= REFERENCES.aspirationWindowHours * HOUR;
      if (total === 0 && !recentAmount) {
        return {
          facts,
          check: 'sin-dato',
          checkText: 'No hay aspiraciones ni estado de secreciones cargados en 24 h: no se puede distinguir "ninguna" de "no registrada".',
          action,
        };
      }
      const evidence: number[] = [];
      if (process) evidence.push(new Date(process.startedAt).getTime());
      for (const a of overview?.aspirations ?? []) evidence.push(new Date(a.timestamp).getTime());
      if (recentAmount && amount) evidence.push(new Date(amount.at).getTime());
      const coverageHours = evidence.length ? (now.getTime() - Math.min(...evidence)) / HOUR : 0;
      if (coverageHours < REFERENCES.aspirationWindowHours) {
        return {
          facts,
          check: 'parcial',
          checkText: `Cumple hasta ahora, pero solo hay ${formatHours(coverageHours)} de seguimiento de las ${REFERENCES.aspirationWindowHours} h.`,
          action,
        };
      }
      return { facts, check: 'dentro', checkText: `Ningún bloque supera las ${REFERENCES.aspirationsPerBlock} aspiraciones.`, action };
    }

    case 'pemax': {
      const pemax = latestField(records, (r) => r.pemax);
      if (!pemax) {
        return {
          facts: [],
          check: 'sin-dato',
          checkText: 'Todavía no hay Pemáx registrada.',
          action: { kind: 'update-state', label: 'Registrar Pemáx' },
        };
      }
      const facts = [{ label: 'Pemáx', value: `${pemax.value} cmH₂O`, when: ago(pemax.at, now) }];
      return pemax.value >= REFERENCES.pemaxMin
        ? { facts, check: 'dentro', checkText: `Pemáx ${pemax.value} (referencia favorable ≥ ${REFERENCES.pemaxMin}).` }
        : { facts, check: 'fuera', checkText: `Pemáx ${pemax.value}; la referencia favorable es ≥ ${REFERENCES.pemaxMin}.` };
    }

    case 'proteccion': {
      const glasgow = latestField(records, (r) => r.glasgow);
      const swallow = latestField(records, (r) => r.swallowingTest);
      const blue = latestField(records, (r) => r.blueTest);
      const facts: ObservedFact[] = [];
      if (glasgow) facts.push({ label: 'Glasgow', value: String(glasgow.value), when: ago(glasgow.at, now) });
      if (swallow) facts.push({ label: 'Deglución', value: swallowingLabels[swallow.value] ?? swallow.value, when: ago(swallow.at, now) });
      if (blue) facts.push({ label: 'Blue test', value: blue.value === 'negativo' ? 'Negativo' : 'Positivo', when: ago(blue.at, now) });
      const action = { kind: 'update-state' as const, label: 'Registrar Glasgow / deglución / blue test' };
      if (facts.length === 0) return { facts, check: 'sin-dato', checkText: 'Todavía no hay datos de protección de vía aérea.', action };
      const unfavourable: string[] = [];
      if (glasgow && glasgow.value < REFERENCES.glasgowMin) unfavourable.push('Glasgow');
      if (swallow && swallow.value !== 'apta') unfavourable.push('deglución');
      if (blue && blue.value === 'positivo') unfavourable.push('blue test');
      if (unfavourable.length > 0) {
        return { facts, check: 'fuera', checkText: `Fuera de la referencia: ${unfavourable.join(', ')}.`, action };
      }
      if (facts.length < 3) {
        const missing = [!glasgow && 'Glasgow', !swallow && 'deglución', !blue && 'blue test'].filter(Boolean).join(', ');
        return { facts, check: 'parcial', checkText: `Lo cargado está dentro de la referencia; falta: ${missing}.`, action };
      }
      return { facts, check: 'dentro', checkText: 'Glasgow, deglución y blue test dentro de la referencia.' };
    }

    case 'oclusion': {
      const trials = process?.occlusionTrials ?? [];
      const action = { kind: 'occlusion' as const, label: trials.some((t) => !t.endedAt) ? 'Abrir prueba en curso' : 'Iniciar prueba de oclusión' };
      const active = trials.find((t) => !t.endedAt);
      const lastDone = [...trials].reverse().find((t) => t.endedAt);
      const shown = active ?? lastDone;
      if (!shown) return { facts: [], check: 'sin-dato', checkText: 'Todavía no hay prueba de oclusión registrada.', action };
      const info = occlusionInfo(shown, now);
      const facts: ObservedFact[] = [
        { label: info.ongoing ? 'En curso desde hace' : 'Duración', value: formatHours(info.hours) },
        { label: 'Incluye período nocturno', value: info.coversNight ? 'Sí' : 'No' },
        { label: 'Controles / eventos', value: `${info.controls} / ${info.events}` },
      ];
      if (info.result) {
        facts.push({ label: 'Resultado', value: { tolerada: 'Tolerada', 'no-tolerada': 'No tolerada', interrumpida: 'Interrumpida' }[info.result] });
      }
      if (info.ongoing) {
        return { facts, check: 'parcial', checkText: `En curso: ${formatHours(info.hours)} de ${REFERENCES.occlusionMinHours} h de referencia.`, action };
      }
      const meets = info.result === 'tolerada' && info.hours >= REFERENCES.occlusionMinHours && info.coversNight;
      return meets
        ? { facts, check: 'dentro', checkText: `Prueba tolerada de ${formatHours(info.hours)}, incluyendo período nocturno.`, action }
        : {
            facts,
            check: 'fuera',
            checkText: 'La última prueba no alcanzó la referencia (tolerada, ≥ 24 h e incluyendo período nocturno).',
            action,
          };
    }

    case 'rescate': {
      const checklist = process?.rescueChecklist ?? {};
      const done = RESCUE_ITEMS.filter((i) => checklist[i.key]?.checked).length;
      const facts: ObservedFact[] = [{ label: 'Ítems confirmados', value: `${done} de ${RESCUE_ITEMS.length}` }];
      const action = { kind: 'rescue' as const, label: 'Abrir checklist de rescate' };
      if (done === 0) return { facts, check: 'sin-dato', checkText: 'Checklist de rescate sin completar.', action };
      if (done < RESCUE_ITEMS.length) return { facts, check: 'parcial', checkText: `Faltan ${RESCUE_ITEMS.length - done} ítems del checklist.`, action };
      return { facts, check: 'dentro', checkText: 'Checklist de rescate completo.', action };
    }
  }
}

// ---------------------------------------------------------------------------
// Process-level summaries
// ---------------------------------------------------------------------------
/** Latest professional interpretation per domain (undefined = nunca evaluado → "pendiente"). */
export function currentAssessments(process: TrachDecannulationProcess | null | undefined): Partial<Record<TrachDomain, TrachDomainAssessment>> {
  const out: Partial<Record<TrachDomain, TrachDomainAssessment>> = {};
  if (!process) return out;
  for (const a of process.assessments) {
    const prev = out[a.domain];
    if (!prev || new Date(a.assessedAt) >= new Date(prev.assessedAt)) out[a.domain] = a;
  }
  return out;
}

export function statusOf(process: TrachDecannulationProcess | null | undefined, domain: TrachDomain): TrachDomainStatus {
  return currentAssessments(process)[domain]?.status ?? 'pendiente';
}

export function statusCounts(process: TrachDecannulationProcess | null | undefined): Record<TrachDomainStatus, number> {
  const counts: Record<TrachDomainStatus, number> = { pendiente: 0, favorable: 0, condicionado: 0, desfavorable: 0, 'no-evaluable': 0 };
  for (const d of DOMAINS) counts[statusOf(process, d.key)] += 1;
  return counts;
}

/**
 * Decides when the rescue checklist is surfaced by default. The professional
 * can always open it manually; this only controls when it shows up on its own.
 */
export function isNearDecannulation(process: TrachDecannulationProcess | null | undefined, ctx: TrachContext): boolean {
  if (!process) return false;
  if (statusOf(process, 'oclusion') === 'favorable') return true;
  const active = process.occlusionTrials.find((t) => !t.endedAt);
  if (active && occlusionInfo(active, ctx.now).hours >= REFERENCES.nearOcclusionHours) return true;
  const earlier = DOMAINS.filter((d) => d.key !== 'rescate' && d.key !== 'oclusion');
  const favorable = earlier.filter((d) => statusOf(process, d.key) === 'favorable').length;
  const anyUnfavourable = DOMAINS.some((d) => statusOf(process, d.key) === 'desfavorable');
  return favorable >= REFERENCES.nearFavorableDomains && !anyUnfavourable;
}

export interface MissingItem {
  domain: TrachDomain;
  text: string;
  action?: DomainAction;
}

/** "Qué falta": dominios sin interpretación y datos que el sistema no encuentra. */
export function missingItems(process: TrachDecannulationProcess | null | undefined, ctx: TrachContext, includeRescue: boolean): MissingItem[] {
  if (!process) return [];
  const out: MissingItem[] = [];
  for (const d of DOMAINS) {
    if (d.key === 'rescate' && !includeRescue) continue;
    const obs = observeDomain(d.key, ctx);
    const status = statusOf(process, d.key);
    if (obs.check === 'sin-dato') {
      out.push({ domain: d.key, text: `${d.label}: ${obs.checkText}`, action: obs.action?.kind });
    } else if (status === 'pendiente') {
      out.push({ domain: d.key, text: `${d.label}: hay datos, falta tu interpretación.` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Text for the handoff notes
// ---------------------------------------------------------------------------
export function describeStatusOneLine(process: TrachDecannulationProcess, now: Date): string {
  const parts: string[] = [];
  const days = Math.max(0, Math.floor((now.getTime() - new Date(process.startedAt).getTime()) / (24 * HOUR)));
  parts.push(`Proceso de decanulación en curso (día ${days + 1}).`);
  const byStatus = new Map<TrachDomainStatus, string[]>();
  for (const d of DOMAINS) {
    const status = statusOf(process, d.key);
    byStatus.set(status, [...(byStatus.get(status) ?? []), d.prose]);
  }
  const phrase = (status: TrachDomainStatus, prefix: string) => {
    const list = byStatus.get(status);
    if (list && list.length > 0) parts.push(`${prefix}: ${list.join(', ')}.`);
  };
  phrase('favorable', 'Favorables');
  phrase('condicionado', 'Condicionados');
  phrase('desfavorable', 'Desfavorables');
  phrase('no-evaluable', 'No evaluables');
  phrase('pendiente', 'Pendientes');
  const active = process.occlusionTrials.find((t) => !t.endedAt);
  if (active) {
    const info = occlusionInfo(active, now);
    parts.push(`Prueba de oclusión en curso hace ${formatHours(info.hours)}${info.events > 0 ? `, con ${info.events} evento${info.events > 1 ? 's' : ''} registrado${info.events > 1 ? 's' : ''}` : ''}.`);
  }
  return parts.join(' ');
}
