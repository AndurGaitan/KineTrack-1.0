import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AlertPanel } from '../components/AlertPanel';
import { CalendarIcon } from 'lucide-react';
import { interfaceTypes, skinIntegrityOptions, nivModes } from '../utils/nivEducation';
export function NIVRecordDetailPage() {
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
    getNIVRecord,
    sectors
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const record = recordId ? getNIVRecord(recordId) : undefined;
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
  const interfaceLabel = interfaceTypes.find(i => i.value === record.interfaceType)?.label || record.interfaceType;
  const skinLabel = skinIntegrityOptions.find(s => s.value === record.skinIntegrity)?.label || record.skinIntegrity;
  const modeLabel = nivModes.find(m => m.value === record.mode)?.label || record.mode;
  return <div className="min-h-screen bg-gray-50">
      <Header title="Detalle de Monitorización VNI" showBack showPatientList sectorId={sector?.id} />

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

        {/* Interface */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Interfaz</h3>
          <div>
            <div className="text-sm text-gray-600 mb-1">Tipo</div>
            <div className="text-xl font-bold text-gray-900">
              {interfaceLabel}
            </div>
            {record.interfaceOther && <div className="text-gray-700 mt-1">{record.interfaceOther}</div>}
          </div>
        </Card>

        {/* Skin Integrity */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Integridad de la Piel
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">Estado</div>
              <Badge variant="risk" type={record.skinIntegrity === 'no-lesions' ? 'low' : record.skinIntegrity === 'mild-erythema' ? 'medium' : 'high'}>
                {skinLabel}
              </Badge>
            </div>
            {record.lesionLocations.length > 0 && <div>
                <div className="text-sm text-gray-600 mb-2">Ubicaciones</div>
                <div className="flex flex-wrap gap-2">
                  {record.lesionLocations.map(location => <Badge key={location} className="bg-gray-100 text-gray-800">
                      {location}
                    </Badge>)}
                </div>
              </div>}
            {record.skinNotes && <div>
                <div className="text-sm text-gray-600 mb-1">Notas</div>
                <div className="text-gray-900">{record.skinNotes}</div>
              </div>}
          </div>
        </Card>

        {/* NIV Parameters */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Parámetros de VNI
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Modo</div>
              <div className="text-lg font-medium text-gray-900">
                {modeLabel}
                {record.modeOther && ` (${record.modeOther})`}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-purple-50">
                <div className="text-sm text-gray-600 mb-1">IPAP</div>
                <div className="text-3xl font-bold text-purple-900">
                  {record.ipap}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-50">
                <div className="text-sm text-gray-600 mb-1">EPAP</div>
                <div className="text-3xl font-bold text-purple-900">
                  {record.epap}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-50">
                <div className="text-sm text-gray-600 mb-1">Soporte</div>
                <div className="text-3xl font-bold text-purple-900">
                  {record.ipap - record.epap}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">FiO₂</div>
                <div className="text-2xl font-bold text-gray-900">
                  {record.fio2}%
                </div>
              </div>
              {record.leak !== undefined && <div>
                  <div className="text-sm text-gray-600 mb-1">Fuga</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {record.leak} L/min
                  </div>
                </div>}
            </div>
          </div>
        </Card>

        {/* HACOR Score */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Score HACOR</h3>
          <div className="space-y-4">
            <div className={`p-6 rounded-xl text-center ${record.hacorScore > 5 ? 'bg-red-50' : record.hacorScore >= 3 ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <div className="text-sm text-gray-600 mb-2">Score</div>
              <div className={`text-6xl font-bold ${record.hacorScore > 5 ? 'text-red-600' : record.hacorScore >= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                {record.hacorScore}
              </div>
              <div className="text-sm mt-3 font-medium">
                {record.hacorScore > 5 && 'Alto riesgo de fracaso'}
                {record.hacorScore >= 3 && record.hacorScore <= 5 && 'Riesgo moderado'}
                {record.hacorScore < 3 && 'Bajo riesgo de fracaso'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">FC</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.heartRate} lpm
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">pH</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.ph}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Glasgow</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.consciousness}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">PaO₂</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.pao2} mmHg
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">FR</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.respiratoryRate} rpm
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Previous IMV */}
        {record.previousIMVDays !== undefined && record.previousIMVDays > 0 && <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">VMI Previa</h3>
            <div>
              <div className="text-sm text-gray-600 mb-1">
                Días en VMI antes de VNI
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {record.previousIMVDays} días
              </div>
            </div>
          </Card>}

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