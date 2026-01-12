import { ThreadCategory } from '@/types/api/threads';

export type WeeklySummaryEventPreview = {
  id: string;
  kind: 'pr' | 'review' | 'meeting' | 'ooo';
  occurredAt: string;
  endAt?: string | null;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  repoFullName?: string | null;
  prNumber?: number | null;
  metadataHint?: {
    pr?: {
      linesChanged?: number;
      filesChanged?: number;
      touchedTests?: boolean;
    };
    review?: {
      decision?: 'approved' | 'changes_requested' | 'commented';
      commentsCount?: number;
      wasDirectlyRequested?: boolean;
      isBlocking?: boolean;
    };
    meeting?: {
      durationMinutes?: number;
      isRecurring?: boolean;
      category?: string;
      subtype?: string;
    };
    ooo?: {
      isAllDay?: boolean;
      durationMinutes?: number;
    };
  };
};

export type WeeklySummaryThreadInput = {
  id: string;
  categoryKey: ThreadCategory;
  title: string;
  headline: string;
  bullets: Array<{
    id: string;
    sortIndex: number;
    text: string;
    editable: boolean;
  }>;
  weekStats: {
    eventCount: number;
    countsByKind: { pr: number; review: number; meeting: number; ooo: number };
  };
  weekEvents: WeeklySummaryEventPreview[];
};

export type WeeklySummaryLLMInput = {
  week: {
    timezone: string;
    weekStartLocalDate: string; // YYYY-MM-DD (Monday)
    rangeStartUtc: string;
    rangeEndUtc: string;
  };
  atAGlance?: {
    totalEvents: number;
    countsByKind: { pr: number; review: number; meeting: number; ooo: number };
    activeThreads: number;
  };
  threads: WeeklySummaryThreadInput[];
  notableUnthreadedEvents: WeeklySummaryEventPreview[];
  allowedWeekEventIds: string[];
};

export type WeeklySummaryOutput = {
  headline: string;
  bullets: {
    text: string;
    referencedThreadIds?: string[];
    referencedEventIds?: string[];
  }[];
  confidence?: number;
};
