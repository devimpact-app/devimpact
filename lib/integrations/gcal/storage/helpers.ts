import { GoogleEventAttendee } from '../types';

export function parseGoogleDateTime(dt?: { dateTime?: string; date?: string }) {
  if (!dt) return null;

  // timed event
  if (dt.dateTime) return new Date(dt.dateTime);
  if (dt.date) return new Date(`${dt.date}T00:00:00`);

  return null;
}

function getEmailDomain(email?: string) {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at === -1) return null;
  return email.slice(at + 1).toLowerCase();
}

export type AttendeeInfo = {
  attendeesTotal: number;
  attendeesAccepted: number;
  attendeesDeclined: number;
  attendeesNeedsAction: number;
  attendeesBesidesMe: number;
  attendeesExternal: number;
  selfResponseStatus: string | null;
  isOrganizerSelf: boolean;
  selfEmail: string | null;
};

export function summarizeAttendees(
  attendees?: GoogleEventAttendee[]
): AttendeeInfo {
  let total = 0;
  let accepted = 0;
  let declined = 0;
  let tentative = 0;
  let needsAction = 0;
  let besidesMe = 0;
  let external = 0;

  let selfStatus: string | null = null;
  let isOrganizerSelf = false;
  let selfEmail: string | null = null;
  let otherDomains: string[] = [];

  for (const a of attendees ?? []) {
    total += 1;

    const rs = (a.responseStatus ?? '').toLowerCase();
    if (rs === 'accepted') accepted += 1;
    else if (rs === 'declined') declined += 1;
    else if (rs === 'tentative') tentative += 1;
    else if (rs === 'needsaction') needsAction += 1;

    if (a.self) {
      selfStatus = a.responseStatus ?? null;
      if (!selfEmail) selfEmail = a.email ?? null;
      if (a.organizer) isOrganizerSelf = true;
    } else {
      besidesMe += 1;
      const domain = getEmailDomain(a.email);
      if (domain) {
        otherDomains.push(domain);
      }
    }
  }

  if (selfEmail) {
    const selfEmailDomain = getEmailDomain(selfEmail);
    external = otherDomains.filter((d) => d !== selfEmailDomain).length;
  }

  return {
    attendeesTotal: total,
    attendeesAccepted: accepted,
    attendeesDeclined: declined,
    attendeesNeedsAction: needsAction,
    attendeesBesidesMe: besidesMe,
    attendeesExternal: external,
    selfResponseStatus: total === 0 ? 'accepted' : selfStatus,
    isOrganizerSelf: total === 0 ? true : isOrganizerSelf,
    selfEmail,
  };
}
