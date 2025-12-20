import { TeamMeetingSubtype } from '@/lib/integrations/gcal/sync/categorizer';
import { InsightKind } from '@/types/api/insights';
import { PrepTalkingPoint } from '@/types/api/prep';
import {
  CalendarEventCategory,
  HighlightedReview,
  ShippedItem,
} from '@/types/api/weekly-summary';

export type MetricWindowKind = 'short' | 'medium';

export type ActivityForLLM = {
  highlightPrs: ShippedItem[];
  highlightedReviews: HighlightedReview[];
  tags: PrepTagForLLM[];
};

export interface PrepMetricStatForLLM {
  currentValue: number | null;
  currentDisplay: string; // "6 PRs", "2.1h", "—"

  previousValue: number | null;
  previousDisplay: string | null; // "4 PRs" or null if no previous

  deltaPct: number | null; // +0.5 => +50%, -0.2 => -20%
  deltaLabel: string | null; // "+50% vs previous period", etc.
}

export interface PrepMetricTimeseriesPointForLLM {
  bucketLabel: string; // "Week of 11/03"
  status: 'complete' | 'partial'; // current in-progress week = "partial"
  rawValue: number | null; // numeric for logic if needed
  displayValue: string; // already formatted with units
}

export interface PrepMetricWindowForLLM {
  kind: MetricWindowKind; // 'short' | 'medium'
  startISO: string; // for reference only
  endISO: string;

  stat?: PrepMetricStatForLLM;
  timeseries?: PrepMetricTimeseriesPointForLLM[];
}

export interface PrepMetricForLLM {
  metricId: string; // e.g. 'pr.authored_merged_count.v1'
  label: string; // "PRs merged"
  description?: string; // optional helper text
  unitLabel?: string; // "PRs", "hours", "%"

  windows: PrepMetricWindowForLLM[]; // usually 2 items: short + medium
}

export interface MeetingRecapForLLM {
  recap: {
    meetingCount: number;
    meetingMinutes: number;
    topCategories: {
      category: CalendarEventCategory;
      minutes: number;
    }[];
  };
  items: CalendarEventForLLM[];
}

export type PrepInsightWindowKind = 'short' | 'medium';

export interface PrepInsightForLLM {
  id: string;
  kind: InsightKind;
  severity: 'info' | 'positive' | 'warning' | 'critical';
  score: number; // 0–100

  window: PrepInsightWindowKind; // 'short' or 'medium'

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

export interface PrepTagForLLM {
  tag: string;
  count: number;
}

export interface CalendarEventForLLM {
  id: string;
  startAt: string;
  endAt: string | null;
  durationMinutes: number | null;
  isAllDay: boolean;
  title: string | null;
  category: CalendarEventCategory;
  subtype: TeamMeetingSubtype;
  attendeesTotal: number | null;
  selfResponseStatus: string | null;
}

export type PrepLLMOutput = {
  talkingPoints: PrepTalkingPoint[];
};
