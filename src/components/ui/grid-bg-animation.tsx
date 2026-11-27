"use client";

/**
 * GridBackgroundAnimation
 *
 * A decorative 10×10 number grid that mimics the raffle randomiser.
 * Designed to sit as an absolute/fixed background behind page content.
 *
 * Effects layered on top of each other:
 *   1. Scanner beam  — a glowing vertical column that sweeps left→right
 *   2. Horizontal pulse — a horizontal row that fires occasionally
 *   3. Random flickers — individual cells flash white then red then go dark
 *   4. Gradual "elimination" — cells permanently dim over time (then reset)
 *
 * All animations are CSS-transition-driven for 60fps performance.
 * Overall opacity is kept very low so it never competes with foreground content.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CellState = "idle" | "scan" | "flash" | "eliminated";

interface Cell {
  state: CellState;
  flashPhase: "white" | "red" | null; // only when state === "flash"
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL = 100;
const COLS = 10;
const SCAN_INTERVAL_MS = 300;      // beam moves one column every 300ms (slow sweep)
const FLASH_INTERVAL_MS = 700;     // one cell flickers every 700ms
const FLASH_COUNT = 1;             // only 1 cell flashes at a time
const FLASH_WHITE_MS = 150;        // brief white flash
const FLASH_RED_MS = 500;          // lingers red before fading
const ELIM_INTERVAL_MS = 3500;     // a new cell dims every 3.5 s
const ELIM_MAX = 22;               // at most 22 dimmed cells at once
const RESET_INTERVAL_MS = 25000;   // full grid resets every 25 s

// ─── Component ───────────────────────────────────────────────────────────────

interface GridBackgroundAnimationProps {
  /** Extra CSS classes on the root wrapper */
  className?: string;
  /**
   * How intense the effect is.
   * "subtle"  = 6% opacity  (hero backgrounds, login)
   * "medium"  = 10% opacity (number selection grid pages)
   */
  intensity?: "subtle" | "medium";
}

export function GridBackgroundAnimation({
  className = "",
  intensity = "subtle",
}: GridBackgroundAnimationProps) {
  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: TOTAL }, () => ({ state: "idle" as CellState, flashPhase: null }))
  );
  const [scanCol, setScanCol] = useState(0);
  const [scanRow, setScanRow] = useState<number | null>(null);
  const elimSet = useRef<Set<number>>(new Set());
  const flashActive = useRef<Set<number>>(new Set());

  // ── 1. Scanner beam (column sweep, left → right) ─────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setScanCol((c) => (c + 1) % COLS);
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── 2. Horizontal pulse (random row, infrequent) ──────────────────────────
  useEffect(() => {
    const fire = () => {
      const row = Math.floor(Math.random() * 10);
      setScanRow(row);
      setTimeout(() => setScanRow(null), SCAN_INTERVAL_MS * COLS * 0.9);
    };
    // fire first after a delay, then randomly
    const jitter = () => setTimeout(() => { fire(); jitter(); }, 2500 + Math.random() * 4000);
    const t = jitter();
    return () => clearTimeout(t);
  }, []);

  // ── 3. Random cell flickers ───────────────────────────────────────────────
  const triggerFlash = useCallback(() => {
    const eligible: number[] = [];
    for (let i = 0; i < TOTAL; i++) {
      if (!elimSet.current.has(i) && !flashActive.current.has(i)) {
        eligible.push(i);
      }
    }
    if (eligible.length === 0) return;

    const count = Math.min(FLASH_COUNT, Math.ceil(Math.random() * FLASH_COUNT));
    const targets: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = eligible[Math.floor(Math.random() * eligible.length)];
      if (!targets.includes(idx)) targets.push(idx);
    }

    targets.forEach((idx) => {
      flashActive.current.add(idx);

      // Phase 1: white
      setCells((prev) => {
        const next = [...prev];
        next[idx] = { state: "flash", flashPhase: "white" };
        return next;
      });

      // Phase 2: red
      setTimeout(() => {
        setCells((prev) => {
          const next = [...prev];
          if (next[idx].state === "flash") {
            next[idx] = { state: "flash", flashPhase: "red" };
          }
          return next;
        });
      }, FLASH_WHITE_MS);

      // Phase 3: back to idle (or eliminated if it was added while flashing)
      setTimeout(() => {
        flashActive.current.delete(idx);
        setCells((prev) => {
          const next = [...prev];
          next[idx] = {
            state: elimSet.current.has(idx) ? "eliminated" : "idle",
            flashPhase: null,
          };
          return next;
        });
      }, FLASH_WHITE_MS + FLASH_RED_MS);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(triggerFlash, FLASH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [triggerFlash]);

  // ── 4. Gradual eliminations ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (elimSet.current.size >= ELIM_MAX) return;
      let idx: number;
      let attempts = 0;
      do {
        idx = Math.floor(Math.random() * TOTAL);
        attempts++;
      } while (
        (elimSet.current.has(idx) || flashActive.current.has(idx)) &&
        attempts < 20
      );
      if (attempts >= 20) return;

      elimSet.current.add(idx);
      setCells((prev) => {
        const next = [...prev];
        if (next[idx].state !== "flash") {
          next[idx] = { state: "eliminated", flashPhase: null };
        }
        return next;
      });
    }, ELIM_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── 5. Periodic full reset ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      elimSet.current.clear();
      flashActive.current.clear();
      setCells(
        Array.from({ length: TOTAL }, () => ({ state: "idle" as CellState, flashPhase: null }))
      );
    }, RESET_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  // Visible enough to read the grid & see the animation, but clearly secondary
  const rootOpacity = intensity === "medium" ? "opacity-[0.18]" : "opacity-[0.13]";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${rootOpacity} ${className}`}
    >
      {/* Edge vignette — softens the perimeter so the grid blends into the page */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, #080808 88%)",
        }}
      />

      <div
        className="grid gap-[2px] w-full h-full"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const isScanCol = col === scanCol;
          const isScanRow = scanRow !== null && row === scanRow;
          const isEliminated = cell.state === "eliminated";
          const isFlash = cell.state === "flash";
          const isWhite = isFlash && cell.flashPhase === "white";
          const isRed = isFlash && cell.flashPhase === "red";

          // ── State → style mapping ────────────────────────────────────────
          // Rule: grid lines always readable; colour states are soft, not loud
          let bg = "transparent";
          let borderColor = "rgba(255,255,255,0.14)";  // idle: clean hairline
          let textColor = "#2e2e2e";                   // idle: ghost numbers

          if (isEliminated) {
            // Dims out — slightly darker fill, faded border
            bg = "rgba(0,0,0,0.5)";
            borderColor = "rgba(255,255,255,0.05)";
            textColor = "#1a1a1a";
          } else if (isWhite) {
            // Brief bright pulse — not blinding
            bg = "rgba(255,255,255,0.30)";
            borderColor = "rgba(255,255,255,0.50)";
            textColor = "#888888";
          } else if (isRed) {
            // Red elimination colour — recognisable but muted
            bg = "rgba(239,48,56,0.22)";
            borderColor = "rgba(239,48,56,0.55)";
            textColor = "#993030";
          } else if (isScanCol && isScanRow) {
            // Intersection of scan lines — slightly stronger
            bg = "rgba(239,48,56,0.14)";
            borderColor = "rgba(239,48,56,0.45)";
          } else if (isScanCol) {
            // Vertical scan beam column
            bg = "rgba(239,48,56,0.07)";
            borderColor = "rgba(239,48,56,0.38)";
          } else if (isScanRow) {
            // Horizontal pulse row
            bg = "rgba(255,255,255,0.04)";
            borderColor = "rgba(255,255,255,0.22)";
          }

          return (
            <div
              key={i}
              className="relative flex items-center justify-center rounded-sm border aspect-square"
              style={{
                backgroundColor: bg,
                borderColor,
                // Slow transitions everywhere — nothing snaps
                transition:
                  "background-color 400ms ease, border-color 400ms ease",
              }}
            >
              <span
                className="font-mono text-[clamp(5px,0.95vw,10px)] font-semibold tabular-nums leading-none"
                style={{
                  color: textColor,
                  transition: "color 400ms ease",
                }}
              >
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

