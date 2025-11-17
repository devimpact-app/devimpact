export type StoryId = "invisible_load.v1" | "collaboration_patterns.v1";
export type StorySeverity = "info" | "notable" | "strong";
export type StoryIntent = "recognition" | "insight" | "suggestion";

export type StoryContext = {
  tenantId: string;
  start: Date;
  end: Date;
};
export type StoryGenerator = (ctx: StoryContext) => Promise<StoryCard | null>;

export type StoryCard = {
  id: StoryId;
  tenantId: string;
  period: { start: Date; end: Date };
  title: string;
  summary: string;
  severity: StorySeverity;
  intent: StoryIntent;
  kpis: Array<{ label: string; value: number | string; unit?: string }>;
  evidence: Array<{ metricId: string; value: number; label?: string }>;
  links?: Array<{ label: string; href: string }>;
  generatedAt: Date;
  suggestions?: string[];
};
