/**
 * usePatientEpisodes - Hook for managing patient episodes
 *
 * Encapsulates all episode-related logic and provides a clean API
 */

import { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { getActiveEpisode, calculateEpisodeDuration, transitionSupport } from '../domain/services/episodeService';
import { groupObservationsByEpisode, getEpisodeObservations } from '../domain/services/observationService';
import { vmiRecordToObservation, nivRecordToObservation, hfncRecordToObservation } from '../domain/adapters/observationAdapter';
import { SupportType } from '../types';
import { SupportEpisode, ClinicalObservationType } from '../domain/models';
export function usePatientEpisodes(patientId: string) {
  const {
    patients,
    getPatientVMIRecords,
    getPatientNIVRecords,
    getPatientHFNCRecords,
    changeSupportType
  } = useApp();
  const patient = patients.find(p => p.id === patientId);

  // Convert all records to domain observations
  const allObservations = useMemo((): ClinicalObservationType[] => {
    if (!patient) return [];
    const vmiObs = getPatientVMIRecords(patient.id).map(vmiRecordToObservation);
    const nivObs = getPatientNIVRecords(patient.id).map(nivRecordToObservation);
    const hfncObs = getPatientHFNCRecords(patient.id).map(hfncRecordToObservation);
    return [...vmiObs, ...nivObs, ...hfncObs];
  }, [patient, getPatientVMIRecords, getPatientNIVRecords, getPatientHFNCRecords]);

  // Group observations by episode
  const episodesWithObservations = useMemo(() => {
    if (!patient) return [];
    return groupObservationsByEpisode(patient.episodes, allObservations);
  }, [patient, allObservations]);

  // Get active episode
  const activeEpisode = useMemo(() => {
    if (!patient) return undefined;
    return getActiveEpisode(patient);
  }, [patient]);

  // Calculate durations for all episodes
  const episodesWithDurations = useMemo(() => {
    return episodesWithObservations.map(({
      episode,
      observations
    }) => ({
      episode,
      observations,
      duration: calculateEpisodeDuration(episode.startAt, episode.endAt)
    }));
  }, [episodesWithObservations]);

  // Handler for changing support type
  const handleSupportChange = (newSupport: SupportType, reason?: string, date?: string) => {
    if (!patient) return;
    changeSupportType(patient.id, newSupport, reason, date);
  };

  // Get observations for a specific episode
  const getObservationsForEpisode = (episodeId: string) => {
    return getEpisodeObservations(allObservations, episodeId);
  };
  return {
    patient,
    episodes: patient?.episodes || [],
    activeEpisode,
    episodesWithObservations: episodesWithDurations,
    allObservations,
    getObservationsForEpisode,
    handleSupportChange
  };
}