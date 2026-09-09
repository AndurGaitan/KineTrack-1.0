import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { BottomNav } from './components/BottomNav';
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
import { TrachHubPage } from './pages/TrachHubPage';
import { TrachEntryPage } from './pages/TrachEntryPage';
import { TrachRecordDetailPage } from './pages/TrachRecordDetailPage';
import { ClosedPatientsPage } from './pages/ClosedPatientsPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrestacionFormPage } from './pages/PrestacionFormPage';
import { MrcAssessmentFormPage } from './pages/MrcAssessmentFormPage';
import { PaseDeGuardiaPage } from './pages/PaseDeGuardiaPage';
import { CoordinatorDashboardPage } from './pages/coordinator/CoordinatorDashboardPage';
import { SectorsAdminPage } from './pages/coordinator/SectorsAdminPage';
import { ProtocolsAdminPage } from './pages/coordinator/ProtocolsAdminPage';
import { UsersAdminPage } from './pages/coordinator/UsersAdminPage';
import { SchedulePage } from './pages/coordinator/SchedulePage';
import { VMIPatientsListPage } from './pages/coordinator/VMIPatientsListPage';
import { BulkPrestacionPage } from './pages/coordinator/BulkPrestacionPage';

// Recharts (and the Recharts-only VMITrendsPage) is code-split out of the
// main bundle — it roughly doubles the app's gzip size and only
// coordinadores viewing VMI trends ever need it.
const VMITrendsPage = lazy(() => import('./pages/coordinator/VMITrendsPage').then((m) => ({ default: m.VMITrendsPage })));

function ProtectedRoute({
  children,
  requireCoordinador = false
}: {
  children: React.ReactNode;
  requireCoordinador?: boolean;
}) {
  const {
    user,
    isLoading
  } = useApp();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (requireCoordinador && user.role !== 'coordinador') {
    return <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-gray-600 text-center">
            Esta sección es solo para coordinadores de servicio.
          </p>
        </div>
        <BottomNav />
      </>;
  }
  // Every protected screen gets the tab bar — not just the 3 root
  // destinations — so navigating back to Pacientes/Cronograma/Dashboard
  // never requires unwinding a deep "evolucionar paciente" stack
  // (PatientDetail → Hub → Entry, etc.) one "Volver" at a time.
  return <>
      {children}
      <BottomNav />
    </>;
}
function AppRoutes() {
  return <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute>
            <ProfilePage />
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
      <Route path="/patient/:patientId/vmi/trends" element={<ProtectedRoute requireCoordinador>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>}>
              <VMITrendsPage />
            </Suspense>
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

      {/* Tracheostomy weaning Routes */}
      <Route path="/patient/:patientId/traqueostomia" element={<ProtectedRoute>
            <TrachHubPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/traqueostomia/new" element={<ProtectedRoute>
            <TrachEntryPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/traqueostomia/:recordId" element={<ProtectedRoute>
            <TrachRecordDetailPage />
          </ProtectedRoute>} />

      {/* Score Routes */}
      <Route path="/score/:type/:patientId" element={<ProtectedRoute>
            <ScoreCalculatorPage />
          </ProtectedRoute>} />

      {/* Team productivity / quality logging (any kinesiólogo) */}
      <Route path="/patient/:patientId/prestacion/new" element={<ProtectedRoute>
            <PrestacionFormPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/mrc/new" element={<ProtectedRoute>
            <MrcAssessmentFormPage />
          </ProtectedRoute>} />
      <Route path="/patient/:patientId/pase-de-guardia" element={<ProtectedRoute>
            <PaseDeGuardiaPage />
          </ProtectedRoute>} />

      {/* Coordinator module */}
      <Route path="/coordinator/dashboard" element={<ProtectedRoute requireCoordinador>
            <CoordinatorDashboardPage />
          </ProtectedRoute>} />
      <Route path="/coordinator/schedule" element={<ProtectedRoute>
            <SchedulePage />
          </ProtectedRoute>} />
      <Route path="/coordinator/sectors" element={<ProtectedRoute requireCoordinador>
            <SectorsAdminPage />
          </ProtectedRoute>} />
      <Route path="/coordinator/protocols" element={<ProtectedRoute requireCoordinador>
            <ProtocolsAdminPage />
          </ProtectedRoute>} />
      <Route path="/coordinator/users" element={<ProtectedRoute requireCoordinador>
            <UsersAdminPage />
          </ProtectedRoute>} />
      <Route path="/coordinator/vmi" element={<ProtectedRoute requireCoordinador>
            <VMIPatientsListPage />
          </ProtectedRoute>} />
      <Route path="/coordinator/carga-masiva" element={<ProtectedRoute requireCoordinador>
            <BulkPrestacionPage />
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
