import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { LogOutIcon } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(name.trim());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Mi Perfil" showBack />

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Badge className={user.role === 'coordinador' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
              {user.role === 'coordinador' ? 'Coordinador' : 'Kinesiólogo'}
            </Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="Tu nombre"
              required
            />
            <Input label="Email" value={user.email} disabled />

            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-green-600">✓ Perfil actualizado</p>}

            <Button type="submit" fullWidth disabled={submitting || name.trim() === user.name}>
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Card>

        <Button variant="danger" onClick={handleLogout} fullWidth className="flex items-center justify-center gap-2">
          <LogOutIcon className="w-5 h-5" />
          Cerrar Sesión
        </Button>
      </main>
    </div>
  );
}
