import { apiFetch } from './client';
import type { Protocol } from '../types';

export type ProtocolInput = Partial<{
  name: string;
  isPriority: boolean;
  approved: boolean;
  version: string;
  effectiveFrom: string;
  validUntil: string;
  available: boolean;
  archived: boolean;
  replaced: boolean;
  notes: string;
}>;

export function listProtocols() {
  return apiFetch<Protocol[]>('/api/protocols');
}

export function createProtocol(input: ProtocolInput & { name: string }) {
  return apiFetch<Protocol>('/api/protocols', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProtocol(id: string, input: ProtocolInput) {
  return apiFetch<Protocol>(`/api/protocols/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteProtocol(id: string) {
  return apiFetch<void>(`/api/protocols/${id}`, { method: 'DELETE' });
}
