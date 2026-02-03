import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { PatientForm } from '../components/PatientForm';
export function PatientFormPage() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    patients,
    sectors,
    addPatient,
    updatePatient
  } = useApp();
  const isEdit = id && id !== 'new';
  const patient = isEdit ? patients.find(p => p.id === id) : undefined;
  const prefilledSectorId = searchParams.get('sectorId') || undefined;
  const prefilledBed = searchParams.get('bed') || undefined;
  const handleSubmit = (data: any) => {
    if (isEdit && patient) {
      updatePatient(patient.id, data);
      navigate(`/patient/${patient.id}`);
    } else {
      addPatient(data);
      navigate('/dashboard');
    }
  };
  return <div className="min-h-screen bg-gray-50">
      <Header title={isEdit ? 'Editar Paciente' : 'Nuevo Paciente'} showBack />

      <main className="max-w-2xl mx-auto p-4">
        <PatientForm sectors={sectors} initialData={patient} prefilledSectorId={prefilledSectorId} prefilledBed={prefilledBed} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
      </main>
    </div>;
}