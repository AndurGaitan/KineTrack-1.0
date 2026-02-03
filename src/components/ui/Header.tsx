import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, UsersIcon } from 'lucide-react';
interface HeaderProps {
  title: string;
  showBack?: boolean;
  showPatientList?: boolean;
  sectorId?: string;
  action?: ReactNode;
}
export function Header({
  title,
  showBack = false,
  showPatientList = false,
  sectorId,
  action
}: HeaderProps) {
  const navigate = useNavigate();
  return <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:bg-gray-100 rounded-lg transition-colors" aria-label="Volver">
              <ArrowLeftIcon className="w-6 h-6" />
            </button>}
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showPatientList && sectorId && <button onClick={() => navigate(`/sector/${sectorId}`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium active:bg-blue-700 transition-colors">
              <UsersIcon className="w-5 h-5" />
              <span>Pacientes</span>
            </button>}
          {action && <div>{action}</div>}
        </div>
      </div>
    </header>;
}