'use client';

import { WEEKDAY_LABELS } from '@/lib/utils/date';
import { ChevronRight, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { WorkRhythm, WorkRhythmBucket } from '@/types/api/work-rhythm';
import { WorkRhythmCardSkeleton } from './WorkRythmCardSkeleton';

type WorkRhythmCardProps = {
  rhythm?: WorkRhythm;
  loading?: boolean;
  error?: string | null;
  onViewTimelineClick?: () => void;
};

// 4 time bands: early, morning, afternoon, evening
const TIME_BANDS = 4;
const DAY_COLUMNS = 7;

// These correspond to the backend bucket keys
const DAY_ORDER: WorkRhythmBucket['day'][] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

const BAND_ORDER: WorkRhythmBucket['band'][] = ['early', 'am', 'pm', 'eve'];

function lerpColor(c1: string, c2: string, t: number) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);

  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export function WorkRhythmCard({
  rhythm,
  loading,
  error,
  onViewTimelineClick,
}: WorkRhythmCardProps) {
  // Build a 4x7 grid from backend buckets
  const { grid, maxCount } = useMemo(() => {
    const base: number[][] = Array.from({ length: TIME_BANDS }, () =>
      Array.from({ length: DAY_COLUMNS }, () => 0)
    );

    if (!rhythm) {
      return { grid: base, maxCount: 0 };
    }

    const dayIndex = (day: WorkRhythmBucket['day']) => DAY_ORDER.indexOf(day);
    const bandIndex = (band: WorkRhythmBucket['band']) =>
      BAND_ORDER.indexOf(band);

    let max = 0;

    for (const b of rhythm.buckets) {
      const r = bandIndex(b.band);
      const c = dayIndex(b.day);
      if (r < 0 || c < 0) continue;

      base[r][c] = b.eventCount;
      if (b.eventCount > max) {
        max = b.eventCount;
      }
    }

    // Prefer backend max if present, otherwise fallback
    const finalMax = rhythm.maxBucketCount || max;

    return { grid: base, maxCount: finalMax };
  }, [rhythm]);

  if (loading) {
    return <WorkRhythmCardSkeleton />;
  }

  const windowLabel = rhythm?.range.label ?? 'the last 4 weeks';

  const summary = rhythm?.summary;

  return (
    <section
      className="
        rounded-2xl border border-white/10 
        bg-[#111520] 
        px-5 py-4 
        flex flex-col gap-4 
        w-full
      "
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="
              h-7 w-7 flex items-center justify-center 
              rounded-lg bg-[#181E2A] border border-white/10
            "
          >
            <BarChart3 className="h-4 w-4 text-white/70" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-white/90 tracking-tight">
              Your Work Rhythm
            </h3>
            <span className="text-[11px] text-white/45">
              Typical weekly pattern based on {windowLabel}.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewTimelineClick}
          className="
            text-[11px] text-[#7EA6F8] 
            hover:underline inline-flex items-center gap-1
          "
        >
          View timeline
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="relative flex flex-col gap-2">
        <div
          className="
          w-full h-24 
          rounded-xl 
          border border-white/5 
          bg-[#0C101A]
          overflow-hidden 
          relative
        "
        >
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />
          </div>

          <div className="absolute inset-1 flex">
            <div className="flex flex-col justify-between mr-1">
              {['Early', 'AM', 'PM', 'Eve'].map((t) => (
                <span
                  key={t}
                  className="text-[9px] text-white/30 leading-none translate-y-1"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex-1 grid grid-rows-4 grid-cols-7 gap-[4px]">
              {grid.map((row, bandIdx) =>
                row.map((count, dayIdx) => {
                  const ratio = !maxCount || count === 0 ? 0 : count / maxCount;

                  const ZERO_COLOR = '#1A1D2A'; // no activity

                  const fill =
                    ratio === 0
                      ? ZERO_COLOR
                      : lerpColor('#4A4F73', '#34D1C6', ratio);
                  const border = lerpColor('#5E668A', '#59F2DD', ratio);
                  const glow =
                    ratio > 0.75 ? '0 0 8px rgba(52, 209, 198, 0.3)' : 'none';

                  return (
                    <div
                      key={`${bandIdx}-${dayIdx}`}
                      className="
                        rounded-full 
                        transition-transform transition-colors duration-150 
                        hover:scale-[1.03]
                      "
                      style={{
                        backgroundColor: fill,
                        border: border,
                        boxShadow: glow,
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-[#0C101A]/60 flex items-center justify-center">
              <div className="h-6 w-24 rounded-full bg-[#141A26] animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex justify-between px-1">
          {WEEKDAY_LABELS.map((day) => (
            <span
              key={day}
              className="w-[12%] text-[10px] text-white/45 text-center"
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[11px] text-[#7C86A8] leading-normal">
          We aggregate your coding and review activity into a typical week so
          you can spot when your focus time naturally happens.
        </p>

        <p className="text-xs text-[#C7D2FF] leading-relaxed">
          {summary?.description ??
            'We’re mapping out your recent coding and review activity to surface your natural focus windows.'}
        </p>

        {summary?.protectWindows?.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {summary.protectWindows.map((w) => (
              <span
                key={`${w.day}-${w.band}`}
                className="rounded-full border border-[#3B4A78] px-2.5 py-1 text-[11px] text-[#C7D2FF]"
              >
                {w.label}
              </span>
            ))}
          </div>
        ) : null}

        {error && <p className="text-[11px] text-red-300/80">{error}</p>}
      </div>
    </section>
  );
}
