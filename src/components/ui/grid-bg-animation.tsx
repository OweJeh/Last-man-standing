"use client";

/**
 * GridBackgroundAnimation
 *
 * A decorative 10×10 number grid that mimics the raffle randomiser.
 * Designed to sit as an absolute/fixed background behind page content.
 *
 * Behaviour:
 *   1. Randomizer hop  — a glowing red scanner hops randomly across alive cells
 *   2. Fading trail    — last 3–4 visited cells keep a soft red afterglow
 *   3. Lock & eliminate — periodically locks onto a cell briefly, flashes, then dims it
 *   4. Auto-reset      — resets the grid cleanly once 28 cells have been eliminated
 */

import React, { useEffect, useRef, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL = 100;
const COLS = 10;
const ELIM_MAX = 28;
const TRAIL_LEN = 4;

// ─── Component ───────────────────────────────────────────────────────────────

interface GridBackgroundAnimationProps {
  /** Extra CSS classes on the root wrapper */
  className?: string;
  /**
   * How intense the effect is.
   * "subtle"  = visible yet unobtrusive behind hero text
   * "medium"  = balanced for raffle grid pages
   * "vibrant" = pops behind auth cards (sign in / create account)
   */
  intensity?: "subtle" | "medium" | "vibrant";
}

export function GridBackgroundAnimation({
  className = "",
  intensity = "subtle",
}: GridBackgroundAnimationProps) {
  const [scannerIdx, setScannerIdx] = useState<number | null>(null);
  const [trail, setTrail] = useState<number[]>([]);
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<Set<number>>(() => new Set());

  const elimRef = useRef<Set<number>>(new Set());
  const lockedRef = useRef<number | null>(null);

  const hopMs = intensity === "vibrant" ? 150 : 210;

  // ── Randomizer hop + periodic lock & elimination ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    let tickCount = 0;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timeouts.delete(id);
        if (!cancelled) fn();
      }, ms);
      timeouts.add(id);
    };

    const getAlive = () => {
      const alive: number[] = [];
      for (let i = 0; i < TOTAL; i++) {
        if (!elimRef.current.has(i)) alive.push(i);
      }
      return alive;
    };

    const intervalId = setInterval(() => {
      if (cancelled || lockedRef.current !== null) return;

      const alive = getAlive();
      if (alive.length === 0 || elimRef.current.size >= ELIM_MAX) {
        elimRef.current = new Set();
        setEliminated(new Set());
        setTrail([]);
        setScannerIdx(null);
        return;
      }

      const pick = alive[Math.floor(Math.random() * alive.length)];
      setScannerIdx(pick);
      setTrail((prev) => [pick, ...prev.filter((x) => x !== pick)].slice(0, TRAIL_LEN));

      tickCount += 1;
      // Every ~12 hops, lock onto a target, flash, and eliminate it
      if (tickCount % 12 === 0) {
        lockedRef.current = pick;
        setLockedIdx(pick);

        schedule(() => {
          elimRef.current = new Set(elimRef.current).add(pick);
          setEliminated(new Set(elimRef.current));
          lockedRef.current = null;
          setLockedIdx(null);

          if (elimRef.current.size >= ELIM_MAX) {
            schedule(() => {
              elimRef.current = new Set();
              setEliminated(new Set());
              setTrail([]);
            }, 900);
          }
        }, 520);
      }
    }, hopMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      for (const id of timeouts) clearTimeout(id);
      timeouts.clear();
    };
  }, [hopMs]);

  // ─── Render ───────────────────────────────────────────────────────────────

  // Visible enough to read the grid & see the animation, tuned per page role
  const rootOpacity =
    intensity === "vibrant"
      ? "opacity-[0.40]"
      : intensity === "medium"
      ? "opacity-[0.28]"
      : "opacity-[0.24]";

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
        {Array.from({ length: TOTAL }, (_, i) => {
          const isEliminated = eliminated.has(i);
          const isLocked = lockedIdx === i;
          const isScanning = scannerIdx === i;
          const trailPos = trail.indexOf(i);
          const isTrail = !isScanning && !isLocked && trailPos > 0;

          // ── State → style mapping ────────────────────────────────────────
          let bg = "transparent";
          let borderColor = "rgba(255,255,255,0.20)";
          let textColor = "#4a4a4a";
          let boxShadow = "none";

          if (isEliminated) {
            bg = "rgba(0,0,0,0.55)";
            borderColor = "rgba(255,255,255,0.06)";
            textColor = "#202020";
          } else if (isLocked) {
            bg = "rgba(255,255,255,0.42)";
            borderColor = "rgba(239,48,56,0.95)";
            textColor = "#ffffff";
            boxShadow = "0 0 18px rgba(239,48,56,0.55)";
          } else if (isScanning) {
            bg = "rgba(239,48,56,0.42)";
            borderColor = "rgba(239,48,56,0.85)";
            textColor = "#ffffff";
            boxShadow = "0 0 14px rgba(239,48,56,0.4)";
          } else if (isTrail) {
            const fade = Math.max(0.12, 0.35 - trailPos * 0.08);
            bg = `rgba(239,48,56,${fade.toFixed(2)})`;
            borderColor = `rgba(239,48,56,${(fade + 0.2).toFixed(2)})`;
            textColor = "#ff8a8a";
          }

          return (
            <div
              key={i}
              className="relative flex items-center justify-center rounded-sm border aspect-square"
              style={{
                backgroundColor: bg,
                borderColor,
                boxShadow,
                transition:
                  "background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
              }}
            >
              <span
                className="font-mono text-[clamp(5px,0.95vw,10px)] font-semibold tabular-nums leading-none"
                style={{
                  color: textColor,
                  transition: "color 180ms ease",
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

