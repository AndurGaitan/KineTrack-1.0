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
  fio2: number;
  respiratoryRate: number;
}
export function calculateHACOR(inputs: HACORInputs): {
  score: number;
  risk: RiskLevel;
} {
  let score = 0;

  // Heart Rate
  if (inputs.heartRate >= 120) score += 1;

  // Acidosis (pH)
  if (inputs.acidosis < 7.35) score += 1;

  // Consciousness (GCS)
  if (inputs.consciousness < 15) score += 1;

  // Oxygenation (PaO2/FiO2)
  if (inputs.oxygenation < 200) score += 1;
  if (inputs.oxygenation < 150) score += 1; // Additional point

  // Respiratory Rate
  if (inputs.respiratoryRate > 30) score += 1;

  // Risk interpretation
  let risk: RiskLevel = 'low';
  if (score >= 5 && score <= 7) risk = 'medium';
  if (score > 7) risk = 'high';
  return {
    score,
    risk
  };
}
export function calculateROX(inputs: ROXInputs): {
  score: number;
  risk: RiskLevel;
} {
  const score = inputs.spo2 / inputs.fio2 / inputs.respiratoryRate;

  // Risk interpretation
  let risk: RiskLevel = 'low';
  if (score >= 3.85 && score <= 4.88) risk = 'medium';
  if (score < 3.85) risk = 'high';
  return {
    score: Number(score.toFixed(2)),
    risk
  };
}