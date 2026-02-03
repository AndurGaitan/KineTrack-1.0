import React from 'react';
import { EducationalTooltip } from './ui/Tooltip';
import { vmiEducation } from '../utils/vmiEducation';
interface VMIFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  educationKey?: keyof typeof vmiEducation;
  unit?: string;
  error?: string;
}
export function VMIField({
  label,
  educationKey,
  unit,
  error,
  className = '',
  ...props
}: VMIFieldProps) {
  return <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {unit && <span className="text-gray-500 ml-1">({unit})</span>}
        </label>
        {educationKey && <EducationalTooltip content={vmiEducation[educationKey]} />}
      </div>
      <input className={`w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none ${error ? 'border-red-500' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>;
}
interface VMISelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label: string;
  educationKey?: keyof typeof vmiEducation;
  options: {
    value: string | number;
    label: string;
  }[];
  error?: string;
}
export function VMISelect({
  label,
  educationKey,
  options,
  error,
  className = '',
  ...props
}: VMISelectProps) {
  return <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {educationKey && <EducationalTooltip content={vmiEducation[educationKey]} />}
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