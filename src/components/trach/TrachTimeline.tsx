import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import {
  DOMAIN_BY_KEY,
  STATUS_META,
  cuffStatusLabels,
  secretionAmountLabels,
  secretionCharacterLabels,
  swallowingLabels,
  ventilatorySupportLabels,
} from '../../domain/services/trachDecannulation';
import type { Prestacion, TrachOverview, TrachRecord } from '../../types';
import { ActivityIcon, DumbbellIcon, DropletsIcon, FlagIcon, PencilIcon, StethoscopeIcon, TimerIcon, ClipboardCheckIcon } from 'lucide-react';

interface TimelineItem {
  id: string;
  at: string;
  icon: typeof ActivityIcon;
  tone: string;
  title: string;
  detail?: string;
}

function recordSummary(r: TrachRecord): string {
  const parts: string[] = [];
  if (r.cuffStatus) parts.push(`balón ${cuffStatusLabels[r.cuffStatus].toLowerCase()}`);
  if (r.ventilatorySupport) parts.push(ventilatorySupportLabels[r.ventilatorySupport].toLowerCase());
  if (r.secretionAmount) {
    parts.push(`secreciones ${secretionAmountLabels[r.secretionAmount].toLowerCase()}${r.secretionCharacter ? ` ${secretionCharacterLabels[r.secretionCharacter]}` : ''}`);
  }
  if (r.glasgow !== undefined) parts.push(`Glasgow ${r.glasgow}`);
  if (r.pemax !== undefined) parts.push(`Pemáx ${r.pemax}`);
  if (r.cuffDeflationPerformed) parts.push(`prueba de balón desinflado ${r.cuffDeflationTolerated ? 'tolerada' : 'no tolerada'}`);
  if (r.swallowingTest) parts.push(`deglución ${(swallowingLabels[r.swallowingTest] ?? r.swallowingTest).toLowerCase()}`);
  if (r.blueTest) parts.push(`blue test ${r.blueTest}`);
  if (r.cappedTrialPerformed) parts.push(`prueba de cánula tapada ${r.cappedTrialTolerated ? 'tolerada' : 'no tolerada'} (registro previo)`);
  return parts.join(' · ');
}

const EVENT_LABELS: Record<string, string> = {
  desaturacion: 'desaturación',
  disnea: 'disnea',
  secreciones: 'secreciones',
  'retiro-tapon': 'retiro del tapón',
  otro: 'otro',
};

/** Una sola línea de tiempo: estado, actividad (KTR/KTM), aspiraciones y proceso de decanulación. */
export function TrachTimeline({
  records,
  prestaciones,
  overview,
  onOpenRecord,
}: {
  records: TrachRecord[];
  prestaciones: Prestacion[];
  overview: TrachOverview | null;
  onOpenRecord: (recordId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    const out: (TimelineItem & { recordId?: string })[] = [];

    for (const r of records) {
      out.push({ id: `r-${r.id}`, recordId: r.id, at: r.timestamp, icon: PencilIcon, tone: 'bg-indigo-100 text-indigo-700', title: 'Estado actualizado', detail: recordSummary(r) || undefined });
    }
    for (const p of prestaciones) {
      const ktr = p.type === 'kinesioterapia-respiratoria';
      const ktm = p.type === 'kinesioterapia-motora';
      if (!ktr && !ktm) continue;
      out.push({
        id: `p-${p.id}`,
        at: p.timestamp,
        icon: ktr ? StethoscopeIcon : DumbbellIcon,
        tone: ktr ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700',
        title: ktr ? 'Kinesioterapia respiratoria' : 'Kinesioterapia motora',
        detail: [p.mobilizationLevel !== undefined ? `Movilización nivel ${p.mobilizationLevel}` : undefined, p.notes].filter(Boolean).join(' · ') || undefined,
      });
    }
    for (const a of overview?.aspirations ?? []) {
      out.push({
        id: `a-${a.id}`,
        at: a.timestamp,
        icon: DropletsIcon,
        tone: 'bg-cyan-100 text-cyan-700',
        title: a.count > 1 ? `Aspiración ×${a.count}` : 'Aspiración',
        detail: a.secretionAmount ? `secreciones ${a.secretionAmount}` : undefined,
      });
    }

    const processes = [overview?.activeProcess].filter(Boolean) as NonNullable<TrachOverview['activeProcess']>[];
    for (const proc of processes) {
      out.push({ id: `ps-${proc.id}`, at: proc.startedAt, icon: FlagIcon, tone: 'bg-violet-100 text-violet-700', title: 'Inicio del proceso de decanulación' });
      for (const a of proc.assessments) {
        out.push({
          id: `as-${a.id}`,
          at: a.assessedAt,
          icon: ClipboardCheckIcon,
          tone: 'bg-violet-100 text-violet-700',
          title: `${DOMAIN_BY_KEY[a.domain].label}: ${STATUS_META[a.status].label.toLowerCase()}`,
          detail: a.notes,
        });
      }
      for (const t of proc.occlusionTrials) {
        out.push({ id: `ts-${t.id}`, at: t.startedAt, icon: TimerIcon, tone: 'bg-indigo-100 text-indigo-700', title: 'Inicio de prueba de oclusión' });
        if (t.endedAt) {
          const label = t.result === 'tolerada' ? 'tolerada' : t.result === 'no-tolerada' ? 'no tolerada' : 'interrumpida';
          out.push({ id: `te-${t.id}`, at: t.endedAt, icon: TimerIcon, tone: 'bg-indigo-100 text-indigo-700', title: `Fin de prueba de oclusión: ${label}`, detail: t.resultNotes });
        }
        for (const e of t.entries) {
          out.push({
            id: `en-${e.id}`,
            at: e.at,
            icon: ActivityIcon,
            tone: e.kind === 'evento' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600',
            title: e.kind === 'evento' ? `Evento en oclusión: ${e.eventType ? EVENT_LABELS[e.eventType] : ''}` : 'Control en oclusión',
            detail:
              [e.spo2 !== undefined ? `SpO₂ ${e.spo2}%` : undefined, e.respiratoryRate !== undefined ? `FR ${e.respiratoryRate}` : undefined, e.heartRate !== undefined ? `FC ${e.heartRate}` : undefined, e.notes]
                .filter(Boolean)
                .join(' · ') || undefined,
          });
        }
      }
    }
    for (const past of overview?.pastProcesses ?? []) {
      out.push({
        id: `pe-${past.id}`,
        at: past.endedAt,
        icon: FlagIcon,
        tone: 'bg-violet-100 text-violet-700',
        title: past.outcome === 'decanulado' ? 'Proceso finalizado: decanulación' : 'Proceso suspendido',
        detail: past.endNotes,
      });
    }

    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [records, prestaciones, overview]);

  const shown = showAll ? items : items.slice(0, 12);

  return (
    <Card>
      <h2 className="text-lg font-bold text-gray-900 mb-3">Línea de tiempo</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Todavía no hay actividad registrada para este paciente.</p>
      ) : (
        <ol className="space-y-3">
          {shown.map((item) => {
            const Icon = item.icon;
            const d = new Date(item.at);
            const clickable = !!item.recordId;
            return (
              <li
                key={item.id}
                onClick={clickable ? () => onOpenRecord(item.recordId!) : undefined}
                className={`flex gap-3 ${clickable ? 'cursor-pointer active:opacity-70' : ''}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1 pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {item.detail && <div className="text-sm text-gray-600 mt-0.5">{item.detail}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {items.length > 12 && (
        <button onClick={() => setShowAll((v) => !v)} className="w-full mt-3 text-sm font-semibold text-indigo-700">
          {showAll ? 'Ver menos' : `Ver todo (${items.length})`}
        </button>
      )}
    </Card>
  );
}
