import { apiFetch } from './client';
import type { Sector } from '../types';

export function listSectors(includeInactive = false) {
  return apiFetch<Sector[]>(`/api/sectors${includeInactive ? '?includeInactive=true' : ''}`);
}

export function createSector(input: { name: string; type: string; bedLabels: string[] }) {
  return apiFetch<Sector>('/api/sectors', { method: 'POST', body: JSON.stringify(input) });
}

export function updateSector(id: string, input: Partial<{ name: string; type: string; active: boolean }>) {
  return apiFetch<Sector>(`/api/sectors/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function addBed(sectorId: string, input: { label: string; sortOrder?: number }) {
  return apiFetch<Sector>(`/api/sectors/${sectorId}/beds`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateBed(
  sectorId: string,
  bedId: string,
  input: Partial<{ label: string; sortOrder: number; active: boolean }>
) {
  return apiFetch<Sector>(`/api/sectors/${sectorId}/beds/${bedId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
