import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { VMIRecord } from '../types';
import { CalendarIcon, ActivityIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
interface VMIRecordCardProps {
  record: VMIRecord;
  onClick: () => void;
}
export function VMIRecordCard({
  record,
  onClick
}: VMIRecordCardProps) {
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
  const criticalAlerts = record.alerts.filter(a => !a.startsWith('✓'));
  return <Card onClick={onClick}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarIcon className="w-4 h-4" />
            <span className="text-sm">
              {formattedDate} - {formattedTime}
            </span>
          </div>
          {record.protectiveVentilation ? <CheckCircleIcon className="w-5 h-5 text-green-600" /> : <AlertCircleIcon className="w-5 h-5 text-yellow-600" />}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-600 mb-1">Vt/kg</div>
            <div className={`text-lg font-bold ${record.vtPerKg > 8 ? 'text-red-600' : 'text-gray-900'}`}>
              {record.vtPerKg}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">ΔP</div>
            <div className={`text-lg font-bold ${record.drivingPressure > 15 ? 'text-red-600' : 'text-gray-900'}`}>
              {record.drivingPressure}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Pplat</div>
            <div className={`text-lg font-bold ${record.plateauPressure > 30 ? 'text-red-600' : 'text-gray-900'}`}>
              {record.plateauPressure}
            </div>
          </div>
        </div>

        {criticalAlerts.length > 0 && <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>
              {criticalAlerts.length} alerta
              {criticalAlerts.length > 1 ? 's' : ''}
            </span>
          </div>}
      </div>
    </Card>;
}