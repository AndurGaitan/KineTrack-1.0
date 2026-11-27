import { apiFetch } from './client';
import type { GcsAssessment, GcsFactor, GcsValue } from '../types';

export type CreateGcsInput = {
  patientId: string;
  assessedAt?: string;
  eye: GcsValue;
  verbal: GcsValue;
  motor: GcsValue;
  eyeNtReason?: string;
  verbalNtReason?: string;
  motorNtReason?: string;
  interferingFactors: GcsFactor[];
  notes?: string;
};

export function createGcsAssessment(input: CreateGcsInput) {
  return apiFetch<GcsAssessment>('/api/gcs-assessments', { method: 'POST', body: JSON.stringify(input) });
}

/** Por paciente (historial) o por período, del más nuevo al más viejo. */
export function listGcsAssessments(query: { patientId?: string; from?: string; to?: string }) {
  const params = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => !!e[1]));
  return apiFetch<GcsAssessment[]>(`/api/gcs-assessments?${params}`);
}
