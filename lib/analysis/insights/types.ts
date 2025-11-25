import type { Insight } from '@/types/api/insights';
import type {
  PullRequest,
  Review,
  PrSummary,
} from '@/lib/db/schema/github-normalized';

export type InsightDraft = Omit<Insight, 'score'>;

export type InsightContext = {
  userId: string;
  timezone: string;
  windowStart: Date;
  windowEnd: Date;

  authoredPrs: PullRequest[];
  reviews: Review[];
  prSummariesByPrId: Map<string, PrSummary>;

  // room for precomputed aggregates later (latency histograms, etc.)
  // latencyByHour?: Map<number, number>;
  // themesByTag?: Map<string, number>;
};

export type InsightGenerator = (ctx: InsightContext) => Insight | null;
