import { apiFetch } from './client';
import type { AirwayEvent } from '../types';

export function listAirwayEvents(params: { patientIds?: string[]; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params.patientIds && params.patientIds.length > 0) qs.set('patientIds', params.patientIds.join(','));
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<AirwayEvent[]>(`/api/airway-events${suffix}`);
}
