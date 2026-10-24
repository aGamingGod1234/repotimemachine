import Link from 'next/link';
import HomeDocumentary from './components/home-documentary';

export default function Page() {
  return (
    <>
      <header className="sticky top-0 bg-[#FFFDF8] border-b-[3px] border-gray-900 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <span className="text-xl font-bold text-gray-900 tracking-tight">Repo</span>
                <span className="text-xl font-bold text-[#FE4A60] tracking-tight">Time</span>
                <span className="text-xl font-bold text-gray-900 tracking-tight">Machine</span>
              </Link>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/" className="font-semibold transition-transform hover:-translate-y-0.5 text-[#FE4A60]">
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          <HomeDocumentary />
          <div className="mt-12 text-center text-xs text-gray-400 pb-8">
            <p>Repo Time Machine — Every repository has a story.</p>
          </div>
        </div>
      </main>
    </>
  );
}
