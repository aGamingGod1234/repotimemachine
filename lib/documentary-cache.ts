import { Redis } from "@upstash/redis";

function redisClient(): Redis | null {
  // Existing Vercel KV integrations still provide the KV_* credential pair.
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (upstashUrl && upstashToken) return new Redis({ url: upstashUrl, token: upstashToken });

  const kvUrl = process.env.KV_REST_API_URL?.trim();
  const kvToken = process.env.KV_REST_API_TOKEN?.trim();
  return kvUrl && kvToken ? new Redis({ url: kvUrl, token: kvToken }) : null;
}

function cacheKey(owner: string, repo: string): string {
  return `doc:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export async function readDocumentary(owner: string, repo: string): Promise<string | null> {
  try {
    const cached = await redisClient()?.get<unknown>(cacheKey(owner, repo));
    return typeof cached === "string" && cached.trim() ? cached : null;
  } catch {
    // A cache outage must not prevent an otherwise valid generation request.
    console.warn("[documentary] Cache read failed; continuing without cached data.");
    return null;
  }
}

export async function cacheDocumentary(owner: string, repo: string, documentary: string): Promise<void> {
  try {
    await redisClient()?.set(cacheKey(owner, repo), documentary, { ex: 86400 });
  } catch {
    console.warn("[documentary] Cache write failed; returning the generated documentary.");
  }
}
