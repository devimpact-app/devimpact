import {
  TMetricResult,
  TMetricsBatchInput,
  TStatResult,
  TTimeseriesResult,
} from '@/types/api/metrics';
import { runBatchServer } from '../metrics/runBatchServer';

import { TMetricsBatchResult } from '@/types/api/metrics';
import {
  MetricWindowKind,
  OneOnOneMetricForLLM,
  OneOnOneMetricStatForLLM,
  OneOnOneMetricTimeseriesPointForLLM,
  OneOnOneMetricWindowForLLM,
} from './types';
import { formatMetricValue } from '../metrics/client';

function buildStatForLLM(
  result: TStatResult
): OneOnOneMetricStatForLLM | undefined {
  if (!result.data || result.data.length === 0) return undefined;

  const current = result.data.find((d) => d.kind === 'current');
  const comparison = result.data.find((d) => d.kind === 'comparison');

  const currentValue = current?.value ?? null;
  const previousValue = comparison?.value ?? null;

  const currentDisplay = formatMetricValue(result.valueFormat, currentValue);
  const previousDisplay =
    previousValue != null
      ? formatMetricValue(result.valueFormat, previousValue)
      : null;

  const deltaPct =
    typeof current?.deltaPct === 'number' ? current.deltaPct : null;

  let deltaLabel: string | null = null;
  if (deltaPct != null) {
    const pctRounded = Math.round(deltaPct * 100);
    if (pctRounded > 0) deltaLabel = `+${pctRounded}% vs previous period`;
    else if (pctRounded < 0) deltaLabel = `${pctRounded}% vs previous period`;
    else deltaLabel = 'No change vs previous period';
  }

  return {
    currentValue,
    currentDisplay,
    previousValue,
    previousDisplay,
    deltaPct,
    deltaLabel,
  };
}

function formatWeekBucketLabel(startISO: string): string {
  const d = new Date(startISO);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `Week of ${m}/${day}`;
}

function buildTimeseriesForLLM(
  result: TTimeseriesResult
): OneOnOneMetricTimeseriesPointForLLM[] | undefined {
  if (!result.series || result.series.length === 0) return undefined;

  // For v1 we assume a single series per metric.
  const series = result.series[0];
  if (!series.points || series.points.length === 0) return undefined;

  return series.points.map((p) => ({
    bucketLabel: formatWeekBucketLabel(p.bucketStart),
    status: p.status,
    rawValue: p.value,
    displayValue: formatMetricValue(result.valueFormat, p.value),
  }));
}

// --- main builder ---

export function buildOneOnOneMetricsFromBatch(
  batch: TMetricsBatchResult,
  window: {
    shortWindowStart: string;
    shortWindowEnd: string;
    mediumWindowStart: string;
    mediumWindowEnd: string;
  }
): OneOnOneMetricForLLM[] {
  // Group by metricId + windowKind
  const byMetric: Record<
    string,
    {
      meta: {
        label?: string;
        description?: string;
        unitLabel?: string;
      };
      windows: Partial<
        Record<
          MetricWindowKind,
          {
            stat?: TStatResult;
            timeseries?: TTimeseriesResult;
          }
        >
      >;
    }
  > = {};

  for (const result of batch.results) {
    const metricId = result.metricId;
    let windowKind: MetricWindowKind;
    if (
      result.window.start === window.shortWindowStart &&
      result.window.end === window.shortWindowEnd
    ) {
      windowKind = 'short';
    } else {
      windowKind = 'medium';
    }

    if (!byMetric[metricId]) {
      const unitLabel = result.unit ?? result.valueFormat?.unitSuffix;
      byMetric[metricId] = {
        meta: {
          label: result.title,
          description: result.description,
          unitLabel,
        },
        windows: {},
      };
    } else {
      // Fill in label/description/unit if missing
      if (!byMetric[metricId].meta.label && result.title) {
        byMetric[metricId].meta.label = result.title;
      }
      if (!byMetric[metricId].meta.description && result.description) {
        byMetric[metricId].meta.description = result.description;
      }
      if (
        !byMetric[metricId].meta.unitLabel &&
        (result.unit || result.valueFormat?.unitSuffix)
      ) {
        byMetric[metricId].meta.unitLabel =
          result.unit ?? result.valueFormat?.unitSuffix;
      }
    }

    const metricGroup = byMetric[metricId];

    if (!metricGroup.windows[windowKind]) {
      metricGroup.windows[windowKind] = {};
    }

    if (result.shape === 'stat') {
      metricGroup.windows[windowKind]!.stat = result;
    } else if (result.shape === 'timeseries') {
      metricGroup.windows[windowKind]!.timeseries = result;
    }
  }

  // Convert grouped structure into final OneOnOneMetricForLLM[]
  const output: OneOnOneMetricForLLM[] = [];

  for (const [metricId, group] of Object.entries(byMetric)) {
    const windowsForMetric: OneOnOneMetricWindowForLLM[] = [];

    (['short', 'medium'] as MetricWindowKind[]).forEach((kind) => {
      const bucket = group.windows[kind];
      if (!bucket) return;

      const sourceResult = bucket.stat ?? bucket.timeseries;
      if (!sourceResult) return;

      const startISO = sourceResult.window.start;
      const endISO = sourceResult.window.end;

      const stat = bucket.stat ? buildStatForLLM(bucket.stat) : undefined;
      const timeseries = bucket.timeseries
        ? buildTimeseriesForLLM(bucket.timeseries)
        : undefined;

      // If we somehow have neither, skip this window
      if (!stat && !timeseries) return;

      windowsForMetric.push({
        kind,
        startISO,
        endISO,
        stat,
        timeseries,
      });
    });

    if (windowsForMetric.length === 0) continue;

    output.push({
      metricId,
      label: group.meta.label ?? metricId,
      description: group.meta.description,
      unitLabel: group.meta.unitLabel,
      windows: windowsForMetric,
    });
  }

  return output;
}

export async function fetchMetricsForWindows(params: {
  tenantId: string;
  windows: { key: 'short' | 'medium'; start: Date; end: Date }[];
}): Promise<{
  llm: OneOnOneMetricForLLM[];
  full: TMetricResult[];
}> {
  const { tenantId, windows } = params;

  const shortWindow = windows.find((w) => w.key === 'short');
  const mediumWindow = windows.find((w) => w.key === 'medium');
  if (!shortWindow || !mediumWindow)
    return {
      full: [],
      llm: [],
    };
  const { start: shortWindowStart, end: shortWindowEnd } = shortWindow ?? {};
  const { start: mediumWindowStart, end: mediumWindowEnd } = mediumWindow ?? {};

  const metricIds = [
    'pr.authored_merged_count.v1',
    'pr.lead_time_seconds.v1',
    'pr.time_to_first_review.v1',
    'pr.time_review_to_merge.v1',
    'pr.size_lines_changed_median.v1',
    'pr.size_files_changed_median.v1',
    'pr.test_rate.v1',
    'pr.blocked_rate.v1',
    'review.given_count.v1',
    'review.latency_seconds.avg.v1',
    'review.comment_count.avg.v1',
  ];

  const batchResult = await runBatchServer(
    {
      requests: metricIds.flatMap((metricId) => [
        {
          metricId,
          input: {
            start: shortWindowStart.toISOString(),
            end: shortWindowEnd.toISOString(),
            windowWeeks: 0,
            shape: 'stat',
            comparison: { kind: 'previous_period' },
          },
        },
        {
          metricId,
          input: {
            start: mediumWindowStart.toISOString(),
            end: mediumWindowEnd.toISOString(),
            windowWeeks: 0,
            shape: 'timeseries',
          },
        },
      ]),
    } as TMetricsBatchInput,
    tenantId
  );

  const llmMetrics = buildOneOnOneMetricsFromBatch(batchResult, {
    shortWindowStart: shortWindowStart.toISOString(),
    shortWindowEnd: shortWindowEnd.toISOString(),
    mediumWindowStart: mediumWindowStart.toISOString(),
    mediumWindowEnd: mediumWindowEnd.toISOString(),
  });

  return {
    llm: llmMetrics,
    full: batchResult.results,
  };
}
