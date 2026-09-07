import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ChangeSupportModal } from '../components/ChangeSupportModal';
import { ClosePatientModal } from '../components/ClosePatientModal';
import { ActionSheet } from '../components/ActionSheet';
import { EditIcon, BedDoubleIcon, ActivityIcon, WindIcon, DropletIcon, ChevronDownIcon, ChevronUpIcon, RepeatIcon, XCircleIcon, ClipboardPlusIcon, DumbbellIcon, ClipboardCheckIcon, BrainIcon, TrendingUpIcon } from 'lucide-react';
import { SupportType, ClosureReason, AirwayEventInput } from '../types';
const supportTypeLabels = {
  imv: 'VMI',
  niv: 'VNI',
  hfnc: 'HFNC',
  traqueostomia: 'TQT',
  'conventional-oxygen': 'O₂ Convencional',
  'room-air': 'Aire Ambiente'
};
const supportTypeFullLabels = {
  imv: 'Ventilación Mecánica Invasiva',
  niv: 'Ventilación No Invasiva',
  hfnc: 'Cánula Nasal de Alto Flujo',
  traqueostomia: 'Traqueostomía - Respiración Espontánea',
  'conventional-oxygen': 'Oxígeno Convencional',
  'room-air': 'Aire Ambiente'
};
const supportTypeIcons = {
  imv: ActivityIcon,
  niv: WindIcon,
  hfnc: DropletIcon,
  traqueostomia: WindIcon,
  'conventional-oxygen': DropletIcon,
  'room-air': DropletIcon
};
const supportTypeColors = {
  imv: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  niv: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  hfnc: {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    border: 'border-teal-200'
  },
  traqueostomia: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  'conventional-oxygen': {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200'
  },
  'room-air': {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200'
  }
};
export function PatientDetailPage() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    patients,
    sectors,
    getPatientVMIRecords,
    getPatientNIVRecords,
    getPatientHFNCRecords,
    getPatientTrachRecords,
    getPatientEpisodes,
    changeSupportType,
    closePatient
  } = useApp();
  const patient = patients.find(p => p.id === id);
  const sector = patient ? sectors.find(s => s.id === patient.sectorId) : null;
  const episodes = patient ? getPatientEpisodes(patient.id) : [];
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});
  const [showChangeSupportModal, setShowChangeSupportModal] = useState(false);
  const [showClosePatientModal, setShowClosePatientModal] = useState(false);
  const [showPrestacionMenu, setShowPrestacionMenu] = useState(false);
  if (!patient || !sector) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Paciente no encontrado</p>
      </div>;
  }
  const supportType = patient.supportType;
  const isClosed = patient.status === 'closed';
  // Same destinations as the big module card above — repeated here as the
  // top item of the Prestación menu so it's still reachable from there,
  // without making it the *only* way in (that card stays the 1-tap path,
  // since it's by far the most frequent action for a ventilated patient).
  const monitoringHubs: Partial<Record<SupportType, { label: string; path: string; icon: typeof ActivityIcon }>> = {
    imv: { label: 'Monitorización VMI', path: 'vmi', icon: ActivityIcon },
    niv: { label: 'Monitorización VNI', path: 'niv', icon: WindIcon },
    hfnc: { label: 'Monitorización HFNC', path: 'hfnc', icon: DropletIcon },
    traqueostomia: { label: 'Seguimiento de Traqueostomía', path: 'traqueostomia', icon: WindIcon },
  };
  const monitoringHub = monitoringHubs[supportType];
  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes(prev => ({
      ...prev,
      [episodeId]: !prev[episodeId]
    }));
  };
  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit'
      }),
      time: date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };
  const calculateEpisodeDuration = (startAt: string, endAt?: string) => {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    if (diffDays > 0) {
      return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
    }
    return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  };
  const handleChangeSupport = (newSupport: SupportType, reason: string, date: string, airwayEvent?: AirwayEventInput) => {
    changeSupportType(patient.id, newSupport, reason, date, airwayEvent);
    setShowChangeSupportModal(false);
  };
  const handleClosePatient = (reason: ClosureReason, date: string, notes: string) => {
    closePatient(patient.id, {
      reason,
      date,
      notes
    });
    setShowClosePatientModal(false);
    navigate(`/sector/${sector.id}`);
  };
  const getEpisodeRecords = (episodeId: string, supportType: SupportType) => {
    switch (supportType) {
      case 'imv':
        return getPatientVMIRecords(patient.id, episodeId);
      case 'niv':
        return getPatientNIVRecords(patient.id, episodeId);
      case 'hfnc':
        return getPatientHFNCRecords(patient.id, episodeId);
      case 'traqueostomia':
        return getPatientTrachRecords(patient.id, episodeId);
      default:
        return [];
    }
  };
  return <div className="min-h-screen bg-gray-50">
      <Header title={patient.alias} showBack showPatientList sectorId={sector.id} action={!isClosed ? <button onClick={() => navigate(`/patient/${patient.id}/edit`)} className="p-2 active:bg-gray-100 rounded-lg transition-colors" aria-label="Editar">
              <EditIcon className="w-5 h-5" />
            </button> : undefined} />

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Ubicación</div>
                <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <BedDoubleIcon className="w-5 h-5" />
                  {sector.name} - Cama {patient.bedLabel ?? patient.bedId}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="support" type={patient.supportType}>
                  {supportTypeLabels[patient.supportType]}
                </Badge>
                {isClosed && <Badge className="bg-gray-600 text-white">Cerrado</Badge>}
              </div>
            </div>
          </div>
        </Card>

        {isClosed && patient.closure && <Card className="bg-gray-50 border-gray-300">
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Caso cerrado</h3>
                <p className="text-sm text-gray-700">
                  {patient.closure.reason === 'discharge' && 'Alta médica'}
                  {patient.closure.reason === 'transfer-ward' && 'Pase a sala general'}
                  {patient.closure.reason === 'transfer-facility' && 'Traslado a otra institución'}
                  {patient.closure.reason === 'deceased' && 'Fallecimiento'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {formatDateTime(patient.closure.date).date} -{' '}
                  {formatDateTime(patient.closure.date).time}
                </p>
                {patient.closure.notes && <p className="text-sm text-gray-700 mt-2 italic">
                    {patient.closure.notes}
                  </p>}
              </div>
            </div>
          </Card>}

        {!isClosed && <>
            <h2 className="text-lg font-bold text-gray-900 -mb-2">Prestaciones</h2>

            {/* Current Support Module */}
            {supportType === 'imv' && <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ActivityIcon className="w-6 h-6 text-blue-600" />
                      <h3 className="text-lg font-bold text-gray-900">
                        Monitorización Avanzada VMI
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Herramienta de nivel experto para{' '}
                      {supportTypeFullLabels[supportType]}
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate(`/patient/${patient.id}/vmi`)} className="w-full bg-blue-600">
                  Acceder a Monitorización VMI
                </Button>
              </Card>}

            {supportType === 'niv' && <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <WindIcon className="w-6 h-6 text-purple-600" />
                      <h3 className="text-lg font-bold text-gray-900">
                        Monitorización VNI
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Evaluación de interfaz, piel, HACOR y parámetros de{' '}
                      {supportTypeFullLabels[supportType]}
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate(`/patient/${patient.id}/niv`)} className="w-full bg-purple-600">
                  Acceder a Monitorización VNI
                </Button>
              </Card>}

            {supportType === 'hfnc' && <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DropletIcon className="w-6 h-6 text-teal-600" />
                      <h3 className="text-lg font-bold text-gray-900">
                        Monitorización HFNC
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Evaluación de flujo, ROX, humidificación y ajuste de{' '}
                      {supportTypeFullLabels[supportType]}
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate(`/patient/${patient.id}/hfnc`)} className="w-full bg-teal-600">
                  Acceder a Monitorización HFNC
                </Button>
              </Card>}

            {supportType === 'traqueostomia' && <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <WindIcon className="w-6 h-6 text-indigo-600" />
                      <h3 className="text-lg font-bold text-gray-900">
                        Seguimiento de Traqueostomía
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Días sin VMI, Glasgow, PEmax, pruebas de balón/cánula y deglución para{' '}
                      {supportTypeFullLabels[supportType]}
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate(`/patient/${patient.id}/traqueostomia`)} className="w-full bg-indigo-600">
                  Acceder a Seguimiento de Traqueostomía
                </Button>
              </Card>}

            {supportType === 'conventional-oxygen' && <Card className="bg-gray-50 border-gray-200">
                <div className="text-center py-6">
                  <p className="text-gray-600">
                    Soporte respiratorio básico - Sin módulo avanzado disponible
                  </p>
                </div>
              </Card>}

            {/* Team productivity / quality logging */}
            <Button variant="secondary" onClick={() => setShowPrestacionMenu(true)} fullWidth className="flex items-center justify-center gap-2">
              <ClipboardPlusIcon className="w-5 h-5" />
              + Registrar Prestación
            </Button>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setShowChangeSupportModal(true)} className="flex items-center justify-center gap-2">
                <RepeatIcon className="w-5 h-5" />
                Cambiar Soporte
              </Button>
              <Button variant="danger" onClick={() => setShowClosePatientModal(true)} className="flex items-center justify-center gap-2">
                <XCircleIcon className="w-5 h-5" />
                Cerrar Caso
              </Button>
            </div>
          </>}

        {/* Episode History */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Historial por Episodios
          </h2>

          {episodes.length === 0 ? <Card className="text-center py-12">
              <p className="text-gray-500 text-lg">Sin episodios registrados</p>
            </Card> : <div className="space-y-4">
              {episodes.slice().reverse().map((episode, index) => {
            const Icon = supportTypeIcons[episode.supportType];
            const colors = supportTypeColors[episode.supportType];
            const records = getEpisodeRecords(episode.id, episode.supportType);
            const duration = calculateEpisodeDuration(episode.startAt, episode.endAt);
            const isActive = !episode.endAt;
            const isExpanded = expandedEpisodes[episode.id];
            return <Card key={episode.id} className={`${colors.border} border-2`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${colors.bg} rounded-lg`}>
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {supportTypeLabels[episode.supportType]} ·{' '}
                              {duration}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatDateTime(episode.startAt).date} -{' '}
                              {formatDateTime(episode.startAt).time}
                              {episode.endAt && ` → ${formatDateTime(episode.endAt).date} - ${formatDateTime(episode.endAt).time}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isActive && <Badge className="bg-green-100 text-green-700">
                              Activo
                            </Badge>}
                          <Badge className={colors.bg + ' ' + colors.text}>
                            {records.length} registro
                            {records.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>

                      {episode.reason && <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Motivo:</strong> {episode.reason}
                          </p>
                        </div>}

                      {records.length > 0 && <>
                          <div className="space-y-3">
                            {records.slice(0, isExpanded ? undefined : 3).map(record => {
                    const {
                      date,
                      time
                    } = formatDateTime(record.timestamp);
                    return <div key={record.id} onClick={() => {
                      if (episode.supportType === 'imv') navigate(`/patient/${patient.id}/vmi/${record.id}`);
                      if (episode.supportType === 'niv') navigate(`/patient/${patient.id}/niv/${record.id}`);
                      if (episode.supportType === 'hfnc') navigate(`/patient/${patient.id}/hfnc/${record.id}`);
                      if (episode.supportType === 'traqueostomia') navigate(`/patient/${patient.id}/traqueostomia/${record.id}`);
                    }} className="p-4 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm text-gray-600">
                                        {date} - {time}
                                      </span>
                                      {episode.supportType === 'imv' && 'protectiveVentilation' in record && <Badge variant="risk" type={record.protectiveVentilation ? 'low' : 'medium'}>
                                            {record.protectiveVentilation ? 'Protectiva' : 'Revisar'}
                                          </Badge>}
                                      {episode.supportType === 'niv' && 'hacorScore' in record && <Badge variant="risk" type={record.hacorScore > 5 ? 'high' : record.hacorScore >= 3 ? 'medium' : 'low'}>
                                            HACOR {record.hacorScore}
                                          </Badge>}
                                      {episode.supportType === 'hfnc' && 'roxIndex' in record && <Badge variant="risk" type={record.roxIndex >= 4.88 ? 'low' : record.roxIndex >= 3.85 ? 'medium' : 'high'}>
                                            ROX {record.roxIndex}
                                          </Badge>}
                                      {episode.supportType === 'traqueostomia' && 'glasgow' in record && <Badge className="bg-indigo-100 text-indigo-700">
                                            Glasgow {record.glasgow}
                                          </Badge>}
                                    </div>

                                    {episode.supportType === 'imv' && 'vtPerKg' in record && <div className="grid grid-cols-4 gap-3 text-center">
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              Vt/kg
                                            </div>
                                            <div className={`text-lg font-bold ${record.vtPerKg > 8 ? 'text-red-600' : 'text-gray-900'}`}>
                                              {record.vtPerKg}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              Pplat
                                            </div>
                                            <div className={`text-lg font-bold ${record.plateauPressure > 30 ? 'text-red-600' : 'text-gray-900'}`}>
                                              {record.plateauPressure}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              ΔP
                                            </div>
                                            <div className={`text-lg font-bold ${record.drivingPressure > 15 ? 'text-red-600' : 'text-gray-900'}`}>
                                              {record.drivingPressure}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              PEEP
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.peep}
                                            </div>
                                          </div>
                                        </div>}

                                    {episode.supportType === 'niv' && 'ipap' in record && <div className="grid grid-cols-4 gap-3 text-center">
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              IPAP
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.ipap}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              EPAP
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.epap}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              FiO₂
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.fio2}%
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              Piel
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.skinIntegrity === 'no-lesions' ? '✓' : '⚠'}
                                            </div>
                                          </div>
                                        </div>}

                                    {episode.supportType === 'hfnc' && 'flow' in record && <div className="grid grid-cols-4 gap-3 text-center">
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              Flujo
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.flow}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              FiO₂
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.fio2}%
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              SpO₂
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.spo2}%
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              Humid
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.humidificationWorking ? '✓' : '✗'}
                                            </div>
                                          </div>
                                        </div>}

                                    {episode.supportType === 'traqueostomia' && 'glasgow' in record && <div className="grid grid-cols-3 gap-3 text-center">
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              Glasgow
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.glasgow}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              PEmax
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.pemax ?? '-'}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-xs text-gray-600">
                                              Deglución
                                            </div>
                                            <div className="text-lg font-bold text-gray-900">
                                              {record.swallowingTest ?? '-'}
                                            </div>
                                          </div>
                                        </div>}
                                  </div>;
                  })}
                          </div>

                          {records.length > 3 && <button onClick={() => toggleEpisode(episode.id)} className={`w-full mt-3 py-2 text-sm font-medium flex items-center justify-center gap-1 rounded-lg transition-colors ${colors.text} hover:${colors.bg}`}>
                              {isExpanded ? <>
                                  Ver menos{' '}
                                  <ChevronUpIcon className="w-4 h-4" />
                                </> : <>
                                  Ver todos ({records.length}){' '}
                                  <ChevronDownIcon className="w-4 h-4" />
                                </>}
                            </button>}
                        </>}
                    </Card>;
          })}
            </div>}
        </div>
      </main>

      {showChangeSupportModal && <ChangeSupportModal currentSupport={patient.supportType} onClose={() => setShowChangeSupportModal(false)} onConfirm={handleChangeSupport} />}

      {showClosePatientModal && <ClosePatientModal patientAlias={patient.alias} onClose={() => setShowClosePatientModal(false)} onConfirm={handleClosePatient} />}

      {showPrestacionMenu && <ActionSheet title="Registrar Prestación" onClose={() => setShowPrestacionMenu(false)} options={[...(monitoringHub ? [{
      label: monitoringHub.label,
      description: 'Planilla de monitorización habitual',
      icon: monitoringHub.icon,
      onClick: () => navigate(`/patient/${patient.id}/${monitoringHub.path}`)
    }] : []), {
      label: 'Kinesioterapia Motora',
      description: 'Movilización, sedestación, ejercicios',
      icon: DumbbellIcon,
      onClick: () => navigate(`/patient/${patient.id}/prestacion/new?type=kinesioterapia-motora`)
    }, {
      label: 'Evaluación',
      description: 'Evaluación clínica general',
      icon: ClipboardCheckIcon,
      onClick: () => navigate(`/patient/${patient.id}/prestacion/new?type=evaluacion`)
    }, {
      label: 'Evaluación MRC',
      description: 'Fuerza muscular (DAUCI) — Glasgow, PEmax, deglución',
      icon: BrainIcon,
      onClick: () => navigate(`/patient/${patient.id}/mrc/new`)
    }, {
      label: 'Progresión',
      description: 'Avance en el plan kinésico',
      icon: TrendingUpIcon,
      onClick: () => navigate(`/patient/${patient.id}/prestacion/new?type=progresion`)
    }]} />}
    </div>;
}