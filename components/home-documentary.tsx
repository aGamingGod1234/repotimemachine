"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Navbar } from "@/components/navbar";
import { DocumentaryFlavorText } from "@/components/loading-text";
import { parseGitHubRepoInput } from "@/lib/parse-github-repo";

const EXAMPLE_REPOS = [
  { owner: "facebook", repo: "react", label: "React" },
  { owner: "vercel", repo: "next.js", label: "Next.js" },
  { owner: "rust-lang", repo: "rust", label: "Rust" },
  { owner: "torvalds", repo: "linux", label: "Linux" },
  { owner: "microsoft", repo: "vscode", label: "VS Code" },
  { owner: "golang", repo: "go", label: "Go" },
];

export function DocumentaryHome({
  initialRepoInput,
  autoSubmit,
  initialDocumentary,
  initialOwner,
  initialRepo,
}: {
  initialRepoInput?: string;
  autoSubmit?: boolean;
  initialDocumentary?: string;
  initialOwner?: string;
  initialRepo?: string;
}) {
  const [repoInput, setRepoInput] = useState(initialRepoInput ?? "");
  const [loading, setLoading] = useState(false);
  const [documentary, setDocumentary] = useState<string | null>(initialDocumentary ?? null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(initialOwner ?? null);
  const [repo, setRepo] = useState<string | null>(initialRepo ?? null);

  // Parse documentary into sections for tabbed display
  const sections = documentary ? parseSections(documentary) : null;
  const sectionKeys = sections ? Object.keys(sections) : [];
  const [activeSection, setActiveSection] = useState(sectionKeys[0] ?? "");

  const handleGenerate = useCallback(async (input: string) => {
    const parsed = parseGitHubRepoInput(input);
    if (!parsed) {
      setError("Please enter a valid GitHub repository (e.g., facebook/react or https://github.com/facebook/react)");
      return;
    }

    setLoading(true);
    setError(null);
    setDocumentary(null);

    try {
      const res = await fetch("/api/documentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setDocumentary(data.documentary);
      setActiveSection(Object.keys(parseSections(data.documentary))[0] ?? "");
      setFromCache(data.fromCache ?? false);
      setOwner(parsed.owner);
      setRepo(parsed.repo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-submit on mount for direct URL access
  useEffect(() => {
    if (autoSubmit && initialRepoInput) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Direct links initiate the same asynchronous request as the form.
      void handleGenerate(initialRepoInput);
    }
  }, [autoSubmit, initialRepoInput, handleGenerate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      handleGenerate(repoInput.trim());
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          {/* Hero — only show when no result */}
          {!documentary && !loading && (
            <div className="mb-10 text-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
                Repo Time Machine
              </h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto mt-4">
                Paste any GitHub repository and discover its story.
              </p>
              <p className="text-gray-500 text-base max-w-2xl mx-auto mt-1">
                Not commits and code. The documentary.
              </p>
            </div>
          )}

          {/* Input Form */}
          <div className="relative max-w-2xl mx-auto">
            <div className="w-full h-full absolute inset-0 bg-gray-900 rounded-xl translate-y-2 translate-x-2" />
            <div className="rounded-xl relative z-20 p-6 sm:p-8 border-[3px] border-gray-900 bg-[#fff4da]">
              <form onSubmit={handleSubmit} className="flex md:flex-row flex-col w-full gap-4">
                <div className="relative w-full">
                  <div className="w-full h-full rounded bg-gray-900 translate-y-1 translate-x-1 absolute inset-0 z-10" />
                  <input
                    type="text"
                    placeholder="https://github.com/facebook/react"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    required
                    className="border-[3px] w-full relative z-20 border-gray-900 bg-white placeholder-gray-500 text-base sm:text-lg font-medium focus:outline-none py-3 sm:py-3.5 px-5 sm:px-6 rounded text-gray-900"
                  />
                </div>
                <div className="relative flex-shrink-0 group">
                  <div className="w-full h-full rounded bg-gray-800 translate-y-1 translate-x-1 absolute inset-0 z-10" />
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3 sm:py-3.5 rounded px-6 group-hover:-translate-y-px group-hover:-translate-x-px ease-out duration-300 z-20 relative w-full border-[3px] border-gray-900 font-medium bg-[#ffc480] tracking-wide text-base sm:text-lg flex-shrink-0 text-gray-900 disabled:opacity-60"
                  >
                    {loading ? "Generating..." : "Generate Documentary"}
                  </button>
                </div>
              </form>

              <div className="mt-4">
                <p className="opacity-70 mb-2 text-sm">Try example repos:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_REPOS.map((ex) => (
                    <button
                      key={`${ex.owner}/${ex.repo}`}
                      type="button"
                      onClick={() => {
                        const val = `${ex.owner}/${ex.repo}`;
                        setRepoInput(val);
                        handleGenerate(val);
                      }}
                      disabled={loading}
                      className="px-3 sm:px-4 py-1 bg-[#EBDBB7] hover:bg-[#FFC480] text-gray-900 rounded transition-colors duration-200 border-[3px] border-gray-900 relative hover:-translate-y-px hover:-translate-x-px text-sm font-medium disabled:opacity-60"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 max-w-2xl mx-auto p-4 bg-red-50 border-[3px] border-red-300 rounded-xl text-red-800">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="relative mt-10 max-w-4xl mx-auto">
              <div className="w-full h-full absolute inset-0 bg-black rounded-xl translate-y-2 translate-x-2" />
              <div className="bg-[#fafafa] rounded-xl border-[3px] border-gray-900 p-6 sm:p-8 relative z-20 flex flex-col items-center space-y-4">
                <div className="loader border-8 border-[#fff4da] border-t-8 border-t-[#ffc480] rounded-full w-14 h-14 sm:w-16 sm:h-16 animate-spin" />
                <p className="text-base sm:text-lg font-bold text-gray-900">Analyzing repository history...</p>
                <DocumentaryFlavorText />
              </div>
            </div>
          )}

          {/* Documentary Result */}
          {documentary && sections && sectionKeys.length > 0 && (
            <div className="mt-10 sm:mt-12 max-w-4xl mx-auto">
              {/* Title */}
              <div className="mb-6 sm:mb-8 text-center">
                {owner && repo && (
                  <div className="inline-flex items-center gap-2 bg-[#fff4da] border-[3px] border-gray-900 rounded-full px-4 py-1.5 text-sm font-medium text-gray-900 mb-3">
                    {fromCache && <span className="text-xs text-gray-500">(cached)</span>}
                  </div>
                )}
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                  {owner && repo ? `${owner}/${repo}` : "Documentary"}
                </h2>
              </div>

              {/* Section Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 justify-center">
                {sectionKeys.map((key) => {
                  const info = SECTION_META[key] || { emoji: "📄", label: key };
                  const isActive = activeSection === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-[3px] font-medium text-xs sm:text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-gray-900 text-white border-gray-900 -translate-y-0.5"
                          : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50 hover:-translate-y-0.5"
                      }`}
                    >
                      {info.emoji} {info.label}
                    </button>
                  );
                })}
              </div>

              {/* Active Section */}
              {sectionKeys.map((key) => {
                if (key !== activeSection) return null;
                const info = SECTION_META[key] || { emoji: "📄", label: key };
                return (
                  <div key={key} className="relative">
                    <div className="w-full h-full absolute inset-0 bg-gray-900 rounded-xl translate-y-2 translate-x-2" />
                    <div className="bg-[#fafafa] rounded-xl border-[3px] border-gray-900 p-5 sm:p-8 relative z-20">
                      <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-li:text-gray-700 prose-li:leading-relaxed prose-a:text-[#FE4A60]">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mb-4 sm:mb-6 pb-3 border-b-2 border-gray-200">
                                {info.emoji} {children}
                              </h1>
                            ),
                            p: ({ children }) => (
                              <p className="text-gray-700 leading-relaxed mb-4 text-sm sm:text-base">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-bold text-gray-900">{children}</strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="text-gray-700 leading-relaxed text-sm sm:text-base">{children}</li>
                            ),
                            hr: () => <hr className="border-gray-300 my-6" />,
                          }}
                        >
                          {sections[key]}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Share / Actions */}
              <div className="mt-6 sm:mt-8 flex justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/${owner}/${repo}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="relative inline-block group"
                >
                  <div className="w-full h-full rounded bg-gray-900 translate-y-1 translate-x-1 absolute inset-0" />
                  <span className="inline-flex items-center px-4 py-2 bg-[#ffc480] border-[3px] border-gray-900 text-gray-900 rounded group-hover:-translate-y-px group-hover:-translate-x-px transition-transform relative z-10 font-medium text-sm">
                    Share Documentary
                  </span>
                </button>
                {owner && repo && (
                  <a
                    href={`https://github.com/${owner}/${repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative inline-block group"
                  >
                    <div className="w-full h-full rounded bg-gray-900 translate-y-1 translate-x-1 absolute inset-0" />
                    <span className="inline-flex items-center px-4 py-2 bg-[#a0e8a0] border-[3px] border-gray-900 text-gray-900 rounded group-hover:-translate-y-px group-hover:-translate-x-px transition-transform relative z-10 font-medium text-sm">
                      View on GitHub →
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-xs text-gray-400 pb-8">
            <p>Repo Time Machine — Every repository has a story.</p>
          </div>
        </div>
      </main>
    </>
  );
}

// ── Helpers ──

const SECTION_META: Record<string, { emoji: string; label: string }> = {
  "The Story": { emoji: "📖", label: "The Story" },
  "The Turning Points": { emoji: "⚡", label: "Turning Points" },
  "The Characters": { emoji: "🎭", label: "Characters" },
  "The Eras": { emoji: "🏛️", label: "Eras" },
  "The Butterfly Effect": { emoji: "🦋", label: "Butterfly Effect" },
};

function parseSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = markdown.split("\n");
  let currentSection = "The Story";
  let currentContent: string[] = [];
  const knownHeaders = Object.keys(SECTION_META);

  for (const line of lines) {
    const headerMatch = line.match(/^#\s+(.+)$/);
    if (headerMatch) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join("\n").trim();
      }
      const headerText = headerMatch[1].trim().replace(/^[^\w]*/, "").trim();
      const matched = knownHeaders.find(
        (h) => headerText.includes(h) || h.includes(headerText)
      );
      currentSection = matched || headerText;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join("\n").trim();
  }

  if (Object.keys(sections).length === 0) {
    sections["The Story"] = markdown;
  }

  return sections;
}
