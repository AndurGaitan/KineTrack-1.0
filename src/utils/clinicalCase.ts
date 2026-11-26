import type { PveDecision, VMIRecord } from '../types';
import { pveFailureInfo, pveReasonLabel } from '../components/PveDecisionForm';

/**
 * Retrospectiva de un caso de VMI: pasa los registros de monitorización a una serie con "día de VMI",
 * detecta los cambios de estrategia ventilatoria entre registros consecutivos y mira cómo estaban la
 * gasometría y la mecánica antes y después. Es descriptivo: un cambio y una variación cercanos en el tiempo
 * no prueban causalidad, y el texto de la pantalla lo aclara.
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Cambios que se consideran una decisión (los más chicos son ruido de carga). */
export const PEEP_CHANGE_MIN = 2; // cmH₂O
export const FIO2_CHANGE_MIN = 10; // puntos de %
export const VT_CHANGE_MIN = 1; // ml/kg de peso predicho
/** Solo se compara un valor "antes" o "después" si está a esta distancia del cambio. */
export const IMPACT_WINDOW_HOURS = 72;

export const ventModeLabels: Record<string, string> = {
  VC: 'VCV',
  PC: 'PCV',
  PRVC: 'PRVC',
  PSV: 'PSV',
  'SIMV-VC': 'SIMV-VC',
  'SIMV-PC': 'SIMV-PC',
};

export interface CasePoint {
  /** Instante del registro (ms). */
  t: number;
  iso: string;
  /** Día de VMI, el primero es 1. */
  day: number;
  mode: string;
  peep: number;
  fio2: number;
  vtPerKg?: number;
  ph?: number;
  paco2?: number;
  pfRatio?: number;
  pplat?: number;
  driving?: number;
  compliance?: number;
  mechanicalPower?: number;
  rass?: number;
}

const positive = (n: number | null | undefined): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);

/** Registros en orden cronológico, con el día de VMI contado desde `startMs`. Los ceros de "no cargado" pasan a vacío. */
export function buildCasePoints(records: VMIRecord[], startMs?: number): CasePoint[] {
  const chrono = records.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (chrono.length === 0) return [];
  const t0 = startMs ?? new Date(chrono[0].timestamp).getTime();
  return chrono.map((r) => {
    const t = new Date(r.timestamp).getTime();
    return {
      t,
      iso: r.timestamp,
      day: Math.max(1, Math.floor((t - t0) / DAY_MS) + 1),
      mode: r.ventMode,
      peep: r.peep,
      fio2: r.fio2,
      vtPerKg: positive(r.vtPerKg),
      ph: positive(r.ph),
      paco2: positive(r.paco2),
      pfRatio: positive(r.pfRatio),
      pplat: positive(r.plateauPressure),
      driving: positive(r.drivingPressure),
      compliance: positive(r.compliance),
      mechanicalPower: positive(r.mechanicalPower),
      rass: typeof r.rass === 'number' ? r.rass : undefined,
    };
  });
}

export type ImpactKey = 'pfRatio' | 'ph' | 'paco2' | 'pplat' | 'driving' | 'compliance';

export const impactLabels: Record<ImpactKey, { label: string; unit: string; decimals: number }> = {
  pfRatio: { label: 'PaFi', unit: '', decimals: 0 },
  ph: { label: 'pH', unit: '', decimals: 2 },
  paco2: { label: 'PaCO₂', unit: 'mmHg', decimals: 0 },
  pplat: { label: 'Pplat', unit: 'cmH₂O', decimals: 0 },
  driving: { label: 'ΔP', unit: 'cmH₂O', decimals: 0 },
  compliance: { label: 'Compliance', unit: 'ml/cmH₂O', decimals: 0 },
};

const impactKeys = Object.keys(impactLabels) as ImpactKey[];

export interface DecisionChange {
  kind: 'modo' | 'peep' | 'fio2' | 'vt';
  label: string;
  from: string;
  to: string;
}

export interface ImpactValue {
  key: ImpactKey;
  before: number;
  after: number;
}

export interface VentilatoryDecision {
  /** Número de la decisión (1, 2, …): es el que se marca en los gráficos. */
  n: number;
  t: number;
  iso: string;
  day: number;
  changes: DecisionChange[];
  /** Variables con valor antes y después del cambio, dentro de la ventana. */
  impact: ImpactValue[];
}

const fmt = (n: number, decimals = 0) => n.toFixed(decimals).replace('.', ',');

function detectChanges(prev: CasePoint, cur: CasePoint): DecisionChange[] {
  const changes: DecisionChange[] = [];
  if (prev.mode !== cur.mode) {
    changes.push({ kind: 'modo', label: 'Modo', from: ventModeLabels[prev.mode] ?? prev.mode, to: ventModeLabels[cur.mode] ?? cur.mode });
  }
  if (Math.abs(cur.peep - prev.peep) >= PEEP_CHANGE_MIN) {
    changes.push({ kind: 'peep', label: 'PEEP', from: `${fmt(prev.peep)}`, to: `${fmt(cur.peep)} cmH₂O` });
  }
  if (Math.abs(cur.fio2 - prev.fio2) >= FIO2_CHANGE_MIN) {
    changes.push({ kind: 'fio2', label: 'FiO₂', from: `${fmt(prev.fio2)}`, to: `${fmt(cur.fio2)} %` });
  }
  if (prev.vtPerKg != null && cur.vtPerKg != null && Math.abs(cur.vtPerKg - prev.vtPerKg) >= VT_CHANGE_MIN) {
    changes.push({ kind: 'vt', label: 'Vt/kg', from: `${fmt(prev.vtPerKg, 1)}`, to: `${fmt(cur.vtPerKg, 1)} ml/kg` });
  }
  return changes;
}

/**
 * Cambios de estrategia entre cada registro y el anterior. "Antes" es el último valor cargado hasta el registro
 * previo al cambio; "después", el primer valor cargado a partir del registro siguiente al cambio. Se descarta
 * un valor si está a más de IMPACT_WINDOW_HOURS del cambio.
 */
export function detectVentilatoryDecisions(points: CasePoint[]): VentilatoryDecision[] {
  const out: VentilatoryDecision[] = [];
  for (let i = 1; i < points.length; i++) {
    const changes = detectChanges(points[i - 1], points[i]);
    if (changes.length === 0) continue;
    const at = points[i].t;
    const impact: ImpactValue[] = [];
    for (const key of impactKeys) {
      let before: number | undefined;
      for (let j = i - 1; j >= 0; j--) {
        if (at - points[j].t > IMPACT_WINDOW_HOURS * HOUR_MS) break;
        const v = points[j][key];
        if (v != null) {
          before = v;
          break;
        }
      }
      let after: number | undefined;
      for (let j = i + 1; j < points.length; j++) {
        if (points[j].t - at > IMPACT_WINDOW_HOURS * HOUR_MS) break;
        const v = points[j][key];
        if (v != null) {
          after = v;
          break;
        }
      }
      if (before != null && after != null) impact.push({ key, before, after });
    }
    out.push({ n: out.length + 1, t: at, iso: points[i].iso, day: points[i].day, changes, impact });
  }
  return out;
}

export function formatImpact(value: number, key: ImpactKey): string {
  return fmt(value, impactLabels[key].decimals);
}

export interface CaseSummary {
  records: number;
  withGasometry: number;
  withMechanics: number;
  days: number;
  peep?: [number, number];
  fio2?: [number, number];
  ph?: [number, number];
  pfRatio?: [number, number];
  modes: string[];
}

function range(values: (number | undefined)[]): [number, number] | undefined {
  const v = values.filter((x): x is number => x != null);
  return v.length > 0 ? [Math.min(...v), Math.max(...v)] : undefined;
}

export function summarizeCase(points: CasePoint[]): CaseSummary {
  return {
    records: points.length,
    withGasometry: points.filter((p) => p.ph != null && p.pfRatio != null).length,
    withMechanics: points.filter((p) => p.pplat != null && p.driving != null).length,
    days: points.length > 0 ? points[points.length - 1].day : 0,
    peep: range(points.map((p) => p.peep)),
    fio2: range(points.map((p) => p.fio2)),
    ph: range(points.map((p) => p.ph)),
    pfRatio: range(points.map((p) => p.pfRatio)),
    modes: [...new Set(points.map((p) => ventModeLabels[p.mode] ?? p.mode))],
  };
}

export interface CaseEvent {
  t: number;
  iso: string;
  day: number;
  text: string;
}

const dayOf = (t: number, startMs: number) => Math.max(1, Math.floor((t - startMs) / DAY_MS) + 1);

/** Decisiones de PVE como eventos de la línea de tiempo del caso. */
export function pveEvents(decisions: PveDecision[], startMs: number): CaseEvent[] {
  const sbt: Record<string, string> = { psv: 'PSV', cpap: 'CPAP', 't-piece': 'tubo en T' };
  return decisions
    .map((d) => {
      const t = new Date(d.timestamp).getTime();
      let text: string;
      if (d.decision === 'realizada') {
        const how = d.sbtType ? ` (${sbt[d.sbtType] ?? d.sbtType})` : '';
        const { criteria, cause } = pveFailureInfo(d);
        const why = [...criteria.map((c) => c.short), cause ? `causa ${cause}` : undefined, d.failureReason].filter(Boolean).join(', ');
        const result = d.sbtResult === 'success' ? ': exitosa' : d.sbtResult === 'failure' ? `: fallida${why ? ` (${why})` : ''}` : '';
        const duration = d.durationMinutes ? `, ${d.durationMinutes} min` : '';
        text = `PVE realizada${how}${duration}${result}`;
      } else if (d.decision === 'contraindicada') {
        const reason = pveReasonLabel(d.decision, d.reason);
        text = `PVE: no cumple criterios${reason ? ` (${reason})` : ''}`;
      } else {
        text = `PVE: cumple criterios y no se realizó${d.reason ? ` (${d.reason})` : ''}`;
      }
      return { t, iso: d.timestamp, day: dayOf(t, startMs), text };
    })
    .sort((a, b) => a.t - b.t);
}
