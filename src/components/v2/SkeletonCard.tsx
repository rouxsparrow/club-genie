"use client";

import { motion } from "framer-motion";

interface SkeletonCardProps {
  index: number;
}

export default function SkeletonCard({ index }: SkeletonCardProps) {
  return (
    <motion.div
      className="v2-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: [0.34, 1.56, 0.64, 1] 
      }}
    >
      <div className="flex items-start gap-4">
        {/* Date Badge Skeleton */}
        <div className="shrink-0">
          <div className="w-[64px] h-[80px] rounded-2xl bg-[var(--v2-bg-card-hover)] animate-pulse" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Time & Status Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--v2-bg-card-hover)] animate-pulse" />
              <div className="w-32 h-5 rounded-lg bg-[var(--v2-bg-card-hover)] animate-pulse" />
            </div>
            <div className="w-16 h-6 rounded-full bg-[var(--v2-bg-card-hover)] animate-pulse" />
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[var(--v2-bg-card-hover)] animate-pulse" />
            <div className="w-48 h-4 rounded-lg bg-[var(--v2-bg-card-hover)] animate-pulse" />
          </div>

          {/* Courts */}
          <div className="flex gap-2">
            <div className="w-24 h-6 rounded-xl bg-[var(--v2-bg-card-hover)] animate-pulse" />
            <div className="w-24 h-6 rounded-xl bg-[var(--v2-bg-card-hover)] animate-pulse" />
          </div>

          {/* Avatars & Button Row */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--v2-border)]">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-[var(--v2-bg-card-hover)] animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <div className="w-28 h-12 rounded-full bg-[var(--v2-bg-card-hover)] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </motion.div>
  );
}
