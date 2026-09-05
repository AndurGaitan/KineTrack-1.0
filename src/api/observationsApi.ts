import { apiFetch } from './client';
import type { ClinicalObservationType } from '../domain/models';

export type CreateObservationInput = { type: 'imv' | 'niv' | 'hfnc'; patientId: string; episodeId?: string } & Record<
  string,
  unknown
>;

export function createObservation(input: CreateObservationInput) {
  return apiFetch<ClinicalObservationType>('/api/observations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listObservations(params: { patientId: string; episodeId?: string; type?: 'imv' | 'niv' | 'hfnc' }) {
  const qs = new URLSearchParams();
  qs.set('patientId', params.patientId);
  if (params.episodeId) qs.set('episodeId', params.episodeId);
  if (params.type) qs.set('type', params.type);
  return apiFetch<ClinicalObservationType[]>(`/api/observations?${qs.toString()}`);
}

export function getObservation(type: 'imv' | 'niv' | 'hfnc', id: string) {
  return apiFetch<ClinicalObservationType>(`/api/observations/${type}/${id}`);
}
