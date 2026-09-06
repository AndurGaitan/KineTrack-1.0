import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { XCircleIcon, BedDoubleIcon } from 'lucide-react';
const closureReasonLabels = {
  discharge: 'Alta médica',
  'transfer-ward': 'Pase a sala',
  'transfer-facility': 'Traslado',
  deceased: 'Fallecimiento'
};
const supportTypeLabels = {
  imv: 'VMI',
  niv: 'VNI',
  hfnc: 'HFNC',
  traqueostomia: 'TQT',
  'conventional-oxygen': 'O₂ Conv.',
  'room-air': 'Aire Amb.'
};
export function ClosedPatientsPage() {
  const navigate = useNavigate();
  const {
    patients,
    sectors
  } = useApp();
  const closedPatients = patients.filter(p => p.status === 'closed');
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  return <div className="min-h-screen bg-gray-50">
      <Header title="Pacientes Cerrados" showBack />

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {closedPatients.length === 0 ? <Card className="text-center py-12">
            <XCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay pacientes cerrados</p>
            <p className="text-gray-400 mt-2">
              Los casos cerrados aparecerán aquí
            </p>
          </Card> : closedPatients.map(patient => {
        const sector = sectors.find(s => s.id === patient.sectorId);
        const closure = patient.closure!;
        return <Card key={patient.id} onClick={() => navigate(`/patient/${patient.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {patient.alias}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <BedDoubleIcon className="w-4 h-4" />
                      <span className="text-sm">
                        {sector?.name} - Cama {patient.bedLabel ?? patient.bedId}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="support" type={patient.supportType}>
                      {supportTypeLabels[patient.supportType]}
                    </Badge>
                    <Badge className="bg-gray-600 text-white">Cerrado</Badge>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <XCircleIcon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {closureReasonLabels[closure.reason]}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDate(closure.date)}
                      </p>
                      {closure.notes && <p className="text-sm text-gray-700 mt-2 italic">
                          {closure.notes}
                        </p>}
                    </div>
                  </div>
                </div>
              </Card>;
      })}
      </main>
    </div>;
}