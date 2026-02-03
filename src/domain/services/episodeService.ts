/**
 * Episode Service - Business logic for managing support episodes
 *
 * Responsibilities:
 * - Create new episodes
 * - Close active episodes
 * - Validate episode transitions
 * - Calculate episode duration
 */

import { SupportEpisode, Patient } from '../models';
import { SupportType } from '../../types';

/**
 * Creates a new support episode
 */
export function createEpisode(supportType: SupportType, startAt: string = new Date().toISOString(), reason?: string): SupportEpisode {
  return {
    id: `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    supportType,
    startAt,
    reason
  };
}

/**
 * Closes an episode by setting its endAt timestamp
 */
export function closeEpisode(episode: SupportEpisode, endAt: string = new Date().toISOString(), reason?: string): SupportEpisode {
  return {
    ...episode,
    endAt,
    reason: reason || episode.reason
  };
}

/**
 * Gets the active episode for a patient (the one without endAt)
 */
export function getActiveEpisode(patient: Patient): SupportEpisode | undefined {
  return patient.episodes.find(ep => !ep.endAt);
}

/**
 * Validates if a support type transition is clinically valid
 *
 * Clinical rules:
 * - Can't transition to the same support type
 * - Certain transitions are more common (IMV → NIV → HFNC → Room Air)
 */
export function validateSupportTransition(currentSupport: SupportType, newSupport: SupportType): {
  valid: boolean;
  warning?: string;
} {
  if (currentSupport === newSupport) {
    return {
      valid: false,
      warning: 'No se puede cambiar al mismo tipo de soporte'
    };
  }

  // All other transitions are technically valid
  // Could add clinical pathway warnings here in the future
  return {
    valid: true
  };
}

/**
 * Calculates the duration of an episode in a human-readable format
 */
export function calculateEpisodeDuration(startAt: string, endAt?: string): {
  days: number;
  hours: number;
  label: string;
} {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diffMs % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
  let label: string;
  if (days > 0) {
    label = `${days} día${days > 1 ? 's' : ''}`;
  } else {
    label = `${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  return {
    days,
    hours,
    label
  };
}

/**
 * Creates a new episode and closes the current active one
 * This is the main operation for support type changes
 */
export function transitionSupport(patient: Patient, newSupport: SupportType, reason?: string, transitionDate: string = new Date().toISOString()): Patient {
  const validation = validateSupportTransition(patient.supportType, newSupport);
  if (!validation.valid) {
    throw new Error(validation.warning);
  }
  const activeEpisode = getActiveEpisode(patient);

  // Close current episode
  const updatedEpisodes = patient.episodes.map(ep => ep.id === activeEpisode?.id ? closeEpisode(ep, transitionDate, reason) : ep);

  // Create new episode
  const newEpisode = createEpisode(newSupport, transitionDate, reason);
  return {
    ...patient,
    supportType: newSupport,
    episodes: [...updatedEpisodes, newEpisode]
  };
}

/**
 * Closes all active episodes when a patient case is closed
 */
export function closeAllEpisodes(patient: Patient, closureDate: string): SupportEpisode[] {
  return patient.episodes.map(ep => !ep.endAt ? closeEpisode(ep, closureDate, 'Patient case closed') : ep);
}