"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Trophy, Award } from "lucide-react";
import { formatGhs } from "@/lib/money";
import { playWinnerFanfare } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { Winner } from "@/types/database";

interface WinnerRevealStageProps {
  winners: Winner[];
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export function WinnerRevealStage({
  winners,
  soundEnabled,
  reducedMotion,
}: WinnerRevealStageProps) {
  // Ordered reveal: 3rd -> 2nd -> 1st
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(
    () => (reducedMotion ? new Set([1, 2, 3]) : new Set())
  );

  useEffect(() => {
    if (reducedMotion || winners.length === 0) {
      setRevealedPositions(new Set([1, 2, 3]));
      return;
    }

    const t1 = setTimeout(() => {
      setRevealedPositions((prev) => new Set(prev).add(3));
    }, 900);

    const t2 = setTimeout(() => {
      setRevealedPositions((prev) => new Set(prev).add(2));
    }, 2600);

    const t3 = setTimeout(() => {
      setRevealedPositions((prev) => new Set(prev).add(1));
      playWinnerFanfare(soundEnabled);
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#D8B66B", "#FFFFFF", "#EF3038"],
      });
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [winners, reducedMotion, soundEnabled]);

  const byPos = (pos: 1 | 2 | 3) => winners.find((w) => w.position === pos);
  const displayOrder: Array<1 | 2 | 3> = [2, 1, 3]; // Podium center = 1st place

  return (
    <div className="relative rounded-2xl border border-[#D8B66B]/40 bg-[#080808] p-6 sm:p-10 overflow-hidden shadow-[0_0_90px_rgba(216,182,107,0.12)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(216,182,107,0.18),transparent_70%)]"
      />

      <div className="relative text-center mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8B66B]/40 bg-[#D8B66B]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#D8B66B]">
          <Trophy className="h-3.5 w-3.5" />
          Official Podium
        </span>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-bold text-white">
          Last Man Standing
        </h2>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        {displayOrder.map((pos) => {
          const winner = byPos(pos);
          const isRevealed = revealedPositions.has(pos);
          const isFirst = pos === 1;

          return (
            <motion.div
              key={pos}
              initial={false}
              animate={
                isRevealed && isFirst && !reducedMotion
                  ? { scale: [0.96, 1.03, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.6 }}
              className={cn(
                "rounded-xl border-2 bg-[#111111] p-6 text-center transition-all duration-500",
                isFirst
                  ? "border-[#D8B66B] md:-translate-y-4 shadow-[0_0_40px_rgba(216,182,107,0.22)]"
                  : "border-[#D8B66B]/40"
              )}
            >
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#D8B66B] mb-4 flex items-center justify-center gap-1.5">
                <Award className="h-4 w-4" />
                {pos === 1 ? "1st Place — Champion" : pos === 2 ? "2nd Place" : "3rd Place"}
              </div>

              {isRevealed && winner ? (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border border-[#D8B66B]/50 bg-[#080808] font-display text-4xl font-bold text-white tabular-nums">
                    {winner.assigned_number}
                  </div>
                  <p className="font-display text-xl font-bold text-white truncate">
                    {winner.display_name}
                  </p>
                  <p className="font-display text-2xl font-bold text-[#D8B66B] tabular-nums">
                    {formatGhs(winner.prize_pesewas)}
                  </p>
                </motion.div>
              ) : (
                <div className="py-8 space-y-3">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-[#080808] font-display text-2xl font-bold text-[#444444]">
                    ?
                  </div>
                  <p className="text-xs uppercase tracking-widest text-[#666666]">
                    Awaiting Reveal
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

