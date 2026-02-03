import React, { useEffect, useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ScoreType, RiskLevel } from '../types';
import { calculateHACOR, calculateROX, HACORInputs, ROXInputs } from '../utils/scores';
import { Card } from './ui/Card';
interface ScoreCalculatorProps {
  type: ScoreType;
  onSave: (value: number, inputs: Record<string, number>, risk: RiskLevel) => void;
  onCancel: () => void;
}
const riskLabels = {
  low: 'Riesgo Bajo',
  medium: 'Riesgo Medio',
  high: 'Riesgo Alto'
};
export function ScoreCalculator({
  type,
  onSave,
  onCancel
}: ScoreCalculatorProps) {
  const [hacorInputs, setHacorInputs] = useState<HACORInputs>({
    heartRate: 0,
    acidosis: 7.35,
    consciousness: 15,
    oxygenation: 200,
    respiratoryRate: 20
  });
  const [roxInputs, setRoxInputs] = useState<ROXInputs>({
    spo2: 95,
    fio2: 50,
    respiratoryRate: 20
  });
  const [result, setResult] = useState<{
    score: number;
    risk: RiskLevel;
  } | null>(null);
  useEffect(() => {
    if (type === 'hacor') {
      const calc = calculateHACOR(hacorInputs);
      setResult(calc);
    } else {
      const calc = calculateROX(roxInputs);
      setResult(calc);
    }
  }, [type, hacorInputs, roxInputs]);
  const handleSave = () => {
    if (!result) return;
    const inputs = type === 'hacor' ? hacorInputs : roxInputs;
    onSave(result.score, inputs as Record<string, number>, result.risk);
  };
  if (type === 'hacor') {
    return <div className="space-y-6">
        <Input label="Frecuencia Cardíaca (FC)" type="number" value={hacorInputs.heartRate} onChange={e => setHacorInputs({
        ...hacorInputs,
        heartRate: Number(e.target.value)
      })} placeholder="lpm" />

        <Input label="pH (Acidosis)" type="number" step="0.01" value={hacorInputs.acidosis} onChange={e => setHacorInputs({
        ...hacorInputs,
        acidosis: Number(e.target.value)
      })} placeholder="7.35" />

        <Input label="Glasgow (Conciencia)" type="number" value={hacorInputs.consciousness} onChange={e => setHacorInputs({
        ...hacorInputs,
        consciousness: Number(e.target.value)
      })} placeholder="3-15" />

        <Input label="PaO2/FiO2 (Oxigenación)" type="number" value={hacorInputs.oxygenation} onChange={e => setHacorInputs({
        ...hacorInputs,
        oxygenation: Number(e.target.value)
      })} placeholder="mmHg" />

        <Input label="Frecuencia Respiratoria (FR)" type="number" value={hacorInputs.respiratoryRate} onChange={e => setHacorInputs({
        ...hacorInputs,
        respiratoryRate: Number(e.target.value)
      })} placeholder="rpm" />

        {result && <Card className="bg-gray-50">
            <div className="text-center space-y-3">
              <div className="text-sm text-gray-600">Score HACOR</div>
              <div className="text-5xl font-bold text-gray-900">
                {result.score}
              </div>
              <Badge variant="risk" type={result.risk}>
                {riskLabels[result.risk]}
              </Badge>
            </div>
          </Card>}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
            Cancelar
          </Button>
          <Button onClick={handleSave} fullWidth>
            Guardar Resultado
          </Button>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <Input label="SpO2 (%)" type="number" value={roxInputs.spo2} onChange={e => setRoxInputs({
      ...roxInputs,
      spo2: Number(e.target.value)
    })} placeholder="95" />

      <Input label="FiO2 (%)" type="number" value={roxInputs.fio2} onChange={e => setRoxInputs({
      ...roxInputs,
      fio2: Number(e.target.value)
    })} placeholder="50" />

      <Input label="Frecuencia Respiratoria (FR)" type="number" value={roxInputs.respiratoryRate} onChange={e => setRoxInputs({
      ...roxInputs,
      respiratoryRate: Number(e.target.value)
    })} placeholder="rpm" />

      {result && <Card className="bg-gray-50">
          <div className="text-center space-y-3">
            <div className="text-sm text-gray-600">Score ROX</div>
            <div className="text-5xl font-bold text-gray-900">
              {result.score}
            </div>
            <Badge variant="risk" type={result.risk}>
              {riskLabels[result.risk]}
            </Badge>
          </div>
        </Card>}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
          Cancelar
        </Button>
        <Button onClick={handleSave} fullWidth>
          Guardar Resultado
        </Button>
      </div>
    </div>;
}