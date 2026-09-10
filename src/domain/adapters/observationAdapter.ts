/**
 * Observation Adapter - Converts between domain models and legacy storage format
 */

import { IMVObservation, NIVObservation, HFNCObservation, ClinicalObservationType } from '../models';
import { VMIRecord, NIVRecord, HFNCRecord } from '../../types';

/**
 * Converts legacy VMIRecord to domain IMVObservation
 */
export function vmiRecordToObservation(record: VMIRecord): IMVObservation {
  return {
    id: record.id,
    patientId: record.patientId,
    episodeId: record.episodeId,
    timestamp: record.timestamp,
    type: 'imv',
    // Ventilator settings
    ventMode: record.ventMode,
    ventModeOther: record.ventModeOther,
    controlVariable: record.controlVariable,
    predictedBodyWeight: record.predictedBodyWeight,
    tidalVolumeSet: record.tidalVolumeSet,
    tidalVolumeExpired: record.tidalVolumeExpired,
    controlPressure: record.controlPressure,
    supportPressure: record.supportPressure,
    inspiratoryTime: record.inspiratoryTime,
    plateauPressure: record.plateauPressure,
    peakPressure: record.peakPressure,
    peep: record.peep,
    fio2: record.fio2,
    respiratoryRate: record.respiratoryRate,
    hasAsynchrony: record.hasAsynchrony,
    asynchronyTypes: record.asynchronyTypes,
    asynchronyFrequency: record.asynchronyFrequency,
    spo2: record.spo2,
    pao2: record.pao2,
    paco2: record.paco2,
    ph: record.ph,
    hco3: record.hco3,
    baseExcess: record.baseExcess,
    weaningStatus: record.weaningStatus,
    sbtPerformed: record.sbtPerformed,
    sbtType: record.sbtType,
    sbtResult: record.sbtResult,
    sbtFailureReason: record.sbtFailureReason,
    mobilizationLevel: record.mobilizationLevel,
    mobilizationBarrier: record.mobilizationBarrier,
    calculated: {
      vtPerKg: record.vtPerKg,
      drivingPressure: record.drivingPressure,
      pfRatio: record.pfRatio,
      compliance: record.compliance,
      mechanicalPower: record.mechanicalPower,
      protectiveVentilation: record.protectiveVentilation
    },
    alerts: record.alerts
  };
}

/**
 * Converts domain IMVObservation to legacy VMIRecord
 */
export function observationToVMIRecord(obs: IMVObservation): VMIRecord {
  return {
    id: obs.id,
    patientId: obs.patientId,
    episodeId: obs.episodeId,
    timestamp: obs.timestamp,
    ventMode: obs.ventMode,
    ventModeOther: obs.ventModeOther,
    controlVariable: obs.controlVariable,
    predictedBodyWeight: obs.predictedBodyWeight,
    tidalVolumeSet: obs.tidalVolumeSet,
    tidalVolumeExpired: obs.tidalVolumeExpired,
    controlPressure: obs.controlPressure,
    supportPressure: obs.supportPressure,
    inspiratoryTime: obs.inspiratoryTime,
    plateauPressure: obs.plateauPressure,
    peakPressure: obs.peakPressure,
    peep: obs.peep,
    fio2: obs.fio2,
    respiratoryRate: obs.respiratoryRate,
    hasAsynchrony: obs.hasAsynchrony,
    asynchronyTypes: obs.asynchronyTypes,
    asynchronyFrequency: obs.asynchronyFrequency,
    spo2: obs.spo2,
    pao2: obs.pao2,
    paco2: obs.paco2,
    ph: obs.ph,
    hco3: obs.hco3,
    baseExcess: obs.baseExcess,
    weaningStatus: obs.weaningStatus,
    sbtPerformed: obs.sbtPerformed,
    sbtType: obs.sbtType,
    sbtResult: obs.sbtResult,
    sbtFailureReason: obs.sbtFailureReason,
    mobilizationLevel: obs.mobilizationLevel,
    mobilizationBarrier: obs.mobilizationBarrier,
    vtPerKg: obs.calculated.vtPerKg,
    drivingPressure: obs.calculated.drivingPressure,
    pfRatio: obs.calculated.pfRatio,
    compliance: obs.calculated.compliance,
    mechanicalPower: obs.calculated.mechanicalPower,
    protectiveVentilation: obs.calculated.protectiveVentilation,
    alerts: obs.alerts
  };
}

/**
 * Converts legacy NIVRecord to domain NIVObservation
 */
export function nivRecordToObservation(record: NIVRecord): NIVObservation {
  return {
    id: record.id,
    patientId: record.patientId,
    episodeId: record.episodeId,
    timestamp: record.timestamp,
    type: 'niv',
    interfaceType: record.interfaceType,
    interfaceOther: record.interfaceOther,
    skinIntegrity: record.skinIntegrity,
    lesionLocations: record.lesionLocations,
    skinNotes: record.skinNotes,
    mode: record.mode,
    modeOther: record.modeOther,
    supportPressure: record.supportPressure,
    peep: record.peep,
    expiratorySensitivity: record.expiratorySensitivity,
    fio2: record.fio2,
    leak: record.leak,
    heartRate: record.heartRate,
    ph: record.ph,
    consciousness: record.consciousness,
    pao2: record.pao2,
    paco2: record.paco2,
    hco3: record.hco3,
    spo2: record.spo2,
    baseExcess: record.baseExcess,
    respiratoryRate: record.respiratoryRate,
    previousIMVDays: record.previousIMVDays,
    calculated: {
      hacorScore: record.hacorScore,
      hacorRisk: record.hacorRisk
    },
    alerts: record.alerts
  };
}

/**
 * Converts domain NIVObservation to legacy NIVRecord
 */
export function observationToNIVRecord(obs: NIVObservation): NIVRecord {
  return {
    id: obs.id,
    patientId: obs.patientId,
    episodeId: obs.episodeId,
    timestamp: obs.timestamp,
    interfaceType: obs.interfaceType,
    interfaceOther: obs.interfaceOther,
    skinIntegrity: obs.skinIntegrity,
    lesionLocations: obs.lesionLocations,
    skinNotes: obs.skinNotes,
    mode: obs.mode,
    modeOther: obs.modeOther,
    supportPressure: obs.supportPressure,
    peep: obs.peep,
    expiratorySensitivity: obs.expiratorySensitivity,
    fio2: obs.fio2,
    leak: obs.leak,
    heartRate: obs.heartRate,
    ph: obs.ph,
    consciousness: obs.consciousness,
    pao2: obs.pao2,
    paco2: obs.paco2,
    hco3: obs.hco3,
    spo2: obs.spo2,
    baseExcess: obs.baseExcess,
    respiratoryRate: obs.respiratoryRate,
    previousIMVDays: obs.previousIMVDays,
    hacorScore: obs.calculated.hacorScore,
    hacorRisk: obs.calculated.hacorRisk,
    alerts: obs.alerts
  };
}

/**
 * Converts legacy HFNCRecord to domain HFNCObservation
 */
export function hfncRecordToObservation(record: HFNCRecord): HFNCObservation {
  return {
    id: record.id,
    patientId: record.patientId,
    episodeId: record.episodeId,
    timestamp: record.timestamp,
    type: 'hfnc',
    flow: record.flow,
    fio2: record.fio2,
    temperature: record.temperature,
    cannulaFit: record.cannulaFit,
    cannulaNotes: record.cannulaNotes,
    humidificationWorking: record.humidificationWorking,
    humidificationIssue: record.humidificationIssue,
    spo2: record.spo2,
    respiratoryRate: record.respiratoryRate,
    calculated: {
      roxIndex: record.roxIndex,
      roxRisk: record.roxRisk
    },
    alerts: record.alerts
  };
}

/**
 * Converts domain HFNCObservation to legacy HFNCRecord
 */
export function observationToHFNCRecord(obs: HFNCObservation): HFNCRecord {
  return {
    id: obs.id,
    patientId: obs.patientId,
    episodeId: obs.episodeId,
    timestamp: obs.timestamp,
    flow: obs.flow,
    fio2: obs.fio2,
    temperature: obs.temperature,
    cannulaFit: obs.cannulaFit,
    cannulaNotes: obs.cannulaNotes,
    humidificationWorking: obs.humidificationWorking,
    humidificationIssue: obs.humidificationIssue,
    spo2: obs.spo2,
    respiratoryRate: obs.respiratoryRate,
    roxIndex: obs.calculated.roxIndex,
    roxRisk: obs.calculated.roxRisk,
    alerts: obs.alerts
  };
}

/**
 * Converts any legacy record to domain observation
 */
export function recordToObservation(record: VMIRecord | NIVRecord | HFNCRecord): ClinicalObservationType {
  if ('vtPerKg' in record) {
    return vmiRecordToObservation(record as VMIRecord);
  }
  if ('hacorScore' in record) {
    return nivRecordToObservation(record as NIVRecord);
  }
  return hfncRecordToObservation(record as HFNCRecord);
}