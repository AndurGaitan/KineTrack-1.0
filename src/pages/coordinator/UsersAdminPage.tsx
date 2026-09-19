import { FormEvent, useEffect, useState } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { useApp } from '../../contexts/AppContext';
import * as authApi from '../../api/authApi';
import { User } from '../../types';

interface IssuedCredential {
  name: string;
  email: string;
  temporaryPassword: string;
  reason: 'created' | 'reset';
}

export function UsersAdminPage() {
  const { user: currentUser } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credential, setCredential] = useState<IssuedCredential | null>(null);
  const [copied, setCopied] = useState(false);

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

  const showCredential = (next: IssuedCredential) => {
    setCopied(false);
    setCredential(next);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user, temporaryPassword } = await authApi.createUser({ name: form.name, email: form.email });
      showCredential({ name: user.name, email: user.email, temporaryPassword, reason: 'created' });
      setForm({ name: '', email: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (u: User) => {
    if (!window.confirm(`Se generará una contraseña temporal para ${u.name} y la actual dejará de funcionar. ¿Continuar?`)) return;
    try {
      const { temporaryPassword } = await authApi.resetUserPassword(u.id);
      showCredential({ name: u.name, email: u.email, temporaryPassword, reason: 'reset' });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña');
    }
  };

  const handleCopy = async () => {
    if (!credential) return;
    const text = `KineTrack\nEmail: ${credential.email}\nContraseña temporal: ${credential.temporaryPassword}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        try {
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textarea);
        }
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Usuarios" showBack />
      <CoordinatorNav />

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Equipo</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">
              + Nuevo usuario
            </button>
          )}
        </div>

        {credential && (
          <Card className="border-2 border-green-300 bg-green-50">
            <div className="font-bold text-gray-900 mb-1">
              {credential.reason === 'created' ? 'Cuenta creada' : 'Contraseña restablecida'}: {credential.name}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Copiá estos datos ahora y enviáselos por privado: la contraseña no se vuelve a mostrar. Podrá cambiarla desde su perfil.
            </p>
            <div className="bg-white rounded-lg border border-green-200 p-3 font-mono text-sm space-y-1 mb-3">
              <div>
                <span className="text-gray-500">Email: </span>
                {credential.email}
              </div>
              <div>
                <span className="text-gray-500">Contraseña temporal: </span>
                <span className="font-bold">{credential.temporaryPassword}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white font-semibold">
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
              <button onClick={() => setCredential(null)} className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold">
                Cerrar
              </button>
            </div>
          </Card>
        )}

        {showForm && (
          <Card>
            <form onSubmit={handleCreate} className="space-y-4">
              <h3 className="font-bold text-gray-900">Nuevo usuario</h3>
              <Input label="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellido" required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@ejemplo.com" required />
              <p className="text-xs text-gray-500">Se crea como kinesiólogo con una contraseña temporal generada por el sistema. El rol se puede cambiar después.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !form.name.trim() || !form.email.trim()}>
                  {submitting ? 'Creando...' : 'Crear usuario'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">
                      {u.name} {u.id === currentUser?.id && <span className="text-xs text-gray-400">(vos)</span>}
                    </div>
                    <div className="text-sm text-gray-500 break-all">{u.email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={u.role === 'coordinador' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                      {u.role === 'coordinador' ? 'Coordinador' : 'Kinesiólogo'}
                    </Badge>
                    <button onClick={() => toggleRole(u)} className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold">
                      {u.role === 'coordinador' ? 'Quitar coordinación' : 'Hacer coordinador'}
                    </button>
                    <button onClick={() => handleReset(u)} className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold">
                      Restablecer contraseña
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
