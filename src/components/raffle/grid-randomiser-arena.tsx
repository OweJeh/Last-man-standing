"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crosshair, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { playEliminationPulse, playScannerTick } from "@/lib/sound";
import type { PublicParticipant, StageResult } from "@/types/database";

interface GridRandomiserArenaProps {
  participants: PublicParticipant[];
  stageResults: StageResult[];
  currentStage: number;
  totalStages?: number;
  soundEnabled: boolean;
  reducedMotion: boolean;
  compact?: boolean;
  onStageAnimationComplete?: (stageNumber: number) => void;
}

interface StageAnimConfig {
  durationMs: number;
  huntMs: number;
  hopMs: number;
  scares: number;
  scareHoldMs: number;
}

// Round 1: 20s fast scan (preserved)
// Round 2: 18s gentler pace, deeper visible red
// Round 3: 22s gentler pace + 8 scares (1s hold then moves away)
// Round 4: 18s slower, dramatic & full of scares (7 scares)
const STAGE_CONFIG: Record<number, StageAnimConfig> = {
  1: { durationMs: 20_000, huntMs: 3_000, hopMs: 85, scares: 0, scareHoldMs: 0 },
  2: { durationMs: 18_000, huntMs: 2_200, hopMs: 160, scares: 0, scareHoldMs: 0 },
  3: { durationMs: 22_000, huntMs: 2_000, hopMs: 225, scares: 8, scareHoldMs: 1_000 },
  4: { durationMs: 18_000, huntMs: 1_800, hopMs: 280, scares: 7, scareHoldMs: 1_000 },
};

export function GridRandomiserArena({
  participants,
  stageResults,
  currentStage,
  totalStages = 5,
  soundEnabled,
  reducedMotion,
  compact = false,
  onStageAnimationComplete,
}: GridRandomiserArenaProps) {
  const activeGridStage = Math.min(Math.max(currentStage, 0), totalStages - 1);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [recentEliminated, setRecentEliminated] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHunting, setIsHunting] = useState(false);
  const [isScareHold, setIsScareHold] = useState(false);
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
      setIsScareHold(false);
      return;
    }

    if (reducedMotion || completedStageRef.current >= latestStageNumber) {
      setEliminatedInAnim(new Set(result.eliminated_numbers));
      setRecentEliminated(result.eliminated_numbers.slice(-6).reverse());
      setScanningNumber(null);
      setTrailNumbers([]);
      setIsAnimating(false);
      setIsHunting(false);
      setIsScareHold(false);
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
    setIsScareHold(false);
    setEliminatedInAnim(new Set());
    setRecentEliminated([]);

    let cancelled = false;
    let pausedForLock = false;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => {
          timeouts.delete(id);
          resolve();
        }, ms);
        timeouts.add(id);
      });

    const elimSet = new Set<number>();
    const allNums = stageNumsRef.current.length > 0 ? stageNumsRef.current : seq;
    // If totalStages < 5, map the last pre-final stage to Round 4's dramatic config
    const configKey =
      latestStageNumber === totalStages - 1 && totalStages < 5 ? 4 : latestStageNumber;
    const cfg = STAGE_CONFIG[configKey] ?? STAGE_CONFIG[2];

    const totalScareMs = cfg.scares * cfg.scareHoldMs;
    const elimWindowMs = Math.max(2_000, cfg.durationMs - cfg.huntMs - totalScareMs);
    const stepMs = Math.max(120, Math.round(elimWindowMs / seq.length));

    // Spread scares evenly across the elimination sequence
    const scaresPerSlot = new Map<number, number>();
    if (cfg.scares > 0 && seq.length > 0) {
      for (let s = 0; s < cfg.scares; s += 1) {
        const slot = Math.min(
          seq.length - 1,
          Math.floor(((s + 0.5) * seq.length) / cfg.scares)
        );
        scaresPerSlot.set(slot, (scaresPerSlot.get(slot) ?? 0) + 1);
      }
    }

    // Random-hopping scanner runs continuously unless locked on a target or scare
    const hopTimer = setInterval(() => {
      if (cancelled || pausedForLock) return;
      const alive = allNums.filter((n) => !elimSet.has(n));
      if (alive.length === 0) return;
      const randomPick = alive[Math.floor(Math.random() * alive.length)];
      setScanningNumber(randomPick);
      setTrailNumbers((prev) => [randomPick, ...prev].slice(0, latestStageNumber >= 2 ? 3 : 4));
      playScannerTick(soundEnabledRef.current);
    }, cfg.hopMs);

    const runTimeline = async () => {
      await wait(cfg.huntMs);
      if (cancelled) return;
      setIsHunting(false);

      const triggerScare = async (nextTarget?: number) => {
        const alive = allNums.filter((n) => !elimSet.has(n));
        if (alive.length === 0) return;
        const candidates =
          alive.length > 1 && nextTarget !== undefined
            ? alive.filter((n) => n !== nextTarget)
            : alive;
        const scareNum = candidates[Math.floor(Math.random() * candidates.length)];

        pausedForLock = true;
        setIsScareHold(true);
        setScanningNumber(scareNum);
        setTrailNumbers((prev) => [scareNum, ...prev].slice(0, 3));
        playScannerTick(soundEnabledRef.current);

        await wait(cfg.scareHoldMs);
        if (cancelled) return;

        // Move away without eliminating!
        setIsScareHold(false);
        pausedForLock = false;
        await wait(Math.min(350, cfg.hopMs + 120));
      };

      for (let idx = 0; idx < seq.length; idx += 1) {
        if (cancelled) return;
        const targetNum = seq[idx];

        const scareCount = scaresPerSlot.get(idx) ?? 0;
        for (let sc = 0; sc < scareCount; sc += 1) {
          if (cancelled) return;
          await triggerScare(targetNum);
        }
        if (cancelled) return;

        // Lock onto elimination target, then dim it out
        pausedForLock = latestStageNumber >= 2;
        setScanningNumber(targetNum);
        setTrailNumbers((prev) => [targetNum, ...prev].slice(0, latestStageNumber >= 2 ? 3 : 4));

        const lockMs = Math.floor(stepMs * 0.4);
        await wait(lockMs);
        if (cancelled) return;

        elimSet.add(targetNum);
        setEliminatedInAnim(new Set(elimSet));
        setRecentEliminated((prev) => [targetNum, ...prev].slice(0, 8));
        if (idx % 2 === 0 || seq.length <= 15) {
          playEliminationPulse(soundEnabledRef.current);
        }
        pausedForLock = false;

        const restMs = Math.max(80, stepMs - lockMs);
        await wait(restMs);
      }

      if (cancelled) return;
      clearInterval(hopTimer);
      completedStageRef.current = latestStageNumber;
      setScanningNumber(null);
      setTrailNumbers([]);
      setIsAnimating(false);
      setIsHunting(false);
      setIsScareHold(false);
      onCompleteRef.current?.(latestStageNumber);
    };

    void runTimeline();

    return () => {
      cancelled = true;
      clearInterval(hopTimer);
      for (const id of timeouts) clearTimeout(id);
      timeouts.clear();
    };
  }, [latestStageNumber, reducedMotion, totalStages]);

  const count = stageParticipants.length;

  // In compact (fullscreen) mode: grid fills the measured arena height via h-full chain.
  // Grid rows + cols are explicit so tiles auto-fit.
  let gridColsClass: string;
  let gridRowsClass: string;
  let tileFontClass: string;
  let gridMaxWidthClass: string;

  if (count <= 12) {
    gridColsClass = "grid-cols-4";
    gridRowsClass = compact ? "grid-rows-3 h-full" : "";
    tileFontClass = compact ? "h-full text-2xl" : "h-20 sm:h-24 text-xl sm:text-2xl";
    gridMaxWidthClass = compact ? "max-w-xl mx-auto" : "";
  } else if (count <= 25) {
    gridColsClass = "grid-cols-5";
    gridRowsClass = compact ? "grid-rows-5 h-full" : "";
    tileFontClass = compact ? "h-full text-lg sm:text-xl" : "h-14 sm:h-18 text-lg sm:text-xl";
    gridMaxWidthClass = compact ? "max-w-2xl mx-auto" : "";
  } else if (count <= 50) {
    gridColsClass = "grid-cols-10";
    gridRowsClass = compact ? "grid-rows-5 h-full" : "";
    tileFontClass = compact ? "h-full text-sm sm:text-base" : "h-12 sm:h-14 text-base sm:text-lg";
    gridMaxWidthClass = "";
  } else {
    // 100 tiles
    gridColsClass = "grid-cols-10";
    gridRowsClass = compact ? "grid-rows-10 h-full" : "";
    tileFontClass = compact ? "h-full text-xs sm:text-sm" : "h-11 sm:h-12 text-sm sm:text-base";
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
      ? `${latestResult.surviving_numbers.length} SURVIVORS REMAIN`
      : null;

  return (
    <div className={compact ? "h-full flex flex-col min-h-0 gap-1.5" : "space-y-5"}>
      {/* Active Elimination Spotlight & Progress Bar */}
      {isAnimating && latestResult && (
        <div
          className={cn(
            "shrink-0 rounded-xl border border-[#EF3038]/50 bg-[#141414] shadow-[0_0_30px_rgba(239,48,56,0.12)]",
            compact ? "px-3 py-2" : "p-4 space-y-3"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#EF3038]/20 text-[#EF3038]">
                <Crosshair className="h-3.5 w-3.5 animate-spin" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#EF3038] flex items-center gap-1">
                  <Radio className="h-2.5 w-2.5 animate-pulse" />
                  {isHunting
                    ? `Stage ${latestResult.stage_number} Scanning`
                    : isScareHold
                    ? `Stage ${latestResult.stage_number} · Locking On...`
                    : `Stage ${latestResult.stage_number} Live`}
                </p>
                <p className="text-xs font-bold text-white">
                  {scanningParticipant
                    ? `${isHunting ? "Scanning" : isScareHold ? "Holding" : "Targeting"} #${scanningParticipant.assigned_number}${compact ? "" : ` — ${scanningParticipant.display_name}`}`
                    : "Scanning..."}
                </p>
              </div>
            </div>
            <span className="font-mono text-xs text-white tabular-nums">
              {eliminatedInAnim.size}/{totalToEliminate} out
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-1.5">
            <div
              className="h-full bg-[#EF3038] transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stage Announcement Banner */}
      <AnimatePresence mode="wait">
        {announcement && (
          <motion.div
            key={announcement}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "shrink-0 rounded-lg border border-[#EF3038]/50 bg-[#EF3038]/10 text-center px-3 py-2",
            )}
          >
            <p className={cn("font-display font-bold tracking-[0.12em] text-white uppercase", compact ? "text-sm" : "text-lg sm:text-2xl")}>
              {announcement}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inspector bar — normal mode only */}
      {inspectedParticipant && !compact && (
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

      {/* White-tile Numbered Arena — flex-1 so it fills remaining height in compact */}
      <div
        className={cn(
          "relative rounded-2xl border border-white/15 bg-[#080808] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden",
          compact ? "flex-1 min-h-0 p-2 w-full" : "p-3 sm:p-6"
        )}
      >
        {isAnimating && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,48,56,0.08),transparent_70%)]"
          />
        )}

        <div className={cn("grid gap-1 sm:gap-1.5", gridColsClass, gridRowsClass, gridMaxWidthClass)}>
          {stageParticipants.map((p) => {
            const num = p.assigned_number;
            const isScanning = scanningNumber === num;
            const isInTrail = !isScanning && trailNumbers.includes(num);
            const isEliminated = eliminatedInAnim.has(num);
            const isInspected = inspectedNumber === num;

            const isDeepRed = latestStageNumber >= 2;

            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setInspectedNumber(isInspected ? null : num)}
                onMouseEnter={() => !compact && setInspectedNumber(num)}
                title={`${p.display_name} (#${num})`}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-md font-display font-bold tabular-nums transition-all select-none overflow-hidden cursor-pointer min-h-0",
                  isDeepRed ? "duration-500 ease-out" : "duration-300",
                  tileFontClass,
                  isScanning
                    ? isDeepRed
                      ? cn(
                          "bg-[#B80018] text-white scale-110 z-10 ring-2 ring-[#FF5C6C] shadow-[0_0_30px_rgba(184,0,24,0.95)]",
                          isScareHold && "animate-pulse scale-115 ring-white"
                        )
                      : "bg-[#FF2020] text-white scale-110 z-10 ring-2 ring-white shadow-[0_0_24px_rgba(255,32,32,0.9)]"
                    : isEliminated
                    ? "bg-[#303030] text-[#666666] opacity-70 scale-95"
                    : isInTrail
                    ? isDeepRed
                      ? "bg-[#FFE5E8] text-[#080808] ring-2 ring-[#C8001A] shadow-[0_0_16px_rgba(200,0,26,0.6)]"
                      : "bg-white text-[#080808] ring-2 ring-[#EF3038]/80 shadow-[0_0_12px_rgba(239,48,56,0.5)]"
                    : "bg-white text-[#080808] shadow-sm hover:ring-2 hover:ring-[#EF3038]/60",
                  isInspected && !isScanning && "ring-2 ring-[#D8B66B]"
                )}
              >
                <span className={cn(isEliminated && "line-through decoration-[#EF3038]/70")}>
                  {num}
                </span>
                {count <= 25 && !compact && (
                  <span className="text-[10px] font-sans font-medium truncate max-w-[90%] px-1 text-[#555555]">
                    {p.display_name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eliminated numbers readout after stage completes — hidden in compact fullscreen mode */}
      {latestResult && !isAnimating && !compact && (
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
