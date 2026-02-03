import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { ScoreCalculator } from '../components/ScoreCalculator';
import { ScoreType, RiskLevel } from '../types';
export function ScoreCalculatorPage() {
  const {
    type,
    patientId
  } = useParams<{
    type: ScoreType;
    patientId: string;
  }>();
  const navigate = useNavigate();
  const {
    patients,
    addScore
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  if (!patient || !type) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Paciente no encontrado</p>
      </div>;
  }
  const handleSave = (value: number, inputs: Record<string, number>, risk: RiskLevel) => {
    addScore({
      patientId: patient.id,
      type,
      value,
      inputs,
      risk
    });
    navigate(`/patient/${patient.id}`);
  };
  const title = type === 'hacor' ? 'Score HACOR' : 'Score ROX';
  return <div className="min-h-screen bg-gray-50">
      <Header title={title} showBack />

      <main className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
        </div>

        <ScoreCalculator type={type} onSave={handleSave} onCancel={() => navigate(-1)} />
      </main>
    </div>;
}