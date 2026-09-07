import { useEffect, useMemo, useState, FormEvent } from 'react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BottomNav } from '../../components/BottomNav';
import { useApp } from '../../contexts/AppContext';
import * as scheduleApi from '../../api/scheduleApi';
import * as authApi from '../../api/authApi';
import { ShiftAssignment, ShiftTemplate, ShiftTemplateSlot, User } from '../../types';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}
function isoWeekday(year: number, month: number, day: number): number {
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const emptyTemplateForm = {
  name: '',
  daysOfWeek: [] as number[],
  startTime: '08:00',
  endTime: '12:00',
  slots: [{ area: 'uci', count: 1 }] as ShiftTemplateSlot[],
};

export function SchedulePage() {
  const { user, sectors } = useApp();
  const isCoordinador = user?.role === 'coordinador';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const from = dateKey(year, month, 1);
  const to = dateKey(year, month, daysInMonth(year, month));

  const load = () => {
    setLoading(true);
    Promise.all([scheduleApi.listShiftTemplates(), scheduleApi.listAssignments(from, to)])
      .then(([t, a]) => {
        setTemplates(t);
        setAssignments(a);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [year, month]);
  useEffect(() => {
    if (isCoordinador) authApi.listUsers().then(setUsers);
  }, [isCoordinador]);

  const assignmentsByDay = useMemo(() => {
    const map = new Map<string, ShiftAssignment[]>();
    for (const a of assignments) {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    }
    return map;
  }, [assignments]);

  const areaLabel = (area: string) => {
    if (area === 'general') return 'General';
    const sector = sectors.find((s) => s.type === area);
    return sector ? sector.type.toUpperCase() : area.toUpperCase();
  };

  const handleGenerateMonth = async () => {
    const result = await scheduleApi.generateMonth(year, month);
    window.alert(`Se generaron ${result.created} turnos nuevos (de ${result.totalSlotsForMonth} esperados este mes).`);
    load();
  };

  const handleCreateTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || templateForm.daysOfWeek.length === 0) return;
    await scheduleApi.createShiftTemplate(templateForm);
    setTemplateForm(emptyTemplateForm);
    setShowTemplateForm(false);
    load();
  };

  const handleAssign = async (assignmentId: string, userId: string) => {
    await scheduleApi.assignSlot(assignmentId, userId || null);
    load();
  };

  const toggleDay = (d: number) => {
    setTemplateForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d].sort(),
    }));
  };

  const updateSlot = (index: number, field: 'area' | 'count', value: string) => {
    setTemplateForm((f) => ({
      ...f,
      slots: f.slots.map((s, i) => (i === index ? { ...s, [field]: field === 'count' ? Number(value) : value } : s)),
    }));
  };

  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  const selectedAssignments = selectedDay ? assignmentsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="Cronograma de Personal" />

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="flex-1 sm:flex-none border-2 border-gray-200 rounded-lg px-2 py-2 text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleDateString('es-AR', { month: 'long' })}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border-2 border-gray-200 rounded-lg px-2 py-2 text-sm">
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {isCoordinador && (
            <div className="flex gap-2">
              <Button onClick={() => setShowTemplateForm((s) => !s)} variant="secondary" className="flex-1 sm:flex-none">
                {showTemplateForm ? 'Cancelar' : '+ Plantilla de turno'}
              </Button>
              <Button onClick={handleGenerateMonth} className="flex-1 sm:flex-none">Generar mes</Button>
            </div>
          )}
        </div>

        {showTemplateForm && (
          <Card>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <Input label="Nombre" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Ej: Mañana Lun-Vie" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Días de la semana</label>
                <div className="flex gap-2 flex-wrap">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => toggleDay(i + 1)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border-2 ${templateForm.daysOfWeek.includes(i + 1) ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-500'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Hora inicio" type="time" value={templateForm.startTime} onChange={(e) => setTemplateForm({ ...templateForm, startTime: e.target.value })} />
                <Input label="Hora fin" type="time" value={templateForm.endTime} onChange={(e) => setTemplateForm({ ...templateForm, endTime: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personas necesarias por área</label>
                <div className="space-y-2">
                  {templateForm.slots.map((slot, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={slot.area} onChange={(e) => updateSlot(i, 'area', e.target.value)} className="flex-1 border-2 border-gray-200 rounded-lg px-2 py-2 text-sm">
                        <option value="general">General (cobertura única)</option>
                        {Array.from(new Set(sectors.map((s) => s.type))).map((t) => (
                          <option key={t} value={t}>
                            {t.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={slot.count}
                        onChange={(e) => updateSlot(i, 'count', e.target.value)}
                        className="w-20 border-2 border-gray-200 rounded-lg px-2 py-2 text-sm text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setTemplateForm((f) => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }))}
                        className="text-red-500 text-sm px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTemplateForm((f) => ({ ...f, slots: [...f.slots, { area: 'uci', count: 1 }] }))}
                    className="text-sm text-blue-600 font-semibold"
                  >
                    + Agregar área
                  </button>
                </div>
              </div>
              <Button type="submit" fullWidth>
                Crear Plantilla
              </Button>
            </form>
          </Card>
        )}

        {templates.length > 0 && (
          <Card>
            <div className="text-sm font-bold text-gray-900 mb-2">Plantillas activas</div>
            <div className="space-y-1 text-sm text-gray-600">
              {templates.map((t) => (
                <div key={t.id}>
                  <strong className="text-gray-900">{t.name}</strong> — {t.daysOfWeek.map((d) => DAY_LABELS[d - 1]).join(', ')} · {t.startTime}-{t.endTime} ·{' '}
                  {t.slots.map((s) => `${areaLabel(s.area)}: ${s.count}`).join(', ')}
                </div>
              ))}
            </div>
          </Card>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <Card>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-1">
              {DAY_LABELS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: isoWeekday(year, month, 1) - 1 }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const key = dateKey(year, month, day);
                const dayAssignments = assignmentsByDay.get(key) ?? [];
                const filled = dayAssignments.filter((a) => a.userId).length;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[64px] rounded-lg border-2 p-1 text-left transition-colors ${selectedDay === key ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="text-xs font-bold text-gray-700">{day}</div>
                    {dayAssignments.length > 0 && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {filled}/{dayAssignments.length}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {selectedDay && (
          <Card>
            <div className="text-sm font-bold text-gray-900 mb-3">Turnos del {selectedDay}</div>
            {selectedAssignments.length === 0 ? (
              <p className="text-sm text-gray-500">Sin turnos generados para este día.</p>
            ) : (
              <div className="space-y-2">
                {selectedAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900">{areaLabel(a.area)}</span>{' '}
                      <span className="text-gray-400">#{a.slotIndex + 1}</span>
                    </div>
                    {isCoordinador ? (
                      <select
                        value={a.userId ?? ''}
                        onChange={(e) => handleAssign(a.id, e.target.value)}
                        className="border-2 border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
                      >
                        <option value="">Sin asignar</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-700">{a.userName ?? 'Sin asignar'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
