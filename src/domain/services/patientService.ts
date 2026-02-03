/**
 * Patient Service - Business logic for patient management
 *
 * Responsibilities:
 * - Create patients with initial episode
 * - Close patient cases
 * - Validate patient state
 * - Patient queries and filters
 */

import { Patient, PatientClosure, SupportEpisode } from '../models';
import { SupportType, PatientStatus, ClosureReason } from '../../types';
import { createEpisode, closeAllEpisodes } from './episodeService';

/**
 * Creates a new patient with an initial support episode
 */
export function createPatient(alias: string, sectorId: string, bed: number, supportType: SupportType, predictedBodyWeight?: number): Patient {
  const now = new Date().toISOString();
  const initialEpisode = createEpisode(supportType, now, 'Initial admission');
  return {
    id: `pat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    alias,
    sectorId,
    bed,
    supportType,
    status: 'active',
    createdAt: now,
    predictedBodyWeight,
    episodes: [initialEpisode]
  };
}

/**
 * Closes a patient case
 */
export function closePatientCase(patient: Patient, reason: ClosureReason, date: string = new Date().toISOString(), notes?: string): Patient {
  if (patient.status === 'closed') {
    throw new Error('Patient case is already closed');
  }
  const closure: PatientClosure = {
    reason,
    date,
    notes
  };
  const closedEpisodes = closeAllEpisodes(patient, date);
  return {
    ...patient,
    status: 'closed',
    closure,
    episodes: closedEpisodes
  };
}

/**
 * Filters patients by status
 */
export function filterPatientsByStatus(patients: Patient[], status: PatientStatus): Patient[] {
  return patients.filter(p => p.status === status);
}

/**
 * Filters patients by sector
 */
export function filterPatientsBySector(patients: Patient[], sectorId: string, includeInactive: boolean = false): Patient[] {
  return patients.filter(p => p.sectorId === sectorId && (includeInactive || p.status === 'active'));
}

/**
 * Validates if a patient can be edited
 */
export function canEditPatient(patient: Patient): boolean {
  return patient.status === 'active';
}

/**
 * Validates if a patient can change support
 */
export function canChangeSupportType(patient: Patient): boolean {
  return patient.status === 'active';
}

/**
 * Gets active patients count for a sector
 */
export function getActivePatientsCount(patients: Patient[], sectorId: string): number {
  return filterPatientsBySector(patients, sectorId, false).length;
}

/**
 * Gets closed patients count
 */
export function getClosedPatientsCount(patients: Patient[]): number {
  return filterPatientsByStatus(patients, 'closed').length;
}