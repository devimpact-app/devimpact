'use client';

import { BarChart3 } from 'lucide-react';

export type RangeValue = '4w' | '8w' | '12w';

type RangePickerProps = {
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  className?: string;
};

const OPTIONS: { value: RangeValue; label: string; hint: string }[] = [
  { value: '4w', label: '4 weeks', hint: 'Most recent' },
  { value: '8w', label: '8 weeks', hint: 'More stable' },
  { value: '12w', label: '12 weeks', hint: 'Full quarter' },
];

export function RangePicker({ value, onChange, className }: RangePickerProps) {
  return (
    <div
      className={`
        inline-flex items-center gap-3 rounded-full border border-slate-700/70 
        bg-slate-900/70 px-3 py-1.5 shadow-sm shadow-black/30
        ${className ?? ''}
      `}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90">
        <BarChart3 className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-1.5">
        {OPTIONS.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={isActive}
              className={`
    inline-flex items-center rounded-full px-2.5 py-1
    transition-colors gap-1
    ${
      isActive
        ? 'bg-sky-500/90 text-slate-50 shadow-sm shadow-sky-900/60'
        : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
    }
  `}
            >
              <span className="flex flex-col leading-none">
                <span className="text-[11px] mb-1 font-medium">
                  {opt.label}
                </span>
                <span
                  className={`text-[10px] ${
                    isActive ? 'text-sky-100/90' : 'text-slate-400'
                  }`}
                >
                  {opt.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
