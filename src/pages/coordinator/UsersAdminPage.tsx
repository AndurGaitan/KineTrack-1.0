import { useEffect, useState } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { useApp } from '../../contexts/AppContext';
import * as authApi from '../../api/authApi';
import { User } from '../../types';

export function UsersAdminPage() {
  const { user: currentUser } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    authApi
      .listUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleRole = async (u: User) => {
    const newRole = u.role === 'coordinador' ? 'kinesiologo' : 'coordinador';
    if (u.id === currentUser?.id && newRole !== 'coordinador') {
      if (!window.confirm('Vas a quitarte tu propio rol de coordinador. ¿Continuar?')) return;
    }
    await authApi.setUserRole(u.id, newRole);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Usuarios" showBack />
      <CoordinatorNav />

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Roles del equipo</h2>
        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">
                      {u.name} {u.id === currentUser?.id && <span className="text-xs text-gray-400">(vos)</span>}
                    </div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={u.role === 'coordinador' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                      {u.role === 'coordinador' ? 'Coordinador' : 'Kinesiólogo'}
                    </Badge>
                    <button onClick={() => toggleRole(u)} className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold">
                      {u.role === 'coordinador' ? 'Quitar coordinación' : 'Hacer coordinador'}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
