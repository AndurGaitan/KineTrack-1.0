import { NIVRecord, NIVSession, RiskLevel } from '../types';
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

  // Acid-base interpretation (same logic as vmiCalculations.ts)
  if (record.ph !== undefined && record.hco3 !== undefined) {
    if (record.ph < 7.35) {
      if (record.hco3 < 22) {
        alerts.push(`⚠️ Acidosis metabólica (pH: ${record.ph}, HCO₃: ${record.hco3}) - Evaluar causa y corrección`);
      } else {
        alerts.push(`⚠️ Acidosis respiratoria (pH: ${record.ph}) - Considerar ajuste ventilatorio`);
      }
    } else if (record.ph > 7.45) {
      if (record.hco3 > 26) {
        alerts.push(`⚡ Alcalosis metabólica (pH: ${record.ph}, HCO₃: ${record.hco3})`);
      }
    }
  }

  // Hypercapnia
  if (record.paco2 !== undefined && record.paco2 > 45) {
    alerts.push(`PaCO₂ > 45 mmHg (${record.paco2}) - Retención de CO₂, vigilar respuesta a VNI`);
  }

  return alerts;
}

export interface NIVUsageSummary {
  activeSession?: NIVSession;
  hoursUsedLast24h: number;
  consecutiveDaysWithoutNIV: number;
}

/**
 * Derives intermittency/weaning tracking from documented NIV sessions
 * (start/end windows), without asking for anything extra: hours of actual
 * NIV use in the last rolling 24h, and consecutive days without NIV use
 * (0 while a session is active, floor of hours since the last session ended
 * otherwise — or 0 if no session has ever been logged).
 */
export function computeNIVUsageSummary(sessions: NIVSession[], now: Date = new Date()): NIVUsageSummary {
  const activeSession = sessions.find((s) => !s.endAt);

  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hoursUsedLast24h = sessions.reduce((total, session) => {
    const start = new Date(session.startAt);
    const end = session.endAt ? new Date(session.endAt) : now;
    const overlapStart = start > windowStart ? start : windowStart;
    const overlapEnd = end < now ? end : now;
    const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
    return total + (overlapMs > 0 ? overlapMs / (60 * 60 * 1000) : 0);
  }, 0);

  let consecutiveDaysWithoutNIV = 0;
  if (!activeSession && sessions.length > 0) {
    const lastEndedAt = sessions
      .filter((s) => s.endAt)
      .map((s) => new Date(s.endAt!).getTime())
      .reduce((latest, t) => Math.max(latest, t), 0);
    if (lastEndedAt > 0) {
      consecutiveDaysWithoutNIV = Math.floor((now.getTime() - lastEndedAt) / (24 * 60 * 60 * 1000));
    }
  }

  return {
    activeSession,
    hoursUsedLast24h: Math.round(hoursUsedLast24h * 10) / 10,
    consecutiveDaysWithoutNIV,
  };
}