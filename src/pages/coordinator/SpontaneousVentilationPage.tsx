import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../contexts/AppContext';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { CoordinatorNav } from '../../components/CoordinatorNav';
import { calendarDaysBetween } from '../../utils/supportDays';
import { dailySVMinutes, formatSVElapsed, svInterruptionReasonLabels, svModalityShortLabels } from '../../utils/spontaneousVentilation';
import type { SpontaneousVentilationPeriod } from '../../types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hm = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
const dm = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

function duration(p: SpontaneousVentilationPeriod, now: Date): string {
  const end = p.endAt ? new Date(p.endAt).getTime() : now.getTime();
  return formatSVElapsed(Math.max(0, end - new Date(p.startAt).getTime()) / 3_600_000);
}

function result(p: SpontaneousVentilationPeriod): string {
  if (!p.endAt) return 'En curso';
  if (p.tolerated === true) return 'Terminó';
  if (p.tolerated === false) return `Se interrumpió${p.interruptionReason ? ` · ${svInterruptionReasonLabels[p.interruptionReason].toLowerCase()}` : ''}`;
  return '—';
}

/**
 * Seguimiento longitudinal de las pruebas de ventilación espontánea (solo coordinador): qué pacientes las hacen,
 * cuántos minutos por día y cómo terminó cada una. En la ficha del paciente solo se registran; acá se analizan.
 */
export function SpontaneousVentilationPage() {
  const { patients, sectors, getPatientSVPeriods } = useApp();
  const [params, setParams] = useSearchParams();
  const now = new Date();

  const rows = useMemo(
    () =>
      patients
        .map((p) => ({ patient: p, periods: getPatientSVPeriods(p.id) }))
        .filter((x) => x.periods.length > 0)
        .sort((a, b) => {
          if ((a.patient.status === 'active') !== (b.patient.status === 'active')) return a.patient.status === 'active' ? -1 : 1;
          return new Date(b.periods[0].startAt).getTime() - new Date(a.periods[0].startAt).getTime();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patients, getPatientSVPeriods]
  );

  const selected = rows.find((r) => r.patient.id === params.get('paciente')) ?? rows[0];
  const days = useMemo(() => (selected ? dailySVMinutes(selected.periods, now) : []), [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const sector = selected ? sectors.find((s) => s.id === selected.patient.sectorId) : undefined;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Pruebas de ventilación espontánea" showBack />
      <CoordinatorNav />

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {rows.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-600">Todavía no hay pruebas registradas.</p>
            <p className="text-sm text-gray-500 mt-1">Aparecen acá cuando se inicia una prueba desde la ficha de un paciente con traqueostomía.</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {rows.map(({ patient, periods }) => {
                const isSel = patient.id === selected?.patient.id;
                const last = periods[0];
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setParams({ paciente: patient.id })}
                    className={`w-full text-left rounded-2xl border bg-white px-5 py-4 flex items-center justify-between gap-3 ${isSel ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-100'}`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{patient.alias}</div>
                      <div className="text-xs text-gray-500">
                        {sectors.find((s) => s.id === patient.sectorId)?.name} · Cama {patient.bedLabel ?? patient.bedId}
                        {patient.status === 'closed' ? ' · Cerrado' : ''}
                      </div>
                    </div>
                    <div className="text-right text-sm flex-none">
                      <div className="font-semibold text-gray-900">{periods.length} {periods.length === 1 ? 'prueba' : 'pruebas'}</div>
                      <div className="text-xs text-gray-500">
                        Última {calendarDaysBetween(last.startAt, now) === 0 ? 'hoy' : dm(last.startAt)} {hm(last.startAt)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selected && (
              <>
                <Card>
                  <div className="text-sm font-semibold text-gray-900">Minutos por día</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {selected.patient.alias}
                    {sector ? ` · ${sector.name}` : ''}
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline) / 0.22)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgb(var(--c-gray-500))' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--c-gray-500))' }} width={40} />
                        <Tooltip formatter={(v) => `${v} min`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="ok" name="Terminó" stackId="a" fill="#2563eb" isAnimationActive={false} />
                        <Bar dataKey="stopped" name="Se interrumpió" stackId="a" fill="#f59e0b" isAnimationActive={false} />
                        <Bar dataKey="other" name="Sin resultado" stackId="a" fill="#9ca3af" isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                        <th className="py-3 px-4">Día</th>
                        <th className="py-3 px-2">Desde – hasta</th>
                        <th className="py-3 px-2">Duración</th>
                        <th className="py-3 px-2">Dispositivo</th>
                        <th className="py-3 px-4">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.periods.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50">
                          <td className="py-3 px-4 whitespace-nowrap">{dm(p.startAt)}</td>
                          <td className="py-3 px-2 whitespace-nowrap">
                            {hm(p.startAt)} – {p.endAt ? `${calendarDaysBetween(p.startAt, p.endAt) > 0 ? `${dm(p.endAt)} ` : ''}${hm(p.endAt)}` : 'en curso'}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap">{duration(p, now)}</td>
                          <td className="py-3 px-2">{cap(svModalityShortLabels[p.modality])}</td>
                          <td className="py-3 px-4">{result(p)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
