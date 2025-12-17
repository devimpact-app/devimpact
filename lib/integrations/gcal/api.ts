import { getGoogleCalendarAccessToken } from './client';
import {
  GoogleCalendarListItem,
  GoogleCalendarListResponse,
  GoogleEventsListItem,
  GoogleEventsListResponse,
} from './types';

async function googleFetch<T>(accessToken: string, url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google API failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}

export async function listCalendarsWithToken(accessToken: string) {
  const all: GoogleCalendarListItem[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 20; i++) {
    const url = new URL(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList'
    );
    url.searchParams.set('maxResults', '250');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const resp = await googleFetch<GoogleCalendarListResponse>(
      accessToken,
      url.toString()
    );

    if (resp.items?.length) all.push(...resp.items);
    if (!resp.nextPageToken) break;

    pageToken = resp.nextPageToken;
  }

  return all;
}

export async function listCalendars(userId: string) {
  const accessToken = await getGoogleCalendarAccessToken(userId);
  if (!accessToken) return null;
  return listCalendarsWithToken(accessToken);
}

const MAX_PAGES = 20;
const MAX_EVENTS = 10_000;

type ListEventsParams = {
  calendarId: string;
  pageSize?: number;
  pageToken?: string;
  // windowed
  timeMinISO?: string;
  timeMaxISO?: string;
  // behavior
  singleEvents?: boolean;
  showDeleted?: boolean;
  orderBy?: 'startTime' | undefined;
};

async function listEventsPaged(
  accessToken: string,
  params: ListEventsParams
): Promise<GoogleEventsListResponse> {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      params.calendarId
    )}/events`
  );

  if (params.timeMinISO) url.searchParams.set('timeMin', params.timeMinISO);
  if (params.timeMaxISO) url.searchParams.set('timeMax', params.timeMaxISO);

  url.searchParams.set('singleEvents', String(params.singleEvents ?? true));
  url.searchParams.set('showDeleted', String(params.showDeleted ?? false));
  url.searchParams.set('maxResults', String(params.pageSize ?? 250));

  if (params.orderBy) url.searchParams.set('orderBy', params.orderBy);

  if (params.pageToken) url.searchParams.set('pageToken', params.pageToken);

  return googleFetch<GoogleEventsListResponse>(accessToken, url.toString());
}

export async function listEventsWindow(
  userId: string,
  calendarId: string,
  opts: {
    timeMinISO: string;
    timeMaxISO: string;
    pageSize?: number;
  }
) {
  const accessToken = await getGoogleCalendarAccessToken(userId);
  if (!accessToken) return null;

  const all: GoogleEventsListItem[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < MAX_PAGES; i++) {
    const resp = await listEventsPaged(accessToken, {
      calendarId,
      timeMinISO: opts.timeMinISO,
      timeMaxISO: opts.timeMaxISO,
      pageSize: opts.pageSize,
      pageToken,
      singleEvents: true,
      showDeleted: false,
      orderBy: 'startTime',
    });

    if (resp.items?.length) {
      all.push(...resp.items);
      if (all.length >= MAX_EVENTS) break;
    }
    if (!resp.nextPageToken) {
      return {
        items: all,
        truncated: all.length >= MAX_EVENTS,
      };
    }

    pageToken = resp.nextPageToken;
  }

  return {
    items: all,
    truncated: true,
  };
}
