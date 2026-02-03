export interface User {
  name: string;
  email: string;
}
export type SupportType = 'imv' | 'niv' | 'hfnc' | 'conventional-oxygen' | 'room-air';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ScoreType = 'hacor' | 'rox';
export interface Sector {
  id: string;
  name: string;
  beds: number;
}
export type PatientStatus = 'active' | 'closed';
export type ClosureReason = 'discharge' | 'transfer-ward' | 'transfer-facility' | 'deceased';
export interface PatientClosure {
  reason: ClosureReason;
  date: string;
  notes?: string;
}
export interface SupportEpisode {
  id: string;
  supportType: SupportType;
  startAt: string;
  endAt?: string;
  reason?: string;
}
export interface Patient {
  id: string;
  alias: string;
  sectorId: string;
  bed: number;
  supportType: SupportType;
  createdAt: string;
  predictedBodyWeight?: number;
  status: PatientStatus;
  closure?: PatientClosure;
  episodes: SupportEpisode[];
}
export interface ScoreRecord {
  id: string;
  patientId: string;
  episodeId?: string;
  type: ScoreType;
  value: number;
  inputs: Record<string, number>;
  risk: RiskLevel;
  timestamp: string;
}

// IMV (Invasive Mechanical Ventilation) Types
export type VentMode = 'VC' | 'PC' | 'PRVC' | 'PSV' | 'SIMV-VC' | 'SIMV-PC' | 'Other';
export type VentControlVariable = 'volume' | 'pressure' | 'dual';
export type AsynchronyType = 'ineffective-effort' | 'double-trigger' | 'premature-cycling' | 'delayed-cycling' | 'auto-peep';
export type AsynchronyFrequency = 'rare' | 'occasional' | 'frequent';
export type WeaningStatus = 'not-candidate' | 'candidate' | 'sbt-trial' | 'extubated';
export type MobilizationLevel = 0 | 1 | 2 | 3 | 4;
export interface VMIRecord {
  id: string;
  patientId: string;
  episodeId?: string;
  timestamp: string;

  // A) Ventilator Settings (NEW: Mode first)
  ventMode: VentMode;
  ventModeOther?: string;
  controlVariable: VentControlVariable;
  predictedBodyWeight: number;
  tidalVolumeSet: number;
  tidalVolumeExpired: number;
  plateauPressure: number;
  peakPressure?: number; // NEW: For Mechanical Power
  peep: number;
  fio2: number;
  respiratoryRate?: number;

  // B) Synchrony
  hasAsynchrony: boolean;
  asynchronyTypes: AsynchronyType[];
  asynchronyFrequency?: AsynchronyFrequency;

  // C) Oxygenation & Acid-Base
  spo2?: number;
  pao2?: number;
  paco2?: number;
  ph?: number;
  hco3?: number; // NEW: Bicarbonate

  // D) Weaning
  weaningStatus: WeaningStatus;
  sbtPerformed?: boolean;
  sbtType?: string;
  sbtResult?: 'success' | 'failure';
  sbtFailureReason?: string;

  // E) Mobilization
  mobilizationLevel: MobilizationLevel;
  mobilizationBarrier?: string;

  // Calculated fields
  vtPerKg: number;
  drivingPressure: number;
  pfRatio?: number;
  compliance?: number;
  mechanicalPower?: number; // NEW: Mechanical Power (J/min)

  // Quality indicators
  protectiveVentilation: boolean;
  alerts: string[];
}

// NIV (Non-Invasive Ventilation) Types
export type NIVInterfaceType = 'full-face' | 'oronasal' | 'nasal' | 'helmet' | 'other';
export type SkinIntegrityStatus = 'no-lesions' | 'mild-erythema' | 'pressure-injury-1-2' | 'severe-injury';
export type NIVMode = 'cpap' | 'bipap' | 'other';
export interface NIVRecord {
  id: string;
  patientId: string;
  episodeId?: string;
  timestamp: string;

  // Interface
  interfaceType: NIVInterfaceType;
  interfaceOther?: string;

  // Skin Integrity
  skinIntegrity: SkinIntegrityStatus;
  lesionLocations: string[];
  skinNotes?: string;

  // NIV Parameters
  mode: NIVMode;
  modeOther?: string;
  ipap: number;
  epap: number;
  fio2: number;
  leak?: number;

  // HACOR Score
  heartRate: number;
  ph: number;
  consciousness: number;
  pao2: number;
  respiratoryRate: number;
  hacorScore: number;
  hacorRisk: RiskLevel;

  // Previous IMV
  previousIMVDays?: number;

  // Alerts
  alerts: string[];
}

// HFNC (High-Flow Nasal Cannula) Types
export type CannulaFit = 'well-adapted' | 'discomfort' | 'significant-leak';
export interface HFNCRecord {
  id: string;
  patientId: string;
  episodeId?: string;
  timestamp: string;

  // HFNC Parameters
  flow: number;
  fio2: number;
  temperature?: number;
  cannulaFit: CannulaFit;
  cannulaNotes?: string;

  // Humidification
  humidificationWorking: boolean;
  humidificationIssue?: string;

  // ROX Index
  spo2: number;
  respiratoryRate: number;
  roxIndex: number;
  roxRisk: RiskLevel;

  // Alerts
  alerts: string[];
}
export interface AppState {
  user: User | null;
  sectors: Sector[];
  patients: Patient[];
  scores: ScoreRecord[];
  vmiRecords: VMIRecord[];
  nivRecords: NIVRecord[];
  hfncRecords: HFNCRecord[];
}