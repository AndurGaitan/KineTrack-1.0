import React from 'react';
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
export function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input className={`w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none ${error ? 'border-red-500' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>;
}
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: {
    value: string;
    label: string;
  }[];
}
export function Select({
  label,
  error,
  options,
  className = '',
  ...props
}: SelectProps) {
  return <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select className={`w-full min-h-[56px] px-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none bg-white ${error ? 'border-red-500' : ''} ${className}`} {...props}>
        <option value="">Seleccionar...</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>)}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>;
}