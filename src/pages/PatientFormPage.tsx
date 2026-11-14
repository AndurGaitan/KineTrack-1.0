import React, { useState } from 'react';
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
  const prefilledBedId = searchParams.get('bedId') || undefined;
  // Se espera la respuesta del servidor antes de salir de la pantalla y se bloquea el botón mientras
  // guarda: si el servidor tarda en responder, volver a tocar "Guardar" (o cargar de nuevo) duplicaba al paciente.
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (data: any) => {
    if (saving) return;
    setSaving(true);
    const ok = isEdit && patient ? await updatePatient(patient.id, data) : await addPatient(data);
    setSaving(false);
    if (!ok) return; // el error ya se avisó; se queda en el formulario para reintentar
    navigate(isEdit && patient ? `/patient/${patient.id}` : '/dashboard');
  };
  return <div className="min-h-screen bg-gray-50">
      <Header title={isEdit ? 'Editar Paciente' : 'Nuevo Paciente'} showBack />

      <main className="max-w-2xl mx-auto p-4 pb-24">
        <PatientForm sectors={sectors} initialData={patient} prefilledSectorId={prefilledSectorId} prefilledBedId={prefilledBedId} saving={saving} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
      </main>
    </div>;
}