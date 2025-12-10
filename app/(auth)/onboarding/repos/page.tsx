import RepoSelectionClient from './RepoSelectionClient';

export default function RepoSelectionPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex max-w-6xl flex-col px-6 py-12 lg:px-10">
        <div className="flex gap-3 mb-2 text-[11px] text-slate-500">
          <span className="text-slate-400">1 · CLI key</span>
          <span className="text-slate-400">2 · Install CLI</span>
          <span className="text-sky-400 font-medium">3 · Choose repos</span>
          <span className="text-slate-500">4 · First sync</span>
        </div>
        <header className="flex flex-col mb-10 gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Choose your repos
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              DevImpact works best when it sees your real day-to-day work.
              Select the repos where you open PRs and review code most often.
            </p>
          </div>
        </header>

        <RepoSelectionClient />
      </main>
    </div>
  );
}
