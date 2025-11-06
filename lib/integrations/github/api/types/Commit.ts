/**
 * GitHub Commit (full details)
 * From: GET /repos/{owner}/{repo}/commits/{sha}
 * https://docs.github.com/en/rest/commits/commits#get-a-commit
 */
export interface GitHubCommit {
  sha: string;
  node_id: string;

  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };

  author: {
    login: string;
    id: number;
    avatar_url: string;
  } | null;

  committer: {
    login: string;
    id: number;
  } | null;

  html_url: string;

  // These are only in the full commit endpoint!
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };

  files: Array<{
    filename: string;
    status: "added" | "removed" | "modified" | "renamed";
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}
