import { apiFetch } from './client';
import type { SupportType } from '../types';

export type PatientDTO = {
  id: string;
  alias: string;
  sectorId: string;
  bed: number;
  status: 'active' | 'closed';
  predictedBodyWeight: number | null;
  createdAt: string;
  // soporte actual (si tu backend todavía no lo guarda, lo dejamos opcional)
  supportType?: SupportType;
};

export type CreatePatientDTO = {
  alias: string;
  sectorId: string;
  bed: number;
  predictedBodyWeight?: number;
  supportType?: SupportType; // opcional por ahora
};

export async function listPatients(params?: { sectorId?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.sectorId) qs.set('sectorId', params.sectorId);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<PatientDTO[]>(`/api/patients${suffix}`);
}

export async function createPatient(dto: CreatePatientDTO) {
  return apiFetch<PatientDTO>(`/api/patients`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getPatient(id: string) {
  return apiFetch<PatientDTO>(`/api/patients/${id}`);
}