"use client";

import { useState } from "react";
import { getAvatarFallbackClass, getInitials } from "../lib/player-avatar";

type PlayerAvatarCircleProps = {
  name: string;
  avatarUrl?: string | null;
  sizeClass?: string;
  className?: string;
};

export default function PlayerAvatarCircle({ name, avatarUrl, sizeClass = "h-8 w-8 text-xs", className }: PlayerAvatarCircleProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageFailed;

  if (showImage) {
    return (
      <span className={`inline-flex shrink-0 overflow-hidden rounded-full border border-slate-200/80 dark:border-ink-700/60 ${sizeClass} ${className ?? ""}`}>
        <img
          src={avatarUrl as string}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200/80 font-semibold uppercase tracking-wide dark:border-ink-700/60 ${getAvatarFallbackClass(
        name
      )} ${sizeClass} ${className ?? ""}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
