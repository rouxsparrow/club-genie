export default function AccessDeniedPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <div className="card">
        <h1 className="text-3xl font-semibold">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          This link is missing or no longer valid. Ask the admin for a fresh invite.
        </p>
      </div>
    </main>
  );
}
