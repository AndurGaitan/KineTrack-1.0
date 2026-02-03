import React from 'react';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}
export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'min-h-[56px] px-6 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantStyles = {
    primary: 'bg-blue-600 text-white active:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 active:bg-gray-300',
    danger: 'bg-red-600 text-white active:bg-red-700'
  };
  const widthStyles = fullWidth ? 'w-full' : '';
  return <button className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`} {...props}>
      {children}
    </button>;
}