import React from 'react';
import { AlertTriangleIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
interface AlertPanelProps {
  alerts: string[];
}
export function AlertPanel({
  alerts
}: AlertPanelProps) {
  if (alerts.length === 0) return null;
  const successAlerts = alerts.filter(a => a.startsWith('✓'));
  const warningAlerts = alerts.filter(a => !a.startsWith('✓'));
  return <div className="space-y-3">
      {successAlerts.map((alert, index) => <div key={`success-${index}`} className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-900 font-medium">
            {alert.replace('✓ ', '')}
          </p>
        </div>)}

      {warningAlerts.map((alert, index) => <div key={`warning-${index}`} className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex gap-3">
          <AlertCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-900">{alert}</p>
        </div>)}
    </div>;
}