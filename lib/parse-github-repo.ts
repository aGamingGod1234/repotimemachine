// Managed GitHub accounts may have an enterprise shortcode after an underscore.
const OWNER_SEGMENT = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*(?:_[a-zA-Z0-9]{3,8})?$/;
const REPO_SEGMENT = /^[a-zA-Z0-9._-]{1,100}$/;

export function parseGitHubRepoInput(
  raw: string
): { owner: string; repo: string } | null {
  const s = raw.trim();
  if (!s) return null;

  // Read the original path so URL normalization cannot silently erase traversal.
  const githubUrl = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^?#]*)(?:[?#].*)?$/i.exec(s);
  const path = githubUrl ? githubUrl[1] : s;
  let parts = path.replace(/\/$/, "").split("/");
  if (githubUrl) {
    try {
      parts = parts.map(decodeURIComponent);
    } catch {
      return null;
    }
  }
  if (parts.length < 2 || (!githubUrl && parts.length !== 2)) return null;
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes("\\") ||
    Array.from(part).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) return null;

  const [owner, repo] = parts;
  if (owner !== owner.trim() || repo !== repo.trim() || !isValidGitHubRepoPath(owner, repo)) return null;
  return { owner, repo: normalizeRepoSegment(repo) };
}

/** Strip trailing `.git` for path validation (URL segment may include it). */
export function normalizeRepoSegment(repo: string): string {
  return repo.trim().replace(/\.git$/i, "");
}

/** Validates dynamic route segments for `/[owner]/[repo]`. */
export function isValidGitHubRepoPath(owner: string, repo: string): boolean {
  const o = owner.trim();
  const r = normalizeRepoSegment(repo);
  return o.length <= 39 && OWNER_SEGMENT.test(o) &&
    r !== "." && r !== ".." && REPO_SEGMENT.test(r);
}
