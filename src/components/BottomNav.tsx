import { useNavigate, useLocation } from 'react-router-dom';
import { BedDoubleIcon, CalendarIcon, LayoutDashboardIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const baseTabs = [
  { path: '/dashboard', label: 'Pacientes', icon: BedDoubleIcon },
  { path: '/coordinator/schedule', label: 'Cronograma', icon: CalendarIcon },
];

const coordinadorOnlyTabs = [{ path: '/coordinator/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon }];

/**
 * Fixed bottom tab bar. Every logged-in user gets Pacientes + Cronograma —
 * team productivity/QI Dashboard is a coordinador-only management view, so
 * it's only added to the bar for that role (CoordinatorNav still covers the
 * Sectores/Protocolos/Usuarios admin cluster, reached from Dashboard).
 */
export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const tabs = user?.role === 'coordinador' ? [...baseTabs, ...coordinadorOnlyTabs] : baseTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className={`max-w-2xl mx-auto grid`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
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
