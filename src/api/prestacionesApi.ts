import { apiFetch } from './client';
import type { OxygenDeviceType, Prestacion, PrestacionType } from '../types';

export function createPrestacion(input: {
  patientId: string;
  type: PrestacionType;
  timestamp?: string;
  durationMinutes?: number;
  notes?: string;
  oxygenDevice?: OxygenDeviceType;
  oxygenLiters?: number;
}) {
  return apiFetch<Prestacion>('/api/prestaciones', { method: 'POST', body: JSON.stringify(input) });
}

export function listPrestaciones(params?: { patientId?: string; performedByUserId?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.patientId) qs.set('patientId', params.patientId);
  if (params?.performedByUserId) qs.set('performedByUserId', params.performedByUserId);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<Prestacion[]>(`/api/prestaciones${suffix}`);
}
