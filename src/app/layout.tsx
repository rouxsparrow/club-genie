import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const themeScript = `
  (function () {
    try {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } catch (e) {}
  })();
`;

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export const metadata = {
  title: "Club Genie",
  description: "Automation for club sessions"
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0612" },
    { media: "(prefers-color-scheme: light)", color: "#0d0612" }
  ],
  viewportFit: "cover",
  colorScheme: "dark"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <body className="page-shell relative font-sans" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
