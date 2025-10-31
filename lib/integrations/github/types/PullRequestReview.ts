/**
 * GitHub Pull Request Review
 * A review can be:
 * - Formal review (APPROVED/CHANGES_REQUESTED with optional body)
 * - Quick comment (state=COMMENTED, auto-created from single line comment)
 *
 * https://docs.github.com/en/rest/pulls/reviews
 */
export interface GitHubReview {
  id: number;
  node_id: string;
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
  body: string | null; // Overall review comment (can be empty for COMMENTED state)
  state:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED"
    | "PENDING";
  html_url: string;
  pull_request_url: string;
  submitted_at: string | null;
  commit_id: string;
  author_association:
    | "COLLABORATOR"
    | "CONTRIBUTOR"
    | "FIRST_TIMER"
    | "FIRST_TIME_CONTRIBUTOR"
    | "MANNEQUIN"
    | "MEMBER"
    | "NONE"
    | "OWNER";
}
