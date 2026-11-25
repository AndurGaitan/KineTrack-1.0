import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CheckIcon,
  CompassIcon,
  FileTextIcon,
  FlaskConicalIcon,
  LayersIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  StethoscopeIcon,
  UsersIcon,
} from 'lucide-react';

/**
 * Página de presentación pública (sin sesión).
 *
 * Posicionamiento: el valor de KineTrack es quitar la complejidad administrativa de gestionar un equipo de
 * kinesiología en terapia intensiva (seguimiento de cada paciente crítico, soportes ventilatorios e indicadores
 * de calidad) y ser el primer paso de una plataforma para medir prácticas, procesos y rendimiento de equipos de salud.
 *
 * Criterio de contenido: cuenta QUÉ hace KineTrack y qué resuelve, sin mostrar capturas de pantalla, flujos de
 * pantalla ni maquetas de la interfaz. Las ilustraciones son decorativas (curvas ventilatorias genéricas).
 * Lo que todavía no existe se rotula como "en evolución" o "horizonte", sin fechas.
 */

// Si se carga un correo de contacto, se muestra el botón "Solicitar una demostración" (queda vacío por defecto).
const CONTACT_EMAIL = '';

const SECTION = 'max-w-6xl mx-auto px-5 sm:px-8';
const EYEBROW = 'text-xs font-semibold tracking-[0.16em] uppercase text-blue-700';

// ── Ilustración decorativa: tres curvas ventilatorias genéricas (presión, flujo, volumen) ──────────────────
function WaveformArt() {
  const W = 120; // ancho de un ciclo
  const cycles = 4;
  const build = (fn: (t: number) => number, y0: number, amp: number) => {
    let d = '';
    for (let c = 0; c < cycles; c++) {
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const x = c * W + t * W;
        const y = y0 - fn(t) * amp;
        d += `${c === 0 && i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
      }
    }
    return d;
  };
  // presión: sube, meseta, cae a PEEP
  const pressure = (t: number) => (t < 0.08 ? t / 0.08 : t < 0.4 ? 1 - 0.12 * ((t - 0.08) / 0.32) : t < 0.46 ? 0.88 - ((t - 0.4) / 0.06) * 0.78 : 0.1);
  // flujo: inspiración decelerante positiva, espiración exponencial negativa
  const flow = (t: number) => (t < 0.4 ? 0.9 * Math.exp(-3.2 * t) + 0.05 : t < 0.46 ? 0 : -0.75 * Math.exp(-6 * (t - 0.46)));
  // volumen: rampa y vaciado exponencial
  const volume = (t: number) => (t < 0.4 ? 1 - Math.exp(-5 * t) : Math.exp(-5.5 * (t - 0.4)) * (1 - Math.exp(-2)));
  const vbWidth = W * cycles;
  return (
    <svg viewBox={`0 0 ${vbWidth} 230`} className="w-full h-auto" role="img" aria-label="Ilustración de curvas ventilatorias de presión, flujo y volumen">
      <defs>
        <linearGradient id="wf-fade" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(var(--c-blue-600))" stopOpacity="0" />
          <stop offset="0.12" stopColor="rgb(var(--c-blue-600))" stopOpacity="1" />
          <stop offset="0.88" stopColor="rgb(var(--c-blue-600))" stopOpacity="1" />
          <stop offset="1" stopColor="rgb(var(--c-blue-600))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 115, 190].map((y) => (
        <line key={y} x1="0" x2={vbWidth} y1={y + 12} y2={y + 12} stroke="rgb(var(--c-gray-200))" strokeWidth="1" strokeDasharray="2 5" />
      ))}
      <path d={build(pressure, 62, 44)} fill="none" stroke="url(#wf-fade)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d={build(flow, 128, 36)} fill="none" stroke="url(#wf-fade)" strokeWidth="2.4" strokeLinejoin="round" opacity="0.7" />
      <path d={build(volume, 214, 46)} fill="none" stroke="url(#wf-fade)" strokeWidth="2.4" strokeLinejoin="round" opacity="0.45" />
      <g fontSize="10" fill="rgb(var(--c-gray-500))" fontWeight="600" letterSpacing="1.2">
        <text x="6" y="16">PRESIÓN</text>
        <text x="6" y="92">FLUJO</text>
        <text x="6" y="168">VOLUMEN</text>
      </g>
    </svg>
  );
}

// ── Contenido ───────────────────────────────────────────────────────────────────────────────────────────

// Dónde se pierde tiempo clínico en la gestión de un servicio, y cómo lo resuelve el registro único.
const frictions = [
  { before: 'Registros en papel y planillas paralelas', after: 'Un único registro por paciente, desde el celular' },
  { before: 'Evolución y pase de guardia escritos de nuevo', after: 'Redactados a partir de lo ya registrado' },
  { before: 'Indicadores armados a mano a fin de mes', after: 'Calculados automáticamente, con su fórmula a la vista' },
  { before: 'Poca visibilidad de la carga y el rendimiento del equipo', after: 'Productividad por profesional y por período' },
];

// Un mismo registro alimenta tres niveles.
const levels = [
  {
    n: '1',
    icon: StethoscopeIcon,
    name: 'El paciente',
    lead: 'Seguimiento lineal del paciente crítico a lo largo de toda su estadía.',
    items: [
      'Cinco soportes: ventilación invasiva, no invasiva, alto flujo, vía aérea artificial y oxigenoterapia',
      'Cálculos automáticos: Vt/kg de peso ideal, driving pressure, potencia mecánica y P/F',
      'Índices HACOR y ROX con alerta de riesgo de falla',
      'Destete: pruebas de ventilación espontánea, extubación y pruebas por horas en traqueostomía',
    ],
  },
  {
    n: '2',
    icon: UsersIcon,
    name: 'El equipo',
    lead: 'Menos tiempo administrativo para cada kinesiólogo y más claridad para quien coordina.',
    items: [
      'Evolución kinésica y pase de guardia redactados desde los registros',
      'Movilización precoz, prestaciones y fuerza muscular (MRC) en el mismo seguimiento',
      'Organización por sectores y roles, con la carga de trabajo visible',
      'Protocolos vigentes del servicio, junto al paciente',
    ],
  },
  {
    n: '3',
    icon: LayersIcon,
    name: 'El servicio',
    lead: 'La práctica diaria convertida en información para gestionar y mejorar.',
    items: [
      'Indicadores de calidad del paquete de prevención de neumonía asociada a la ventilación',
      'Productividad, logros de destete y tendencias en el tiempo',
      'Casos clínicos longitudinales, anonimizados',
      'Base estructurada para investigación',
    ],
  },
];

// Medir prácticas, procesos y rendimiento.
const measures = [
  {
    name: 'Prácticas',
    question: '¿Se hace lo que se debe hacer?',
    items: ['Prueba de ventilación espontánea diaria, sobre los días en que el paciente estaba en condiciones', 'Movilización activa dentro de las 72 horas del inicio de la ventilación'],
  },
  {
    name: 'Procesos y resultados',
    question: '¿Cómo evoluciona el paciente a través del proceso?',
    items: ['Reintubación dentro de las 48 horas de una extubación programada', 'Debilidad adquirida en UCI en pacientes con más de 7 días de ventilación'],
  },
  {
    name: 'Rendimiento',
    question: '¿Qué logra el equipo y cómo lo hace?',
    items: ['Productividad del equipo, en general y por profesional', 'Logros de destete y tendencias en el tiempo'],
  },
];

// Camino de la plataforma (alineado con la hoja de ruta; sin fechas).
const path = [
  {
    tag: 'Disponible hoy',
    tagClass: 'bg-emerald-100 text-emerald-800',
    title: 'Kinesiología en terapia intensiva',
    text: 'Seguimiento de cinco soportes, cálculos y alertas, evolución y pase de guardia, y cinco indicadores de calidad automáticos.',
  },
  {
    tag: 'En evolución',
    tagClass: 'bg-amber-100 text-amber-800',
    title: 'Más lectura sobre lo ya registrado',
    text: 'Reportes con inteligencia artificial que resumen la evolución de cada paciente y el panorama del servicio, y más indicadores hacia otros paquetes de cuidados críticos.',
  },
  {
    tag: 'Horizonte',
    tagClass: 'bg-blue-100 text-blue-800',
    title: 'Seguimiento de equipos de salud',
    text: 'Llevar la misma lógica —registrar una vez, medir de forma automática, comparar en el tiempo— a otros equipos y procesos de la institución.',
  },
];

const principles = [
  { icon: ShieldCheckIcon, title: 'Transparencia del cálculo', text: 'Cada indicador muestra su fórmula, su numerador y su denominador. El resultado siempre se puede revisar.' },
  { icon: UsersIcon, title: 'Acceso por rol', text: 'Kinesiólogos y coordinación ven lo que les corresponde. La gestión no interrumpe el trabajo asistencial.' },
  { icon: SmartphoneIcon, title: 'Pensado para el recorrido', text: 'Se completa desde el celular, al lado del paciente, en lugar de transcribir después desde papel.' },
  { icon: FileTextIcon, title: 'Un solo registro', text: 'El mismo dato alimenta los cálculos, las alertas, la evolución, el pase y los indicadores.' },
];

export function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'KineTrack · Gestión y seguimiento de equipos de salud';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 app-bar">
        <div className={`${SECTION} h-14 flex items-center justify-between`}>
          <a href="#inicio" className="flex items-center gap-2" aria-label="KineTrack, inicio">
            <img src="/logo_kinetrack.png" alt="" className="w-7 h-7 object-contain" />
            <span className="font-bold text-lg tracking-tight">
              Kine<span className="text-blue-600">Track</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#valor" className="hover:text-gray-900">Valor</a>
            <a href="#niveles" className="hover:text-gray-900">Funciones</a>
            <a href="#calidad" className="hover:text-gray-900">Calidad</a>
            <a href="#vision" className="hover:text-gray-900">Visión</a>
          </nav>
          <Link to="/" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-4 py-2 transition-colors">
            Ingresar
          </Link>
        </div>
      </header>

      {/* Portada */}
      <section id="inicio" className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
        <div className={`${SECTION} pt-16 pb-12 sm:pt-24 sm:pb-16`}>
          <p className={EYEBROW}>Gestión y seguimiento de equipos de salud</p>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] max-w-4xl">
            Menos carga administrativa.
            <br />
            <span className="text-blue-600">Más cuidado, más calidad.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl leading-relaxed">
            Gestionar un equipo de kinesiología en terapia intensiva exige seguir a cada paciente crítico, sostener distintos soportes ventilatorios y demostrar la calidad del
            servicio. KineTrack reúne todo en un único registro y saca del medio la complejidad administrativa.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#niveles" className="inline-flex items-center gap-2 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-6 py-3 transition-colors">
              Conocer las funciones <ArrowRightIcon className="w-4 h-4" />
            </a>
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}?subject=Demostración de KineTrack`} className="text-base font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full px-6 py-3 transition-colors">
                Solicitar una demostración
              </a>
            ) : (
              <Link to="/" className="text-base font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full px-6 py-3 transition-colors">
                Ingresar a la plataforma
              </Link>
            )}
          </div>

          <div className="mt-14 rounded-3xl border border-gray-200 bg-white p-5 sm:p-8">
            <WaveformArt />
          </div>
        </div>
      </section>

      {/* El valor: dónde se pierde tiempo */}
      <section id="valor" className={`${SECTION} py-20 sm:py-28 scroll-mt-14`}>
        <p className={EYEBROW}>Dónde está el valor</p>
        <h2 className="[text-wrap:balance] mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-3xl">Gestionar un equipo de salud tiene un costo administrativo que no se ve</h2>
        <p className="mt-4 text-lg text-gray-600 max-w-3xl leading-relaxed">
          Registrar, documentar, pasar la guardia, armar indicadores y saber qué hace cada profesional consume tiempo clínico. KineTrack resuelve esa complejidad una sola vez, en el
          origen del dato.
        </p>
        <div className="mt-12 rounded-3xl border border-gray-200 overflow-hidden">
          <div className="hidden sm:grid grid-cols-2 bg-gray-50 text-xs font-semibold tracking-[0.16em] uppercase text-gray-500">
            <div className="px-7 py-3">Lo que consume tiempo</div>
            <div className="px-7 py-3 text-blue-700">Con KineTrack</div>
          </div>
          {frictions.map((f) => (
            <div key={f.before} className="grid sm:grid-cols-2 border-t border-gray-100">
              <div className="px-7 pt-5 sm:py-5 text-[15px] text-gray-500">{f.before}</div>
              <div className="px-7 pb-5 pt-1 sm:py-5 text-[15px] font-medium text-gray-900 flex gap-3">
                <CheckIcon className="w-5 h-5 mt-0.5 flex-none text-blue-600" />
                <span>{f.after}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xl sm:text-2xl font-bold tracking-tight">
          Registrar una vez. <span className="text-blue-600">Aprovechar el dato en todos lados.</span>
        </p>
      </section>

      {/* Tres niveles */}
      <section id="niveles" className="bg-gray-50 border-y border-gray-100 scroll-mt-14">
        <div className={`${SECTION} py-20 sm:py-28`}>
          <p className={EYEBROW}>Funciones</p>
          <h2 className="[text-wrap:balance] mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-3xl">Un solo registro, tres niveles de valor</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">Lo que el equipo carga junto al paciente sirve a la vez a la clínica, a la coordinación y a la institución.</p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {levels.map(({ n, icon: Icon, name, lead, items }) => (
              <article key={name} className="rounded-3xl border border-gray-200 bg-white p-7 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-4xl font-extrabold text-blue-100">{n}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold">{name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{lead}</p>
                <ul className="mt-5 space-y-3 text-[15px] text-gray-700">
                  {items.map((t) => (
                    <li key={t} className="flex gap-3">
                      <CheckIcon className="w-5 h-5 mt-0.5 flex-none text-blue-600" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Calidad: prácticas, procesos y rendimiento */}
      <section id="calidad" className="bg-blue-900 text-white scroll-mt-14">
        <div className={`${SECTION} py-20 sm:py-28`}>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-blue-300">Calidad y gestión</p>
          <h2 className="[text-wrap:balance] mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-3xl">Medir prácticas, procesos y rendimiento</h2>
          <p className="mt-5 text-lg text-blue-100 leading-relaxed max-w-3xl">
            Los indicadores salen del trabajo cotidiano, sin planillas paralelas ni cargas duplicadas. Se calculan por período, con numerador y denominador a la vista.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {measures.map((m) => (
              <div key={m.name} className="rounded-3xl bg-white/10 p-7">
                <h3 className="text-xl font-semibold">{m.name}</h3>
                <p className="mt-1 text-sm text-blue-200">{m.question}</p>
                <ul className="mt-5 space-y-3">
                  {m.items.map((t) => (
                    <li key={t} className="flex gap-3 text-[15px] leading-relaxed">
                      <CheckIcon className="w-5 h-5 mt-0.5 flex-none text-blue-300" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visión: primer paso de una plataforma */}
      <section id="vision" className={`${SECTION} py-20 sm:py-28 scroll-mt-14`}>
        <div className="flex items-center gap-2">
          <CompassIcon className="w-4 h-4 text-blue-700" />
          <p className={EYEBROW}>Visión</p>
        </div>
        <h2 className="[text-wrap:balance] mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-3xl">KineTrack es el primer paso para seguir y medir a los equipos de salud</h2>
        <p className="mt-5 text-lg text-gray-600 max-w-3xl leading-relaxed">
          Empieza en kinesiología de terapia intensiva porque allí el trabajo es complejo, continuo y medible. La misma lógica está pensada para extenderse a otros procesos y equipos,
          con el objetivo de que cualquier servicio pueda ver qué hace, cómo lo hace y qué logra.
        </p>
        <ol className="mt-12 grid gap-5 lg:grid-cols-3">
          {path.map((p) => (
            <li key={p.title} className="rounded-3xl border border-gray-200 bg-white p-7">
              <span className={`inline-block text-[11px] font-bold tracking-[0.14em] uppercase rounded-full px-3 py-1 ${p.tagClass}`}>{p.tag}</span>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{p.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-gray-500">Funcionalidades en evolución y horizonte, sin fecha de disponibilidad comprometida.</p>
      </section>

      {/* Investigación */}
      <section id="investigacion" className="bg-gray-50 border-y border-gray-100 scroll-mt-14">
        <div className={`${SECTION} py-20 sm:py-24 grid gap-12 lg:grid-cols-2 lg:items-center`}>
          <div>
            <p className={EYEBROW}>Investigación</p>
            <h2 className="[text-wrap:balance] mt-3 text-3xl sm:text-4xl font-bold tracking-tight">La práctica diaria como base de evidencia propia</h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              Los datos se registran con campos definidos, no como texto libre. Eso permite reconstruir la evolución longitudinal de un paciente —estrategia ventilatoria, gasometría,
              mecánica y destete— y compararla entre casos.
            </p>
            <p className="mt-4 text-[15px] text-gray-500">Los casos se analizan de forma anonimizada. Es una línea de trabajo en desarrollo junto con el servicio.</p>
          </div>
          <div className="rounded-3xl bg-white border border-gray-200 p-7 sm:p-9">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FlaskConicalIcon className="w-5 h-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">Qué hace posible</h3>
            <ul className="mt-4 space-y-3 text-[15px] text-gray-700">
              {[
                'Estudios retrospectivos con datos ya estructurados',
                'Seguimiento de cohortes de pacientes ventilados',
                'Evaluación de protocolos de destete y movilización',
                'Reportes de calidad con trazabilidad del cálculo',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckIcon className="w-5 h-5 mt-0.5 flex-none text-blue-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Principios */}
      <section>
        <div className={`${SECTION} py-20 sm:py-24`}>
          <p className={EYEBROW}>Cómo está pensado</p>
          <h2 className="[text-wrap:balance] mt-3 text-3xl font-bold tracking-tight">Rigor clínico, sin fricción en el trabajo</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon className="w-6 h-6 text-blue-600" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="bg-gradient-to-b from-white to-blue-50">
        <div className={`${SECTION} py-20 sm:py-28 text-center`}>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Información clara, para decidir mejor.</h2>
          <p className="mt-5 text-lg text-gray-600 max-w-xl mx-auto">
            {CONTACT_EMAIL ? 'Si su servicio quiere conocer KineTrack, puede solicitar una demostración.' : 'El acceso a la plataforma se habilita desde la coordinación de cada servicio.'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {CONTACT_EMAIL && (
              <a href={`mailto:${CONTACT_EMAIL}?subject=Demostración de KineTrack`} className="text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-6 py-3 transition-colors">
                Solicitar una demostración
              </a>
            )}
            <Link to="/" className={CONTACT_EMAIL ? 'text-base font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full px-6 py-3 transition-colors' : 'text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-6 py-3 transition-colors'}>
              Ingresar a la plataforma
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100">
        <div className={`${SECTION} py-8 text-xs text-gray-500 leading-relaxed`}>
          <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
            <img src="/logo_kinetrack.png" alt="" className="w-5 h-5 object-contain" /> KineTrack
          </div>
          <p className="mt-3 max-w-3xl">
            Herramienta de apoyo al registro y seguimiento kinésico. Los cálculos y alertas orientan la evaluación y no reemplazan el juicio clínico del equipo tratante.
          </p>
        </div>
      </footer>
    </div>
  );
}
