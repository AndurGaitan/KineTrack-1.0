import { apiFetch } from './client';
import type { ClinicalObservationType } from '../domain/models';
import type { TrachRecord } from '../types';

type AnyObservation = ClinicalObservationType | TrachRecord;
type ObservationType = 'imv' | 'niv' | 'hfnc' | 'traqueostomia';

export type CreateObservationInput = { type: ObservationType; patientId: string; episodeId?: string } & Record<
  string,
  unknown
>;

export function createObservation(input: CreateObservationInput) {
  return apiFetch<AnyObservation>('/api/observations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listObservations(params: { patientId: string; episodeId?: string; type?: ObservationType }) {
  const qs = new URLSearchParams();
  qs.set('patientId', params.patientId);
  if (params.episodeId) qs.set('episodeId', params.episodeId);
  if (params.type) qs.set('type', params.type);
  return apiFetch<AnyObservation[]>(`/api/observations?${qs.toString()}`);
}

export function getObservation(type: ObservationType, id: string) {
  return apiFetch<AnyObservation>(`/api/observations/${type}/${id}`);
}
