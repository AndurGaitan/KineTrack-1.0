import { RiskLevel } from '../types';
export interface HACORInputs {
  heartRate: number;
  acidosis: number; // pH value
  consciousness: number; // GCS score
  oxygenation: number; // PaO2/FiO2 ratio
  respiratoryRate: number;
}
export interface ROXInputs {
  spo2: number;
  fio2: number; // % (e.g. 40 = 40%)
  respiratoryRate: number;
}

/**
 * HACOR points, using the original weighted scale (Duan et al., Intensive Care
 * Med 2017), not a simple 1-point-per-abnormal-variable count:
 *
 * - Heart rate:       ≤120 = 0, ≥121 = 1
 * - pH:               ≥7.35 = 0, 7.30-7.34 = 2, 7.25-7.29 = 3, <7.25 = 4
 * - GCS:              15 = 0, 13-14 = 2, 11-12 = 5, ≤10 = 10
 * - PaO2/FiO2:        ≥201 = 0, 176-200 = 2, 151-175 = 3, 126-150 = 4, 101-125 = 5, ≤100 = 6
 * - Respiratory rate: ≤30 = 0, 31-35 = 1, 36-40 = 2, 41-45 = 3, ≥46 = 4
 *
 * The only cutoff validated in the original study is HACOR > 5 (measured 1h
 * after starting NIV) = high risk of NIV failure. The intermediate "medium"
 * band below is an interpretive addition for UI purposes, not a validated
 * threshold — adjust with your clinical team if your institution uses a
 * different banding.
 */
export interface HACORPointInputs {
  heartRate: number; // bpm
  ph: number; // arterial pH
  gcs: number; // Glasgow Coma Scale (3-15)
  pfRatio: number; // PaO2/FiO2 ratio (mmHg)
  respiratoryRate: number; // breaths/min
}
export function calculateHACORScore(inputs: HACORPointInputs): {
  score: number;
  risk: RiskLevel;
} {
  let score = 0;

  // Heart rate
  if (inputs.heartRate >= 121) score += 1;

  // Acidosis (pH)
  if (inputs.ph < 7.25) score += 4;else if (inputs.ph < 7.3) score += 3;else if (inputs.ph < 7.35) score += 2;

  // Consciousness (GCS)
  if (inputs.gcs <= 10) score += 10;else if (inputs.gcs <= 12) score += 5;else if (inputs.gcs <= 14) score += 2;

  // Oxygenation (PaO2/FiO2)
  if (inputs.pfRatio <= 100) score += 6;else if (inputs.pfRatio <= 125) score += 5;else if (inputs.pfRatio <= 150) score += 4;else if (inputs.pfRatio <= 175) score += 3;else if (inputs.pfRatio <= 200) score += 2;

  // Respiratory rate
  if (inputs.respiratoryRate >= 46) score += 4;else if (inputs.respiratoryRate >= 41) score += 3;else if (inputs.respiratoryRate >= 36) score += 2;else if (inputs.respiratoryRate >= 31) score += 1;

  // Risk interpretation (cutoff >5 is the only validated threshold)
  let risk: RiskLevel = 'low';
  if (score > 10) risk = 'high';else if (score > 5) risk = 'medium';
  return {
    score,
    risk
  };
}

/** @deprecated Kept for the generic Score Calculator UI; delegates to calculateHACORScore. */
export function calculateHACOR(inputs: HACORInputs): {
  score: number;
  risk: RiskLevel;
} {
  return calculateHACORScore({
    heartRate: inputs.heartRate,
    ph: inputs.acidosis,
    gcs: inputs.consciousness,
    pfRatio: inputs.oxygenation,
    respiratoryRate: inputs.respiratoryRate
  });
}
export function calculateROX(inputs: ROXInputs): {
  score: number;
  risk: RiskLevel;
} {
  // ROX = (SpO2 / FiO2) / RR, where FiO2 must be a fraction (0.21-1.0).
  // FiO2 is entered/stored here as a percentage, so it must be converted.
  const fio2Fraction = inputs.fio2 / 100;
  const score = inputs.spo2 / fio2Fraction / inputs.respiratoryRate;

  // Risk interpretation
  let risk: RiskLevel = 'low';
  if (score >= 3.85 && score <= 4.88) risk = 'medium';
  if (score < 3.85) risk = 'high';
  return {
    score: Number(score.toFixed(2)),
    risk
  };
}