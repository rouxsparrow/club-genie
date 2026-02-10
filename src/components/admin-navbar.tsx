"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type AdminNavbarProps = {
  currentPath: "/sessions" | "/admin";
  className?: string;
};

export default function AdminNavbar({ currentPath, className }: AdminNavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include"
    });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <nav className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Link
        href="/sessions"
        className={`rounded-full px-4 py-2 text-sm font-semibold ${
          currentPath === "/sessions"
            ? "bg-emerald-500 text-slate-900"
            : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
        }`}
      >
        Sessions
      </Link>
      <Link
        href="/admin"
        className={`rounded-full px-4 py-2 text-sm font-semibold ${
          currentPath === "/admin"
            ? "bg-emerald-500 text-slate-900"
            : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
        }`}
      >
        Admin
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
      >
        Log out
      </button>
    </nav>
  );
}
