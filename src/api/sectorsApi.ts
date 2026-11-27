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

export interface SplitRoomsResult {
  sector: Sector;
  split: string[];
  alreadySplit: string[];
  notFound: string[];
  conflicts: string[];
}

/** Habitaciones de una cama a dos ("1" → "1 A" y "1 B"). Con `dryRun` solo informa qué pasaría. */
export function splitRooms(sectorId: string, input: { rooms: string[]; dryRun: boolean }) {
  return apiFetch<SplitRoomsResult>(`/api/sectors/${sectorId}/split-rooms`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateBed(
  sectorId: string,
  bedId: string,
  input: Partial<{ label: string; sortOrder: number; active: boolean }>
) {
  return apiFetch<Sector>(`/api/sectors/${sectorId}/beds/${bedId}`, { method: 'PATCH', body: JSON.stringify(input) });
}
