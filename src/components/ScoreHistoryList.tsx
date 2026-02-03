import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ScoreRecord } from '../types';
import { CalendarIcon } from 'lucide-react';
interface ScoreHistoryListProps {
  scores: ScoreRecord[];
}
const scoreTypeLabels = {
  hacor: 'HACOR',
  rox: 'ROX'
};
const riskLabels = {
  low: 'Riesgo Bajo',
  medium: 'Riesgo Medio',
  high: 'Riesgo Alto'
};
export function ScoreHistoryList({
  scores
}: ScoreHistoryListProps) {
  if (scores.length === 0) {
    return <Card className="text-center py-12">
        <p className="text-gray-500 text-lg">Sin registros aún</p>
        <p className="text-gray-400 mt-2">
          Calculá el primer score para este paciente
        </p>
      </Card>;
  }
  return <div className="space-y-4">
      {scores.map(score => {
      const date = new Date(score.timestamp);
      const formattedDate = date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const formattedTime = date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return <Card key={score.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-lg font-bold text-gray-900">
                  {scoreTypeLabels[score.type]}
                </h4>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm">
                    {formattedDate} - {formattedTime}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {score.value}
                </div>
                <Badge variant="risk" type={score.risk} className="mt-2">
                  {riskLabels[score.risk]}
                </Badge>
              </div>
            </div>
          </Card>;
    })}
    </div>;
}