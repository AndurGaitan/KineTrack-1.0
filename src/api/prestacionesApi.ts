import { apiFetch } from './client';
import type {
  KtrTechnique,
  MobilizationLevel,
  OxygenDeviceType,
  Prestacion,
  PrestacionType,
  TrachSecretionAmount,
  TrachSecretionCharacter,
} from '../types';

export type CreatePrestacionInput = {
  patientId: string;
  type: PrestacionType;
  timestamp?: string;
  durationMinutes?: number;
  notes?: string;
  oxygenDevice?: OxygenDeviceType;
  oxygenLiters?: number;
  mobilizationLevel?: MobilizationLevel;
  aspirated?: boolean;
  secretionAmount?: TrachSecretionAmount;
  secretionCharacter?: TrachSecretionCharacter;
  techniques?: KtrTechnique[];
};

export function createPrestacion(input: CreatePrestacionInput) {
  return apiFetch<Prestacion>('/api/prestaciones', { method: 'POST', body: JSON.stringify(input) });
}

export function listPrestaciones(params?: {
  patientId?: string;
  /** Varios pacientes en una sola solicitud — usar patientId o patientIds, no ambos. */
  patientIds?: string[];
  performedByUserId?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.patientId) qs.set('patientId', params.patientId);
  if (params?.patientIds) qs.set('patientIds', params.patientIds.join(','));
  if (params?.performedByUserId) qs.set('performedByUserId', params.performedByUserId);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<Prestacion[]>(`/api/prestaciones${suffix}`);
}
