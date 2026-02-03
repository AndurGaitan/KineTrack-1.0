export const vmiEducation = {
  ventMode: {
    title: 'Modo Ventilatorio',
    definition: 'Determina cómo el ventilador entrega la ventilación al paciente.',
    importance: 'El modo define la variable de control (volumen o presión) y afecta directamente la estrategia ventilatoria.',
    target: 'Seleccionar según condición clínica y objetivos terapéuticos',
    example: 'VC: control de volumen. PC: control de presión. PRVC: dual control.'
  },
  controlVariable: {
    title: 'Variable de Control',
    definition: 'La variable que el ventilador mantiene constante durante la inspiración.',
    importance: 'Define cómo se calcula el Mechanical Power y la estrategia de protección pulmonar.',
    target: 'Volumen: más predecible. Presión: mejor distribución de gas',
    example: 'VC controla volumen, PC controla presión, PRVC combina ambos.'
  },
  mechanicalPower: {
    title: 'Mechanical Power (Potencia Mecánica)',
    definition: 'Energía por minuto transferida del ventilador al sistema respiratorio, medida en J/min.',
    importance: 'Indicador integrador de VILI (lesión pulmonar inducida por ventilación). Valores altos se asocian con peor pronóstico.',
    target: '< 12 J/min: seguro. 12-17 J/min: zona gris. > 17 J/min: alto riesgo',
    example: 'MP combina Vt, FR, presiones y flujo en un solo número. Es más sensible que parámetros individuales.'
  },
  peakPressure: {
    title: 'Presión Pico (Ppeak)',
    definition: 'Presión máxima alcanzada en la vía aérea durante la inspiración.',
    importance: 'Necesaria para calcular Mechanical Power en modo VC. Refleja resistencia de vía aérea + compliance.',
    target: '< 35 cmH₂O generalmente',
    example: 'Ppeak alta puede indicar broncoespasmo, secreciones o tubo doblado.'
  },
  hco3: {
    title: 'Bicarbonato (HCO₃)',
    definition: 'Concentración de bicarbonato en sangre arterial, componente metabólico del equilibrio ácido-base.',
    importance: 'Permite diferenciar trastornos respiratorios de metabólicos y evaluar compensación.',
    target: '22-26 mEq/L',
    example: 'HCO₃ bajo + pH bajo = acidosis metabólica. HCO₃ alto + pH alto = alcalosis metabólica.'
  },
  vtPerKg: {
    title: 'Volumen Tidal por Peso (Vt/kg)',
    definition: 'Volumen corriente normalizado por el peso corporal predicho del paciente.',
    importance: 'Parámetro fundamental de ventilación protectora. Vt altos causan volutrauma y biotrauma.',
    target: '6-8 ml/kg de peso predicho (no peso real)',
    example: 'Paciente 70kg PBW, Vt 420ml → 6 ml/kg (protectivo)'
  },
  plateauPressure: {
    title: 'Presión Meseta (Pplat)',
    definition: 'Presión alveolar al final de la inspiración, medida con pausa inspiratoria de 0.5-1 segundo.',
    importance: 'Refleja la presión real en los alvéolos. Predictor de barotrauma y mortalidad.',
    target: '≤ 30 cmH₂O (≤ 28 cmH₂O en SDRA severo)',
    example: 'Pplat 32 cmH₂O → riesgo de sobredistensión alveolar'
  },
  drivingPressure: {
    title: 'Driving Pressure (ΔP)',
    definition: "Diferencia entre Pplat y PEEP. Representa la presión que 'mueve' el volumen tidal.",
    importance: 'Mejor predictor de mortalidad que Vt o Pplat aislados. Refleja strain pulmonar.',
    target: '≤ 15 cmH₂O (idealmente < 13 cmH₂O)',
    example: 'Pplat 28, PEEP 10 → ΔP 18 cmH₂O (alto riesgo)'
  },
  peep: {
    title: 'PEEP (Presión Positiva al Final de la Espiración)',
    definition: 'Presión positiva mantenida en la vía aérea al final de la espiración.',
    importance: 'Previene colapso alveolar, mejora oxigenación, pero puede causar sobredistensión.',
    target: 'Titular según oxigenación y mecánica (tabla PEEP/FiO₂)',
    example: 'SDRA: PEEP 10-15 cmH₂O. Pulmón normal: 5-8 cmH₂O'
  },
  compliance: {
    title: 'Compliance (Distensibilidad)',
    definition: "Cambio de volumen por unidad de presión. Mide la 'rigidez' del sistema respiratorio.",
    importance: 'Refleja la capacidad del pulmón de expandirse. Baja en SDRA, fibrosis, edema.',
    target: 'Normal: 50-100 ml/cmH₂O. SDRA: < 40 ml/cmH₂O',
    example: 'Compliance 25 ml/cmH₂O → pulmón muy rígido, requiere presiones altas'
  },
  pfRatio: {
    title: 'Relación PaO₂/FiO₂ (P/F)',
    definition: 'Cociente entre presión arterial de oxígeno y fracción inspirada de oxígeno.',
    importance: 'Define severidad de SDRA y guía estrategias ventilatorias.',
    target: '> 300: normal. 200-300: SDRA leve. 100-200: moderado. < 100: severo',
    example: 'PaO₂ 80 mmHg con FiO₂ 60% → P/F 133 (SDRA moderado)'
  },
  fio2: {
    title: 'FiO₂ (Fracción Inspirada de Oxígeno)',
    definition: 'Porcentaje de oxígeno en el gas inspirado.',
    importance: 'Ajustar para mantener SpO₂ 92-96%. FiO₂ alto prolongado causa toxicidad.',
    target: '< 60% idealmente. Reducir progresivamente según respuesta',
    example: 'FiO₂ 100% → reducir a < 60% en 24-48h si es posible'
  },
  vtPerKg_ardsnet2000: {
      title: 'Vt/kg (por PBW)',
      authorsKey: 'ARDSNet 2000',
      definition: 'Volumen tidal normalizado por peso corporal predicho (PBW).',
      importance: 'Clave en ventilación protectora para reducir sobredistensión.',
      target: 'Objetivo ~6 ml/kg PBW (rango habitual 4–8 ml/kg según tolerancia).',
      example: 'PBW 70 kg → Vt 420 ml = 6 ml/kg.',
      references: [
        'ARDS Network. N Engl J Med. 2000;342:1301-1308.'
      ]
    },
  
    plateauPressure_ardsnet2000: {
      title: 'Presión Meseta (Pplat)',
      authorsKey: 'ARDSNet 2000',
      definition: 'Presión al final de la inspiración durante pausa inspiratoria.',
      importance: 'Límite de seguridad para reducir sobredistensión.',
      target: 'Mantener Pplat ≤ 30 cmH₂O (estrategia ARDSNet).',
      assumptions: ['Requiere pausa inspiratoria', 'Interpretación más válida en pasivo'],
      references: [
        'ARDS Network. N Engl J Med. 2000;342:1301-1308.'
      ]
    },
  
    drivingPressure_amato2015: {
      title: 'Driving Pressure (ΔP)',
      authorsKey: 'Amato 2015',
      definition: 'ΔP = Pplat − PEEP.',
      importance: 'Asociada a pronóstico en ARDS (asociación, no corte causal universal).',
      target: 'Umbral orientativo: ΔP > 15 cmH₂O se asocia a peor pronóstico.',
      assumptions: ['Medición válida de Pplat', 'Idealmente paciente pasivo'],
      references: [
        'Amato MBP, et al. N Engl J Med. 2015;372:747-755.'
      ]
    },
  
    pfRatio_berlin2012: {
      title: 'Relación PaO₂/FiO₂ (P/F)',
      authorsKey: 'Berlin 2012',
      definition: 'PaO₂ / FiO₂ (FiO₂ en fracción).',
      importance: 'Clasifica hipoxemia y severidad de ARDS.',
      target: 'Berlín: leve 200–300, moderado 100–200, severo <100 (PEEP/CPAP ≥5).',
      references: [
        'ARDS Definition Task Force. JAMA. 2012;307:2526-2533.'
      ]
    },
  
    mechanicalPower_gattinoni2016: {
      title: 'Mechanical Power (J/min)',
      authorsKey: 'Gattinoni 2016',
      definition: 'Energía por minuto transferida al sistema respiratorio.',
      importance: 'Marco integrador para exposición ventilatoria y VILI.',
      target: 'Usar como orientativo; priorizar tendencia + contexto (ecuación dependiente).',
      assumptions: ['Ecuación bedside aproximada', 'Mejor validez en pasivo'],
      references: [
        'Gattinoni L, et al. Intensive Care Med. 2016;42:1567-1575.'
      ]
    }
};
export const ventModes = [{
  value: 'VC',
  label: 'VC (Volume Control)',
  control: 'volume' as const
}, {
  value: 'PC',
  label: 'PC (Pressure Control)',
  control: 'pressure' as const
}, {
  value: 'PRVC',
  label: 'PRVC (Pressure Regulated Volume Control)',
  control: 'dual' as const
}, {
  value: 'PSV',
  label: 'PSV (Pressure Support Ventilation)',
  control: 'pressure' as const
}, {
  value: 'SIMV-VC',
  label: 'SIMV-VC',
  control: 'volume' as const
}, {
  value: 'SIMV-PC',
  label: 'SIMV-PC',
  control: 'pressure' as const
}, {
  value: 'Other',
  label: 'Otro modo',
  control: 'volume' as const
}];
export const weaningStatuses = [{
  value: 'not-candidate',
  label: 'No candidato',
  description: 'Aún no cumple criterios'
}, {
  value: 'candidate',
  label: 'Candidato',
  description: 'Cumple criterios para SBT'
}, {
  value: 'sbt-trial',
  label: 'En prueba SBT',
  description: 'Realizando prueba'
}, {
  value: 'extubated',
  label: 'Extubado',
  description: 'SBT exitoso y extubado'
}];
export const mobilizationLevels = [{
  value: 0,
  label: 'Nivel 0',
  description: 'Sin movilización'
}, {
  value: 1,
  label: 'Nivel 1',
  description: 'Ejercicios pasivos en cama'
}, {
  value: 2,
  label: 'Nivel 2',
  description: 'Ejercicios activos en cama'
}, {
  value: 3,
  label: 'Nivel 3',
  description: 'Sedestación'
}, {
  value: 4,
  label: 'Nivel 4',
  description: 'Bipedestación/deambulación'
}];