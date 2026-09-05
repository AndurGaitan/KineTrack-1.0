import { HFNCRecord, RiskLevel } from '../types';
export interface HFNCCalculations {
  roxIndex: number;
  roxRisk: RiskLevel;
}
export function calculateROXForHFNC(data: {
  spo2: number;
  fio2: number; // % (e.g. 40 = 40%)
  respiratoryRate: number;
}): HFNCCalculations {
  // ROX = (SpO2 / FiO2) / RR, where FiO2 must be a fraction (0.21-1.0).
  // FiO2 is entered/stored here as a percentage, so it must be converted.
  const fio2Fraction = data.fio2 / 100;
  const roxIndex = data.spo2 / fio2Fraction / data.respiratoryRate;

  // Risk interpretation
  let risk: RiskLevel = 'low';
  if (roxIndex >= 4.88) risk = 'low';else if (roxIndex >= 3.85) risk = 'medium';else risk = 'high';
  return {
    roxIndex: Number(roxIndex.toFixed(2)),
    roxRisk: risk
  };
}
export function generateHFNCAlerts(record: Partial<HFNCRecord>): string[] {
  const alerts: string[] = [];

  // ROX alerts
  if (record.roxIndex !== undefined) {
    if (record.roxIndex >= 4.88) {
      alerts.push('✓ ROX ≥ 4.88 - Bajo riesgo de fracaso de HFNC. Buena respuesta al tratamiento');
    } else if (record.roxIndex >= 3.85) {
      alerts.push('ROX 3.85-4.88 - Riesgo moderado. Monitoreo estrecho y reevaluación');
    } else {
      alerts.push('ROX < 3.85 - Alto riesgo de fracaso. Considerar escalada a VNI o VMI');
    }
  }

  // Flow alerts
  if (record.flow !== undefined) {
    if (record.flow < 30) {
      alerts.push('Flujo < 30 L/min - Verificar si es adecuado para HFNC o considerar dispositivo convencional');
    } else if (record.flow > 60) {
      alerts.push('Flujo muy alto (> 60 L/min) - Verificar tolerancia del paciente');
    }
  }

  // FiO2 alerts
  if (record.fio2 && record.fio2 > 60) {
    alerts.push('FiO₂ > 60% - Evaluar si HFNC es suficiente o si requiere soporte ventilatorio');
  }

  // Humidification alerts
  if (!record.humidificationWorking) {
    alerts.push('Humidificación no funcionando - Riesgo de sequedad de mucosas y menor efectividad');
  }

  // Cannula fit alerts
  if (record.cannulaFit === 'significant-leak') {
    alerts.push('Fuga significativa en cánula - Revisar tamaño y posición para optimizar efectividad');
  } else if (record.cannulaFit === 'discomfort') {
    alerts.push('Paciente refiere molestias - Evaluar ajuste y considerar cambio de tamaño');
  }
  return alerts;
}