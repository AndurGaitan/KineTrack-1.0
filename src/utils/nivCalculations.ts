import { NIVRecord, RiskLevel } from '../types';
import { calculateHACORScore } from './scores';
export interface NIVCalculations {
  hacorScore: number;
  hacorRisk: RiskLevel;
}
export function calculateHACORForNIV(data: {
  heartRate: number;
  ph: number;
  consciousness: number; // GCS
  pao2: number;
  fio2: number; // %
  respiratoryRate: number;
}): NIVCalculations {
  // PaO2/FiO2 ratio (FiO2 stored as %, must be converted to fraction)
  const pfRatio = data.pao2 / (data.fio2 / 100);

  const {
    score,
    risk
  } = calculateHACORScore({
    heartRate: data.heartRate,
    ph: data.ph,
    gcs: data.consciousness,
    pfRatio,
    respiratoryRate: data.respiratoryRate
  });
  return {
    hacorScore: score,
    hacorRisk: risk
  };
}
export function generateNIVAlerts(record: Partial<NIVRecord>): string[] {
  const alerts: string[] = [];

  // HACOR alerts
  if (record.hacorScore !== undefined) {
    if (record.hacorScore > 10) {
      alerts.push('⚠️ HACOR > 10 - Alto riesgo de fracaso de VNI. Considerar escalada a VMI si no hay mejoría');
    } else if (record.hacorScore > 5) {
      alerts.push('HACOR 6-10 - Riesgo intermedio. Monitoreo estrecho y reevaluación frecuente');
    } else {
      alerts.push('✓ HACOR ≤ 5 - Bajo riesgo de fracaso de VNI (punto de corte validado a 1h de VNI)');
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