"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

const floatingEmojiItems = [
  { icon: "\u{1F6AB}", left: "8vw", top: "10vh" },
  { icon: "\u{1F512}", left: "78vw", top: "16vh" },
  { icon: "\u{1F6E1}\uFE0F", left: "10vw", top: "72vh" },
  { icon: "\u{1F46E}", left: "76vw", top: "68vh" },
  { icon: "\u{1F645}", left: "44vw", top: "84vh" }
] as const;

export default function AccessDeniedPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen h-[100dvh] w-full bg-[#0d0612] overflow-hidden relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #ccff00 0%, transparent 70%)",
            left: mousePosition.x - 400,
            top: mousePosition.y - 400
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Floating emojis */}
      {floatingEmojiItems.map((item, i) => (
        <motion.div
          key={`${item.icon}-${i}`}
          className="absolute select-none pointer-events-none text-[clamp(2rem,8.5vw,2.75rem)] opacity-95 drop-shadow-[0_0_14px_rgba(204,255,0,0.55)]"
          style={{ left: item.left, top: item.top }}
          animate={{ y: [0, -20, 0], rotate: [0, 12, -12, 0], scale: [1, 1.18, 1] }}
          transition={{ duration: 2.2 + i * 0.25, repeat: Infinity, delay: i * 0.2 }}
        >
          {item.icon}
        </motion.div>
      ))}

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-4 py-4 sm:gap-4 sm:py-6">
        {/* Main lock animation */}
        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {/* Bouncing lock */}
          <motion.div
            className="h-[clamp(104px,30vw,160px)] w-[clamp(104px,30vw,160px)] rounded-full bg-gradient-to-br from-[#ccff00] to-[#a8d600] flex items-center justify-center shadow-[0_0_60px_rgba(204,255,0,0.5)]"
            animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
            transition={{
              y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 2, repeat: Infinity }
            }}
          >
            <Lock className="h-[clamp(50px,14vw,80px)] w-[clamp(50px,14vw,80px)] text-[#0d0612]" strokeWidth={2.5} />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="max-w-[95vw] text-center text-[clamp(2.25rem,13vw,4.5rem)] font-bold leading-[0.92] text-white"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <span className="text-[#ccff00]">ACCESS</span>{" "}
          <motion.span
            animate={{ color: ["#ff006e", "#ffffff", "#ff006e"] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            DENIED
          </motion.span>
        </motion.h1>

        <motion.p
          className="max-w-[92vw] text-center text-[clamp(0.95rem,4.8vw,1.5rem)] text-[var(--v2-text-secondary)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: "spring" }}
        >
          You do not have access to this page.
        </motion.p>
      </div>
    </div>
  );
}
