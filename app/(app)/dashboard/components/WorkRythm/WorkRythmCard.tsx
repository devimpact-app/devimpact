'use client';

import { WEEKDAY_LABELS } from '@/lib/utils/date';
import { ChevronRight, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import {
  TimeBandKey,
  WorkRhythm,
  WorkRhythmBucket,
} from '@/types/api/work-rhythm';
import { WorkRhythmCardSkeleton } from './WorkRythmCardSkeleton';
import { TIME_BAND_LABELS } from '@/lib/analysis/work-rhythm/service/labels';

type WorkRhythmCardProps = {
  rhythm?: WorkRhythm;
  loading?: boolean;
  error?: string | null;
  onViewTimelineClick?: () => void;
};

const TIME_BANDS = 5;
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

const BAND_ORDER: WorkRhythmBucket['band'][] = [
  'early',
  'morning',
  'midday',
  'afternoon',
  'eve',
];

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

function WorkRhythmLegend({
  showMeetings,
  stripeSize = 5,
}: {
  showMeetings: boolean;
  stripeSize?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/45">
      <div className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#34D1C6]/80 ring-1 ring-white/10" />
        <span>Coding activity</span>
      </div>

      {showMeetings && (
        <div className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full ring-1 ring-white/15"
            style={{
              opacity: 0.4,
              backgroundImage: `repeating-linear-gradient(
135deg,
rgba(255,255,255,0.85) 0 ${stripeSize / 2}px,
rgba(255,255,255,0) ${stripeSize / 2}px ${stripeSize}px
)`,
            }}
          />
          <span>Meetings scheduled</span>
        </div>
      )}
    </div>
  );
}

export function WorkRhythmCard({
  rhythm,
  loading,
  error,
  onViewTimelineClick,
}: WorkRhythmCardProps) {
  const { grid, maxCount } = useMemo(() => {
    const base: (WorkRhythmBucket | null)[][] = Array.from(
      { length: TIME_BANDS },
      () => Array.from({ length: DAY_COLUMNS }, () => null)
    );

    if (!rhythm) return { grid: base, maxCount: 0 };

    const dayIndex = (day: WorkRhythmBucket['day']) => DAY_ORDER.indexOf(day);
    const bandIndex = (band: WorkRhythmBucket['band']) =>
      BAND_ORDER.indexOf(band);

    let max = 0;

    for (const b of rhythm.buckets) {
      const r = bandIndex(b.band);
      const c = dayIndex(b.day);
      if (r < 0 || c < 0) continue;

      base[r][c] = b;
      if (b.eventCount > max) max = b.eventCount;
    }

    return { grid: base, maxCount: rhythm.maxBucketCount || max };
  }, [rhythm]);

  const showMeetingsLegend = useMemo(() => {
    if (!rhythm?.buckets?.length) return false;
    return rhythm.buckets.some((b) => (b.meetings?.meetingMinutes ?? 0) > 0);
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
            <h3 className="text-[15px] font-semibold text-white/90 tracking-tight">
              Your Work Rhythm
            </h3>
            <span className="text-[13px] text-white/55">
              Typical weekly pattern based on {windowLabel}.
            </span>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between">
        <WorkRhythmLegend showMeetings={showMeetingsLegend} />

        {!showMeetingsLegend && (
          <span className="text-[11px] text-white/30">
            Connect Calendar to overlay meetings.
          </span>
        )}
      </div>

      <div className="relative flex flex-col gap-2">
        <div
          className="
          w-full h-32 
          rounded-xl 
          border border-white/5 
          bg-[#0C101A]
          overflow-visible 
          relative
        "
        >
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />
          </div>

          <div className="absolute inset-1 flex">
            <div className="flex flex-col justify-between mr-2">
              {['Early', 'Morning', 'Midday', 'Afternoon', 'Eve'].map((t) => (
                <span
                  key={t}
                  className="text-[9px] text-white/30 leading-none translate-y-1"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex-1 grid grid-rows-5 grid-cols-7 gap-[4px]">
              {grid.map((row, bandIdx) =>
                row.map((bucket, dayIdx) => {
                  const count = bucket?.eventCount ?? 0;
                  const meetings = bucket?.meetings; // might be undefined if calendar not connected

                  const ratio = !maxCount || count === 0 ? 0 : count / maxCount;

                  const ZERO_COLOR = '#1A1D2A'; // no activity

                  const fill =
                    ratio === 0
                      ? ZERO_COLOR
                      : lerpColor('#4A4F73', '#34D1C6', ratio);
                  const border = lerpColor('#5E668A', '#59F2DD', ratio);
                  const glow =
                    ratio > 0.75 ? '0 0 8px rgba(52, 209, 198, 0.3)' : 'none';

                  const meetingShare = bucket?.meetings?.meetingShare ?? 0;
                  const overlayOpacity =
                    meetingShare < 0.1
                      ? 0
                      : meetingShare < 0.2
                        ? 0.08
                        : meetingShare < 0.3
                          ? 0.14
                          : meetingShare < 0.5
                            ? 0.18
                            : 0.22;

                  // Much wider stripes at low levels = less visual noise
                  const stripeSize =
                    meetingShare < 0.3 ? 12 : meetingShare < 0.5 ? 8 : 6;

                  return (
                    <div
                      key={`${bandIdx}-${dayIdx}`}
                      className="
                        rounded-full 
                        transition-transform duration-150 
                        hover:scale-[1.03]
                        relative group
                      "
                      style={{
                        backgroundColor: fill,
                        border: border,
                        boxShadow: glow,
                      }}
                    >
                      {overlayOpacity > 0 && (
                        <div
                          className="absolute inset-0 pointer-events-none rounded-full"
                          style={{
                            opacity: overlayOpacity,
                            backgroundImage: `repeating-linear-gradient(
                              135deg,
                              rgba(255,255,255,0.85) 0 ${stripeSize / 2}px,
                              rgba(255,255,255,0) ${stripeSize / 2}px ${stripeSize}px
                            )`,
                          }}
                        />
                      )}
                      <div className="pointer-events-none absolute left-1/2 top-[-10px] z-100 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-slate-700 bg-slate-950/95 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-lg group-hover:block">
                        <div className="font-medium capitalize text-slate-100">
                          {bucket?.day ?? 'mon'} •{' '}
                          {TIME_BAND_LABELS[bucket?.band || 'early']}
                        </div>
                        <div className="text-slate-400">
                          Coding: {count} events
                        </div>
                        {meetings ? (
                          <div className="text-slate-400">
                            Meetings: {meetings.meetingCount} •{' '}
                            {meetings.meetingMinutes}m •{' '}
                            {Math.round(meetings.meetingShare * 100)}% of time
                          </div>
                        ) : (
                          <div className="text-slate-500">
                            Calendar not connected
                          </div>
                        )}
                        <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-slate-700 bg-slate-950/95" />
                      </div>
                    </div>
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
        <p className="text-[13px] text-white/50 leading-normal">
          We map your coding and review activity into a typical week, layering
          in meetings to reveal how focus and collaboration interact.
        </p>

        <p className="text-sm text-white/80 leading-relaxed">
          {summary?.description ??
            'We’re mapping out your recent coding and review activity to surface your natural focus windows.'}
        </p>

        {summary?.protectWindows?.length ? (
          <div className="flex flex-col gap-1.5 pt-2">
            <p className="text-xs text-slate-500 leading-tight">
              Suggested times to protect during daytime work hours
            </p>

            <div className="flex flex-wrap gap-2">
              {summary.protectWindows.map((w) => (
                <span
                  key={`${w.startUtc}-${w.endUtc}`}
                  className="rounded-full border border-[#3B4A78] px-2.5 py-1 text-xs text-[#C7D2FF]"
                >
                  {w.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {error && <p className="text-[11px] text-red-300/80">{error}</p>}
      </div>
    </section>
  );
}
