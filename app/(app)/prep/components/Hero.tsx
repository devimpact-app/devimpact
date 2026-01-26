'use client';

import { Calendar, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  userName?: string | null;
  onSyncClick?: () => void;
  onPrepareReviewClick?: () => void;
};

export function PrepHero({
  userName,
  onSyncClick,
  onPrepareReviewClick,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const firstName = useMemo(
    () => (userName ? userName.split(' ')[0] : 'there'),
    [userName]
  );

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
            Meeting hub
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your centralized space to prepare and reflect on meetings like
            standups, 1:1s, and sprint rituals
          </p>
        </div>

        {/* <div className="flex items-center">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/80 text-text-secondary hover:text-text-primary hover:bg-surface-alt/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-surface-alt/95 backdrop-blur shadow-xl text-sm py-1">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-text-primary hover:bg-background/60"
                  onClick={() => {
                    setMenuOpen(false);
                    onSyncClick?.();
                  }}
                >
                  Sync GitHub data
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-text-primary hover:bg-background/60"
                  onClick={() => {
                    setMenuOpen(false);
                    onPrepareReviewClick?.();
                  }}
                >
                  Prepare review packet
                </button>
              </div>
            )}
          </div>
        </div> */}
      </div>
    </header>
  );
}
