import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { ActivityIcon, ChevronRightIcon } from 'lucide-react';

export function VMIPatientsListPage() {
  const navigate = useNavigate();
  const { patients, sectors, getActiveEpisode, getPatientVMIRecords } = useApp();

  const vmiPatients = patients.filter((p) => p.status === 'active' && p.supportType === 'imv');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pacientes en VMI" showBack />
      <CoordinatorNav />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Tocá un paciente para ver sus tendencias de parámetros ventilatorios y gasometría.
          </p>
        </div>

        {vmiPatients.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500 text-lg">Ningún paciente en VMI actualmente</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {vmiPatients.map((patient) => {
              const sector = sectors.find((s) => s.id === patient.sectorId);
              const episode = getActiveEpisode(patient.id);
              const days = episode ? Math.max(0, Math.floor((Date.now() - new Date(episode.startAt).getTime()) / 86400000)) : undefined;
              const records = getPatientVMIRecords(patient.id);
              const lastRecord = records[0];

              return (
                <Card key={patient.id} onClick={() => navigate(`/patient/${patient.id}/vmi/trends`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ActivityIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{patient.alias}</div>
                        <div className="text-sm text-gray-600">
                          {sector?.name} - Cama {patient.bedLabel ?? patient.bedId}
                          {days != null && ` · ${days}d en VMI`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lastRecord && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Vt/kg</div>
                          <div className={`text-lg font-bold ${lastRecord.vtPerKg > 8 ? 'text-red-600' : 'text-gray-900'}`}>
                            {lastRecord.vtPerKg || '-'}
                          </div>
                        </div>
                      )}
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
