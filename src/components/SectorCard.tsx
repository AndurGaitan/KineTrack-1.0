import React from 'react';
import { Card } from './ui/Card';
import { Sector } from '../types';
import { BedDoubleIcon } from 'lucide-react';
interface SectorCardProps {
  sector: Sector;
  patientCount: number;
  onClick: () => void;
}
export function SectorCard({
  sector,
  patientCount,
  onClick
}: SectorCardProps) {
  return <Card onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {sector.name}
          </h3>
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1">
              <BedDoubleIcon className="w-5 h-5" />
              <span className="text-lg">{sector.beds} camas</span>
            </div>
            <div className="text-lg">
              {patientCount} paciente{patientCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </Card>;
}