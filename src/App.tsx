import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SectorDetailPage } from './pages/SectorDetailPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { PatientFormPage } from './pages/PatientFormPage';
import { ScoreCalculatorPage } from './pages/ScoreCalculatorPage';
import { VMIHubPage } from './pages/VMIHubPage';
import { VMIEntryPage } from './pages/VMIEntryPage';
import { VMIRecordDetailPage } from './pages/VMIRecordDetailPage';
import { NIVHubPage } from './pages/NIVHubPage';
import { NIVEntryPage } from './pages/NIVEntryPage';
import { NIVRecordDetailPage } from './pages/NIVRecordDetailPage';
import { HFNCHubPage } from './pages/HFNCHubPage';
import { HFNCEntryPage } from './pages/HFNCEntryPage';
import { HFNCRecordDetailPage } from './pages/HFNCRecordDetailPage';
import { ClosedPatientsPage } from './pages/ClosedPatientsPage';
function ProtectedRoute({
  children
}: {
  children: React.ReactNode;
}) {
  const {
    user
  } = useApp();
  return user ? <>{children}</> : <Navigate to="/" replace />;
}
function AppRoutes() {
  return <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>} />
      <Route path="/closed-patients" element={<ProtectedRoute>
            <ClosedPatientsPage />
          </ProtectedRoute>} />
      <Route path="/sector/:id" element={<ProtectedRoute>
            <SectorDetailPage />
          </ProtectedRoute>} />
      <Route path="/patient/new" element={<ProtectedRoute>
            <PatientFormPage />
          </ProtectedRoute>} />
      <Route path="/patient/:id" element={<ProtectedRoute>
            <PatientDetailPage />
          </ProtectedRoute>} />
      <Route path="/patient/:id/edit" element={<ProtectedRoute>
            <PatientFormPage />
          </ProtectedRoute>} />

      {/* VMI Routes */}
      <Route path="/patient/:patientId/vmi" element={<ProtectedRoute>
            <VMIHubPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/vmi/new" element={<ProtectedRoute>
            <VMIEntryPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/vmi/:recordId" element={<ProtectedRoute>
            <VMIRecordDetailPage />
          </ProtectedRoute>} />

      {/* NIV Routes */}
      <Route path="/patient/:patientId/niv" element={<ProtectedRoute>
            <NIVHubPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/niv/new" element={<ProtectedRoute>
            <NIVEntryPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/niv/:recordId" element={<ProtectedRoute>
            <NIVRecordDetailPage />
          </ProtectedRoute>} />

      {/* HFNC Routes */}
      <Route path="/patient/:patientId/hfnc" element={<ProtectedRoute>
            <HFNCHubPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/hfnc/new" element={<ProtectedRoute>
            <HFNCEntryPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/hfnc/:recordId" element={<ProtectedRoute>
            <HFNCRecordDetailPage />
          </ProtectedRoute>} />

      {/* Score Routes */}
      <Route path="/score/:type/:patientId" element={<ProtectedRoute>
            <ScoreCalculatorPage />
          </ProtectedRoute>} />
    </Routes>;
}
export function App() {
  return <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>;
}