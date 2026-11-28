"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Play,
  SkipForward,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Radio,
  RotateCcw,
  X,
  ListX,
} from "lucide-react";
import {
  publishNextStageAction,
  startRaffleDrawAction,
} from "@/app/actions/raffle-control";
import { formatGhs } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveBroadcastClient } from "@/components/raffle/live-broadcast-client";
import type {
  PublicParticipant,
  RaffleEvent,
  RaffleRound,
  StageResult,
  Winner,
} from "@/types/database";

export function LiveControlClient({
  round,
  survivorsCount,
  eliminatedCount,
  participants,
  stageResults,
  winners,
  events,
}: {
  round: RaffleRound;
  survivorsCount: number;
  eliminatedCount: number;
  participants: PublicParticipant[];
  stageResults: StageResult[];
  winners: Winner[];
  events: RaffleEvent[];
}) {
  const router = useRouter();
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [arenaHeight, setArenaHeight] = useState(0);
  const [showEliminations, setShowEliminations] = useState(false);
  const [replayStage, setReplayStage] = useState<number | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  const totalStages = round.num_stages || 5;
  const finalPreStage = totalStages - 1;

  const canStart =
    round.status === "full" &&
    round.confirmed_entries_count === round.participant_capacity &&
    !round.seed_commitment;

  const canNextStage =
    round.status === "running" && round.current_stage >= 0 && round.current_stage < totalStages;

  const isCompleted = round.status === "completed" || round.status === "archived";
  const isReplaying = replayStage !== null;
  const canReplay = isCompleted && stageResults.length > 0;

  const participantByNumber = useMemo(() => {
    const map = new Map<number, PublicParticipant>();
    for (const p of participants) map.set(p.assigned_number, p);
    return map;
  }, [participants]);

  const visibleStageResults = useMemo(() => {
    const base =
      replayStage !== null
        ? stageResults.filter((s) => s.stage_number <= replayStage)
        : stageResults;
    return [...base].sort((a, b) => a.stage_number - b.stage_number);
  }, [stageResults, replayStage]);

  const totalEliminatedInView = useMemo(
    () => visibleStageResults.reduce((acc, s) => acc + s.eliminated_numbers.length, 0),
    [visibleStageResults]
  );

  // Measure arena height precisely: screen - header - dock
  useEffect(() => {
    if (!isMaximized) {
      setArenaHeight(0);
      return;
    }
    const measure = () => {
      requestAnimationFrame(() => {
        const headerH = headerRef.current?.offsetHeight ?? 44;
        const dockH = dockRef.current?.offsetHeight ?? 48;
        setArenaHeight(window.innerHeight - headerH - dockH);
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isMaximized]);

  const handleStartReplay = () => {
    setReplayKey((k) => k + 1);
    setReplayStage(1);
  };
  const handleNextReplayStage = () => {
    setReplayStage((s) => (s !== null && s < totalStages ? s + 1 : s));
  };
  const handleExitReplay = () => setReplayStage(null);

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    const res = await startRaffleDrawAction(round.id);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Failed to start draw"); return; }
    router.refresh();
  };

  const handleNextStage = async () => {
    setBusy(true);
    setError(null);
    const res = await publishNextStageAction(round.id);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Failed to publish next stage"); return; }
    router.refresh();
  };

  const toggleMaximize = async () => {
    if (!streamContainerRef.current) return;
    if (!document.fullscreenElement) {
      await streamContainerRef.current.requestFullscreen().catch(() => {});
      setIsMaximized(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsMaximized(false);
    }
  };

  useEffect(() => {
    const onFSChange = () => setIsMaximized(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  return (
    <div
      ref={streamContainerRef}
      className={
        isMaximized
          ? "h-screen w-screen bg-[#080808] flex flex-col overflow-hidden relative"
          : "flex flex-col gap-4"
      }
    >
      {/* ── Top Header (shrink-0, always visible) ── */}
      <div
        ref={headerRef}
        className={
          isMaximized
            ? "shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0d0d0d] px-4 py-2"
            : "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5"
        }
      >
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Badge variant={round.status === "running" ? "live" : "default"}>
            {round.status === "running" && <Radio className="h-3 w-3 animate-pulse" />}
            {round.status.toUpperCase()}
          </Badge>
          <span className="font-mono text-[#999999]">{round.round_code}</span>
          <span className="text-[#999999] hidden sm:inline">·</span>
          <span className="text-white font-semibold tabular-nums">Stage {round.current_stage}/{totalStages}</span>
          <span className="text-[#999999]">·</span>
          <span className="text-[#36B879] font-semibold tabular-nums">{survivorsCount} Alive</span>
          <span className="text-[#999999]">·</span>
          <span className="text-[#EF3038] font-semibold tabular-nums">{eliminatedCount} Out</span>
          <span className="text-[#999999] hidden md:inline">·</span>
          <span className="text-[#D8B66B] font-semibold tabular-nums hidden md:inline">
            Pool {formatGhs(round.prize_pool_pesewas)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/live/${round.id}`} target="_blank">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Public Stream</span>
            </Button>
          </Link>
          {/* Desktop-only maximize */}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleMaximize}
            className="hidden md:inline-flex h-8 text-xs"
            title={isMaximized ? "Exit Fullscreen" : "Maximize Arena for Streaming"}
          >
            {isMaximized ? (
              <><Minimize2 className="h-3.5 w-3.5" />Exit Fullscreen</>
            ) : (
              <><Maximize2 className="h-3.5 w-3.5 text-[#EF3038]" />Maximize</>
            )}
          </Button>
        </div>
      </div>

      {/* Error — absolute overlay so it doesn't displace the arena */}
      {error && (
        <div
          className={
            isMaximized
              ? "absolute top-12 left-4 right-4 z-40 rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-xs text-[#FF2020]"
              : "rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-xs text-[#FF2020]"
          }
        >
          {error}
        </div>
      )}

      {/* ── Arena (exact measured height so dock is always visible) ── */}
      <div
        style={isMaximized && arenaHeight > 0 ? { height: arenaHeight } : undefined}
        className={isMaximized ? "overflow-hidden px-2 py-1" : ""}
      >
        <LiveBroadcastClient
          embedded
          compact={isMaximized}
          initialRound={round}
          initialParticipants={participants}
          initialStageResults={stageResults}
          initialWinners={winners}
          initialEvents={events}
          replayStage={replayStage}
          replayKey={replayKey}
        />
      </div>

      {/* ── Control Dock (shrink-0, always visible at the bottom) ── */}
      <div
        ref={dockRef}
        className={
          isMaximized
            ? "shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 bg-[#0d0d0d] px-4 py-2 shadow-2xl"
            : "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#111111]/95 backdrop-blur-md px-4 py-2.5 shadow-2xl"
        }
      >
        <div className="flex items-center gap-2 text-[11px] text-[#999999] min-w-0">
          <ShieldCheck className="h-3.5 w-3.5 text-[#36B879] shrink-0" />
          <span className="font-mono truncate max-w-[180px] sm:max-w-xs">
            {isReplaying
              ? `Replay · Stage ${replayStage} / ${totalStages}`
              : round.status === "running"
              ? `Live · Stage ${round.current_stage} / ${totalStages}`
              : round.status === "completed"
              ? `Completed · ${totalStages} Stages`
              : `Ready (${round.confirmed_entries_count}/${round.participant_capacity})`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Eliminations button — always in dock */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 px-3 text-xs border-white/15"
            onClick={() => setShowEliminations((v) => !v)}
            title="View round-by-round eliminations"
          >
            <ListX className="h-3.5 w-3.5 text-[#EF3038]" />
            Eliminations ({totalEliminatedInView})
          </Button>

          {isReplaying ? (
            <>
              <Button
                variant="gold"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={replayStage >= totalStages}
                onClick={handleNextReplayStage}
              >
                <SkipForward className="h-3.5 w-3.5" />
                {replayStage === finalPreStage
                  ? "Replay Final Six"
                  : replayStage >= totalStages
                  ? "Complete"
                  : `Next (Stage ${replayStage + 1})`}
              </Button>
              <Button variant="secondary" size="sm" className="h-8 px-3 text-xs" onClick={handleStartReplay}>
                <RotateCcw className="h-3.5 w-3.5" />Restart
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={handleExitReplay}>
                <X className="h-3.5 w-3.5" />Exit Replay
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={!canStart || busy}
                onClick={handleStart}
              >
                {busy && canStart ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Start Raffle
              </Button>

              <Button
                variant="gold"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={!canNextStage || busy}
                onClick={handleNextStage}
              >
                {busy && canNextStage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
                {round.current_stage === finalPreStage ? "Reveal Final Six" : "Next Round"}
              </Button>

              {isCompleted && (
                <Link href={`/winners/${round.id}`}>
                  <Button variant="success" size="sm" className="h-8 px-3 text-xs">View Results</Button>
                </Link>
              )}

              {canReplay && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 text-xs border-[#D8B66B]/40 text-[#D8B66B] hover:bg-[#D8B66B]/10"
                  onClick={handleStartReplay}
                  title="Replay the exact draw round by round (admin only)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />Replay
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Eliminations Overlay Window ── */}
      {showEliminations && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowEliminations(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[82vh] flex flex-col rounded-2xl border border-white/15 bg-[#111111] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 bg-[#141414]">
              <div className="flex items-center gap-2.5">
                <ListX className="h-4 w-4 text-[#EF3038]" />
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                    Round-by-Round Eliminations
                  </h3>
                  <p className="text-[11px] text-[#999999]">
                    {visibleStageResults.length} stage{visibleStageResults.length === 1 ? "" : "s"} · {totalEliminatedInView} eliminated
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEliminations(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {visibleStageResults.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#0c0c0c] p-8 text-center text-xs text-[#999999]">
                  No eliminations recorded yet. Start the raffle to begin Stage 1.
                </div>
              ) : (
                visibleStageResults.map((stage) => {
                  const ordered =
                    stage.elimination_sequence && stage.elimination_sequence.length > 0
                      ? stage.elimination_sequence
                      : stage.eliminated_numbers;
                  return (
                    <div key={stage.id ?? stage.stage_number} className="rounded-xl border border-white/10 bg-[#0b0b0b] p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={stage.stage_number === totalStages ? "gold" : "default"}>
                            Stage {stage.stage_number}{stage.stage_number === totalStages ? " · Final Six" : ""}
                          </Badge>
                          <span className="text-xs text-[#EF3038] font-semibold tabular-nums">
                            {ordered.length} Eliminated
                          </span>
                        </div>
                        <span className="text-xs text-[#36B879] font-semibold tabular-nums">
                          {stage.surviving_numbers.length} Surviving
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {ordered.map((num, idx) => {
                          const p = participantByNumber.get(num);
                          return (
                            <div
                              key={`${stage.stage_number}-${num}`}
                              className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#161616] px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-mono text-[10px] text-[#777777] tabular-nums w-5 shrink-0">{idx + 1}.</span>
                              <span className="inline-flex h-6 min-w-7 items-center justify-center rounded bg-[#262626] px-1.5 font-display text-xs font-bold text-[#EF3038] tabular-nums shrink-0">#{num}</span>
                              <span className="truncate text-[#cccccc]">{p?.display_name ?? `Entry #${num}`}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-white/10 bg-[#141414] px-5 py-3">
              <Button type="button" variant="secondary" size="sm" className="h-8 px-4 text-xs" onClick={() => setShowEliminations(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
