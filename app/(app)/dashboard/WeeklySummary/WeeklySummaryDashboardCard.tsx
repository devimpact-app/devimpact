'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowRight,
  AlertTriangle,
  Loader2,
  List,
  FilePlus,
} from 'lucide-react';
import { formatDateOnly } from '@/lib/utils/date';
import { formatWeekRangeForWeeklySummary } from '../../career/components/WeeklySummariesSection/helpers';
import { WeeklySummaryItem } from '@/types/api/weekly-summary';
import { WeeklySummaryActivitySnippet } from './WeeklySummaryActivitySnippet';
import { ActionButton } from '../components/ActionButton';
import { StatusPill } from '../components/StatusPill';

export function WeeklySummaryDashboardCard({
  summary,
  isLoading = false,
  error = null,
  onGenerateLastCompletedWeek,
}: {
  summary?: WeeklySummaryItem | null;
  isLoading?: boolean;
  error?: string | null;
  onGenerateLastCompletedWeek?: () => void;
}) {
  const state = useMemo(() => {
    if (error) return 'error' as const;
    if (isLoading && !summary) return 'loading' as const;

    if (!summary) return 'empty' as const;

    if (summary.status === 'generating' || summary.status === 'pending')
      return 'generating' as const;
    if (summary.status === 'failed') return 'failed' as const;
    if (summary.status === 'ready') return 'ready' as const;

    return 'empty' as const;
  }, [error, isLoading, summary]);

  const range = summary
    ? formatWeekRangeForWeeklySummary(summary.weekStartLocalDate)
    : '';
  const headline = summary?.output?.headline?.trim() || null;
  const generated = formatDateOnly(summary?.generatedAt ?? null);

  const allSummariesHref = '/career/weekly-summaries';
  const detailHref = summary?.id
    ? `${allSummariesHref}/${summary.id}`
    : allSummariesHref;

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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-white/90">
              Latest Weekly Summary
            </h2>

            {state === 'ready' ? (
              <StatusPill kind="good" label="Ready" />
            ) : null}
            {state === 'generating' ? (
              <StatusPill kind="warn" label="Generating" />
            ) : null}
            {state === 'failed' || state === 'error' ? (
              <StatusPill kind="bad" label="Needs attention" />
            ) : null}
            {state === 'empty' ? (
              <StatusPill kind="neutral" label="Not created yet" />
            ) : null}
            {state === 'loading' ? (
              <StatusPill kind="neutral" label="Loading" />
            ) : null}
          </div>

          {state === 'ready' && (range || generated) ? (
            <div className="mt-1 text-[12px] text-white/55">
              {range ? <span>{range}</span> : null}
              {range && generated ? (
                <span className="mx-2 text-white/25">·</span>
              ) : null}
              {generated ? <span>Created {generated}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {state === 'ready' ? (
            <>
              <ActionButton href={detailHref} variant="primary">
                View <ArrowRight className="h-4 w-4" />
              </ActionButton>
              <ActionButton variant="secondary" href={allSummariesHref}>
                <List className="h-4 w-4" />
                See all summaries
              </ActionButton>
            </>
          ) : null}

          {state === 'empty' ? (
            <>
              <ActionButton
                variant="primary"
                onClick={onGenerateLastCompletedWeek}
              >
                <FilePlus className="h-4 w-4" />
                Create last week's summary
              </ActionButton>
              <ActionButton href="/career/weekly-summaries" variant="secondary">
                View all <ArrowRight className="h-4 w-4" />
              </ActionButton>
            </>
          ) : null}

          {state === 'generating' ? (
            <ActionButton href="/career/weekly-summaries" variant="secondary">
              View all <ArrowRight className="h-4 w-4" />
            </ActionButton>
          ) : null}

          {state === 'failed' || state === 'error' ? (
            <>
              <ActionButton
                variant="primary"
                onClick={onGenerateLastCompletedWeek}
              >
                Try again <ArrowRight className="h-4 w-4" />
              </ActionButton>
              <ActionButton href={detailHref} variant="secondary">
                View details <ArrowRight className="h-4 w-4" />
              </ActionButton>
            </>
          ) : null}

          {state === 'loading' ? (
            <ActionButton
              href="/career/weekly-summaries"
              variant="secondary"
              disabled
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </ActionButton>
          ) : null}
        </div>
      </div>

      {state === 'ready' ? (
        <div className="text-[13px] leading-relaxed text-white/75">
          {headline ? (
            <p className="line-clamp-2">{headline}</p>
          ) : (
            <p className="text-white/50">Summary is ready.</p>
          )}
          <WeeklySummaryActivitySnippet activity={summary?.activity} />
        </div>
      ) : null}

      {state === 'empty' ? (
        <div className="text-[13px] leading-relaxed text-white/70">
          <p>
            Your weekly summaries are created automatically from your GitHub and
            calendar activity. You can create last week's summary now, or wait
            for the next scheduled run.
          </p>
        </div>
      ) : null}

      {state === 'generating' ? (
        <div className="flex items-start gap-3 text-[13px] text-white/70">
          <div className="mt-0.5">
            <Loader2 className="h-4 w-4 animate-spin text-white/50" />
          </div>
          <p>
            We’re generating your weekly summary based on your recent work. This
            usually takes a minute or two.
          </p>
        </div>
      ) : null}

      {state === 'failed' ? (
        <div className="flex items-start gap-3 text-[13px] text-rose-200/80">
          <div className="mt-0.5">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-white/70">
            <p>We hit an issue generating this summary.</p>
          </div>
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="flex items-start gap-3 text-[13px] text-rose-200/80">
          <div className="mt-0.5">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-white/70">
            <p>Failed to load weekly summary.</p>
            {error ? (
              <p className="mt-1 text-[12px] text-white/50">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
