import HomeDocumentary from '@/app/components/home-documentary';
import { isValidGitHubRepoPath, normalizeRepoSegment } from '@/lib/parse-github-repo';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepoPage({ params }: PageProps) {
  const { owner, repo } = await params;

  if (!isValidGitHubRepoPath(owner, repo)) notFound();

  const repoNorm = normalizeRepoSegment(repo);
  const initialInput = `${owner}/${repoNorm}`;

  return (
    <main className="flex-1 w-full">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <HomeDocumentary initialInput={initialInput} autoSubmit />
        <div className="mt-12 text-center text-xs text-gray-400 pb-8">
          <p>Repo Time Machine — Every repository has a story.</p>
        </div>
      </div>
    </main>
  );
}
