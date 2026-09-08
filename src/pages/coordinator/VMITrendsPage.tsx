import { useParams } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { TrendChart, TrendChartPoint, TrendSeries, TrendReferenceLine } from '../../components/TrendChart';
import { TrendingUpIcon, BedDoubleIcon } from 'lucide-react';

interface ChartConfig {
  title: string;
  unit?: string;
  series: TrendSeries[];
  referenceLines?: TrendReferenceLine[];
}

const mechanicsCharts: ChartConfig[] = [
  { title: 'PEEP', unit: 'cmH₂O', series: [{ key: 'peep', label: 'PEEP', color: '#2563eb' }] },
  { title: 'FiO₂', unit: '%', series: [{ key: 'fio2', label: 'FiO₂', color: '#2563eb' }] },
  {
    title: 'Presión Plateau / Ppeak',
    unit: 'cmH₂O',
    series: [
      { key: 'plateauPressure', label: 'Pplat', color: '#2563eb' },
      { key: 'peakPressure', label: 'Ppeak', color: '#f59e0b' }
    ],
    referenceLines: [{ value: 30, label: 'Pplat ≤ 30', color: '#ef4444' }]
  },
  {
    title: 'Vt/kg',
    unit: 'ml/kg',
    series: [{ key: 'vtPerKg', label: 'Vt/kg', color: '#2563eb' }],
    referenceLines: [{ value: 8, label: '≤ 8', color: '#ef4444' }]
  },
  {
    title: 'Driving Pressure (ΔP)',
    unit: 'cmH₂O',
    series: [{ key: 'drivingPressure', label: 'ΔP', color: '#2563eb' }],
    referenceLines: [{ value: 15, label: '≤ 15', color: '#ef4444' }]
  },
  { title: 'Compliance Estática', unit: 'ml/cmH₂O', series: [{ key: 'compliance', label: 'Compliance', color: '#2563eb' }] },
  {
    title: 'Mechanical Power',
    unit: 'J/min',
    series: [{ key: 'mechanicalPower', label: 'MP', color: '#2563eb' }],
    referenceLines: [
      { value: 12, label: '12', color: '#eab308' },
      { value: 17, label: '17', color: '#ef4444' }
    ]
  }
];

const gasometryCharts: ChartConfig[] = [
  { title: 'SpO₂', unit: '%', series: [{ key: 'spo2', label: 'SpO₂', color: '#0ea5e9' }] },
  {
    title: 'Relación P/F',
    series: [{ key: 'pfRatio', label: 'P/F', color: '#0ea5e9' }],
    referenceLines: [
      { value: 300, label: 'Normal ≥ 300', color: '#22c55e' },
      { value: 200, label: 'SDRA leve', color: '#eab308' },
      { value: 100, label: 'SDRA moderado', color: '#f97316' }
    ]
  },
  {
    title: 'pH',
    series: [{ key: 'ph', label: 'pH', color: '#0ea5e9' }],
    referenceLines: [
      { value: 7.35, label: '7.35', color: '#ef4444' },
      { value: 7.45, label: '7.45', color: '#ef4444' }
    ]
  },
  { title: 'PaCO₂', unit: 'mmHg', series: [{ key: 'paco2', label: 'PaCO₂', color: '#0ea5e9' }] },
  { title: 'HCO₃', unit: 'mEq/L', series: [{ key: 'hco3', label: 'HCO₃', color: '#0ea5e9' }] }
];

const modeLabels: Record<string, string> = { VC: 'VCV', PC: 'PCV', PSV: 'PSV' };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function VMITrendsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { patients, sectors, getPatientVMIRecords } = useApp();

  const patient = patients.find((p) => p.id === patientId);
  const sector = patient ? sectors.find((s) => s.id === patient.sectorId) : null;
  const records = patient ? getPatientVMIRecords(patient.id) : [];
  // getPatientVMIRecords returns newest-first; charts need chronological order.
  const chronological = records.slice().reverse();

  const chartData: TrendChartPoint[] = chronological.map((r) => ({
    timestampMs: new Date(r.timestamp).getTime(),
    peep: r.peep,
    fio2: r.fio2,
    plateauPressure: r.plateauPressure || undefined,
    peakPressure: r.peakPressure,
    vtPerKg: r.vtPerKg || undefined,
    drivingPressure: r.drivingPressure || undefined,
    compliance: r.compliance,
    mechanicalPower: r.mechanicalPower,
    spo2: r.spo2,
    pfRatio: r.pfRatio,
    ph: r.ph,
    paco2: r.paco2,
    hco3: r.hco3
  }));

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Paciente no encontrado</p>
      </div>
    );
  }

  const first = chronological[0];
  const last = chronological[chronological.length - 1];
  const trackingDays =
    first && last ? Math.max(1, Math.round((new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 86400000)) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Tendencias VMI" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Paciente</div>
              <div className="text-2xl font-bold text-gray-900">{patient.alias}</div>
              {sector && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <BedDoubleIcon className="w-4 h-4" />
                  {sector.name} - Cama {patient.bedLabel ?? patient.bedId}
                </div>
              )}
            </div>
            <TrendingUpIcon className="w-8 h-8 text-blue-600" />
          </div>
          {records.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-600 mb-1">Registros</div>
                <div className="text-xl font-bold text-gray-900">{records.length}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Período</div>
                <div className="text-xl font-bold text-gray-900">{trackingDays}d</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Último modo</div>
                <div className="text-xl font-bold text-gray-900">{modeLabels[records[0].ventMode] ?? records[0].ventMode}</div>
              </div>
            </div>
          )}
        </Card>

        {records.length < 2 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {records.length === 0 ? 'Sin registros de monitorización VMI' : 'Se necesita más de un registro para ver tendencias'}
            </p>
            <p className="text-gray-400 mt-2">
              {records.length === 1
                ? 'Hay una sola monitorización cargada hasta ahora — la tendencia aparece a partir del segundo registro.'
                : 'Registrá monitorizaciones VMI para este paciente para ver su evolución acá.'}
            </p>
          </Card>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Parámetros Ventilatorios y Mecánica</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mechanicsCharts.map((chart) => (
                  <TrendChart key={chart.title} title={chart.title} unit={chart.unit} data={chartData} series={chart.series} referenceLines={chart.referenceLines} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Gasometría Arterial</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gasometryCharts.map((chart) => (
                  <TrendChart key={chart.title} title={chart.title} unit={chart.unit} data={chartData} series={chart.series} referenceLines={chart.referenceLines} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Detalle por Registro</h2>
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-2">Modo</th>
                      <th className="py-3 px-2 text-center">PEEP</th>
                      <th className="py-3 px-2 text-center">FiO₂</th>
                      <th className="py-3 px-2 text-center">Pplat</th>
                      <th className="py-3 px-2 text-center">ΔP</th>
                      <th className="py-3 px-2 text-center">Vt/kg</th>
                      <th className="py-3 px-2 text-center">MP</th>
                      <th className="py-3 px-2 text-center">P/F</th>
                      <th className="py-3 px-2 text-center">pH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 px-4 whitespace-nowrap text-gray-700">{formatDateTime(r.timestamp)}</td>
                        <td className="py-2 px-2 font-medium text-gray-900">{modeLabels[r.ventMode] ?? r.ventMode}</td>
                        <td className="py-2 px-2 text-center">{r.peep}</td>
                        <td className="py-2 px-2 text-center">{r.fio2}</td>
                        <td className="py-2 px-2 text-center">{r.plateauPressure || '-'}</td>
                        <td className="py-2 px-2 text-center">{r.drivingPressure || '-'}</td>
                        <td className="py-2 px-2 text-center">{r.vtPerKg || '-'}</td>
                        <td className="py-2 px-2 text-center">{r.mechanicalPower ?? '-'}</td>
                        <td className="py-2 px-2 text-center">{r.pfRatio ?? '-'}</td>
                        <td className="py-2 px-2 text-center">{r.ph ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
