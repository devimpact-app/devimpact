export type PRSummary = {
  short_summary: string;
  impact_area: string;
  skills_involved: string[];
  complexity_score: 1 | 2 | 3 | 4 | 5;
};
