'use client';

import { getTimezone } from '@/lib/utils/date';
import { getWeekStartMondayIso } from './shared';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, FilePlus } from 'lucide-react';
import { postJson } from '@/components/api';

export function GenerateWeeklySummaryButton() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  async function handleGenerateClick(offset: number) {
    setGenerateError(null);
    setGenerateSuccess(null);
    setGenerateLoading(true);
    const weekStartIso = getWeekStartMondayIso(offset);
    try {
      await postJson('/api/weekly-summary/run', {
        timezone: getTimezone(),
        weekStartIso,
        force: true,
      });
      setGenerateSuccess('Weekly summary generated');
      router.refresh();
    } catch (e: any) {
      setGenerateError(e.message ?? 'Failed to generate weekly summary');
    } finally {
      setGenerateLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <button
          type="button"
          className={[
            'inline-flex h-9 items-center gap-2 px-3',
            'text-[12px] font-medium text-white/85',
            'hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/20',
          ].join(' ')}
          onClick={() => handleGenerateClick(1)}
          disabled={generateLoading}
        >
          <FilePlus className="h-4 w-4 text-white/60" />
          Create last week's summary
        </button>

        <button
          type="button"
          aria-label="More generate options"
          aria-expanded={open}
          className={[
            'inline-flex h-9 items-center justify-center px-2',
            'border-l border-white/10',
            'text-white/60 hover:bg-white/[0.06] hover:text-white/80',
            'focus:outline-none focus:ring-2 focus:ring-white/20',
          ].join(' ')}
          onClick={() => setOpen((v) => !v)}
          disabled={generateLoading}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-2 w-[240px] rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-lg backdrop-blur">
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/[0.06]"
              onClick={() => {
                setOpen(false);
                handleGenerateClick(0);
              }}
              disabled={generateLoading}
            >
              Current week (to date)
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/[0.06]"
              onClick={() => {
                setOpen(false);
                handleGenerateClick(1);
              }}
              disabled={generateLoading}
            >
              Last completed week
            </button>

            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-white/85 hover:bg-white/[0.06]"
              onClick={() => {
                setOpen(false);
                handleGenerateClick(2);
              }}
              disabled={generateLoading}
            >
              Two weeks ago
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
