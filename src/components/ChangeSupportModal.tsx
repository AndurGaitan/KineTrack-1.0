import { useState, FormEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { AirwayEventInput, AirwayEventType, SupportType } from '../types';
interface ChangeSupportModalProps {
  currentSupport: SupportType;
  onClose: () => void;
  onConfirm: (newSupport: SupportType, reason: string, date: string, airwayEvent?: AirwayEventInput) => void;
}
const supportOptions = [{
  value: 'imv',
  label: 'VMI - Ventilación Mecánica Invasiva'
}, {
  value: 'niv',
  label: 'VNI - Ventilación No Invasiva'
}, {
  value: 'hfnc',
  label: 'HFNC - Cánula Nasal de Alto Flujo'
}, {
  value: 'traqueostomia',
  label: 'Traqueostomía - Respiración Espontánea'
}, {
  value: 'conventional-oxygen',
  label: 'Oxígeno Convencional'
}, {
  value: 'room-air',
  label: 'Aire Ambiente'
}];
const reasonOptions = ['Extubación programada', 'Extubación no programada', 'Traqueostomía', 'Weaning exitoso', 'Escalamiento por deterioro', 'Mejoría clínica', 'Protocolo de destete', 'Otro'];

/**
 * Which airway-event confirmation applies for a given (current, new) support
 * transition — backs QI-02 (reintubación ≤48h) and the destete VNI/HFNC
 * achievements. VMI → Traqueostomía is deliberately excluded: placing a
 * tracheostomy isn't an extubation (the tube isn't removed, just changed),
 * so it shouldn't feed the extubation reintubation-rate indicator.
 */
function getAirwayQuestion(
  current: SupportType,
  next: SupportType | ''
): { type: AirwayEventType; question: string } | undefined {
  if (current === 'imv' && next !== 'traqueostomia') {
    return { type: 'extubacion', question: '¿Este cambio fue una extubación?' };
  }
  if (current === 'niv') return { type: 'destete-vni', question: '¿Este cambio fue un destete de VNI?' };
  if (current === 'hfnc') return { type: 'destete-hfnc', question: '¿Este cambio fue un destete de HFNC?' };
  return undefined;
}

export function ChangeSupportModal({
  currentSupport,
  onClose,
  onConfirm
}: ChangeSupportModalProps) {
  const [newSupport, setNewSupport] = useState<SupportType | ''>('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const airwayQuestion = getAirwayQuestion(currentSupport, newSupport);
  const [wasAirwayEvent, setWasAirwayEvent] = useState<'' | 'si' | 'no'>('');
  const [classification, setClassification] = useState<'programada' | 'accidental' | ''>('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newSupport) return;
    const finalReason = reason === 'Otro' ? customReason : reason;

    let airwayEvent: AirwayEventInput | undefined;
    if (airwayQuestion && wasAirwayEvent === 'si') {
      if (airwayQuestion.type === 'extubacion') {
        if (!classification) return; // guard: classification required, submit button already disabled too
        airwayEvent = { type: 'extubacion', classification };
      } else {
        airwayEvent = { type: airwayQuestion.type };
      }
    }

    onConfirm(newSupport as SupportType, finalReason, new Date(date).toISOString(), airwayEvent);
  };

  const canSubmit = !!newSupport && (!airwayQuestion || wasAirwayEvent !== '' ) && !(airwayQuestion?.type === 'extubacion' && wasAirwayEvent === 'si' && !classification);

  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Cambiar Soporte Respiratorio
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <strong>Soporte actual:</strong>{' '}
              {supportOptions.find(s => s.value === currentSupport)?.label}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              El episodio actual se cerrará y se creará uno nuevo con el soporte
              seleccionado.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo soporte respiratorio *
            </label>
            <select value={newSupport} onChange={e => setNewSupport(e.target.value as SupportType)} className="w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none bg-white" required>
              <option value="">Seleccionar...</option>
              {supportOptions.filter(opt => opt.value !== currentSupport).map(opt => <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo del cambio
            </label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none bg-white">
              <option value="">Seleccionar...</option>
              {reasonOptions.map(opt => <option key={opt} value={opt}>
                  {opt}
                </option>)}
            </select>
          </div>

          {reason === 'Otro' && <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especificar motivo
              </label>
              <input type="text" value={customReason} onChange={e => setCustomReason(e.target.value)} className="w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none" placeholder="Describir motivo..." />
            </div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y hora del cambio
            </label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none" required />
          </div>

          {airwayQuestion && <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-3">
              <label className="block text-sm font-semibold text-amber-900">
                {airwayQuestion.question} *
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setWasAirwayEvent('si')} className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${wasAirwayEvent === 'si' ? 'border-amber-600 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-600'}`}>
                  Sí
                </button>
                <button type="button" onClick={() => {
                setWasAirwayEvent('no');
                setClassification('');
              }} className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${wasAirwayEvent === 'no' ? 'border-amber-600 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-600'}`}>
                  No
                </button>
              </div>

              {airwayQuestion.type === 'extubacion' && wasAirwayEvent === 'si' && <div className="space-y-2">
                  <label className="block text-sm font-medium text-amber-900">
                    Clasificación *
                  </label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setClassification('programada')} className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${classification === 'programada' ? 'border-amber-600 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-600'}`}>
                      Programada
                    </button>
                    <button type="button" onClick={() => setClassification('accidental')} className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${classification === 'accidental' ? 'border-amber-600 bg-amber-100 text-amber-900' : 'border-gray-200 bg-white text-gray-600'}`}>
                      Accidental / auto-extubación
                    </button>
                  </div>
                  <p className="text-xs text-amber-700">
                    Las accidentales se excluyen del indicador de reintubación (ni suman ni restan).
                  </p>
                </div>}
            </div>}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={!canSubmit}>
              Confirmar Cambio
            </Button>
          </div>
        </form>
      </div>
    </div>;
}
