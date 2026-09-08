import { apiFetch } from './client';
import type { AirwayEventInput, ClosureReason, Patient, SupportEpisode, SupportType } from '../types';

export type CreatePatientInput = {
  alias: string;
  sectorId: string;
  bedId: string;
  supportType: SupportType;
  predictedBodyWeight?: number;
  age?: number;
  admissionDiagnosis?: string;
  antecedentes?: string[];
};

export type UpdatePatientInput = Partial<{
  alias: string;
  sectorId: string;
  bedId: string;
  predictedBodyWeight: number | null;
  age: number | null;
  admissionDiagnosis: string | null;
  antecedentes: string[];
}>;

export type ClosePatientInput = {
  reason: ClosureReason;
  date?: string;
  notes?: string;
};

export type ChangeSupportInput = {
  newSupport: SupportType;
  reason?: string;
  date?: string;
  airwayEvent?: AirwayEventInput;
};

export function listPatients(params?: { sectorId?: string; status?: 'active' | 'closed'; includeInactive?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.sectorId) qs.set('sectorId', params.sectorId);
  if (params?.status) qs.set('status', params.status);
  if (params?.includeInactive) qs.set('includeInactive', 'true');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<Patient[]>(`/api/patients${suffix}`);
}

export function createPatient(input: CreatePatientInput) {
  return apiFetch<Patient>('/api/patients', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getPatient(id: string) {
  return apiFetch<Patient>(`/api/patients/${id}`);
}

export function updatePatient(id: string, input: UpdatePatientInput) {
  return apiFetch<Patient>(`/api/patients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deletePatient(id: string) {
  return apiFetch<void>(`/api/patients/${id}`, { method: 'DELETE' });
}

export function closePatient(id: string, input: ClosePatientInput) {
  return apiFetch<Patient>(`/api/patients/${id}/close`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function changeSupportType(id: string, input: ChangeSupportInput) {
  return apiFetch<Patient>(`/api/patients/${id}/support-change`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listPatientEpisodes(id: string) {
  return apiFetch<SupportEpisode[]>(`/api/patients/${id}/episodes`);
}
