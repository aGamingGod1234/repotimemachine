import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { getCodeFrequency, getCommits, getContributors, getFileTree, getLanguages, getReadme, getReleases, getRepoMeta, getTopIssues, getTopPullRequests } from "../lib/github-client";

afterEach(() => mock.restoreAll());

function responses(...queue: Response[]) {
  const urls: URL[] = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    urls.push(new URL(input instanceof Request ? input.url : String(input)));
    const response = queue.shift();
    assert.ok(response, `Unexpected request: ${urls.at(-1)}`);
    return response;
  });
  return urls;
}

test("metadata supplies the custom default branch to commits, tree and README", async () => {
  const branch = "release/docs&other=1+#%2F";
  const urls = responses(
    Response.json({ full_name: "octocat/project", default_branch: branch }),
    Response.json([{ sha: "commit-sha", author: null, commit: { message: "First commit", author: { name: "Author", date: "2026-01-01T00:00:00Z" } } }]),
    Response.json({ commit: { commit: { tree: { sha: "tree-sha" } } } }),
    Response.json({ tree: [{ path: "README.md", type: "blob", size: 12 }, { path: "src", type: "tree" }], truncated: true }),
    Response.json({ content: Buffer.from("# A README 🌟").toString("base64") }),
  );
  const meta = await getRepoMeta("octocat", "project");
  assert.equal(meta.default_branch, branch);
  assert.deepEqual(meta.topics, []);
  assert.deepEqual(await getCommits("octocat", "project", meta.default_branch, 17), [
    { sha: "commit-sha", message: "First commit", author: "Author", author_login: null, date: "2026-01-01T00:00:00Z" },
  ]);
  assert.deepEqual(await getFileTree("octocat", "project", meta.default_branch), {
    tree: [{ path: "README.md", type: "blob", size: 12 }, { path: "src", type: "tree", size: undefined }], truncated: true,
  });
  assert.equal(await getReadme("octocat", "project", meta.default_branch), "# A README 🌟");
  assert.equal(urls[1].searchParams.get("sha"), branch);
  assert.deepEqual([...urls[1].searchParams.keys()], ["sha", "per_page"]);
  assert.equal(urls[1].searchParams.get("per_page"), "17");
  assert.equal(urls[2].pathname, `/repos/octocat/project/branches/${encodeURIComponent(branch)}`);
  assert.equal(urls[3].pathname, "/repos/octocat/project/git/trees/tree-sha");
  assert.equal(urls[3].searchParams.get("recursive"), "1");
  assert.equal(urls[4].searchParams.get("ref"), branch);
  assert.ok(urls.every((url) => url.hash === ""));
});

test("branch failures never switch to a different branch", async () => {
  for (const status of [401, 403, 429, 500]) {
    const urls = responses(new Response(null, { status }));
    await assert.rejects(getFileTree("octocat", "project", "develop"), new RegExp(`Branch fetch failed: ${status}`));
    assert.equal(urls.length, 1);
  }
  const urls = responses(new Response(null, { status: 404 }), Response.json([{ name: "main" }]));
  await assert.rejects(getFileTree("octocat", "project", "develop"), /Branch fetch failed: 404/);
  assert.deepEqual(urls.map((url) => url.pathname), ["/repos/octocat/project/branches/develop", "/repos/octocat/project/branches"]);
});

test("an empty repository has no commits or tree even though metadata names its future default branch", async () => {
  responses(
    Response.json({ message: "Git Repository is empty." }, { status: 409 }),
    new Response(null, { status: 404 }),
    Response.json([]),
  );
  assert.deepEqual(await getCommits("octocat", "empty", "develop"), []);
  assert.deepEqual(await getFileTree("octocat", "empty", "develop"), { tree: [], truncated: false });
});

test("other conflicts, inaccessible repositories and tree errors remain errors", async () => {
  responses(Response.json({ message: "Another conflict" }, { status: 409 }));
  await assert.rejects(getCommits("octocat", "project", "develop"), /Commits: 409/);
  responses(new Response(null, { status: 403 }));
  await assert.rejects(getCommits("octocat", "project", "develop"), /Commits: 403/);
  responses(new Response(null, { status: 404 }), new Response(null, { status: 404 }));
  await assert.rejects(getFileTree("octocat", "project", "develop"), /Branch fetch failed: 404/);
  responses(Response.json({ commit: { commit: { tree: { sha: "tree-sha" } } } }), new Response(null, { status: 500 }));
  await assert.rejects(getFileTree("octocat", "project", "develop"), /Tree fetch failed: 500/);
  responses(new Response(null, { status: 404 }));
  await assert.rejects(getRepoMeta("octocat", "project"), /Repo octocat\/project not found/);
});

test("optional sources accept no-content responses without parsing JSON", async () => {
  responses(...Array.from({ length: 7 }, () => new Response(null, { status: 204 })));
  assert.deepEqual(await getContributors("octocat", "empty"), []);
  assert.deepEqual(await getReleases("octocat", "empty"), []);
  assert.deepEqual(await getLanguages("octocat", "empty"), {});
  assert.deepEqual(await getTopPullRequests("octocat", "empty"), []);
  assert.deepEqual(await getTopIssues("octocat", "empty"), []);
  assert.equal(await getReadme("octocat", "empty", "develop"), "");
  assert.equal(await getCodeFrequency("octocat", "empty"), null);
});

test("statistics pending generation return no data without a JSON body or retries", async () => {
  for (const body of [null, "{}", ""]) {
    const urls = responses(new Response(body, { status: 202 }));
    assert.equal(await getCodeFrequency("octocat", "project"), null);
    assert.equal(urls.length, 1);
  }
  responses(Response.json([[1704067200, 12, -7]]));
  assert.deepEqual(await getCodeFrequency("octocat", "project"), [{ week: 1704067200, additions: 12, deletions: -7 }]);
});

test("optional sources preserve their existing unavailable-data results", async () => {
  responses(...Array.from({ length: 7 }, () => new Response(null, { status: 404 })));
  assert.deepEqual(await getContributors("octocat", "project"), []);
  assert.deepEqual(await getReleases("octocat", "project"), []);
  assert.deepEqual(await getLanguages("octocat", "project"), {});
  assert.deepEqual(await getTopPullRequests("octocat", "project"), []);
  assert.deepEqual(await getTopIssues("octocat", "project"), []);
  assert.equal(await getReadme("octocat", "project", "develop"), "");
  assert.equal(await getCodeFrequency("octocat", "project"), null);
});

test("issue results exclude pull requests and keep issue details", async () => {
  responses(Response.json([
    { title: "An issue", number: 1, user: { login: "octocat" }, state: "open", comments: 3, created_at: "2026-01-01" },
    { title: "A PR", number: 2, pull_request: { url: "https://api.github.com/repos/octocat/project/pulls/2" } },
  ]));
  assert.deepEqual(await getTopIssues("octocat", "project"), [
    { title: "An issue", number: 1, user: "octocat", state: "open", comments: 3, created_at: "2026-01-01" },
  ]);
});

test("PRs use the supported popularity sort and issues exclude pull requests", async () => {
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.endsWith('/pulls')) {
      assert.equal(url.searchParams.get('sort'), 'popularity');
      return Response.json([{ title:'Open proposal', number:1, user:null, state:'open', created_at:'2026-01-01', merged_at:null }]);
    }
    return Response.json([{ title:'Issue', number:2, user:null, state:'open', comments:1, created_at:'2026-01-01' }, { number:1, pull_request:{} }]);
  });
  const pulls = await getTopPullRequests('org', 'repo');
  assert.equal(pulls[0].state, 'open');
  assert.equal(pulls[0].user, 'ghost');
  const issues = await getTopIssues('org', 'repo');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].number, 2);
});
