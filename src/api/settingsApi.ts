import { apiFetch } from './client';
import type { AppStage } from '../types';

export function getSettings() {
  return apiFetch<{ stage: AppStage }>('/api/settings');
}

export function updateStage(stage: AppStage) {
  return apiFetch<{ stage: AppStage }>('/api/settings/stage', {
    method: 'PUT',
    body: JSON.stringify({ stage }),
  });
}
