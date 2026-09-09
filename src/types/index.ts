export type UserRole = 'kinesiologo' | 'coordinador';
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
export type SupportType = 'imv' | 'niv' | 'hfnc' | 'traqueostomia' | 'conventional-oxygen' | 'room-air';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ScoreType = 'hacor' | 'rox';
// Ward/admission type. Curated suggestions in the UI, but stored as free text
// so a different institution can add its own without a code change.
export type SectorType = 'uci' | 'sala' | 'uco' | 'utim' | string;
export interface Bed {
  id: string;
  sectorId: string;
  label: string;
  sortOrder: number;
  active: boolean;
}
export interface Sector {
  id: string;
  name: string;
  type: SectorType;
  active: boolean;
  beds: Bed[];
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
export type AirwayEventType = 'extubacion' | 'destete-vni' | 'destete-hfnc';
export type AirwayEventInput =
  | { type: 'extubacion'; classification: 'programada' | 'accidental' }
  | { type: 'destete-vni' }
  | { type: 'destete-hfnc' };
export interface Patient {
  id: string;
  alias: string;
  sectorId: string;
  bedId: string;
  bedLabel?: string;
  supportType: SupportType;
  createdAt: string;
  predictedBodyWeight?: number;
  // Contexto clínico básico — todo opcional, editable desde PatientForm.
  age?: number;
  admissionDiagnosis?: string;
  antecedentes: string[];
  // Sexo + talla, cargados una sola vez — predictedBodyWeight (arriba) se
  // recalcula acá con la fórmula ARDSNet y de ahí en más cada monitorización
  // VMI lo hereda automáticamente sin volver a pedirlo.
  sex?: 'male' | 'female';
  heightCm?: number;
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
  // Mode-specific set parameter: controlPressure for PCV, supportPressure
  // for PSV (tidalVolumeSet plays that role for VCV). Ti is common to all 3.
  controlPressure?: number;
  supportPressure?: number;
  inspiratoryTime?: number;
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
  sbtType?: 'psv' | 'cpap' | 't-piece';
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

  // NIV Parameters (PSV/CPAP-style: Presión de Soporte, PEEP, sensibilidad
  // espiratoria — el equipo real que usa el kinesiólogo, no un BiPAP
  // domiciliario con IPAP/EPAP)
  mode: NIVMode;
  modeOther?: string;
  supportPressure: number; // PS
  peep: number;
  expiratorySensitivity: number; // %
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

  // Rest of the ABG panel (pao2/ph above are the HACOR-required pair)
  paco2?: number;
  hco3?: number;
  spo2?: number;

  // Previous IMV
  previousIMVDays?: number;

  // Alerts
  alerts: string[];
}

/// A documented window of actual NIV use (start/end) for tracking
/// intermittent weaning — independent of NIVRecord parameter monitoring.
/// `endAt` undefined means the session is still ongoing.
export interface NIVSession {
  id: string;
  patientId: string;
  episodeId?: string;
  startAt: string;
  endAt?: string;
  notes?: string;
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
// Tracheostomy weaning follow-up (patients who failed extubation, were
// tracheostomized, and are now breathing spontaneously via the trach —
// support type 'traqueostomia'). Days-since-VMI is derived from the
// episode's startAt on the frontend, not stored here.
export type SwallowingTestResult = 'apta' | 'no-apta' | 'con-restricciones';
export type BlueTestResult = 'positivo' | 'negativo';
export interface TrachRecord {
  id: string;
  patientId: string;
  episodeId?: string;
  performedByUserId: string;
  timestamp: string;
  type: 'traqueostomia';
  glasgow: number;
  pemax?: number;
  cuffDeflationPerformed: boolean;
  cuffDeflationTolerated?: boolean;
  cuffDeflationNotes?: string;
  cappedTrialPerformed: boolean;
  cappedTrialTolerated?: boolean;
  cappedTrialNotes?: string;
  swallowingTest?: SwallowingTestResult;
  blueTest?: BlueTestResult;
  alerts: string[];
}

export interface AppState {
  user: User | null;
  sectors: Sector[];
  patients: Patient[];
  scores: ScoreRecord[];
  vmiRecords: VMIRecord[];
  nivRecords: NIVRecord[];
  nivSessions: NIVSession[];
  hfncRecords: HFNCRecord[];
  trachRecords: TrachRecord[];
}

// ---------------------------------------------------------------------------
// Coordinator module: team productivity, quality indicators, scheduling.
// ---------------------------------------------------------------------------

export type PrestacionType = 'kinesioterapia-respiratoria' | 'kinesioterapia-motora' | 'evaluacion' | 'progresion';
// Dispositivo de entrega de O2 — solo aplica a prestaciones de kinesioterapia
// respiratoria en pacientes con soporte 'conventional-oxygen'.
export type OxygenDeviceType = 'canula-nasal-simple' | 'mascara-simple' | 'mascara-venturi' | 'mascara-no-reinhalacion';
export interface Prestacion {
  id: string;
  patientId: string;
  performedByUserId: string;
  type: PrestacionType;
  timestamp: string;
  durationMinutes?: number;
  notes?: string;
  oxygenDevice?: OxygenDeviceType;
  oxygenLiters?: number;
}

export type MrcStatus = 'evaluable' | 'no-evaluable' | 'parcial' | 'desconocido';
export interface MrcScores {
  shoulderAbductionRight?: number;
  shoulderAbductionLeft?: number;
  elbowFlexionRight?: number;
  elbowFlexionLeft?: number;
  wristExtensionRight?: number;
  wristExtensionLeft?: number;
  hipFlexionRight?: number;
  hipFlexionLeft?: number;
  kneeExtensionRight?: number;
  kneeExtensionLeft?: number;
  ankleDorsiflexionRight?: number;
  ankleDorsiflexionLeft?: number;
}
export interface MrcAssessment {
  id: string;
  patientId: string;
  episodeId?: string;
  evaluatedByUserId: string;
  assessedAt: string;
  status: MrcStatus;
  scores: MrcScores;
  totalScore?: number;
  daucicConfirmed?: boolean;
  notes?: string;
}

export interface Protocol {
  id: string;
  name: string;
  isPriority: boolean;
  approved: boolean;
  version?: string;
  effectiveFrom?: string;
  validUntil?: string;
  available: boolean;
  archived: boolean;
  replaced: boolean;
  notes?: string;
  vigente: boolean;
}

export interface ShiftTemplateSlot {
  id?: string;
  area: string;
  count: number;
}
export interface ShiftTemplate {
  id: string;
  name: string;
  daysOfWeek: number[]; // ISO weekday: 1=Lun .. 7=Dom
  startTime: string;
  endTime: string;
  active: boolean;
  slots: ShiftTemplateSlot[];
}
export interface ShiftAssignment {
  id: string;
  shiftTemplateId: string;
  date: string; // YYYY-MM-DD
  area: string;
  slotIndex: number;
  userId?: string;
  userName?: string;
}

export interface QIResultBase {
  calculable: boolean;
  percentage: number | null;
}
export interface DashboardSummary {
  period: { from: string; to: string };
  productivity: {
    total: { kinesioterapiaRespiratoria: number; kinesioterapiaMotora: number; evaluaciones: number; progresiones: number };
    byUser: Array<{
      userId: string;
      userName: string;
      kinesioterapiaRespiratoria: number;
      kinesioterapiaMotora: number;
      evaluaciones: number;
      progresiones: number;
    }>;
  };
  achievements: {
    extubacionExitosa: { total: number; exitosas: number; fallidas: number; pendientes: number };
    desteteVniExitoso: { total: number; exitosas: number; fallidas: number; pendientes: number };
    desteteHfncExitoso: { total: number; exitosas: number; fallidas: number; pendientes: number };
    sbt: {
      total: number;
      sinModoRegistrado: number;
      byType: Record<'psv' | 'cpap' | 't-piece', { total: number; exitosas: number; fallidas: number }>;
    };
  };
  qualityIndicators: {
    qi01PveDiasElegibles: QIResultBase & { eligibleDays: number; eligibleDaysWithPve: number };
    qi02Reintubacion48h: QIResultBase & {
      extubacionesProgramadas: number;
      reintubadas48h: number;
      exitosas: number;
      pendientes: number;
    };
    qi03Dauci: QIResultBase & { patientsVmiMasDe7Dias: number; daucicConfirmada: number };
    qi04ProtocolosVigentes: QIResultBase & { protocolosPriorizados: number; protocolosVigentes: number };
  };
}