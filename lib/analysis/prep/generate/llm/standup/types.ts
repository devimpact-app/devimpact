import { WorkRhythm } from '@/types/api/work-rhythm';
import { MeetingContext } from '../../context';
import { HighlightedReview, ShippedItem } from '@/types/api/weekly-summary';

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
    // TODO:
    recentMeetings: [];
    upcomingMeetings: [];
    upcomingOOO: [];
  };
  workRhythm: WorkRhythm['summary'];
};
