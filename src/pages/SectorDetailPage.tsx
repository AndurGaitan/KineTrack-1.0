import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { BedGrid } from '../components/BedGrid';
import { FAB } from '../components/ui/FAB';
import { filterPatientsBySector } from '../domain/services/patientService';
import { Bed, Patient } from '../types';
export function SectorDetailPage() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    sectors,
    patients
  } = useApp();
  const sector = sectors.find(s => s.id === id);
  const sectorPatients = sector ? filterPatientsBySector(patients, sector.id) : [];
  if (!sector) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Sector no encontrado</p>
      </div>;
  }
  const handleBedClick = (bed: Bed, patient?: Patient) => {
    if (patient) {
      // Si hay paciente, navegar a su detalle
      navigate(`/patient/${patient.id}`);
    } else {
      // Si está vacía, crear nuevo paciente en esa cama
      navigate(`/patient/new?sectorId=${sector.id}&bedId=${bed.id}`);
    }
  };
  return <div className="min-h-screen bg-gray-50">
      <Header title={sector.name} showBack />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Camas del Sector
            </h2>
            <div className="text-sm text-gray-600">
              {sectorPatients.length} / {sector.beds.filter(b => b.active).length} ocupadas
            </div>
          </div>

          <BedGrid beds={sector.beds.filter(b => b.active)} patients={sectorPatients} onBedClick={handleBedClick} />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Tocá una cama vacía para agregar un
            paciente, o tocá una cama ocupada para ver el detalle del paciente.
          </p>
        </div>
      </main>

      <FAB onClick={() => navigate(`/patient/new?sectorId=${sector.id}`)} label="Nuevo Paciente" />
    </div>;
}