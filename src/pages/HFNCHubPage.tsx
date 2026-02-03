import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DropletIcon, TrendingUpIcon } from 'lucide-react';
export function HFNCHubPage() {
  const {
    patientId
  } = useParams<{
    patientId: string;
  }>();
  const navigate = useNavigate();
  const {
    patients,
    getPatientHFNCRecords,
    sectors
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const records = patient ? getPatientHFNCRecords(patient.id) : [];
  if (!patient || patient.supportType !== 'hfnc') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Este módulo solo está disponible para pacientes en HFNC
          </p>
          <Button onClick={() => navigate(`/patient/${patientId}`)}>
            Volver al Paciente
          </Button>
        </div>
      </div>;
  }
  const lastRecord = records[0];
  return <div className="min-h-screen bg-gray-50">
      <Header title="Monitorización HFNC" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Paciente</div>
              <div className="text-2xl font-bold text-gray-900">
                {patient.alias}
              </div>
            </div>
            <DropletIcon className="w-8 h-8 text-teal-600" />
          </div>

          {lastRecord && <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-600 mb-1">Último ROX</div>
                <div className={`text-xl font-bold ${lastRecord.roxIndex >= 4.88 ? 'text-green-600' : lastRecord.roxIndex >= 3.85 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {lastRecord.roxIndex}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Flujo</div>
                <div className="text-xl font-bold text-gray-900">
                  {lastRecord.flow} L/min
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">FiO₂</div>
                <div className="text-xl font-bold text-gray-900">
                  {lastRecord.fio2}%
                </div>
              </div>
            </div>}
        </div>

        <Button onClick={() => navigate(`/patient/${patient.id}/hfnc/new`)} fullWidth className="min-h-[64px] text-xl bg-teal-600">
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
                Registrá la primera monitorización de HFNC
              </p>
            </Card> : <div className="space-y-4">
              {records.map(record => {
            const date = new Date(record.timestamp);
            const formattedDate = date.toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            });
            return <Card key={record.id} onClick={() => navigate(`/patient/${patient.id}/hfnc/${record.id}`)}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="text-sm text-gray-600">
                          {formattedDate} - {formattedTime}
                        </div>
                        <div className={`text-3xl font-bold ${record.roxIndex >= 4.88 ? 'text-green-600' : record.roxIndex >= 3.85 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {record.roxIndex}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">
                            Flujo
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {record.flow}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">FiO₂</div>
                          <div className="text-lg font-bold text-gray-900">
                            {record.fio2}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">SpO₂</div>
                          <div className="text-lg font-bold text-gray-900">
                            {record.spo2}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>;
          })}
            </div>}
        </div>
      </main>
    </div>;
}