import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidGitHubRepoPath, normalizeRepoSegment, parseGitHubRepoInput } from "../lib/parse-github-repo";

test("repository shorthand and GitHub links normalize to the same owner and repo", () => {
  for (const input of [
    "Octo-Cat/Hello_world.js", " Octo-Cat/Hello_world.js.git ", "Octo-Cat/Hello_world.js/",
    "https://github.com/Octo-Cat/Hello_world.js.git/", "http://github.com/Octo-Cat/Hello_world.js",
    "github.com/Octo-Cat/Hello_world.js", "www.github.com/Octo-Cat/Hello_world.js",
    "HTTPS://WWW.GITHUB.COM/Octo-Cat/Hello_world.js?tab=readme#intro",
    "https://github.com/Octo-Cat/Hello_world.js/tree/release/docs",
    "https://github.com/%4fcto-Cat/Hello_world%2ejs",
  ]) {
    assert.deepEqual(parseGitHubRepoInput(input), { owner: "Octo-Cat", repo: "Hello_world.js" }, input);
  }
});

test("parser rejects invalid owners and repositories in both accepted input forms", () => {
  for (const path of [
    "owner.name/repo", "-owner/repo", "owner-/repo", "own--er/repo", "_owner/repo", "owner_/repo",
    "owner/repo name", "owner/repo?query", "owner/.git", "owner/.", "owner/..", "owner/repo\\name",
    `${"a".repeat(40)}/repo`, `owner/${"r".repeat(101)}`, "owner/项目", "owner/%2frepo", "owner/%252frepo",
    "owner/repo%00", "owner/repo\nname", "owner//repo", "owner/ repo", " owner/repo",
  ]) {
    // Outer whitespace belongs to the whole user input, not a URL path segment.
    if (!path.startsWith(" ")) assert.equal(parseGitHubRepoInput(path), null, path);
    if (!path.includes("?")) assert.equal(parseGitHubRepoInput(`https://github.com/${path}`), null, path);
  }
});

test("malformed and non-GitHub URLs cannot fall through to shorthand parsing", () => {
  for (const input of [
    "", "owner", "/owner/repo", "//owner/repo", "owner/repo/extra", "owner/repo//",
    "https://github.com/owner", "https://github.com//owner/repo", "https://github.com/owner/repo//",
    "https://github.com.evil.test/owner/repo", "https://evil.test/owner/repo", "https://github.com@evil.test/owner/repo",
    "https://user@github.com/owner/repo", "ftp://github.com/owner/repo", "https://github.com:8080/owner/repo",
    "https://github.com/owner/../repo", "https://github.com/owner/%2e%2e/repo",
    "https://github.com/owner/repo/../other", "https://github.com/owner/repo/tree/%2e%2e",
    "https://github.com/owner/%", "https://github.com/owner%2frepo/name", "https://github.com/owner\\repo/name",
  ]) assert.equal(parseGitHubRepoInput(input), null, input);
});

test("route validation shares name rules while retaining supported normalization", () => {
  assert.equal(normalizeRepoSegment(" project.GIT "), "project");
  for (const [owner, repo] of [
    ["a", "b"], ["a".repeat(39), "b".repeat(100)], ["octo-cat", ".github"],
    ["octocat", "release..docs"], [" octocat ", " project.git "], ["mona-cat_octo", "repo"],
  ]) {
    assert.equal(isValidGitHubRepoPath(owner, repo), true, `${owner}/${repo}`);
  }
  for (const [owner, repo] of [
    ["owner.name", "repo"], ["owner", ".."], ["owner", "../repo"], ["owner", "repo/path"],
    ["owner", "repo#fragment"], ["owner", "repo?query"], ["", "repo"], ["owner", ""],
    ["owner", ".git"], ["owner", "."], ["owner", "repo%2Fpath"], ["owner", "r".repeat(101)],
  ]) assert.equal(isValidGitHubRepoPath(owner, repo), false, `${owner}/${repo}`);
});
