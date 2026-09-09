import { InputHTMLAttributes } from 'react';
import { EducationalTooltip } from './ui/Tooltip';
import { nivEducation } from '../utils/nivEducation';
interface NIVFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  educationKey?: keyof typeof nivEducation;
  unit?: string;
  error?: string;
}
export function NIVField({
  label,
  educationKey,
  unit,
  error,
  className = '',
  ...props
}: NIVFieldProps) {
  return <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {unit && <span className="text-gray-500 ml-1">({unit})</span>}
        </label>
        {educationKey && <EducationalTooltip content={nivEducation[educationKey]} />}
      </div>
      <input className={`w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none ${error ? 'border-red-500' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>;
}
interface NIVSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label: string;
  educationKey?: keyof typeof nivEducation;
  options: {
    value: string | number;
    label: string;
  }[];
  error?: string;
}
export function NIVSelect({
  label,
  educationKey,
  options,
  error,
  className = '',
  ...props
}: NIVSelectProps) {
  return <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {educationKey && <EducationalTooltip content={nivEducation[educationKey]} />}
      </div>
      <select className={`w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none bg-white ${error ? 'border-red-500' : ''} ${className}`} {...props}>
        <option value="">Seleccionar...</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>)}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>;
}
