import { AlertCircle, Clock, ListMinus, Scale } from 'lucide-react';
import type { Signal, SignalKind } from '@/types/api/signals';

function signalIcon(kind: SignalKind) {
  switch (kind) {
    case 'multiple_review_rounds':
      return <ListMinus className="h-3 w-3" />;
    case 'slow_first_review':
      return <Clock className="h-3 w-3" />;
    case 'large_change':
      return <Scale className="h-3 w-3" />;
    case 'long_idle_gap':
      return <AlertCircle className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
}

function signalLabel(signal: Signal) {
  const prNum = signal.relatedItem?.meta?.prNumber;
  const repo = signal.relatedItem?.meta?.repoFullName;
  if (typeof prNum === 'number') {
    return repo ? `${repo} #${prNum}` : `PR #${prNum}`;
  }
  if (signal.relatedItem?.title?.trim()) return signal.relatedItem.title;
  return signal.kind.replace(/_/g, ' ');
}

export function SignalPill({
  signal,
  onClick,
}: {
  signal: Signal;
  onClick: (signal: Signal) => void;
}) {
  const label = signalLabel(signal);

  return (
    <button
      type="button"
      onClick={() => onClick(signal)}
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px]',
        'transition',
        'border-white/10 bg-surface-lower text-text-secondary',
        'hover:bg-white/5 hover:text-text-primary',
        'focus:outline-none focus:ring-2 focus:ring-white/15',
      ].join(' ')}
      aria-label={`Open signal: ${label}`}
      title={label}
    >
      {signalIcon(signal.kind)}
      <span className="truncate max-w-[9rem]">{label}</span>
    </button>
  );
}
