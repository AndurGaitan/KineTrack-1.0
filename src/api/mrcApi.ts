import { apiFetch } from './client';
import type { MrcAssessment, MrcScores, MrcStatus } from '../types';

export function createMrcAssessment(
  input: { patientId: string; episodeId?: string; assessedAt?: string; status: MrcStatus; daucicConfirmed?: boolean; notes?: string } & MrcScores
) {
  return apiFetch<MrcAssessment>('/api/mrc-assessments', { method: 'POST', body: JSON.stringify(input) });
}

export function listMrcAssessments(patientId?: string) {
  const suffix = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  return apiFetch<MrcAssessment[]>(`/api/mrc-assessments${suffix}`);
}
