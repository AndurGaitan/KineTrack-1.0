import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ActivityIcon } from 'lucide-react';
export function LoginPage() {
  const navigate = useNavigate();
  const {
    login
  } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.password) {
      login({
        name: formData.name,
        email: formData.email
      });
      navigate('/dashboard');
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logo2_kinetrack.png"
            alt="KineTrack Logo"
            className="w-22 h-22 mx-auto mb-1 object-contain"
          />          
          <p className="text-gray-600">
          Seguimiento clínico inteligente para kinesiología en UCI
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Nombre" type="text" value={formData.name} onChange={e => setFormData({
            ...formData,
            name: e.target.value
          })} placeholder="Tu nombre" required />

            <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({
            ...formData,
            email: e.target.value
          })} placeholder="tu@email.com" required />

            <Input label="Contraseña" type="password" value={formData.password} onChange={e => setFormData({
            ...formData,
            password: e.target.value
          })} placeholder="••••••••" required />

            <Button type="submit" fullWidth>
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-600 mt-6 text-sm">
          Versión de demostración - Los datos se guardan localmente
        </p>
      </div>
    </div>;
}