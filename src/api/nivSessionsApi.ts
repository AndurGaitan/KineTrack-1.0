import { apiFetch } from './client';
import type { NIVSession } from '../types';

export type CreateNivSessionInput = {
  patientId: string;
  episodeId?: string;
  startAt?: string;
  endAt?: string;
  notes?: string;
};

export type UpdateNivSessionInput = Partial<{
  startAt: string;
  endAt: string;
  notes: string;
}>;

export function listNivSessions(params: { patientId: string; episodeId?: string }) {
  const qs = new URLSearchParams();
  qs.set('patientId', params.patientId);
  if (params.episodeId) qs.set('episodeId', params.episodeId);
  return apiFetch<NIVSession[]>(`/api/niv-sessions?${qs.toString()}`);
}

export function createNivSession(input: CreateNivSessionInput) {
  return apiFetch<NIVSession>('/api/niv-sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateNivSession(id: string, input: UpdateNivSessionInput) {
  return apiFetch<NIVSession>(`/api/niv-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteNivSession(id: string) {
  return apiFetch<void>(`/api/niv-sessions/${id}`, { method: 'DELETE' });
}
