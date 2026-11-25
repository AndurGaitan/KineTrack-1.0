import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon, LayersIcon, StethoscopeIcon, UsersIcon } from 'lucide-react';

/**
 * Página de presentación pública (sin sesión).
 *
 * Posicionamiento: el valor de KineTrack es quitar la complejidad administrativa de gestionar un equipo de
 * kinesiología en terapia intensiva, para que el tiempo clínico esté en el paciente.
 *
 * Criterio de contenido: cuenta QUÉ hace KineTrack y qué resuelve, sin mostrar capturas de pantalla, flujos de
 * pantalla ni maquetas de la interfaz. La ilustración del enfoque es conceptual.
 * No se anticipa la hoja de ruta: solo se describe lo que la app hace hoy.
 */

// Si se carga un correo de contacto, se muestra el botón "Solicitar una demostración" (queda vacío por defecto).
const CONTACT_EMAIL = '';

const SECTION = 'max-w-6xl mx-auto px-5 sm:px-8';
const EYEBROW = 'text-xs font-semibold tracking-[0.16em] uppercase text-blue-700';

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
    ],
  },
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
            <a href="#enfoque" className="hover:text-gray-900">Enfoque</a>
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
        </div>
      </section>

      {/* El valor: dónde se pierde tiempo */}
      <section id="valor" className={`${SECTION} py-20 sm:py-28 scroll-mt-14`}>
        <p className={EYEBROW}>Dónde está el valor</p>
        <h2 className="[text-wrap:balance] mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-3xl">Gestionar un equipo de salud tiene un costo administrativo que no se ve</h2>
        <p className="mt-4 text-lg text-gray-600 max-w-3xl leading-relaxed">
          Registrar, documentar, pasar la guardia, armar indicadores y saber qué hace cada profesional consume tiempo clínico. KineTrack resuelve esa complejidad en el origen del dato.
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

      {/* Enfoque: la tecnología al servicio del paciente */}
      <section id="enfoque" className={`${SECTION} py-20 sm:py-28 scroll-mt-14`}>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={EYEBROW}>Enfoque</p>
            <h2 className="[text-wrap:balance] mt-3 text-3xl sm:text-4xl font-bold tracking-tight">La tecnología se ocupa de lo administrativo para que el tiempo esté en el paciente</h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              El paciente es lo más importante y es en quien más tiempo debemos invertir. Por eso KineTrack automatiza todo lo que rodea al cuidado: los cálculos, las alertas, la
              documentación y los indicadores se generan a partir de un único registro.
            </p>
            <ul className="mt-7 space-y-3 text-[15px] text-gray-700">
              {[
                'Cálculos y alertas automáticos, con la fórmula siempre a la vista',
                'Evolución y pase de guardia redactados desde lo ya registrado',
                'Carga desde el celular, junto al paciente',
                'Acceso por rol: cada integrante ve lo que le corresponde',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckIcon className="w-5 h-5 mt-0.5 flex-none text-blue-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Capas alrededor del paciente (ilustración conceptual, no la interfaz) */}
          <div role="img" aria-label="El paciente en el centro, rodeado por los cálculos y alertas, la documentación y los indicadores del servicio" className="rounded-[2rem] bg-blue-50 p-4 sm:p-6">
            <div className="rounded-[1.6rem] bg-blue-100 p-4 sm:p-6">
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-blue-800">Indicadores y gestión del servicio</p>
              <div className="mt-3 rounded-[1.3rem] bg-blue-200 p-4 sm:p-6">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-blue-900">Documentación y equipo</p>
                <div className="mt-3 rounded-[1.1rem] bg-blue-300 p-4 sm:p-6">
                  <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-blue-900">Cálculos y alertas</p>
                  <div className="mt-3 rounded-2xl bg-blue-700 text-white px-5 py-9 sm:py-12 text-center">
                    <StethoscopeIcon className="w-7 h-7 mx-auto text-blue-200" />
                    <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight">El paciente</p>
                    <p className="mt-1 text-sm text-blue-100">En el centro de cada decisión</p>
                  </div>
                </div>
              </div>
            </div>
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
