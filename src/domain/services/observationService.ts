/**
 * Observation Service - Business logic for clinical observations
 *
 * Responsibilities:
 * - Create observations with proper IDs and timestamps
 * - Link observations to episodes
 * - Filter and query observations
 * - Group observations by episode
 */

import { ClinicalObservationType, SupportEpisode } from '../models';
import { SupportType } from '../../types';

/**
 * Generates a unique observation ID
 */
export function generateObservationId(): string {
  return `obs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gets the current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Filters observations by patient
 */
export function getPatientObservations(observations: ClinicalObservationType[], patientId: string): ClinicalObservationType[] {
  return observations.filter(obs => obs.patientId === patientId);
}

/**
 * Filters observations by episode
 */
export function getEpisodeObservations(observations: ClinicalObservationType[], episodeId: string): ClinicalObservationType[] {
  return observations.filter(obs => obs.episodeId === episodeId);
}

/**
 * Filters observations by support type
 */
export function getObservationsByType<T extends ClinicalObservationType>(observations: ClinicalObservationType[], type: SupportType): T[] {
  return observations.filter(obs => obs.type === type) as T[];
}

/**
 * Groups observations by episode
 */
export interface ObservationsByEpisode {
  episode: SupportEpisode;
  observations: ClinicalObservationType[];
}
export function groupObservationsByEpisode(episodes: SupportEpisode[], observations: ClinicalObservationType[]): ObservationsByEpisode[] {
  return episodes.map(episode => ({
    episode,
    observations: getEpisodeObservations(observations, episode.id)
  }));
}

/**
 * Sorts observations by timestamp (most recent first)
 */
export function sortObservationsByDate(observations: ClinicalObservationType[], ascending: boolean = false): ClinicalObservationType[] {
  return [...observations].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return ascending ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Gets the most recent observation for a patient
 */
export function getLatestObservation(observations: ClinicalObservationType[], patientId: string): ClinicalObservationType | undefined {
  const patientObs = getPatientObservations(observations, patientId);
  const sorted = sortObservationsByDate(patientObs);
  return sorted[0];
}

/**
 * Counts observations by type for a patient
 */
export function countObservationsByType(observations: ClinicalObservationType[], patientId: string): Record<SupportType, number> {
  const patientObs = getPatientObservations(observations, patientId);
  return {
    imv: patientObs.filter(o => o.type === 'imv').length,
    niv: patientObs.filter(o => o.type === 'niv').length,
    hfnc: patientObs.filter(o => o.type === 'hfnc').length,
    'conventional-oxygen': 0,
    'room-air': 0
  };
}