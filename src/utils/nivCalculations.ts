import { NIVRecord, RiskLevel } from '../types';
export interface NIVCalculations {
  hacorScore: number;
  hacorRisk: RiskLevel;
}
export function calculateHACORForNIV(data: {
  heartRate: number;
  ph: number;
  consciousness: number;
  pao2: number;
  fio2: number;
  respiratoryRate: number;
}): NIVCalculations {
  let score = 0;

  // Heart Rate
  if (data.heartRate >= 120) score += 1;

  // Acidosis (pH)
  if (data.ph < 7.35) score += 1;

  // Consciousness (GCS)
  if (data.consciousness < 15) score += 1;

  // Oxygenation (PaO2/FiO2)
  const pfRatio = data.pao2 / (data.fio2 / 100);
  if (pfRatio < 200) score += 1;
  if (pfRatio < 150) score += 1;

  // Respiratory Rate
  if (data.respiratoryRate > 30) score += 1;

  // Risk interpretation
  let risk: RiskLevel = 'low';
  if (score >= 5) risk = 'high';else if (score >= 3) risk = 'medium';
  return {
    hacorScore: score,
    hacorRisk: risk
  };
}
export function generateNIVAlerts(record: Partial<NIVRecord>): string[] {
  const alerts: string[] = [];

  // HACOR alerts
  if (record.hacorScore !== undefined) {
    if (record.hacorScore > 5) {
      alerts.push('HACOR > 5 - Alto riesgo de fracaso de VNI. Considerar escalada a VMI si no hay mejoría');
    } else if (record.hacorScore >= 3) {
      alerts.push('HACOR 3-5 - Riesgo moderado. Monitoreo estrecho y reevaluación frecuente');
    } else {
      alerts.push('✓ HACOR < 3 - Bajo riesgo de fracaso de VNI');
    }
  }

  // Skin integrity alerts
  if (record.skinIntegrity === 'severe-injury') {
    alerts.push('Lesión por presión severa - Revisar interfaz, ajuste y considerar cambio de tipo');
  } else if (record.skinIntegrity === 'pressure-injury-1-2') {
    alerts.push('Lesión por presión detectada - Optimizar ajuste de interfaz y protección cutánea');
  } else if (record.skinIntegrity === 'mild-erythema') {
    alerts.push('Eritema leve - Monitorear evolución y ajustar interfaz si es necesario');
  }

  // Leak alerts
  if (record.leak !== undefined && record.leak > 30) {
    alerts.push('Fuga elevada (> 30 L/min) - Revisar ajuste de interfaz para optimizar efectividad');
  }

  // FiO2 alerts
  if (record.fio2 && record.fio2 > 60) {
    alerts.push('FiO₂ > 60% - Considerar si VNI es el soporte adecuado o si requiere escalada');
  }

  // Previous IMV alerts
  if (record.previousIMVDays !== undefined && record.previousIMVDays > 7) {
    alerts.push('Paciente con VMI prolongada previa - Mayor riesgo de debilidad muscular respiratoria');
  }
  return alerts;
}