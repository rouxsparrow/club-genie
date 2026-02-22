"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, Pencil, Trash2 } from "lucide-react";

export interface Participant {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Court {
  id: string;
  label: string;
  timeRange: string;
}

export interface Session {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  status: "open" | "full" | "closed" | "draft";
  participantCount: number;
  maxParticipants?: number;
  participants: Participant[];
  courts: Court[];
  isJoined: boolean;
  joinedPlayerIds?: string[];
  guestCount?: number;
  splitwiseStatus?: string | null;
}

interface SessionCardProps {
  session: Session;
  index: number;
  onJoinWithdraw: (session: Session) => void;
  showAdminActions?: boolean;
  showSplitwiseStatus?: boolean;
  showDeleteAction?: boolean;
  onEdit?: (session: Session) => void;
  onDelete?: (session: Session) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: Date): { day: string; month: string; weekday: string } {
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" })
  };
}

function formatTime(timeStr: string): { time: string; period?: string } {
  const parts = timeStr.split(" ");
  if (parts.length === 2) {
    return { time: parts[0], period: parts[1] };
  }
  return { time: timeStr };
}

function getSplitwiseBadgeClass(splitwiseStatus: string | null | undefined) {
  if (splitwiseStatus === "CREATED") return "v2-splitwise-created";
  if (splitwiseStatus === "FAILED") return "v2-splitwise-failed";
  return "v2-splitwise-pending";
}

export default function SessionCard({
  session,
  index,
  onJoinWithdraw,
  showAdminActions = false,
  showSplitwiseStatus = false,
  showDeleteAction = false,
  onEdit,
  onDelete
}: SessionCardProps) {
  const date = formatDate(session.date);
  const startTimeParts = formatTime(session.startTime);
  const endTimeParts = formatTime(session.endTime);

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.34, 1.56, 0.64, 1] as const
      }
    }
  };

  const getStatusConfig = () => {
    switch (session.status) {
      case "open":
        return { label: "Open", className: "v2-status-open", dot: true };
      case "full":
        return { label: "Full", className: "v2-status-full", dot: false };
      case "closed":
        return { label: "Closed", className: "v2-status-closed", dot: false };
      case "draft":
        return { label: "Draft", className: "v2-status-draft", dot: false };
    }
  };

  const status = getStatusConfig();
  const displayParticipants = session.participants.slice(0, 9);
  const firstRow = displayParticipants.slice(0, 5);
  const secondRow = displayParticipants.slice(5);
  const playerCountText = `${session.participantCount} player${session.participantCount !== 1 ? "s" : ""} joined${
    (session.guestCount ?? 0) > 0 ? ` | Guests x${session.guestCount}` : ""
  }`;
  const isJoinDisabled = session.status === "closed" || session.status === "full" || session.status === "draft";
  const splitwiseLabel = session.splitwiseStatus ?? "PENDING";

  return (
    <motion.article className="v2-card v2-card-grid" variants={cardVariants} initial="hidden" animate="visible" layout>
      <motion.div className="v2-date-area" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400 }}>
        <div className="v2-date-badge">
          <span className="v2-date-day">{date.day}</span>
          <span className="v2-date-month">{date.month}</span>
          <span className="v2-date-weekday">{date.weekday}</span>
        </div>
      </motion.div>

      <div className="v2-content-area">
        <div className="v2-time-status-row">
          <div className="v2-time-display-split">
            <Clock size={14} className="mt-1 shrink-0 text-[var(--v2-primary)] opacity-80" />
            <div className="hidden items-center gap-2 text-lg font-semibold sm:flex">
              <span>
                {startTimeParts.time} {startTimeParts.period}
              </span>
              <span className="text-[var(--v2-text-muted)]">-</span>
              <span>
                {endTimeParts.time} {endTimeParts.period}
              </span>
            </div>
            <div className="v2-time-split-layout sm:hidden">
              <div className="v2-time-values-row">
                <span className="v2-time-value">{startTimeParts.time}</span>
                <span className="v2-time-split-separator">-</span>
                <span className="v2-time-value">{endTimeParts.time}</span>
              </div>
              {(startTimeParts.period || endTimeParts.period) && (
                <div className="v2-time-periods-row">
                  <span className="v2-time-period">{startTimeParts.period}</span>
                  <span className="v2-time-period-spacer"></span>
                  <span className="v2-time-period">{endTimeParts.period}</span>
                </div>
              )}
            </div>
          </div>
          <span className={`v2-status ${status.className}`}>
            {status.dot && <span className="v2-status-dot" />}
            <span className="v2-status-text">{status.label}</span>
          </span>
        </div>

        <div className="v2-location-wrap">
          <MapPin size={14} className="v2-location-icon mt-0.5 shrink-0" />
          <span className="v2-location-text">{session.location}</span>
        </div>

        <div className="v2-courts-row">
          <div className="v2-courts">
            {session.courts.map((court) => (
              <motion.span key={court.id} className="v2-court-tag text-[10px] sm:text-xs" whileHover={{ scale: 1.05 }}>
                {court.label} - {court.timeRange}
              </motion.span>
            ))}
          </div>
          {showAdminActions ? (
            <div className="v2-courts-admin-actions">
              {onEdit ? (
                <button type="button" className="v2-admin-chip" onClick={() => onEdit(session)}>
                  <Pencil size={13} />
                  Edit
                </button>
              ) : null}
              {showDeleteAction && onDelete ? (
                <button type="button" className="v2-admin-chip v2-admin-chip-danger" onClick={() => onDelete(session)}>
                  <Trash2 size={13} />
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="v2-avatar-action-area">
        <div className="v2-avatar-stack-wrapper">
          <div className="v2-avatar-stack-row">
            {firstRow.map((p, i) => (
              <motion.div
                key={p.id}
                className="v2-avatar-stack-item"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.08 + i * 0.03 + 0.2, type: "spring", stiffness: 500, damping: 25 }}
                title={p.name}
              >
                {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} className="v2-avatar-image" loading="lazy" /> : getInitials(p.name)}
              </motion.div>
            ))}
          </div>
          <div className="v2-avatar-stack-row v2-avatar-row-with-text">
            {secondRow.map((p, i) => (
              <motion.div
                key={p.id}
                className="v2-avatar-stack-item"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.08 + (firstRow.length + i) * 0.03 + 0.2, type: "spring", stiffness: 500, damping: 25 }}
                title={p.name}
              >
                {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} className="v2-avatar-image" loading="lazy" /> : getInitials(p.name)}
              </motion.div>
            ))}
            <span className="v2-player-count-text-inline">{playerCountText}</span>
          </div>
        </div>

        <motion.button
          className="v2-join-btn-responsive shrink-0"
          onClick={() => onJoinWithdraw(session)}
          disabled={isJoinDisabled}
          whileHover={session.status === "open" ? { scale: 1.02 } : {}}
          whileTap={session.status === "open" ? { scale: 0.98 } : {}}
        >
          <span className="v2-join-btn-text-responsive">
            {session.status === "full" ? "FULL" : session.status === "closed" ? "CLOSED" : session.status === "draft" ? "DRAFT" : "Join / Drop"}
          </span>
        </motion.button>
      </div>

      {showSplitwiseStatus && session.status === "closed" ? (
        <div className="v2-card-admin-actions">
          <span className={`v2-splitwise-pill ${getSplitwiseBadgeClass(splitwiseLabel)}`}>Splitwise {splitwiseLabel}</span>
        </div>
      ) : null}
    </motion.article>
  );
}
