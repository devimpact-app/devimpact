import { REVIEW_TAG_VOCAB } from '../../pull-requests/service/llm/types';

export const MAX_HOURS_CUTOFF = 24 * 14; // clamp at 14 days

export type TimeOfDayBucket =
  | 'early_morning'
  | 'morning'
  | 'afternoon'
  | 'evening';

export function getTimeOfDayBucket(hour: number): TimeOfDayBucket {
  if (hour < 8) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function formatTimeOfDayLabel(bucket: TimeOfDayBucket): string {
  switch (bucket) {
    case 'early_morning':
      return 'early mornings (before 8am)';
    case 'morning':
      return 'mornings';
    case 'afternoon':
      return 'afternoons';
    case 'evening':
      return 'evenings';
  }
}

export function formatWeekdayLabel(idx: number): string {
  // JS getDay: 0=Sun..6=Sat
  const labels = [
    'Sundays',
    'Mondays',
    'Tuesdays',
    'Wednesdays',
    'Thursdays',
    'Fridays',
    'Saturdays',
  ] as const;
  return labels[idx] ?? 'those days';
}

export type DayBucket =
  | 'early_week' // Mon–Tue
  | 'mid_week' // Wed–Thu
  | 'late_week' // Fri
  | 'weekend'; // Sat–Sun

export function formatDayBucketLabel(bucket: DayBucket): string {
  switch (bucket) {
    case 'early_week':
      return 'Mondays and Tuesdays';
    case 'mid_week':
      return 'mid-week (Wed–Thu)';
    case 'late_week':
      return 'Fridays';
    case 'weekend':
      return 'weekends';
  }
}

export function getDayBucket(localWeekdayIndex: number): DayBucket {
  if (localWeekdayIndex === 5 || localWeekdayIndex === 6) return 'weekend';
  if (localWeekdayIndex === 0 || localWeekdayIndex === 1) return 'early_week';
  if (localWeekdayIndex === 2 || localWeekdayIndex === 3) return 'mid_week';
  return 'late_week'; // Friday
}

export type SizeBucket = 'tiny' | 'small' | 'medium' | 'large';

export function getSizeBucket(
  linesChanged: number | null | undefined,
  filesChanged: number | null | undefined
): SizeBucket {
  const lines = linesChanged ?? 0;
  const files = filesChanged ?? 0;

  if (lines <= 50 && files <= 2) return 'tiny';
  if (lines <= 250 && files <= 6) return 'small';
  if (lines <= 800 && files <= 15) return 'medium';
  return 'large';
}

export function formatSizeLabel(bucket: SizeBucket): string {
  switch (bucket) {
    case 'tiny':
      return 'very small PRs';
    case 'small':
      return 'small PRs';
    case 'medium':
      return 'medium-sized PRs';
    case 'large':
      return 'larger PRs';
  }
}

export type ReviewTag = (typeof REVIEW_TAG_VOCAB)[number];

export const REVIEW_TAG_LABELS: Record<ReviewTag, string> = {
  readability_or_clarity: 'readability & clarity',
  architecture_or_design: 'architecture & design',
  logic_or_correctness: 'logic & correctness',
  testing_requirements: 'tests & coverage',
  oversized_or_scope: 'scope & size',
  style_nits: 'style & polish',
};

export const REVIEW_TAG_DESCRIPTION: Record<ReviewTag, string> = {
  readability_or_clarity:
    'Comments tend to focus on making code and naming easier to follow.',
  architecture_or_design:
    'Reviewers are often asking for structural or design changes rather than small tweaks.',
  logic_or_correctness:
    'Feedback is frequently about edge cases, correctness, or behavior mismatches.',
  testing_requirements:
    'Reviewers are asking for more or better tests before they’re comfortable approving.',
  oversized_or_scope:
    'PRs are being flagged as too large or trying to tackle too many concerns at once.',
  style_nits:
    'Most of the friction is around stylistic preferences and small consistency fixes.',
};
