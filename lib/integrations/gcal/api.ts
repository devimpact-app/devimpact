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

// TODO: incremental sync with sync token
// TODO: also bounded fetch for upcoming horizon with no sync token

export async function listEvents(
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
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`
    );

    url.searchParams.set('timeMin', opts.timeMinISO);
    url.searchParams.set('timeMax', opts.timeMaxISO);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', String(opts.pageSize ?? 250));
    url.searchParams.set('showDeleted', 'false');

    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const resp = await googleFetch<GoogleEventsListResponse>(
      accessToken,
      url.toString()
    );

    if (resp.items?.length) {
      all.push(...resp.items);
      if (all.length >= MAX_EVENTS) break;
    }
    if (!resp.nextPageToken) break;

    pageToken = resp.nextPageToken;
  }

  return { items: all, truncated: all.length >= MAX_EVENTS };
}
