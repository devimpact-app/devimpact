import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

type Props = {
  children: string;
  className?: string;
};

export function CopyableCode({ children, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className={cn('relative group', className)}>
      <pre className="rounded-lg bg-[#050814] border border-white/10 px-3 py-2 text-[11px] text-[#D0E1FF] overflow-x-auto no-scrollbar">
        <code>{children}</code>
      </pre>

      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'absolute top-1 right-1 p-1 rounded-md border border-slate-700/50',
          'bg-slate-900/80 text-slate-400 hover:text-slate-100 hover:bg-slate-800',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
