export const hfncEducation = {
  flow: {
    title: 'Flujo de HFNC',
    definition: 'Caudal de gas humidificado y calentado entregado a través de cánula nasal de alto flujo.',
    importance: 'Flujos altos (30-60 L/min) generan PEEP fisiológica, lavan espacio muerto y mejoran oxigenación.',
    target: 'Adultos: 30-60 L/min. Iniciar 40-50 L/min y ajustar según tolerancia',
    example: 'Flujo de 50 L/min genera ~3-5 cmH₂O de PEEP'
  },
  roxIndex: {
    title: 'Índice ROX',
    definition: 'Cociente entre SpO₂/FiO₂ y frecuencia respiratoria. Predice éxito/fracaso de HFNC.',
    importance: 'ROX < 3.85 a las 12h predice fracaso de HFNC con alta sensibilidad. Permite escalada oportuna.',
    target: 'ROX ≥ 4.88: bajo riesgo. ROX < 3.85: alto riesgo de fracaso',
    example: 'SpO₂ 95%, FiO₂ 50%, FR 25 → ROX = (95/50)/25 = 1.9/25 = 0.076... Recalcular: (95/0.5)/25 = 7.6'
  },
  humidification: {
    title: 'Humidificación Activa',
    definition: 'Sistema que calienta y humidifica el gas inspirado a 37°C y 100% de humedad relativa.',
    importance: 'La humidificación activa es esencial en HFNC. Sin ella, el flujo alto causa sequedad severa de mucosas.',
    target: 'Temperatura 34-37°C, humedad relativa 100%',
    example: 'Verificar nivel de agua, temperatura del circuito y ausencia de condensación excesiva'
  },
  cannulaFit: {
    title: 'Ajuste de la Cánula',
    definition: 'Evaluación de cómo se adapta la cánula nasal al paciente.',
    importance: 'Cánula mal ajustada genera fugas, reduce efectividad y causa molestias que llevan a discontinuación.',
    target: 'Cánula debe ocupar ~50% del diámetro de la narina, sin obstruir completamente',
    example: 'Si hay fuga importante: cambiar a tamaño menor. Si hay molestias: revisar posición.'
  },
  fio2HFNC: {
    title: 'FiO₂ en HFNC',
    definition: 'Fracción inspirada de oxígeno entregada a través del sistema de alto flujo.',
    importance: 'A diferencia de sistemas convencionales, HFNC permite FiO₂ precisa y estable gracias al flujo alto.',
    target: 'Iniciar con FiO₂ necesaria para SpO₂ 92-96%. Reducir progresivamente',
    example: 'FiO₂ > 60% persistente sugiere que HFNC puede ser insuficiente'
  }
};
export const cannulaFitOptions = [{
  value: 'well-adapted',
  label: 'Bien adaptada',
  color: 'green'
}, {
  value: 'discomfort',
  label: 'Molestias',
  color: 'yellow'
}, {
  value: 'significant-leak',
  label: 'Fuga significativa',
  color: 'red'
}];