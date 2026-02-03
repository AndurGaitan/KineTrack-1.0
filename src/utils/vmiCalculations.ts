import { VMIRecord, VentMode, VentControlVariable } from '../types';

export interface VMICalculations {
  vtPerKg: number;
  drivingPressure: number;
  pfRatio?: number;
  compliance?: number;
  mechanicalPower?: number;
  protectiveVentilation: boolean;
}

export type Sex = 'male' | 'female';

/**
 * Predicted Body Weight (PBW) - ARDSNet
 * Male:   50 + 0.91*(heightCm - 152.4)
 * Female: 45.5 + 0.91*(heightCm - 152.4)
 */
export function calculatePBWKg(heightCm: number, sex: Sex): number | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;

  const base = sex === 'male' ? 50 : 45.5;
  const pbw = base + 0.91 * (heightCm - 152.4);

  if (!Number.isFinite(pbw) || pbw < 20 || pbw > 250) return null;

  return Math.round(pbw * 10) / 10; // 1 decimal
}

/**
 * Calculates Mechanical Power (J/min)
 *
 * Formula for VC mode:
 * MP = 0.098 × RR × VT(L) × [Ppeak - 0.5 × (Pplat - PEEP)]
 *
 * For PC mode (approximation):
 * MP = 0.098 × RR × VT(L) × [PEEP + ΔPinsp]
 * Where ΔPinsp is estimated from driving pressure
 */
export function calculateMechanicalPower(data: {
  ventMode: VentMode;
  controlVariable: VentControlVariable;
  respiratoryRate?: number;
  tidalVolumeExpired: number;
  peep: number;
  plateauPressure: number;
  peakPressure?: number;
}): {
  value?: number;
  canCalculate: boolean;
  reason?: string;
  isApproximation: boolean;
} {
  const {
    controlVariable,
    respiratoryRate,
    tidalVolumeExpired,
    peep,
    plateauPressure,
    peakPressure
  } = data;

  if (!respiratoryRate || respiratoryRate <= 0) {
    return { canCalculate: false, reason: 'Frecuencia respiratoria requerida', isApproximation: false };
  }
  if (tidalVolumeExpired <= 0) {
    return { canCalculate: false, reason: 'Volumen tidal requerido', isApproximation: false };
  }
  if (plateauPressure < peep) {
    return { canCalculate: false, reason: 'Pplat debe ser ≥ PEEP', isApproximation: false };
  }

  const vtInLiters = tidalVolumeExpired / 1000;

  // VC mode with Ppeak available
  if (controlVariable === 'volume' && peakPressure && peakPressure > 0) {
    const mp = 0.098 * respiratoryRate * vtInLiters * (peakPressure - 0.5 * (plateauPressure - peep));
    return { value: Number(mp.toFixed(2)), canCalculate: true, isApproximation: false };
  }

  // PC mode or VC without Ppeak (approximation)
  if (controlVariable === 'pressure' || !peakPressure) {
    const drivingPressure = plateauPressure - peep;
    const estimatedPressure = peep + drivingPressure;
    const mp = 0.098 * respiratoryRate * vtInLiters * estimatedPressure;
    return {
      value: Number(mp.toFixed(2)),
      canCalculate: true,
      isApproximation: true,
      reason: controlVariable === 'pressure' ? 'Estimación para modo PC' : 'Ppeak no disponible, usando estimación'
    };
  }

  return { canCalculate: false, reason: 'Datos insuficientes', isApproximation: false };
}

// Helper: PBW efectivo (solo auto si hay antropometría; si no, usa predictedBodyWeight si viene)
function resolveEffectivePBW(record: Partial<VMIRecord>): number {
  const manualPBW =
    record.predictedBodyWeight && record.predictedBodyWeight > 0 ? record.predictedBodyWeight : 0;

  // si tu VMIRecord aún no tiene sex/heightCm, esto igual compila si record es "any" en runtime,
  // pero lo ideal es extender VMIRecord con heightCm?: number; sex?: 'male'|'female'
  const heightCm = (record as any).heightCm as number | undefined;
  const sex = (record as any).sex as Sex | undefined;

  const autoPBW = heightCm && sex ? calculatePBWKg(heightCm, sex) ?? 0 : 0;

  // default: prioriza manual si existe, sino auto
  return manualPBW || autoPBW;
}

export function calculateVMI(record: Partial<VMIRecord>): VMICalculations {
  const effectivePBW = resolveEffectivePBW(record);

  const vtPerKg =
    record.tidalVolumeExpired && effectivePBW > 0
      ? Number((record.tidalVolumeExpired / effectivePBW).toFixed(1))
      : 0;

  const drivingPressure =
    record.plateauPressure && record.peep !== undefined
      ? Number((record.plateauPressure - record.peep).toFixed(1))
      : 0;

  const pfRatio =
    record.pao2 && record.fio2 ? Number((record.pao2 / (record.fio2 / 100)).toFixed(0)) : undefined;

  const compliance =
    record.tidalVolumeExpired && drivingPressure > 0
      ? Number((record.tidalVolumeExpired / drivingPressure).toFixed(1))
      : undefined;

  let mechanicalPower: number | undefined;
  if (
    record.ventMode &&
    record.controlVariable &&
    record.respiratoryRate &&
    record.tidalVolumeExpired &&
    record.peep !== undefined &&
    record.plateauPressure
  ) {
    const mpResult = calculateMechanicalPower({
      ventMode: record.ventMode,
      controlVariable: record.controlVariable,
      respiratoryRate: record.respiratoryRate,
      tidalVolumeExpired: record.tidalVolumeExpired,
      peep: record.peep,
      plateauPressure: record.plateauPressure,
      peakPressure: record.peakPressure
    });
    mechanicalPower = mpResult.value;
  }

  const protectiveVentilation =
    vtPerKg > 0 &&
    vtPerKg <= 8 &&
    record.plateauPressure !== undefined &&
    record.plateauPressure <= 30 &&
    drivingPressure > 0 &&
    drivingPressure <= 15;

  return {
    vtPerKg,
    drivingPressure,
    pfRatio,
    compliance,
    mechanicalPower,
    protectiveVentilation
  };
}

export function generateVMIAlerts(record: Partial<VMIRecord>, calculations: VMICalculations): string[] {
  const alerts: string[] = [];

  const heightCm = (record as any).heightCm as number | undefined;
  const sex = (record as any).sex as Sex | undefined;

  // PBW sanity checks (solo auto)
  if (!heightCm || !sex) {
    alerts.push('ℹ️ Para calcular Vt/kg se requiere talla y sexo (PBW automático).');
  }
  if (heightCm && (heightCm < 120 || heightCm > 220)) {
    alerts.push(`⚠️ Talla fuera de rango habitual (${heightCm} cm) - verificar dato.`);
  }

  // Protective ventilation
  if (calculations.vtPerKg > 8) {
    alerts.push(`⚠️ Vt/kg elevado (${calculations.vtPerKg} ml/kg) - Riesgo de volutrauma. Target: ≤ 8 ml/kg`);
  } else if (calculations.vtPerKg > 0) {
    alerts.push(`✓ Vt/kg protectivo (${calculations.vtPerKg} ml/kg)`);
  }

  if (record.plateauPressure && record.plateauPressure > 30) {
    alerts.push(`⚠️ Pplat elevada (${record.plateauPressure} cmH₂O) - Riesgo de barotrauma. Target: ≤ 30 cmH₂O`);
  } else if (record.plateauPressure) {
    alerts.push(`✓ Pplat adecuada (${record.plateauPressure} cmH₂O)`);
  }

  if (calculations.drivingPressure > 15) {
    alerts.push(`⚠️ Driving Pressure elevada (${calculations.drivingPressure} cmH₂O) - Asociada a mayor mortalidad. Target: ≤ 15 cmH₂O`);
  } else if (calculations.drivingPressure > 0) {
    alerts.push(`✓ Driving Pressure adecuada (${calculations.drivingPressure} cmH₂O)`);
  }

  // Mechanical Power alerts
  if (calculations.mechanicalPower) {
    if (calculations.mechanicalPower > 17) {
      alerts.push(`⚠️ Mechanical Power elevado (${calculations.mechanicalPower} J/min) - Riesgo de VILI. Considerar optimización ventilatoria`);
    } else if (calculations.mechanicalPower > 12) {
      alerts.push(`⚡ Mechanical Power moderado (${calculations.mechanicalPower} J/min) - Monitoreo estrecho recomendado`);
    } else {
      alerts.push(`✓ Mechanical Power aceptable (${calculations.mechanicalPower} J/min)`);
    }
  }

  // Oxygenation
  if (calculations.pfRatio) {
    if (calculations.pfRatio < 100) {
      alerts.push(`⚠️ SDRA severo (P/F: ${calculations.pfRatio}) - Considerar estrategias de rescate`);
    } else if (calculations.pfRatio < 200) {
      alerts.push(`⚠️ SDRA moderado (P/F: ${calculations.pfRatio}) - Optimizar PEEP`);
    } else if (calculations.pfRatio < 300) {
      alerts.push(`⚡ SDRA leve (P/F: ${calculations.pfRatio})`);
    } else {
      alerts.push(`✓ Oxigenación adecuada (P/F: ${calculations.pfRatio})`);
    }
  }

  // Acid-base balance
  if (record.ph && record.hco3) {
    if (record.ph < 7.35) {
      if (record.hco3 < 22) {
        alerts.push(`⚠️ Acidosis metabólica (pH: ${record.ph}, HCO₃: ${record.hco3}) - Evaluar causa y corrección`);
      } else {
        alerts.push(`⚠️ Acidosis respiratoria (pH: ${record.ph}) - Considerar ajuste ventilatorio`);
      }
    } else if (record.ph > 7.45) {
      if (record.hco3 > 26) {
        alerts.push(`⚡ Alcalosis metabólica (pH: ${record.ph}, HCO₃: ${record.hco3})`);
      } else {
        alerts.push(`⚡ Alcalosis respiratoria (pH: ${record.ph}) - Evaluar hiperventilación`);
      }
    } else {
      alerts.push(`✓ Equilibrio ácido-base normal (pH: ${record.ph})`);
    }
  }

  // Compliance
  if (calculations.compliance) {
    if (calculations.compliance < 30) {
      alerts.push(`⚠️ Compliance baja (${calculations.compliance} ml/cmH₂O) - Pulmón rígido, considerar causas`);
    } else if (calculations.compliance > 80) {
      alerts.push(`⚡ Compliance alta (${calculations.compliance} ml/cmH₂O) - Verificar fugas o sobredistensión`);
    }
  }

  // Asynchrony
  if (record.hasAsynchrony && record.asynchronyFrequency === 'frequent') {
    alerts.push(`⚠️ Asincronía frecuente detectada - Optimizar parámetros ventilatorios y sedación`);
  }

  return alerts;
}