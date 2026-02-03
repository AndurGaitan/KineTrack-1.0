import type { Patient } from '../domain/models';
import type { SupportType } from '../types';
import { createEpisode } from '../domain/services/episodeService';
import type { PatientDTO, CreatePatientDTO } from '../api/patientsApi';

export function dtoToDomainPatient(dto: PatientDTO): Patient {
  const supportType: SupportType = dto.supportType ?? 'imv'; // fallback temporal
  const initialEpisode = createEpisode(supportType, dto.createdAt, 'Initial admission');

  return {
    id: dto.id,
    alias: dto.alias,
    sectorId: dto.sectorId,
    bed: dto.bed,
    supportType,
    status: dto.status,
    createdAt: dto.createdAt,
    predictedBodyWeight: dto.predictedBodyWeight ?? undefined,
    episodes: [initialEpisode],
    // closure: todavía no viene del backend en MVP
  };
}

export function domainCreateToDto(input: {
  alias: string;
  sectorId: string;
  bed: number;
  supportType: SupportType;
  predictedBodyWeight?: number;
}): CreatePatientDTO {
  return {
    alias: input.alias,
    sectorId: input.sectorId,
    bed: input.bed,
    supportType: input.supportType,
    predictedBodyWeight: input.predictedBodyWeight,
  };
}