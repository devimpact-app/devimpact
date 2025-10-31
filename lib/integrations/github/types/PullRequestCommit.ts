/**
 * GitHub Pull Request Commit (simplified)
 * From: GET /repos/{owner}/{repo}/pulls/{number}/commits
 * https://docs.github.com/en/rest/pulls/pulls#list-commits-on-a-pull-request
 */
export interface GitHubPRCommit {
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

  // Note: No stats or files in this response!
  // You need to fetch individual commit for that
}
