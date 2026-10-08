import { apiFetch } from './client';
import type { SVInterruptionReason, SVModality, SpontaneousVentilationPeriod } from '../types';

export type CreateSVPeriodInput = {
  patientId: string;
  episodeId?: string;
  startAt?: string;
  endAt?: string;
  modality: SVModality;
  tolerated?: boolean;
  interruptionReason?: SVInterruptionReason;
  notes?: string;
};

export type UpdateSVPeriodInput = Partial<{
  startAt: string;
  endAt: string;
  modality: SVModality;
  tolerated: boolean;
  interruptionReason: SVInterruptionReason;
  notes: string;
}>;

export function listSVPeriods(params: { patientId?: string; patientIds?: string[] }) {
  const qs = new URLSearchParams();
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.patientIds) qs.set('patientIds', params.patientIds.join(','));
  return apiFetch<SpontaneousVentilationPeriod[]>(`/api/spontaneous-ventilation?${qs.toString()}`);
}

export function createSVPeriod(input: CreateSVPeriodInput) {
  return apiFetch<SpontaneousVentilationPeriod>('/api/spontaneous-ventilation', { method: 'POST', body: JSON.stringify(input) });
}

export function updateSVPeriod(id: string, input: UpdateSVPeriodInput) {
  return apiFetch<SpontaneousVentilationPeriod>(`/api/spontaneous-ventilation/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSVPeriod(id: string) {
  return apiFetch<void>(`/api/spontaneous-ventilation/${id}`, { method: 'DELETE' });
}
