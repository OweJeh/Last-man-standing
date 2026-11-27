"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [replayStage, setReplayStage] = useState<number | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  const canStart =
    round.status === "full" &&
    round.confirmed_entries_count === round.participant_capacity &&
    !round.seed_commitment;

  const canNextStage =
    round.status === "running" && round.current_stage >= 0 && round.current_stage < 5;

  const isCompleted = round.status === "completed" || round.status === "archived";
  const isReplaying = replayStage !== null;
  const canReplay = isCompleted && stageResults.length > 0;

  const handleStartReplay = () => {
    setReplayKey((k) => k + 1);
    setReplayStage(1);
  };

  const handleNextReplayStage = () => {
    setReplayStage((s) => (s !== null && s < 5 ? s + 1 : s));
  };

  const handleExitReplay = () => {
    setReplayStage(null);
  };

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    const res = await startRaffleDrawAction(round.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to start draw");
      return;
    }
    router.refresh();
  };

  const handleNextStage = async () => {
    setBusy(true);
    setError(null);
    const res = await publishNextStageAction(round.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to publish next stage");
      return;
    }
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
    const onFullscreenChange = () => {
      setIsMaximized(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <div
      ref={streamContainerRef}
      className={
        isMaximized
          ? "h-screen w-screen bg-[#080808] px-4 py-3 flex flex-col justify-between gap-2.5 overflow-hidden"
          : "space-y-4"
      }
    >
      {/* Top Stream Header Bar with Maximize Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Badge variant={round.status === "running" ? "live" : "default"}>
            {round.status === "running" && <Radio className="h-3 w-3 animate-pulse" />}
            {round.status.toUpperCase()}
          </Badge>
          <span className="font-mono text-[#999999]">{round.round_code}</span>
          <span className="text-[#999999] hidden sm:inline">·</span>
          <span className="text-white font-semibold tabular-nums">
            Stage {round.current_stage}/5
          </span>
          <span className="text-[#999999]">·</span>
          <span className="text-[#36B879] font-semibold tabular-nums">
            {survivorsCount} Alive
          </span>
          <span className="text-[#999999]">·</span>
          <span className="text-[#EF3038] font-semibold tabular-nums">
            {eliminatedCount} Out
          </span>
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
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleMaximize}
            className="h-8 text-xs"
            title={isMaximized ? "Exit Fullscreen" : "Maximize Arena for Streaming"}
          >
            {isMaximized ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-[#EF3038]" />
                Maximize
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-[#FF2020]/40 bg-[#FF2020]/10 p-3 text-xs text-[#FF2020]">
          {error}
        </div>
      )}

      {/* Primary Broadcast Arena (Grid / Final Six / Winner Reveal) */}
      <div className={isMaximized ? "flex-1 min-h-0 flex flex-col justify-center overflow-y-auto" : ""}>
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

      {/* Compact Control Dock Below Arena (stays accessible even when maximized) */}
      <div
        className={
          isMaximized
            ? "shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#111111]/95 backdrop-blur-md px-4 py-2 shadow-2xl"
            : "sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#111111]/95 backdrop-blur-md px-4 py-2.5 shadow-2xl"
        }
      >
        <div className="flex items-center gap-2 text-[11px] text-[#999999] min-w-0">
          <ShieldCheck className="h-3.5 w-3.5 text-[#36B879] shrink-0" />
          <span className="font-mono truncate max-w-[220px] sm:max-w-md">
            {isReplaying
              ? `Admin Replay · Stage ${replayStage} / 5`
              : round.seed_commitment
              ? `Commit: ${round.seed_commitment}`
              : `Ready (${round.confirmed_entries_count}/${round.participant_capacity})`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isReplaying ? (
            <>
              <Button
                variant="gold"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={replayStage >= 5}
                onClick={handleNextReplayStage}
              >
                <SkipForward className="h-3.5 w-3.5" />
                {replayStage === 4
                  ? "Replay Final Six"
                  : replayStage >= 5
                  ? "Replay Complete"
                  : `Next Replay (Stage ${replayStage + 1})`}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleStartReplay}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restart
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleExitReplay}
              >
                <X className="h-3.5 w-3.5" />
                Exit Replay
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
                {busy && canStart ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Start Raffle
              </Button>

              <Button
                variant="gold"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={!canNextStage || busy}
                onClick={handleNextStage}
              >
                {busy && canNextStage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SkipForward className="h-3.5 w-3.5" />
                )}
                {round.current_stage === 4 ? "Reveal Final Six" : "Next Round"}
              </Button>

              {isCompleted && (
                <Link href={`/winners/${round.id}`}>
                  <Button variant="success" size="sm" className="h-8 px-3 text-xs">
                    View Results
                  </Button>
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
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
