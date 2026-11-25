import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ActivityIcon,
  ArrowRightIcon,
  BarChart3Icon,
  BookOpenIcon,
  CheckIcon,
  ClipboardListIcon,
  FileTextIcon,
  FlaskConicalIcon,
  GaugeIcon,
  StethoscopeIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UsersIcon,
  WindIcon,
} from 'lucide-react';

/**
 * Página de presentación pública (sin sesión) para profesionales de medicina crítica.
 *
 * Criterio de contenido: cuenta QUÉ hace KineTrack y qué resuelve, sin mostrar capturas de pantalla, flujos de
 * pantalla ni maquetas de la interfaz. Las ilustraciones son decorativas (curvas ventilatorias genéricas).
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
const supports = ['Ventilación mecánica invasiva', 'Ventilación no invasiva', 'Cánula nasal de alto flujo', 'Vía aérea artificial', 'Oxigenoterapia'];

const features = [
  {
    icon: StethoscopeIcon,
    title: 'Ventilación mecánica',
    text: 'Registro estructurado de parámetros y gasometría, con el cálculo automático de las variables que se usan para decidir: Vt/kg de peso ideal, driving pressure, potencia mecánica y relación P/F.',
  },
  {
    icon: WindIcon,
    title: 'Soporte no invasivo y alto flujo',
    text: 'Índices de riesgo de falla (HACOR y ROX) calculados con los datos del paciente y con alerta cuando la evolución lo amerita. Solo se calculan cuando el registro está completo.',
  },
  {
    icon: GaugeIcon,
    title: 'Destete y vía aérea',
    text: 'Seguimiento del proceso de liberación: pruebas de ventilación espontánea, decisión de extubación, pacientes traqueostomizados con pruebas por horas y días sin ventilación mecánica invasiva.',
  },
  {
    icon: FileTextIcon,
    title: 'Documentación clínica',
    text: 'La evolución kinésica y el pase de guardia se redactan a partir de lo ya registrado, con lenguaje clínico y por período elegido. Sin volver a tipear lo que ya está cargado.',
  },
  {
    icon: ActivityIcon,
    title: 'Movilización y función',
    text: 'Movilización precoz, prestaciones y evaluación de fuerza muscular (MRC) integradas al mismo seguimiento, con el momento de inicio detectado respecto del inicio de la ventilación.',
  },
  {
    icon: BookOpenIcon,
    title: 'Protocolos y metas',
    text: 'Biblioteca de protocolos vigentes del servicio, disponible junto al paciente, y metas clínicas visibles para el equipo.',
  },
];

const quality = [
  'Prueba de ventilación espontánea diaria sobre los días en que el paciente estaba en condiciones',
  'Movilización activa dentro de las 72 horas del inicio de la ventilación mecánica',
  'Reintubación dentro de las 48 horas de una extubación programada',
  'Debilidad adquirida en UCI en pacientes con más de 7 días de ventilación',
  'Productividad del equipo, logros de destete y tendencias en el tiempo',
];

const principles = [
  { icon: ShieldCheckIcon, title: 'Transparencia del cálculo', text: 'Cada indicador muestra su fórmula, su numerador y su denominador. El resultado siempre se puede revisar.' },
  { icon: UsersIcon, title: 'Acceso por rol', text: 'Kinesiólogos y coordinación ven lo que les corresponde. La gestión no interrumpe el trabajo asistencial.' },
  { icon: SmartphoneIcon, title: 'Pensado para el recorrido', text: 'Se completa desde el celular, al lado del paciente, en lugar de transcribir después desde papel.' },
  { icon: ClipboardListIcon, title: 'Un solo registro', text: 'El mismo dato alimenta los cálculos, las alertas, la evolución, el pase y los indicadores.' },
];

export function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'KineTrack · Seguimiento kinésico en cuidados críticos';
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
            <a href="#funciones" className="hover:text-gray-900">Funciones</a>
            <a href="#calidad" className="hover:text-gray-900">Calidad</a>
            <a href="#investigacion" className="hover:text-gray-900">Investigación</a>
          </nav>
          <Link to="/" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-4 py-2 transition-colors">
            Ingresar
          </Link>
        </div>
      </header>

      {/* Portada */}
      <section id="inicio" className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
        <div className={`${SECTION} pt-16 pb-12 sm:pt-24 sm:pb-16`}>
          <p className={EYEBROW}>Seguimiento kinésico en cuidados críticos</p>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] max-w-4xl">
            Registrar una vez.
            <br />
            <span className="text-blue-600">Aprovechar el dato en todos lados.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed">
            KineTrack digitaliza el trabajo diario del kinesiólogo en terapia intensiva y convierte cada registro en cálculos, alertas, documentación clínica e
            indicadores de calidad.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#funciones" className="inline-flex items-center gap-2 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full px-6 py-3 transition-colors">
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

      {/* Soportes */}
      <section aria-label="Soportes que cubre" className="border-y border-gray-100 bg-gray-50">
        <div className={`${SECTION} py-6 flex flex-wrap items-center gap-x-6 gap-y-3`}>
          <span className="text-xs font-semibold tracking-[0.16em] uppercase text-gray-500">Cubre</span>
          {supports.map((s) => (
            <span key={s} className="text-sm font-medium text-gray-700">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Funciones */}
      <section id="funciones" className={`${SECTION} py-20 sm:py-28 scroll-mt-14`}>
        <p className={EYEBROW}>Funciones</p>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-3xl">Del registro a la decisión clínica</h2>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl">Lo que el equipo carga durante el día se transforma en información útil para el paciente y para el servicio.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl border border-gray-200 bg-white p-7">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Calidad */}
      <section id="calidad" className="bg-blue-900 text-white scroll-mt-14">
        <div className={`${SECTION} py-20 sm:py-28 grid gap-12 lg:grid-cols-2 lg:items-center`}>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-blue-300">Calidad y gestión</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Indicadores del servicio, calculados desde el trabajo cotidiano</h2>
            <p className="mt-5 text-lg text-blue-100 leading-relaxed">
              La coordinación cuenta con indicadores del paquete de prevención de neumonía asociada a la ventilación mecánica y de resultados del destete, sin planillas
              paralelas ni cargas duplicadas.
            </p>
            <div className="mt-8 flex items-center gap-3 text-blue-100">
              <BarChart3Icon className="w-5 h-5 text-blue-300" />
              <span className="text-sm">Por período, con numerador y denominador a la vista.</span>
            </div>
          </div>
          <ul className="space-y-3">
            {quality.map((q) => (
              <li key={q} className="flex gap-3 rounded-2xl bg-white/10 px-5 py-4">
                <CheckIcon className="w-5 h-5 mt-0.5 flex-none text-blue-300" />
                <span className="text-[15px] leading-relaxed">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Investigación */}
      <section id="investigacion" className={`${SECTION} py-20 sm:py-28 scroll-mt-14`}>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={EYEBROW}>Investigación</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Una base estructurada para estudiar la ventilación mecánica</h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              Los datos se registran con campos definidos, no como texto libre. Eso permite reconstruir la evolución longitudinal de un paciente —estrategia ventilatoria,
              gasometría, mecánica y destete— y compararla entre casos.
            </p>
            <p className="mt-4 text-[15px] text-gray-500">Los casos se analizan de forma anonimizada. Es una línea de trabajo en desarrollo junto con el servicio.</p>
          </div>
          <div className="rounded-3xl bg-gray-50 border border-gray-200 p-7 sm:p-9">
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
      <section className="bg-gray-50 border-t border-gray-100">
        <div className={`${SECTION} py-20 sm:py-24`}>
          <p className={EYEBROW}>Cómo está pensado</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Rigor clínico, sin fricción en el trabajo</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      <section className={`${SECTION} py-20 sm:py-28 text-center`}>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Información clara, para decidir mejor.</h2>
        <p className="mt-5 text-lg text-gray-600 max-w-xl mx-auto">{CONTACT_EMAIL ? 'Si su servicio quiere conocer KineTrack, puede solicitar una demostración.' : 'El acceso a la plataforma se habilita desde la coordinación de cada servicio.'}</p>
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
