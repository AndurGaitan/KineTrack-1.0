/**
 * usePatientManagement - Hook for patient lifecycle management
 *
 * Handles patient creation, updates, and closure
 */

import { useApp } from '../contexts/AppContext';
import { canEditPatient, canChangeSupportType, closePatientCase } from '../domain/services/patientService';
import { ClosureReason } from '../types';
export function usePatientManagement(patientId?: string) {
  const {
    patients,
    closePatient,
    updatePatient
  } = useApp();
  const patient = patientId ? patients.find(p => p.id === patientId) : undefined;

  // Check permissions
  const canEdit = patient ? canEditPatient(patient) : false;
  const canChangeSupport = patient ? canChangeSupportType(patient) : false;

  // Handler for closing patient case
  const handleClosePatient = (reason: ClosureReason, date: string, notes?: string) => {
    if (!patient) return;
    try {
      closePatient(patient.id, {
        reason,
        date,
        notes
      });
    } catch (error) {
      console.error('Error closing patient:', error);
      throw error;
    }
  };
  return {
    patient,
    canEdit,
    canChangeSupport,
    handleClosePatient,
    updatePatient
  };
}