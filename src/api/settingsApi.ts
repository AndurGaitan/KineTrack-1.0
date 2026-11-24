import { apiFetch } from './client';
import type { AppStage } from '../types';

export function getSettings() {
  return apiFetch<{ stage: AppStage; qualityIndicatorsV2?: boolean }>('/api/settings');
}

export function updateStage(stage: AppStage) {
  return apiFetch<{ stage: AppStage }>('/api/settings/stage', {
    method: 'PUT',
    body: JSON.stringify({ stage }),
  });
}

/** Enciende o apaga la fase v2 de los indicadores de calidad (solo coordinador). */
export function setQualityIndicatorsV2(enabled: boolean) {
  return apiFetch<{ qualityIndicatorsV2: boolean }>('/api/settings/quality-indicators-v2', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}
