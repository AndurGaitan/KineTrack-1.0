import { Bed, Patient } from '../types';
import { BedDoubleIcon, PlusIcon, UserIcon } from 'lucide-react';
interface BedGridProps {
  beds: Bed[];
  patients: Patient[];
  onBedClick: (bed: Bed, patient?: Patient) => void;
}
const supportTypeColors = {
  imv: 'bg-blue-100 border-blue-300 text-blue-700',
  niv: 'bg-purple-100 border-purple-300 text-purple-700',
  hfnc: 'bg-teal-100 border-teal-300 text-teal-700',
  'conventional-oxygen': 'bg-gray-100 border-gray-300 text-gray-700',
  'room-air': 'bg-green-100 border-green-300 text-green-700'
};
const supportTypeLabels = {
  imv: 'VMI',
  niv: 'VNI',
  hfnc: 'HFNC',
  'conventional-oxygen': 'O₂',
  'room-air': 'Aire'
};
export function BedGrid({
  beds,
  patients,
  onBedClick
}: BedGridProps) {
  return <div className="grid grid-cols-2 gap-4">
      {beds.map(bed => {
      const patient = patients.find(p => p.bedId === bed.id);
      const isEmpty = !patient;
      if (isEmpty) {
        // Empty bed - clickable to add patient
        return <button key={bed.id} onClick={() => onBedClick(bed)} className="group min-h-[140px] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 hover:border-blue-400 hover:bg-blue-50">
              <div className="relative">
                <BedDoubleIcon className="w-10 h-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlusIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  Cama {bed.label}
                </div>
                <div className="text-sm text-gray-500 mt-1">Disponible</div>
              </div>
            </button>;
      }
      // Occupied bed - clickable to view patient
      const colorClass = supportTypeColors[patient.supportType];
      const supportLabel = supportTypeLabels[patient.supportType];
      return <button key={bed.id} onClick={() => onBedClick(bed, patient)} className={`min-h-[140px] rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all active:scale-95 ${colorClass}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">Cama {bed.label}</span>
              </div>
              <div className="px-2 py-1 bg-white/50 rounded-md text-xs font-bold">
                {supportLabel}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold">{patient.alias}</div>
                {patient.status === 'closed' && <div className="text-xs mt-1 opacity-75">Cerrado</div>}
              </div>
            </div>
          </button>;
    })}
    </div>;
}