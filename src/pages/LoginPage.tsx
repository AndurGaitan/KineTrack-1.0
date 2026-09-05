import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password || (mode === 'register' && !formData.name)) {
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo2_kinetrack.png" alt="KineTrack Logo" className="w-22 h-22 mx-auto mb-1 object-contain" />
          <p className="text-gray-600">Seguimiento clínico inteligente para kinesiología en UCI</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex mb-6 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && (
              <Input
                label="Nombre"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tu nombre"
                required
              />
            )}

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Un momento...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
