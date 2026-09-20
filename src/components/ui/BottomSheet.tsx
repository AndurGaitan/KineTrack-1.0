import { ReactNode } from 'react';

interface BottomSheetProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

/** Bottom sheet for short forms — same shell as ActionSheet, but holds arbitrary content. */
export function BottomSheet({ title, children, onClose }: BottomSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
