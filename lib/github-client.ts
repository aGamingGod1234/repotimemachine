const GITHUB_API = "https://api.github.com";

function ghHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "repotimemachine/1.0.0",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function repoUrl(owner: string, repo: string): string {
  return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export interface RepoMeta {
  full_name: string; description: string | null; stargazers_count: number; forks_count: number;
  language: string | null; topics: string[]; default_branch: string;
  created_at: string; updated_at: string; open_issues_count: number; homepage: string | null;
}

export async function getRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
  const response = await fetch(repoUrl(owner, repo), { headers: ghHeaders() });
  if (response.status === 404) throw new Error(`Repo ${owner}/${repo} not found.`);
  if (!response.ok) throw new Error(`GitHub error: ${response.status}`);
  const data = await response.json() as RepoMeta;
  return { ...data, topics: data.topics ?? [] };
}

interface TreeEntry { path: string; type: string; size?: number; }

export async function getFileTree(owner: string, repo: string, branch: string) {
  const response = await fetch(`${repoUrl(owner, repo)}/branches/${encodeURIComponent(branch)}`, { headers: ghHeaders() });
  if (response.status === 404) {
    // Empty repositories have a default branch name but no branch object yet.
    const branches = await fetch(`${repoUrl(owner, repo)}/branches?per_page=1`, { headers: ghHeaders() });
    if (branches.ok) {
      const data: unknown = await branches.json();
      if (Array.isArray(data) && data.length === 0) return { tree: [] as TreeEntry[], truncated: false };
    }
  }
  if (!response.ok) throw new Error(`Branch fetch failed: ${response.status}`);
  const data = await response.json() as { commit: { commit: { tree: { sha: string } } } };
  const treeResponse = await fetch(`${repoUrl(owner, repo)}/git/trees/${data.commit.commit.tree.sha}?recursive=1`, { headers: ghHeaders() });
  if (!treeResponse.ok) throw new Error(`Tree fetch failed: ${treeResponse.status}`);
  const tree = await treeResponse.json() as { tree: TreeEntry[]; truncated?: boolean };
  return { tree: tree.tree.map((entry) => ({ path: entry.path, type: entry.type, size: entry.size })), truncated: tree.truncated ?? false };
}

export async function getReadme(owner: string, repo: string, branch: string): Promise<string> {
  const response = await fetch(`${repoUrl(owner, repo)}/readme?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders() });
  if (response.status === 404 || response.status === 204) return "";
  if (!response.ok) throw new Error(`GitHub README: ${response.status}`);
  const data = await response.json() as { content: string };
  return Buffer.from(data.content, "base64").toString("utf-8");
}

interface GitHubCommit {
  sha: string;
  commit: { message: string; author: { name: string | null; date: string } | null; committer: { date: string } | null };
  author: { login: string } | null;
}

export async function getCommits(owner: string, repo: string, branch: string, perPage = 100) {
  const query = new URLSearchParams({ sha: branch, per_page: String(perPage) });
  const response = await fetch(`${repoUrl(owner, repo)}/commits?${query}`, { headers: ghHeaders() });
  if (response.status === 409) {
    const error = await response.json().catch(() => null);
    if (error?.message === "Git Repository is empty.") return [];
  }
  if (!response.ok) throw new Error(`Commits: ${response.status}`);
  const commits = await response.json() as GitHubCommit[];
  return commits.map((commit) => ({
    sha: commit.sha, message: commit.commit.message, author: commit.commit.author?.name ?? null,
    author_login: commit.author?.login ?? null, date: commit.commit.author?.date ?? commit.commit.committer?.date ?? "",
  }));
}

async function optionalList<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { headers: ghHeaders() });
  if (!response.ok || response.status === 204) return [];
  const data: unknown = await response.json();
  return Array.isArray(data) ? data as T[] : [];
}

export async function getContributors(owner: string, repo: string) {
  return optionalList<{ login: string; contributions: number }>(`${repoUrl(owner, repo)}/contributors?per_page=30`);
}

export async function getReleases(owner: string, repo: string) {
  const releases = await optionalList<{ tag_name: string; name: string | null; published_at: string | null }>(`${repoUrl(owner, repo)}/releases?per_page=30`);
  return releases.flatMap((release) => release.published_at ? [{ ...release, published_at: release.published_at }] : []);
}

export async function getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  const response = await fetch(`${repoUrl(owner, repo)}/languages`, { headers: ghHeaders() });
  return response.ok && response.status !== 204 ? await response.json() : {};
}

export async function getCodeFrequency(owner: string, repo: string) {
  const response = await fetch(`${repoUrl(owner, repo)}/stats/code_frequency`, { headers: ghHeaders() });
  if (!response.ok || response.status === 202 || response.status === 204) return null;
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as number[][]).map((week) => ({ week: week[0], additions: week[1], deletions: week[2] })) : null;
}

export async function getTopPullRequests(owner: string, repo: string, limit = 20) {
  const pulls = await optionalList<{ title: string; number: number; user: { login: string } | null; created_at: string; merged_at: string | null; state: string }>(`${repoUrl(owner, repo)}/pulls?state=all&sort=popularity&direction=desc&per_page=${limit}`);
  return pulls.map((pull) => ({ title: pull.title, number: pull.number, user: pull.user?.login ?? "ghost", created_at: pull.created_at, merged: !!pull.merged_at, state: pull.state }));
}

export async function getTopIssues(owner: string, repo: string, limit = 15) {
  const issues = await optionalList<{ title: string; number: number; user: { login: string } | null; state: string; comments: number; created_at: string; pull_request?: unknown }>(`${repoUrl(owner, repo)}/issues?state=all&sort=comments&direction=desc&per_page=${limit}`);
  return issues.filter((issue) => !("pull_request" in issue)).map((issue) => ({ title: issue.title, number: issue.number, user: issue.user?.login ?? "ghost", state: issue.state, comments: issue.comments, created_at: issue.created_at }));
}
