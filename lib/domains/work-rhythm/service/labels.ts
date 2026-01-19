import type { TimeBandKey } from '@/types/api/work-rhythm';

export const WORKDAY_START_HOUR = 8;
export const WORKDAY_END_HOUR = 18; // exclusive

export const TIME_BAND_LABELS: Record<TimeBandKey, string> = {
  early: '5–8am',
  morning: '8-11am',
  midday: '11am–2pm',
  afternoon: '2pm-6pm',
  eve: '6pm–5am',
};

export const TIME_BAND_LABELS_SIMPLE: Record<TimeBandKey, string> = {
  early: '5–8am',
  morning: '8-11am',
  midday: '11am–2pm',
  afternoon: '2pm-6pm',
  eve: 'evening',
};
