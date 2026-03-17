"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type AnimatedBackgroundProps = {
  mobileSafe?: boolean;
};

export default function AnimatedBackground({ mobileSafe = false }: AnimatedBackgroundProps) {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    if (!mobileSafe || typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
    const syncMode = () => setIsCoarsePointer(mediaQuery.matches);
    syncMode();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMode);
      return () => mediaQuery.removeEventListener("change", syncMode);
    }
    mediaQuery.addListener(syncMode);
    return () => mediaQuery.removeListener(syncMode);
  }, [mobileSafe]);

  if (mobileSafe && isCoarsePointer) {
    return (
      <div className="v2-mesh-bg v2-mesh-bg-static" aria-hidden="true">
        <div className="v2-mesh-gradient v2-mesh-gradient-static" />
        <div className="v2-mesh-grid" />
      </div>
    );
  }

  return (
    <div className="v2-mesh-bg" aria-hidden="true">
      {/* Animated gradient overlay */}
      <motion.div 
        className="v2-mesh-gradient"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      
      {/* Floating blobs */}
      <motion.div 
        className="v2-mesh-blob v2-mesh-blob-1"
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -40, 60, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 15,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      
      <motion.div 
        className="v2-mesh-blob v2-mesh-blob-2"
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 50, -40, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{
          duration: 18,
          ease: "easeInOut",
          repeat: Infinity,
          delay: 2,
        }}
      />
      
      <motion.div 
        className="v2-mesh-blob v2-mesh-blob-3"
        animate={{
          x: [0, 40, -50, 0],
          y: [0, -60, 30, 0],
          scale: [1, 1.15, 0.85, 1],
        }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Infinity,
          delay: 4,
        }}
      />
      
      {/* Grid pattern overlay */}
      <div className="v2-mesh-grid" />
    </div>
  );
}
