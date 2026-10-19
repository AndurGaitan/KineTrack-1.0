import { apiFetch } from './client';
import type { PveDecision, PveDecisionKind, PveSbtType } from '../types';

export type CreatePveDecisionInput = {
  patientId: string;
  timestamp?: string;
  decision: PveDecisionKind;
  reason?: string;
  sbtType?: PveSbtType;
  sbtResult?: 'success' | 'failure';
  failureReason?: string;
  notes?: string;
};

export function listPveDecisions(params: {
  patientId?: string;
  /** Varios pacientes en una sola solicitud — usar patientId o patientIds, no ambos. */
  patientIds?: string[];
}) {
  const qs = new URLSearchParams();
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.patientIds) qs.set('patientIds', params.patientIds.join(','));
  return apiFetch<PveDecision[]>(`/api/pve-decisions?${qs.toString()}`);
}

export function createPveDecision(input: CreatePveDecisionInput) {
  return apiFetch<PveDecision>('/api/pve-decisions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deletePveDecision(id: string) {
  return apiFetch<void>(`/api/pve-decisions/${id}`, { method: 'DELETE' });
}
