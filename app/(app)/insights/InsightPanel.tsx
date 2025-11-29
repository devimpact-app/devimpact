import type { Insight } from '@/types/api/insights';
import { X } from 'lucide-react';

export function InsightPanel({
  insight,
  onClose,
}: {
  insight: Insight;
  onClose: () => void;
}) {
  return (
    <aside
      className="
      fixed right-0 top-0 bottom-0 w-full max-w-[400px]
      bg-surface-alt border-l border-border 
      shadow-2xl z-50 animate-slideIn
      flex flex-col px-4 py-3
    "
    >
      <header className="flex items-start justify-between">
        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-surface/80 ml-2"
          aria-label="Close inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
    </aside>
  );
}
