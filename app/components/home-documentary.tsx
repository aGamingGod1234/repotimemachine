'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { parseGitHubRepoInput } from '@/lib/parse-github-repo';
import DocumentaryOutput from '@/app/components/documentary-output';

interface DocumentaryData {
  raw: string;
}

interface HomeDocumentaryProps {
  initialInput?: string;
  autoSubmit?: boolean;
}

export default function HomeDocumentary({ initialInput, autoSubmit }: HomeDocumentaryProps) {
  const [repoInput, setRepoInput] = useState(initialInput || '');
  const [loading, setLoading] = useState(false);
  const [documentary, setDocumentary] = useState<DocumentaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const requestInFlight = useRef(false);

  const handleGenerate = useCallback(async (value: string) => {
    const input = value.trim();
    if (!input || requestInFlight.current) return;

    const parsed = parseGitHubRepoInput(input);
    if (!parsed) {
      setError('Invalid repo. Use "owner/repo" or a full GitHub URL.');
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    setError(null);
    setDocumentary(null);

    setRepoInput(input);

    try {
      const res = await fetch('/api/documentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate');
      }

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      const text = result.documentary || 'Failed to generate.';
      setDocumentary({ raw: text });

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const input = initialInput && autoSubmit
      ? initialInput
      : new URLSearchParams(window.location.search).get('q');
    if (input) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Direct links initiate the same asynchronous request as the form.
      void handleGenerate(input);
    }
  }, [initialInput, autoSubmit, handleGenerate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleGenerate(repoInput);
  };

  const exampleRepos = [
    { label: 'Linux', value: 'torvalds/linux' },
    { label: 'React', value: 'facebook/react' },
    { label: 'Next.js', value: 'vercel/next.js' },
    { label: 'VS Code', value: 'microsoft/vscode' },
    { label: 'Go', value: 'golang/go' },
    { label: 'Rust', value: 'rust-lang/rust' },
    { label: 'TypeScript', value: 'microsoft/TypeScript' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[720px]">
        <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-[#1a1a1a] leading-[1.15] mb-2 text-center tracking-tight">
          Paste a GitHub repo and watch its history unfold
        </h1>
        <p className="text-[#666] text-center mb-8 text-[clamp(0.9rem,1.5vw,1.05rem)]">
          Cinematic documentaries generated from commit history, contributors &amp; releases.
        </p>

        {/* Input */}
        <div className="relative flex gap-3 mb-3">
          <div className="relative flex-1">
            <div className="absolute inset-0 bg-[#1a1a1a] rounded-xl translate-x-1 translate-y-1" />
            <input
              ref={inputRef}
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="owner/repo or GitHub URL"
              className="relative w-full px-5 py-3.5 bg-white text-[#1a1a1a] rounded-xl border-2 border-[#1a1a1a] text-[15px] outline-none placeholder:text-[#aaa] focus:border-[#ff6b00] transition-colors"
            />
          </div>
          <button
            onClick={() => handleGenerate(repoInput)}
            disabled={loading}
            className="relative group shrink-0"
          >
            <div className="absolute inset-0 bg-[#1a1a1a] rounded-xl translate-x-1 translate-y-1 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
            <div className="relative px-6 py-3.5 bg-[#ff6b00] text-white rounded-xl border-2 border-[#1a1a1a] font-semibold text-[15px] group-hover:bg-[#ff8533] transition-colors disabled:opacity-50">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing
                </span>
              ) : 'Generate'}
            </div>
          </button>
        </div>

        {/* Examples */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <span className="text-sm text-[#999]">Try:</span>
          {exampleRepos.map((repo) => (
            <button
              key={repo.value}
              onClick={() => {
                setRepoInput(repo.value);
                handleGenerate(repo.value);
              }}
              disabled={loading}
              className="px-3 py-1 text-sm border-2 border-[#1a1a1a] rounded-lg bg-white text-[#1a1a1a] hover:bg-[#fff4da] hover:shadow-[2px_2px_0px_#1a1a1a] transition-all disabled:opacity-50 cursor-pointer"
            >
              {repo.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && !documentary && (
          <div className="mt-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[#666] text-sm">
              Analyzing commits, contributors, releases &amp; history...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border-2 border-[#1a1a1a] rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {documentary && (
          <div ref={resultRef} className="mt-10">
            <DocumentaryOutput raw={documentary.raw} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}
