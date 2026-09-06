import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { WindIcon, TrendingUpIcon } from 'lucide-react';

function daysSince(startAt: string): number {
  const ms = Date.now() - new Date(startAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function TrachHubPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, getPatientTrachRecords, getActiveEpisode, sectors } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  const sector = patient ? sectors.find((s) => s.id === patient.sectorId) : null;
  const records = patient ? getPatientTrachRecords(patient.id) : [];
  const activeEpisode = patient ? getActiveEpisode(patient.id) : undefined;

  if (!patient || patient.supportType !== 'traqueostomia') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Este módulo solo está disponible para pacientes traqueostomizados</p>
          <Button onClick={() => navigate(`/patient/${patientId}`)}>Volver al Paciente</Button>
        </div>
      </div>
    );
  }

  const lastRecord = records[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Seguimiento de Traqueostomía" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Paciente</div>
              <div className="text-2xl font-bold text-gray-900">{patient.alias}</div>
            </div>
            <WindIcon className="w-8 h-8 text-indigo-600" />
          </div>

          {activeEpisode && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Días sin VMI</div>
              <div className="text-3xl font-bold text-indigo-700">{daysSince(activeEpisode.startAt)}</div>
            </div>
          )}

          {lastRecord && (
            <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-600 mb-1">Último Glasgow</div>
                <div className="text-xl font-bold text-gray-900">{lastRecord.glasgow}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Último PEmax</div>
                <div className="text-xl font-bold text-gray-900">{lastRecord.pemax ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Deglución</div>
                <div className="text-sm font-bold text-gray-900">{lastRecord.swallowingTest ?? '-'}</div>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={() => navigate(`/patient/${patient.id}/traqueostomia/new`)}
          fullWidth
          className="min-h-[64px] text-xl bg-indigo-600"
        >
          + Nuevo Registro
        </Button>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUpIcon className="w-6 h-6" />
            Historial de Seguimiento
          </h2>

          {records.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-500 text-lg">Sin registros aún</p>
              <p className="text-gray-400 mt-2">Registrá el primer seguimiento de weaning de traqueostomía</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const date = new Date(record.timestamp);
                const formattedDate = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formattedTime = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <Card key={record.id} onClick={() => navigate(`/patient/${patient.id}/traqueostomia/${record.id}`)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm text-gray-600">
                        {formattedDate} - {formattedTime}
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-700">Glasgow {record.glasgow}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-xs text-gray-600">PEmax</div>
                        <div className="text-lg font-bold text-gray-900">{record.pemax ?? '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Balón desinfl.</div>
                        <div className="text-lg font-bold text-gray-900">
                          {record.cuffDeflationPerformed ? (record.cuffDeflationTolerated ? '✓' : '✗') : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Cánula tapada</div>
                        <div className="text-lg font-bold text-gray-900">
                          {record.cappedTrialPerformed ? (record.cappedTrialTolerated ? '✓' : '✗') : '-'}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
