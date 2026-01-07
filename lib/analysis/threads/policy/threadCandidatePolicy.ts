import { ActivityEvent } from '@/lib/db/schema/activity';

export type CandidateDecision = {
  eligible: boolean;
  score: number;
  reasons: string[];
};

export function evaluateThreadCandidate(e: ActivityEvent): CandidateDecision {
  const reasons: string[] = [];

  // PR merges always included as eligible
  if (e.eventType === 'pr_merged') {
    const m = e.metadata?.kind === 'pr' ? e.metadata : null;

    let score = 0.85;
    reasons.push('merged_pr');

    if (m) {
      if (m.size.linesChanged >= 400) {
        reasons.push('large_change');
        score += 0.08;
      }
      if (m.size.filesChanged >= 15) {
        reasons.push('many_files');
        score += 0.05;
      }
      if (m.shape.touchedTests) {
        reasons.push('touched_tests');
        score += 0.03;
      }
      if ((m.process?.reviewRounds ?? 0) >= 3) {
        reasons.push('multi_round_review');
        score += 0.03;
      }
    } else {
      reasons.push('missing_pr_metadata');
      score -= 0.1;
    }

    return {
      eligible: true,
      score: clamp01(score),
      reasons,
    };
  }

  // Reviews only included if important
  if (e.eventType === 'review_submitted') {
    const m = e.metadata?.kind === 'review' ? e.metadata : null;
    if (!m) {
      return {
        eligible: false,
        score: 0,
        reasons: ['missing_review_metadata'],
      };
    }

    let score = 0;

    // Approvals / change requests are almost always narrative-worthy
    if (m.decision === 'approved' || m.decision === 'changes_requested') {
      reasons.push(`review_${m.decision}`);
      score = 0.65;

      if (m.role.isBlocking) {
        reasons.push('blocking_review');
        score += 0.05;
      }
      if (m.role.wasFirstReview) {
        reasons.push('first_responder');
        score += 0.04;
      }
      if (m.role.wasDirectlyRequested) {
        reasons.push('directly_requested');
        score += 0.03;
      }
    } else {
      // Comment-only: gate on meaningfulness
      const c = m.depth?.commentsCount ?? 0;

      if (c >= 2) {
        reasons.push(`commented_${c}_comments`);
        score = 0.55;
      }

      if (m.role.wasDirectlyRequested) {
        reasons.push('directly_requested');
        score = Math.max(score, 0.55);
      }

      if (m.role.wasFirstReview) {
        reasons.push('first_responder');
        score = Math.max(score, 0.55);
      }

      if (m.role.isBlocking) {
        reasons.push('blocking_review');
        score = Math.max(score, 0.58);
      }
    }

    return {
      eligible: score >= 0.55,
      score: clamp01(score),
      reasons,
    };
  }

  // OOO not included in threads for now
  if (e.eventType === 'ooo') {
    return {
      eligible: false,
      score: 0,
      reasons: ['ooo_context_only_v1'],
    };
  }

  // Only include imporatnt meetings
  if (e.eventType === 'meeting_attended') {
    const m = e.metadata?.kind === 'meeting' ? e.metadata : null;
    if (!m) {
      return {
        eligible: false,
        score: 0,
        reasons: ['missing_meeting_metadata'],
      };
    }

    const response = m.participation.selfResponseStatus;
    const isAllDay = m.structure.isAllDay;
    const mins = m.structure.durationMinutes ?? 0;
    const isRecurring = m.structure.isRecurring;
    const category = (m.classification?.category ?? '').toLowerCase().trim();
    const subtype = (m.classification?.categorySubtype ?? '')
      .toLowerCase()
      .trim();
    const conf = m.classification?.categoryConfidence ?? null;
    const organizerSelf = m.participation.isOrganizerSelf;

    if (response === 'declined') {
      return { eligible: false, score: 0, reasons: ['declined_meeting'] };
    }
    if (response === 'tentative') {
      // only allow if obviously high signal
      if (category === 'incident' || category === 'interview') {
        reasons.push('tentative_but_high_signal');
      } else {
        return {
          eligible: false,
          score: 0.1,
          reasons: ['tentative_meeting'],
        };
      }
    }
    if (response === 'needsAction') reasons.push('no_rsvp');

    if (isAllDay) {
      if (category === 'incident' || category === 'interview') {
        reasons.push('all_day_high_signal');
        return {
          eligible: true,
          score: 0.7,
          reasons,
        };
      }

      return {
        eligible: false,
        score: 0,
        reasons: ['all_day_meeting_skipped_v1'],
      };
    }

    const isRoutineTeamSubtype =
      subtype === 'standup' ||
      subtype === 'retro' ||
      subtype === 'planning' ||
      subtype === 'grooming' ||
      subtype === 'status';

    if (isRoutineTeamSubtype) {
      return {
        eligible: false,
        score: 0,
        reasons: [`routine_team_meeting:${subtype}`],
      };
    }

    if (category === 'incident' || category === 'interview') {
      reasons.push(`high_signal_category:${category}`);
      return {
        eligible: true,
        score: clamp01((conf ?? 0.7) >= 0.8 ? 0.75 : 0.7),
        reasons,
      };
    }

    // Architecture/design review: candidates when non-trivial (duration) or ownership proxy
    if (subtype === 'architecture' || subtype === 'designreview') {
      reasons.push(`high_signal_subtype:${subtype}`);

      let score = 0.62;
      if (mins >= 45) {
        reasons.push('long_meeting');
        score += 0.05;
      }
      if (organizerSelf) {
        reasons.push('organizer_self');
        score += 0.05;
      }
      if (conf != null && conf >= 0.8) {
        reasons.push('high_confidence_classification');
        score += 0.03;
      }

      return {
        eligible: score >= 0.65,
        score: clamp01(score),
        reasons,
      };
    }

    // Include demo if we are organizer, not recurring, etc
    if (subtype === 'demo') {
      const isOrgish = category === 'org' || category === 'external';
      const oneOffAndLong = !isRecurring && mins >= 30;

      if (organizerSelf || (isOrgish && oneOffAndLong)) {
        reasons.push('demo_candidate');
        if (organizerSelf) reasons.push('organizer_self');
        if (isOrgish) reasons.push(`category:${category}`);
        if (oneOffAndLong) reasons.push('one_off_and_long');

        let score = 0.66;
        if (conf != null && conf >= 0.8) score += 0.03;

        return {
          eligible: true,
          score: clamp01(score),
          reasons,
        };
      }

      return {
        eligible: false,
        score: 0,
        reasons: ['demo_ambiguous_skipped_v1'],
      };
    }

    const minMins = isRecurring ? 30 : 20;

    if (mins < minMins) {
      return {
        eligible: false,
        score: 0,
        reasons: [
          `meeting_too_short:${mins}m`,
          isRecurring ? 'recurring' : 'one_off',
        ],
      };
    }

    // If it's explicitly categorized as org (or other non-team), allow but keep score modest.
    if (category === 'org') {
      reasons.push('org_meeting');
      let score = 0.6;
      if (organizerSelf) {
        reasons.push('organizer_self');
        score += 0.03;
      }
      if (conf != null && conf >= 0.8) {
        reasons.push('high_confidence_classification');
        score += 0.03;
      }

      return {
        eligible: score >= 0.62,
        score: clamp01(score),
        reasons,
      };
    }

    return {
      eligible: false,
      score: 0,
      reasons: ['meeting_not_threadworthy_v1'],
    };
  }

  return {
    eligible: false,
    score: 0,
    reasons: ['unsupported_event_type'],
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
