import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Badge } from '../components/ui/Badge';
import { FAB } from '../components/ui/FAB';
import { SectorCard } from '../components/SectorCard';
import { Button } from '../components/ui/Button';
import { ArchiveIcon } from 'lucide-react';
import { getActivePatientsCount, getClosedPatientsCount } from '../domain/services/patientService';
export function DashboardPage() {
  const navigate = useNavigate();
  const {
    user,
    sectors,
    patients
  } = useApp();
  const closedCount = getClosedPatientsCount(patients);
  return <div className="min-h-screen bg-gray-50">
      <Header title={`Hola, ${user?.name || 'Usuario'}`} action={<Badge>DEMO</Badge>} />

      <main className="max-w-2xl mx-auto p-4 pb-24">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Sectores UCI</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Seleccioná una UCI para agregar tus pacientes.
          </p>
        </div>

        <div className="space-y-4">
          {sectors.map(sector => <SectorCard key={sector.id} sector={sector} patientCount={getActivePatientsCount(patients, sector.id)} onClick={() => navigate(`/sector/${sector.id}`)} />)}
        </div>

        {closedCount > 0 && <div className="mt-6">
            <Button variant="secondary" onClick={() => navigate('/closed-patients')} fullWidth className="flex items-center justify-center gap-2">
              <ArchiveIcon className="w-5 h-5" />
              Ver Pacientes Cerrados ({closedCount})
            </Button>
          </div>}
      </main>

      <FAB onClick={() => navigate('/patient/new')} label="Nuevo Paciente" />
    </div>;
}