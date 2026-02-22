"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Minus, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type Session } from "./SessionCard";

interface Player {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface PlayerSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  allPlayers: Player[];
  selectedPlayerIds: string[];
  onTogglePlayer: (playerId: string) => void;
  onSubmit: () => void;
  guestCount: number;
  showGuestControls: boolean;
  onShowGuestControls: () => void;
  onIncrementGuest: () => void;
  onDecrementGuest: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

// Get initials for avatar fallback
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Get deterministic color for player based on ID
function getPlayerColor(playerId: string): string {
  const colors = ["#ccff00", "#9d4edd", "#00f5a0", "#ffd166", "#ff006e"];
  
  const index = playerId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export default function PlayerSelectionDialog({
  isOpen,
  onClose,
  session,
  allPlayers,
  selectedPlayerIds,
  onTogglePlayer,
  onSubmit,
  guestCount,
  showGuestControls,
  onShowGuestControls,
  onIncrementGuest,
  onDecrementGuest,
  isSubmitting = false,
  errorMessage = null
}: PlayerSelectionDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [failedAvatarIds, setFailedAvatarIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll lock when dialog is open
  useEffect(() => {
    if (!isOpen) return;
    
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFailedAvatarIds({});
    }
  }, [isOpen]);

  if (!session) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const dialogContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="v2-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="v2-dialog-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
              duration: 0.25,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="v2-dialog-header">
              <div>
                <h2 className="v2-dialog-title">Select players</h2>
                <p className="v2-dialog-subtitle">
                  Choose one or more players to join or drop
                </p>
              </div>
              <button className="v2-dialog-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {/* Player Grid - Static for performance */}
            <div className="v2-player-grid">
              {allPlayers.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);
                const wasOriginallyJoined = session.joinedPlayerIds?.includes(player.id);
                const showAvatarImage = Boolean(player.avatarUrl) && !failedAvatarIds[player.id];
                
                return (
                  <button
                    key={player.id}
                    className={`v2-player-option ${isSelected ? "selected" : ""}`}
                    onClick={() => onTogglePlayer(player.id)}
                  >
                    <div 
                      className="v2-player-option-avatar"
                      style={{ 
                        background: showAvatarImage
                          ? undefined
                          : `linear-gradient(135deg, ${getPlayerColor(player.id)}, ${getPlayerColor(player.id + "2")})`
                      }}
                    >
                      {showAvatarImage ? (
                        <img
                          src={player.avatarUrl as string}
                          alt={player.name}
                          className="v2-player-option-avatar-image"
                          loading="lazy"
                          onError={() => setFailedAvatarIds((prev) => ({ ...prev, [player.id]: true }))}
                        />
                      ) : (
                        getInitials(player.name)
                      )}
                      <div className="v2-player-option-check">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                    <span className="v2-player-option-name truncate max-w-full">
                      {player.name}
                    </span>
                    <span className="v2-player-option-status">
                      {isSelected 
                        ? wasOriginallyJoined ? "JOINED" : "WILL JOIN"
                        : wasOriginallyJoined ? "WILL DROP" : "NOT JOINED"
                      }
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Actions Row - Submit + Guest on same line */}
            <div className="v2-dialog-actions-row">
              {/* Submit Button - Left */}
              <button 
                className="v2-dialog-btn v2-dialog-btn-primary"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                <Check size={18} />
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>

              {/* Guest Section - Right */}
              <div className="v2-guest-wrapper-inline">
                {!showGuestControls ? (
                  <button
                    className="v2-add-guest-btn-inline"
                    onClick={onShowGuestControls}
                    disabled={isSubmitting}
                  >
                    <UserPlus size={16} />
                    <span>Add Guest</span>
                  </button>
                ) : (
                  <div className="v2-guest-controls-inline">
                    <button 
                      className="v2-guest-btn-inline"
                      onClick={onDecrementGuest}
                      disabled={guestCount <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="v2-guest-count-inline">
                      {guestCount} Guest{guestCount !== 1 ? "s" : ""}
                    </span>
                    <button 
                      className="v2-guest-btn-inline"
                      onClick={onIncrementGuest}
                      disabled={guestCount >= 20}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {errorMessage ? <p className="v2-inline-error">{errorMessage}</p> : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render outside the transformed parent container
  if (!mounted) return null;
  return createPortal(dialogContent, document.body);
}
