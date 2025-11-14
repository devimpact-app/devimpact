export type ActivityEventKind =
  | "pr_opened"
  | "pr_merged"
  | "pr_commit"
  | "review_submitted";

export type ActivitySource = "github";

export type ActivityEvent = {
  id: string; // e.g. `pr:merged:uuid` or `review:uuid`
  kind: ActivityEventKind;
  source: ActivitySource;
  occurredAt: string; // ISO string

  actor: {
    login: string;
    avatarUrl?: string; // keep for future
  };

  title: string; // e.g. "Merged “Improve dashboard layout”"
  subtitle?: string; // e.g. "owner/repo • #123"

  meta?: {
    prNumber?: number;
    repoFullName?: string;
    linesChanged?: number;
    filesChanged?: number;
    reviewLatencySeconds?: number | null;
    isFirstResponder?: boolean;
    stateLabel?: string; // "merged", "open", etc.
  };

  links?: {
    htmlUrl?: string; // GitHub URL
  };
};
