/**
 * Data Migration Utilities
 *
 * Handles migration of legacy data to new domain model structure
 */

import { Patient } from '../types';
import { createEpisode } from '../domain/services/episodeService';

/**
 * Migrates a legacy patient (without episodes) to new format
 */
export function migratePatientToEpisodes(patient: Patient): Patient {
  // If patient already has episodes, no migration needed
  if (patient.episodes && patient.episodes.length > 0) {
    return patient;
  }

  // Create initial episode from patient's creation date
  const initialEpisode = createEpisode(patient.supportType, patient.createdAt, 'Initial admission');
  return {
    ...patient,
    status: patient.status || 'active',
    episodes: [initialEpisode]
  };
}

/**
 * Migrates all patients in app state
 */
export function migrateAllPatients(patients: Patient[]): Patient[] {
  return patients.map(migratePatientToEpisodes);
}

/**
 * Links orphaned observations to their corresponding episodes
 *
 * For observations without episodeId, finds the appropriate episode based on:
 * - Observation timestamp
 * - Support type
 */
export function linkObservationToEpisode(observation: {
  timestamp: string;
  patientId: string;
}, patient: Patient): string | undefined {
  if (!patient.episodes || patient.episodes.length === 0) {
    return undefined;
  }
  const obsTime = new Date(observation.timestamp).getTime();

  // Find episode that contains this observation's timestamp
  const matchingEpisode = patient.episodes.find(ep => {
    const startTime = new Date(ep.startAt).getTime();
    const endTime = ep.endAt ? new Date(ep.endAt).getTime() : Date.now();
    return obsTime >= startTime && obsTime <= endTime;
  });
  return matchingEpisode?.id;
}