import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AlertPanel } from '../components/AlertPanel';
import { cuffStatusLabels, secretionAmountLabels, secretionCharacterLabels, ventilatorySupportLabels } from '../domain/services/trachDecannulation';
import { CalendarIcon } from 'lucide-react';

const swallowingLabels: Record<string, string> = {
  apta: 'Apta',
  'no-apta': 'No apta',
  'con-restricciones': 'Apta con restricciones',
};

export function TrachRecordDetailPage() {
  const { patientId, recordId } = useParams<{ patientId: string; recordId: string }>();
  const { patients, getTrachRecord, sectors } = useApp();
  const patient = patients.find((p) => p.id === patientId);
  const sector = patient ? sectors.find((s) => s.id === patient.sectorId) : null;
  const record = recordId ? getTrachRecord(recordId) : undefined;

  if (!patient || !record) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Registro no encontrado</p>
      </div>
    );
  }

  const date = new Date(record.timestamp);
  const formattedDate = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Detalle del registro" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Paciente</div>
          <div className="text-xl font-bold text-gray-900">{patient.alias}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
            <CalendarIcon className="w-4 h-4" />
            <span>
              {formattedDate} - {formattedTime}
            </span>
          </div>
        </Card>

        {(record.cuffStatus || record.ventilatorySupport || record.secretionAmount) && (
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Estado</h3>
            <div className="space-y-3">
              {record.cuffStatus && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Neumotaponamiento</span>
                  <span className="font-semibold text-gray-900">{cuffStatusLabels[record.cuffStatus]}</span>
                </div>
              )}
              {record.ventilatorySupport && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Soporte ventilatorio</span>
                  <span className="font-semibold text-gray-900">{ventilatorySupportLabels[record.ventilatorySupport]}</span>
                </div>
              )}
              {record.secretionAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Secreciones</span>
                  <span className="font-semibold text-gray-900">
                    {secretionAmountLabels[record.secretionAmount]}
                    {record.secretionCharacter ? `, ${secretionCharacterLabels[record.secretionCharacter]}` : ''}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {(record.glasgow !== undefined || record.pemax !== undefined) && (
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nivel neurológico y fuerza</h3>
            <div className="grid grid-cols-2 gap-4">
              {record.glasgow !== undefined && (
                <div className="p-4 rounded-xl bg-indigo-50">
                  <div className="text-sm text-gray-600 mb-1">Glasgow</div>
                  <div className="text-3xl font-bold text-indigo-900">{record.glasgow}</div>
                </div>
              )}
              {record.pemax !== undefined && (
                <div className="p-4 rounded-xl bg-indigo-50">
                  <div className="text-sm text-gray-600 mb-1">Pemáx</div>
                  <div className="text-3xl font-bold text-indigo-900">{record.pemax}</div>
                  <div className="text-xs text-gray-600 mt-1">cmH₂O</div>
                </div>
              )}
            </div>
          </Card>
        )}

        {(record.cuffDeflationPerformed || record.cappedTrialPerformed) && (
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pruebas de vía aérea</h3>
            <div className="space-y-4">
              {record.cuffDeflationPerformed && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Balón desinflado</div>
                  <Badge variant="risk" type={record.cuffDeflationTolerated ? 'low' : 'high'}>
                    {record.cuffDeflationTolerated ? 'Tolerada' : 'No tolerada'}
                  </Badge>
                  {record.cuffDeflationNotes && <p className="text-gray-700 mt-2">{record.cuffDeflationNotes}</p>}
                </div>
              )}
              {record.cappedTrialPerformed && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Cánula tapada (registro previo)</div>
                  <Badge variant="risk" type={record.cappedTrialTolerated ? 'low' : 'high'}>
                    {record.cappedTrialTolerated ? 'Tolerada' : 'No tolerada'}
                  </Badge>
                  {record.cappedTrialNotes && <p className="text-gray-700 mt-2">{record.cappedTrialNotes}</p>}
                </div>
              )}
            </div>
          </Card>
        )}

        {(record.swallowingTest || record.blueTest) && (
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Deglución</h3>
            <div className="space-y-3">
              {record.swallowingTest && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Prueba de deglución</div>
                  <Badge variant="risk" type={record.swallowingTest === 'apta' ? 'low' : record.swallowingTest === 'con-restricciones' ? 'medium' : 'high'}>
                    {swallowingLabels[record.swallowingTest]}
                  </Badge>
                </div>
              )}
              {record.blueTest && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Blue test</div>
                  <Badge variant="risk" type={record.blueTest === 'negativo' ? 'low' : 'high'}>
                    {record.blueTest === 'negativo' ? 'Negativo' : 'Positivo'}
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        )}

        {record.alerts.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Evaluación Clínica</h3>
            <AlertPanel alerts={record.alerts} />
          </div>
        )}
      </main>
    </div>
  );
}
