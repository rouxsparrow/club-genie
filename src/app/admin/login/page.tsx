type AdminLoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const errorCode = resolvedParams.error ?? null;
  const hasInvalidCreds = errorCode === "1";
  const hasDbSchemaError = errorCode === "db_schema";
  const hasBreakglassConfigError = errorCode === "breakglass_config";
  const hasServerError = errorCode === "server";

  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <div className="card">
        <h1 className="text-3xl font-semibold">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Sign in with your admin account credentials.
        </p>
        {hasInvalidCreds ? <p className="mt-3 text-sm text-rose-500">Invalid username or password.</p> : null}
        {hasBreakglassConfigError ? (
          <p className="mt-3 text-sm text-rose-500">
            Break-glass is enabled but not configured. Set both <code>ADMIN_BREAKGLASS_USERNAME</code> and{" "}
            <code>ADMIN_BREAKGLASS_PASSWORD</code> (and keep <code>ENABLE_ADMIN_BREAKGLASS=true</code>) to recover.
          </p>
        ) : null}
        {hasDbSchemaError ? (
          <p className="mt-3 text-sm text-rose-500">
            This database is missing the <code>admin_users</code> table. Apply the Supabase migrations/seed for this app,
            or enable break-glass login to recover.
          </p>
        ) : null}
        {hasServerError ? (
          <p className="mt-3 text-sm text-rose-500">
            Server could not query <code>admin_users</code>. Double-check that <code>SUPABASE_URL</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> are set and belong to the same Supabase project (common issue right
            after switching to a new DB).
          </p>
        ) : null}
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
