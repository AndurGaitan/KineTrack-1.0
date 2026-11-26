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

export function listGcsAssessments(patientId: string) {
  return apiFetch<GcsAssessment[]>(`/api/gcs-assessments?patientId=${encodeURIComponent(patientId)}`);
}
