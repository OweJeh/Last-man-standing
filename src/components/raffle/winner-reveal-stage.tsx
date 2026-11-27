"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Trophy, Crown, Sparkles } from "lucide-react";
import { formatGhs } from "@/lib/money";
import { playWinnerFanfare } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { Winner } from "@/types/database";

interface WinnerRevealStageProps {
  winners: Winner[];
  soundEnabled: boolean;
  reducedMotion: boolean;
  embedded?: boolean;
  compact?: boolean;
}

const PODIUM_META: Record<
  1 | 2 | 3,
  {
    label: string;
    rankText: string;
    accentText: string;
    borderClass: string;
    glowClass: string;
    trophyBg: string;
    pedestalBg: string;
    pedestalHeight: string;
    compactPedestalHeight: string;
  }
> = {
  1: {
    label: "1st Place — Champion",
    rankText: "1ST",
    accentText: "text-[#D8B66B]",
    borderClass: "border-[#D8B66B]",
    glowClass: "shadow-[0_0_55px_rgba(216,182,107,0.32)]",
    trophyBg: "bg-[#D8B66B]/15 border-[#D8B66B]/50 text-[#D8B66B]",
    pedestalBg: "bg-gradient-to-b from-[#D8B66B]/30 to-[#D8B66B]/10 border-[#D8B66B]/60 text-[#D8B66B]",
    pedestalHeight: "h-16",
    compactPedestalHeight: "h-12",
  },
  2: {
    label: "2nd Place — Silver",
    rankText: "2ND",
    accentText: "text-[#D1D5DB]",
    borderClass: "border-[#C0C7D1]/60",
    glowClass: "shadow-[0_0_32px_rgba(209,213,219,0.16)]",
    trophyBg: "bg-[#D1D5DB]/15 border-[#D1D5DB]/45 text-[#E5E7EB]",
    pedestalBg: "bg-gradient-to-b from-[#D1D5DB]/25 to-[#D1D5DB]/5 border-[#D1D5DB]/45 text-[#E5E7EB]",
    pedestalHeight: "h-11",
    compactPedestalHeight: "h-9",
  },
  3: {
    label: "3rd Place — Bronze",
    rankText: "3RD",
    accentText: "text-[#D98A4E]",
    borderClass: "border-[#CD7F32]/60",
    glowClass: "shadow-[0_0_30px_rgba(205,127,50,0.16)]",
    trophyBg: "bg-[#CD7F32]/15 border-[#CD7F32]/45 text-[#E09B5B]",
    pedestalBg: "bg-gradient-to-b from-[#CD7F32]/25 to-[#CD7F32]/5 border-[#CD7F32]/45 text-[#E09B5B]",
    pedestalHeight: "h-8",
    compactPedestalHeight: "h-6",
  },
};

function fireChampionConfetti(fire: (opts?: confetti.Options) => unknown) {
  const colors = ["#D8B66B", "#FFF3C4", "#FFFFFF", "#EF3038", "#36B879"];
  // Main center pop
  fire({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.55 },
    colors,
    ticks: 220,
  });
  // Left & right stage cannons
  fire({
    particleCount: 65,
    angle: 60,
    spread: 60,
    startVelocity: 50,
    origin: { x: 0.15, y: 0.7 },
    colors,
    ticks: 200,
  });
  fire({
    particleCount: 65,
    angle: 120,
    spread: 60,
    startVelocity: 50,
    origin: { x: 0.85, y: 0.7 },
    colors,
    ticks: 200,
  });
}

export function WinnerRevealStage({
  winners,
  soundEnabled,
  reducedMotion,
  embedded = false,
  compact = false,
}: WinnerRevealStageProps) {
  // Ordered reveal: 3rd (right) -> 2nd (left) -> 1st (center + confetti pop)
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(
    () => (reducedMotion ? new Set([1, 2, 3]) : new Set())
  );
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const revealedStartedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const winnersKey = winners.map((w) => w.id).join(",");

  useEffect(() => {
    if (reducedMotion || winners.length === 0) {
      setRevealedPositions(new Set([1, 2, 3]));
      return;
    }

    if (revealedStartedRef.current) return;
    revealedStartedRef.current = true;

    const fire = confettiCanvasRef.current
      ? confetti.create(confettiCanvasRef.current, { resize: true, useWorker: false })
      : confetti;

    const t1 = setTimeout(() => {
      setRevealedPositions((prev) => new Set(prev).add(3));
    }, 750);

    const t2 = setTimeout(() => {
      setRevealedPositions((prev) => new Set(prev).add(2));
    }, 2400);

    const t3 = setTimeout(() => {
      setRevealedPositions((prev) => new Set(prev).add(1));
      playWinnerFanfare(soundEnabledRef.current);
      fireChampionConfetti(fire);
    }, 4300);

    const t4 = setTimeout(() => {
      fire({
        particleCount: 70,
        spread: 110,
        startVelocity: 35,
        origin: { x: 0.5, y: 0.35 },
        colors: ["#D8B66B", "#FFFFFF", "#EF3038"],
        ticks: 180,
      });
    }, 4950);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnersKey, reducedMotion]);

  const byPos = (pos: 1 | 2 | 3) => winners.find((w) => w.position === pos);
  // Left = 2nd (Silver), Center = 1st (Gold), Right = 3rd (Bronze)
  const displayOrder: Array<1 | 2 | 3> = [2, 1, 3];
  const championRevealed = revealedPositions.has(1);

  const content = (
    <div className={cn("relative w-full mx-auto", compact ? "max-w-4xl" : "max-w-5xl")}>
      {/* Dedicated confetti canvas inside component so it renders in Fullscreen too */}
      <canvas
        ref={confettiCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-40 h-full w-full"
      />
      {/* Graced floor glow when 1st place lands */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={championRevealed ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.92 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute -bottom-6 inset-x-6 h-24 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(216,182,107,0.28),transparent_70%)] blur-xl"
      />

      <div className={cn("relative text-center", compact ? "mb-4" : "mb-8")}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8B66B]/40 bg-[#D8B66B]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D8B66B]">
          <Sparkles className="h-3.5 w-3.5" />
          Official Podium
        </span>
        <h2
          className={cn(
            "mt-2 font-serif font-bold text-white",
            compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"
          )}
        >
          Last Man Standing
        </h2>
      </div>

      {/* Podium Stage: 2nd (Left) · 1st (Center) · 3rd (Right) */}
      <div
        className={cn(
          "relative grid grid-cols-1 md:grid-cols-3 items-end",
          compact ? "gap-3 sm:gap-4" : "gap-5 sm:gap-6"
        )}
      >
        {displayOrder.map((pos) => {
          const winner = byPos(pos);
          const isRevealed = revealedPositions.has(pos);
          const isFirst = pos === 1;
          const meta = PODIUM_META[pos];

          // 3rd slides in from right, 2nd slides in from left, 1st rises onto center stage
          const slideInitial = reducedMotion
            ? false
            : pos === 3
            ? { opacity: 0, x: 70, scale: 0.92 }
            : pos === 2
            ? { opacity: 0, x: -70, scale: 0.92 }
            : { opacity: 0, y: 48, scale: 0.86 };

          const slideAnimate =
            pos === 1
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 1, x: 0, scale: 1 };

          return (
            <div key={pos} className="flex flex-col items-stretch">
              {/* Winner Card */}
              <div
                className={cn(
                  "rounded-t-2xl border-2 border-b-0 bg-[#111111]/95 backdrop-blur-sm text-center transition-all duration-500 overflow-hidden",
                  compact ? "p-3.5 sm:p-4" : "p-5 sm:p-6",
                  isRevealed ? meta.borderClass : "border-white/10",
                  isRevealed && meta.glowClass,
                  isFirst && "md:pt-7"
                )}
              >
                {isRevealed && winner ? (
                  <motion.div
                    initial={slideInitial}
                    animate={slideAnimate}
                    transition={{
                      type: "spring",
                      stiffness: isFirst ? 210 : 240,
                      damping: isFirst ? 18 : 22,
                    }}
                    className={compact ? "space-y-2" : "space-y-3"}
                  >
                    {/* Trophy + Position Header */}
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full border shrink-0",
                          compact ? "h-8 w-8" : "h-10 w-10",
                          meta.trophyBg
                        )}
                      >
                        {isFirst ? (
                          <Crown className={compact ? "h-4 w-4" : "h-5 w-5"} />
                        ) : (
                          <Trophy className={compact ? "h-4 w-4" : "h-5 w-5"} />
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-[0.18em]",
                          meta.accentText
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {/* Assigned Number Tile */}
                    <div
                      className={cn(
                        "mx-auto flex items-center justify-center rounded-xl border bg-[#080808] font-display font-bold text-white tabular-nums",
                        meta.borderClass,
                        compact
                          ? isFirst
                            ? "h-14 w-14 text-2xl"
                            : "h-12 w-12 text-xl"
                          : isFirst
                          ? "h-20 w-20 text-4xl"
                          : "h-16 w-16 text-3xl"
                      )}
                    >
                      #{winner.assigned_number}
                    </div>

                    {/* Name & Prize */}
                    <div>
                      <p
                        className={cn(
                          "font-display font-bold text-white truncate",
                          compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                        )}
                      >
                        {winner.display_name}
                      </p>
                      <p
                        className={cn(
                          "font-display font-bold tabular-nums mt-0.5",
                          meta.accentText,
                          compact
                            ? isFirst
                              ? "text-xl"
                              : "text-lg"
                            : isFirst
                            ? "text-2xl sm:text-3xl"
                            : "text-xl"
                        )}
                      >
                        {formatGhs(winner.prize_pesewas)}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className={compact ? "py-4 space-y-2" : "py-8 space-y-3"}>
                    <div className="flex items-center justify-center gap-2 opacity-40">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/50",
                          compact ? "h-8 w-8" : "h-10 w-10"
                        )}
                      >
                        {isFirst ? <Crown className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#777777]">
                        {meta.label}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "mx-auto flex items-center justify-center rounded-xl border border-white/10 bg-[#080808] font-display font-bold text-[#444444]",
                        compact ? "h-12 w-12 text-xl" : "h-16 w-16 text-2xl"
                      )}
                    >
                      ?
                    </div>
                    <p className="text-[11px] uppercase tracking-widest text-[#666666]">
                      Awaiting Reveal
                    </p>
                  </div>
                )}
              </div>

              {/* Podium Pedestal Step */}
              <div
                className={cn(
                  "rounded-b-xl border-2 flex items-center justify-center font-display font-bold tracking-[0.25em] transition-all duration-500",
                  compact ? meta.compactPedestalHeight : meta.pedestalHeight,
                  compact ? "text-sm" : "text-base",
                  isRevealed
                    ? meta.pedestalBg
                    : "border-white/10 bg-[#0c0c0c] text-[#444444]"
                )}
              >
                {meta.rankText}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sleek Podium Floor Line */}
      <div
        className={cn(
          "mt-1 h-1 w-full rounded-full transition-all duration-700",
          championRevealed
            ? "bg-gradient-to-r from-[#C0C7D1]/30 via-[#D8B66B]/80 to-[#CD7F32]/30 shadow-[0_0_20px_rgba(216,182,107,0.4)]"
            : "bg-white/10"
        )}
      />
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="relative rounded-2xl border border-[#D8B66B]/40 bg-[#080808] p-6 sm:p-10 overflow-hidden shadow-[0_0_90px_rgba(216,182,107,0.12)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(216,182,107,0.18),transparent_70%)]"
      />
      {content}
    </div>
  );
}
