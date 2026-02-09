import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        ink: {
          50: "#f6f7fb",
          100: "#e5e7f1",
          200: "#c8cce0",
          300: "#a6aecf",
          400: "#7f89b7",
          500: "#636d9f",
          600: "#4e567f",
          700: "#3e4567",
          800: "#2f354d",
          900: "#202437"
        },
        neon: {
          400: "#33ffb5",
          500: "#16eaa1"
        }
      }
    }
  },
  plugins: []
};

export default config;
