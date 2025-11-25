import type { Insight } from '@/types/api/insights';
import type {
  PullRequest,
  Review,
  PrSummary,
} from '@/lib/db/schema/github-normalized';

export type InsightContext = {
  userId: string;
  windowStart: Date;
  windowEnd: Date;

  prs: PullRequest[];
  reviews: Review[];
  prSummariesByPrId: Map<string, PrSummary>;

  // room for precomputed aggregates later (latency histograms, etc.)
  // latencyByHour?: Map<number, number>;
  // themesByTag?: Map<string, number>;
};

export type InsightGenerator = (ctx: InsightContext) => Insight | null;
