import { PrepTalkingPoint } from '@/types/api/prep';
import { MeetingContext } from '../../context';
import {
  ActivityForLLM,
  PrepInsightForLLM,
  PrepMetricForLLM,
} from '../../types';
import { WorkRhythm } from '@/types/api/work-rhythm';

export type OneOnOneLLMContext = {
  meeting: MeetingContext;
  metrics: PrepMetricForLLM[];
  insights: PrepInsightForLLM[];
  activity: ActivityForLLM;
  workRhythm: WorkRhythm['summary'];
  // meetings: unknown;
};
