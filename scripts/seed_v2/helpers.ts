import { startOfWeek } from '@/lib/utils/date';
import { addDays, subWeeks } from 'date-fns';
import { v5 as uuidv5 } from 'uuid';

export type SeedTimeContext = {
  now: Date;
  currentWeekMonday: Date; // Monday 00:00 local time
  startMonday: Date; // oldest Monday (dayIndex 0)
};

export function buildSeedTimeContext(now = new Date()): SeedTimeContext {
  const currentWeekMonday = startOfWeek(now);
  const startMonday = subWeeks(currentWeekMonday, 12); // 84 days back
  return { now, currentWeekMonday, startMonday };
}

export function dateForDayIndex(
  ctx: SeedTimeContext,
  dayIndex: number,
  timeHHmm: string
) {
  const [hh, mm] = timeHHmm.split(':').map((n) => Number(n));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    throw new Error(`Invalid time: "${timeHHmm}"`);
  }

  const d = addDays(ctx.startMonday, dayIndex);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function isWeekendDayIndex(dayIndex: number) {
  // dayIndex 0 is Monday => weekend are 5 (Sat) and 6 (Sun)
  const dow = dayIndex % 7;
  return dow === 5 || dow === 6;
}

export function randInt(rng: () => number, min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

export function randFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

export function deterministicGithubPrId(
  tenantId: string,
  repoFullName: string,
  prNumber: number
) {
  return uuidv5(
    `${tenantId}:github_pr:${repoFullName}#${prNumber}`,
    '065dd064-7c22-4643-abcc-f93d061f37dd'
  );
}

export function deterministicPullRequestId(
  tenantId: string,
  repoFullName: string,
  prNumber: number
) {
  return uuidv5(
    `${tenantId}:pull_request:${repoFullName}#${prNumber}`,
    '5c41ec40-146d-4ab9-b53b-92e7e2ff330c'
  );
}

export function deterministicGithubReviewId(
  tenantId: string,
  repoFullName: string,
  prNumber: number,
  dayIndex: number,
  state: string
) {
  return uuidv5(
    `${tenantId}:review:${repoFullName}#${prNumber}:${dayIndex}:${state}`,
    '9a5ada71-e54c-4140-85e4-5c6e57542989'
  );
}
