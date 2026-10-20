import { ReactNode, useEffect, useState, createContext, useContext } from 'react';
import { AppState, User, Patient, ScoreRecord, VMIRecord, NIVRecord, NIVSession, HFNCRecord, TrachRecord, OxygenRecord, SupportType, AirwayEventInput, Prestacion, SpontaneousVentilationPeriod, SVModality, SVInterruptionReason, AppStage, PveDecision, MobilizationStart, MobilizationContraindication } from '../types';
import { PatientClosure, ClinicalObservationType } from '../domain/models';
import {
  observationToVMIRecord,
  observationToNIVRecord,
  observationToHFNCRecord,
} from '../domain/adapters/observationAdapter';
import { clearToken, getToken, setToken } from '../api/client';
import * as authApi from '../api/authApi';
import * as sectorsApi from '../api/sectorsApi';
import * as patientsApi from '../api/patientsApi';
import * as observationsApi from '../api/observationsApi';
import * as scoresApi from '../api/scoresApi';
import * as nivSessionsApi from '../api/nivSessionsApi';
import * as spontaneousVentilationApi from '../api/spontaneousVentilationApi';
import * as prestacionesApi from '../api/prestacionesApi';
import * as settingsApi from '../api/settingsApi';
import * as pveDecisionsApi from '../api/pveDecisionsApi';
import type { CreatePveDecisionInput } from '../api/pveDecisionsApi';
import * as mobilizationApi from '../api/mobilizationApi';
import type { CreatePrestacionInput } from '../api/prestacionesApi';

/** Qué partes de la app están visibles según la etapa de uso. */
export interface AppFeatures {
  /** Gasometría arterial / HACOR en VNI y VMI. */
  gasometry: boolean;
  /** Escala de nivel de movilización en monitorización VMI y KTM. */
  mobilizationLevel: boolean;
  /** Módulo de traqueostomía y ventilación espontánea. */
  tracheostomy: boolean;
  /** Cronograma de personal. */
  schedule: boolean;
  /** Destete por decisión de PVE (etapa 1) en vez de los campos de SBT de la monitorización. */
  simplifiedWeaning: boolean;
}

interface AppContextType extends AppState {
  features: AppFeatures;
  setStage: (stage: AppStage) => Promise<void>;
  addPveDecision: (input: CreatePveDecisionInput) => Promise<boolean>;
  deletePveDecision: (id: string) => Promise<void>;
  getPatientPveDecisions: (patientId: string) => PveDecision[];
  startMobilization: (patientId: string, startedAt?: string, notes?: string) => Promise<boolean>;
  deleteMobilizationStart: (id: string) => Promise<void>;
  getEpisodeMobilizationStart: (episodeId: string | undefined) => MobilizationStart | undefined;
  addMobilizationContraindication: (input: mobilizationApi.CreateContraindicationInput) => Promise<boolean>;
  liftMobilizationContraindication: (id: string, endAt?: string) => Promise<void>;
  deleteMobilizationContraindication: (id: string) => Promise<void>;
  getPatientMobilizationContraindications: (patientId: string) => MobilizationContraindication[];
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string) => Promise<void>;
  addPatient: (
    patient: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'> & { admissionDate?: string }
  ) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  closePatient: (id: string, closure: PatientClosure) => Promise<void>;
  changeSupportType: (
    patientId: string,
    newSupport: SupportType,
    reason?: string,
    date?: string,
    airwayEvent?: AirwayEventInput,
    location?: { sectorId: string; bedId: string }
  ) => Promise<void>;
  refreshSectors: () => Promise<void>;
  getActiveEpisode: (patientId: string) => any;
  getPatientEpisodes: (patientId: string) => any[];
  addScore: (score: Omit<ScoreRecord, 'id' | 'timestamp'>) => Promise<void>;
  getPatientScores: (patientId: string) => ScoreRecord[];
  getSectorPatients: (sectorId: string, includeInactive?: boolean) => Patient[];
  addVMIRecord: (record: Omit<VMIRecord, 'id' | 'timestamp'> & { timestamp?: string }) => Promise<void>;
  getPatientVMIRecords: (patientId: string, episodeId?: string) => VMIRecord[];
  getVMIRecord: (id: string) => VMIRecord | undefined;
  addNIVRecord: (record: Omit<NIVRecord, 'id' | 'timestamp'> & { timestamp?: string }) => Promise<void>;
  getPatientNIVRecords: (patientId: string, episodeId?: string) => NIVRecord[];
  getNIVRecord: (id: string) => NIVRecord | undefined;
  startNIVSession: (patientId: string, episodeId?: string) => Promise<void>;
  closeNIVSession: (id: string, endAt?: string) => Promise<void>;
  addManualNIVSession: (session: Omit<NIVSession, 'id'>) => Promise<void>;
  deleteNIVSession: (id: string) => Promise<void>;
  getPatientNIVSessions: (patientId: string, episodeId?: string) => NIVSession[];
  addHFNCRecord: (record: Omit<HFNCRecord, 'id' | 'timestamp'> & { timestamp?: string }) => Promise<void>;
  getPatientHFNCRecords: (patientId: string, episodeId?: string) => HFNCRecord[];
  getHFNCRecord: (id: string) => HFNCRecord | undefined;
  addTrachRecord: (
    record: Omit<TrachRecord, 'id' | 'timestamp' | 'performedByUserId' | 'type' | 'alerts'> & { timestamp?: string }
  ) => Promise<void>;
  getPatientTrachRecords: (patientId: string, episodeId?: string) => TrachRecord[];
  getTrachRecord: (id: string) => TrachRecord | undefined;
  addOxygenRecord: (record: Omit<OxygenRecord, 'id' | 'timestamp' | 'performedByUserId' | 'type' | 'alerts'> & { timestamp?: string }) => Promise<boolean>;
  getPatientOxygenRecords: (patientId: string, episodeId?: string) => OxygenRecord[];
  addPrestacion: (input: CreatePrestacionInput) => Promise<void>;
  getPatientPrestaciones: (patientId: string) => Prestacion[];
  startSVPeriod: (patientId: string, modality: SVModality, episodeId?: string) => Promise<void>;
  closeSVPeriod: (id: string, result: { tolerated: boolean; interruptionReason?: SVInterruptionReason; endAt?: string }) => Promise<void>;
  addManualSVPeriod: (period: Omit<SpontaneousVentilationPeriod, 'id'>) => Promise<void>;
  deleteSVPeriod: (id: string) => Promise<void>;
  getPatientSVPeriods: (patientId: string) => SpontaneousVentilationPeriod[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  user: null,
  // Etapa 1 por defecto: coincide con el default del servidor.
  stage: 1,
  pveDecisions: [],
  mobilizationStarts: [],
  mobilizationContraindications: [],
  sectors: [],
  patients: [],
  scores: [],
  vmiRecords: [],
  nivRecords: [],
  nivSessions: [],
  hfncRecords: [],
  trachRecords: [],
  oxygenRecords: [],
  prestaciones: [],
  spontaneousVentilation: [],
};

/** Splits the flat observations list returned by the API into the legacy per-type record shapes the UI expects. */
function splitObservationsIntoLegacyRecords(observations: (ClinicalObservationType | TrachRecord | OxygenRecord)[]) {
  const vmiRecords: VMIRecord[] = [];
  const nivRecords: NIVRecord[] = [];
  const hfncRecords: HFNCRecord[] = [];
  const trachRecords: TrachRecord[] = [];
  const oxygenRecords: OxygenRecord[] = [];
  for (const obs of observations) {
    if (obs.type === 'imv') vmiRecords.push(observationToVMIRecord(obs));
    else if (obs.type === 'niv') nivRecords.push(observationToNIVRecord(obs));
    else if (obs.type === 'hfnc') hfncRecords.push(observationToHFNCRecord(obs));
    else if (obs.type === 'oxigeno') oxygenRecords.push(obs);
    else trachRecords.push(obs);
  }
  return { vmiRecords, nivRecords, hfncRecords, trachRecords, oxygenRecords };
}

/** Reports a failed mutation without breaking the fire-and-forget call sites that don't await these methods. */
function reportError(action: string, error: unknown) {
  console.error(`[KineTrack] ${action} failed:`, error);
  const message = error instanceof Error ? error.message : 'Error desconocido';
  window.alert(`No se pudo completar la acción (${action}): ${message}`);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Loads sectors, patients, and every patient's observations/scores/NIV
  // sessions/prestaciones. Not paginated — fine at ICU-ward scale — but
  // batched into a fixed 6 requests total (not 2 + 4 per patient): with the
  // shared DB's connection pool, firing several requests per patient on
  // every login was the single biggest slowdown in the app (~130 concurrent
  // requests with the patient counts this service already has).
  const loadWorkspace = async (user: User) => {
    const [sectors, patients] = await Promise.all([
      sectorsApi.listSectors(),
      patientsApi.listPatients({ includeInactive: true }),
    ]);

    const patientIds = patients.map((p) => p.id);
    const settings = await settingsApi.getSettings().catch(() => ({ stage: 1 as AppStage }));
    const emptyMobilization: mobilizationApi.MobilizationData = { starts: [], contraindications: [] };
    const [observations, scores, nivSessions, prestaciones, spontaneousVentilation, pveDecisions, mobilization] =
      patientIds.length === 0
        ? [[], [], [], [], [], [], emptyMobilization]
        : await Promise.all([
            observationsApi.listObservations({ patientIds }),
            scoresApi.listScores({ patientIds }),
            nivSessionsApi.listNivSessions({ patientIds }),
            prestacionesApi.listPrestaciones({ patientIds }),
            spontaneousVentilationApi.listSVPeriods({ patientIds }),
            pveDecisionsApi.listPveDecisions({ patientIds }),
            mobilizationApi.listMobilization({ patientIds }),
          ]);

    const { vmiRecords, nivRecords, hfncRecords, trachRecords, oxygenRecords } = splitObservationsIntoLegacyRecords(observations);

    setState({
      user,
      stage: settings.stage,
      pveDecisions: pveDecisions as PveDecision[],
      mobilizationStarts: (mobilization as mobilizationApi.MobilizationData).starts,
      mobilizationContraindications: (mobilization as mobilizationApi.MobilizationData).contraindications,
      sectors,
      patients,
      scores,
      vmiRecords,
      nivRecords,
      nivSessions,
      hfncRecords,
      trachRecords,
      oxygenRecords,
      prestaciones,
      spontaneousVentilation,
    });
  };

  // On mount: if a session token is stored, validate it and load the workspace.
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { user } = await authApi.me();
        await loadWorkspace(user);
      } catch (error) {
        console.error('[KineTrack] Session restore failed:', error);
        clearToken();
        setState(initialState);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { token, user } = await authApi.login({ email, password });
      setToken(token);
      setIsLoading(true);
      await loadWorkspace(user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setState(initialState);
  };

  const updateProfile = async (name: string) => {
    try {
      const { user } = await authApi.updateMe(name);
      setState((prev) => ({ ...prev, user }));
    } catch (error) {
      reportError('actualizar perfil', error);
      throw error;
    }
  };

  const addPatient = async (
    patientData: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'> & { admissionDate?: string }
  ) => {
    try {
      const patient = await patientsApi.createPatient({
        alias: patientData.alias,
        sectorId: patientData.sectorId,
        bedId: patientData.bedId,
        supportType: patientData.supportType,
        predictedBodyWeight: patientData.predictedBodyWeight,
        age: patientData.age,
        admissionDiagnosis: patientData.admissionDiagnosis,
        antecedentes: patientData.antecedentes,
        sex: patientData.sex,
        heightCm: patientData.heightCm,
        admissionDate: patientData.admissionDate,
      });
      setState((prev) => ({ ...prev, patients: [...prev.patients, patient] }));
    } catch (error) {
      reportError('crear paciente', error);
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      const patient = await patientsApi.updatePatient(id, {
        alias: updates.alias,
        sectorId: updates.sectorId,
        bedId: updates.bedId,
        predictedBodyWeight: updates.predictedBodyWeight,
        age: updates.age,
        admissionDiagnosis: updates.admissionDiagnosis,
        antecedentes: updates.antecedentes,
        sex: updates.sex,
        heightCm: updates.heightCm,
        airwayType: updates.airwayType,
        tracheostomyDate: updates.tracheostomyDate,
      });
      setState((prev) => ({ ...prev, patients: prev.patients.map((p) => (p.id === id ? patient : p)) }));
    } catch (error) {
      reportError('actualizar paciente', error);
    }
  };

  const deletePatient = async (id: string) => {
    try {
      await patientsApi.deletePatient(id);
      setState((prev) => ({
        ...prev,
        patients: prev.patients.filter((p) => p.id !== id),
        scores: prev.scores.filter((s) => s.patientId !== id),
        vmiRecords: prev.vmiRecords.filter((v) => v.patientId !== id),
        nivRecords: prev.nivRecords.filter((n) => n.patientId !== id),
        nivSessions: prev.nivSessions.filter((s) => s.patientId !== id),
        hfncRecords: prev.hfncRecords.filter((h) => h.patientId !== id),
        trachRecords: prev.trachRecords.filter((t) => t.patientId !== id),
        oxygenRecords: prev.oxygenRecords.filter((o) => o.patientId !== id),
        prestaciones: prev.prestaciones.filter((p) => p.patientId !== id),
        spontaneousVentilation: prev.spontaneousVentilation.filter((s) => s.patientId !== id),
        pveDecisions: prev.pveDecisions.filter((d) => d.patientId !== id),
        mobilizationStarts: prev.mobilizationStarts.filter((m) => m.patientId !== id),
        mobilizationContraindications: prev.mobilizationContraindications.filter((m) => m.patientId !== id),
      }));
    } catch (error) {
      reportError('eliminar paciente', error);
    }
  };

  const closePatient = async (id: string, closure: PatientClosure) => {
    try {
      const patient = await patientsApi.closePatient(id, closure);
      setState((prev) => ({ ...prev, patients: prev.patients.map((p) => (p.id === id ? patient : p)) }));
    } catch (error) {
      reportError('cerrar caso del paciente', error);
    }
  };

  const changeSupportType = async (
    patientId: string,
    newSupport: SupportType,
    reason?: string,
    date?: string,
    airwayEvent?: AirwayEventInput,
    location?: { sectorId: string; bedId: string }
  ) => {
    try {
      const patient = await patientsApi.changeSupportType(patientId, {
        newSupport,
        reason,
        date,
        airwayEvent,
        sectorId: location?.sectorId,
        bedId: location?.bedId,
      });
      setState((prev) => ({ ...prev, patients: prev.patients.map((p) => (p.id === patientId ? patient : p)) }));
    } catch (error) {
      reportError('cambiar tipo de soporte', error);
    }
  };

  const refreshSectors = async () => {
    try {
      const sectors = await sectorsApi.listSectors(true);
      setState((prev) => ({ ...prev, sectors }));
    } catch (error) {
      reportError('actualizar sectores', error);
    }
  };

  const getActiveEpisode = (patientId: string) => {
    const patient = state.patients.find((p) => p.id === patientId);
    return patient?.episodes.find((ep) => !ep.endAt);
  };

  const getPatientEpisodes = (patientId: string) => {
    const patient = state.patients.find((p) => p.id === patientId);
    return patient?.episodes || [];
  };

  const addScore = async (score: Omit<ScoreRecord, 'id' | 'timestamp'>) => {
    try {
      // value/risk are recomputed authoritatively by the server from `inputs`.
      const created = await scoresApi.createScore({
        type: score.type,
        patientId: score.patientId,
        episodeId: score.episodeId,
        inputs: score.inputs,
      });
      setState((prev) => ({ ...prev, scores: [...prev.scores, created] }));
    } catch (error) {
      reportError('guardar score', error);
    }
  };

  const getPatientScores = (patientId: string) => {
    return state.scores
      .filter((s) => s.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getSectorPatients = (sectorId: string, includeInactive: boolean = false) => {
    return state.patients.filter((p) => p.sectorId === sectorId && (includeInactive || p.status === 'active'));
  };

  const addVMIRecord = async (record: Omit<VMIRecord, 'id' | 'timestamp'> & { timestamp?: string }) => {
    try {
      // Measured fields only — the server recomputes `calculated`/`alerts`.
      const obs = await observationsApi.createObservation({ ...record, type: 'imv' });
      const newRecord = observationToVMIRecord(obs as Extract<ClinicalObservationType, { type: 'imv' }>);
      setState((prev) => ({ ...prev, vmiRecords: [...prev.vmiRecords, newRecord] }));
    } catch (error) {
      reportError('guardar registro VMI', error);
    }
  };

  const getPatientVMIRecords = (patientId: string, episodeId?: string) => {
    return state.vmiRecords
      .filter((v) => v.patientId === patientId && (!episodeId || v.episodeId === episodeId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getVMIRecord = (id: string) => state.vmiRecords.find((v) => v.id === id);

  const addNIVRecord = async (record: Omit<NIVRecord, 'id' | 'timestamp'> & { timestamp?: string }) => {
    try {
      const obs = await observationsApi.createObservation({ ...record, type: 'niv' });
      const newRecord = observationToNIVRecord(obs as Extract<ClinicalObservationType, { type: 'niv' }>);
      setState((prev) => ({ ...prev, nivRecords: [...prev.nivRecords, newRecord] }));
    } catch (error) {
      reportError('guardar registro VNI', error);
    }
  };

  const getPatientNIVRecords = (patientId: string, episodeId?: string) => {
    return state.nivRecords
      .filter((n) => n.patientId === patientId && (!episodeId || n.episodeId === episodeId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getNIVRecord = (id: string) => state.nivRecords.find((n) => n.id === id);

  const startNIVSession = async (patientId: string, episodeId?: string) => {
    try {
      const session = await nivSessionsApi.createNivSession({ patientId, episodeId });
      setState((prev) => ({ ...prev, nivSessions: [...prev.nivSessions, session] }));
    } catch (error) {
      reportError('iniciar sesión de VNI', error);
    }
  };

  const closeNIVSession = async (id: string, endAt?: string) => {
    try {
      const session = await nivSessionsApi.updateNivSession(id, { endAt: endAt ?? new Date().toISOString() });
      setState((prev) => ({ ...prev, nivSessions: prev.nivSessions.map((s) => (s.id === id ? session : s)) }));
    } catch (error) {
      reportError('finalizar sesión de VNI', error);
    }
  };

  const addManualNIVSession = async (input: Omit<NIVSession, 'id'>) => {
    try {
      const session = await nivSessionsApi.createNivSession(input);
      setState((prev) => ({ ...prev, nivSessions: [...prev.nivSessions, session] }));
    } catch (error) {
      reportError('cargar sesión de VNI', error);
    }
  };

  const deleteNIVSession = async (id: string) => {
    try {
      await nivSessionsApi.deleteNivSession(id);
      setState((prev) => ({ ...prev, nivSessions: prev.nivSessions.filter((s) => s.id !== id) }));
    } catch (error) {
      reportError('eliminar sesión de VNI', error);
    }
  };

  const getPatientNIVSessions = (patientId: string, episodeId?: string) => {
    return state.nivSessions
      .filter((s) => s.patientId === patientId && (!episodeId || s.episodeId === episodeId))
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  };

  const addHFNCRecord = async (record: Omit<HFNCRecord, 'id' | 'timestamp'> & { timestamp?: string }) => {
    try {
      const obs = await observationsApi.createObservation({ ...record, type: 'hfnc' });
      const newRecord = observationToHFNCRecord(obs as Extract<ClinicalObservationType, { type: 'hfnc' }>);
      setState((prev) => ({ ...prev, hfncRecords: [...prev.hfncRecords, newRecord] }));
    } catch (error) {
      reportError('guardar registro HFNC', error);
    }
  };

  const getPatientHFNCRecords = (patientId: string, episodeId?: string) => {
    return state.hfncRecords
      .filter((h) => h.patientId === patientId && (!episodeId || h.episodeId === episodeId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getHFNCRecord = (id: string) => state.hfncRecords.find((h) => h.id === id);

  const addTrachRecord = async (
    record: Omit<TrachRecord, 'id' | 'timestamp' | 'performedByUserId' | 'type' | 'alerts'> & { timestamp?: string }
  ) => {
    try {
      const obs = await observationsApi.createObservation({ ...record, type: 'traqueostomia' });
      setState((prev) => ({ ...prev, trachRecords: [...prev.trachRecords, obs as TrachRecord] }));
    } catch (error) {
      reportError('guardar seguimiento de traqueostomía', error);
    }
  };

  const getPatientTrachRecords = (patientId: string, episodeId?: string) => {
    return state.trachRecords
      .filter((t) => t.patientId === patientId && (!episodeId || t.episodeId === episodeId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getTrachRecord = (id: string) => state.trachRecords.find((t) => t.id === id);

  const addOxygenRecord = async (
    record: Omit<OxygenRecord, 'id' | 'timestamp' | 'performedByUserId' | 'type' | 'alerts'> & { timestamp?: string }
  ) => {
    try {
      const obs = await observationsApi.createObservation({ ...record, type: 'oxigeno' });
      setState((prev) => ({ ...prev, oxygenRecords: [...prev.oxygenRecords, obs as OxygenRecord] }));
      return true;
    } catch (error) {
      reportError('guardar registro de oxigenoterapia', error);
      return false;
    }
  };

  const getPatientOxygenRecords = (patientId: string, episodeId?: string) => {
    return state.oxygenRecords
      .filter((o) => o.patientId === patientId && (!episodeId || o.episodeId === episodeId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const addPrestacion = async (input: CreatePrestacionInput) => {
    // No reportError here (unlike the other add* methods): ActivityCard
    // awaits this call and shows its own inline error message, so a global
    // alert on top would just duplicate it.
    const created = await prestacionesApi.createPrestacion(input);
    setState((prev) => ({ ...prev, prestaciones: [...prev.prestaciones, created] }));
  };

  const getPatientPrestaciones = (patientId: string) => {
    return state.prestaciones
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Ventilación espontánea (traqueostomía en VMI). Mismo patrón que las sesiones de VNI.
  const startSVPeriod = async (patientId: string, modality: SVModality, episodeId?: string) => {
    try {
      const period = await spontaneousVentilationApi.createSVPeriod({ patientId, modality, episodeId });
      setState((prev) => ({ ...prev, spontaneousVentilation: [...prev.spontaneousVentilation, period] }));
    } catch (error) {
      reportError('iniciar período de ventilación espontánea', error);
    }
  };

  const closeSVPeriod = async (
    id: string,
    result: { tolerated: boolean; interruptionReason?: SVInterruptionReason; endAt?: string }
  ) => {
    try {
      const period = await spontaneousVentilationApi.updateSVPeriod(id, {
        endAt: result.endAt ?? new Date().toISOString(),
        tolerated: result.tolerated,
        interruptionReason: result.tolerated ? undefined : result.interruptionReason,
      });
      setState((prev) => ({ ...prev, spontaneousVentilation: prev.spontaneousVentilation.map((s) => (s.id === id ? period : s)) }));
    } catch (error) {
      reportError('finalizar período de ventilación espontánea', error);
    }
  };

  const addManualSVPeriod = async (input: Omit<SpontaneousVentilationPeriod, 'id'>) => {
    try {
      const period = await spontaneousVentilationApi.createSVPeriod(input);
      setState((prev) => ({ ...prev, spontaneousVentilation: [...prev.spontaneousVentilation, period] }));
    } catch (error) {
      reportError('cargar período de ventilación espontánea', error);
    }
  };

  const deleteSVPeriod = async (id: string) => {
    try {
      await spontaneousVentilationApi.deleteSVPeriod(id);
      setState((prev) => ({ ...prev, spontaneousVentilation: prev.spontaneousVentilation.filter((s) => s.id !== id) }));
    } catch (error) {
      reportError('eliminar período de ventilación espontánea', error);
    }
  };

  const getPatientSVPeriods = (patientId: string) => {
    return state.spontaneousVentilation
      .filter((s) => s.patientId === patientId)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  };

  // Etapa de uso (la cambia el coordinador). Las pantallas leen `features`.
  const setStage = async (stage: AppStage) => {
    try {
      const result = await settingsApi.updateStage(stage);
      setState((prev) => ({ ...prev, stage: result.stage }));
    } catch (error) {
      reportError('cambiar la etapa', error);
    }
  };

  // La gasometría se oculta en la etapa 1, salvo para el coordinador, que puede cargarla siempre.
  const features: AppFeatures =
    state.stage === 1
      ? { gasometry: state.user?.role === 'coordinador', mobilizationLevel: false, tracheostomy: false, schedule: false, simplifiedWeaning: true }
      : { gasometry: true, mobilizationLevel: true, tracheostomy: true, schedule: true, simplifiedWeaning: false };

  // Decisiones de PVE (realizada / contraindicada / no realizada).
  const addPveDecision = async (input: CreatePveDecisionInput) => {
    try {
      const created = await pveDecisionsApi.createPveDecision(input);
      setState((prev) => ({ ...prev, pveDecisions: [...prev.pveDecisions, created] }));
      return true;
    } catch (error) {
      reportError('guardar decisión de PVE', error);
      return false;
    }
  };

  const deletePveDecision = async (id: string) => {
    try {
      await pveDecisionsApi.deletePveDecision(id);
      setState((prev) => ({ ...prev, pveDecisions: prev.pveDecisions.filter((d) => d.id !== id) }));
    } catch (error) {
      reportError('eliminar decisión de PVE', error);
    }
  };

  const getPatientPveDecisions = (patientId: string) => {
    return state.pveDecisions
      .filter((d) => d.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Movilización precoz: inicio (uno por episodio de VMI) y contraindicaciones que pausan la ventana de 72 h.
  const startMobilization = async (patientId: string, startedAt?: string, notes?: string) => {
    try {
      const created = await mobilizationApi.startMobilization({ patientId, startedAt, notes });
      setState((prev) => ({ ...prev, mobilizationStarts: [...prev.mobilizationStarts, created] }));
      return true;
    } catch (error) {
      reportError('registrar inicio de movilización', error);
      return false;
    }
  };

  const deleteMobilizationStart = async (id: string) => {
    try {
      await mobilizationApi.deleteMobilizationStart(id);
      setState((prev) => ({ ...prev, mobilizationStarts: prev.mobilizationStarts.filter((m) => m.id !== id) }));
    } catch (error) {
      reportError('eliminar inicio de movilización', error);
    }
  };

  const getEpisodeMobilizationStart = (episodeId: string | undefined) => {
    if (!episodeId) return undefined;
    return state.mobilizationStarts.find((m) => m.episodeId === episodeId);
  };

  const addMobilizationContraindication = async (input: mobilizationApi.CreateContraindicationInput) => {
    try {
      const created = await mobilizationApi.createContraindication(input);
      setState((prev) => ({ ...prev, mobilizationContraindications: [...prev.mobilizationContraindications, created] }));
      return true;
    } catch (error) {
      reportError('registrar contraindicación de movilización', error);
      return false;
    }
  };

  const liftMobilizationContraindication = async (id: string, endAt?: string) => {
    try {
      const updated = await mobilizationApi.updateContraindication(id, { endAt: endAt ?? new Date().toISOString() });
      setState((prev) => ({
        ...prev,
        mobilizationContraindications: prev.mobilizationContraindications.map((c) => (c.id === id ? updated : c)),
      }));
    } catch (error) {
      reportError('levantar contraindicación de movilización', error);
    }
  };

  const deleteMobilizationContraindication = async (id: string) => {
    try {
      await mobilizationApi.deleteContraindication(id);
      setState((prev) => ({
        ...prev,
        mobilizationContraindications: prev.mobilizationContraindications.filter((c) => c.id !== id),
      }));
    } catch (error) {
      reportError('eliminar contraindicación de movilización', error);
    }
  };

  const getPatientMobilizationContraindications = (patientId: string) => {
    return state.mobilizationContraindications
      .filter((c) => c.patientId === patientId)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        features,
        setStage,
        addPveDecision,
        deletePveDecision,
        getPatientPveDecisions,
        startMobilization,
        deleteMobilizationStart,
        getEpisodeMobilizationStart,
        addMobilizationContraindication,
        liftMobilizationContraindication,
        deleteMobilizationContraindication,
        getPatientMobilizationContraindications,
        isLoading,
        authError,
        login,
        logout,
        updateProfile,
        addPatient,
        updatePatient,
        deletePatient,
        closePatient,
        changeSupportType,
        refreshSectors,
        getActiveEpisode,
        getPatientEpisodes,
        addScore,
        getPatientScores,
        getSectorPatients,
        addVMIRecord,
        getPatientVMIRecords,
        getVMIRecord,
        addNIVRecord,
        getPatientNIVRecords,
        getNIVRecord,
        startNIVSession,
        closeNIVSession,
        addManualNIVSession,
        deleteNIVSession,
        getPatientNIVSessions,
        addHFNCRecord,
        getPatientHFNCRecords,
        getHFNCRecord,
        addTrachRecord,
        getPatientTrachRecords,
        getTrachRecord,
        addOxygenRecord,
        getPatientOxygenRecords,
        addPrestacion,
        getPatientPrestaciones,
        startSVPeriod,
        closeSVPeriod,
        addManualSVPeriod,
        deleteSVPeriod,
        getPatientSVPeriods,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
