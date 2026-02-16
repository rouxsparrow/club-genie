export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="card">
        <h1 className="text-4xl font-semibold">Club Genie</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-300">
          Taichi Badminton Club Sessions Management.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/sessions"
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            View Sessions
          </a>
          <a
            href="/admin/login"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          >
            Admin Login
          </a>
        </div>
      </div>
    </main>
  );
}
