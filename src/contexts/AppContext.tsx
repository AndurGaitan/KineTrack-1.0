import React, { useEffect, createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { AppState, User, Patient, ScoreRecord, Sector, VMIRecord, NIVRecord, HFNCRecord, SupportType, ClosureReason } from '../types';
import { PatientClosure } from '../domain/models';
import { createPatient as createPatientModel } from '../domain/services/patientService';
import { createEpisode } from '../domain/services/episodeService';
import { migrateAllPatients } from '../utils/dataMigration';
import { initialSectors } from '../utils/mockData';
interface AppContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  closePatient: (id: string, closure: PatientClosure) => void;
  changeSupportType: (patientId: string, newSupport: SupportType, reason?: string, date?: string) => void;
  getActiveEpisode: (patientId: string) => any;
  getPatientEpisodes: (patientId: string) => any[];
  addScore: (score: Omit<ScoreRecord, 'id' | 'timestamp'>) => void;
  getPatientScores: (patientId: string) => ScoreRecord[];
  getSectorPatients: (sectorId: string, includeInactive?: boolean) => Patient[];
  addVMIRecord: (record: Omit<VMIRecord, 'id' | 'timestamp'>) => void;
  getPatientVMIRecords: (patientId: string, episodeId?: string) => VMIRecord[];
  getVMIRecord: (id: string) => VMIRecord | undefined;
  addNIVRecord: (record: Omit<NIVRecord, 'id' | 'timestamp'>) => void;
  getPatientNIVRecords: (patientId: string, episodeId?: string) => NIVRecord[];
  getNIVRecord: (id: string) => NIVRecord | undefined;
  addHFNCRecord: (record: Omit<HFNCRecord, 'id' | 'timestamp'>) => void;
  getPatientHFNCRecords: (patientId: string, episodeId?: string) => HFNCRecord[];
  getHFNCRecord: (id: string) => HFNCRecord | undefined;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
const initialState: AppState = {
  user: null,
  sectors: initialSectors,
  patients: [],
  scores: [],
  vmiRecords: [],
  nivRecords: [],
  hfncRecords: []
};
export function AppProvider({
  children
}: {
  children: ReactNode;
}) {
  const [state, setState] = useLocalStorage<AppState>('uci-app-state', initialState);
  // Auto-migrate legacy data on mount
  useEffect(() => {
    const needsMigration = state.patients.some(p => !p.episodes || p.episodes.length === 0);
    if (needsMigration) {
      console.log('Migrating legacy patient data to episode structure...');
      const migratedPatients = migrateAllPatients(state.patients);
      setState(prev => ({
        ...prev,
        patients: migratedPatients
      }));
    }
  }, []); // Run once on mount
  const login = (user: User) => {
    setState(prev => ({
      ...prev,
      user
    }));
  };
  const logout = () => {
    setState(prev => ({
      ...prev,
      user: null
    }));
  };
  const addPatient = (patientData: Omit<Patient, 'id' | 'createdAt' | 'status' | 'episodes'>) => {
    // Use domain service to create patient with initial episode
    const newPatient = createPatientModel(patientData.alias, patientData.sectorId, patientData.bed, patientData.supportType, patientData.predictedBodyWeight);
    setState(prev => ({
      ...prev,
      patients: [...prev.patients, newPatient]
    }));
  };
  const updatePatient = (id: string, updates: Partial<Patient>) => {
    setState(prev => ({
      ...prev,
      patients: prev.patients.map(p => p.id === id ? {
        ...p,
        ...updates
      } : p)
    }));
  };
  const deletePatient = (id: string) => {
    setState(prev => ({
      ...prev,
      patients: prev.patients.filter(p => p.id !== id),
      scores: prev.scores.filter(s => s.patientId !== id),
      vmiRecords: prev.vmiRecords.filter(v => v.patientId !== id),
      nivRecords: prev.nivRecords.filter(n => n.patientId !== id),
      hfncRecords: prev.hfncRecords.filter(h => h.patientId !== id)
    }));
  };
  const closePatient = (id: string, closure: PatientClosure) => {
    setState(prev => ({
      ...prev,
      patients: prev.patients.map(p => {
        if (p.id !== id) return p;
        // Close all active episodes
        const updatedEpisodes = p.episodes.map(ep => !ep.endAt ? {
          ...ep,
          endAt: closure.date,
          reason: 'Patient case closed'
        } : ep);
        return {
          ...p,
          status: 'closed' as const,
          closure,
          episodes: updatedEpisodes
        };
      })
    }));
  };
  const changeSupportType = (patientId: string, newSupport: SupportType, reason?: string, date?: string) => {
    const changeDate = date || new Date().toISOString();
    setState(prev => ({
      ...prev,
      patients: prev.patients.map(p => {
        if (p.id !== patientId) return p;
        // Close current active episode
        const updatedEpisodes = p.episodes.map(ep => !ep.endAt ? {
          ...ep,
          endAt: changeDate,
          reason
        } : ep);
        // Create new episode using domain service
        const newEpisode = createEpisode(newSupport, changeDate, reason);
        return {
          ...p,
          supportType: newSupport,
          episodes: [...updatedEpisodes, newEpisode]
        };
      })
    }));
  };
  const getActiveEpisode = (patientId: string) => {
    const patient = state.patients.find(p => p.id === patientId);
    return patient?.episodes.find(ep => !ep.endAt);
  };
  const getPatientEpisodes = (patientId: string) => {
    const patient = state.patients.find(p => p.id === patientId);
    return patient?.episodes || [];
  };
  const addScore = (score: Omit<ScoreRecord, 'id' | 'timestamp'>) => {
    const newScore: ScoreRecord = {
      ...score,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      scores: [...prev.scores, newScore]
    }));
  };
  const getPatientScores = (patientId: string) => {
    return state.scores.filter(s => s.patientId === patientId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };
  const getSectorPatients = (sectorId: string, includeInactive: boolean = false) => {
    return state.patients.filter(p => p.sectorId === sectorId && (includeInactive || p.status === 'active'));
  };
  const addVMIRecord = (record: Omit<VMIRecord, 'id' | 'timestamp'>) => {
    const newRecord: VMIRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      vmiRecords: [...prev.vmiRecords, newRecord]
    }));
  };
  const getPatientVMIRecords = (patientId: string, episodeId?: string) => {
    return state.vmiRecords.filter(v => v.patientId === patientId && (!episodeId || v.episodeId === episodeId)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };
  const getVMIRecord = (id: string) => {
    return state.vmiRecords.find(v => v.id === id);
  };
  const addNIVRecord = (record: Omit<NIVRecord, 'id' | 'timestamp'>) => {
    const newRecord: NIVRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      nivRecords: [...prev.nivRecords, newRecord]
    }));
  };
  const getPatientNIVRecords = (patientId: string, episodeId?: string) => {
    return state.nivRecords.filter(n => n.patientId === patientId && (!episodeId || n.episodeId === episodeId)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };
  const getNIVRecord = (id: string) => {
    return state.nivRecords.find(n => n.id === id);
  };
  const addHFNCRecord = (record: Omit<HFNCRecord, 'id' | 'timestamp'>) => {
    const newRecord: HFNCRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      hfncRecords: [...prev.hfncRecords, newRecord]
    }));
  };
  const getPatientHFNCRecords = (patientId: string, episodeId?: string) => {
    return state.hfncRecords.filter(h => h.patientId === patientId && (!episodeId || h.episodeId === episodeId)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };
  const getHFNCRecord = (id: string) => {
    return state.hfncRecords.find(h => h.id === id);
  };
  return <AppContext.Provider value={{
    ...state,
    login,
    logout,
    addPatient,
    updatePatient,
    deletePatient,
    closePatient,
    changeSupportType,
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
    addHFNCRecord,
    getPatientHFNCRecords,
    getHFNCRecord
  }}>
      {children}
    </AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}