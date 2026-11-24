import { apiFetch } from './client';

/** Indicadores de calidad v2 (fase 1, modo sombra). Todo detrás de la flag del servidor. */

export type PveStatus =
  | 'ELIGIBLE_PERFORMED'
  | 'ELIGIBLE_NOT_PERFORMED'
  | 'NOT_ELIGIBLE'
  | 'NOT_ASSESSED'
  | 'NOT_EVALUABLE'
  | 'INCOMPLETE_DATA';

export interface ComplianceResult {
  calculable: boolean;
  percentage: number | null;
  numerator: number;
  denominator: number;
  excluded: number;
  notAssessed: number;
  incompleteData: number;
  eligibleNotPerformed: number;
  totalPatientDays: number;
  counts: Record<PveStatus, number>;
}

export interface CompletenessResult {
  calculable: boolean;
  percentage: number | null;
  complete: number;
  total: number;
  notAssessed: number;
  incompleteData: number;
}

export interface DefinitionDTO {
  id: string;
  code: string;
  version: number;
  name: string;
  status: 'DRAFT' | 'SHADOW' | 'ACTIVE' | 'INACTIVE';
  formula: string;
  numerator: string;
  denominator: string;
  exclusions: string | null;
  targetValue: number | null;
  targetNote: string | null;
  effectiveFrom: string | null;
}

export interface ShadowSummary {
  mode: 'SHADOW';
  definition: DefinitionDTO | null;
  institution: { timezone: string; consolidationTime: string; warningTime: string };
  period: { from: string; to: string };
  compliance: ComplianceResult;
  completeness: CompletenessResult;
  byDay: { date: string; revision: number | null; provisional: boolean; compliance: ComplianceResult; completeness: CompletenessResult }[];
  notConsolidatedDays: string[];
}

export interface ShadowPatientDay {
  clinicalDate: string;
  patientId: string;
  alias: string | null;
  bed: string | null;
  status: PveStatus;
  reason: string | null;
  missingFields: string[];
  revision: number;
  assessment: { id: string; eligibilityStatus: string; assessedAt: string; shift: string; lateEntry: boolean; source: string } | null;
  performance: { id: string; performed: boolean; performedAt: string | null; method: string | null; result: string | null; shift: string; lateEntry: boolean } | null;
}

export interface PendingResponse {
  enabled: boolean;
  covered?: boolean;
  clinicalDate: string;
  warningTime: string;
  afterWarningTime: boolean;
  pending: { patientId: string; alias: string | null; bed: string | null; missing: 'ELIGIBILITY' | 'PERFORMANCE' }[];
}

const qs = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
  return q.toString();
};

export const getShadowSummary = (from: string, to: string) => apiFetch<ShadowSummary>(`/api/quality-v2/shadow/pve?${qs({ from, to })}`);
export const getShadowPatientDays = (from: string, to: string, status?: PveStatus) =>
  apiFetch<ShadowPatientDay[]>(`/api/quality-v2/shadow/pve/patient-days?${qs({ from, to, status })}`);
export const getDefinitions = () => apiFetch<DefinitionDTO[]>('/api/quality-v2/definitions');
export const updateDefinition = (code: string, body: { status?: DefinitionDTO['status']; effectiveFrom?: string | null; targetValue?: number | null; targetNote?: string | null }) =>
  apiFetch<DefinitionDTO>(`/api/quality-v2/definitions/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(body) });
export const consolidateNow = (date?: string) => apiFetch<unknown>('/api/quality-v2/consolidate', { method: 'POST', body: JSON.stringify(date ? { date } : {}) });
export const getPending = () => apiFetch<PendingResponse>('/api/quality-v2/pve/pending');

export interface AssessmentCorrection {
  reason: string;
  eligibilityStatus?: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NOT_EVALUABLE';
  notEligibleReason?: string | null;
  notEvaluableReason?: string | null;
}
export interface PerformanceCorrection {
  reason: string;
  performed?: boolean;
  performedAt?: string | null;
  method?: 'psv' | 'cpap' | 't-piece' | null;
  result?: 'success' | 'failure' | null;
  notPerformedReason?: string | null;
}
export const correctAssessment = (id: string, body: AssessmentCorrection) =>
  apiFetch<unknown>(`/api/quality-v2/pve/assessments/${id}/correct`, { method: 'POST', body: JSON.stringify(body) });
export const correctPerformance = (id: string, body: PerformanceCorrection) =>
  apiFetch<unknown>(`/api/quality-v2/pve/performances/${id}/correct`, { method: 'POST', body: JSON.stringify(body) });
