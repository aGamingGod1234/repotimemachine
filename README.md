<div align="center">

![RepoTimeMachine](https://img.shields.io/badge/RepoTimeMachine-ai-ff6b00?style=for-the-badge&logo=github&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Paste a GitHub repo. Watch its history unfold.**

Not commits. Not code. The *documentary*.

[Live Demo](https://repotimemachine.ai) · [Report Bug](https://github.com/SoulSniper-V2/repotimemachine/issues) · [Request Feature](https://github.com/SoulSniper-V2/repotimemachine/issues)

</div>

---

## What is this?

RepoTimeMachine.ai generates cinematic documentaries about GitHub repositories. Paste any `owner/repo` URL and get a structured narrative covering:

- **⏳ The Genesis** — What problem existed, who sparked it, the initial backlash
- **📈 Scale Today** — Stars, forks, real-world impact
- **🔄 Turning Points** — Key moments that changed the project's trajectory, with date pills
- **👥 Characters** — Core contributors, commit counts, first appearances
- **🗺️ Eras** — Distinct phases of the project's lifetime
- **🦋 Butterfly Effect** — One decision that cascaded into everything

Generated from GitHub metadata, up to 100 recent commits, 30 contributors, 30 releases, PRs, and issues. This is a limited sample, not a complete historical archive. The LLM is instructed to mark unsupported historical details as unknown.

## How it works

```
GitHub API (10 data sources)
        ↓
  Metadata → default branch → parallel fetch (commits, contributors,
  releases, file tree, README, languages, code
  frequency, top PRs, top issues)
        ↓
  Structured data → LLM (OpenRouter, OpenAI, or xAI)
        ↓
  Documentary JSON → Rendered with
  neo-brutalist UI components
```

When Redis is configured, results are cached for 24 hours. Without Redis, each request generates a new documentary. Cache outages do not prevent generation.

## Local setup

Use Node.js 24 LTS (see `.nvmrc`) and npm. Clone this repository, then run:

```sh
npm ci
cp .env.example .env.local
```

Set one provider API key and its matching `*_MODEL` value in `.env.local`. Choose a model that supports Chat Completions from the [OpenRouter](https://openrouter.ai/models), [OpenAI](https://developers.openai.com/api/docs/models), or [xAI](https://docs.x.ai/developers/models) catalog. Models are explicit because the old defaults are retired or deprecated: `openrouter/owl-alpha` is unavailable, `grok-3` redirects to a different model, and `gpt-4.1` is deprecated. Existing installations must set a model alongside their provider key. If several provider keys are set, the app selects xAI, then OpenRouter, then OpenAI. Provider usage may incur charges.

`GITHUB_TOKEN` is optional, but authenticated requests have higher [GitHub API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). Keep all credentials server-side in `.env.local` or your hosting environment.

Redis is optional. For shared caching, set both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Existing deployments can keep both `KV_REST_API_URL` and `KV_REST_API_TOKEN`. No local filesystem cache is used, and missing or unavailable Redis does not block requests. A valid cached documentary can be served without a provider key.

```sh
npm run dev
```

Open `http://localhost:3000`, enter `owner/repo` or a GitHub URL, and generate a documentary. Direct links such as `/facebook/react` generate on load. The app reads the repository's actual default branch, including names other than `main` and `master`.

For production:

```sh
npm run build
npm start
```

Use your hosting platform's process manager for persistent operation. The old `scripts/restart.sh` targets its original author's machine and makes a generation request; use the commands above for a portable setup. Builds download Geist fonts from Google, so outbound access to the font service is required. No API keys or Redis service are needed to build.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs these checks on Node.js 24 for pull requests and pushes to `master`. Tests exercise repository parsing, GitHub API responses, cache failures, the documentary route, and rendering with mocked external services; they do not call paid providers. The current dependency versions are locked in `package-lock.json`. TypeScript stays on the latest compatible 6.x release because the ESLint parser requires its compiler API; TypeScript 7.0 does not provide that API. ESLint remains on 9.39.5 because Next's current React, import, and accessibility plugins do not yet declare ESLint 10 compatibility. ESLint 9 is out of upstream support; upgrade the lint stack when those plugins support 10.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Fonts | Geist Sans + Geist Mono |
| LLM | OpenRouter, OpenAI, or xAI |
| Data | GitHub REST API (authenticated) |
| Cache | Optional Upstash Redis (24h TTL; legacy Vercel KV credentials supported) |
| Deploy | Vercel (serverless) |

## Project Structure

```
app/
├── page.tsx                     # Landing page + input form
├── layout.tsx                   # Root layout (fonts, cream bg)
├── [owner]/[repo]/page.tsx      # Dynamic route → repotimemachine.ai/facebook/react
├── api/documentary/route.ts     # GitHub fetch → LLM → documentary
└── components/
    ├── home-documentary.tsx     # Input, example buttons, generation flow
    └── documentary-output.tsx   # Timeline, date pills, stat badges, era cards
lib/
├── github-client.ts             # 10 parallel GitHub API calls
├── documentary-prompt.ts        # LLM system prompt + user message template
└── parse-github-repo.ts         # URL parser (owner/repo, full URL, etc.)
```

## Features

- **Neo-brutalist UI** — Thick borders, offset shadows, cream backgrounds, warm orange accents
- **Documentary renderer** — Custom parser that turns LLM output into structured visual components
- **URL routing** — `repotimemachine.ai/facebook/react` works as a direct link
- **7 example repos** — Linux, React, Next.js, VS Code, Go, Rust, TypeScript
- **24h shared cache** — Optional Redis cache avoids repeated API calls for the same repo
- **JSON responses** — The client displays the documentary after generation completes

## License

MIT
