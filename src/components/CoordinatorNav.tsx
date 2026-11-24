import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

// Secondary nav for the admin cluster (config screens, not everyday
// navigation). Dashboard/Cronograma live in the bottom tab bar instead —
// keeping them here too would just duplicate the same destinations.
const tabs = [
  { path: '/coordinator/sectors', label: 'Sectores' },
  { path: '/coordinator/protocols', label: 'Protocolos' },
  { path: '/coordinator/casos', label: 'Casos' },
  { path: '/coordinator/biblioteca', label: 'Biblioteca' },
  { path: '/coordinator/users', label: 'Usuarios' },
  { path: '/coordinator/vmi', label: 'VMI' },
  { path: '/coordinator/carga-masiva', label: 'Carga Masiva' },
  { path: '/coordinator/etapa', label: 'Etapa' },
];

export function CoordinatorNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { qualityIndicatorsV2 } = useApp();
  // La pestaña de calidad v2 (modo sombra) solo aparece con la flag activa.
  const visibleTabs = qualityIndicatorsV2 ? [...tabs, { path: '/coordinator/calidad-sombra', label: 'Calidad v2' }] : tabs;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 overflow-x-auto">
      <div className="flex gap-2 pb-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              location.pathname === tab.path ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
