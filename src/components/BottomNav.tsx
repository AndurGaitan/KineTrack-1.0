import { useNavigate, useLocation } from 'react-router-dom';
import { BedDoubleIcon, CalendarIcon, LayoutDashboardIcon } from 'lucide-react';

const tabs = [
  { path: '/dashboard', label: 'Pacientes', icon: BedDoubleIcon },
  { path: '/coordinator/schedule', label: 'Cronograma', icon: CalendarIcon },
  { path: '/coordinator/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
];

/**
 * Fixed bottom tab bar for a coordinador's 3 main areas. Kept separate from
 * CoordinatorNav (which handles the secondary Sectores/Protocolos/Usuarios
 * admin cluster) to avoid duplicating the same destinations in two navs.
 */
export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto grid grid-cols-3">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
