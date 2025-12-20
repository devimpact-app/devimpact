import { WorkRhythm } from '@/types/api/work-rhythm';
import { MeetingContext } from '../../context';
import { HighlightedReview, ShippedItem } from '@/types/api/weekly-summary';
import { MeetingRecapForLLM } from '../../types';

export type StandupLLMContext = {
  meeting: MeetingContext;
  work: {
    recentShipped: ShippedItem[];
    recentReviews: HighlightedReview[];
    // TODO
    inFlightPrs: [];
    reviewQueue: [];
  };
  calendar: {
    recentMeetings: MeetingRecapForLLM;
    upcomingMeetings: MeetingRecapForLLM;
    // TODO:
    upcomingOOO: [];
  };
  workRhythm: WorkRhythm['summary'];
};
