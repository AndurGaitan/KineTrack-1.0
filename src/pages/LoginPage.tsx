import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      return;
    }

    setSubmitting(true);
    try {
      await login(formData.email, formData.password);
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
          <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">Iniciar sesión</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              {submitting ? 'Un momento...' : 'Ingresar'}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            ¿No tenés cuenta o olvidaste tu contraseña? Pedísela al coordinador del servicio.
          </p>
        </div>
      </div>
    </div>
  );
}
