import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Patient } from '../types';
import { BedDoubleIcon } from 'lucide-react';
interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}
const supportTypeLabels = {
  imv: 'VMI',
  niv: 'VNI',
  hfnc: 'HFNC',
  'conventional-oxygen': 'O₂ Conv.',
  'room-air': 'Aire Amb.'
};
export function PatientCard({
  patient,
  onClick
}: PatientCardProps) {
  return <Card onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{patient.alias}</h3>
          <div className="flex items-center gap-2 text-gray-600 mt-1">
            <BedDoubleIcon className="w-4 h-4" />
            <span>Cama {patient.bed}</span>
          </div>
        </div>
        <Badge variant="support" type={patient.supportType}>
          {supportTypeLabels[patient.supportType]}
        </Badge>
      </div>

      {patient.status === 'closed' && <div className="mt-2">
          <Badge className="bg-gray-600 text-white">Cerrado</Badge>
        </div>}
    </Card>;
}