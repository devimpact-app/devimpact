import { ActivityEvent, ActivityEventKind } from "@/types/api/timeline";
import {
  Clock,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  MessageSquare,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { kindLabel } from "./DotLogic";
import { formatSeconds } from "@/lib/utils/date";

function kindIcon(kind: ActivityEventKind) {
  switch (kind) {
    case "pr_opened":
    case "pr_merged":
      return <GitPullRequest className="h-3.5 w-3.5" />;
    case "pr_commit":
      return <GitCommit className="h-3.5 w-3.5" />;
    case "review_submitted":
      return <MessageSquare className="h-3.5 w-3.5" />;
    default:
      return <GitBranch className="h-3.5 w-3.5" />;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventInspectorPanel({
  event,
  onClose,
}: {
  event: ActivityEvent;
  onClose: () => void;
}) {
  useEffect(() => {
    console.log("Event details:", event);
  }, [event]);

  const latencyText = formatSeconds(event.meta?.reviewLatencySeconds);
  const hasMeta =
    event.meta?.linesChanged ||
    event.meta?.filesChanged ||
    latencyText ||
    event.meta?.isFirstResponder ||
    event.meta?.stateLabel;

  const githubUrl = event.links?.htmlUrl;

  return (
    <aside
      className="
      fixed right-0 top-0 bottom-0 w-full max-w-[300px]
      bg-surface-alt border-l border-border 
      shadow-2xl z-50 animate-slideIn
      flex flex-col
    "
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-[2px] text-[11px] text-text-secondary bg-surface/80">
              {kindIcon(event.kind)}
              <span>{kindLabel(event.kind)}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
              <Clock className="h-3 w-3" />
              {formatTime(event.occurredAt)}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-text-primary line-clamp-2">
            {event.title}
          </h2>
          {event.subtitle && (
            <p className="text-[11px] text-text-secondary">{event.subtitle}</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:bg-surface/80"
          aria-label="Close inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Actor / who did this */}
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {event.actor.avatarUrl && (
            <img
              src={event.actor.avatarUrl}
              alt={event.actor.login}
              className="h-6 w-6 rounded-full border border-border object-cover"
            />
          )}
          <div>
            <div className="text-text-primary text-xs">{event.actor.login}</div>
            <div className="text-[11px] text-text-tertiary">
              {event.kind === "review_submitted"
                ? "Submitted this review"
                : event.kind === "pr_commit"
                  ? "Pushed this change"
                  : "Authored this activity"}
            </div>
          </div>
        </div>

        {/* Summary stub (later can be AI-generated) */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
            Summary
          </h3>
          <p className="text-xs leading-relaxed text-text-secondary">
            {/* Placeholder for now */}
            This is a recent{" "}
            <span className="text-text-primary/80">
              {kindLabel(event.kind).toLowerCase()}
            </span>{" "}
            in your timeline. In the future, DevImpact will show a brief
            narrative here based on the PR changes, review content, and related
            activity.
          </p>
        </section>

        {/* Meta metrics */}
        {hasMeta && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
              Details
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {event.meta?.linesChanged ? (
                <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
                  <dt className="text-[11px] text-text-tertiary">
                    Lines changed
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                    {event.meta.linesChanged}
                  </dd>
                </div>
              ) : null}

              {event.meta?.filesChanged ? (
                <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
                  <dt className="text-[11px] text-text-tertiary">
                    Files touched
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                    {event.meta.filesChanged}
                  </dd>
                </div>
              ) : null}

              {latencyText ? (
                <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
                  <dt className="text-[11px] text-text-tertiary">
                    Review latency
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                    {latencyText}
                  </dd>
                </div>
              ) : null}

              {event.meta?.isFirstResponder ? (
                <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
                  <dt className="text-[11px] text-text-tertiary">Role</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                    First reviewer on this PR
                  </dd>
                </div>
              ) : null}

              {event.meta?.stateLabel ? (
                <div className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
                  <dt className="text-[11px] text-text-tertiary">State</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-primary">
                    {event.meta.stateLabel}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        )}

        {/* Repo / PR identifiers */}
        {(event.meta?.repoFullName || event.meta?.prNumber) && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1.5">
              Context
            </h3>
            <div className="text-xs text-text-secondary space-y-0.5">
              {event.meta?.repoFullName && (
                <div>
                  <span className="text-text-tertiary">Repo: </span>
                  <span className="text-text-primary">
                    {event.meta.repoFullName}
                  </span>
                </div>
              )}
              {event.meta?.prNumber && (
                <div>
                  <span className="text-text-tertiary">PR: </span>
                  <span className="text-text-primary">
                    #{event.meta.prNumber}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer: GitHub link if available */}
      <footer className="border-t border-border px-4 py-3">
        {githubUrl ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface hover:bg-surface-alt text-xs font-medium text-text-primary px-3 py-2 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on GitHub
          </a>
        ) : (
          <p className="text-[11px] text-text-tertiary text-center">
            No external link available for this event.
          </p>
        )}
      </footer>
    </aside>
  );
}
