"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { playEliminationPulse, playScannerTick } from "@/lib/sound";
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

type StagePhase = "eliminating" | "countdown" | "podium";

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
  const [countdownText, setCountdownText] = useState<string | null>(null);
  const [phase, setPhase] = useState<StagePhase>(() =>
    showPodiumImmediately && winners.length > 0 ? "podium" : "eliminating"
  );

  // Refs prevent parent re-renders / Realtime updates from re-triggering the sequence
  const initialImmediateRef = useRef(showPodiumImmediately && winners.length > 0);
  const startedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const winnersCountRef = useRef(winners.length);
  winnersCountRef.current = winners.length;

  const hasStage5 = Boolean(stage5Result && stage5Result.elimination_sequence?.length >= 3);
  const stage5Id = stage5Result?.id ?? null;

  useEffect(() => {
    if (initialImmediateRef.current) {
      setPhase("podium");
      onCompleteRef.current();
      return;
    }

    if (!stage5Result || !hasStage5 || startedRef.current) return;
    startedRef.current = true;

    const seq = stage5Result.elimination_sequence;
    if (reducedMotion || seq.length < 3) {
      setDroppedNumbers(new Set(stage5Result.eliminated_numbers));
      setPhase(winnersCountRef.current > 0 ? "podium" : "eliminating");
      onCompleteRef.current();
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
          playEliminationPulse(soundEnabledRef.current);
          setPhaseLabel(`NUMBER #${targetNum} ELIMINATED`);
        }, delayStart + 3400)
      );
    };

    runStep(0, 500);
    runStep(1, 4500);
    runStep(2, 8500);

    // Beat on Final Three Standing
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhaseLabel("FINAL THREE STANDING");
        onCompleteRef.current();
      }, 12700)
    );

    // Transition to Suspense Countdown inside the same card
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhase("countdown");
        setCountdownText(null);
      }, 13900)
    );

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setCountdownText("3");
        playScannerTick(soundEnabledRef.current);
      }, 15700)
    );

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setCountdownText("2");
        playScannerTick(soundEnabledRef.current);
      }, 16700)
    );

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setCountdownText("1");
        playScannerTick(soundEnabledRef.current);
      }, 17700)
    );

    // Reveal Official Podium on the exact same card
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhase("podium");
      }, 18700)
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage5Id, hasStage5, reducedMotion]);

  const isPodiumVisible = phase === "podium" && winners.length > 0;
  const isCountdown = phase === "countdown";

  return (
    <div
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-700",
        compact
          ? "h-full w-full flex flex-col justify-center p-4 sm:p-6"
          : "p-6 sm:p-10",
        isPodiumVisible
          ? "border-[#D8B66B]/40 bg-[#080808] shadow-[0_0_90px_rgba(216,182,107,0.12)]"
          : isCountdown
          ? "border-[#D8B66B]/30 bg-[#050505] shadow-[0_0_80px_rgba(216,182,107,0.1)]"
          : "border-[#EF3038]/30 bg-[#050505] shadow-[0_0_80px_rgba(239,48,56,0.12)]"
      )}
    >
      {/* Spotlight */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 transition-all duration-700",
          compact ? "h-44" : "h-64",
          isPodiumVisible || isCountdown
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
        ) : isCountdown ? (
          <motion.div
            key="countdown"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className={cn(
              "relative flex flex-col items-center justify-center text-center",
              compact ? "min-h-[260px] py-6" : "min-h-[320px] py-10"
            )}
          >
            <span className="inline-block rounded-full border border-[#D8B66B]/40 bg-[#D8B66B]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D8B66B]">
              Final Three Locked
            </span>
            <h3
              className={cn(
                "mt-4 font-display font-bold tracking-wide text-white uppercase max-w-xl",
                compact ? "text-xl sm:text-3xl" : "text-2xl sm:text-4xl"
              )}
            >
              Let&apos;s Get Ready For The Grand Prize Winners
            </h3>

            <div className="mt-6 h-24 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {countdownText ? (
                  <motion.span
                    key={countdownText}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.15, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="font-display text-7xl sm:text-8xl font-bold text-[#D8B66B] tabular-nums drop-shadow-[0_0_28px_rgba(216,182,107,0.55)]"
                  >
                    {countdownText}
                  </motion.span>
                ) : (
                  <motion.span
                    key="ready-pulse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-[#999999]"
                  >
                    In...
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
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
