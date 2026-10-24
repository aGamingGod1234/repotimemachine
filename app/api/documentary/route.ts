import { NextRequest, NextResponse } from "next/server";
import { DOCUMENTARY_SYSTEM_PROMPT, buildDocumentaryUserMessage, RepoDataForDocumentary } from "@/lib/documentary-prompt";
import { getRepoMeta, getCommits, getContributors, getReleases, getFileTree, getReadme, getLanguages, getCodeFrequency, getTopPullRequests, getTopIssues } from "@/lib/github-client";
import { readDocumentary, cacheDocumentary } from "@/lib/documentary-cache";
import { isValidGitHubRepoPath, normalizeRepoSegment } from "@/lib/parse-github-repo";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const XAI_URL = "https://api.x.ai/v1/chat/completions";

interface LlmTarget { url: string; apiKey: string; model: string; }

function resolveLlm(): LlmTarget | { error: string } {
  for (const [prefix, url] of [["XAI", XAI_URL], ["OPENROUTER", OPENROUTER_URL], ["OPENAI", OPENAI_URL]] as const) {
    const apiKey = process.env[`${prefix}_API_KEY`]?.trim();
    if (!apiKey) continue;
    const model = process.env[`${prefix}_MODEL`]?.trim();
    if (!model) return { error: `Set ${prefix}_MODEL to an available model ID for the configured provider.` };
    return { url, apiKey, model };
  }
  return { error: "No LLM API key. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or XAI_API_KEY." };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });

  if (typeof body.owner !== "string" || typeof body.repo !== "string" ||
      !isValidGitHubRepoPath(body.owner, body.repo)) {
    return NextResponse.json({ error: "A valid GitHub owner and repo are required." }, { status: 400 });
  }
  const owner = body.owner.trim();
  const repo = normalizeRepoSegment(body.repo);

  const cached = await readDocumentary(owner, repo);
  if (cached) return NextResponse.json({ documentary: cached, fromCache: true });

  const llm = resolveLlm();
  if ("error" in llm) return NextResponse.json({ error: llm.error }, { status: 500 });

  try {
    const meta = await getRepoMeta(owner, repo);
    const [commits, contributors, releases, tree, readme, languages, codeFreq, topPRs, topIssues] = await Promise.all([
      getCommits(owner, repo, meta.default_branch),
      getContributors(owner, repo),
      getReleases(owner, repo),
      getFileTree(owner, repo, meta.default_branch),
      getReadme(owner, repo, meta.default_branch).catch(() => null),
      getLanguages(owner, repo),
      getCodeFrequency(owner, repo).catch(() => null),
      getTopPullRequests(owner, repo).catch(() => []),
      getTopIssues(owner, repo).catch(() => []),
    ]);

    const data: RepoDataForDocumentary = {
      meta: {
        full_name: meta.full_name, description: meta.description, stars: meta.stargazers_count,
        forks: meta.forks_count, language: meta.language, topics: meta.topics,
        default_branch: meta.default_branch, created_at: meta.created_at, updated_at: meta.updated_at,
        open_issues: meta.open_issues_count, homepage: meta.homepage,
      },
      commits: commits.map((c) => ({ message: c.message, author: c.author, date: c.date })),
      contributors, releases, languages,
      fileTree: tree.tree,
      readme, codeFrequency: codeFreq,
      topPullRequests: topPRs, topIssues,
    };

    const res = await fetch(llm.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${llm.apiKey}` },
      body: JSON.stringify({
        model: llm.model,
        messages: [
          { role: "system", content: DOCUMENTARY_SYSTEM_PROMPT },
          { role: "user", content: buildDocumentaryUserMessage(data) },
        ],
        ...(llm.url === OPENAI_URL ? { max_completion_tokens: 3000 } : { max_tokens: 3000 }),
      }),
    });

    if (!res.ok) {
      throw new Error(`The language model provider returned HTTP ${res.status}. Check the configured model and API key.`);
    }

    const json = await res.json();
    const documentary = json?.choices?.[0]?.message?.content;
    if (typeof documentary !== "string" || !documentary.trim()) {
      throw new Error("The language model returned an empty documentary. Please try again.");
    }

    // Cache for 24h
    await cacheDocumentary(owner, repo, documentary);

    return NextResponse.json({ documentary, fromCache: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate the documentary.";
    console.error("[documentary] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
