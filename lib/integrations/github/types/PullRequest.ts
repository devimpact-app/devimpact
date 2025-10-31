/**
 * GitHub Pull Request (simplified from API response)
 * Full API docs: https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request
 *
 * To see full response, check:
 * https://api.github.com/repos/octocat/Hello-World/pulls/1347
 */

export interface GitHubPullRequest {
  id: number;
  number: number;
  state: string;
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft?: boolean;

  user: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  } | null;

  head: {
    ref: string;
    sha: string;
    repo: {
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      owner: {
        login: string;
        id: number;
      };
    } | null;
  };

  base: {
    ref: string;
    sha: string;
    repo: {
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      owner: {
        login: string;
        id: number;
      };
    };
  };

  html_url: string;
  diff_url: string;
  patch_url: string;

  // Stats (available from /pulls/{number} endpoint)
  additions?: number;
  deletions?: number;
  changed_files?: number;
  commits?: number;

  // Additional fields
  labels: Array<{
    id: number;
    name: string;
    color: string;
    description: string | null;
  }>;

  assignees?: Array<{
    login: string;
    id: number;
  }> | null;

  requested_reviewers?: Array<{
    login: string;
    id: number;
  }> | null;

  milestone: {
    id: number;
    number: number;
    title: string;
  } | null;

  // URLs for related data
  comments_url: string;
  review_comments_url: string;
  commits_url: string;
  statuses_url: string;
}
