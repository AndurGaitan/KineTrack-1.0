import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/coordinator/dashboard', label: 'Dashboard' },
  { path: '/coordinator/schedule', label: 'Cronograma' },
  { path: '/coordinator/sectors', label: 'Sectores' },
  { path: '/coordinator/protocols', label: 'Protocolos' },
  { path: '/coordinator/users', label: 'Usuarios' },
];

export function CoordinatorNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 overflow-x-auto">
      <div className="flex gap-2 pb-2">
        {tabs.map((tab) => (
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
