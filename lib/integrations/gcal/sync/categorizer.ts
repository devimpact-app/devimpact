import { AttendeeInfo } from '../storage/helpers';

const OOO_PHRASES = [
  'out of office',
  'ooo',
  'pto',
  'vacation',
  'holiday',
  'sick',
  'sick day',
  'leave',
  'parental',
  'bereavement',
];

const FOCUS_PHRASES = [
  'focus',
  'deep work',
  'maker time',
  'no meeting',
  'no meetings',
  'heads down',
  'coding block',
];

const INTERVIEW_PHRASES = [
  'interview',
  'screen',
  'onsite',
  'on site',
  'debrief',
  'recruiting',
  'candidate',
  'loop',
];

const INCIDENT_PHRASES = [
  'incident',
  'sev',
  'sev0',
  'sev1',
  'sev2',
  'outage',
  'postmortem',
  'post mortem',
  'rca',
  'root cause',
  'pager',
  'page',
  'oncall',
  'on call',
];

const TEAM_PHRASES = [
  'standup',
  'daily',
  'sync',
  'weekly',
  'sprint',
  'planning',
  'retro',
  'retrospective',
  'grooming',
  'refinement',
  'backlog',
  'kickoff',
  'demo',
  'review',
];

const ORG_PHRASES = [
  'all hands',
  'all-hands',
  'town hall',
  'townhall',
  'company update',
  'org update',
  'qbr',
  'okr',
  'kickoff',
];

export type CalendarEventCategory =
  | 'personal'
  | 'ooo'
  | 'focus'
  | 'oneOnOne'
  | 'team'
  | 'org'
  | 'interview'
  | 'incident'
  | 'other';

export type TeamMeetingSubtype =
  | 'standup'
  | 'planning'
  | 'retro'
  | 'grooming'
  | 'demo'
  | 'designReview'
  | 'architecture'
  | 'status'
  | 'other';

const TEAM_SUBTYPE_PHRASES = {
  standup: ['standup', 'daily standup', 'daily sync', 'daily scrum'],
  planning: ['sprint planning', 'iteration planning', 'planning'],
  retro: ['retro', 'retrospective', 'post retro'],
  grooming: [
    'grooming',
    'backlog grooming',
    'refinement',
    'backlog refinement',
  ],
  demo: ['demo', 'demos', 'show and tell', 'show tell'],
  designReview: [
    'design review',
    'ux review',
    'ui review',
    'wireframe review',
    'spec review',
    'figma',
    'prototype',
    'handoff',
  ],
  architecture: [
    'arch review',
    'architecture review',
    'tech spec',
    'rfc',
    'adr',
  ],
  status: ['weekly sync', 'team sync', 'check in', 'check-in', 'weekly update'],
};

type EventFeatures = {
  title?: string;
  eventType?: string;
  isAllDay: boolean;
  durationMinutes: number | null;
  isRecurring: boolean;
  attendeeInfo: AttendeeInfo;
};

type ExtractedEventFeatures = EventFeatures & {
  titleNorm: string;
  titleTokens: Set<string>;
  keywords: {
    ooo: boolean;
    focus: boolean;
    interview: boolean;
    incident: boolean;
    oneOnOneHint: boolean;
    teamMeetingHint: boolean;
    orgWideHint: boolean;

    // Team subtypes
    standup: boolean;
    planning: boolean;
    retro: boolean;
    grooming: boolean;
    demo: boolean;
    designReview: boolean;
    architecture: boolean;
    status: boolean;
  };
};

function normalizeTitleToWords(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string) {
  return new Set(s.split(' ').filter(Boolean));
}

function hasAnyToken(tokens: Set<string>, candidates: string[]) {
  for (const c of candidates) {
    if (tokens.has(c)) return true;
  }
  return false;
}

function hasAnyPhrase(titleNorm: string, phrases: string[]) {
  for (const p of phrases) {
    if (titleNorm.includes(p)) return true;
  }
  return false;
}

function extractAdditionalFeatures(
  event: EventFeatures
): ExtractedEventFeatures {
  const titleRaw = (event.title ?? '').trim();
  const titleRawLower = titleRaw.toLowerCase();

  const titleNorm = normalizeTitleToWords(titleRaw);
  const titleTokens = tokenize(titleNorm);

  const oneOnOneRegex = /\b1\s*[:\-]?\s*1\b/i; // matches 1:1, 1-1, 1 1
  const hasAngleHint = titleRawLower.includes('<>'); // “Ian <> Jenna”
  const hasVsHint = /\b(and)\.?\b/i.test(titleRawLower); // “Ian and Jenna”
  const hasOneOnOnePhrase = hasAnyPhrase(titleNorm, ['one on one', '1 1']);

  const oneOnOneHint =
    oneOnOneRegex.test(titleRaw) ||
    hasAngleHint ||
    hasVsHint ||
    hasOneOnOnePhrase ||
    (titleRaw.includes('/') && titleRaw.length <= 40);

  const ooo = hasAnyPhrase(titleNorm, OOO_PHRASES);

  const focus =
    hasAnyPhrase(titleNorm, FOCUS_PHRASES) ||
    hasAnyToken(titleTokens, ['focus', 'deep', 'maker', 'heads', 'coding']);

  const interview =
    hasAnyPhrase(titleNorm, INTERVIEW_PHRASES) ||
    hasAnyToken(titleTokens, [
      'interview',
      'screen',
      'candidate',
      'recruiting',
      'debrief',
    ]);

  const incident =
    hasAnyPhrase(titleNorm, INCIDENT_PHRASES) ||
    hasAnyToken(titleTokens, [
      'incident',
      'sev',
      'outage',
      'postmortem',
      'rca',
      'oncall',
    ]);

  const teamMeetingHint =
    hasAnyPhrase(titleNorm, TEAM_PHRASES) ||
    hasAnyToken(titleTokens, [
      'standup',
      'sprint',
      'retro',
      'planning',
      'refinement',
      'backlog',
    ]);

  const orgWideHint =
    hasAnyPhrase(titleNorm, ORG_PHRASES) ||
    hasAnyToken(titleTokens, ['qbr', 'okr', 'allhands', 'townhall']);

  return {
    ...event,
    titleNorm,
    titleTokens,
    keywords: {
      ooo,
      focus,
      interview,
      incident,
      oneOnOneHint,
      teamMeetingHint,
      orgWideHint,

      // Team subtypes
      standup: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.standup),
      planning: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.planning),
      retro: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.retro),
      grooming: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.grooming),
      demo: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.demo),
      designReview: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.designReview),
      architecture: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.architecture),
      status: hasAnyPhrase(titleNorm, TEAM_SUBTYPE_PHRASES.status),
    },
  };
}

function pickTeamSubtype(
  f: ExtractedEventFeatures
): TeamMeetingSubtype | undefined {
  const k = f.keywords;

  if (k.designReview) return 'designReview';
  if (k.architecture) return 'architecture';
  if (k.planning) return 'planning';
  if (k.retro) return 'retro';
  if (k.grooming) return 'grooming';
  if (k.standup) return 'standup';
  if (k.demo) return 'demo';
  if (k.status) return 'status';

  return undefined;
}

function normEventType(s?: string) {
  return (s ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

function isOutOfOfficeEventType(eventType?: string) {
  const t = normEventType(eventType);
  return t === 'outofoffice' || t.includes('outofoffice');
}

function clamp01(x: number) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function categorizeEvent(event: EventFeatures): {
  category: CalendarEventCategory;
  // categorySubtype?: TeamMeetingSubtype | null;
  categoryConfidence: number;
  categorySource: string;
  categoryVersion: number;
} {
  const f = extractAdditionalFeatures(event);
  const a = f.attendeeInfo;
  const total = a.attendeesTotal;
  const besidesMe = a.attendeesBesidesMe;
  const external = a.attendeesExternal;

  if (isOutOfOfficeEventType(f.eventType) || f.keywords.ooo) {
    return {
      category: 'ooo',
      categoryConfidence: isOutOfOfficeEventType(f.eventType) ? 0.97 : 0.9,
      categorySource: 'heuristic',
      categoryVersion: 1,
    };
  }

  if (besidesMe === 0 && f.keywords.focus) {
    return {
      category: 'focus',
      categoryConfidence: 0.9,
      categorySource: 'heuristic',
      categoryVersion: 1,
    };
  }

  if (besidesMe === 0) {
    // Other personal/private
    return {
      category: 'personal',
      categoryConfidence: 0.9,
      categorySource: 'heuristic',
      categoryVersion: 1,
    };
  }

  // All other meetings with multiple attendees
  let scoreInterview = 0;
  let scoreIncident = 0;
  let scoreOneOnOne = 0;
  let scoreTeam = 0;
  let scoreOrg = 0;

  // Interview
  if (f.keywords.interview) scoreInterview += 0.7;
  if (external >= 1) scoreInterview += 0.25;
  if (total >= 3) scoreInterview += 0.05; // Often interviewer, HR organizer, and interviewee

  // Incident
  if (f.keywords.incident) scoreIncident += 0.8;
  if (f.isRecurring) scoreIncident -= 0.1; // incidents usually not recurring

  // 1:1
  if (besidesMe === 1) scoreOneOnOne += 0.55;
  if (f.keywords.oneOnOneHint) scoreOneOnOne += 0.35;
  if (f.isRecurring) scoreOneOnOne += 0.05;
  if (external >= 1) scoreOneOnOne -= 0.1;

  if (f.keywords.teamMeetingHint) scoreTeam += 0.45;
  if (total >= 4 && total <= 12) scoreTeam += 0.35;
  if (f.isRecurring) scoreTeam += 0.1;
  if (f.durationMinutes && f.durationMinutes <= 30) scoreTeam += 0.05;

  if (f.keywords.orgWideHint) scoreOrg += 0.55;
  if (total >= 20) scoreOrg += 0.45;
  else if (total >= 13) scoreOrg += 0.25;
  if (f.isAllDay) scoreOrg -= 0.1;

  // Pick best score
  const candidates = [
    ['interview', scoreInterview],
    ['incident', scoreIncident],
    ['oneOnOne', scoreOneOnOne],
    ['org', scoreOrg],
    ['team', scoreTeam],
  ].sort((a, b) => (b[1] as number) - (a[1] as number)) as Array<
    [CalendarEventCategory, number]
  >;

  const [bestCat, bestScore] = candidates[0];

  if (bestScore < 0.5) {
    return {
      category: 'other',
      categoryConfidence: clamp01(0.4 + bestScore * 0.2),
      categorySource: 'heuristic',
      categoryVersion: 1,
    };
  }

  let subtype = null;
  if (bestCat === 'team') {
    subtype = pickTeamSubtype(f);
  }

  return {
    category: bestCat,
    // categorySubtype: subtype,
    categoryConfidence: clamp01(0.55 + bestScore * 0.4), // maps ~0.5–1.0 scores to ~0.75–0.95
    categorySource: 'heuristic',
    categoryVersion: 1,
  };
}
