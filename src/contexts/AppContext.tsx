import { ReactNode, useEffect, useState, createContext, useContext } from 'react';
import { AppState, User, Patient, ScoreRecord, VMIRecord, NIVRecord, NIVSession, HFNCRecord, TrachRecord, SupportType, AirwayEventInput } from '../types';
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

interface AppContextType extends AppState {
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string) => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'>) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  closePatient: (id: string, closure: PatientClosure) => Promise<void>;
  changeSupportType: (
    patientId: string,
    newSupport: SupportType,
    reason?: string,
    date?: string,
    airwayEvent?: AirwayEventInput
  ) => Promise<void>;
  refreshSectors: () => Promise<void>;
  getActiveEpisode: (patientId: string) => any;
  getPatientEpisodes: (patientId: string) => any[];
  addScore: (score: Omit<ScoreRecord, 'id' | 'timestamp'>) => Promise<void>;
  getPatientScores: (patientId: string) => ScoreRecord[];
  getSectorPatients: (sectorId: string, includeInactive?: boolean) => Patient[];
  addVMIRecord: (record: Omit<VMIRecord, 'id' | 'timestamp'>) => Promise<void>;
  getPatientVMIRecords: (patientId: string, episodeId?: string) => VMIRecord[];
  getVMIRecord: (id: string) => VMIRecord | undefined;
  addNIVRecord: (record: Omit<NIVRecord, 'id' | 'timestamp'>) => Promise<void>;
  getPatientNIVRecords: (patientId: string, episodeId?: string) => NIVRecord[];
  getNIVRecord: (id: string) => NIVRecord | undefined;
  startNIVSession: (patientId: string, episodeId?: string) => Promise<void>;
  closeNIVSession: (id: string, endAt?: string) => Promise<void>;
  addManualNIVSession: (session: Omit<NIVSession, 'id'>) => Promise<void>;
  deleteNIVSession: (id: string) => Promise<void>;
  getPatientNIVSessions: (patientId: string, episodeId?: string) => NIVSession[];
  addHFNCRecord: (record: Omit<HFNCRecord, 'id' | 'timestamp'>) => Promise<void>;
  getPatientHFNCRecords: (patientId: string, episodeId?: string) => HFNCRecord[];
  getHFNCRecord: (id: string) => HFNCRecord | undefined;
  addTrachRecord: (record: Omit<TrachRecord, 'id' | 'timestamp' | 'performedByUserId' | 'type' | 'alerts'>) => Promise<void>;
  getPatientTrachRecords: (patientId: string, episodeId?: string) => TrachRecord[];
  getTrachRecord: (id: string) => TrachRecord | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  user: null,
  sectors: [],
  patients: [],
  scores: [],
  vmiRecords: [],
  nivRecords: [],
  nivSessions: [],
  hfncRecords: [],
  trachRecords: [],
};

/** Splits the flat observations list returned by the API into the legacy per-type record shapes the UI expects. */
function splitObservationsIntoLegacyRecords(observations: (ClinicalObservationType | TrachRecord)[]) {
  const vmiRecords: VMIRecord[] = [];
  const nivRecords: NIVRecord[] = [];
  const hfncRecords: HFNCRecord[] = [];
  const trachRecords: TrachRecord[] = [];
  for (const obs of observations) {
    if (obs.type === 'imv') vmiRecords.push(observationToVMIRecord(obs));
    else if (obs.type === 'niv') nivRecords.push(observationToNIVRecord(obs));
    else if (obs.type === 'hfnc') hfncRecords.push(observationToHFNCRecord(obs));
    else trachRecords.push(obs);
  }
  return { vmiRecords, nivRecords, hfncRecords, trachRecords };
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

  // Loads sectors, patients, and every patient's observations/scores. Simple
  // (not paginated) eager load — fine at ICU-ward scale; would need lazy
  // per-patient loading if the patient list grows much larger.
  const loadWorkspace = async (user: User) => {
    const [sectors, patients] = await Promise.all([
      sectorsApi.listSectors(),
      patientsApi.listPatients({ includeInactive: true }),
    ]);

    const perPatient = await Promise.all(
      patients.map(async (p) => {
        const [observations, scores, nivSessions] = await Promise.all([
          observationsApi.listObservations({ patientId: p.id }),
          scoresApi.listScores(p.id),
          nivSessionsApi.listNivSessions({ patientId: p.id }),
        ]);
        return { ...splitObservationsIntoLegacyRecords(observations), scores, nivSessions };
      })
    );

    setState({
      user,
      sectors,
      patients,
      scores: perPatient.flatMap((p) => p.scores),
      vmiRecords: perPatient.flatMap((p) => p.vmiRecords),
      nivRecords: perPatient.flatMap((p) => p.nivRecords),
      nivSessions: perPatient.flatMap((p) => p.nivSessions),
      hfncRecords: perPatient.flatMap((p) => p.hfncRecords),
      trachRecords: perPatient.flatMap((p) => p.trachRecords),
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

  const register = async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const { token, user } = await authApi.register({ name, email, password });
      setToken(token);
      setIsLoading(true);
      await loadWorkspace(user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo crear la cuenta');
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

  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'>) => {
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
    airwayEvent?: AirwayEventInput
  ) => {
    try {
      const patient = await patientsApi.changeSupportType(patientId, { newSupport, reason, date, airwayEvent });
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

  const addVMIRecord = async (record: Omit<VMIRecord, 'id' | 'timestamp'>) => {
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

  const addNIVRecord = async (record: Omit<NIVRecord, 'id' | 'timestamp'>) => {
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

  const addHFNCRecord = async (record: Omit<HFNCRecord, 'id' | 'timestamp'>) => {
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
    record: Omit<TrachRecord, 'id' | 'timestamp' | 'performedByUserId' | 'type' | 'alerts'>
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

  return (
    <AppContext.Provider
      value={{
        ...state,
        isLoading,
        authError,
        login,
        register,
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
