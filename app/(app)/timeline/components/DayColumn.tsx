import { useMemo, useState } from 'react';
import { dotColor, kindLabel, TimelineDot } from './DotLogic';
import { TimelineBlock } from './BlockLogic';
import { ActivityEvent } from '@/types/api/timeline';
import { formatTimeIso, formatTimeRange } from '@/lib/utils/date';

const LANE_COUNT = 3;
const TOP_OVERFLOW_PCT = 12; // space above 6a (early bucket)
const BOTTOM_OVERFLOW_PCT = 12; // space below 6p (late bucket)
const WORKDAY_PCT = 100 - TOP_OVERFLOW_PCT - BOTTOM_OVERFLOW_PCT;

type Hovered =
  | { type: 'dot'; dot: TimelineDot }
  | { type: 'block'; block: TimelineBlock }
  | null;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function dotTopPct(dot: TimelineDot) {
  const r = clamp01(dot.timeRatio);

  if (dot.bucket === 'early') {
    return r * TOP_OVERFLOW_PCT;
  }

  if (dot.bucket === 'late') {
    return TOP_OVERFLOW_PCT + WORKDAY_PCT + r * BOTTOM_OVERFLOW_PCT;
  }

  // workday
  return TOP_OVERFLOW_PCT + r * WORKDAY_PCT;
}

function workdayLinePct(ratioWithinWorkday: number) {
  // ratioWithinWorkday: 0..1 where 0=6a and 1=6p
  return TOP_OVERFLOW_PCT + clamp01(ratioWithinWorkday) * WORKDAY_PCT;
}

function blockHeightPct(b: TimelineBlock) {
  const start = clamp01(b.startRatio);
  const end = clamp01(b.endRatio);
  const h = Math.max(0.01, end - start);
  return {
    topPct: TOP_OVERFLOW_PCT + start * WORKDAY_PCT,
    heightPct: h * WORKDAY_PCT,
  };
}

export function DayColumn({
  dayIndex,
  label,
  dots,
  blocks,
  onEventClick,
}: {
  dayIndex: number;
  label: string;
  dots: TimelineDot[];
  blocks: TimelineBlock[];
  onEventClick?: (event: ActivityEvent) => void;
}) {
  const [hovered, setHovered] = useState<Hovered>(null);

  const tooltipStyle = useMemo(() => {
    if (!hovered) return null;

    if (hovered.type === 'dot') {
      return {
        top: `${dotTopPct(hovered.dot)}%`,
        left: '55%',
        transform: 'translateY(-50%)',
      } as const;
    }

    const { topPct, heightPct } = blockHeightPct(hovered.block);
    const mid = topPct + heightPct / 2;
    return {
      top: `${mid}%`,
      left: '95%',
      transform: 'translateY(-50%)',
    } as const;
  }, [hovered]);

  return (
    <div key={label} className="flex flex-col items-center gap-1">
      <div
        className="h-[300px] w-full rounded-md border border-slate-700 bg-slate-900 relative"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-0 right-0 border-t border-border"
            style={{ top: `${workdayLinePct(0)}%` }}
          >
            <span className="absolute left-1 -translate-y-1/2 text-[10px] text-text-tertiary/50">
              6a
            </span>
          </div>

          <div
            className="absolute left-0 right-0 border-t border-border"
            style={{ top: `${workdayLinePct(0.5)}%` }}
          >
            <span className="absolute left-1 -translate-y-1/2 text-[10px] text-text-tertiary/50">
              12p
            </span>
          </div>

          {/* 6p */}
          <div
            className="absolute left-0 right-0 border-t border-border"
            style={{ top: `${workdayLinePct(1)}%` }}
          >
            <span className="absolute left-1 -translate-y-1/2 text-[10px] text-text-tertiary/50">
              6p
            </span>
          </div>
        </div>

        <div className="absolute inset-x-0 top-4 bottom-4">
          <div className="absolute inset-0 z-0">
            {blocks.map((b) => {
              const { topPct, heightPct } = blockHeightPct(b);
              const isHovered =
                hovered?.type === 'block' && hovered.block.id === b.id;

              return (
                <div
                  key={b.id}
                  className={[
                    'absolute left-[15%] right-[5%] rounded-lg',
                    'bg-indigo-400/[0.06]',
                    'border border-indigo-300/10',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                    isHovered
                      ? 'bg-indigo-400/[0.10] border-indigo-300/20'
                      : 'hover:bg-indigo-400/[0.07] hover:border-indigo-300/15',
                    'backdrop-blur-[1px]',
                    'transition-colors',
                    'pointer-events-auto',
                  ].join(' ')}
                  style={{
                    top: `${topPct}%`,
                    height: `${heightPct}%`,
                  }}
                  onMouseEnter={() => setHovered({ type: 'block', block: b })}
                  onMouseLeave={() => {
                    setHovered((cur) =>
                      cur?.type === 'block' && cur.block.id === b.id
                        ? null
                        : cur
                    );
                  }}
                  aria-label={
                    b.meeting.title ? `Meeting: ${b.meeting.title}` : 'Meeting'
                  }
                >
                  <div
                    className="
                      absolute left-0 top-0 bottom-0 w-[3px]
                      rounded-l-full
                      bg-indigo-400/40
                    "
                  />
                </div>
              );
            })}
          </div>
          <div className="absolute inset-0 z-10 pointer-events-none">
            {dots.map((dot) => {
              const jitterUnit = (dot.laneIndex - 1) / (LANE_COUNT - 1); // -0.5, 0, +0.5
              const jitterPercent = jitterUnit * 18;
              const leftPercent = 50 + jitterPercent;

              const isHovered =
                hovered?.type === 'dot' && hovered.dot.id === dot.id;

              return (
                <button
                  key={dot.id}
                  type="button"
                  className={[
                    'absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
                    'shadow-[0_0_6px_1px_rgba(255,255,255,0.08)]',
                    'transition-transform',
                    'pointer-events-auto',
                    isHovered ? 'scale-150' : 'hover:scale-150',
                    dotColor(dot.event.kind),
                  ].join(' ')}
                  style={{
                    top: `${dotTopPct(dot)}%`,
                    left: `${leftPercent}%`,
                  }}
                  onMouseEnter={() => setHovered({ type: 'dot', dot })}
                  onMouseLeave={() => {
                    setHovered((cur) =>
                      cur?.type === 'dot' && cur.dot.id === dot.id ? null : cur
                    );
                  }}
                  onClick={() => onEventClick?.(dot.event)}
                />
              );
            })}
          </div>

          {hovered && tooltipStyle && (
            <div
              className="pointer-events-none absolute z-50 min-w-44 rounded-xl border border-white/10 
                         bg-[#0f1220]/95 backdrop-blur p-2 shadow-2xl text-xs text-white/80"
              style={tooltipStyle}
            >
              {hovered.type === 'dot' ? (
                <>
                  <div className="mb-1 text-[11px] text-white/60">
                    {kindLabel(hovered.dot.event.kind)} ·{' '}
                    {formatTimeIso(hovered.dot.event.occurredAt)}
                  </div>
                  <div className="text-xs font-medium text-white/90 line-clamp-2">
                    {hovered.dot.event.title}
                  </div>
                  {hovered.dot.event.subtitle && (
                    <div className="mt-0.5 text-[11px] text-white/60">
                      {hovered.dot.event.subtitle}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-1 text-[11px] text-white/60">Meeting</div>
                  <div className="text-xs font-medium text-white/90 line-clamp-2">
                    {hovered.block.meeting.title?.trim()
                      ? hovered.block.meeting.title
                      : 'Meeting'}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/60">
                    {formatTimeRange(
                      new Date(hovered.block.meeting.startAt),
                      new Date(hovered.block.meeting.endAt)
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <span className="text-[12px] mt-2 text-text-secondary">{label}</span>
    </div>
  );
}
