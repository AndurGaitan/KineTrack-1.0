import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import type { AppStage } from '../../types';

const stage1Includes = [
  'Prestaciones: KTR y KTM (un toque, sin nivel de movilización)',
  'Evaluaciones: MRC, VMI, VNI y HFNC (CAFO) solo con parámetros',
  'Decisión diaria de PVE (realizada, contraindicada o no realizada)',
  'Inicio de movilización activa y contraindicaciones (ventana de 72 h desde el inicio de la VMI)',
];

const stage1Hides = [
  'Gasometría arterial (pH, PaO₂, PaCO₂, HCO₃, exceso de bases) y score HACOR',
  'Nivel de movilización en las monitorizaciones y en el KTM',
  'Traqueostomía y ventilación espontánea',
  'Cronograma de personal',
];

export function StagePage() {
  const { stage, setStage } = useApp();
  const [saving, setSaving] = useState(false);

  const change = async (next: AppStage) => {
    if (next === stage || saving) return;
    setSaving(true);
    await setStage(next);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Etapa de uso" showBack />
      <CoordinatorNav />

      <main className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-1">¿Cómo usa la app el equipo?</h2>
          <p className="text-sm text-gray-600 mb-4">
            El cambio vale para todo el equipo y se puede revertir cuando quieras. Los datos ya cargados no se borran
            ni se modifican: solo cambia qué se muestra y qué se pide.
          </p>

          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Etapa de uso">
            {([1, 2] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={stage === value}
                disabled={saving}
                onClick={() => change(value)}
                className={`p-4 border-2 rounded-xl text-left transition-colors min-h-[72px] disabled:opacity-60 ${
                  stage === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-bold text-gray-900">Etapa {value}</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {value === 1 ? 'Registro esencial' : 'Registro completo'}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-2">Etapa 1 — registro esencial</h3>
          <div className="text-sm font-medium text-green-800 mb-1">Se registra</div>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-4">
            {stage1Includes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="text-sm font-medium text-amber-800 mb-1">Se oculta</div>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            {stage1Hides.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 mb-2">Etapa 2 — registro completo</h3>
          <p className="text-sm text-gray-700">
            Vuelve a mostrar gasometría y HACOR, nivel de movilización, traqueostomía con ventilación espontánea y
            Cronograma. Las decisiones de PVE y la movilización precoz siguen disponibles.
          </p>
        </Card>
      </main>
    </div>
  );
}
