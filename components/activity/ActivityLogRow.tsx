import { ActivityEvent } from '@/types/api/timeline';
import {
  GitCommit,
  GitPullRequest,
  GitMerge,
  MessageSquare,
  AlertTriangle,
  CalendarCheck,
} from 'lucide-react';
import * as React from 'react';

export type ActivityLogMode = 'preview' | 'full';

type ActivityLogRowProps = {
  event: ActivityEvent;
  mode?: ActivityLogMode;
  onEventClick?: (event: ActivityEvent) => void;
};

type Presentation = {
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  title: string;
  subtitle?: string;
  href?: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPrimaryLink(event: ActivityEvent): string | undefined {
  return event.links?.htmlUrl ?? undefined;
}

function getCommitCount(meta: any): number {
  if (!meta) return 1;
  if (typeof meta.commitCount === 'number') return meta.commitCount;
  return 1;
}

function getReviewState(
  meta: ActivityEvent['meta']
): 'approved' | 'changes_requested' | 'commented' | 'unknown' {
  if (!meta) return 'unknown';
  if (meta.reviewState === 'approved' || meta.reviewState === 'APPROVED')
    return 'approved';
  if (
    meta.reviewState === 'changes_requested' ||
    meta.reviewState === 'CHANGES_REQUESTED'
  )
    return 'changes_requested';
  if (meta.reviewState === 'commented' || meta.reviewState === 'COMMENTED')
    return 'commented';
  return 'unknown';
}

function wasFirstReviewer(meta: ActivityEvent['meta']): boolean {
  if (!meta) return false;
  if (typeof meta.isFirstResponder === 'boolean') return meta.isFirstResponder;
  return false;
}

/**
 * Map an ActivityEvent into icon + copy for the row.
 */
function getPresentation(event: ActivityEvent): Presentation {
  const { kind, occurredAt, meta } = event;
  const repo = meta?.repoFullName;
  const prNumber = meta?.prNumber;
  const prTitle = meta?.prTitle;
  const href = getPrimaryLink(event);

  // Base fallback (unknown kind)
  let icon = <AlertTriangle className="h-3.5 w-3.5" />;
  let iconBgClass = 'bg-slate-800';
  let iconColorClass = 'text-slate-300';
  let title = event.title;
  let subtitle = event.subtitle || formatTime(occurredAt);

  switch (kind) {
    case 'pr_opened': {
      icon = <GitPullRequest className="h-3.5 w-3.5" />;
      iconBgClass = 'bg-sky-900/40';
      iconColorClass = 'text-sky-300';

      const prLabel = prNumber ? `PR #${prNumber}` : 'a PR';
      const repoLabel = repo ? ` in ${repo}` : '';
      title = `You opened ${prLabel}${repoLabel}`;

      const parts: string[] = [];
      if (prTitle) parts.push(`“${prTitle}”`);
      parts.push(formatTime(occurredAt));
      subtitle = parts.join(' • ');
      break;
    }

    case 'pr_merged': {
      icon = <GitMerge className="h-3.5 w-3.5" />;
      iconBgClass = 'bg-emerald-900/40';
      iconColorClass = 'text-emerald-300';

      const prLabel = prNumber ? `PR #${prNumber}` : 'a PR';
      const repoLabel = repo ? ` in ${repo}` : '';
      title = `You merged ${prLabel}${repoLabel}`;

      const parts: string[] = [];
      if (prTitle) parts.push(`“${prTitle}”`);
      parts.push(formatTime(occurredAt));
      subtitle = parts.join(' • ');
      break;
    }

    case 'review_submitted': {
      icon = <MessageSquare className="h-3.5 w-3.5" />;
      iconBgClass = 'bg-teal-900/40';
      iconColorClass = 'text-teal-300';

      const prLabel = prNumber ? `PR #${prNumber}` : 'this PR';
      const state = getReviewState(meta);

      let verb = 'reviewed';
      if (state === 'approved') verb = 'approved';
      if (state === 'changes_requested') verb = 'requested changes on';

      title = `You ${verb} ${prLabel}${repo ? ` in ${repo}` : ''}`;

      const parts: string[] = [];
      if (prTitle) parts.push(`“${prTitle}”`);
      if (wasFirstReviewer(meta)) parts.push('first reviewer');
      parts.push(formatTime(occurredAt));
      subtitle = parts.join(' • ');
      break;
    }

    case 'pr_commit':
    case 'commit_cluster': {
      icon = <GitCommit className="h-3.5 w-3.5" />;
      iconBgClass = 'bg-slate-900/40';
      iconColorClass = 'text-slate-300';

      const count = getCommitCount(meta);
      const countLabel = count === 1 ? 'a commit' : `${count} commits`;
      title = `You pushed ${countLabel}${repo ? ` to ${repo}` : ''}`;

      subtitle = formatTime(occurredAt);
      break;
    }
    case 'meeting': {
      icon = <CalendarCheck className="h-3.5 w-3.5" />;
      iconBgClass = 'bg-slate-900/40';
      iconColorClass = 'text-slate-300';
      break;
    }
  }

  return {
    icon,
    iconBgClass,
    iconColorClass,
    title,
    subtitle,
    href,
  };
}

export function ActivityLogRow({
  event,
  mode = 'preview',
  onEventClick,
}: ActivityLogRowProps) {
  const compact = mode === 'preview';
  const { icon, iconBgClass, iconColorClass, title, subtitle, href } =
    getPresentation(event);

  const content = (
    <div
      className={`
        flex items-start gap-2 
        ${compact ? 'py-1' : 'py-2'}
      `}
    >
      <div
        className={`
          mt-[2px] flex h-6 w-6 items-center justify-center 
          rounded-full border border-white/10 
          ${iconBgClass}
        `}
      >
        <span className={iconColorClass}>{icon}</span>
      </div>

      <div className="flex min-w-0 flex-col">
        <span
          className={
            compact
              ? 'truncate text-[13px] font-medium text-white/90'
              : 'truncate text-sm font-medium text-white/90'
          }
        >
          {title}
        </span>
        {subtitle && (
          <span
            className={
              compact
                ? 'mt-0.5 text-xs text-white/60'
                : 'mt-0.5 text-xs text-white/60'
            }
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (onEventClick) {
    return (
      <button
        type="button"
        onClick={() => onEventClick(event)}
        className="block w-full rounded-md px-1 text-left hover:bg-slate-900/40 focus:outline-none focus:ring-1 focus:ring-slate-600/80"
      >
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-md px-1 hover:bg-slate-900/40"
      >
        {content}
      </a>
    );
  }

  return <div className="px-1">{content}</div>;
}
