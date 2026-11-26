import { useSyncExternalStore } from 'react';
import { AlertCircleIcon, CheckCircle2Icon, XIcon } from 'lucide-react';
import { Notice, dismissNotice, getNotices, subscribeNotices } from '../utils/notify';

/** Avisos de confirmación, apilados justo encima de la barra de navegación: siempre dentro de la vista. */
export function Toaster() {
  const notices = useSyncExternalStore(subscribeNotices, getNotices);
  const successes = notices.filter((n) => n.kind === 'success');
  const errors = notices.filter((n) => n.kind === 'error');

  return (
    <div className="fixed left-0 right-0 z-[60] px-4 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>
      <div className="max-w-md mx-auto flex flex-col gap-2">
        {/* Las dos zonas existen siempre para que el lector de pantalla anuncie lo que aparece. */}
        <div role="alert" className="flex flex-col gap-2">
          {errors.map((n) => (
            <Toast key={n.id} notice={n} />
          ))}
        </div>
        <div role="status" className="flex flex-col gap-2">
          {successes.map((n) => (
            <Toast key={n.id} notice={n} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Toast({ notice }: { notice: Notice }) {
  const failed = notice.kind === 'error';
  const Icon = failed ? AlertCircleIcon : CheckCircle2Icon;
  return (
    <div
      className={`kt-toast pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg ${
        failed ? 'bg-red-50 border-2 border-red-300 text-red-900' : 'bg-gray-900 text-gray-50'
      }`}
    >
      <Icon className={`w-6 h-6 shrink-0 ${failed ? 'text-red-600' : 'text-green-400'}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{notice.message}</div>
        {notice.detail && <div className={`text-xs break-words ${failed ? 'text-red-800' : 'text-gray-300'}`}>{notice.detail}</div>}
      </div>
      {notice.action && (
        <button
          type="button"
          onClick={() => {
            dismissNotice(notice.id);
            notice.action!.run();
          }}
          className={`shrink-0 rounded-lg text-sm font-semibold px-3 py-2 ${failed ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
        >
          {notice.action.label}
        </button>
      )}
      <button type="button" onClick={() => dismissNotice(notice.id)} className="shrink-0 -mr-1 p-1.5 rounded-lg opacity-70" aria-label="Cerrar aviso">
        <XIcon className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
