import React from 'react';
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}
export function Card({
  children,
  className = '',
  onClick
}: CardProps) {
  const clickableStyles = onClick ? 'cursor-pointer active:scale-98 transition-transform' : '';
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${clickableStyles} ${className}`} onClick={onClick}>
      {children}
    </div>;
}