import { apiFetch } from './client';
import type { MobilizationContraindication, MobilizationStart } from '../types';

export type MobilizationData = {
  starts: MobilizationStart[];
  contraindications: MobilizationContraindication[];
};

export type CreateContraindicationInput = {
  patientId: string;
  reason: string;
  startAt?: string;
  endAt?: string;
  notes?: string;
};

export function listMobilization(params: { patientId?: string; patientIds?: string[] }) {
  const qs = new URLSearchParams();
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.patientIds) qs.set('patientIds', params.patientIds.join(','));
  return apiFetch<MobilizationData>(`/api/mobilization?${qs.toString()}`);
}

export function startMobilization(input: { patientId: string; startedAt?: string; notes?: string }) {
  return apiFetch<MobilizationStart>('/api/mobilization', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteMobilizationStart(id: string) {
  return apiFetch<void>(`/api/mobilization/${id}`, { method: 'DELETE' });
}

export function createContraindication(input: CreateContraindicationInput) {
  return apiFetch<MobilizationContraindication>('/api/mobilization/contraindications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateContraindication(id: string, input: { endAt?: string; reason?: string; startAt?: string; notes?: string }) {
  return apiFetch<MobilizationContraindication>(`/api/mobilization/contraindications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteContraindication(id: string) {
  return apiFetch<void>(`/api/mobilization/contraindications/${id}`, { method: 'DELETE' });
}
