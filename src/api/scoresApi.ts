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

export function listScores(patientId: string) {
  return apiFetch<ScoreRecord[]>(`/api/scores?patientId=${encodeURIComponent(patientId)}`);
}
