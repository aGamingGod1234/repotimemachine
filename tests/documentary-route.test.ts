import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/documentary/route";

const envKeys = ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "XAI_API_KEY", "XAI_MODEL", "GITHUB_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) delete process.env[key];
  mock.method(console, "warn", () => {});
  mock.method(console, "error", () => {});
});
afterEach(() => {
  mock.restoreAll();
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function request(body: unknown) {
  return new NextRequest("http://localhost/api/documentary", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const documentary = "# The Story\nA small repository finds its purpose.";
function services(options: { cached?: unknown; cacheError?: boolean; providerContent?: unknown; providerStatus?: number } = {}) {
  const urls: URL[] = [];
  const cacheCommands: unknown[][] = [];
  let generation: { model: string; messages: { role: string; content: string }[]; max_tokens?: number; max_completion_tokens?: number; temperature?: number } | undefined;
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    urls.push(url);
    if (url.hostname === "cache.example") {
      if (options.cacheError) return Response.json({ error: "cache unavailable" }, { status: 401 });
      const commands = JSON.parse(String(init?.body)) as unknown[][];
      cacheCommands.push(...commands);
      return Response.json(commands.map((command) => ({ result: command[0] === "get" ? options.cached ?? null : "OK" })));
    }
    if (["api.openai.com", "openrouter.ai", "api.x.ai"].includes(url.hostname)) {
      generation = JSON.parse(String(init?.body));
      if (options.providerStatus) return new Response("private-provider-detail", { status: options.providerStatus });
      return Response.json({ choices: [{ message: { content: "providerContent" in options ? options.providerContent : documentary } }] });
    }
    assert.equal(url.hostname, "api.github.com", `Unexpected network request: ${url}`);
    const path = url.pathname;
    if (path === "/repos/example/project") return Response.json({ full_name: "example/project", default_branch: "release/docs", stargazers_count: 3, forks_count: 1, open_issues_count: 0, topics: [], created_at: "2020-01-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" });
    if (path.endsWith("/commits")) return Response.json([{ sha: "abc", author: { login: "example" }, commit: { message: "Document the project", author: { name: "Example", date: "2026-10-01T00:00:00Z" } } }]);
    if (path.includes("/branches/")) return Response.json({ commit: { commit: { tree: { sha: "tree" } } } });
    if (path.includes("/git/trees/")) return Response.json({ tree: [{ path: "README.md", type: "blob" }] });
    if (path.endsWith("/readme")) return Response.json({ content: Buffer.from("Default branch README").toString("base64") });
    if (path.endsWith("/languages")) return Response.json({ TypeScript: 100 });
    if (path.endsWith("/stats/code_frequency")) return Response.json({}, { status: 202 });
    if (["/contributors", "/releases", "/pulls", "/issues"].some((suffix) => path.endsWith(suffix))) return Response.json([]);
    assert.fail(`Unexpected GitHub endpoint: ${url}`);
  });
  return { urls, cacheCommands, generation: () => generation };
}

function enableRedis(legacy = false) {
  process.env[legacy ? "KV_REST_API_URL" : "UPSTASH_REDIS_REST_URL"] = "https://cache.example";
  process.env[legacy ? "KV_REST_API_TOKEN" : "UPSTASH_REDIS_REST_TOKEN"] = "test-cache-token";
}

test("invalid JSON and invalid repository paths fail before any external requests", async () => {
  const { urls } = services();
  const malformed = await POST(new NextRequest("http://localhost/api/documentary", { method: "POST", body: "{" }));
  assert.equal(malformed.status, 400);
  for (const input of [null, [], "text", {}, { owner: {}, repo: "project" }, { owner: "example", repo: ["project"] }, { owner: "example", repo: "../private" }, { owner: "example", repo: "project?x=y" }]) {
    assert.equal((await POST(request(input))).status, 400, JSON.stringify(input));
  }
  assert.equal(urls.length, 0);
});

test("generation works without Redis and uses the actual default branch", async () => {
  process.env.OPENAI_API_KEY = "test-provider-key";
  process.env.OPENAI_MODEL = "configured/openai-model";
  const external = services();
  const response = await POST(request({ owner: "example", repo: "project.git" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { documentary, fromCache: false });
  assert.equal(external.urls.find((url) => url.pathname.endsWith("/commits"))?.searchParams.get("sha"), "release/docs");
  assert.equal(external.urls.find((url) => url.pathname.endsWith("/readme"))?.searchParams.get("ref"), "release/docs");
  assert.ok(external.urls.some((url) => url.pathname.endsWith("/branches/release%2Fdocs")));
  assert.match(external.generation()!.messages[1].content, /Default branch README/);
  assert.equal(external.generation()!.model, "configured/openai-model");
  assert.equal(external.generation()!.max_completion_tokens, 3000);
  assert.equal(external.generation()!.max_tokens, undefined);
  assert.equal(external.generation()!.temperature, undefined);
});

test("both Redis credential formats serve cached text without a provider key", async () => {
  for (const legacy of [false, true]) {
    enableRedis(legacy);
    const external = services({ cached: documentary });
    const response = await POST(request({ owner: "Example", repo: "Project" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { documentary, fromCache: true });
    assert.deepEqual(external.cacheCommands[0], ["get", "doc:example/project"]);
    assert.ok(external.urls.every((url) => url.hostname === "cache.example"));
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
});

test("successful generations are cached for 24 hours", async () => {
  process.env.OPENAI_API_KEY = "test-provider-key";
  process.env.OPENAI_MODEL = "configured/openai-model";
  enableRedis();
  const external = services();
  assert.equal((await POST(request({ owner: "example", repo: "project" }))).status, 200);
  const set = external.cacheCommands.find((command) => command[0] === "set");
  assert.ok(set);
  assert.equal(set[1], "doc:example/project");
  assert.equal(set[2], documentary);
  assert.deepEqual(set.slice(3), ["ex", 86400]);
});

test("cache read and write failures do not discard a successful generation", async () => {
  process.env.OPENAI_API_KEY = "test-provider-key";
  process.env.OPENAI_MODEL = "configured/openai-model";
  enableRedis();
  services({ cacheError: true });
  const response = await POST(request({ owner: "example", repo: "project" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { documentary, fromCache: false });
});

test("malformed cache values are ignored", async () => {
  enableRedis();
  services({ cached: { documentary } });
  const response = await POST(request({ owner: "example", repo: "project" }));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /No LLM API key/);
});

test("OpenRouter requires an explicit model instead of a retired preview", async () => {
  process.env.OPENROUTER_API_KEY = "test-provider-key";
  const external = services();
  const missing = await POST(request({ owner: "example", repo: "project" }));
  assert.equal(missing.status, 500);
  assert.match((await missing.json()).error, /OPENROUTER_MODEL/);
  assert.equal(external.urls.length, 0);
  process.env.OPENROUTER_MODEL = "configured/model";
  assert.equal((await POST(request({ owner: "example", repo: "project" }))).status, 200);
  assert.equal(external.generation()!.model, "configured/model");
});

test("empty or non-text provider output is an error and is never cached", async () => {
  process.env.OPENAI_API_KEY = "test-provider-key";
  process.env.OPENAI_MODEL = "configured/openai-model";
  enableRedis();
  for (const content of [null, "", "   ", { text: "unexpected" }]) {
    const external = services({ providerContent: content });
    const response = await POST(request({ owner: "example", repo: "project" }));
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /empty documentary/);
    assert.equal(external.cacheCommands.filter((command) => command[0] === "set").length, 0);
  }
});

test("provider failures do not expose the provider response body", async () => {
  process.env.OPENAI_API_KEY = "test-provider-key";
  process.env.OPENAI_MODEL = "configured/openai-model";
  services({ providerStatus: 401 });
  const response = await POST(request({ owner: "example", repo: "project" }));
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.match(body, /HTTP 401/);
  assert.doesNotMatch(body, /private-provider-detail/);
});

test("the selected provider requires a model and keeps the documented priority", async () => {
  process.env.OPENAI_API_KEY = "openai-test-key";
  const external = services();
  let response = await POST(request({ owner: "example", repo: "project" }));
  assert.match((await response.json()).error, /OPENAI_MODEL/);
  process.env.OPENAI_MODEL = "configured/openai-model";
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  process.env.OPENROUTER_MODEL = "configured/openrouter-model";
  process.env.XAI_API_KEY = "xai-test-key";
  response = await POST(request({ owner: "example", repo: "project" }));
  assert.match((await response.json()).error, /XAI_MODEL/);
  assert.equal(external.urls.length, 0);
  process.env.XAI_MODEL = "configured/xai-model";
  response = await POST(request({ owner: "example", repo: "project" }));
  assert.equal(response.status, 200);
  assert.equal(external.generation()!.model, "configured/xai-model");
  assert.ok(external.urls.some((url) => url.hostname === "api.x.ai"));
});
