import { ChevronDown } from 'lucide-react';

export function SelectWithChevron({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
    </div>
  );
}
