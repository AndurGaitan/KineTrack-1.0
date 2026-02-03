import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { VMIRecordCard } from '../components/VMIRecordCard';
import { ActivityIcon, TrendingUpIcon } from 'lucide-react';
export function VMIHubPage() {
  const {
    patientId
  } = useParams<{
    patientId: string;
  }>();
  const navigate = useNavigate();
  const {
    patients,
    getPatientVMIRecords,
    sectors
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const records = patient ? getPatientVMIRecords(patient.id) : [];
  if (!patient || patient.supportType !== 'imv') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Este módulo solo está disponible para pacientes en VMI
          </p>
          <Button onClick={() => navigate(`/patient/${patientId}`)}>
            Volver al Paciente
          </Button>
        </div>
      </div>;
  }
  const lastRecord = records[0];
  return <div className="min-h-screen bg-gray-50">
      <Header title="Monitorización VMI" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Paciente</div>
              <div className="text-2xl font-bold text-gray-900">
                {patient.alias}
              </div>
            </div>
            <ActivityIcon className="w-8 h-8 text-blue-600" />
          </div>

          {lastRecord && <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-600 mb-1">Último Vt/kg</div>
                <div className={`text-xl font-bold ${lastRecord.vtPerKg > 8 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastRecord.vtPerKg}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Último P/F</div>
                <div className="text-xl font-bold text-gray-900">
                  {lastRecord.pfRatio || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Movilización</div>
                <div className="text-xl font-bold text-gray-900">
                  Nivel {lastRecord.mobilizationLevel}
                </div>
              </div>
            </div>}
        </div>

        <Button onClick={() => navigate(`/patient/${patient.id}/vmi/new`)} fullWidth className="min-h-[64px] text-xl">
          + Nueva Monitorización
        </Button>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUpIcon className="w-6 h-6" />
            Historial de Monitorizaciones
          </h2>

          {records.length === 0 ? <Card className="text-center py-12">
              <p className="text-gray-500 text-lg">Sin registros aún</p>
              <p className="text-gray-400 mt-2">
                Registrá la primera monitorización avanzada
              </p>
            </Card> : <div className="space-y-4">
              {records.map(record => <VMIRecordCard key={record.id} record={record} onClick={() => navigate(`/patient/${patient.id}/vmi/${record.id}`)} />)}
            </div>}
        </div>
      </main>
    </div>;
}