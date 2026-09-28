import { apiFetch } from './client';
import type { ScoreRecord, ScoreType } from '../types';

export type CreateScoreInput = {
  type: ScoreType;
  patientId: string;
  episodeId?: string;
  inputs: Record<string, number>;
};

export function createScore(input: CreateScoreInput) {
  return apiFetch<ScoreRecord>('/api/scores', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Un solo paciente (string) o varios en una sola solicitud ({ patientIds }). */
export function listScores(target: string | { patientIds: string[] }) {
  if (typeof target === 'string') {
    return apiFetch<ScoreRecord[]>(`/api/scores?patientId=${encodeURIComponent(target)}`);
  }
  const qs = new URLSearchParams({ patientIds: target.patientIds.join(',') });
  return apiFetch<ScoreRecord[]>(`/api/scores?${qs.toString()}`);
}
