/**
 * Domain Models - Core Clinical Entities
 *
 * These models represent the clinical domain of respiratory support monitoring.
 * They are designed to be:
 * - Backend-agnostic (easily serializable)
 * - Clinically accurate
 * - Type-safe
 * - Easy to validate and transform
 */

import { SupportType, PatientStatus, ClosureReason, VentMode, VentControlVariable, AsynchronyType, AsynchronyFrequency, WeaningStatus, MobilizationLevel, NIVInterfaceType, SkinIntegrityStatus, NIVMode, CannulaFit, RiskLevel } from '../types';

/**
 * Patient - Core entity representing a patient in the ICU
 */
export interface Patient {
  id: string;
  alias: string;
  sectorId: string;
  bedId: string;
  supportType: SupportType;
  status: PatientStatus;
  createdAt: string;
  predictedBodyWeight?: number;
  closure?: PatientClosure;
  episodes: SupportEpisode[];
}

/**
 * PatientClosure - Records why and when a patient case was closed
 */
export interface PatientClosure {
  reason: ClosureReason;
  date: string;
  notes?: string;
}

/**
 * SupportEpisode - Represents a period of time with a specific respiratory support
 */
export interface SupportEpisode {
  id: string;
  supportType: SupportType;
  startAt: string;
  endAt?: string;
  reason?: string;
}

/**
 * Base interface for all clinical observations
 */
export interface ClinicalObservation {
  id: string;
  patientId: string;
  episodeId?: string;
  timestamp: string;
}

/**
 * IMV Observation - Invasive Mechanical Ventilation monitoring
 */
export interface IMVObservation extends ClinicalObservation {
  type: 'imv';

  // Ventilator settings (mode-dependent)
  ventMode: VentMode;
  ventModeOther?: string;
  controlVariable: VentControlVariable;
  predictedBodyWeight: number;
  tidalVolumeSet: number;
  tidalVolumeExpired: number;
  controlPressure?: number;
  supportPressure?: number;
  inspiratoryTime?: number;
  plateauPressure: number;
  peakPressure?: number;
  peep: number;
  fio2: number;
  respiratoryRate?: number;

  // Synchrony assessment
  hasAsynchrony: boolean;
  asynchronyTypes: AsynchronyType[];
  asynchronyFrequency?: AsynchronyFrequency;

  // Oxygenation & acid-base
  spo2?: number;
  pao2?: number;
  paco2?: number;
  ph?: number;
  hco3?: number;

  // Weaning assessment
  weaningStatus: WeaningStatus;
  sbtPerformed?: boolean;
  sbtType?: 'psv' | 'cpap' | 't-piece';
  sbtResult?: 'success' | 'failure';
  sbtFailureReason?: string;

  // Mobilization
  mobilizationLevel: MobilizationLevel;
  mobilizationBarrier?: string;

  // Derived/calculated fields
  calculated: {
    vtPerKg: number;
    drivingPressure: number;
    pfRatio?: number;
    compliance?: number;
    mechanicalPower?: number;
    protectiveVentilation: boolean;
  };
  alerts: string[];
}

/**
 * NIV Observation - Non-Invasive Ventilation monitoring
 */
export interface NIVObservation extends ClinicalObservation {
  type: 'niv';
  interfaceType: NIVInterfaceType;
  interfaceOther?: string;
  skinIntegrity: SkinIntegrityStatus;
  lesionLocations: string[];
  skinNotes?: string;
  mode: NIVMode;
  modeOther?: string;
  supportPressure: number;
  peep: number;
  expiratorySensitivity: number;
  fio2: number;
  leak?: number;
  heartRate: number;
  ph: number;
  consciousness: number;
  pao2: number;
  paco2?: number;
  hco3?: number;
  spo2?: number;
  respiratoryRate: number;
  previousIMVDays?: number;
  calculated: {
    hacorScore: number;
    hacorRisk: RiskLevel;
  };
  alerts: string[];
}

/**
 * HFNC Observation - High-Flow Nasal Cannula monitoring
 */
export interface HFNCObservation extends ClinicalObservation {
  type: 'hfnc';
  flow: number;
  fio2: number;
  temperature?: number;
  cannulaFit: CannulaFit;
  cannulaNotes?: string;
  humidificationWorking: boolean;
  humidificationIssue?: string;
  spo2: number;
  respiratoryRate: number;
  calculated: {
    roxIndex: number;
    roxRisk: RiskLevel;
  };
  alerts: string[];
}

/**
 * Union type for all observation types
 */
export type ClinicalObservationType = IMVObservation | NIVObservation | HFNCObservation;

/**
 * Helper type guards for observation types
 */
export function isIMVObservation(obs: ClinicalObservationType): obs is IMVObservation {
  return obs.type === 'imv';
}
export function isNIVObservation(obs: ClinicalObservationType): obs is NIVObservation {
  return obs.type === 'niv';
}
export function isHFNCObservation(obs: ClinicalObservationType): obs is HFNCObservation {
  return obs.type === 'hfnc';
}