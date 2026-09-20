import { apiFetch } from './client';
import type {
  TrachAspiration,
  TrachDecannulationProcess,
  TrachDomain,
  TrachDomainStatus,
  TrachOcclusionEventType,
  TrachOcclusionResult,
  TrachOverview,
} from '../types';

export function getTrachOverview(patientIds: string[]) {
  const qs = new URLSearchParams({ patientIds: patientIds.join(',') });
  return apiFetch<Record<string, TrachOverview>>(`/api/trach/overview?${qs.toString()}`);
}

export function logAspiration(input: {
  patientId: string;
  episodeId?: string;
  count?: number;
  secretionAmount?: 'escasa' | 'moderada' | 'abundante';
  timestamp?: string;
}) {
  return apiFetch<TrachAspiration>('/api/trach/aspirations', { method: 'POST', body: JSON.stringify(input) });
}

export function deleteAspiration(id: string) {
  return apiFetch<void>(`/api/trach/aspirations/${id}`, { method: 'DELETE' });
}

export function startProcess(input: { patientId: string; episodeId?: string }) {
  return apiFetch<TrachDecannulationProcess>('/api/trach/processes', { method: 'POST', body: JSON.stringify(input) });
}

export function updateRescueChecklist(processId: string, rescueChecklist: Record<string, boolean>) {
  return apiFetch<TrachDecannulationProcess>(`/api/trach/processes/${processId}`, {
    method: 'PATCH',
    body: JSON.stringify({ rescueChecklist }),
  });
}

export function endProcess(processId: string, end: { outcome: 'decanulado' | 'suspendido'; notes?: string }) {
  return apiFetch<TrachDecannulationProcess>(`/api/trach/processes/${processId}`, {
    method: 'PATCH',
    body: JSON.stringify({ end }),
  });
}

export function assessDomain(
  processId: string,
  input: { domain: TrachDomain; status: TrachDomainStatus; notes?: string; observed?: Record<string, unknown> }
) {
  return apiFetch<TrachDecannulationProcess>(`/api/trach/processes/${processId}/assessments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function startOcclusionTrial(processId: string, startedAt?: string) {
  return apiFetch<TrachDecannulationProcess>(`/api/trach/processes/${processId}/occlusion-trials`, {
    method: 'POST',
    body: JSON.stringify({ startedAt }),
  });
}

export function addOcclusionEntry(
  trialId: string,
  input: {
    kind: 'control' | 'evento';
    spo2?: number;
    respiratoryRate?: number;
    heartRate?: number;
    eventType?: TrachOcclusionEventType;
    notes?: string;
  }
) {
  return apiFetch<TrachDecannulationProcess>(`/api/trach/occlusion-trials/${trialId}/entries`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function endOcclusionTrial(trialId: string, input: { result: TrachOcclusionResult; notes?: string }) {
  return apiFetch<TrachDecannulationProcess>(`/api/trach/occlusion-trials/${trialId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
