import React from 'react';
import { SupportType, RiskLevel } from '../../types';
interface BadgeProps {
  children: ReactNode;
  variant?: 'demo' | 'support' | 'risk';
  type?: SupportType | RiskLevel;
  className?: string;
}
export function Badge({
  children,
  variant = 'demo',
  type,
  className = ''
}: BadgeProps) {
  let colorStyles = 'bg-gray-100 text-gray-700';
  if (variant === 'support' && type) {
    const supportColors = {
      oxygen: 'bg-blue-100 text-blue-700',
      vni: 'bg-purple-100 text-purple-700',
      invasive: 'bg-red-100 text-red-700'
    };
    colorStyles = supportColors[type as SupportType] || colorStyles;
  }
  if (variant === 'risk' && type) {
    const riskColors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    };
    colorStyles = riskColors[type as RiskLevel] || colorStyles;
  }
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorStyles} ${className}`}>
      {children}
    </span>;
}