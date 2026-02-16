import type { ReactNode } from "react";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import ThemeToggle from "../components/theme-toggle";
import "./globals.css";

const themeScript = `
  (function () {
    try {
      var stored = localStorage.getItem("theme");
      var theme = stored || "dark";
      if (theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch (e) {}
  })();
`;

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export const metadata = {
  title: "Club Genie",
  description: "Automation for club sessions"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <body className="page-shell font-sans" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeToggle className="fixed right-4 top-4 z-40 sm:right-6 sm:top-6" />
        {children}
      </body>
    </html>
  );
}
