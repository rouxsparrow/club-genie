import Link from "next/link";
import { CalendarDays, ShieldCheck, Sparkles } from "../components/icons";
import AnimatedBackground from "../components/v2/AnimatedBackground";
import "./globals-v2.css";

export default function HomePage() {
  return (
    <div className="v2-page v2-ios-safari-safe">
      <AnimatedBackground />

      <main className="v2-container py-10 sm:py-16">
        <header className="v2-header !px-0 pt-4 sm:pt-6">
          <div className="v2-logo">
            <Sparkles className="mr-2 inline-block text-[var(--v2-primary)]" size={22} />
            <span>Club</span>
            <span className="v2-logo-accent">Genie</span>
          </div>
        </header>

        <section className="v2-card mt-4 sm:mt-6">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            <span className="text-[var(--v2-primary)]">Taichi Badminton Club </span>Sessions Management
          </h1>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/sessions" className="v2-dialog-btn v2-dialog-btn-primary">
              <CalendarDays size={16} />
              View Sessions
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--v2-border)] px-5 text-sm font-semibold text-[var(--v2-text-primary)] transition hover:border-[var(--v2-border-strong)] sm:h-12"
            >
              <ShieldCheck size={16} />
              Admin Login
            </Link>
            {process.env.NODE_ENV === "development" ? (
              <Link
                href="/sessions-legacy"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--v2-border)] px-5 text-sm font-semibold text-[var(--v2-text-primary)] transition hover:border-[var(--v2-border-strong)] sm:h-12"
              >
                Legacy Sessions
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
