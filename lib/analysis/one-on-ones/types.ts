import { InsightKind } from '@/types/api/insights';
import { OneOnOneTalkingPoint } from '@/types/api/one-on-one';

export type MetricWindowKind = 'short' | 'medium';

export interface OneOnOneMetricStatForLLM {
  currentValue: number | null;
  currentDisplay: string; // "6 PRs", "2.1h", "—"

  previousValue: number | null;
  previousDisplay: string | null; // "4 PRs" or null if no previous

  deltaPct: number | null; // +0.5 => +50%, -0.2 => -20%
  deltaLabel: string | null; // "+50% vs previous period", etc.
}

export interface OneOnOneMetricTimeseriesPointForLLM {
  bucketLabel: string; // "Week of 11/03"
  status: 'complete' | 'partial'; // current in-progress week = "partial"
  rawValue: number | null; // numeric for logic if needed
  displayValue: string; // already formatted with units
}

export interface OneOnOneMetricWindowForLLM {
  kind: MetricWindowKind; // 'short' | 'medium'
  startISO: string; // for reference only
  endISO: string;

  stat?: OneOnOneMetricStatForLLM;
  timeseries?: OneOnOneMetricTimeseriesPointForLLM[];
}

export interface OneOnOneMetricForLLM {
  metricId: string; // e.g. 'pr.authored_merged_count.v1'
  label: string; // "PRs merged"
  description?: string; // optional helper text
  unitLabel?: string; // "PRs", "hours", "%"

  windows: OneOnOneMetricWindowForLLM[]; // usually 2 items: short + medium
}

export type OneOnOneInsightWindowKind = 'short' | 'medium';

export interface OneOnOneInsightForLLM {
  id: string;
  kind: InsightKind;
  severity: 'info' | 'positive' | 'warning' | 'critical';
  score: number; // 0–100

  window: OneOnOneInsightWindowKind; // 'short' or 'medium'

  title: string; // human readable
  emphasis?: string; // short emphasis line
  body?: string; // narrative summary

  keyStats?: { label: string; value: string }[];
  examples?: {
    id: string;
    entityType: 'pull_request' | 'review';
    title: string;
    url?: string;
  }[];
}

export type OneOnOneLLMContext = {
  meeting: {
    meetingAtISO: string | null;
    shortWindowStartISO: string;
    shortWindowEndISO: string;
    mediumWindowStartISO: string;
    mediumWindowEndISO: string;
    counterpartType: 'manager' | 'peer' | 'direct_report' | 'other';
    counterpartLabel?: string;
  };

  metrics: OneOnOneMetricForLLM[];

  insights: OneOnOneInsightForLLM[];
};

export type OneOnOneLLMOutput = {
  talkingPoints: OneOnOneTalkingPoint[];
  usedInsightIds?: string[];
  usedMetricIds?: string[];
};
