type AdminLoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const hasError = resolvedParams.error === "1";

  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <div className="card">
        <h1 className="text-3xl font-semibold">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Sign in with your admin account credentials.
        </p>
        {hasError ? <p className="mt-3 text-sm text-rose-500">Invalid username or password.</p> : null}
        <form method="post" action="/api/admin/login" className="mt-6 grid gap-4">
          <label className="text-sm font-semibold" htmlFor="username">
            Username
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
            />
          </label>
          <label className="text-sm font-semibold" htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
            />
          </label>
          <button type="submit" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
