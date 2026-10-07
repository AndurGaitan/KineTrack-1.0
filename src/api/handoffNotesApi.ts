import { apiFetch } from './client';
import type { HandoffNote } from '../types';

export function createHandoffNote(input: {
  kind: 'general' | 'evolucion';
  patientId?: string;
  periodFrom: string;
  periodTo: string;
  text: string;
}) {
  return apiFetch<HandoffNote>('/api/handoff-notes', { method: 'POST', body: JSON.stringify(input) });
}

export function listHandoffNotes(params: { kind?: 'general' | 'evolucion'; patientId?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params.kind) qs.set('kind', params.kind);
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<HandoffNote[]>(`/api/handoff-notes${suffix}`);
}

export function deleteHandoffNote(id: string) {
  return apiFetch<void>(`/api/handoff-notes/${id}`, { method: 'DELETE' });
}
