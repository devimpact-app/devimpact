'use client';

import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'devimpact:prSummaryBackfill:lastRun';
const BATCH_LIMIT = 5;
const MAX_BATCHES_PER_LOAD = 3;
const ENDPOINT = '/api/internal/pr-summaries/backfill';

function getLocalDayKey(timezone: string): string {
  const now = new Date();

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

export function usePrSummaryBackfill() {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (typeof window === 'undefined') return;

    const timezone =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC';
    const dayKey = getLocalDayKey(timezone);
    const token = `${dayKey}@${timezone ?? 'local'}`;

    const lastRun = localStorage.getItem(STORAGE_KEY);
    if (lastRun === token) {
      return;
    }

    async function runBackfill() {
      try {
        let batchesRun = 0;

        while (batchesRun < MAX_BATCHES_PER_LOAD) {
          const res = await fetch(
            `${ENDPOINT}?limit=${BATCH_LIMIT}&lookbackDays=90`,
            { method: 'POST' }
          );

          if (!res.ok) break;
          const { data } = await res.json();

          // If no more items to process, stop the loop
          if (!data.processed || data.processed === 0) {
            break;
          }

          batchesRun++;
        }

        // Mark the day as complete
        localStorage.setItem(STORAGE_KEY, token);
      } catch (e) {
        console.error('PR summary backfill failed', e);
      }
    }

    runBackfill();
  }, []);
}
