import { ReactNode, useState } from 'react';
import { InfoIcon, XIcon } from 'lucide-react';
import { EducationalContent } from '../../utils/vmiEducation';
interface TooltipProps {
  content: EducationalContent;
}
export function EducationalTooltip({
  content
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen) {
    return <button type="button" onClick={() => setIsOpen(true)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" aria-label="Más información">
      <InfoIcon className="w-5 h-5" />
    </button>;
  }
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">{content.title}</h3>
        {content.authorsKey && (
          <div className="text-xs font-semibold text-gray-500">
            Marco: {content.authorsKey}
          </div>
        )}
        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar">
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">¿Qué es?</h4>
          <p className="text-gray-900">{content.definition}</p>
        </div>

        {content.importance && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">¿Por qué importa?</h4>
            <p className="text-gray-900">{content.importance}</p>
          </div>
        )}

        {content.target && (
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Rango / uso orientativo</h4>
            <p className="text-blue-900 font-medium">{content.target}</p>
          </div>
        )}

        {content.example && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Ejemplo</h4>
            <p className="text-gray-700">{content.example}</p>
          </div>
        )}

        {content.assumptions?.length ? (
          <div className="bg-amber-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-2">Supuestos / validez</h4>
            <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
              {content.assumptions.map((a, idx) => (
                <li key={idx}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {content.references?.length ? (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Referencias</h4>
            <ul className="text-xs text-gray-700 list-disc pl-5 space-y-1">
              {content.references.map((ref, idx) => (
                <li key={idx}>{ref}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
        <button onClick={() => setIsOpen(false)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold active:bg-blue-700 transition-colors">
          Entendido
        </button>
      </div>
    </div>
  </div>;
}
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}
export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = true
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    {isOpen && <div className="px-6 py-4 border-t border-gray-100">{children}</div>}
  </div>;
}