import { ShippedItem } from '@/types/api/weekly-activity';
import { MeetingContext } from '../../context';
import {
  ActivityForLLM,
  MeetingRecapForLLM,
  PrepMetricForLLM,
  PrepSignalForLLM,
} from '../../types';
import { WorkRhythm } from '@/types/api/work-rhythm';

export type OneOnOneLLMContext = {
  meeting: MeetingContext;
  metrics: PrepMetricForLLM[];
  signals: PrepSignalForLLM[];
  activity: ActivityForLLM;
  workRhythm: WorkRhythm['summary'];
  meetings: MeetingRecapForLLM;
  inFlightPrs: ShippedItem[];
};
