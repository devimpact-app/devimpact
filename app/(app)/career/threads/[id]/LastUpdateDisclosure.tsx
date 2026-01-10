import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

function fmtShort(dtIso?: string | null) {
  if (!dtIso) return null;
  const d = new Date(dtIso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function LastUpdateDisclosure({
  lastUpdate,
  defaultOpen = false,
}: {
  lastUpdate: {
    headline?: string;
    bullets?: string[];
    referencedEventIds?: string[];
    generatedAt: string;
  };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const generatedLabel = useMemo(
    () => fmtShort(lastUpdate.generatedAt) ?? '—',
    [lastUpdate.generatedAt]
  );

  const bulletCount = lastUpdate.bullets?.length ?? 0;
  const refCount = lastUpdate.referencedEventIds?.length ?? 0;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-white/80">
            Changes since last sync
          </div>
          <div className="mt-0.5 text-[11px] text-white/45">
            Generated {generatedLabel}
            {bulletCount
              ? ` · ${bulletCount} highlight${bulletCount === 1 ? '' : 's'}`
              : ''}
            {refCount ? ` · ${refCount} event${refCount === 1 ? '' : 's'}` : ''}
          </div>
        </div>

        <ChevronDown
          className={[
            'h-4 w-4 shrink-0 text-white/45 transition',
            open ? 'rotate-180' : 'rotate-0',
            'group-hover:text-white/70',
          ].join(' ')}
        />
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          {lastUpdate.headline ? (
            <div className="text-[13px] text-white/75">
              {lastUpdate.headline}
            </div>
          ) : null}

          {lastUpdate.bullets?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-white/65">
              {lastUpdate.bullets.slice(0, 6).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-[12px] text-white/45">
              No notable changes captured.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
