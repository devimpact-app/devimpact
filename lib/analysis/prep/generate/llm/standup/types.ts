import { WorkRhythm } from '@/types/api/work-rhythm';
import { MeetingContext } from '../../context';
import { HighlightedReview, ShippedItem } from '@/types/api/weekly-activity';
import { MeetingRecapForLLM } from '../../types';
import { OOORecapForLLM } from '../../fetchers/ooo';

export type StandupLLMContext = {
  meeting: MeetingContext;
  work: {
    recentShipped: ShippedItem[];
    recentReviews: HighlightedReview[];
    inFlightPrs: ShippedItem[];
    reviewQueue: ShippedItem[];
  };
  calendar: {
    recentMeetings: MeetingRecapForLLM;
    upcomingMeetings: MeetingRecapForLLM;
    upcomingOOO: OOORecapForLLM;
  };
  workRhythm: WorkRhythm['summary'];
};
