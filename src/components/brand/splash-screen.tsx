"use client";

/**
 * SplashScreen
 *
 * Logo animation sequence:
 *   Phase 0 (0 – 0.4s)   : 4 neutral tiles appear from centre, big grid fades in behind
 *   Phase 1 (0.4 – 1.2s) : Red scanner sweeps from top-left, visits top-right → it dims
 *   Phase 2 (1.2 – 2.0s) : Scanner drops to bottom-left → it dims
 *   Phase 3 (2.0 – 2.8s) : Scanner slides to bottom-right → pulses red, holds
 *   Phase 4 (2.8 – 3.4s) : Top-left brightens to full white — the survivor
 *   Phase 5 (3.4 – 4.2s) : Wordmark text typesets in below the grid
 *   Phase 6 (4.2 – 5.0s) : Tagline fades in
 *   Phase 7 (5.0 – 6.0s) : Whole splash fades out, page content revealed
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Phase timings (ms) — snappy 2.7s broadcast intro ─────────────────────────
const T = {
  appear:    100,
  scanTR:    480,
  scanBL:    860,
  scanBR:    1240,
  survivor:  1520,
  wordmark:  1680,
  tagline:   1880,
  fadeOut:   2250,
  done:      2750,
};

// ─── Cell IDs: 0=TL 1=TR 2=BL 3=BR ─────────────────────────────────────────
type CellId = 0 | 1 | 2 | 3;

interface CellVisual {
  bg: string;
  border: string;
  glow?: string;
  scale?: number;
}

function getCell(id: CellId, phase: number): CellVisual {
  // Top-left: always white — the last man standing
  if (id === 0) {
    const bright = phase >= T.survivor;
    return {
      bg:     bright ? "#FFFFFF" : "rgba(255,255,255,0.72)",
      border: bright ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
      glow:   bright ? "0 0 32px 8px rgba(255,255,255,0.35)" : undefined,
      scale:  bright ? 1.04 : 1,
    };
  }

  // Top-right: eliminated after phase scanTR
  if (id === 1) {
    const eliminated = phase >= T.scanTR;
    const scanning   = phase >= T.appear  && phase < T.scanTR;
    if (scanning)   return { bg: "rgba(239,48,56,0.55)",  border: "#EF3038",             scale: 1.06 };
    if (eliminated) return { bg: "rgba(30,30,30,0.9)",    border: "rgba(255,255,255,0.08)" };
    return             { bg: "rgba(255,255,255,0.08)",    border: "rgba(255,255,255,0.18)" };
  }

  // Bottom-left: eliminated after phase scanBL
  if (id === 2) {
    const eliminated = phase >= T.scanBL;
    const scanning   = phase >= T.scanTR && phase < T.scanBL;
    if (scanning)   return { bg: "rgba(239,48,56,0.55)",  border: "#EF3038",             scale: 1.06 };
    if (eliminated) return { bg: "rgba(30,30,30,0.9)",    border: "rgba(255,255,255,0.08)" };
    return             { bg: "rgba(255,255,255,0.08)",    border: "rgba(255,255,255,0.18)" };
  }

  // Bottom-right: red winner after phase scanBR
  if (id === 3) {
    const winner   = phase >= T.scanBR;
    const scanning = phase >= T.scanBL && phase < T.scanBR;
    if (scanning) return { bg: "rgba(239,48,56,0.55)",   border: "#EF3038",              scale: 1.06 };
    if (winner)   return {
      bg:     "#EF3038",
      border: "#FF4040",
      glow:   "0 0 36px 10px rgba(239,48,56,0.45)",
      scale:  1.05,
    };
    return          { bg: "rgba(255,255,255,0.08)",       border: "rgba(255,255,255,0.18)" };
  }

  return { bg: "transparent", border: "transparent" };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SplashScreen() {
  const [phase, setPhase]     = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show splash on first visit per browser session
    if (sessionStorage.getItem("lms-splash-shown")) {
      document.documentElement.classList.remove("lms-splash-pending");
      return;
    }

    setVisible(true);
    // Remove pre-paint curtain once React splash overlay is active
    const clearCurtain = window.requestAnimationFrame(() => {
      document.documentElement.classList.remove("lms-splash-pending");
    });

    // Mark shown only after animation starts so React StrictMode double-mount
    // doesn't skip the splash on the second mount.
    const markShown = window.setTimeout(() => {
      sessionStorage.setItem("lms-splash-shown", "1");
    }, T.appear);

    // Drive the phase clock
    const milestones = [
      T.appear, T.scanTR, T.scanBL, T.scanBR,
      T.survivor, T.wordmark, T.tagline, T.fadeOut,
    ];
    const timers = milestones.map((ms) =>
      window.setTimeout(() => setPhase(ms), ms)
    );
    // Remove from DOM entirely after done
    const done = window.setTimeout(() => setVisible(false), T.done);
    return () => {
      window.cancelAnimationFrame(clearCurtain);
      [markShown, ...timers, done].forEach(clearTimeout);
    };
  }, []);

  const cells: CellId[] = [0, 1, 2, 3];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080808] overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase >= T.fadeOut ? 0 : 1 }}
          transition={{ duration: phase >= T.fadeOut ? 0.9 : 0, ease: "easeInOut" }}
        >
          {/* ── Ambient background glow ─────────────────────────────────── */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(239,48,56,0.07) 0%, transparent 70%)",
            }}
          />

          {/* ── Faint full-page grid texture ────────────────────────────── */}
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-0"
            animate={{ opacity: phase >= T.appear ? 0.045 : 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          {/* ── Central 2×2 logo grid ───────────────────────────────────── */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8"
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: phase >= T.appear ? 1 : 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Grid — compact logo-sized mark */}
            <div className="relative">
              <div
                className="grid grid-cols-2 gap-[3px] rounded-[4px] border p-[5px]"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {cells.map((id) => {
                  const v = getCell(id, phase);
                  return (
                    <motion.div
                      key={id}
                      className="rounded-[2px]"
                      style={{ width: 18, height: 18 }}
                      animate={{
                        backgroundColor: v.bg,
                        boxShadow:       v.glow ?? "none",
                        scale:           v.scale ?? 1,
                      }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      initial={false}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Wordmark text ──────────────────────────────────────────── */}
            <motion.div
              className="flex flex-col items-center gap-3 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: phase >= T.wordmark ? 1 : 0, y: phase >= T.wordmark ? 0 : 12 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3">
                {/* Mini logo mark inline */}
                <span
                  className="grid grid-cols-2 gap-[2px] rounded border border-white/15 bg-[#111111] p-[5px]"
                  aria-hidden="true"
                >
                  <span className="h-2 w-2 rounded-[2px] bg-white" />
                  <span className="h-2 w-2 rounded-[2px] bg-[#303030]" />
                  <span className="h-2 w-2 rounded-[2px] bg-[#303030]" />
                  <span className="h-2 w-2 rounded-[2px] bg-[#EF3038]" />
                </span>

                <span className="font-display text-2xl sm:text-3xl font-bold tracking-[0.18em] text-white uppercase">
                  Last Man Standing
                </span>
              </div>

              {/* Tagline */}
              <motion.p
                className="text-xs sm:text-sm font-semibold uppercase tracking-[0.28em] text-[#999999]"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= T.tagline ? 1 : 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                One Number.&nbsp; One Chance.&nbsp;{" "}
                <span className="text-[#EF3038]">Last Man Standing.</span>
              </motion.p>
            </motion.div>
          </motion.div>

          {/* ── Bottom progress line ─────────────────────────────────────── */}
          <motion.div
            className="absolute bottom-0 left-0 h-[2px] bg-[#EF3038]"
            initial={{ width: "0%" }}
            animate={{ width: phase >= T.appear ? "100%" : "0%" }}
            transition={{ duration: (T.fadeOut - T.appear) / 1000, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

