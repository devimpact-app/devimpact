export type GoogleCalendarListItem = {
  id: string;
  summary?: string;
  timeZone?: string;
  accessRole?: 'owner' | 'writer' | 'reader' | 'freeBusyReader' | string;
  primary?: boolean;
};

export type GoogleCalendarListResponse = {
  items?: GoogleCalendarListItem[];
  nextPageToken?: string;
};

export type GoogleEventDateTime = {
  dateTime?: string; // RFC3339
  date?: string; // all-day date
  timeZone?: string;
};

export type GoogleEventAttendee = {
  email?: string;
  responseStatus?:
    | 'needsAction'
    | 'declined'
    | 'tentative'
    | 'accepted'
    | string;
  organizer?: boolean;
  self?: boolean;
};

export type GoogleEventsListItem = {
  id: string;
  status?: string;
  summary?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: GoogleEventAttendee[];
  organizer?: { email?: string; self?: boolean };
};

export type GoogleEventsListResponse = {
  items?: GoogleEventsListItem[];
  nextPageToken?: string;
};
