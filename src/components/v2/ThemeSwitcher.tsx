"use client";

import { motion } from "framer-motion";

export type Theme = "lime" | "ocean";

interface ThemeSwitcherProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  return (
    <div className="v2-theme-switch">
      <motion.button
        className={`v2-theme-option v2-theme-lime ${currentTheme === "lime" ? "active" : ""}`}
        onClick={() => onThemeChange("lime")}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Neon Lime Theme"
      >
        <span className="v2-theme-indicator" />
      </motion.button>
      
      <motion.button
        className={`v2-theme-option v2-theme-ocean ${currentTheme === "ocean" ? "active" : ""}`}
        onClick={() => onThemeChange("ocean")}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Ocean Pearl Theme"
      >
        <span className="v2-theme-indicator" />
      </motion.button>
    </div>
  );
}
