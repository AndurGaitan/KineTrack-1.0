import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AlertPanel } from '../components/AlertPanel';
import { CalendarIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { cannulaFitOptions } from '../utils/hfncEducation';
export function HFNCRecordDetailPage() {
  const {
    patientId,
    recordId
  } = useParams<{
    patientId: string;
    recordId: string;
  }>();
  const navigate = useNavigate();
  const {
    patients,
    getHFNCRecord,
    sectors
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const record = recordId ? getHFNCRecord(recordId) : undefined;
  if (!patient || !record) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Registro no encontrado</p>
      </div>;
  }
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
  const cannulaLabel = cannulaFitOptions.find(c => c.value === record.cannulaFit)?.label || record.cannulaFit;
  return <div className="min-h-screen bg-gray-50">
      <Header title="Detalle de Monitorización HFNC" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Paciente</div>
              <div className="text-xl font-bold text-gray-900">
                {patient.alias}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {formattedDate} - {formattedTime}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* HFNC Parameters */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Parámetros de HFNC
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-teal-50">
                <div className="text-sm text-gray-600 mb-1">Flujo</div>
                <div className="text-3xl font-bold text-teal-900">
                  {record.flow}
                </div>
                <div className="text-xs text-gray-600 mt-1">L/min</div>
              </div>
              <div className="p-4 rounded-xl bg-teal-50">
                <div className="text-sm text-gray-600 mb-1">FiO₂</div>
                <div className="text-3xl font-bold text-teal-900">
                  {record.fio2}
                </div>
                <div className="text-xs text-gray-600 mt-1">%</div>
              </div>
              {record.temperature && <div className="p-4 rounded-xl bg-teal-50">
                  <div className="text-sm text-gray-600 mb-1">Temp</div>
                  <div className="text-3xl font-bold text-teal-900">
                    {record.temperature}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">°C</div>
                </div>}
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Ajuste de cánula</div>
              <Badge variant="risk" type={record.cannulaFit === 'well-adapted' ? 'low' : record.cannulaFit === 'discomfort' ? 'medium' : 'high'}>
                {cannulaLabel}
              </Badge>
              {record.cannulaNotes && <p className="text-gray-700 mt-2">{record.cannulaNotes}</p>}
            </div>
          </div>
        </Card>

        {/* Humidification */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Humidificación
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {record.humidificationWorking ? <>
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <span className="text-lg font-medium text-gray-900">
                    Funcionando correctamente
                  </span>
                </> : <>
                  <XCircleIcon className="w-6 h-6 text-red-600" />
                  <span className="text-lg font-medium text-gray-900">
                    Problema detectado
                  </span>
                </>}
            </div>
            {record.humidificationIssue && <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Problema</div>
                <div className="text-gray-900">
                  {record.humidificationIssue}
                </div>
              </div>}
          </div>
        </Card>

        {/* ROX Index */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Índice ROX</h3>
          <div className="space-y-4">
            <div className={`p-6 rounded-xl text-center ${record.roxIndex >= 4.88 ? 'bg-green-50' : record.roxIndex >= 3.85 ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <div className="text-sm text-gray-600 mb-2">Índice</div>
              <div className={`text-6xl font-bold ${record.roxIndex >= 4.88 ? 'text-green-600' : record.roxIndex >= 3.85 ? 'text-yellow-600' : 'text-red-600'}`}>
                {record.roxIndex}
              </div>
              <div className="text-sm mt-3 font-medium">
                {record.roxIndex >= 4.88 && 'Bajo riesgo de fracaso'}
                {record.roxIndex >= 3.85 && record.roxIndex < 4.88 && 'Riesgo moderado'}
                {record.roxIndex < 3.85 && 'Alto riesgo de fracaso'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">SpO₂</div>
                <div className="text-2xl font-bold text-gray-900">
                  {record.spo2}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  Frecuencia Respiratoria
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {record.respiratoryRate} rpm
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        {record.alerts.length > 0 && <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Evaluación Clínica
            </h3>
            <AlertPanel alerts={record.alerts} />
          </div>}
      </main>
    </div>;
}