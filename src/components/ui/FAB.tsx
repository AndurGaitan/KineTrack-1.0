import React from 'react';
import { PlusIcon } from 'lucide-react';
interface FABProps {
  onClick: () => void;
  label?: string;
}
export function FAB({
  onClick,
  label = 'Agregar'
}: FABProps) {
  return <button onClick={onClick} className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full shadow-lg p-4 active:scale-95 transition-transform z-20" aria-label={label}>
      <PlusIcon className="w-8 h-8" />
    </button>;
}