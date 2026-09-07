import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AlertPanel } from '../components/AlertPanel';
import { CheckCircleIcon, AlertCircleIcon, ZapIcon, CalendarIcon } from 'lucide-react';
import { ventModes, mobilizationLevels } from '../utils/vmiEducation';
const asynchronyTypes = [{
  value: 'ineffective-effort',
  label: 'Esfuerzo inefectivo'
}, {
  value: 'double-trigger',
  label: 'Doble disparo'
}, {
  value: 'premature-cycling',
  label: 'Ciclado prematuro'
}, {
  value: 'delayed-cycling',
  label: 'Ciclado tardío'
}, {
  value: 'auto-peep',
  label: 'Auto-PEEP'
}];
export function VMIRecordDetailPage() {
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
    getVMIRecord,
    sectors
  } = useApp();
  const patient = patients.find(p => p.id === patientId);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const record = recordId ? getVMIRecord(recordId) : undefined;
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
  const ventModeLabel = ventModes.find(m => m.value === record.ventMode)?.label || record.ventMode;
  const mobilizationLabel = mobilizationLevels.find(m => m.value === record.mobilizationLevel)?.label || '';
  const controlVariableLabel = record.controlVariable === 'volume' ? 'Volumen' : record.controlVariable === 'pressure' ? 'Presión' : 'Dual';
  return <div className="min-h-screen bg-gray-50">
      <Header title="Detalle de Monitorización VMI" showBack showPatientList sectorId={sector?.id} />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
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
            {record.protectiveVentilation ? <div className="flex items-center gap-2 text-green-600">
                <CheckCircleIcon className="w-6 h-6" />
                <span className="font-medium">Ventilación Protectiva</span>
              </div> : <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircleIcon className="w-6 h-6" />
                <span className="font-medium">Revisar Parámetros</span>
              </div>}
          </div>
        </Card>

        {/* Ventilator Mode */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Modo Ventilatorio
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Modo</div>
              <div className="text-xl font-bold text-gray-900">
                {ventModeLabel}
              </div>
              {record.ventModeOther && <div className="text-sm text-gray-600 mt-1">
                  ({record.ventModeOther})
                </div>}
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">
                Variable de Control
              </div>
              <div className="text-xl font-bold text-gray-900">
                {controlVariableLabel}
              </div>
            </div>
          </div>
        </Card>

        {/* Mechanical Power (NEW) */}
        {record.mechanicalPower && <Card>
            <div className="flex items-center gap-2 mb-4">
              <ZapIcon className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Mechanical Power
              </h3>
            </div>

            <div className={`p-6 rounded-xl text-center ${record.mechanicalPower > 17 ? 'bg-red-50' : record.mechanicalPower > 12 ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <div className="text-sm text-gray-600 mb-2">
                Potencia Mecánica
              </div>
              <div className={`text-5xl font-bold ${record.mechanicalPower > 17 ? 'text-red-600' : record.mechanicalPower > 12 ? 'text-yellow-600' : 'text-green-600'}`}>
                {record.mechanicalPower}
              </div>
              <div className="text-lg font-medium mt-1">J/min</div>
              <div className="text-sm mt-3 font-medium">
                {record.mechanicalPower > 17 && 'Alto riesgo de VILI'}
                {record.mechanicalPower > 12 && record.mechanicalPower <= 17 && 'Zona gris'}
                {record.mechanicalPower <= 12 && 'Rango seguro'}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <p className="text-xs text-amber-900">
                Este valor es una estimación basada en los parámetros
                ingresados. MP es un indicador integrador y no reemplaza el
                juicio clínico.
              </p>
            </div>
          </Card>}

        {/* Lung Protection */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Protección Pulmonar
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Peso Predicho</div>
                <div className="text-2xl font-bold text-gray-900">
                  {record.predictedBodyWeight} kg
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  Frecuencia Resp.
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {record.respiratoryRate || '-'} rpm
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl ${record.vtPerKg > 8 ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="text-sm text-gray-600 mb-1">Vt/kg</div>
                <div className={`text-3xl font-bold ${record.vtPerKg > 8 ? 'text-red-600' : 'text-green-600'}`}>
                  {record.vtPerKg}
                </div>
              </div>
              <div className={`p-4 rounded-xl ${record.plateauPressure > 30 ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="text-sm text-gray-600 mb-1">Pplat</div>
                <div className={`text-3xl font-bold ${record.plateauPressure > 30 ? 'text-red-600' : 'text-green-600'}`}>
                  {record.plateauPressure}
                </div>
              </div>
              <div className={`p-4 rounded-xl ${record.drivingPressure > 15 ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="text-sm text-gray-600 mb-1">ΔP</div>
                <div className={`text-3xl font-bold ${record.drivingPressure > 15 ? 'text-red-600' : 'text-green-600'}`}>
                  {record.drivingPressure}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Vt Espirado</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.tidalVolumeExpired} ml
                </div>
              </div>
              {record.peakPressure && <div>
                  <div className="text-sm text-gray-600 mb-1">Ppeak</div>
                  <div className="text-xl font-bold text-gray-900">
                    {record.peakPressure} cmH₂O
                  </div>
                </div>}
              <div>
                <div className="text-sm text-gray-600 mb-1">PEEP</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.peep} cmH₂O
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">FiO₂</div>
                <div className="text-xl font-bold text-gray-900">
                  {record.fio2}%
                </div>
              </div>
            </div>

            {record.compliance && <div className="p-4 rounded-xl bg-blue-50">
                <div className="text-sm text-gray-600 mb-1">
                  Compliance Estática
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {record.compliance} ml/cmH₂O
                </div>
              </div>}
          </div>
        </Card>

        {/* Synchrony */}
        {record.hasAsynchrony && <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Sincronía Paciente-Ventilador
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircleIcon className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-gray-900">
                  Asincronías detectadas
                </span>
              </div>
              {record.asynchronyFrequency && <div className="text-sm text-gray-600">
                  Frecuencia:{' '}
                  <span className="font-medium text-gray-900">
                    {record.asynchronyFrequency === 'rare' && 'Raras'}
                    {record.asynchronyFrequency === 'occasional' && 'Ocasionales'}
                    {record.asynchronyFrequency === 'frequent' && 'Frecuentes'}
                  </span>
                </div>}
              <div className="flex flex-wrap gap-2 mt-2">
                {record.asynchronyTypes.map(type => {
              const asyncType = asynchronyTypes.find(a => a.value === type);
              return asyncType ? <Badge key={type} className="bg-yellow-100 text-yellow-800">
                      {asyncType.label}
                    </Badge> : null;
            })}
              </div>
            </div>
          </Card>}

        {/* Oxygenation & Acid-Base (UPDATED) */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Oxigenación y Equilibrio Ácido-Base
          </h3>
          <div className="space-y-4">
            {record.pfRatio && <div className={`p-4 rounded-xl ${record.pfRatio < 200 ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="text-sm text-gray-600 mb-1">Relación P/F</div>
                <div className={`text-3xl font-bold ${record.pfRatio < 200 ? 'text-red-600' : 'text-green-600'}`}>
                  {record.pfRatio}
                </div>
                <div className="text-sm mt-1 text-gray-700">
                  {record.pfRatio < 100 && 'SDRA Severo'}
                  {record.pfRatio >= 100 && record.pfRatio < 200 && 'SDRA Moderado'}
                  {record.pfRatio >= 200 && record.pfRatio < 300 && 'SDRA Leve'}
                  {record.pfRatio >= 300 && 'Normal'}
                </div>
              </div>}

            <div className="grid grid-cols-2 gap-4">
              {record.spo2 && <div>
                  <div className="text-sm text-gray-600 mb-1">SpO₂</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {record.spo2}%
                  </div>
                </div>}
              {record.pao2 && <div>
                  <div className="text-sm text-gray-600 mb-1">PaO₂</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {record.pao2} mmHg
                  </div>
                </div>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {record.paco2 && <div>
                  <div className="text-sm text-gray-600 mb-1">PaCO₂</div>
                  <div className="text-xl font-bold text-gray-900">
                    {record.paco2} mmHg
                  </div>
                </div>}
              {record.ph && <div>
                  <div className="text-sm text-gray-600 mb-1">pH</div>
                  <div className="text-xl font-bold text-gray-900">
                    {record.ph}
                  </div>
                </div>}
              {record.hco3 && <div>
                  <div className="text-sm text-gray-600 mb-1">HCO₃</div>
                  <div className="text-xl font-bold text-gray-900">
                    {record.hco3} mEq/L
                  </div>
                </div>}
            </div>

            {/* Acid-Base Interpretation */}
            {record.ph && record.hco3 && <div className={`p-4 rounded-xl ${record.ph < 7.35 || record.ph > 7.45 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Equilibrio Ácido-Base
                </div>
                <div className="text-sm text-gray-700">
                  {record.ph >= 7.35 && record.ph <= 7.45 && 'Balance normal'}
                  {record.ph < 7.35 && record.hco3 < 22 && 'Acidosis metabólica'}
                  {record.ph < 7.35 && record.hco3 >= 22 && 'Acidosis respiratoria'}
                  {record.ph > 7.45 && record.hco3 > 26 && 'Alcalosis metabólica'}
                  {record.ph > 7.45 && record.hco3 <= 26 && 'Alcalosis respiratoria'}
                </div>
              </div>}
          </div>
        </Card>

        {/* Weaning */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Estado de Destete
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">Estado</div>
              <div className="text-lg font-medium text-gray-900">
                {record.weaningStatus === 'not-candidate' && 'No candidato'}
                {record.weaningStatus === 'candidate' && 'Candidato a destete'}
                {record.weaningStatus === 'sbt-trial' && 'En prueba de respiración espontánea'}
                {record.weaningStatus === 'extubated' && 'Extubado'}
              </div>
            </div>
            {record.sbtPerformed && <>
                <div>
                  <div className="text-sm text-gray-600 mb-1">
                    SBT Realizada
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {record.sbtType}
                  </div>
                </div>
                {record.sbtResult && <div>
                    <div className="text-sm text-gray-600 mb-1">Resultado</div>
                    <Badge variant="risk" type={record.sbtResult === 'success' ? 'low' : 'high'}>
                      {record.sbtResult === 'success' ? 'Exitosa' : 'Fallida'}
                    </Badge>
                    {record.sbtResult === 'failure' && record.sbtFailureReason && <p className="text-sm text-gray-700 mt-2">
                          Motivo: {record.sbtFailureReason}
                        </p>}
                  </div>}
              </>}
          </div>
        </Card>

        {/* Mobilization */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Movilización</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">Nivel Máximo</div>
              <div className="text-2xl font-bold text-gray-900">
                Nivel {record.mobilizationLevel}: {mobilizationLabel}
              </div>
            </div>
            {record.mobilizationBarrier && <div>
                <div className="text-sm text-gray-600 mb-1">Barrera</div>
                <div className="text-gray-900">
                  {record.mobilizationBarrier}
                </div>
              </div>}
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