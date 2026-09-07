import { LucideIcon } from 'lucide-react';

export interface ActionSheetOption {
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface ActionSheetProps {
  title: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

/** Bottom sheet listing quick actions — tap the backdrop or an option to dismiss. */
export function ActionSheet({ title, options, onClose }: ActionSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-4 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2 px-2">{title}</h2>
        <div className="space-y-1">
          {options.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <button
                key={i}
                onClick={opt.onClick}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{opt.label}</div>
                  {opt.description && <div className="text-sm text-gray-500">{opt.description}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
