"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crosshair, Radio } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { playEliminationPulse, playScannerTick } from "@/lib/sound";
import type { PublicParticipant, StageResult } from "@/types/database";

interface GridRandomiserArenaProps {
  participants: PublicParticipant[];
  stageResults: StageResult[];
  currentStage: number;
  soundEnabled: boolean;
  reducedMotion: boolean;
  compact?: boolean;
  onStageAnimationComplete?: (stageNumber: number) => void;
}

const STAGE_ANNOUNCEMENTS: Record<number, string> = {
  1: "50 SURVIVORS REMAIN",
  2: "25 SURVIVORS REMAIN",
  3: "12 SURVIVORS REMAIN",
  4: "6 SURVIVORS REMAIN",
};

// Target stage animation durations (ms):
// Stage 1 (100->50): 20s, Stage 2 (50->25): 13s, Stage 3 (25->12): 9s, Stage 4 (12->6): 6.5s
const STAGE_DURATION_MS: Record<number, number> = {
  1: 20_000,
  2: 13_000,
  3: 9_000,
  4: 6_500,
};

// Initial random-movement hunt duration before first tile dims (3s for Stage 1)
const STAGE_HUNT_MS: Record<number, number> = {
  1: 3_000,
  2: 2_000,
  3: 1_500,
  4: 1_200,
};

export function GridRandomiserArena({
  participants,
  stageResults,
  currentStage,
  soundEnabled,
  reducedMotion,
  compact = false,
  onStageAnimationComplete,
}: GridRandomiserArenaProps) {
  const activeGridStage = Math.min(Math.max(currentStage, 0), 4);
  const latestResult = stageResults.find((s) => s.stage_number === activeGridStage) ?? null;
  const latestStageNumber = latestResult?.stage_number ?? 0;

  const prevResult =
    activeGridStage > 1
      ? stageResults.find((s) => s.stage_number === activeGridStage - 1)
      : null;

  const stageParticipants = useMemo(() => {
    const sorted = [...participants].sort((a, b) => a.assigned_number - b.assigned_number);
    if (!prevResult) return sorted;
    const prevSurvSet = new Set(prevResult.surviving_numbers);
    return sorted.filter((p) => prevSurvSet.has(p.assigned_number));
  }, [participants, prevResult]);

  const participantByNumber = useMemo(() => {
    const map = new Map<number, PublicParticipant>();
    for (const p of stageParticipants) {
      map.set(p.assigned_number, p);
    }
    return map;
  }, [stageParticipants]);

  const [scanningNumber, setScanningNumber] = useState<number | null>(null);
  const [trailNumbers, setTrailNumbers] = useState<number[]>([]);
  const [eliminatedInAnim, setEliminatedInAnim] = useState<Set<number>>(new Set());
  const [recentEliminated, setRecentEliminated] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHunting, setIsHunting] = useState(false);
  const [inspectedNumber, setInspectedNumber] = useState<number | null>(null);

  // Refs prevent router.refresh() / Realtime re-syncs from cancelling a running animation
  const completedStageRef = useRef<number>(0);
  const latestResultRef = useRef<StageResult | null>(latestResult);
  latestResultRef.current = latestResult;
  const stageNumsRef = useRef<number[]>([]);
  stageNumsRef.current = stageParticipants.map((p) => p.assigned_number);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const onCompleteRef = useRef(onStageAnimationComplete);
  onCompleteRef.current = onStageAnimationComplete;

  useEffect(() => {
    const result = latestResultRef.current;
    if (!result || latestStageNumber === 0) {
      setEliminatedInAnim(new Set());
      setRecentEliminated([]);
      setScanningNumber(null);
      setTrailNumbers([]);
      setIsAnimating(false);
      setIsHunting(false);
      return;
    }

    if (reducedMotion || completedStageRef.current >= latestStageNumber) {
      setEliminatedInAnim(new Set(result.eliminated_numbers));
      setRecentEliminated(result.eliminated_numbers.slice(-6).reverse());
      setScanningNumber(null);
      setTrailNumbers([]);
      setIsAnimating(false);
      setIsHunting(false);
      return;
    }

    const seq = result.elimination_sequence;
    if (!seq || seq.length === 0) {
      setEliminatedInAnim(new Set(result.eliminated_numbers));
      completedStageRef.current = latestStageNumber;
      return;
    }

    setIsAnimating(true);
    setIsHunting(true);
    setEliminatedInAnim(new Set());
    setRecentEliminated([]);

    let cancelled = false;
    const elimSet = new Set<number>();
    const allNums = stageNumsRef.current.length > 0 ? stageNumsRef.current : seq;

    const totalMs = STAGE_DURATION_MS[latestStageNumber] ?? 8_000;
    const huntMs = STAGE_HUNT_MS[latestStageNumber] ?? 1_500;
    const elimWindowMs = Math.max(2_000, totalMs - huntMs);
    const stepMs = Math.max(120, Math.round(elimWindowMs / seq.length));

    // Random-hopping scanner runs continuously across surviving tiles for fun suspense
    const hopTimer = setInterval(() => {
      if (cancelled) return;
      const alive = allNums.filter((n) => !elimSet.has(n));
      if (alive.length === 0) return;
      const randomPick = alive[Math.floor(Math.random() * alive.length)];
      setScanningNumber(randomPick);
      setTrailNumbers((prev) => [randomPick, ...prev].slice(0, 4));
      playScannerTick(soundEnabledRef.current);
    }, 85);

    let idx = 0;
    let elimTimer: ReturnType<typeof setInterval> | null = null;

    const startEliminationTimeout = setTimeout(() => {
      if (cancelled) return;
      setIsHunting(false);

      const eliminateNext = () => {
        if (cancelled) return;
        if (idx >= seq.length) {
          if (elimTimer) clearInterval(elimTimer);
          clearInterval(hopTimer);
          completedStageRef.current = latestStageNumber;
          setScanningNumber(null);
          setTrailNumbers([]);
          setIsAnimating(false);
          setIsHunting(false);
          onCompleteRef.current?.(latestStageNumber);
          return;
        }

        const targetNum = seq[idx];
        const currentIdx = idx;
        idx += 1;

        // Lock scanner onto the target briefly, then dim it out
        setScanningNumber(targetNum);
        setTrailNumbers((prev) => [targetNum, ...prev].slice(0, 4));

        setTimeout(() => {
          if (cancelled) return;
          elimSet.add(targetNum);
          setEliminatedInAnim(new Set(elimSet));
          setRecentEliminated((prev) => [targetNum, ...prev].slice(0, 8));
          if (currentIdx % 2 === 0 || seq.length <= 15) {
            playEliminationPulse(soundEnabledRef.current);
          }
        }, Math.floor(stepMs * 0.4));
      };

      eliminateNext();
      elimTimer = setInterval(eliminateNext, stepMs);
    }, huntMs);

    return () => {
      cancelled = true;
      clearInterval(hopTimer);
      clearTimeout(startEliminationTimeout);
      if (elimTimer) clearInterval(elimTimer);
    };
  }, [latestStageNumber, reducedMotion]);

  const count = stageParticipants.length;
  let gridColsClass = "grid-cols-10";
  let tileSizeClass = compact
    ? "h-9 sm:h-10 lg:h-12 text-sm sm:text-base"
    : "h-11 sm:h-12 text-sm sm:text-base";
  let gridMaxWidthClass = "";

  if (count <= 12) {
    gridColsClass = "grid-cols-3 sm:grid-cols-4";
    tileSizeClass = compact
      ? "h-20 sm:h-24 lg:h-28 text-2xl sm:text-3xl"
      : "h-20 sm:h-24 text-xl sm:text-2xl";
    gridMaxWidthClass = compact ? "max-w-sm mx-auto" : "";
  } else if (count <= 25) {
    gridColsClass = "grid-cols-5";
    tileSizeClass = compact
      ? "h-16 sm:h-20 text-xl sm:text-2xl"
      : "h-14 sm:h-18 text-lg sm:text-xl";
    gridMaxWidthClass = compact ? "max-w-lg mx-auto" : "";
  } else if (count <= 50) {
    gridColsClass = "grid-cols-5 sm:grid-cols-10";
    tileSizeClass = compact
      ? "h-11 sm:h-13 text-base sm:text-lg"
      : "h-12 sm:h-14 text-base sm:text-lg";
    gridMaxWidthClass = "";
  }

  const totalToEliminate = latestResult?.elimination_sequence?.length ?? 0;
  const eliminatedSoFar = eliminatedInAnim.size;
  const progressPct =
    totalToEliminate > 0 ? Math.min(100, Math.round((eliminatedSoFar / totalToEliminate) * 100)) : 0;

  const scanningParticipant =
    scanningNumber !== null ? participantByNumber.get(scanningNumber) ?? null : null;
  const inspectedParticipant =
    inspectedNumber !== null ? participantByNumber.get(inspectedNumber) ?? null : null;

  const announcement =
    latestResult && !isAnimating
      ? STAGE_ANNOUNCEMENTS[latestResult.stage_number] ||
        `${latestResult.surviving_numbers.length} SURVIVORS REMAIN`
      : null;

  return (
    <div className={compact ? "flex flex-col items-center space-y-2.5 w-full" : "space-y-5"}>
      {/* Active Elimination Spotlight & Progress Bar */}
      {isAnimating && latestResult && (
        <div
          className={cn(
            "rounded-xl border border-[#EF3038]/50 bg-[#141414] shadow-[0_0_30px_rgba(239,48,56,0.12)]",
            compact ? "px-3.5 py-2.5 space-y-2" : "p-4 space-y-3"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EF3038]/20 text-[#EF3038]">
                <Crosshair className="h-4 w-4 animate-spin" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EF3038] flex items-center gap-1.5">
                  <Radio className="h-3 w-3 animate-pulse" />
                  {isHunting
                    ? `Stage ${latestResult.stage_number} Randomizer Scanning...`
                    : `Stage ${latestResult.stage_number} Elimination Live`}
                </p>
                <p className="font-display text-base sm:text-lg font-bold text-white">
                  {scanningParticipant
                    ? `${isHunting ? "Scanning" : "Targeting"} #${scanningParticipant.assigned_number} — ${scanningParticipant.display_name}`
                    : "Scanning Grid..."}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs text-[#999999] block">Eliminated</span>
              <span className="font-display text-lg font-bold tabular-nums text-white">
                {eliminatedSoFar} / {totalToEliminate}
              </span>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#EF3038] transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {recentEliminated.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase tracking-wider text-[#999999] mr-1">
                Just Out:
              </span>
              {recentEliminated.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center gap-1 rounded bg-[#262626] border border-[#EF3038]/30 px-2 py-0.5 font-mono text-[11px] text-[#cccccc] tabular-nums"
                >
                  #{n} {participantByNumber.get(n)?.display_name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage Status & Announcement Banner */}
      <AnimatePresence mode="wait">
        {announcement && (
          <motion.div
            key={announcement}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-[#EF3038]/50 bg-[#EF3038]/10 px-4 py-3 text-center"
          >
            <p className="font-display text-lg sm:text-2xl font-bold tracking-[0.14em] text-white uppercase">
              {announcement}
            </p>
            {latestResult && (
              <p className="text-xs text-[#999999] mt-0.5">
                Stage {latestResult.stage_number} published{" "}
                {formatDateTime(latestResult.published_at)}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Tile Inspector Bar */}
      {inspectedParticipant && (
        <div className="flex items-center justify-between rounded-lg border border-white/15 bg-[#141414] px-4 py-2 text-xs">
          <span>
            <strong className="font-display text-sm text-white">
              #{inspectedParticipant.assigned_number}
            </strong>{" "}
            <span className="text-white font-semibold ml-1">
              {inspectedParticipant.display_name}
            </span>
          </span>
          <span
            className={cn(
              "font-semibold uppercase tracking-wider",
              eliminatedInAnim.has(inspectedParticipant.assigned_number) ||
                inspectedParticipant.status === "eliminated"
                ? "text-[#EF3038]"
                : "text-[#36B879]"
            )}
          >
            {eliminatedInAnim.has(inspectedParticipant.assigned_number) ||
            inspectedParticipant.status === "eliminated"
              ? "Eliminated"
              : "Surviving"}
          </span>
        </div>
      )}

      {/* White-tile Numbered Arena */}
      <div
        className={cn(
          "relative rounded-2xl border border-white/15 bg-[#080808] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden",
          compact ? "p-2.5 sm:p-3.5 w-full" : "p-3 sm:p-6"
        )}
      >
        {isAnimating && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,48,56,0.08),transparent_70%)]"
          />
        )}

        <div className={cn("grid", compact ? "gap-2 sm:gap-2.5" : "gap-2 sm:gap-2.5", gridColsClass, gridMaxWidthClass)}>
          {stageParticipants.map((p) => {
            const num = p.assigned_number;
            const isScanning = scanningNumber === num;
            const isInTrail = !isScanning && trailNumbers.includes(num);
            const isEliminated = eliminatedInAnim.has(num);
            const isInspected = inspectedNumber === num;

            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setInspectedNumber(isInspected ? null : num)}
                onMouseEnter={() => setInspectedNumber(num)}
                title={`${p.display_name} (#${num})`}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-md font-display font-bold tabular-nums transition-all duration-300 select-none overflow-hidden cursor-pointer",
                  tileSizeClass,
                  isScanning
                    ? "bg-[#FF2020] text-white scale-110 z-10 ring-2 ring-white shadow-[0_0_24px_rgba(255,32,32,0.9)]"
                    : isEliminated
                    ? "bg-[#303030] text-[#666666] opacity-70 scale-95"
                    : isInTrail
                    ? "bg-white text-[#080808] ring-2 ring-[#EF3038]/80 shadow-[0_0_12px_rgba(239,48,56,0.5)]"
                    : "bg-white text-[#080808] shadow-sm hover:ring-2 hover:ring-[#EF3038]/60",
                  isInspected && !isScanning && "ring-2 ring-[#D8B66B]"
                )}
              >
                <span className={cn(isEliminated && "line-through decoration-[#EF3038]/70")}>
                  {num}
                </span>
                {count <= 25 && (
                  <span className="text-[10px] font-sans font-medium truncate max-w-[90%] px-1 text-[#555555]">
                    {p.display_name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eliminated numbers readout after stage completes */}
      {latestResult && !isAnimating && (
        <div className="rounded-xl border border-white/10 bg-[#141414] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#999999]">
            <span>Stage {latestResult.stage_number} Eliminated Numbers</span>
            <span className="tabular-nums text-white font-semibold">
              {latestResult.eliminated_numbers.length} Eliminated
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {latestResult.eliminated_numbers.map((num) => (
              <span
                key={num}
                className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-[#303030] px-2 font-display text-xs font-bold text-[#999999] tabular-nums"
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
