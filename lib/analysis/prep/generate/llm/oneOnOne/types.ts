import { MeetingContext } from '../../context';
import {
  ActivityForLLM,
  MeetingRecapForLLM,
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
  meetings: MeetingRecapForLLM;
};
