"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import AnimatedBackground from "../../components/v2/AnimatedBackground";
import SessionCard, { type Session } from "../../components/v2/SessionCard";
import PlayerSelectionDialog from "../../components/v2/PlayerSelectionDialog";
import SkeletonCard from "../../components/v2/SkeletonCard";
import Confetti from "../../components/v2/Confetti";

// Import the V2 styles
import "../../app/globals-v2.css";

// Mock data - replace with actual data fetching
const mockSessions: Session[] = [
  {
    id: "1",
    date: new Date(Date.now() + 86400000 * 1),
    startTime: "7:00 PM",
    endTime: "9:00 PM",
    location: "Taichi Badminton Court @ Expo",
    status: "open",
    participantCount: 6,
    maxParticipants: 12,
    participants: [
      { id: "p1", name: "Alex Chen" },
      { id: "p2", name: "Sarah Lim" },
      { id: "p3", name: "Mike Tan" },
      { id: "p4", name: "Jessica Wong" },
      { id: "p5", name: "David Lee" },
      { id: "p6", name: "Emma Tan" },
    ],
    courts: [
      { id: "c1", label: "Court 1", timeRange: "7-9PM" },
      { id: "c2", label: "Court 2", timeRange: "7-9PM" },
    ],
    isJoined: false,
    joinedPlayerIds: [],
  },
  {
    id: "2",
    date: new Date(Date.now() + 86400000 * 3),
    startTime: "6:00 PM",
    endTime: "8:00 PM",
    location: "Club Sbh East Coast @ Bedok",
    status: "open",
    participantCount: 4,
    maxParticipants: 8,
    participants: [
      { id: "p1", name: "Alex Chen" },
      { id: "p2", name: "Sarah Lim" },
      { id: "p3", name: "Mike Tan" },
      { id: "p4", name: "Jessica Wong" },
    ],
    courts: [
      { id: "c1", label: "Court A", timeRange: "6-8PM" },
    ],
    isJoined: true,
    joinedPlayerIds: ["p1"],
  },
  {
    id: "3",
    date: new Date(Date.now() + 86400000 * 5),
    startTime: "7:30 PM",
    endTime: "9:30 PM",
    location: "Taichi Badminton Court @ Expo",
    status: "full",
    participantCount: 12,
    maxParticipants: 12,
    participants: [
      { id: "p1", name: "Alex Chen" },
      { id: "p2", name: "Sarah Lim" },
      { id: "p3", name: "Mike Tan" },
      { id: "p4", name: "Jessica Wong" },
      { id: "p5", name: "David Lee" },
      { id: "p6", name: "Emma Tan" },
      { id: "p7", name: "John Doe" },
      { id: "p8", name: "Jane Smith" },
      { id: "p9", name: "Tom Brown" },
      { id: "p10", name: "Lisa Wang" },
      { id: "p11", name: "Chris Park" },
      { id: "p12", name: "Amy Liu" },
    ],
    courts: [
      { id: "c1", label: "Court 1", timeRange: "7:30-9:30PM" },
      { id: "c2", label: "Court 2", timeRange: "7:30-9:30PM" },
      { id: "c3", label: "Court 3", timeRange: "8-9:30PM" },
    ],
    isJoined: false,
    joinedPlayerIds: [],
  },
  {
    id: "4",
    date: new Date(Date.now() + 86400000 * 7),
    startTime: "8:00 PM",
    endTime: "10:00 PM",
    location: "ActiveSG Stadium @ Jurong East",
    status: "closed",
    participantCount: 8,
    maxParticipants: 12,
    participants: [
      { id: "p1", name: "Alex Chen" },
      { id: "p2", name: "Sarah Lim" },
      { id: "p3", name: "Mike Tan" },
      { id: "p4", name: "Jessica Wong" },
      { id: "p5", name: "David Lee" },
      { id: "p6", name: "Emma Tan" },
      { id: "p7", name: "John Doe" },
      { id: "p8", name: "Jane Smith" },
    ],
    courts: [
      { id: "c1", label: "Court 1", timeRange: "8-10PM" },
    ],
    isJoined: false,
    joinedPlayerIds: [],
  },
  {
    id: "5",
    date: new Date(Date.now() + 86400000 * 10),
    startTime: "6:30 PM",
    endTime: "8:30 PM",
    location: "Taichi Badminton Court @ Expo",
    status: "open",
    participantCount: 2,
    maxParticipants: 8,
    participants: [
      { id: "p1", name: "Alex Chen" },
      { id: "p2", name: "Sarah Lim" },
    ],
    courts: [
      { id: "c1", label: "Court 1", timeRange: "6:30-8:30PM" },
    ],
    isJoined: true,
    joinedPlayerIds: ["p1", "p2"],
  },
  {
    id: "6",
    date: new Date(Date.now() + 86400000 * 14),
    startTime: "7:00 PM",
    endTime: "9:00 PM",
    location: "Club Sbh East Coast @ Bedok",
    status: "open",
    participantCount: 5,
    maxParticipants: 12,
    participants: [
      { id: "p1", name: "Alex Chen" },
      { id: "p2", name: "Sarah Lim" },
      { id: "p3", name: "Mike Tan" },
      { id: "p4", name: "Jessica Wong" },
      { id: "p5", name: "David Lee" },
    ],
    courts: [
      { id: "c1", label: "Court A", timeRange: "7-9PM" },
      { id: "c2", label: "Court B", timeRange: "7:30-9PM" },
    ],
    isJoined: false,
    joinedPlayerIds: [],
  },
];

// Mock all available players for the dialog (9 players)
const mockAllPlayers = [
  { id: "p1", name: "Alex Chen", avatarUrl: null },
  { id: "p2", name: "Sarah Lim", avatarUrl: null },
  { id: "p3", name: "Mike Tan", avatarUrl: null },
  { id: "p4", name: "Jessica Wong", avatarUrl: null },
  { id: "p5", name: "David Lee", avatarUrl: null },
  { id: "p6", name: "Emma Tan", avatarUrl: null },
  { id: "p7", name: "John Doe", avatarUrl: null },
  { id: "p8", name: "Jane Smith", avatarUrl: null },
  { id: "p9", name: "Tom Brown", avatarUrl: null },
];

export default function SessionsV2Page() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [showGuestControls, setShowGuestControls] = useState(false);

  // Simulate loading
  useEffect(() => {
    setMounted(true);
    
    // Simulate loading delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Haptic feedback helper
  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const handleOpenDialog = useCallback((session: Session) => {
    setSelectedSession(session);
    setSelectedPlayerIds(session.joinedPlayerIds || []);
    setDialogOpen(true);
    triggerHaptic(30);
  }, [triggerHaptic]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedPlayerIds([]);
    setSelectedSession(null);
    setGuestCount(0);
    setShowGuestControls(false);
  }, []);

  const handleTogglePlayer = useCallback((playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
    triggerHaptic(20);
  }, [triggerHaptic]);

  const handleSubmitSelection = useCallback(() => {
    if (!selectedSession) return;

    const hasChanges = 
      JSON.stringify(selectedPlayerIds.sort()) !== 
      JSON.stringify((selectedSession.joinedPlayerIds || []).sort());

    if (hasChanges) {
      triggerHaptic([30, 50, 30]);

      // Update session
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== selectedSession.id) return s;
          const isJoined = selectedPlayerIds.length > 0;
          return {
            ...s,
            isJoined,
            joinedPlayerIds: selectedPlayerIds,
            participantCount: isJoined ? selectedPlayerIds.length : s.participants.length,
          };
        })
      );

      // Trigger confetti after dialog closes (300ms delay for dialog exit animation)
      setTimeout(() => {
        setConfettiOrigin({ x: 0.5, y: 0.7 });
        setConfettiTrigger(prev => prev + 1);
      }, 300);
    }

    handleCloseDialog();
  }, [selectedSession, selectedPlayerIds, handleCloseDialog, triggerHaptic]);

  const handleShowGuestControls = useCallback(() => {
    setShowGuestControls(true);
  }, []);

  const handleIncrementGuest = useCallback(() => {
    setGuestCount((prev) => Math.min(prev + 1, 20));
    setShowGuestControls(true);
  }, []);

  const handleDecrementGuest = useCallback(() => {
    setGuestCount((prev) => Math.max(prev - 1, 0));
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filter === "upcoming") return s.status === "open" || s.status === "full";
    if (filter === "past") return s.status === "closed";
    return true;
  });

  // Group sessions by month
  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const monthKey = session.date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0d0612]" />;
  }

  return (
    <div className="v2-page">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Confetti Effect */}
      <Confetti trigger={confettiTrigger} originX={confettiOrigin.x} originY={confettiOrigin.y} />

      {/* Header */}
      <motion.header 
        className="v2-header pt-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.div 
          className="v2-logo"
          whileHover={{ scale: 1.02 }}
        >
          <Sparkles className="inline-block mr-2 text-[var(--v2-primary)]" size={24} />
          <span>Club</span>
          <span className="v2-logo-accent">Genie</span>
        </motion.div>
      </motion.header>

      {/* Main Content */}
      <main className="v2-container">
        {/* Page Title */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <h1 className="text-4xl md:text-5xl font-bold">
            {filter === "upcoming" ? "Upcoming" : "Past"} <span className="text-[var(--v2-primary)]">Sessions</span>
          </h1>
        </motion.div>

        {/* Upcoming/Past Toggle */}
        <motion.div 
          className="flex items-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className="relative flex items-center bg-[var(--v2-bg-card)] border border-[var(--v2-border)] rounded-full p-1">
            {/* Sliding background */}
            <motion.div
              className="absolute h-[calc(100%-8px)] rounded-full bg-[var(--v2-primary)]"
              initial={false}
              animate={{
                x: filter === "upcoming" ? 0 : 96,
                width: 96,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            <button
              className={`relative z-10 w-24 py-2 px-4 rounded-full text-sm font-semibold transition-colors ${
                filter === "upcoming"
                  ? "text-[var(--v2-bg-deep)]"
                  : "text-[var(--v2-text-secondary)]"
              }`}
              onClick={() => {
                setFilter("upcoming");
                triggerHaptic(25);
              }}
            >
              Upcoming
            </button>
            <button
              className={`relative z-10 w-24 py-2 px-4 rounded-full text-sm font-semibold transition-colors ${
                filter === "past"
                  ? "text-[var(--v2-bg-deep)]"
                  : "text-[var(--v2-text-secondary)]"
              }`}
              onClick={() => {
                setFilter("past");
                triggerHaptic(25);
              }}
            >
              Past
            </button>
          </div>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {Object.entries(groupedSessions).length === 0 ? (
                <motion.div 
                  className="v2-card text-center py-16"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="text-6xl mb-4">🏸</div>
                  <h3 className="text-xl font-semibold mb-2">No sessions found</h3>
                  <p className="text-[var(--v2-text-secondary)]">
                    Try adjusting your filters or check back later!
                  </p>
                </motion.div>
              ) : (
                Object.entries(groupedSessions).map(([month, monthSessions]) => (
                  <div key={month} className="mb-8">
                    <motion.h2 
                      className="v2-section-title mb-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {month}
                    </motion.h2>
                    
                    <div className="space-y-4">
                      {monthSessions.map((session, index) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          index={index}
                          onJoinWithdraw={() => handleOpenDialog(session)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Player Selection Dialog */}
      <PlayerSelectionDialog
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        session={selectedSession}
        allPlayers={mockAllPlayers}
        selectedPlayerIds={selectedPlayerIds}
        onTogglePlayer={handleTogglePlayer}
        onSubmit={handleSubmitSelection}
        guestCount={guestCount}
        showGuestControls={showGuestControls}
        onShowGuestControls={handleShowGuestControls}
        onIncrementGuest={handleIncrementGuest}
        onDecrementGuest={handleDecrementGuest}
      />
    </div>
  );
}
