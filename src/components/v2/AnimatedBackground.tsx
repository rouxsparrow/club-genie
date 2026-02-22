"use client";

import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div className="v2-mesh-bg">
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
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(var(--v2-primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--v2-primary) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
