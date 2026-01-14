import { formatDateOnly } from '@/lib/utils/date';
import { ThreadCategory } from '@/types/api/threads';

export function categoryLabel(key: ThreadCategory) {
  switch (key) {
    case 'features':
      return 'Features';
    case 'bugs_incidents':
      return 'Bugs / Incidents';
    case 'tech_debt':
      return 'Tech Debt';
    case 'collaboration':
      return 'Collaboration';
    case 'alignment':
      return 'Alignment';
    case 'skill_growth':
      return 'Skill Growth';
    case 'hiring':
      return 'Hiring';
    default:
      return 'Thread';
  }
}

export const THREAD_CATEGORY_KEYS: ThreadCategory[] = [
  'features',
  'tech_debt',
  'collaboration',
  'bugs_incidents',
  'alignment',
  'skill_growth',
  'hiring',
] as const;

export const THREAD_CATEGORY_OPTIONS = THREAD_CATEGORY_KEYS.map((key) => ({
  value: key,
  label: categoryLabel(key),
}));

export function categoryPillClasses(key: ThreadCategory) {
  switch (key) {
    case 'features':
      return 'border-indigo-400/30 bg-indigo-400/10 text-indigo-300';

    case 'bugs_incidents':
      return 'border-rose-400/30 bg-rose-400/10 text-rose-300';

    case 'tech_debt':
      return 'border-violet-400/25 bg-violet-400/10 text-violet-300';

    case 'collaboration':
      return 'border-teal-400/25 bg-teal-400/10 text-teal-300';

    case 'alignment':
      return 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300';

    case 'skill_growth':
      return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300';

    case 'hiring':
      return 'border-purple-400/25 bg-purple-400/10 text-purple-300';

    default:
      return 'border-white/15 bg-white/5 text-white/75';
  }
}

export function threadRangeLabel(
  firstActivityAt: string | null,
  lastActivityAt: string | null
) {
  const first = formatDateOnly(firstActivityAt);
  const last = formatDateOnly(lastActivityAt);
  const range =
    first && last ? `${first} → ${last}` : first ? `Since ${first}` : null;
  return range;
}
