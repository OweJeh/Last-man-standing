"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { playEliminationPulse } from "@/lib/sound";
import { WinnerRevealStage } from "./winner-reveal-stage";
import type { PublicParticipant, StageResult, Winner } from "@/types/database";

interface FinalSixStageProps {
  finalSixParticipants: PublicParticipant[];
  stage5Result: StageResult | null;
  winners?: Winner[];
  soundEnabled: boolean;
  reducedMotion: boolean;
  compact?: boolean;
  showPodiumImmediately?: boolean;
  onComplete: () => void;
}

export function FinalSixStage({
  finalSixParticipants,
  stage5Result,
  winners = [],
  soundEnabled,
  reducedMotion,
  compact = false,
  showPodiumImmediately = false,
  onComplete,
}: FinalSixStageProps) {
  const [ordered, setOrdered] = useState<PublicParticipant[]>(() =>
    [...finalSixParticipants].sort((a, b) => a.assigned_number - b.assigned_number)
  );
  const [shakingNumber, setShakingNumber] = useState<number | null>(null);
  const [droppedNumbers, setDroppedNumbers] = useState<Set<number>>(new Set());
  const [phaseLabel, setPhaseLabel] = useState("THE FINAL SIX");
  const [showPodium, setShowPodium] = useState(
    () => showPodiumImmediately && winners.length > 0
  );
  const initialImmediateRef = React.useRef(showPodiumImmediately && winners.length > 0);

  useEffect(() => {
    if (initialImmediateRef.current) {
      setShowPodium(true);
      onComplete();
      return;
    }

    if (!stage5Result) return;

    const seq = stage5Result.elimination_sequence;
    if (reducedMotion || seq.length < 3) {
      setDroppedNumbers(new Set(stage5Result.eliminated_numbers));
      setShowPodium(winners.length > 0);
      onComplete();
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runStep = (dropIdx: number, delayStart: number) => {
      // Shuffle horizontally
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setPhaseLabel(`SHUFFLING (${6 - dropIdx} REMAIN)...`);
          setOrdered((prev) => {
            const copy = [...prev];
            for (let i = copy.length - 1; i > 0; i -= 1) {
              const j = (i * 7 + dropIdx * 3) % (i + 1);
              [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
          });
        }, delayStart)
      );

      // Highlight red & shake target
      const targetNum = seq[dropIdx];
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setShakingNumber(targetNum);
          setPhaseLabel(`NUMBER #${targetNum} LOCKED...`);
        }, delayStart + 2600)
      );

      // Drop below screen
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setShakingNumber(null);
          setDroppedNumbers((prev) => {
            const next = new Set(prev);
            next.add(targetNum);
            return next;
          });
          playEliminationPulse(soundEnabled);
          setPhaseLabel(`NUMBER #${targetNum} ELIMINATED`);
        }, delayStart + 3400)
      );
    };

    runStep(0, 500);
    runStep(1, 4500);
    runStep(2, 8500);

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhaseLabel("FINAL THREE STANDING");
        onComplete();
      }, 12800)
    );

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setShowPodium(true);
      }, 13700)
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [stage5Result, reducedMotion, soundEnabled, onComplete, winners.length]);

  const isPodiumVisible = showPodium && winners.length > 0;

  return (
    <div
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-700",
        compact ? "p-5 sm:p-7" : "p-6 sm:p-10",
        isPodiumVisible
          ? "border-[#D8B66B]/40 bg-[#080808] shadow-[0_0_90px_rgba(216,182,107,0.12)]"
          : "border-[#EF3038]/30 bg-[#050505] shadow-[0_0_80px_rgba(239,48,56,0.12)]"
      )}
    >
      {/* Spotlight */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 transition-all duration-700",
          compact ? "h-44" : "h-64",
          isPodiumVisible
            ? "bg-[radial-gradient(ellipse_at_top,rgba(216,182,107,0.18),transparent_70%)]"
            : "bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_70%)]"
        )}
      />

      <AnimatePresence mode="wait">
        {isPodiumVisible ? (
          <motion.div
            key="podium"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <WinnerRevealStage
              embedded
              compact={compact}
              winners={winners}
              soundEnabled={soundEnabled}
              reducedMotion={reducedMotion}
            />
          </motion.div>
        ) : (
          <motion.div
            key="final-six"
            initial={false}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
          >
            <div className={cn("relative text-center", compact ? "mb-5" : "mb-8")}>
              <span className="inline-block rounded-full border border-[#EF3038]/50 bg-[#EF3038]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#EF3038]">
                Final Stage
              </span>
              <h3
                className={cn(
                  "mt-3 font-display font-bold tracking-wider text-white uppercase",
                  compact ? "text-xl sm:text-3xl" : "text-2xl sm:text-4xl"
                )}
              >
                {phaseLabel}
              </h3>
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 min-h-[160px] items-center">
              {ordered.map((p) => {
                const isShaking = shakingNumber === p.assigned_number;
                const isDropped = droppedNumbers.has(p.assigned_number);

                return (
                  <motion.div
                    key={p.id}
                    layoutId={`final-six-${p.id}`}
                    animate={
                      isDropped
                        ? { y: 260, rotate: 14, opacity: 0 }
                        : isShaking
                        ? { x: [0, -6, 6, -6, 6, 0], rotate: [0, -2, 2, -2, 0] }
                        : { y: 0, rotate: 0, opacity: 1 }
                    }
                    transition={{
                      layout: { type: "spring", stiffness: 260, damping: 24 },
                      duration: isDropped ? 0.65 : 0.4,
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border-2 p-5 text-center transition-colors",
                      isShaking
                        ? "border-[#FF2020] bg-[#1c0808] text-white shadow-[0_0_32px_rgba(255,32,32,0.7)]"
                        : "border-white/20 bg-white text-[#080808]"
                    )}
                  >
                    <span className="font-display text-4xl font-bold tabular-nums">
                      {p.assigned_number}
                    </span>
                    <span
                      className={cn(
                        "mt-2 text-xs font-semibold truncate max-w-full",
                        isShaking ? "text-white/80" : "text-[#444444]"
                      )}
                    >
                      {p.display_name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

