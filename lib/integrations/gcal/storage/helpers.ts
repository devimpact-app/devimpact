import { GoogleEventAttendee } from '../types';

export function parseGoogleDateTime(dt?: { dateTime?: string; date?: string }) {
  if (!dt) return null;

  // timed event
  if (dt.dateTime) return new Date(dt.dateTime);
  if (dt.date) return new Date(`${dt.date}T00:00:00`);

  return null;
}

export function summarizeAttendees(attendees?: GoogleEventAttendee[]) {
  let total = 0;
  let accepted = 0;
  let declined = 0;
  let tentative = 0;
  let needsAction = 0;

  let selfStatus: string | null = null;
  let isOrganizerSelf = false;

  for (const a of attendees ?? []) {
    total += 1;

    const rs = (a.responseStatus ?? '').toLowerCase();
    if (rs === 'accepted') accepted += 1;
    else if (rs === 'declined') declined += 1;
    else if (rs === 'tentative') tentative += 1;
    else if (rs === 'needsaction') needsAction += 1;

    if (a.self) {
      selfStatus = a.responseStatus ?? null;
      if (a.organizer) isOrganizerSelf = true;
    }
  }

  return {
    attendeesTotal: total,
    attendeesAccepted: accepted,
    attendeesDeclined: declined,
    attendeesNeedsAction: needsAction,
    selfResponseStatus: selfStatus,
    isOrganizerSelf,
  };
}

// TODO: make this better
export function redactTitle(summary?: string | null) {
  if (!summary) return null;
  const s = summary.trim();
  if (!s) return null;

  return s
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\s+/g, ' ')
    .slice(0, 140);
}
