"use client";

import { useEffect, useRef, useState } from "react";

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  decay: number;
}

interface ConfettiProps {
  trigger: number;
  originX?: number;
  originY?: number;
}

const colors = ["#ccff00", "#9d4edd", "#00f5a0", "#ffffff", "#ffd166"];

export default function Confetti({ trigger, originX = 0.5, originY = 0.5 }: ConfettiProps) {
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animationRef = useRef<number>(0);
  const isCoarsePointerRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
    const syncPointerType = () => {
      isCoarsePointerRef.current = mediaQuery.matches;
    };
    syncPointerType();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPointerType);
      return () => mediaQuery.removeEventListener("change", syncPointerType);
    }
    mediaQuery.addListener(syncPointerType);
    return () => mediaQuery.removeListener(syncPointerType);
  }, []);

  useEffect(() => {
    if (trigger > 0) {
      setIsActive(true);
    }
  }, [trigger]);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas || trigger === 0) {
      setIsActive(false);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationRunning = true;

    const resize = () => {
      const width = Math.max(canvas.clientWidth, window.innerWidth);
      const height = Math.max(canvas.clientHeight, window.innerHeight);
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    const particleCount = isCoarsePointerRef.current ? 40 : 60;
    const velocityBase = isCoarsePointerRef.current ? 6 : 8;
    const velocityVariance = isCoarsePointerRef.current ? 5 : 8;
    const decayBase = isCoarsePointerRef.current ? 0.01 : 0.008;
    const decayVariance = isCoarsePointerRef.current ? 0.008 : 0.008;
    const startX = Math.min(Math.max(window.scrollX + window.innerWidth * originX, 0), canvas.width);
    const startY = Math.min(Math.max(window.scrollY + window.innerHeight * originY, 0), canvas.height);
    
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const velocity = velocityBase + Math.random() * velocityVariance;
      
      particlesRef.current.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        opacity: 1,
        decay: decayBase + Math.random() * decayVariance,
      });
    }

    const animate = () => {
      if (!ctx || !canvas || !animationRunning) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;
        
        if (p.opacity <= 0) return false;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        
        return true;
      });
      
      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsActive(false);
      }
    };
    
    animate();

    return () => {
      animationRunning = false;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
      particlesRef.current = [];
    };
  }, [isActive, trigger, originX, originY]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="v2-confetti-canvas"
      aria-hidden="true"
    />
  );
}
